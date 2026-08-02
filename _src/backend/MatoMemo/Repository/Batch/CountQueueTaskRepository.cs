using LittleTripMemo.Common;
using System.Text.Json;

namespace LittleTripMemo.Repository.Batch;

public class CountQueueTaskRepository : _BaseRepository
{
    public CountQueueTaskRepository(ITransactionProvider p, ILogger<CountQueueTaskRepository> l, UserContext u) : base(p, l, u) { }

    /// <summary>
    /// キューから未処理のデータを全件取得する
    /// </summary>
    public async Task<IEnumerable<dynamic>> GetQueueAllAsync()
    {
        const string sql = "SELECT * FROM tmp_count_queue ORDER BY create_tim ASC";
        return await QueryAsync<dynamic>(sql);
    }

    /// <summary>
    /// 各テーブルの現在の click_stats (JSONB) を取得する
    /// </summary>
    public async Task<string?> GetCurrentStatsJsonAsync(int targetType, Guid? userId, int? archiveId, long? seq)
    {
        string sql = targetType switch
        {
            1 => "SELECT click_stats FROM t_app_user         WHERE user_id = @userId",
            2 => "SELECT click_stats FROM t_memo_archive_pub WHERE archive_id = @archiveId",
            3 => "SELECT click_stats FROM t_memo_detail_pub  WHERE archive_id = @archiveId AND seq = @seq",
            _ => throw new ArgumentException("Invalid targetType")
        };
        return await ExecuteScalarAsync<string>(sql, new { userId, archiveId, seq });
    }

    /// <summary>
    /// 計算後の統計 JSON を各テーブルに反映する
    /// </summary>
    public async Task UpdateStatsJsonAsync(int targetType, Guid? userId, int? archiveId, long? seq, string json)
    {
        //var jsonb = JsonDocument.Parse(json).RootElement; // 確実にJSONとして渡す
        string sql = targetType switch
        {
            1 => "UPDATE t_app_user         SET click_stats = @json::jsonb WHERE user_id = @userId",
            2 => "UPDATE t_memo_archive_pub SET click_stats = @json::jsonb WHERE archive_id = @archiveId",
            3 => "UPDATE t_memo_detail_pub  SET click_stats = @json::jsonb WHERE archive_id = @archiveId AND seq = @seq",
            _ => throw new ArgumentException("Invalid targetType")
        };
        await ExecuteAsync(sql, new { userId, archiveId, seq, json });
    }

    /// <summary>
    /// 指定時刻以前のキューを物理削除する
    /// </summary>
    public async Task DeleteProcessedQueueAsync(DateTime upTo)
    {
        const string sql = "DELETE FROM tmp_count_queue WHERE create_tim <= @upTo";
        await ExecuteAsync(sql, new { upTo });
    }

}