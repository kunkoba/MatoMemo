using LittleTripMemo.Common;
using LittleTripMemo.JWT;
using LittleTripMemo.Repository;
using LittleTripMemo.Services.Account;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LittleTripMemo.Controllers.Debug;

/// <summary>
/// 開発環境専用：Firebase認証をバイパスしてログイン・ユーザー作成を行う
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class DebugController(
    IWebHostEnvironment env,
    UserContext userContext,
    JwtService jwtService,
    ITransactionProvider provider,
    RegistrationUserService registrationUserService
) : _BaseController(userContext, jwtService, provider)
{
    // DebugController.cs

    [HttpPost("DebugLogin")]
#if !DEBUG
    [ApiExplorerSettings(IgnoreApi = true)] // Swaggerからも隠す
#endif
    public async Task<IActionResult> DebugLogin([FromBody] RegistrationUserService.FirebaseLoginRequest req)
    {
#if !DEBUG
        return NotFound();  // DEBUGコンパイル時以外は無条件で404
#endif

        // 開発環境チェックも二重で行う
        if (!env.IsDevelopment()) return NotFound();

        var result = await registrationUserService.ExecuteAsync(req);
        if (!result.is_success) return BadRequest(new { result.message });

        // ログイン直後のため、共通レスポンス構造にトークンを直載せして返す
        return Ok(new
        {
            is_logged_in = true,
            plan = result.plan,
            token = result.token, // OkWithBaseを使わず、LoginFirebaseと同様の構造で返す
            data = new { is_success = true }
        });
    }

}