using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Repository.Sys;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>特定のアーカイブ（まとめ）の詳細情報と、紐づく明細一覧を取得するサービス</summary>
public class GetArchiveDetailsService(
    UserContext userContext,
    ArchiveRepository archiveRepository,
    DetailRepository detailRepository,
    ArchivePubRepository archivePubRepository,
    AppUserRepository appUserRepository
) : _BaseService(userContext)
{
    public record GetArchiveDetailsReq(
        [Required(ErrorMessage = "アーカイブIDは必須です")] int archive_id
    );

    public record Response(
        TMemoArchive archive,
        IEnumerable<TMemoDetail> details,
        DtoUserProfile userProfile
    );

    /// <summary>アーカイブ詳細取得と公開ステータスの判定</summary>
    public async Task<Response> ExecuteAsync(GetArchiveDetailsReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. 存在チェック
        var archive = await archiveRepository.GetByKeyAsync(req.archive_id);
        BusinessException.ThrowIf(archive == null, $"指定されたまとめが見つかりません。(id: {req.archive_id})");

        // 3. 明細の取得
        var details = await detailRepository.GetByArchiveIdAsync(req.archive_id);
        BusinessException.ThrowIf(details == null, $"まとめの中に明細が見つかりません。(id: {req.archive_id})");

        // 4. 所有者情報の取得
        var ownerUser = await appUserRepository.GetByUserIdAsync(archive!.user_id);
        BusinessException.ThrowIf(ownerUser == null, $"まとめの所有者情報が見つかりません。(id: {req.archive_id})");

        // 公開側（Pub）の状態を取得して DTO に反映
        var pub = await archivePubRepository.GetStatsByKeyAsync(req.archive_id);
        string status = PublicStatus.Nothing.ToString();
        if (pub != null)
        {
            status = (pub.del_flg ? PublicStatus.Delete : (pub.closed_flg ? PublicStatus.Close : PublicStatus.Open)).ToString();
            archive.has_public_status = status;
        }

        // 5. フラグセット
        SetAppFlags(archive);
        SetAppFlags(details);

        var userProfile = new DtoUserProfile(
            ownerUser!.user_id, ownerUser.member_no, ownerUser.user_category, ownerUser.user_rank,
            ownerUser.icon, ownerUser.nick_name, ownerUser.description,
            ownerUser.link_1, ownerUser.link_2, ownerUser.link_3,
            ownerUser.anonymous_flg,
            is_owner: (ownerUser.user_id == _user.login_user_id),
            is_ban: ownerUser.ban_flg,
            ownerUser.click_stats, ownerUser.info_stats, ownerUser.info_stats_pub,
            ownerUser.report_count, ownerUser.view_history
        );

        return new Response(archive, details, userProfile);
    }

    /// <summary>業務バリデーション</summary>
    private async Task ValidateAsync(GetArchiveDetailsReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id <= 0, "アーカイブIDが不正です");

        await Task.CompletedTask;
    }

}