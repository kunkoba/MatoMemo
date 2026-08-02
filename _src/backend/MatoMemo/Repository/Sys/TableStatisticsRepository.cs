using LittleTripMemo.Common;

namespace LittleTripMemo.Repository.Sys;

public class TableStatisticsRepository : _BaseRepository
{
    public TableStatisticsRepository(
        ITransactionProvider p, ILogger<TableStatisticsRepository> l, UserContext u) : base(p, l, u) { }

    /// <summary>
    /// 全テーブルの統計情報を取得する
    /// </summary>
    public async Task<IEnumerable<dynamic>> GetAllStatsAsync()
    {
        const string sql = "SELECT table_id, record_count FROM mgr_table_statistics ORDER BY table_id ASC";
        return await QueryAsync<dynamic>(sql);
    }

}