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
    RecreatePublicArchiveService recreatePublicArchiveService // ★救済機能を追加
) : _BaseController(userContext, jwtService, provider)
{
    [HttpPost("GetUnMergeDetails")]
    public async Task<IActionResult> GetUnMergeDetails([FromBody] GetUnMergeDetailsService.GetUnMergeDetailsReq req)
        => OkWithBase(await getUnMergeDetailsService.ExecuteAsync(req));

    [HttpPost("GetArchiveDetails")]
    public async Task<IActionResult> GetArchiveDetails([FromBody] GetArchiveDetailsService.GetArchiveDetailsReq req)
        => OkWithBase(await getArchiveDetailsService.ExecuteAsync(req));

    [HttpPost("GetArchiveList")]
    public async Task<IActionResult> GetArchiveList([FromBody] GetArchiveListService.GetArchiveListReq req)
        => OkWithBase(await getArchiveListService.ExecuteAsync());

    [HttpPost("MergeDetails")]
    public async Task<IActionResult> MergeDetails([FromBody] MergeDetailsService.MergeDetailsReq req)
        => OkWithBase(await mergeDetailsService.ExecuteAsync(req));

    [HttpPost("AddDetails")]
    public async Task<IActionResult> AddDetails([FromBody] AddDetailsService.AddDetailsReq req)
        => OkWithBase(await addDetailsService.ExecuteAsync(req));

    [HttpPost("UpdateArchive")]
    public async Task<IActionResult> UpdateArchive([FromBody] UpdateArchiveService.UpdateArchiveReq req)
        => OkWithBase(await updateArchiveService.ExecuteAsync(req));

    [HttpPost("DeleteArchive")]
    public async Task<IActionResult> DeleteArchive([FromBody] DeleteArchiveService.DeleteArchiveReq req)
        => OkWithBase(await deleteArchiveService.ExecuteAsync(req));

    [HttpPost("DeleteStrayDetails")]
    public async Task<IActionResult> DeleteStrayDetails([FromBody] DeleteStrayDetailsService.DeleteStrayDetailsReq req)
        => OkWithBase(await deleteStrayDetailsService.ExecuteAsync(req));

    [HttpPost("DetachDetails")]
    public async Task<IActionResult> DetachDetails([FromBody] DetachDetailsService.DetachDetailsReq req)
        => OkWithBase(await detachDetailsService.ExecuteAsync(req));

    [HttpPost("PublishArchive")]
    public async Task<IActionResult> PublishArchive([FromBody] PublishArchiveService.PublishArchiveReq req)
        => OkWithBase(await publishArchiveService.ExecuteAsync(req));

    [HttpPost("UpdateDetail")]
    public async Task<IActionResult> UpdateDetail([FromBody] UpdateDetailService.UpdateDetailReq req)
        => OkWithBase(await updateDetailService.ExecuteAsync(req));

    [HttpPost("BulkSyncDetails")]
    public async Task<IActionResult> BulkSyncDetails([FromBody] BulkSyncDetailsService.BulkSyncReq req)
        => OkWithBase(await bulkSyncDetailsService.ExecuteAsync(req));

    /// <summary>
    /// 公開データを一旦完全に削除し、秘密側の最新状態で作り直す（救済用）
    /// </summary>
    [HttpPost("RecreatePublicArchive")]
    public async Task<IActionResult> RecreatePublicArchive([FromBody] RecreatePublicArchiveService.RecreatePublicArchiveReq req)
        => OkWithBase(await recreatePublicArchiveService.ExecuteAsync(req));

}