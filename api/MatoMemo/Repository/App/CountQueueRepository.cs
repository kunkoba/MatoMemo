using LittleTripMemo.Common;
using LittleTripMemo.Models;

namespace LittleTripMemo.Repository.App;

public class CountQueueRepository : _BaseRepository
{
    public CountQueueRepository(ITransactionProvider p, ILogger<CountQueueRepository> l, UserContext u) : base(p, l, u) { }

    /// <summary>
    /// クリック情報を一時テーブル（キュー）に保存
    /// </summary>
    public async Task InsertQueueAsync(TCountQueue entity)
    {
        const string sql = @"
            INSERT INTO tmp_count_queue (
                target_type, target_user_id, archive_id, seq, item_name, viewer_user_id, create_tim
            ) VALUES (
                @target_type, @target_user_id, @archive_id, @seq, @item_name, @viewer_user_id, CURRENT_TIMESTAMP
            )";

        // entityをそのまま渡すことで、プロパティ名とパラメータが自動で紐付きます
        await ExecuteAsync(sql, entity);
    }

}