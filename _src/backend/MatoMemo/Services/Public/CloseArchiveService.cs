using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Services;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Public;

/// <summary>公開まとめを非公開（クローズ）にするサービス</summary>
public class CloseArchiveService(UserContext userContext, ArchivePubRepository archivePubRepo) : _BaseService(userContext)
{
    public record CloseArchiveReq([Required] Guid login_user_id, int archive_id) : ILoginUserRequest;
    public record Response(int archiveId);

    public async Task<Response> ExecuteAsync(CloseArchiveReq req)
    {
        await ValidateAsync(req);
        await archivePubRepo.CloseByKeyAsync(req.archive_id);
        return new Response(req.archive_id);
    }

    private async Task ValidateAsync(CloseArchiveReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id == 0, "アーカイブIDが無効です");
        await Task.CompletedTask;
    }

}