using LittleTripMemo.Common;
using LittleTripMemo.JWT;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace LittleTripMemo.Controllers;

[ApiController]
public abstract class _BaseController(
    UserContext userContext,
    JwtService jwtService,
    ITransactionProvider provider,
    IWebHostEnvironment env
    ) : ControllerBase
{
    protected readonly UserContext _user = userContext;
    private readonly JwtService _jwtService = jwtService;
    protected readonly IWebHostEnvironment _env = env;
    public ITransactionProvider Provider { get; } = provider;

    // 本当の核。共通レスポンス形状をここ1箇所で定義
    protected OkObjectResult OkWithBase(object result, string? newToken)
    {
        return Ok(new
        {
            is_logged_in = _user.login_user_id != Guid.Empty,
            login_user_id = _user.login_user_id,
            plan = _user.plan_type,
            new_token = newToken,
            data = result
        });
    }

    // 通常系: 更新があれば再発行して OkWithBase に流す
    protected OkObjectResult OkWithNewToken(object result)
    {
        string? newToken = null;
        if (_user.UpdatedUser != null)
        {
            var authUser = new MyAppUser { Id = _user.login_user_id };
            newToken = _jwtService.CreateToken(authUser, _user.UpdatedUser);
        }
        return OkWithBase(result, newToken);
    }

}