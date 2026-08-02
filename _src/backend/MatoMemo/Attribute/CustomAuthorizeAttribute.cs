using LittleTripMemo.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

// CustomAuthorizeAttribute.cs（認可チェックのみにする）

public class CustomAuthorizeAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        // [AllowAnonymous] が付いているメソッドなら、チェックをスキップする
        if (context.ActionDescriptor.EndpointMetadata.Any(em => em is AllowAnonymousAttribute))
        {
            return;
        }

        var userContext = context.HttpContext.RequestServices.GetRequiredService<UserContext>();

        // Middlewareでセットされた UserId がなければ未認証とみなす
        if (userContext.login_user_id == Guid.Empty)
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Token is missing or invalid" });
        }
    }

}


