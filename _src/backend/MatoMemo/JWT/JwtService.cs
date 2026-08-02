using LittleTripMemo.Common;
using LittleTripMemo.Configs;
using LittleTripMemo.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LittleTripMemo.JWT;

public class JwtService
{
    // appsettings.json から読み込む JWT 設定
    private readonly JwtSettings _settings;

    public JwtService(IOptions<JwtSettings> options)
    {
        _settings = options.Value;
    }

    /// <summary>
    /// ユーザ情報から JWTトークン を生成する
    /// </summary>
    public string CreateToken(MyAppUser auth_user, TAppUser app_user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, auth_user.Id.ToString()),
            new Claim(ClaimTypes.Email, auth_user.Email ?? ""),
            // 業務情報は TAppUser から取得
            new Claim("user_id", app_user.user_id.ToString()),
            new Claim("table_id", app_user.table_id.ToString()),
            new Claim("plan_type", app_user.plan_type)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(_settings.ExpireDays),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

}
