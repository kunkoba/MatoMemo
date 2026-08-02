using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services.Common;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Admin;

/// <summary>
/// 管理者による公開まとめの強制クローズ（非公開化）および履歴記録を担当するサービス
/// </summary>
public class AdminCloseArchivePubService(
    UserContext userContext,
    ITransactionProvider transactionProvider,
    ArchivePubRepository archivePubRepository,
    SysUserNotificationRepository sysUserNotificationRepository
) : _BaseService(userContext)
{
    public record AdminCloseArchivePubReq(
        [Required] Guid login_user_id,
        int archive_id,
        Guid target_user_id
    ) : ILoginUserRequest;

    public record Response(bool is_success);

    /// <summary>
    /// 強制クローズ処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(AdminCloseArchivePubReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 対象アーカイブの存在と所有者を確認
        var archive = await archivePubRepository.GetByKeyAsync(req.archive_id);
        if (archive == null || archive.user_id != req.target_user_id)
        {
            return new Response(false);
        }

        // 2. 実行（一括処理のためトランザクションを開始）
        using var transaction = transactionProvider.BeginTransaction();
        try
        {
            // ① 強制クローズ実行
            int affected = await archivePubRepository.AdminCloseByKeyAsync(req.archive_id, req.target_user_id);

            // 対象が見つからない場合は終了
            if (affected == 0) return new Response(false);

            // ② ユーザー履歴に登録（処分の記録）
            await UserHistoryRegister.RegistAsync(new TSysUserHistory
            {
                user_id = req.target_user_id,
                action_kind = UserHistoryActionKind.AdminClose.ToString(),
                body = "規約制限により公開まとめを強制クローズしました",
                memo_json = new Dictionary<string, object>
                {
                    ["archive_id"] = req.archive_id,
                    ["title"] = archive.title
                }
            });

            // ③ 対象ユーザーへ個人通知（警告メッセージ）を送信
            await sysUserNotificationRepository.InsertAsync(new TSysUserNotification
            {
                user_id = req.target_user_id,
                kind = (short)UserNotificationKind.Caution, // 8
                body = $"【警告】公開中のまとめ『{archive.title}』が規約制限により運営側で非公開に設定されました。\n内容を確認・修正してください。"
            });

            transaction.Commit();
            return new Response(true);
        }
        catch
        {
            throw;
        }
    }

    /// <summary>
    /// 業務バリデーション
    /// </summary>
    private async Task ValidateAsync(AdminCloseArchivePubReq req)
    {
        // 権限チェック
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");

        // 入力チェック
        BusinessException.ThrowIf(req.archive_id == 0, "アーカイブIDが不正です");
        BusinessException.ThrowIf(req.target_user_id == Guid.Empty, "ターゲットユーザーIDが不正です");

        await Task.CompletedTask;
    }

}