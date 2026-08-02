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
/// 管理者による強制公開停止処理（公開データの削除と秘密側への復元）および履歴記録を担当するサービス
/// </summary>
public class AdminUnpublishArchiveService(
    UserContext userContext,
    ITransactionProvider transactionProvider,
    ArchivePubRepository archivePubRepository,
    DetailPubRepository detailPubRepository,
    ReactionPubRepository reactionPubRepository,
    SysReportRepository sysReportRepository,
    ArchiveRepository archiveRepository,
    DetailRepository detailRepository,
    SysUserNotificationRepository sysUserNotificationRepository,
    AppUserRepository appUserRepository
) : _BaseService(userContext)
{
    public record AdminUnpublishArchiveReq(
        [Required] Guid login_user_id,
        int archive_id,
        Guid target_user_id
    ) : ILoginUserRequest;

    public record Response(bool is_success);

    /// <summary>
    /// 強制公開停止処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(AdminUnpublishArchiveReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 対象ユーザーの情報を取得（秘密側のテーブルID特定のため）
        var targetAppUser = await appUserRepository.GetByUserIdAsync(req.target_user_id);
        BusinessException.ThrowIf(targetAppUser == null, "ユーザーが存在しません");

        // 対象の公開アーカイブ情報を取得
        var archivePub = await archivePubRepository.GetByKeyAsync(req.archive_id);
        BusinessException.ThrowIf(archivePub == null || archivePub.user_id != req.target_user_id, "対象の公開アーカイブが見つかりません");

        // 2. 実行（一連の削除・復元処理をアトミックに行うためトランザクションを開始）
        using var transaction = transactionProvider.BeginTransaction();
        try
        {
            // ① 公開側の所有者限定データを物理削除
            await detailPubRepository.AdminDeletePhysicalByArchiveIdAsync(req.archive_id, req.target_user_id);
            await archivePubRepository.AdminDeletePhysicalByKeyAsync(req.archive_id, req.target_user_id);

            // ② その記事に紐づくリアクション・通報データをすべて物理削除（リセット）
            await reactionPubRepository.DeletePhysicalByArchiveIdAsync(req.archive_id);
            await sysReportRepository.DeletePhysicalByArchiveIdAsync(req.archive_id);

            // ③ 秘密側（自分専用領域）のデータを復元
            await archiveRepository.AdminRestoreByKeyAsync(req.archive_id, req.target_user_id);
            await detailRepository.AdminRestoreByKeyAsync(req.archive_id, req.target_user_id, targetAppUser!.table_id);

            // ④ ユーザー履歴に登録（重大な処分の記録）
            await UserHistoryRegister.RegistAsync(new TSysUserHistory
            {
                user_id = req.target_user_id,
                action_kind = UserHistoryActionKind.AdminUnpublish.ToString(),
                body = "規約違反により公開データを強制公開停止（秘密へ移動）しました",
                memo_json = new Dictionary<string, object>
                {
                    ["archive_id"] = req.archive_id,
                    ["title"] = archivePub!.title
                }
            });

            // ⑤ 対象ユーザーへ個人通知（強制処分の案内）を送信
            await sysUserNotificationRepository.InsertAsync(new TSysUserNotification
            {
                user_id = req.target_user_id,
                kind = (short)UserNotificationKind.Warning, // 9
                body = $"【重要】公開中のまとめ『{archivePub.title}』が規約違反により運営側で公開停止されました。データは「非公開」へ戻され、評価等はリセットされました。"
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
    private async Task ValidateAsync(AdminUnpublishArchiveReq req)
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