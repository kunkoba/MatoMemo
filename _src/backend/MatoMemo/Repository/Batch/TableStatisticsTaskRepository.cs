using LittleTripMemo.Common;

namespace LittleTripMemo.Repository.Batch;

/// <summary>
/// 定期バッチ専用：テーブル統計情報の更新処理を担当するリポジトリ
/// </summary>
public class TableStatisticsTaskRepository : _BaseRepository
{
    public TableStatisticsTaskRepository(
        ITransactionProvider provider,
        ILogger<TableStatisticsTaskRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// 指定されたテーブルIDの実数（レコード数・ユーザー数）を計測し、管理テーブルを更新する
    /// </summary>
    /// <param name="tableId">集計対象のテーブル番号</param>
    public async Task SyncStatisticsAsync(int tableId)
    {
        // 動的なテーブル名を含むSQL
        // 1. 各明細テーブルから有効なレコード数をカウント
        // 2. t_app_user からそのテーブルに割り当てられているユーザー数をカウント
        // 3. 結果を mgr_table_statistics に反映
        string sql = $@"
            UPDATE mgr_table_statistics 
            SET 
                record_count = (SELECT count(*) FROM t_memo_detail_{tableId} ),
                user_count   = (SELECT count(*) FROM t_app_user WHERE table_id = @tableId),
                last_count_tim = CURRENT_TIMESTAMP
            WHERE table_id = @tableId";

        await ExecuteAsync(sql, new { tableId });
    }

    /// <summary>
    /// 指定されたテーブルがデータベース内に物理的に存在するか確認する
    /// </summary>
    public async Task<bool> TableExistsAsync(int tableId)
    {
        string tableName = $"t_memo_detail_{tableId}";
        const string sql = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = @tableName)";
        return await ExecuteScalarAsync<bool>(sql, new { tableName });
    }

    /// <summary>
    /// 管理テーブルに存在しないテーブルIDがあれば初期レコードを挿入する（安全策）
    /// </summary>
    public async Task EnsureManagerRecordExistsAsync(int tableId)
    {
        const string sql = @"
            INSERT INTO mgr_table_statistics (table_id, table_name, last_count_tim)
            VALUES (@tableId, @tableName, CURRENT_TIMESTAMP)
            ON CONFLICT (table_id) DO NOTHING";

        await ExecuteAsync(sql, new
        {
            tableId,
            tableName = $"t_memo_detail_{tableId}"
        });
    }

    /// <summary>
    /// 論理削除から1ヶ月以上経過した明細を物理削除する
    /// </summary>
    public async Task DeleteOldGarbageDetailsAsync(int tableId)
    {
        // del_flgがtrue かつ update_tim（削除日時）から1ヶ月以上経過したものを削除
        string sql = $@"
            DELETE FROM t_memo_detail_{tableId}
            WHERE del_flg = true 
              AND archive_id = 0
              AND update_tim < CURRENT_TIMESTAMP - INTERVAL '1 month'";

        await ExecuteAsync(sql);
    }

    /// <summary>
    /// 公開側の論理削除データ（アーカイブ・明細・リアクション）を掃除する
    /// </summary>
    /// <returns></returns>
    public async Task DeleteOldGarbagePublicAsync()
    {
        // 1. 公開アーカイブの掃除
        const string sqlArchive = @"
            DELETE FROM t_memo_archive_pub 
            WHERE del_flg = true AND update_tim < CURRENT_TIMESTAMP - INTERVAL '1 month'";

        // 2. 公開明細の掃除
        const string sqlDetail = @"
            DELETE FROM t_memo_detail_pub 
            WHERE del_flg = true AND update_tim < CURRENT_TIMESTAMP - INTERVAL '1 month'";

        // 3. リアクションの掃除（★追加）
        const string sqlReaction = @"
            DELETE FROM t_reaction_pub 
            WHERE del_flg = true AND update_tim < CURRENT_TIMESTAMP - INTERVAL '1 month'";

        await ExecuteAsync(sqlArchive);
        await ExecuteAsync(sqlDetail);
        await ExecuteAsync(sqlReaction);
    }

