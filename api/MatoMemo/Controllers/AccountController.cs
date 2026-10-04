using LittleTripMemo.Common;
using LittleTripMemo.JWT;
using LittleTripMemo.Repository;
using LittleTripMemo.Services.Account;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.Mvc;

namespace LittleTripMemo.Controllers;

/// <summary>
/// ユーザーのアカウント管理、プロフィール操作、認証連携を行うコントローラー
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AccountController(
    UserContext userContext,
    JwtService jwtService,
    ITransactionProvider provider, // 追加
    IWebHostEnvironment env, // 追加
    RegistrationUserService registrationUserService,
    UpdateUserProfileService updateUserProfileService,
    EnsureLoginUserService ensureLoginUserService,
    GetUserProfileService getUserProfileService,
    WithdrawalUserService withdrawalUserService
) : _BaseController(userContext, jwtService, provider, env)
{
    /// <summary>
    /// Firebase認証の結果を受け取り、アプリ側へのログインまたは新規登録を行う
    /// </summary>
    [HttpPost("LoginFirebase")]
    public async Task<IActionResult> FirebaseLogin([FromBody] RegistrationUserService.FirebaseLoginRequest req)
    {
        var result = await registrationUserService.ExecuteAsync(req);
        if (!result.is_success) return BadRequest(new { result.message });

        _user.login_user_id = result.userId ?? Guid.Empty;
        _user.plan_type = result.plan ?? PlanType.Free.ToString();

        // OkWithBase に流す。 new_token = result.token でフロントに直接渡す
        return OkWithBase(
            new { token = result.token }, // data
            result.token // new_token
        );
    }

    /// <summary>
    /// ログアウト（クッキーの消去）
    /// </summary>
    /// <returns></returns>
    [HttpPost("Logout")]
    public IActionResult Logout()
    {
        _user.login_user_id = Guid.Empty;
        _user.table_id = 0;
        _user.plan_type = PlanType.Free.ToString();
        _user.UpdatedUser = null;

        // 本当の OkWithBase を直接呼ぶ。強制的に new_token = null
        return OkWithBase(new { }, null);
    }

    /// <summary>
    /// ログイン中のユーザーのプロフィール（ニックネームやアイコン等）を更新する
    /// </summary>
    [HttpPost("UpdateProfile")]
    [CustomAuthorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileService.UpdateUserReq req)
        => OkWithNewToken(await updateUserProfileService.ExecuteAsync(req));

    /// <summary>
    /// ログイン中のユーザーの状態を確認し、最新のユーザー情報を取得する
    /// </summary>
    [HttpPost("EnsureLoginUser")]
    [CustomAuthorize]
    public async Task<IActionResult> EnsureLoginUser([FromBody] EnsureLoginUserService.EnsureLoginUserReq req)
        => OkWithNewToken(await ensureLoginUserService.ExecuteAsync(req));

    /// <summary>
    /// 指定されたユーザーの公開プロフィール情報を取得する
    /// </summary>
    [HttpPost("GetUserProfile")]
    public async Task<IActionResult> GetUserProfile([FromBody] GetUserProfileService.GetUserProfileReq req)
        => OkWithNewToken(await getUserProfileService.ExecuteAsync(req));

    /// <summary>
    /// ユーザーの退会処理を行い、データを論理削除する
    /// </summary>
    [HttpPost("Withdrawal")]
    [CustomAuthorize]
    public async Task<IActionResult> Withdrawal([FromBody] WithdrawalUserService.WithdrawalReq req)
        => OkWithNewToken(await withdrawalUserService.ExecuteAsync(req));

}