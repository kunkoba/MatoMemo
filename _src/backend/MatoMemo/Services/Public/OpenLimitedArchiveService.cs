using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Services;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// 指定された公開まとめを「限定公開（検索除外）」に設定するサービス
/// </summary>
public class OpenLimitedArchiveService(UserContext user, ArchivePubRepository repo) : _BaseService(user)
{
    public record OpenLimitedArchiveReq(
        [Required] Guid login_user_id,
        [Required] int archive_id
    ) : ILoginUserRequest;

    public record Response(int archiveId);

    public async Task<Response> ExecuteAsync(OpenLimitedArchiveReq req)
    {
        await ValidateAsync(req);
        await repo.UpdateLimitedOpenByKeyAsync(req.archive_id, true);
        return new Response(req.archive_id);
    }

    private async Task ValidateAsync(OpenLimitedArchiveReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id <= 0, "無効なアーカイブIDです");
        await Task.CompletedTask;
    }

}