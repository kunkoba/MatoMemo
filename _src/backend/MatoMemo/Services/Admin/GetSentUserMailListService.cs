using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;

namespace LittleTripMemo.Services.Admin;

public class GetSentUserMailListService : _BaseService
{
    private readonly SysUserNotificationRepository _repo;

    public record Response(IEnumerable<DtoUserNotification> userMailList);

    public GetSentUserMailListService(UserContext u, SysUserNotificationRepository r) : base(u) => _repo = r;

    public async Task<Response> ExecuteAsync()
    {
        // 1. 作法：検証
        await ValidateAsync();

        // 2. 実行
        var list = await _repo.GetAllAsync(100);
        return new Response(list);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }

}