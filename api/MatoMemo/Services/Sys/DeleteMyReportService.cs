using MatoMemo.Common;
using MatoMemo.Exceptions;
using MatoMemo.Repository.Sys;
using System.ComponentModel.DataAnnotations;

namespace MatoMemo.Services.Sys;

/// <summary>自分の通報の削除</summary>
public class DeleteMyReportService(UserContext user, SysReportRepository repo) : _BaseService(user)
{
    public record DeleteMyReportReq(
        long archive_id
    );
    public record Response(bool is_success);

    public async Task<Response> ExecuteAsync(DeleteMyReportReq req)
    {
        await ValidateAsync(req);
        await repo.DeletePhysicalAsync(req.archive_id);
        return new Response(true);
    }

    private async Task ValidateAsync(DeleteMyReportReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id <= 0, "アーカイブIDが無効です");
        await Task.CompletedTask;
    }

}