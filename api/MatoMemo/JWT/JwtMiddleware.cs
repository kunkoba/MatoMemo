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

        // JWT直接方式: Authorizationヘッダーのみを参照
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        var token = authHeader?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true
           ? authHeader.Substring("Bearer ".Length).Trim()
            : null;

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
                    userContext.login_user_id = guid;

                var tableIdStr = principal.FindFirst("table_id")?.Value;
                if (int.TryParse(tableIdStr, out var tid)) userContext.table_id = tid;
                userContext.plan_type = principal.FindFirst("plan_type")?.Value ?? PlanType.Free.ToString();

                context.User = principal;
            }
            catch { /* 無効なトークンは無視して未認証として続行 */ }
        }
        await next(context);
    }
}