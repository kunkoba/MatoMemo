using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;

namespace LittleTripMemo.Services.Admin; // フォルダ構成に基づき修正

/// <summary>全ユーザー宛の通知送信履歴取得（管理者用）</summary>
public class GetAllUserNotificationsService(UserContext user, SysUserNotificationRepository repo) : _BaseService(user)
{
    public record GetAllUserNotificationsReq(int limit = 100);
    public record Response(IEnumerable<DtoUserNotification> userMailList);

    public async Task<Response> ExecuteAsync(GetAllUserNotificationsReq req)
    {
        await ValidateAsync();
        var result = await repo.GetAllAsync(req.limit);
        return new Response(result);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }

}