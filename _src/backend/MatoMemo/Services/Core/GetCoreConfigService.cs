using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository.Core;

namespace LittleTripMemo.Services.Core;

/// <summary>
/// システム設定（SYSTEMカテゴリー）の一覧を取得するサービス
/// </summary>
public class GetCoreConfigService(
    UserContext user,
    CoreConfigRepository coreRepo
) : _BaseService(user)
{
    public record Response(IEnumerable<dynamic> configs);

    /// <summary>
    /// 管理者向けにシステム設定一覧を返却する
    /// </summary>
    public async Task<Response> ExecuteAsync()
    {
        // 1. 検証
        await ValidateAsync();

        // 2. 実行
        var result = await coreRepo.GetConfigsByCategoryAsync("SYSTEM");

        return new Response(result);
    }

    private async Task ValidateAsync()
    {
        // 管理者権限チェック
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");

        await Task.CompletedTask;
    }

}