    /// <summary>
    /// 指定されたテーブルIDに所属するユーザーの、秘密側の活動統計を更新する
    /// </summary>
    /// <param name="tableId">集計対象のテーブル番号</param>
    public async Task SyncUserPrivateStatsAsync(int tableId)
    {
        string sql = $"""            
            WITH UserAgg AS (
                SELECT 
                    u.user_id,
                    (SELECT count(*) FROM t_memo_archive a WHERE a.user_id = u.user_id AND a.del_flg = false) as a_cnt,
                    (SELECT count(*) FROM t_memo_detail_{tableId} d WHERE d.user_id = u.user_id AND d.archive_id > 0 AND d.del_flg = false) as d_cnt
                FROM t_app_user u
                WHERE u.table_id = @tableId
            )
            UPDATE t_app_user
            SET info_stats = jsonb_build_object(
                'archive_count', UserAgg.a_cnt,
                'detail_count', UserAgg.d_cnt
            )
            FROM UserAgg
            WHERE t_app_user.user_id = UserAgg.user_id
            """;

        await ExecuteAsync(sql, new { tableId });
    }

    /// <summary>
    /// 全ユーザーを対象に、公開側の活動統計（公開済みデータ）を更新する
    /// </summary>
    public async Task SyncUserPublicStatsAsync()
    {
        // 公開側はテーブルが分散されていないため、全ユーザーを一括で集計
        const string sql = """            
            WITH UserAggPub AS (
                SELECT 
                    u.user_id,
                    (SELECT count(*) FROM t_memo_archive_pub a WHERE a.user_id = u.user_id AND a.del_flg = false) as a_cnt,
                    (SELECT count(*) FROM t_memo_detail_pub d WHERE d.user_id = u.user_id AND d.del_flg = false) as d_cnt
                FROM t_app_user u
            )
            UPDATE t_app_user
            SET info_stats_pub = jsonb_build_object(
                'archive_count', UserAggPub.a_cnt,
                'detail_count', UserAggPub.d_cnt
            )
            FROM UserAggPub
            WHERE t_app_user.user_id = UserAggPub.user_id
            """;

        await ExecuteAsync(sql);
    }

    /// <summary>
    /// 全公開アーカイブを対象に、受け取った通報の累計件数を集計・更新する
    /// </summary>
    public async Task SyncArchiveReportStatsAsync()
    {
        // 1. t_sys_reports からアーカイブごとの通報数を集計
        // 2. その結果を用いて t_memo_archive_pub の report_count を一括更新
        // 3. 通報が1件もないアーカイブも考慮し、一旦0リセットしてから更新、もしくは集計結果を外部結合する
        const string sql = """
            WITH ReportAgg AS (
                SELECT 
                    archive_id, 
                    COUNT(*) AS cnt
                FROM t_sys_reports
                GROUP BY archive_id
            )
            UPDATE t_memo_archive_pub a
            SET 
                report_count = COALESCE(ra.cnt, 0),
                update_tim   = CURRENT_TIMESTAMP
            FROM (SELECT archive_id FROM t_memo_archive_pub) target
            LEFT JOIN ReportAgg ra ON target.archive_id = ra.archive_id
            WHERE a.archive_id = target.archive_id;
            """;

        await ExecuteAsync(sql);
    }

    /// <summary>
    /// 全ユーザーを対象に、自分が行った通報の累計送信件数を集計・更新する
    /// </summary>
    public async Task SyncUserReportStatsAsync()
    {
        // 1. t_sys_reports から通報者(reporter_user_id)ごとの送信数を集計
        // 2. その結果を用いて t_app_user の report_count を一括更新
        const string sql = """
            WITH UserReportAgg AS (
                SELECT 
                    reporter_user_id, 
                    COUNT(*) AS cnt
                FROM t_sys_reports
                GROUP BY reporter_user_id
            )
            UPDATE t_app_user u
            SET 
                report_count = COALESCE(ura.cnt, 0),
                update_tim   = CURRENT_TIMESTAMP
            FROM (SELECT user_id FROM t_app_user) target
            LEFT JOIN UserReportAgg ura ON target.user_id = ura.reporter_user_id
            WHERE u.user_id = target.user_id;
            """;

        await ExecuteAsync(sql);
    }

    /// <summary>
    /// データベースの物理メンテナンス（不要領域の整理と索引の再構築）を実行する
    /// </summary>
    public async Task ExecuteDbMaintenanceAsync()
    {
        // PostgreSQLのVACUUM/REINDEXは長時間かかる可能性があるため、タイムアウトを無効(0)に設定
        // 内部で _transaction が null であることを前提に実行（VACUUMはトランザクション内不可のため）
        await ExecuteAsync("VACUUM ANALYZE");
        await ExecuteAsync("REINDEX DATABASE db_little_trip_memo");
    }

}