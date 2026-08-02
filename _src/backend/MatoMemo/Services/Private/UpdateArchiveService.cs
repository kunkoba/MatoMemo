using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>
/// 秘密側のまとめ（アーカイブ）情報を更新するサービス
/// </summary>
public class UpdateArchiveService(
    UserContext userContext,
    ArchiveRepository archiveRepo
) : _BaseService(userContext)
{
    public record UpdateArchiveReq(
        [Required] Guid login_user_id,
        [Required] int archive_id,
        string category,
        [Required] string title,
        string memo,
        string? link_url,
        string currency_unit
    ) : ILoginUserRequest;

    public record Response(int archiveId);

    /// <summary>
    /// アーカイブの基本情報を更新する
    /// </summary>
    public async Task<Response> ExecuteAsync(UpdateArchiveReq req)
    {
        // 1. 検証
        await ValidateAsync(req);

        // 2. 実行
        await archiveRepo.UpdateByKeyAsync(new TMemoArchive
        {
            archive_id = req.archive_id,
            category = req.category,
            title = req.title,
            memo = req.memo,
            link_url = req.link_url,
            currency_unit = req.currency_unit
        });

        return new Response(req.archive_id);
    }

    private async Task ValidateAsync(UpdateArchiveReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id == 0, "アーカイブIDが無効です");
        BusinessException.ThrowIf(string.IsNullOrEmpty(req.title), "タイトルは必須です");

        await Task.CompletedTask;
    }

}