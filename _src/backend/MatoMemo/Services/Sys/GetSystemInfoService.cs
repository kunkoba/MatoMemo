using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Sys;

/// <summary>
/// システム全体の共通統計（mgr_app_info）と、ログインユーザー固有のステータスを一括取得するサービス
/// </summary>
public class GetSystemInfoService(
    UserContext userContext,
    AppInfoRepository appInfoRepository,
    SysFeedbackRepository sysFeedbackRepository,
    SysNotificationRepository sysNotificationRepository,
    SysUserNotificationRepository sysUserNotificationRepository,
    SysReportRepository sysReportRepository,
    AppUserRepository appUserRepository
) : _BaseService(userContext)
{
    /// <summary>
    /// システム情報のデータ構造
    /// </summary>
    public record SystemInfoData(
        Guid login_user_id,
        TAppInfo app_info,
        IEnumerable<DtoFeedbackDetail> feedbacks,
        IEnumerable<TSysNotification> notifications,
        DtoUserProfile? ownerProfile,
        IEnumerable<TSysUserNotification>? userNotifications,
        IEnumerable<DtoMyReportDetail>? myReports
    );

public record Response(SystemInfoData systemInfo);

    /// <summary>
    /// システム情報の取得処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync()
    {
        // 1. バリデーション
        await ValidateAsync();

        // 2. 管理テーブルから集計済みアプリ統計情報を取得
        var appInfo = await appInfoRepository.GetAsync() ?? new TAppInfo();

        // 3. システム共通リストの取得（未ログインでも取得可能）
        var latestFeedbacks = await sysFeedbackRepository.GetAllFeedbacksAsync(0);
        var activeNotifications = await sysNotificationRepository.GetActiveNotificationsAsync();

        // 4. ユーザー固有情報の初期化
        DtoUserProfile? ownerProfile = null;
        IEnumerable<TSysUserNotification>? userNotifications = null;
        IEnumerable<DtoMyReportDetail>? myReports = null;

        // 5. ログイン済みの場合のみ、詳細情報を取得
        if (_user.login_user_id != Guid.Empty)
        {
            // ユーザープロフィールの取得（バッチ集計済みの統計情報を含む）
            var appUser = await appUserRepository.GetByUserIdAsync(_user.login_user_id);
            if (appUser != null)
            {
                ownerProfile = new DtoUserProfile(
                    appUser.user_id,
                    appUser.member_no,
                    appUser.user_category,
                    appUser.user_rank,
                    appUser.icon,
                    appUser.nick_name,
                    appUser.description,
                    appUser.link_1,
                    appUser.link_2,
                    appUser.link_3,
                    appUser.anonymous_flg,
                    is_owner: true,
                    is_ban: appUser.ban_flg,
                    appUser.click_stats,
                    appUser.info_stats,     // 秘密側統計
                    appUser.info_stats_pub,  // 公開側統計
                    appUser.report_count,
                    appUser.view_history
                );
            }

            // 自分宛ての通知一覧
            userNotifications = await sysUserNotificationRepository.GetByUserIdAsync();
            // 自分が行った通報の状態
            myReports = await sysReportRepository.GetMyReportsWithDetailsAsync();
        }

        // 6. 結果を集約して返却
        return new Response(new SystemInfoData(
            _user.login_user_id,
            appInfo,
            latestFeedbacks,
            activeNotifications,
            ownerProfile,
            userNotifications,
            myReports
        ));
    }

    /// <summary>
    /// 業務バリデーション
    /// </summary>
    private async Task ValidateAsync()
    {
        await Task.CompletedTask;
    }

}