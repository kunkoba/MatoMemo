using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;

namespace LittleTripMemo.Services.Sys;

/// <summary>自分宛の通知一覧取得</summary>
public class GetMyUserNotificationsService(UserContext user, SysUserNotificationRepository repo) : _BaseService(user)
{
    public record Response(IEnumerable<TSysUserNotification> notifications);

    public async Task<Response> ExecuteAsync()
    {
        await ValidateAsync();
        var list = await repo.GetByUserIdAsync();
        return new Response(list);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        await Task.CompletedTask;
    }

}