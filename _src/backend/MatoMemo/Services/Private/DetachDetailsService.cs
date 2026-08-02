using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>
/// まとめられた明細をアーカイブから解除し、未まとめ状態に戻すサービス。
/// 解除の結果、アーカイブ内の明細が0件になった場合はアーカイブ自体を自動削除します。
/// </summary>
public class DetachDetailsService(
    UserContext userContext,
    ITransactionProvider transactionProvider,
    DetailRepository detailRepository,
    ArchiveRepository archiveRepository
) : _BaseService(userContext)
{
    public record DetachDetailsReq(
        [Required] Guid login_user_id,
        [Required(ErrorMessage = "解除対象のseqリストは必須です")] long[] seqs,
        [Required(ErrorMessage = "元のアーカイブIDは必須です")] int archive_id
    ) : ILoginUserRequest;

    public record Response(int detached_count, bool is_archive_deleted);

    /// <summary>切り離し処理を実行（明細数0で親を自動削除）</summary>
    public async Task<Response> ExecuteAsync(DetachDetailsReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        bool isArchiveDeleted = false;
        int detachedCount = 0;

        using var transaction = transactionProvider.BeginTransaction();
        try
        {
            // ① 対象の明細をアーカイブから切り離す (archive_id を 0 に更新)
            detachedCount = await detailRepository.DetachBySeqsAsync(req.seqs);

            if (detachedCount > 0)
            {
                // ② アーカイブの現在の明細件数を更新
                await archiveRepository.UpdateDetailCountAsync(req.archive_id);

                // ③ 最新のアーカイブ情報を取得して件数を確認
                var archive = await archiveRepository.GetByKeyAsync(req.archive_id);

                // 明細が0件になった場合は、まとめ自体を削除
                if (archive != null && archive.detail_count <= 0)
                {
                    await archiveRepository.DeletePhysicalByKeyAsync(req.archive_id);
                    isArchiveDeleted = true;
                }
            }

            transaction.Commit();
            return new Response(detachedCount, isArchiveDeleted);
        }
        catch
        {
            throw;
        }
    }

    /// <summary>業務バリデーション</summary>
    private async Task ValidateAsync(DetachDetailsReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.seqs.Length == 0, "解除対象が選択されていません");
        BusinessException.ThrowIf(req.archive_id <= 0, "無効なアーカイブIDです");

        await Task.CompletedTask;
    }

}
