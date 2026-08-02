using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services.Common;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Admin;

/// <summary>
/// ユーザーのアカウント凍結（BAN）および凍結解除処理と、その履歴記録を担当するサービス
/// </summary>
public class UpdateUserBanStatusService(
    UserContext userContext,
    AppUserRepository appUserRepository
) : _BaseService(userContext)
{
    public record UpdateUserBanStatusReq(
        [Required] Guid login_user_id,
        [Required] Guid target_user_id,
        [Required] bool is_banned
    ) : ILoginUserRequest;

    public record Response(bool is_success);

    /// <summary>
    /// BAN状態の更新処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(UpdateUserBanStatusReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. 実行（ユーザーテーブルのBANフラグを更新）
        int affectedCount = await appUserRepository.UpdateBanStatusAsync(req.target_user_id, req.is_banned);

        // 更新に成功した場合のみ、履歴を登録する
        if (affectedCount > 0)
        {
            // ③ ユーザー履歴に登録（凍結または解除の記録）
            await UserHistoryRegister.RegistAsync(new TSysUserHistory
            {
                user_id = req.target_user_id,
                action_kind = (req.is_banned ? UserHistoryActionKind.AdminBan : UserHistoryActionKind.AdminUnban).ToString(),
                body = req.is_banned ? "利用規約違反によりアカウントを凍結(BAN)しました" : "アカウントの凍結(BAN)を解除しました",
                memo_json = new Dictionary<string, object>
                {
                    ["is_banned"] = req.is_banned
                }
            });
        }

        return new Response(affectedCount > 0);
    }

    /// <summary>
    /// 業務バリデーション
    /// </summary>
    private async Task ValidateAsync(UpdateUserBanStatusReq req)
    {
        // 権限チェック
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");

        // 入力チェック
        BusinessException.ThrowIf(req.target_user_id == Guid.Empty, "対象ユーザーIDが不正です");

        await Task.CompletedTask;
    }

}