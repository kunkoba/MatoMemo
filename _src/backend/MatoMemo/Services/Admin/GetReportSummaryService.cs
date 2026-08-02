using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Admin;

public class GetReportSummaryService : _BaseService
{
    private readonly SysReportRepository _repo;

    public record Response(IEnumerable<DtoReportSummary> reportSummary);

    public GetReportSummaryService(UserContext userContext, SysReportRepository sysReportRepository) : base(userContext) => _repo = sysReportRepository;

    public async Task<Response> ExecuteAsync()
    {
        // 1. 作法：検証
        await ValidateAsync();

        // 2. 実行
        var list = await _repo.GetReportSummaryAsync();
        return new Response(list);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }

}