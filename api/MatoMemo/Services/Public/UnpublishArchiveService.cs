
using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Services;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Public;

/// <summary>
/// 公開されているデータを非公開（論理削除）にするサービス。
/// 秘密側データは既に存在するため、復元処理は行わない。
/// </summary>
public class UnpublishArchiveService(
UserContext userContext,
ITransactionProvider provider,
ArchivePubRepository archivePubRepo,
DetailPubRepository detailPubRepo,
ReactionPubRepository reactionPubRepo
) : _BaseService(userContext)
{
    public record UnpublishArchiveReq(
    [Required] Guid login_user_id,
    [Required] int archive_id
    ) : ILoginUserRequest;

public record Response(int archiveId);

    /// <summary>
    /// 非公開化処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(UnpublishArchiveReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        using var tran = provider.BeginTransaction();
        try
        {
            // 所有権の確認
            var archive = await archivePubRepo.GetByKeyAsync(req.archive_id);
            BusinessException.ThrowIf(archive == null || archive.user_id != _user.login_user_id,
                "対象のアーカイブが見つからないか、権限がありません。");

            // 2. 公開データ（アーカイブ・明細・リアクション）を論理削除
            await detailPubRepo.DeleteLogicalByArchiveIdAsync(req.archive_id);
            await archivePubRepo.DeleteLogicalByKeyAsync(req.archive_id);
            await reactionPubRepo.DeleteLogicalByArchiveIdAsync(req.archive_id);

            tran.Commit();
            return new Response(req.archive_id);
        }
        catch
        {
            throw;
        }
    }

    private async Task ValidateAsync(UnpublishArchiveReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id <= 0, "無効なアーカイブIDです");
        await Task.CompletedTask;
    }

}

