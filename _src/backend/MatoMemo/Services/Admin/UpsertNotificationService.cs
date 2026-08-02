using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Admin;

public class UpsertNotificationService : _BaseService
{
    private readonly SysNotificationRepository _repo;

    public record UpsertNotificationReq(
        [Required] Guid login_user_id,
        long seq,
        string title,
        string body,
        string? link_url,
        short kind,
        DateTime disp_from,
        DateTime disp_to
    ) : ILoginUserRequest;

    public record Response(bool is_success);

    public UpsertNotificationService(UserContext user, SysNotificationRepository repo) : base(user) => _repo = repo;

    public async Task<Response> ExecuteAsync(UpsertNotificationReq req)
    {
        await ValidateAsync();
        await _repo.UpsertAsync(new TSysNotification
        {
            seq = req.seq,
            title = req.title,
            body = req.body,
            link_url = req.link_url,
            kind = req.kind,
            disp_from = req.disp_from,
            disp_to = req.disp_to
        });
        return new Response(true);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }
}