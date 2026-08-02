using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;
using static LittleTripMemo.Services.Private.UpdateArchiveService;

namespace LittleTripMemo.Services.Admin;

public class GetShadowBanUsersService(UserContext userContext, AppUserRepository appUserRepository) : _BaseService(userContext)
{
    public record Response(IEnumerable<TAppUser> banUserList);
    public async Task<Response> ExecuteAsync()
    {
        await ValidateAsync();

        var users = await appUserRepository.GetShadowBanUsersAsync();
        return new Response(users);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }

}