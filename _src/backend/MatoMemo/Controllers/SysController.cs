using LittleTripMemo.Common;
using LittleTripMemo.JWT;
using LittleTripMemo.Repository;
using LittleTripMemo.Services.Sys;
using Microsoft.AspNetCore.Mvc;

namespace LittleTripMemo.Controllers;

/// <summary>
/// システム共通機能（お知らせ、フィードバック、通報等）を提供するコントローラー
/// </summary>
[ApiController]
[Route("api/[controller]")]
[CustomAuthorize]
public class SysController(
    UserContext userContext,
    JwtService jwtService,
    ITransactionProvider provider, // 追加
    GetSystemInfoService getSystemInfoService,
    UpsertFeedbackService upsertFeedbackService,
    GetMyFeedbackService getMyFeedbackService,
    UpsertReportService upsertReportService,
    GetMyReportService getMyReportService,
    DeleteMyReportService deleteMyReportService,
    GetMyUserNotificationsService getMyUserNotificationsService
) : _BaseController(userContext, jwtService, provider)
{
    /// <summary>
    /// システム全体の基本情報（お知らせ、統計、自分の通知状況等）をまとめて取得する
    /// </summary>
    [HttpPost("GetSystemInfo")]
    public async Task<IActionResult> GetSystemInfo()
        => OkWithBase(await getSystemInfoService.ExecuteAsync());

    /// <summary>
    /// 運営へのフィードバック（評価とコメント）を送信または更新する
    /// </summary>
    [HttpPost("UpsertFeedback")]
    public async Task<IActionResult> UpsertFeedback([FromBody] UpsertFeedbackService.UpsertFeedbackReq req)
        => OkWithBase(await upsertFeedbackService.ExecuteAsync(req));

    /// <summary>
    /// 自分が送信したフィードバック内容を取得する
    /// </summary>
    [HttpPost("GetMyFeedback")]
    public async Task<IActionResult> GetMyFeedback()
        => OkWithBase(await getMyFeedbackService.ExecuteAsync());

    /// <summary>
    /// 不適切なコンテンツ（まとめ）を通報する
    /// </summary>
    [HttpPost("UpsertReport")]
    public async Task<IActionResult> UpsertReport([FromBody] UpsertReportService.UpsertReportReq req)
        => OkWithBase(await upsertReportService.ExecuteAsync(req));

    /// <summary>
    /// 特定のアーカイブに対して自分が行った通報内容を確認する
    /// </summary>
    [HttpPost("GetMyReport")]
    public async Task<IActionResult> GetMyReport([FromBody] GetMyReportService.GetMyReportReq req)
        => OkWithBase(await getMyReportService.ExecuteAsync(req));

    /// <summary>
    /// 過去に行った通報を取り下げる
    /// </summary>
    [HttpPost("DeleteMyReport")]
    public async Task<IActionResult> DeleteMyReport([FromBody] DeleteMyReportService.DeleteMyReportReq req)
        => OkWithBase(await deleteMyReportService.ExecuteAsync(req));

    /// <summary>
    /// 自分宛に届いている個別通知（運営からの連絡等）の一覧を取得する
    /// </summary>
    [HttpPost("GetMyUserNotifications")]
    public async Task<IActionResult> GetMyUserNotifications()
        => OkWithBase(await getMyUserNotificationsService.ExecuteAsync());

}