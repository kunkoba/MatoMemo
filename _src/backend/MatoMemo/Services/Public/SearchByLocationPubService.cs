using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;

namespace LittleTripMemo.Services.Public;

/// <summary>位置情報に基づく公開明細の検索サービス</summary>
public class SearchByLocationPubService(UserContext userContext, DetailPubRepository detailPubRepo) : _BaseService(userContext)
{
    public record SearchByLocationPubReq(
        decimal lat_min, decimal lat_max, decimal lng_min, decimal lng_max,
        int sortField, int? reactionType, string? keyword, int? feelType, int limit = 20
    );
    public record Response(IEnumerable<TMemoDetailPub> details);

    public async Task<Response> ExecuteAsync(SearchByLocationPubReq req)
    {
        await ValidateAsync(req);
        var result = await detailPubRepo.SearchByLocationAsync(
            req.lat_min, req.lat_max, req.lng_min, req.lng_max,
            req.keyword, req.sortField, req.reactionType, _user.login_user_id, req.feelType, req.limit
        );
        SetAppFlags(result);
        return new Response(result);
    }

    private async Task ValidateAsync(SearchByLocationPubReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        await Task.CompletedTask;
    }

}
