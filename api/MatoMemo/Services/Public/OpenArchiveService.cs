using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Public;

/// <summary>非公開（クローズ）のまとめを一般公開にするサービス</summary>
public class OpenArchiveService(UserContext userContext, ArchivePubRepository archivePubRepo) : _BaseService(userContext)
{
    public record OpenArchiveReq([Required] Guid login_user_id, int archive_id) : ILoginUserRequest;
    public record Response(int archiveId);

    public async Task<Response> ExecuteAsync(OpenArchiveReq req)
    {
        await ValidateAsync(req);
        await archivePubRepo.OpenByKeyAsync(req.archive_id);
        return new Response(req.archive_id);
    }

    private async Task ValidateAsync(OpenArchiveReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id == 0, "アーカイブIDが無効です");
        await Task.CompletedTask;
    }

}