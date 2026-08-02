using LittleTripMemo.Configs;
using LittleTripMemo.JWT;
using LittleTripMemo.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using LittleTripMemo.Common;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Exceptions;

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

    public record FirebaseLoginRequest(string Email);

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
    public async Task<Response> ExecuteAsync(FirebaseLoginRequest request)
    {
        // 1. バリデーション
        await ValidateAsync(request);

        // 2. 認証情報の確認（Identity）
        var authUser = await userManager.FindByEmailAsync(request.Email);
        if (authUser == null)
        {
            var regResult = await RegisterInternalAsync(request.Email);
            if (!regResult.is_success) return regResult;

            authUser = await userManager.FindByEmailAsync(request.Email);
        }

        // 3. アプリユーザー業務情報の取得
        var appUser = await appUserRepo.GetByUserIdAsync(authUser!.Id);
        if (appUser == null) throw new BusinessException("ユーザー業務データが不足しています。");

        // 4. JWTトークンの生成
        var token = jwtService.CreateToken(authUser, appUser);

        return new Response(true, "成功", token, appUser.user_id, appUser.plan_type);
    }

    private async Task ValidateAsync(FirebaseLoginRequest req)
    {
        BusinessException.ThrowIf(string.IsNullOrEmpty(req.Email), "メールアドレスは必須です");
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