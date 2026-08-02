using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.Core;
using LittleTripMemo.Services;
using System.ComponentModel.DataAnnotations;

/// <summary>システム設定（SYSTEMカテゴリー）を一括更新するサービス</summary>
public class UpdateCoreConfigService(
    UserContext user,
    CoreConfigRepository coreRepo,
    ITransactionProvider provider
) : _BaseService(user)
{
    public record ConfigUpdateItem(string key, string value);
    public record UpdateCoreConfigReq([Required] Guid login_user_id, IEnumerable<ConfigUpdateItem> items) : ILoginUserRequest;
    public record Response(bool is_success);

    public async Task<Response> ExecuteAsync(UpdateCoreConfigReq req)
    {
        await ValidateAsync();

        using var tran = provider.BeginTransaction();
        try
        {
            foreach (var item in req.items)
            {
                await coreRepo.UpdateConfigAsync("SYSTEM", item.key, item.value);
            }

            tran.Commit();
            return new Response(true);
        }
        catch { throw; }
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }

}