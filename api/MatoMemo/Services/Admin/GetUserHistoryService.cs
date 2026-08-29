using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Admin;

/// <summary>
/// 管理者が特定のユーザーの行動履歴一覧を取得するためのサービス
/// </summary>
public class GetUserHistoryService(
    UserContext userContext,
    SysUserHistoryRepository sysUserHistoryRepository
) : _BaseService(userContext)
{
    public record GetUserHistoryReq(
        [Required] Guid login_user_id,
        [Required] Guid target_user_id
    ) : ILoginUserRequest;

    public record Response(IEnumerable<TSysUserHistory> historyList);

    /// <summary>
    /// 履歴取得処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(GetUserHistoryReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. 実行（リポジトリから時系列順に取得）
        var historyList = await sysUserHistoryRepository.GetByUserIdAsync(req.target_user_id);

        return new Response(historyList);
    }

    /// <summary>
    /// 業務バリデーション
    /// </summary>
    private async Task ValidateAsync(GetUserHistoryReq req)
    {
        // 権限チェック
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");

        // 入力チェック
        BusinessException.ThrowIf(req.target_user_id == Guid.Empty, "対象ユーザーIDが不正です");

        await Task.CompletedTask;
    }

}