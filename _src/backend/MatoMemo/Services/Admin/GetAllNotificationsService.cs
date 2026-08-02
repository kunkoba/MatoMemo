using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Admin;

public class GetAllNotificationsService : _BaseService
{
    private readonly SysNotificationRepository _repo;
    public record GetAllNotificationsReq(int limit = 100);
    public record Response(IEnumerable<TSysNotification> notifications);

    public GetAllNotificationsService(UserContext user, SysNotificationRepository repo) : base(user)
    {
        _repo = repo;
    }

    public async Task<Response> ExecuteAsync(GetAllNotificationsReq req)
    {
        await ValidateAsync();
        var result = await _repo.GetAllNotificationsAsync(req.limit);
        return new Response(result);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }
}