using LittleTripMemo.Common;
using LittleTripMemo.Repository;
using LittleTripMemo.JWT;
using LittleTripMemo.Services.Account;
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
    RegistrationUserService registrationUserService,
    UpdateUserProfileService updateUserProfileService,
    EnsureLoginUserService ensureLoginUserService,
    GetUserProfileService getUserProfileService,
    WithdrawalUserService withdrawalUserService
) : _BaseController(userContext, jwtService, provider)
{
    /// <summary>
    /// Firebase認証の結果を受け取り、アプリ側へのログインまたは新規登録を行う
    /// </summary>
    [HttpPost("LoginFirebase")]
    public async Task<IActionResult> FirebaseLogin([FromBody] RegistrationUserService.FirebaseLoginRequest req)
    {
        var result = await registrationUserService.ExecuteAsync(req);

        if (!result.is_success) return BadRequest(new { result.message });

        // コンテキストに情報を一時セット（レスポンス生成用）
        _user.login_user_id = result.userId ?? Guid.Empty;
        _user.plan_type = result.plan ?? PlanType.Free.ToString();

        return OkWithBase(new { token = result.token });
    }

    /// <summary>
    /// ログイン中のユーザーのプロフィール（ニックネームやアイコン等）を更新する
    /// </summary>
    [HttpPost("UpdateProfile")]
    [CustomAuthorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileService.UpdateUserReq req)
        => OkWithBase(await updateUserProfileService.ExecuteAsync(req));

    /// <summary>
    /// ログイン中のユーザーの状態を確認し、最新のユーザー情報を取得する
    /// </summary>
    [HttpPost("EnsureLoginUser")]
    [CustomAuthorize]
    public async Task<IActionResult> EnsureLoginUser([FromBody] EnsureLoginUserService.EnsureLoginUserReq req)
        => OkWithBase(await ensureLoginUserService.ExecuteAsync(req));

    /// <summary>
    /// 指定されたユーザーの公開プロフィール情報を取得する
    /// </summary>
    [HttpPost("GetUserProfile")]
    public async Task<IActionResult> GetUserProfile([FromBody] GetUserProfileService.GetUserProfileReq req)
        => OkWithBase(await getUserProfileService.ExecuteAsync(req));

    /// <summary>
    /// ユーザーの退会処理を行い、データを論理削除する
    /// </summary>
    [HttpPost("Withdrawal")]
    [CustomAuthorize]
    public async Task<IActionResult> Withdrawal([FromBody] WithdrawalUserService.WithdrawalReq req)
        => OkWithBase(await withdrawalUserService.ExecuteAsync(req));

}