using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Sys;

/// <summary>通報の登録・更新</summary>
public class UpsertReportService(UserContext user, SysReportRepository repo) : _BaseService(user)
{
    public record UpsertReportReq([Required] Guid login_user_id, Guid target_user_id, long archive_id, string? body) : ILoginUserRequest;
    public record Response(bool is_success);

    public async Task<Response> ExecuteAsync(UpsertReportReq req)
    {
        await ValidateAsync(req);
        await repo.UpsertAsync(new TSysReport { target_user_id = req.target_user_id, archive_id = req.archive_id, body = req.body });
        return new Response(true);
    }

    private async Task ValidateAsync(UpsertReportReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.target_user_id == Guid.Empty, "対象ユーザーが無効です");
        BusinessException.ThrowIf(req.archive_id <= 0, "対象アーカイブIDが無効です");
        await Task.CompletedTask;
    }

}