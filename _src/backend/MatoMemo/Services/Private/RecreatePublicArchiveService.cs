using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>
/// 公開済みデータを完全に消去し、秘密側の最新状態で作り直すサービス
/// </summary>
public class RecreatePublicArchiveService(
    UserContext userContext,
    ITransactionProvider provider,
    ArchiveRepository archiveRepo,
    DetailRepository detailRepo,
    ArchivePubRepository archivePubRepo,
    DetailPubRepository detailPubRepo,
    ReactionPubRepository reactionPubRepo
) : _BaseService(userContext)
{
    public record RecreatePublicArchiveReq(
        [Required] Guid login_user_id,
        [Required] int archive_id
    ) : ILoginUserRequest;

    public record Response(int archiveId);

    /// <summary>
    /// 公開データを物理削除した後、秘密データから再構築する
    /// </summary>
    public async Task<Response> ExecuteAsync(RecreatePublicArchiveReq req)
    {
        await ValidateAsync(req);

        using var tran = provider.BeginTransaction();
        try
        {
            // 1. 元データの取得（論理削除済みも対象）
            var archive = await archiveRepo.GetByKeyWithDeletedAsync(req.archive_id);
            BusinessException.ThrowIf(archive == null, "元データが見つかりません");

            // 2. 既存公開データの完全消去
            await detailPubRepo.DeletePhysicalByArchiveIdAsync(req.archive_id);
            await archivePubRepo.DeletePhysicalByKeyAsync(req.archive_id);
            await reactionPubRepo.DeletePhysicalByArchiveIdAsync(req.archive_id);

            // 3. 公開アーカイブの再作成
            await archivePubRepo.RestoreArchiveAsync(new TMemoArchivePub
            {
                archive_id = archive.archive_id,
                user_id = archive.user_id,
                title = archive.title,
                memo = archive.memo,
                link_url = archive.link_url,
                currency_unit = archive.currency_unit,
            });

            // 4. 公開明細の再作成
            var details = await detailRepo.GetByArchiveIdWithDeletedAsync(req.archive_id);
            foreach (var detail in details)
            {
                await detailPubRepo.RestoreDetailAsync(new TMemoDetailPub
                {
                    archive_id = detail.archive_id,
                    seq = detail.seq,
                    user_id = detail.user_id,
                    latitude = detail.latitude,
                    longitude = detail.longitude,
                    title = detail.title,
                    body = detail.body,
                    memo_date = detail.memo_date,
                    memo_time = detail.memo_time,
                    face_emoji = detail.face_emoji,
                    weather_code = detail.weather_code,
                    link_url = detail.link_url,
                    memo_price = detail.memo_price,
                    feel_type = detail.feel_type
                });
            }

            // 5. 件数同期
            await archivePubRepo.UpdateDetailCountAsync(req.archive_id);

            tran.Commit();
            return new Response(archive.archive_id);
        }
        catch
        {
            throw;
        }
    }

    private async Task ValidateAsync(RecreatePublicArchiveReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id == 0, "アーカイブIDが無効です");

        await Task.CompletedTask;
    }

}