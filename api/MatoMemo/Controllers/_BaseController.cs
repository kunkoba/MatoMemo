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
    private readonly JwtService _jwtService = jwtService; // 追加
    protected readonly IWebHostEnvironment _env = env; // 追加
    public ITransactionProvider Provider { get; } = provider; // 追加

    protected OkObjectResult OkWithBase(object result)
    {
        // 更新用データがあればトークンを再生成して HttpOnlyクッキーに入れる
        if (_user.UpdatedUser != null)
        {
            var authUser = new MyAppUser { Id = _user.login_user_id };
            var newToken = _jwtService.CreateToken(authUser, _user.UpdatedUser);

            Response.Cookies.Append(
                AuthConstants.TokenCookieName,
                newToken,
                AuthConstants.DefaultCookieOptions(Request, _env.IsDevelopment())
            );
        }

        return Ok(new
        {
            is_logged_in = _user.login_user_id != Guid.Empty,
            login_user_id = _user.login_user_id,
            plan = _user.plan_type,
            // new_token は返さない。クッキーに入れたから
            data = result
        });
    }

    protected OkObjectResult OkWithBase2(object result)
    {
        string? newToken = null;
        // 更新用データがあればトークンを再生成
        if (_user.UpdatedUser != null)
        {
            var authUser = new MyAppUser { Id = _user.login_user_id }; // クレーム用
            newToken = _jwtService.CreateToken(authUser, _user.UpdatedUser);
        }

        return Ok(new
        {
            is_logged_in = _user.login_user_id != Guid.Empty,
            plan = _user.plan_type,
            new_token = newToken, // フロントエンドがこれを見て上書きする
            data = result
        });
    }

}
