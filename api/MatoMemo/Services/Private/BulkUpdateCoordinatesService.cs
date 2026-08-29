using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>アーカイブ内の明細の地点情報を一括更新するサービス</summary>
public class BulkUpdateCoordinatesService(
    UserContext userContext,
    ITransactionProvider provider,
    DetailRepository detailRepo
) : _BaseService(userContext)
{
    public record CoordinateItem(
        [Required] long seq,
        [Required] decimal latitude,
        [Required] decimal longitude
    );

    public record BulkUpdateCoordinatesReq(
        [Required] Guid login_user_id,
        [Required] int archive_id,
        [Required] IEnumerable<CoordinateItem> items
    ) : ILoginUserRequest;

    public record Response(int updated_count);

    public async Task<Response> ExecuteAsync(BulkUpdateCoordinatesReq req)
    {
        await ValidateAsync(req);

        using var tran = provider.BeginTransaction();
        try
        {
            int count = 0;
            foreach (var item in req.items)
            {
                // 地点情報を更新（Repository側で所有権とarchive_idの紐付けをチェック）
                int affected = await detailRepo.UpdateCoordinatesAsync(req.archive_id, item.seq, item.latitude, item.longitude);
                if (affected > 0) count++;
            }

            tran.Commit();
            return new Response(count);
        }
        catch { throw; }
    }

    private async Task ValidateAsync(BulkUpdateCoordinatesReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id <= 0, "無効なアーカイブIDです");
        BusinessException.ThrowIf(req.items == null || !req.items.Any(), "更新データがありません");
        await Task.CompletedTask;
    }

}