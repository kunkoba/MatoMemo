using LittleTripMemo.Common;
using LittleTripMemo.JWT;
using LittleTripMemo.Repository;
using LittleTripMemo.Services.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LittleTripMemo.Controllers;

/// <summary>
/// アプリケーションの基盤設定（メンテナンスモードやバージョン等）を管理するコントローラー
/// </summary>
[ApiController]
[Route("api/[controller]")]
[CustomAuthorize] // 認証必須
public class CoreController(
    UserContext userContext,
    JwtService jwtService,
    ITransactionProvider provider, // 追加
    GetCoreConfigService getCoreConfigService,
    UpdateCoreConfigService updateCoreConfigService,
    GetLegalConfigsService getLegalConfigsService,
    UpdateLegalConfigService updateLegalConfigService
) : _BaseController(userContext, jwtService, provider)
{
    /// <summary>
    /// 現在のシステム設定一覧を取得（管理者のみ）
    /// </summary>
    [HttpPost("GetCoreConfig")]
    public async Task<IActionResult> GetCoreConfig()
        => OkWithBase(await getCoreConfigService.ExecuteAsync());

    /// <summary>
    /// システム設定を更新（管理者のみ）
    /// </summary>
    [HttpPost("UpdateCoreConfig")]
    public async Task<IActionResult> UpdateCoreConfig([FromBody] UpdateCoreConfigService.UpdateCoreConfigReq req)
        => OkWithBase(await updateCoreConfigService.ExecuteAsync(req));

    /// <summary>
    /// 法的文書（規約・ポリシー等）を差分取得する（未ログイン可）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpPost("GetLegalConfigs")]
    public async Task<IActionResult> GetLegalConfigs([FromBody] GetLegalConfigsService.GetLegalConfigsReq req)
        => OkWithBase(await getLegalConfigsService.ExecuteAsync(req));

    /// <summary>
    /// 法的文書（規約・ポリシー等）を個別に更新する（管理者のみ）
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("UpdateLegalConfig")]
    public async Task<IActionResult> UpdateLegalConfig([FromBody] UpdateLegalConfigService.UpdateLegalConfigReq req)
        => OkWithBase(await updateLegalConfigService.ExecuteAsync(req));

}