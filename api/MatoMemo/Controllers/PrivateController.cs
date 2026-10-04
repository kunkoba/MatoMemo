using LittleTripMemo.Common;
using LittleTripMemo.JWT;
using LittleTripMemo.Repository;
using LittleTripMemo.Services.Private;
using Microsoft.AspNetCore.Mvc;

namespace LittleTripMemo.Controllers;

[ApiController]
[Route("api/[controller]")]
[CustomAuthorize]
public class PrivateController(
    UserContext userContext,
    JwtService jwtService,
    ITransactionProvider provider, // 追加
    IWebHostEnvironment env, // 追加
    GetUnMergeDetailsService getUnMergeDetailsService,
    GetArchiveDetailsService getArchiveDetailsService,
    GetArchiveListService getArchiveListService,
    MergeDetailsService mergeDetailsService,
    AddDetailsService addDetailsService,
    UpdateArchiveService updateArchiveService,
    DeleteArchiveService deleteArchiveService,
    DeleteStrayDetailsService deleteStrayDetailsService,
    DetachDetailsService detachDetailsService,
    UpdateDetailService updateDetailService,
    BulkSyncDetailsService bulkSyncDetailsService,
    PublishArchiveService publishArchiveService,
    BulkUpdateCoordinatesService bulkUpdateCoordinatesService
) : _BaseController(userContext, jwtService, provider, env)
{
    [HttpPost("GetUnMergeDetails")]
    public async Task<IActionResult> GetUnMergeDetails([FromBody] GetUnMergeDetailsService.GetUnMergeDetailsReq req)
        => OkWithNewToken(await getUnMergeDetailsService.ExecuteAsync(req));

    [HttpPost("GetArchiveDetails")]
    public async Task<IActionResult> GetArchiveDetails([FromBody] GetArchiveDetailsService.GetArchiveDetailsReq req)
        => OkWithNewToken(await getArchiveDetailsService.ExecuteAsync(req));

    [HttpPost("GetArchiveList")]
    public async Task<IActionResult> GetArchiveList([FromBody] GetArchiveListService.GetArchiveListReq req)
        => OkWithNewToken(await getArchiveListService.ExecuteAsync());

    [HttpPost("MergeDetails")]
    public async Task<IActionResult> MergeDetails([FromBody] MergeDetailsService.MergeDetailsReq req)
        => OkWithNewToken(await mergeDetailsService.ExecuteAsync(req));

    [HttpPost("AddDetails")]
    public async Task<IActionResult> AddDetails([FromBody] AddDetailsService.AddDetailsReq req)
        => OkWithNewToken(await addDetailsService.ExecuteAsync(req));

    [HttpPost("UpdateArchive")]
    public async Task<IActionResult> UpdateArchive([FromBody] UpdateArchiveService.UpdateArchiveReq req)
        => OkWithNewToken(await updateArchiveService.ExecuteAsync(req));

    [HttpPost("DeleteArchive")]
    public async Task<IActionResult> DeleteArchive([FromBody] DeleteArchiveService.DeleteArchiveReq req)
        => OkWithNewToken(await deleteArchiveService.ExecuteAsync(req));

    [HttpPost("DeleteStrayDetails")]
    public async Task<IActionResult> DeleteStrayDetails([FromBody] DeleteStrayDetailsService.DeleteStrayDetailsReq req)
        => OkWithNewToken(await deleteStrayDetailsService.ExecuteAsync(req));

    [HttpPost("DetachDetails")]
    public async Task<IActionResult> DetachDetails([FromBody] DetachDetailsService.DetachDetailsReq req)
        => OkWithNewToken(await detachDetailsService.ExecuteAsync(req));

    [HttpPost("PublishArchive")]
    public async Task<IActionResult> PublishArchive([FromBody] PublishArchiveService.PublishArchiveReq req)
        => OkWithNewToken(await publishArchiveService.ExecuteAsync(req));

    [HttpPost("UpdateDetail")]
    public async Task<IActionResult> UpdateDetail([FromBody] UpdateDetailService.UpdateDetailReq req)
        => OkWithNewToken(await updateDetailService.ExecuteAsync(req));

    [HttpPost("BulkSyncDetails")]
    public async Task<IActionResult> BulkSyncDetails([FromBody] BulkSyncDetailsService.BulkSyncReq req)
        => OkWithNewToken(await bulkSyncDetailsService.ExecuteAsync(req));

    /// <summary>
    /// アーカイブ内の明細の地点情報を一括更新する
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("BulkUpdateCoordinates")]
    public async Task<IActionResult> BulkUpdateCoordinates([FromBody] BulkUpdateCoordinatesService.BulkUpdateCoordinatesReq req)
        => OkWithNewToken(await bulkUpdateCoordinatesService.ExecuteAsync(req));

}