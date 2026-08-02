using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using LittleTripMemo.Common;

namespace LittleTripMemo.JWT;

/// <summary>
/// HTTPリクエストのヘッダーからJWTトークンを抽出し、認証情報をUserContextに展開するミドルウェア
/// </summary>
public class JwtMiddleware(
    RequestDelegate next,
    IConfiguration configuration
)
{
    public async Task Invoke(HttpContext context)
    {
        // プリフライトリクエスト（OPTIONS）の場合は認証処理をスキップ
        if (context.Request.Method == "OPTIONS")
        {
            await next(context);
            return;
        }

        var authorizationHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        var token = authorizationHeader?.Split(" ").Last();

        if (!string.IsNullOrEmpty(token))
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var secretKey = Encoding.UTF8.GetBytes(configuration["JwtSettings:SecretKey"] ?? "");

                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(secretKey),
                    ValidateIssuer = true,
                    ValidIssuer = configuration["JwtSettings:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = configuration["JwtSettings:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out _);

                // UserContext への注入
                var userContext = context.RequestServices.GetRequiredService<UserContext>();
                userContext.login_user_id = Guid.Parse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
                userContext.table_id = int.Parse(principal.FindFirst("table_id")?.Value ?? "0");
                userContext.plan_type = principal.FindFirst("plan_type")?.Value ?? PlanType.Free.ToString();

                context.User = principal;
            }
            catch
            {
                // トークン検証失敗時はコンテキストへの注入を行わず後続へ（Authorize属性で弾く）
            }
        }
        await next(context);
    }

}
