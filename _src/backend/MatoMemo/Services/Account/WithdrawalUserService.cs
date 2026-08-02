using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services.Common;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Account;

/// <summary>
/// ユーザー自身の操作による退会処理（論理削除）および履歴の記録を担当するサービス
/// </summary>
public class WithdrawalUserService(
    UserContext userContext,
    AppUserRepository appUserRepository
) : _BaseService(userContext)
{
    public record WithdrawalReq(
        [Required] Guid login_user_id
    ) : ILoginUserRequest;

    public record Response(bool is_success);

    /// <summary>
    /// 退会処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(WithdrawalReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. 実行（ユーザーテーブルの削除フラグを更新）
        // リポジトリ側で update_tim も同時に更新されるため、バッチでの物理削除の起点となります
        int affectedCount = await appUserRepository.UpdateDeleteStatusAsync(_user.login_user_id, true);

        // 更新に成功した場合のみ、履歴を登録する
        if (affectedCount > 0)
        {
            // ③ ユーザー履歴に登録（退会事実の記録）
            await UserHistoryRegister.RegistAsync(new TSysUserHistory
            {
                user_id = _user.login_user_id,
                action_kind = UserHistoryActionKind.Withdrawal.ToString(),
                body = "ユーザー自身により退会処理が実行されました",
                memo_json = null // 詳細データは不要
            });
        }

        return new Response(affectedCount > 0);
    }

    /// <summary>
    /// 業務バリデーション
    /// </summary>
    private async Task ValidateAsync(WithdrawalReq req)
    {
        // ログイン状態および本人確認
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です", "AUTH_REQUIRED");
        BusinessException.ThrowIf(_user.login_user_id != req.login_user_id, "不正なリクエストです");

        // ユーザーが実在するか確認
        var loginUser = await appUserRepository.GetByUserIdAsync(_user.login_user_id);
        BusinessException.ThrowIf(loginUser == null, "ユーザー登録情報が見つかりません", "AUTH_REQUIRED");

        await Task.CompletedTask;
    }

}