using LittleTripMemo.Common;
using LittleTripMemo.Models;

namespace LittleTripMemo.Repository.Sys;

public class AppInfoRepository(ITransactionProvider p, ILogger<AppInfoRepository> l, UserContext u)
    : _BaseRepository(p, l, u)
{
    /// <summary>
    /// 取得するアプリ情報は1件のみ。id=1のレコードを返す。
    /// </summary>
    /// <returns></returns>
    public async Task<TAppInfo?> GetAsync()
    {
        const string sql = "SELECT * FROM mgr_app_info WHERE id = 1";
        return await QuerySingleOrDefaultAsync<TAppInfo>(sql);
    }

    /// <summary>
    /// アプリの統計情報を集計し、mgr_app_info に反映する
    /// </summary>
    /// <returns></returns>
    public async Task SyncAppInfoAsync()
    {
        const string sql = """
            UPDATE mgr_app_info
            SET 
                avg_score               = (SELECT COALESCE(AVG(score), 0) FROM t_sys_feedbacks),
                total_feedback_count    = (SELECT COUNT(*) FROM t_sys_feedbacks),
                total_user_count        = (SELECT COUNT(*) FROM t_app_user WHERE del_flg = false),
                total_archive_pub_count = (SELECT COUNT(*) FROM t_memo_archive_pub WHERE del_flg = false),
                total_detail_pub_count  = (SELECT COUNT(*) FROM t_memo_detail_pub WHERE del_flg = false),
                last_aggregate_tim      = CURRENT_TIMESTAMP
            WHERE id = 1;
            """;
        await ExecuteAsync(sql);
    }

}