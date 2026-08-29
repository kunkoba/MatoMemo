using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>
/// 秘密側の明細情報を更新するサービス
/// </summary>
public class UpdateDetailService(
    UserContext userContext,
    ITransactionProvider provider,
    DetailRepository detailRepo,
    ArchiveRepository archiveRepo
) : _BaseService(userContext)
{
    public record UpdateDetailReq(
        [Required] Guid login_user_id,
        [Required(ErrorMessage = "seqは必須です")][Range(0, int.MaxValue)] long seq,
        [Required(ErrorMessage = "旅の記録IDは必須です")] int archive_id,
        [Required(ErrorMessage = "緯度は必須です")] decimal latitude,
        [Required(ErrorMessage = "経度は必須です")] decimal longitude,
        [Required(ErrorMessage = "タイトルは必須です")][StringLength(100)] string title,
        [Required(ErrorMessage = "本文は必須です")] string body,
        [Required(ErrorMessage = "日付は必須です")] string memo_date,
        [Required(ErrorMessage = "時間は必須です")] string memo_time,
        [Required(ErrorMessage = "表情IDは必須です")] string face_emoji,
        [Required(ErrorMessage = "天気IDは必須です")] string weather_code,
        string? link_url,
        [Required(ErrorMessage = "金額は必須です")] int memo_price,
        [Required(ErrorMessage = "感情は必須です")] int feel_type
    ) : ILoginUserRequest;

    public record Response(long seq);

    /// <summary>
    /// 明細情報を更新し、紐づくアーカイブの統計情報をリフレッシュする
    /// </summary>
    public async Task<Response> ExecuteAsync(UpdateDetailReq req)
    {
        // 1. 検証
        await ValidateAsync(req);

        // 2. 実行（一貫性確保のためトランザクションを使用）
        using var tran = provider.BeginTransaction();
        try
        {
            var entity = MapToEntity(req);

            // 更新処理
            await detailRepo.UpdateByKeyAsync(entity);

            if (req.archive_id > 0)
            {
                // 親（アーカイブ）の件数および更新日時をリフレッシュ
                await archiveRepo.UpdateDetailCountAsync(req.archive_id);
            }

            tran.Commit();
            return new Response(req.seq);
        }
        catch
        {
            throw;
        }
    }

    private async Task ValidateAsync(UpdateDetailReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.seq == 0, "SeqIDが無効です");

        await Task.CompletedTask;
    }

    private TMemoDetail MapToEntity(UpdateDetailReq req) => new()
    {
        seq = req.seq,
        archive_id = req.archive_id,
        user_id = _user.login_user_id,
        latitude = req.latitude,
        longitude = req.longitude,
        title = req.title,
        body = req.body,
        memo_date = req.memo_date,
        memo_time = req.memo_time,
        face_emoji = req.face_emoji,
        weather_code = req.weather_code,
        link_url = req.link_url,
        memo_price = req.memo_price,
        feel_type = req.feel_type,
        del_flg = false
    };

}