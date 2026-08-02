using LittleTripMemo.Common;
using Serilog.Context;

namespace LittleTripMemo.Exceptions;

/// <summary>
/// アプリケーション全体の例外を統合的にキャッチし、ログ記録とレスポンス整形を行うミドルウェア
/// </summary>
public class ExceptionHandling(
    RequestDelegate next,
    ILogger<ExceptionHandling> logger
)
{
    /// <summary>
    /// リクエスト処理を実行し、発生した例外を捕捉する
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        // リクエストごとに一意なID（TraceIdentifier）をログプロパティに付与
        using (LogContext.PushProperty("CorrelationId", context.TraceIdentifier))
        {
            try
            {
                await next(context);
            }
            catch (Exception exception)
            {
                await HandleExceptionAsync(context, exception);
            }
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        var errorResponse = new ErrorResponse();

        if (exception is BusinessException businessException)
        {
            context.Response.StatusCode = (businessException.ErrorCode == "AUTH_REQUIRED")
                ? StatusCodes.Status401Unauthorized
                : StatusCodes.Status400BadRequest;

            errorResponse = new ErrorResponse
            {
                Message = businessException.Message,
                ErrorCode = businessException.ErrorCode
            };
        }
        else if (exception is Npgsql.PostgresException postgresException)
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            errorResponse = new ErrorResponse
            {
                Message = "データの処理中にエラーが発生しました。時間をおいて再度お試しください。",
                ErrorCode = postgresException.SqlState == "23505" ? ErrorCodes.DB_CONFLICT_ERROR : ErrorCodes.DB_QUERY_ERROR
            };
            logger.LogError("【DBシステムエラー】{Type}: {Message}", postgresException.GetType().Name, postgresException.MessageText);
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            errorResponse = new ErrorResponse
            {
                Message = "予期せぬエラーが発生しました。",
                ErrorCode = ErrorCodes.SYSTEM_ERROR
            };
            logger.LogError("【予期せぬエラー】{Type}: {Message}", exception.GetType().Name, exception.Message);
        }

        await context.Response.WriteAsJsonAsync(errorResponse);
    }

}