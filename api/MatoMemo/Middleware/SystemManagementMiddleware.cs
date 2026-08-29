using LittleTripMemo.Common;
using System.Net;
using System.Text.Json;

namespace LittleTripMemo.Middleware;

/// <summary>
/// アプリケーションのバージョンチェックおよびメンテナンスモードの判定を行うミドルウェア
/// </summary>
public class SystemManagementMiddleware(
    RequestDelegate next,
    SystemStatus systemStatus
)
{
    public async Task InvokeAsync(HttpContext context, UserContext userContext)
    {
        // 1. バージョンチェック (カスタムヘッダー "X-App-Version" を検証)
        var appVersion = context.Request.Headers["X-App-Version"].ToString();
        if (!string.IsNullOrEmpty(systemStatus.MinAppVersion) && !string.IsNullOrEmpty(appVersion))
        {
            if (IsVersionOlder(appVersion, systemStatus.MinAppVersion))
            {
                await ReturnErrorResponse(context, HttpStatusCode.UpgradeRequired, "新しいバージョンのアプリが利用可能です。更新してください。", "VERSION_UP_REQUIRED");
                return;
            }
        }

        // 2. メンテナンスチェック
        if (systemStatus.IsMaintenanceMode)
        {
            // 管理者権限（Admin）を持つユーザー以外はアクセス遮断
            if (userContext.plan_type != PlanType.Admin.ToString())
            {
                await ReturnErrorResponse(context, HttpStatusCode.ServiceUnavailable, systemStatus.MaintenanceMessage, "MAINTENANCE_MODE");
                return;
            }
        }

        await next(context);
    }

    private static async Task ReturnErrorResponse(HttpContext context, HttpStatusCode statusCode, string message, string errorCode)
    {
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        var responseBody = new { message, errorCode };
        await context.Response.WriteAsync(JsonSerializer.Serialize(responseBody));
    }

    private static bool IsVersionOlder(string currentVersion, string minRequiredVersion)
    {
        if (Version.TryParse(currentVersion, out var current) && Version.TryParse(minRequiredVersion, out var required))
        {
            return current < required;
        }
        return false;
    }

}