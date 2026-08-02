using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Admin;

public class GetReportDetailsService : _BaseService
{
    private readonly SysReportRepository _repo;
	private readonly AppUserRepository _appUserRepo; // サービスからリポジトリへ変更

	public record GetReportDetailsReq(Guid target_user_id, long archive_id);

	public record Response(
		IEnumerable<DtoReportDetail> reports,
		DtoUserProfile target_userProfile
	);

	public GetReportDetailsService(
        UserContext user,
        SysReportRepository repo,
		AppUserRepository appUserRepo) 
        : base(user)
	{
        _repo = repo;
		_appUserRepo = appUserRepo;
	}

    public async Task<Response> ExecuteAsync(GetReportDetailsReq req)
    {
        // 1. 検証
        await ValidateAsync();

        // 2. 実行
        // 通報詳細リスト（通報者情報入り）を取得
        var reports = await _repo.GetReportsByTargetAsync(req.target_user_id, req.archive_id);

		// ターゲットユーザーの情報を直接取得
		var user = await _appUserRepo.GetByUserIdAsync(req.target_user_id)
			?? throw new BusinessException("ユーザーが存在しません", "USER_NOT_FOUND");

		var targetProfile = new DtoUserProfile(
			user.user_id,
            user.member_no,
            user.user_category,
            user.user_rank,
            user.icon,
			user.nick_name,
			user.description,
			user.link_1, user.link_2, user.link_3,
			user.anonymous_flg,
			is_owner: (user.user_id == _user.login_user_id),
			is_ban: user.ban_flg,
            user.click_stats,
			user.info_stats,
			user.info_stats_pub,
			user.report_count,
			user.view_history
        );

		// 3. マッピング
		return new Response(reports, targetProfile);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }
}