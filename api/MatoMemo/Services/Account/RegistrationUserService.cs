using LittleTripMemo.Configs;
using LittleTripMemo.JWT;
using LittleTripMemo.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using LittleTripMemo.Common;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Exceptions;
using FirebaseAdmin.Auth;

namespace LittleTripMemo.Services.Account;

/// <summary>
/// 外部認証情報に基づき、アプリユーザーのログインまたは新規登録を行うサービス
/// </summary>
public class RegistrationUserService(
    UserContext user,
    UserManager<MyAppUser> userManager,
    AppUserRepository appUserRepo,
    TableStatisticsRepository statsRepo,
    JwtService jwtService,
    IOptions<MyAppSettings> options
) : _BaseService(user)
{
    private readonly MyAppSettings _settings = options.Value;

    // FirebaseのIDトークンを受け取るように変更（Emailの自己申告をやめて検証する）
    public record FirebaseLoginRequest(string IdToken);

    public record Response(
        bool is_success,
        string message,
        string? token = null,
        Guid? userId = null,
        string? plan = null
    );

    /// <summary>
    /// Firebaseのメアドを元にログイン処理を行う。未登録なら新規作成する。
    /// </summary>
    public async Task<Response> ExecuteAsync_2(FirebaseLoginRequest request)
    {
        // 1. バリデーション
        await ValidateAsync(request);

        // 2. Firebase IDトークンの検証（なりすまし防止）
        FirebaseToken decoded;
        try
        {
            decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(request.IdToken);
        }
        catch
        {
            return new Response(false, "認証に失敗しました。");
        }

        // トークンから本物のメールアドレスを取得
        var email = decoded.Claims.ContainsKey("email") ? decoded.Claims["email"].ToString() : null;
        if (string.IsNullOrEmpty(email))
        {
            // emailが無い場合はuidを仮メールとして使う
            email = decoded.Uid + "@firebase.local";
        }

        // 3. 認証情報の確認（Identity）
        var authUser = await userManager.FindByEmailAsync(email);
        if (authUser == null)
        {
            var regResult = await RegisterInternalAsync(email);
            if (!regResult.is_success) return regResult;

            authUser = await userManager.FindByEmailAsync(email);
        }

        // 4. アプリユーザー業務情報の取得
        var appUser = await appUserRepo.GetByUserIdAsync(authUser!.Id);
        if (appUser == null) throw new BusinessException("ユーザー業務データが不足しています。");

        // 5. JWTトークンの生成
        var token = jwtService.CreateToken(authUser, appUser);

        return new Response(true, "成功", token, appUser.user_id, appUser.plan_type);
    }

    /// <summary>
    /// Firebaseのメアドを元にログイン処理を行う。未登録なら新規作成する。
    /// </summary>
    public async Task<Response> ExecuteAsync(FirebaseLoginRequest request)
    {
        // 1. バリデーション
        await ValidateAsync(request);

        // 2. Firebase IDトークンの検証（なりすまし防止）
        FirebaseToken decoded;
        try
        {
            decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(request.IdToken);
        }
        catch
        {
            return new Response(false, "認証に失敗しました。");
        }

        // 2-1. サーバ側で「確認したこと」を確認するロジック
        // ローカル(Firebase)で確認メールを踏んだかチェック
        // emailクレームがある場合のみチェック対象にする
        if (decoded.Claims.ContainsKey("email"))
        {
            var isVerified = false;
            if (decoded.Claims.TryGetValue("email_verified", out var v))
            {
                bool.TryParse(v?.ToString(), out isVerified);
            }

            if (!isVerified)
            {
                return new Response(false, "メールアドレスが確認されていません。メール内のリンクをクリックしてください。");
            }
        }

        // トークンから本物のメールアドレスを取得
        var email = decoded.Claims.ContainsKey("email") ? decoded.Claims["email"].ToString() : null;
        if (string.IsNullOrEmpty(email))
        {
            // emailが無い場合はuidを仮メールとして使う（電話番号ログイン等）
            email = decoded.Uid + "@firebase.local";
        }

        // 3. 認証情報の確認（Identity）
        var authUser = await userManager.FindByEmailAsync(email);
        if (authUser == null)
        {
            var regResult = await RegisterInternalAsync(email);
            if (!regResult.is_success) return regResult;

            authUser = await userManager.FindByEmailAsync(email);
        }

        // 4. アプリユーザー業務情報の取得
        var appUser = await appUserRepo.GetByUserIdAsync(authUser!.Id);
        if (appUser == null) throw new BusinessException("ユーザー業務データが不足しています。");

        // 5. JWTトークンの生成
        var token = jwtService.CreateToken(authUser, appUser);

        return new Response(true, "成功", token, appUser.user_id, appUser.plan_type);
    }

    private async Task ValidateAsync(FirebaseLoginRequest req)
    {
        BusinessException.ThrowIf(string.IsNullOrEmpty(req.IdToken), "トークンは必須です");
        await Task.CompletedTask;
    }

    /// <summary>
    /// 新規ユーザー作成内部処理
    /// </summary>
    private async Task<Response> RegisterInternalAsync(string email)
    {
        var identityUser = new MyAppUser { Email = email, UserName = email };
        var result = await userManager.CreateAsync(identityUser);
        if (!result.Succeeded) return new Response(false, "認証登録に失敗しました。");

        // 最適なテーブルIDを選択
        var table_id = await SelectTableIdAsync();

        var appUser = new TAppUser
        {
            user_id = identityUser.Id,
            table_id = table_id,
            plan_type = PlanType.Free.ToString(),
            nick_name = $"旅人_{identityUser.Id.ToString()[..8]}",
            icon = "👤"
        };
        await appUserRepo.InsertAsync(appUser);

        return new Response(true, "成功");
    }

    /// <summary>
    /// 設定値（MaxTableNum）の範囲内で、最もレコード数が少ないテーブルを選択する
    /// </summary>
    private async Task<int> SelectTableIdAsync()
    {
        var stats = await statsRepo.GetAllStatsAsync();

        // ★修正：設定された最大テーブル数を超えないものだけに絞り込む
        var validStats = stats
            .Where(x => (int)x.table_id <= _settings.MaxTableNum)
            .ToList();

        // 該当がない（初期状態など）場合は 1 を返す
        if (!validStats.Any()) return 1;

        // レコード数が少ない順 ＞ IDが若い順 でソートして先頭を採用
        var target = validStats
            .OrderBy(x => (long)x.record_count)
            .ThenBy(x => (int)x.table_id)
            .First();

        return (int)target.table_id;
    }
}