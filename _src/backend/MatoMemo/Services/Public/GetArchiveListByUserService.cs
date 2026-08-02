using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;

namespace LittleTripMemo.Services.Public;

/// <summary>
/// 指定されたユーザーが公開している「まとめ」の一覧を取得するサービス
/// </summary>
public class GetArchiveListByUserService(
    UserContext userContext,
    ArchivePubRepository archivePubRepo
) : _BaseService(userContext)
{
    public record GetArchiveListByUserReq(Guid target_user_id);
    public record Response(IEnumerable<DtoArchive> archives);

    public async Task<Response> ExecuteAsync(GetArchiveListByUserReq req)
    {
        // 1. バリデーション
        BusinessException.ThrowIf(req.target_user_id == Guid.Empty, "ユーザーIDが不正です");

        // 2. 実行（完全公開のみ取得）
        var list = await archivePubRepo.GetPublicListByUserIdAsync(req.target_user_id);

        // 3. マッピング
        var result = list.Select(x => new DtoArchive
        {
            archive_id = x.archive_id,
            user_id = x.user_id,
            title = x.title,
            memo = x.memo,
            link_url = x.link_url,
            currency_unit = x.currency_unit,
            detail_count = x.detail_count,
            update_tim = x.update_tim,
            is_public = true,
            is_owner = (x.user_id == _user.login_user_id),
            has_public_status = PublicStatus.Open.ToString()
        });

        return new Response(result);
    }
}