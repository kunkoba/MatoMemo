using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>ログインユーザー自身の秘密側および公開側のアーカイブ一覧を取得するサービス</summary>
public class GetArchiveListService(
    UserContext userContext,
    ArchiveRepository archiveRepo,
    ArchivePubRepository archivePubRepo
) : _BaseService(userContext)
{
    public record GetArchiveListReq(
        [Required] Guid login_user_id
    ) : ILoginUserRequest;

    public record Response(IEnumerable<DtoArchive> archiveList);

    /// <summary>秘密側と公開側のデータを取得し、更新日順で結合</summary>
    public async Task<Response> ExecuteAsync()
    {
        await ValidateAsync();

        // 秘密側・公開側両方のデータを取得
        var archives = await archiveRepo.GetAllAsync();
        var archivesPub = await archivePubRepo.GetAllAsync();

        SetAppFlags(archives);
        SetAppFlags(archivesPub);

        // 秘密側リストの整形
        var list1 = archives.Select(x => new DtoArchive
        {
            archive_id = x.archive_id,
            user_id = x.user_id,
            title = x.title,
            memo = x.memo,
            link_url = x.link_url,
            currency_unit = x.currency_unit,
            closed_flg = x.closed_flg,
            del_flg = x.del_flg,
            create_tim = x.create_tim,
            update_tim = x.update_tim,
            is_public = false,
            is_owner = x.is_owner,
            detail_count = x.detail_count,
            has_public_status = string.Empty
        });

        // 公開側リストの整形
        var list2 = archivesPub.Select(x => new DtoArchive
        {
            archive_id = x.archive_id,
            user_id = x.user_id,
            title = x.title,
            memo = x.memo,
            link_url = x.link_url,
            currency_unit = x.currency_unit,
            closed_flg = x.closed_flg,
            del_flg = x.del_flg,
            create_tim = x.create_tim,
            update_tim = x.update_tim,
            limited_open_flg = x.limited_open_flg,
            is_public = true,
            is_owner = x.is_owner,
            detail_count = x.detail_count,
            has_public_status = string.Empty
        });

        return new Response(list1.Concat(list2).OrderByDescending(x => x.update_tim).ToList());
    }

    /// <summary>業務バリデーション</summary>
    private async Task ValidateAsync()
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        await Task.CompletedTask;
    }

}