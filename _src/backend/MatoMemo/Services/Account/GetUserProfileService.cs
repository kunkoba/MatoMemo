using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Account;

public class GetUserProfileService(
    UserContext userContext,
    AppUserRepository appUserRepository
) : _BaseService(userContext)
{
    public record GetUserProfileReq(Guid target_user_id);

    public record Response(DtoUserProfile userProfile);

    public async Task<Response> ExecuteAsync(GetUserProfileReq req)
    {
        await ValidateAsync(req.target_user_id);

        // 1. ターゲットユーザーの情報を取得
        var targetUser = await appUserRepository.GetByUserIdAsync(req.target_user_id);
        BusinessException.ThrowIf(targetUser == null, "ユーザーが存在しません", "USER_NOT_FOUND");

        // 2. 共通DTOへマッピング（member_no, user_category, user_rank を含む最新版）
        bool is_owner = (targetUser.user_id == _user.login_user_id);
        bool is_admin = _user.plan_type == PlanType.Admin.ToString();
        // 管理者の場合は匿名設定でも非表示にしない
        bool hide = targetUser.anonymous_flg && !is_owner && !is_admin;

        var profile = new DtoUserProfile(
            targetUser.user_id,
            hide ? 0 : targetUser.member_no,
            hide ? null : targetUser.user_category,
            hide ? 0 : targetUser.user_rank,
            hide ? "👤" : targetUser.icon,
            hide ? "匿名" : targetUser.nick_name,
            hide ? null : targetUser.description,
            hide ? null : targetUser.link_1,
            hide ? null : targetUser.link_2,
            hide ? null : targetUser.link_3,
            targetUser.anonymous_flg,
            is_owner,
            targetUser.ban_flg,
            hide ? new() : targetUser.click_stats,
            hide ? new() : targetUser.info_stats,
            hide ? new() : targetUser.info_stats_pub,
            hide ? 0 : targetUser.report_count,
            hide ? new() : targetUser.view_history
        );

        return new Response(profile);
    }

    private async Task ValidateAsync(Guid userId)
    {
        BusinessException.ThrowIf(userId == Guid.Empty, "対象のユーザーIDが指定されていません");
        await Task.CompletedTask;
    }
}