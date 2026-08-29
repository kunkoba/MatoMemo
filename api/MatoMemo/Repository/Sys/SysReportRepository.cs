using LittleTripMemo.Common;
using LittleTripMemo.Models;
using System.Collections.Generic;

namespace LittleTripMemo.Repository.Sys;

public class SysReportRepository : _BaseRepository
{
    public SysReportRepository(
        ITransactionProvider provider,
        ILogger<SysReportRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// 通報内容の登録・更新 (Upsert)
    /// </summary>
    public async Task<int> UpsertAsync(TSysReport report)
    {
        // ログイン中のユーザーを通報者としてセット
        report.reporter_user_id = _user.login_user_id;

        const string sql = @"
        INSERT INTO t_sys_reports (
            reporter_user_id, 
            target_user_id, 
            archive_id, 
            body, 
            create_tim, 
            update_tim
        ) VALUES (
            @reporter_user_id, 
            @target_user_id, 
            @archive_id, 
            @body, 
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (reporter_user_id, target_user_id, archive_id) 
        DO UPDATE SET
            body       = EXCLUDED.body,
            update_tim = CURRENT_TIMESTAMP";

        return await ExecuteAsync(sql, report);
    }

    /// <summary>
    /// 通報件数が多い順にアーカイブを集計して取得
    /// </summary>
    /// <param name="minCount">抽出対象とする最小通報件数</param>
    public async Task<IEnumerable<DtoReportSummary>> GetReportSummaryAsync()
    {
        const string sql = """
            SELECT 
                r.target_user_id, 
                r.archive_id, 
                a.title AS archive_title, 
                COUNT(1) AS report_count,
                a.limited_open_flg AS is_limited,
                u.icon AS target_icon,
                u.nick_name AS target_nick_name,
                a.closed_flg AS is_closed,
                a.del_flg AS is_deleted
            FROM t_sys_reports r
            INNER JOIN t_memo_archive_pub a 
                ON r.archive_id = a.archive_id
            INNER JOIN t_app_user u
                ON r.target_user_id = u.user_id
            GROUP BY 
                r.target_user_id, 
                r.archive_id, 
                a.title,
                a.limited_open_flg,
                u.icon,
                u.nick_name,
                a.closed_flg,
                a.del_flg
            ORDER BY report_count DESC
            LIMIT 200
            """;

        return await QueryAsync<DtoReportSummary>(sql);
    }

    /// <summary>
    /// 通報されたユーザーIDとアーカイブIDを指定して、通報内容のリストを取得
    /// </summary>
    /// <param name="targetUserId"></param>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<DtoReportDetail>> GetReportsByTargetAsync(Guid targetUserId, long archiveId)
    {
        const string sql = @"
            SELECT 
                r.*,
                u.icon,
                u.nick_name
            FROM t_sys_reports r
            LEFT JOIN t_app_user u ON r.reporter_user_id = u.user_id 
            WHERE r.target_user_id = @target_user_id 
              AND r.archive_id     = @archive_id 
            ORDER BY r.update_tim DESC";

        return await QueryAsync<DtoReportDetail>(sql, new
        {
            target_user_id = targetUserId,
            archive_id = archiveId
        });
    }

    /// <summary>
    /// ログインユーザーが通報した内容をアーカイブIDで絞り込んで取得
    /// </summary>
    public async Task<TSysReport?> GetMyReportByArchiveIdAsync(long archiveId)
    {
        const string sql = @"
            SELECT * FROM t_sys_reports 
            WHERE reporter_user_id = @user_id 
              AND archive_id = @archive_id";

        return await QuerySingleOrDefaultAsync<TSysReport>(sql, new { user_id = _user.login_user_id, archive_id = archiveId });
    }

    /// <summary>
    /// 自分が特定のアーカイブに対して行った通報を物理削除
    /// </summary>
    public async Task<int> DeletePhysicalAsync(long archiveId)
    {
        const string sql = @"
            DELETE FROM t_sys_reports 
            WHERE reporter_user_id = @user_id 
              AND archive_id        = @archive_id";

        return await ExecuteAsync(sql, new { user_id = _user.login_user_id, archive_id = archiveId });
    }

    /// <summary>
    /// アーカイブIDに紐づく通報データをすべて物理削除
    /// </summary>
    public async Task<int> DeletePhysicalByArchiveIdAsync(long archiveId)
    {
        const string sql = "DELETE FROM t_sys_reports WHERE archive_id = @archive_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId });
    }

    /// <summary>
    /// ユーザの通報情報
    /// </summary>
    /// <returns></returns>
    public async Task<IEnumerable<DtoMyReportDetail>> GetMyReportsWithDetailsAsync()
    {
        const string sql = @"
            SELECT 
                r.target_user_id,
                r.archive_id,
                r.body,
                r.create_tim,
                u.nick_name AS target_nick_name,
                u.icon AS target_icon,
                a.title AS archive_title,
                a.closed_flg AS is_closed,
                a.del_flg AS is_deleted
            FROM t_sys_reports r
            LEFT JOIN t_app_user u ON r.target_user_id = u.user_id 
            LEFT JOIN t_memo_archive_pub a ON r.archive_id = a.archive_id
            WHERE r.reporter_user_id = @user_id
            ORDER BY r.update_tim DESC 
            LIMIT 100";

        return await QueryAsync<DtoMyReportDetail>(sql, new { user_id = _user.login_user_id });
    }

}