using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using LittleTripMemo.Common;

namespace LittleTripMemo.JWT;

public class JwtMiddleware(RequestDelegate next, IConfiguration configuration)
{
    public async Task Invoke(HttpContext context)
    {
        if (context.Request.Method == "OPTIONS")
        {
            await next(context);
            return;
        }

        // 1. ヘッダ優先、なければクッキー
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        var token = authHeader?.Split(" ").Last();

        if (string.IsNullOrEmpty(token))
        {
            context.Request.Cookies.TryGetValue(AuthConstants.TokenCookieName, out token);
        }

        //Console.WriteLine($"[JWT_MW] Path={context.Request.Path} HasToken={!string.IsNullOrEmpty(token)} CookieHeader={context.Request.Headers.Cookie}");

        if (!string.IsNullOrEmpty(token))
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var secretKey = Encoding.UTF8.GetBytes(configuration["JwtSettings:SecretKey"]!);

                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(secretKey),
                    ValidateIssuer = true,
                    ValidIssuer = configuration["JwtSettings:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = configuration["JwtSettings:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1)
                }, out _);

                var userContext = context.RequestServices.GetRequiredService<UserContext>();
                var idStr = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(idStr, out var guid))
                {
                    userContext.login_user_id = guid;
                }
                var tableIdStr = principal.FindFirst("table_id")?.Value;
                if (int.TryParse(tableIdStr, out var tid)) userContext.table_id = tid;
                userContext.plan_type = principal.FindFirst("plan_type")?.Value ?? "Free";

                context.User = principal;
                Console.WriteLine($"[JWT_MW] SUCCESS user={userContext.login_user_id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JWT_MW] FAILED {ex.Message}");
            }
        }
        await next(context);
    }
}