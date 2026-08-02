using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;

namespace LittleTripMemo.Services.Private;

/// <summary>
/// 未まとめ明細（archive_id = 0）の一覧を取得するサービス
/// </summary>
public class GetUnMergeDetailsService(
    UserContext userContext,
    DetailRepository detailRepo
) : _BaseService(userContext)
{
    public class GetUnMergeDetailsReq { }

    public record Response(IEnumerable<TMemoDetail> details);

    /// <summary>
    /// 未まとめ明細を最大100件取得する
    /// </summary>
    public async Task<Response> ExecuteAsync(GetUnMergeDetailsReq req)
    {
        // 1. 検証
        await ValidateAsync();

        // 2. 実行
        var details = await detailRepo.GetUnMergedAsync();

        // 所有者フラグのセット
        SetAppFlags(details);

        return new Response(details);
    }

    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");

        await Task.CompletedTask;
    }
}