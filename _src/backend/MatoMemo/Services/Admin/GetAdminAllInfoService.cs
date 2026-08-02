using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services.Admin;
using LittleTripMemo.Services.Sys;

namespace LittleTripMemo.Services.Admin;

/// <summary>
/// 管理者ダッシュボード用の一括情報取得サービス。
/// 既存の4つの管理系サービスを集約します。
/// </summary>
public class GetAdminAllInfoService : _BaseService
{
    private readonly SysNotificationRepository _notifRepo;
    private readonly SysReportRepository _reportRepo;
    private readonly SysFeedbackRepository _feedbackRepo;
    private readonly SysUserNotificationRepository _userNotifRepo;

    // まとめて取得する際の各サービスのパラメータ
    public record GetAdminAllInfoReq();

    // 4つのデータセットを内包するレスポンス
    public record Response(
        IEnumerable<TSysNotification> notifications,
        IEnumerable<DtoReportSummary> reportSummary,
        IEnumerable<DtoFeedbackDetail> feedbackList,
        IEnumerable<DtoUserNotification> userMailList
    );

    public GetAdminAllInfoService(
        UserContext user,
        SysNotificationRepository notifRepo,
        SysReportRepository reportRepo,
        SysFeedbackRepository feedbackRepo,
        SysUserNotificationRepository userNotifRepo
    ) : base(user)
    {
        _notifRepo = notifRepo;
        _reportRepo = reportRepo;
        _feedbackRepo = feedbackRepo;
        _userNotifRepo = userNotifRepo;
    }

    /// <summary>
    /// サービスからサービスを呼び出す（アグリゲータサービス）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    public async Task<Response> ExecuteAsync(GetAdminAllInfoReq req)
    {
        // 1. 検証（管理者権限チェック）
        await ValidateAsync();

        // 2. リポジトリを直接呼び出してデータを取得
        // お知らせ一覧（最新100件）
        var notifications = await _notifRepo.GetAllNotificationsAsync(100);

        // 通報サマリー
        var reportSummary = await _reportRepo.GetReportSummaryAsync();

        // フィードバック一覧（全スコア対象）
        var feedbackList = await _feedbackRepo.GetAllFeedbacksAsync(0);

        // 個人通知履歴（最新100件）
        var userMailList = await _userNotifRepo.GetAllAsync(100);

        // 3. 結果の集約
        return new Response(
            notifications,
            reportSummary,
            feedbackList,
            userMailList
        );
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");
        await Task.CompletedTask;
    }
}