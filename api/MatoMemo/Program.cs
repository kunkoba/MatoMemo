using Dapper;
using LittleTripMemo.Common;
using LittleTripMemo.Configs;
using LittleTripMemo.DataAccess;
using LittleTripMemo.DbContext;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Extensions; 
using LittleTripMemo.JWT;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Services.Common;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Collections.Generic;
using System.Threading.RateLimiting;


// ===================================================
// アプリ構成・サービス登録
// ===================================================

// 1. 起動前設定（Npgsql タイムスタンプ挙動の固定）
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

//Console.WriteLine("DEBUG: Application starting...");
var builder = WebApplication.CreateBuilder(args);
//Console.WriteLine("DEBUG: WebApplication.CreateBuilder completed.");

// 環境変数からポート番号を取得し、取得できない場合はローカル用の 5255 をデフォルトとする
var port = Environment.GetEnvironmentVariable("PORT") ?? "5255";
//builder.WebHost.UseUrls($"http://*:{port}");
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Dapper の型変換ハンドラーを登録（click_stats の解析に必須）
SqlMapper.AddTypeHandler(new JsonbTypeHandler<Dictionary<string, ClickCountData>>());
// Dapper の型変換ハンドラーを登録（Dictionary内の各オブジェクトをJSONBとしてシリアライズ/デシリアライズ可能にする）
SqlMapper.AddTypeHandler(new JsonbTypeHandler<Dictionary<string, object>>());
// Dapper の型変換ハンドラーを登録
SqlMapper.AddTypeHandler(new JsonbTypeHandler<List<int>>());

// 2. ログ設定 (Serilog)
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();
builder.Host.UseSerilog();

// 3. DB / Identity 設定
//var connectionString = builder.Configuration["ConnectionStrings:ConnectionStrings__MatoMemoConnStr"]!;
var connectionString = Environment.GetEnvironmentVariable("CONN_STR") ?? builder.Configuration["ConnectionStrings:ConnectionStrings__MatoMemoConnStr"]!;
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped<ITransactionProvider>(_ => new TransactionProvider(connectionString));

builder.Services.AddIdentity<MyAppUser, IdentityRole<Guid>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// 4. アプリケーションサービス登録 (Extensions/ServiceExtensions.cs に集約)
builder.Services.AddAppInfrastructure();
builder.Services.AddAppBusinessServices();

// 5. 共通コンテキスト / セキュリティ
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<UserContext>();
builder.Services.AddSingleton<SystemStatus>();
builder.Services.AddScoped<JwtService>();

// 6. 設定値のバインド
builder.Services.Configure<MyAppSettings>(builder.Configuration.GetSection(MyAppSettings.SectionName));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));

// 8. API / CORS / Swagger 設定
builder.Services.AddControllers(options => options.Filters.Add<UserValidationFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "LittleTripMemo API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() } });
});

//builder.Services.AddCors(options => options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddCors(options => options.AddDefaultPolicy(p =>
    p.WithOrigins(
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "https://mato-memo.vercel.app" // 本番のURLもここに
    )
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
));

// 9. 定期バッチ実行
builder.Services.AddHostedService<LittleTripMemo.Worker.SystemMaintenanceWorker>();

// 10. レート制限（大量アクセス制限）
builder.Services.AddRateLimiter(options => {
    options.OnRejected = async (context, token) => {
        var http = context.HttpContext;
        var ip = http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = http.Request.Path;

        // めちゃくちゃ分かりやすいログ
        Log.Warning("【レート制限】BLOCKED IP:{IP} Path:{Path}", ip, path);

        // レスポンスは今まで通りサイレント200で返す
        http.Response.StatusCode = StatusCodes.Status200OK;
        await http.Response.WriteAsJsonAsync(new { is_logged_in = false, plan = "Free", data = new { is_success = true } }, token);
    };
    options.AddPolicy("PublicApiPolicy", httpContext => {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 30,    //１分に○回
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(o => {
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});



// ===================================================
// アプリ実行・リクエスト処理
// ===================================================

var app = builder.Build();

// 11. リクエストログ出力（デバッグ用）
app.Use(async (HttpContext context, RequestDelegate next) => {
    //Console.WriteLine($"[REQ IN] {context.Request.Method} {context.Request.Path}");
    await next(context);
});

app.UseForwardedHeaders(); // 最初

// UserHistoryLogger に HttpContextAccessor を紐付け（静的サービスからの DI 解決を可能にする）
UserHistoryRegister.Configure(app.Services.GetRequiredService<IHttpContextAccessor>());

// 10. ミドルウェア・パイプライン
app.UseMiddleware<ExceptionHandling>(); // 最外周で例外をキャッチ

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors();

app.UseRateLimiter();

app.UseMiddleware<JwtMiddleware>(); // 認証情報の抽出
app.UseMiddleware<LittleTripMemo.Middleware.SystemManagementMiddleware>(); // メンテナンス・バージョンチェック

//app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers.CacheControl = "private, no-store, no-cache, must-revalidate";
        context.Response.Headers.Pragma = "no-cache";
    }
    await next();
});

//app.MapControllers();
app.MapControllers().RequireRateLimiting("PublicApiPolicy");

app.Run();

