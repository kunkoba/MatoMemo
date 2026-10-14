using MatoMemo.Common;
using MatoMemo.Models;
using MatoMemo.Repository.Sys;
using MatoMemo.Services;

/// <summary>ログイン状態の保証と最新情報の取得</summary>
public class EnsureLoginUserService(
    UserContext userContext,
    AppUserRepository appUserRepo
) : _BaseService(userContext)
{
    public record EnsureLoginUserReq();
    public record Response(TAppUser user_info);

    public async Task<Response> ExecuteAsync(EnsureLoginUserReq req)
    {
        await ValidateAsync(req);

        // 最終ログイン日時を更新
        await appUserRepo.UpdateLastLoginTimeAsync(_user.login_user_id);

        var user = await appUserRepo.GetByUserIdAsync(_user.login_user_id);
        return new Response(user!);
    }

    private async Task ValidateAsync(EnsureLoginUserReq req)
    {
        await EnsureLoginUserAsync(appUserRepo);
    }

}