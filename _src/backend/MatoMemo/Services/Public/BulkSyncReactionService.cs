using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Services;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Public;

/// <summary>リアクション状態の一括同期サービス</summary>
public class BulkSyncReactionService(
    UserContext userContext,
    ITransactionProvider provider,
    ReactionPubRepository reactionRepo,
    ArchivePubRepository archivePubRepo
) : _BaseService(userContext)
{
    public record ReactionSyncItem(
        [Required] int archive_id,
        [Required] long seq,
        bool has_funny,
        bool has_love,
        bool has_surprise,
        bool has_sad
    );

    public record BulkSyncReactionReq(
        [Required] Guid login_user_id,
        [Required] IEnumerable<ReactionSyncItem> reactions
    ) : ILoginUserRequest;

    public record Response(int updatedCount);

    public async Task<Response> ExecuteAsync(BulkSyncReactionReq req)
    {
        await ValidateAsync(req);
        var targetIds = req.reactions.Select(x => x.archive_id).Distinct();
        var activeIds = (await archivePubRepo.GetActiveArchiveIdsAsync(targetIds)).ToHashSet();

        using var tran = provider.BeginTransaction();
        try
        {
            int totalProcessed = 0;
            foreach (var item in req.reactions)
            {
                if (!activeIds.Contains(item.archive_id)) continue;
                await reactionRepo.UpsertAsync(new TReactionPub
                {
                    archive_id = item.archive_id,
                    seq = item.seq,
                    has_funny = item.has_funny,
                    has_love = item.has_love,
                    has_surprise = item.has_surprise,
                    has_sad = item.has_sad
                });
                totalProcessed++;
            }
            tran.Commit();
            return new Response(totalProcessed);
        }
        catch { throw; }
    }

    private async Task ValidateAsync(BulkSyncReactionReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.reactions == null || !req.reactions.Any(), "同期データがありません");
        await Task.CompletedTask;
    }

}