using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>未まとめ明細（archive_id=0）を一括で新規登録するサービス</summary>
public class BulkSyncDetailsService(
    UserContext userContext,
    ITransactionProvider provider,
    DetailRepository detailRepo
) : _BaseService(userContext)
{
    public record BulkSyncItem(
        [Required(ErrorMessage = "緯度は必須です")] decimal latitude,
        [Required(ErrorMessage = "経度は必須です")] decimal longitude,
        [Required(ErrorMessage = "タイトルは必須です")][StringLength(100)] string title,
        [Required(ErrorMessage = "本文は必須です")] string body,
        [Required(ErrorMessage = "日付は必須です")] string memo_date,
        [Required(ErrorMessage = "時間は必須です")] string memo_time,
        [Required(ErrorMessage = "表情IDは必須です")] string face_emoji,
        [Required(ErrorMessage = "天気IDは必須です")] string weather_code,
        string? link_url,
        [Required(ErrorMessage = "金額は必須です")] int memo_price
    );

    public record BulkSyncReq(
        [Required] Guid login_user_id,
        [Required(ErrorMessage = "同期データリストは必須です")] IEnumerable<BulkSyncItem> items
    ) : ILoginUserRequest;

    public record Response(int insertedCount);

    /// <summary>一括登録の実行</summary>
    public async Task<Response> ExecuteAsync(BulkSyncReq req)
    {
        await ValidateAsync(req);

        using var tran = provider.BeginTransaction();
        try
        {
            int totalInserted = 0;
            foreach (var item in req.items)
            {
                var entity = MapToEntity(item);
                await detailRepo.InsertAsync(entity);
                totalInserted++;
            }

            tran.Commit();
            return new Response(totalInserted);
        }
        catch
        {
            throw;
        }
    }

    private async Task ValidateAsync(BulkSyncReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.items == null || !req.items.Any(), "登録するデータがありません");
        await Task.CompletedTask;
    }

    private TMemoDetail MapToEntity(BulkSyncItem item) => new()
    {
        seq = 0,
        archive_id = 0,
        user_id = _user.login_user_id,
        latitude = item.latitude,
        longitude = item.longitude,
        title = item.title,
        body = item.body,
        memo_date = item.memo_date,
        memo_time = item.memo_time,
        face_emoji = item.face_emoji,
        weather_code = item.weather_code,
        link_url = item.link_url,
        memo_price = item.memo_price,
        del_flg = false
    };

}