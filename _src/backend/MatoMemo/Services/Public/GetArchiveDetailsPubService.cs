using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Public;

/// <summary>
/// 公開されているまとめの詳細情報を取得し、閲覧統計を記録するサービス
/// </summary>
public class GetArchiveDetailsPubService(
    UserContext userContext,
    ArchivePubRepository archivePubRepository,
    DetailPubRepository detailPubRepository,
    ReactionPubRepository reactionPubRepository,
    AppUserRepository appUserRepository,
    AddCountQueueService addCountQueueService 
) : _BaseService(userContext)
{
    public record GetArchiveDetailsPubReq(int archive_id);

    public record Response(
        TMemoArchivePub archive,
        IEnumerable<TMemoDetailPub> details,
        IEnumerable<TReactionPub> myReactions,
        DtoUserProfile userProfile
    );

    /// <summary>
    /// 公開詳細取得処理を実行し、他人のまとめであれば閲覧数をカウントアップする
    /// </summary>
    public async Task<Response> ExecuteAsync(GetArchiveDetailsPubReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. 公開アーカイブ（親）の取得
        var archivePub = await archivePubRepository.GetByKeyAsync(req.archive_id);
        BusinessException.ThrowIf(archivePub == null, "アーカイブが見つかりません");

        // 非公開（closed）かつ所有者ではない場合はエラー
        if (archivePub!.closed_flg && archivePub.user_id != _user.login_user_id)
        {
            throw new BusinessException("このアーカイブは現在非公開に設定されています。");
        }

        // 3. ★統計データの記録（閲覧数カウント）
        // 自分のまとめではない場合のみ、アーカイブとユーザーの「view」カウントをキューに入れる
        if (_user.login_user_id != archivePub.user_id)
        {
            // アーカイブの閲覧数を＋1（item_name = "view"）
            await addCountQueueService.ExecuteAsync(new AddCountQueueService.AddCountReq(
                _user.login_user_id,
                CountTargetType.Archive,
                archivePub.user_id,
                archivePub.archive_id,
                null,
                "view"
            ));
            // --- 追加：閲覧履歴の更新ロジック ---
            if (_user.login_user_id != Guid.Empty)
            {
                var loginUser = await appUserRepository.GetByUserIdAsync(_user.login_user_id);
                if (loginUser != null)
                {
                    loginUser.view_history.Remove(req.archive_id); // 重複除外
                    loginUser.view_history.Insert(0, req.archive_id); // 先頭挿入
                    var updatedHistory = loginUser.view_history.Take(20).ToList(); // 20件切り詰め
                    await appUserRepository.UpdateViewHistoryAsync(_user.login_user_id, updatedHistory);
                }
            }
        }

        // 4. 明細および関連情報の取得
        SetAppFlags(archivePub);
        var detailsPub = await detailPubRepository.GetByArchiveIdAsync(req.archive_id);
        SetAppFlags(detailsPub);

        var myReactions = _user.login_user_id != Guid.Empty
            ? await reactionPubRepository.GetMyReactionsByArchiveIdAsync(req.archive_id)
            : Enumerable.Empty<TReactionPub>();

        var ownerAppUser = await appUserRepository.GetByUserIdAsync(archivePub.user_id)
            ?? throw new BusinessException("ユーザーが存在しません");

        bool is_owner = (ownerAppUser.user_id == _user.login_user_id);
        bool hide = ownerAppUser.anonymous_flg && !is_owner;

        var userProfile = new DtoUserProfile(
                ownerAppUser.user_id,
                hide ? 0 : ownerAppUser.member_no,
                hide ? null : ownerAppUser.user_category,
                hide ? 0 : ownerAppUser.user_rank,
                hide ? "👤" : ownerAppUser.icon,
                hide ? "匿名" : ownerAppUser.nick_name,
                hide ? null : ownerAppUser.description,
                hide ? null : ownerAppUser.link_1,
                hide ? null : ownerAppUser.link_2,
                hide ? null : ownerAppUser.link_3,
                ownerAppUser.anonymous_flg,
                is_owner,
                ownerAppUser.ban_flg,
                hide ? new() : ownerAppUser.click_stats,
                hide ? new() : ownerAppUser.info_stats,
                hide ? new() : ownerAppUser.info_stats_pub,
                hide ? 0 : ownerAppUser.report_count,
                hide ? new() : ownerAppUser.view_history
            );

        return new Response(archivePub, detailsPub, myReactions, userProfile);
    }

    private async Task ValidateAsync(GetArchiveDetailsPubReq req)
    {
        BusinessException.ThrowIf(req.archive_id == 0, "アーカイブIDが無効です");
        await Task.CompletedTask;
    }

}