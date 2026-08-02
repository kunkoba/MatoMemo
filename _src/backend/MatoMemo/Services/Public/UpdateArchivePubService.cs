using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Services;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Public;

/// <summary>公開アーカイブ情報の更新</summary>
public class UpdateArchivePubService(
    UserContext userContext,
    ArchivePubRepository archivePubRepo
) : _BaseService(userContext)
{
    public record UpdateArchivePubReq(
        [Required] Guid login_user_id,
        int archive_id,
        string category,
        string title,
        string memo,
        string? link_url,
        string currency_unit
    ) : ILoginUserRequest;

    public record Response(int archiveId);

    public async Task<Response> ExecuteAsync(UpdateArchivePubReq req)
    {
        await ValidateAsync(req);
        await archivePubRepo.UpdateByKeyAsync(new TMemoArchivePub
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

    private async Task ValidateAsync(UpdateArchivePubReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id == 0, "アーカイブIDが無効です");
        BusinessException.ThrowIf(string.IsNullOrEmpty(req.title), "タイトルは必須です");
        await Task.CompletedTask;
    }

}