using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Sys;

/// <summary>特定のアーカイブに対する自分の通報取得</summary>
public class GetMyReportService(UserContext user, SysReportRepository repo) : _BaseService(user)
{
    public record GetMyReportReq(long archive_id);
    public record Response(TSysReport? myReport);

    public async Task<Response> ExecuteAsync(GetMyReportReq req)
    {
        await ValidateAsync(req);
        var result = await repo.GetMyReportByArchiveIdAsync(req.archive_id);
        return new Response(result);
    }

    private async Task ValidateAsync(GetMyReportReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id <= 0, "アーカイブIDが無効です");
        await Task.CompletedTask;
    }

}