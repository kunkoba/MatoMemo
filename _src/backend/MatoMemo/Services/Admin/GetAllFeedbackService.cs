using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Admin;

public class GetAllFeedbackService : _BaseService
{
    private readonly SysFeedbackRepository _repo;

    // ✅ リクエストDTOに範囲指定を追加
    public record GetAllFeedbackReq(int score = 0);
    // ✅ Response をリスト形式 (IEnumerable) に変更
    public record Response(IEnumerable<DtoFeedbackDetail> feedbackList);

    public GetAllFeedbackService(UserContext user, SysFeedbackRepository repo) : base(user)
    {
        _repo = repo;
    }

    public async Task<Response> ExecuteAsync(GetAllFeedbackReq req)
    {
        await ValidateAsync();

        // ✅ リポジトリの新しいメソッドを呼び出す
        var result = await _repo.GetAllFeedbacksAsync(req.score);

        return new Response(result);
    }

    private async Task ValidateAsync()
    {
        // 管理者チェック
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }
}