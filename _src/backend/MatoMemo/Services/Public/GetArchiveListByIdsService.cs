using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Services;

public class GetArchiveListByIdsService(UserContext u, ArchivePubRepository repo) : _BaseService(u)
{
    public record GetArchiveListByIdsReq(IEnumerable<int> archive_ids);
    public record Response(IEnumerable<DtoArchive> archives);

    public async Task<Response> ExecuteAsync(GetArchiveListByIdsReq req)
    {
        await ValidateAsync(req);

        // 1. 引数のIDリストで一括取得（SELECT文の発行は1回のみ）
        var dbItems = await repo.GetAllByIdsAsync(req.archive_ids);

        // 2. IDをキーにしたDictionaryを作成し、突合を高速化
        var dbDict = dbItems.ToDictionary(x => x.archive_id);

        // 3. リクエストされたIDリストをベースに、Dictionaryからデータを引き当てる
        var result = req.archive_ids.Select(id =>
        {
            // Dictionaryに存在すれば、そのデータからステータス判定
            if (dbDict.TryGetValue(id, out var x))
            {
                return new DtoArchive
                {
                    archive_id = x.archive_id,
                    title = x.title,
                    is_public = true,
                    has_public_status = (x.del_flg
                        ? PublicStatus.Delete
                        : (x.closed_flg ? PublicStatus.Close : PublicStatus.Open)
                    ).ToString(),
                    detail_count =x.detail_count,
                    update_tim = x.update_tim
                };
            }

            // Dictionaryに存在しない ＝ 公開テーブルにレコードがない場合は Nothing
            return new DtoArchive
            {
                archive_id = id,
                title = "未公開のまとめ",
                is_public = true,
                has_public_status = PublicStatus.Nothing.ToString()
            };
        }).ToList();

        return new Response(result);
    }

    private async Task ValidateAsync(GetArchiveListByIdsReq req)
    {
        BusinessException.ThrowIf(req.archive_ids == null || !req.archive_ids.Any(), "対象IDが指定されていません");
        await Task.CompletedTask;
    }

}