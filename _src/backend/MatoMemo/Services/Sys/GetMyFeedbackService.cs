using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Sys;

/// <summary>自分のフィードバック取得</summary>
public class GetMyFeedbackService(UserContext user, SysFeedbackRepository repo) : _BaseService(user)
{
    public record Response(TSysFeedback? myFeedback);

    public async Task<Response> ExecuteAsync()
    {
        await ValidateAsync();
        var result = await repo.GetMyFeedbacksAsync();
        return new Response(result);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        await Task.CompletedTask;
    }

}