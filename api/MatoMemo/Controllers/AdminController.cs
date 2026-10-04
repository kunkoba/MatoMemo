using LittleTripMemo.Common;
using LittleTripMemo.JWT;
using LittleTripMemo.Repository;
using LittleTripMemo.Services.Admin;
using Microsoft.AspNetCore.Mvc;

namespace LittleTripMemo.Controllers;

[ApiController]
[Route("api/[controller]")]
[CustomAuthorize]
public class AdminController(
    UserContext userContext,
    JwtService jwtService,
    ITransactionProvider provider, // 追加
    IWebHostEnvironment env, // 追加
    GetAdminAllInfoService getAdminAllInfoService,
    GetReportDetailsService getReportDetailsService,
    AdminCloseArchivePubService adminCloseArchivePubService,
    AdminUnpublishArchiveService adminUnpublishArchiveService,
    SendUserNotificationService sendUserNotificationService,
    UpsertNotificationService upsertNotificationService,
    GetAllFeedbackService getAllFeedbackService,
    UpdateUserBanStatusService updateUserBanStatusService,
    GetReportSummaryService getReportSummaryService,
    GetAdminNotificationsService getAdminNotificationsService,
    GetSentUserMailListService getSentUserMailListService,
    GetUserHistoryService getUserHistoryService,
    GetShadowBanUsersService getShadowBanUsersService
) : _BaseController(userContext, jwtService, provider, env)
{
    /// <summary>
    /// 管理者情報のすべてを取得する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("GetAdminAllInfo")]
    public async Task<IActionResult> GetAdminAllInfo([FromBody] GetAdminAllInfoService.GetAdminAllInfoReq req)
        => OkWithNewToken(await getAdminAllInfoService.ExecuteAsync(req));

    /// <summary>
    /// 通報情報の詳細を取得する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("GetReportDetails")]
    public async Task<IActionResult> GetReportDetails([FromBody] GetReportDetailsService.GetReportDetailsReq req)
        => OkWithNewToken(await getReportDetailsService.ExecuteAsync(req));

    /// <summary>
    /// 強制的にまとめをclose化する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("AdminCloseArchive")]
    public async Task<IActionResult> AdminCloseArchive([FromBody] AdminCloseArchivePubService.AdminCloseArchivePubReq req)
        => OkWithNewToken(await adminCloseArchivePubService.ExecuteAsync(req));

    /// <summary>
    /// 強制的にまとめをprivate化する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("AdminUnpublishArchive")]
    public async Task<IActionResult> AdminUnpublishArchive([FromBody] AdminUnpublishArchiveService.AdminUnpublishArchiveReq req)
        => OkWithNewToken(await adminUnpublishArchiveService.ExecuteAsync(req));

    /// <summary>
    /// ユーザーに通知を送信する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("SendUserNotification")]
    public async Task<IActionResult> SendUserNotification([FromBody] SendUserNotificationService.SendUserNotificationReq req)
        => OkWithNewToken(await sendUserNotificationService.ExecuteAsync(req));

    /// <summary>
    /// 通知情報を新規作成または更新する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("UpsertNotification")]
    public async Task<IActionResult> UpsertNotification([FromBody] UpsertNotificationService.UpsertNotificationReq req)
        => OkWithNewToken(await upsertNotificationService.ExecuteAsync(req));

    /// <summary>
    /// すべてのフィードバック情報を取得する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("GetAllFeedback")]
    public async Task<IActionResult> GetAllFeedback([FromBody] GetAllFeedbackService.GetAllFeedbackReq req)
        => OkWithNewToken(await getAllFeedbackService.ExecuteAsync(req));

    /// <summary>
    /// ユーザーのBAN状態を更新する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("UpdateUserBanStatus")]
    public async Task<IActionResult> UpdateUserBanStatus([FromBody] UpdateUserBanStatusService.UpdateUserBanStatusReq req)
        => OkWithNewToken(await updateUserBanStatusService.ExecuteAsync(req));

    /// <summary>
    /// 通報情報の集計結果を取得する（管理者のみ）
    /// </summary>
    /// <returns></returns>
    [HttpPost("GetReportSummary")]
    public async Task<IActionResult> GetReportSummary()
        => OkWithNewToken(await getReportSummaryService.ExecuteAsync());

    /// <summary>
    /// すべての通知情報を取得する（管理者のみ）
    /// </summary>
    /// <returns></returns>
    [HttpPost("GetAdminNotifications")]
    public async Task<IActionResult> GetAdminNotifications()
        => OkWithNewToken(await getAdminNotificationsService.ExecuteAsync());

    /// <summary>
    /// 管理者通知の送信済みメールリストを取得する（管理者のみ）
    /// </summary>
    /// <returns></returns>
    [HttpPost("GetSentUserMailList")]
    public async Task<IActionResult> GetSentUserMailList()
        => OkWithNewToken(await getSentUserMailListService.ExecuteAsync());

    /// <summary>
    /// 特定のユーザーの全行動履歴を取得する（管理者のみ）
    /// </summary>
    [HttpPost("GetUserHistory")]
    public async Task<IActionResult> GetUserHistory([FromBody] GetUserHistoryService.GetUserHistoryReq req)
        => OkWithNewToken(await getUserHistoryService.ExecuteAsync(req));

    /// <summary>
    /// banユーザーを取得する（管理者のみ）
    /// </summary>
    /// <returns></returns>
    [HttpPost("GetBanUsers")]
    public async Task<IActionResult> GetBanUsers()
        => OkWithNewToken(await getShadowBanUsersService.ExecuteAsync());

}