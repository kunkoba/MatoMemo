using LittleTripMemo.Common;
using LittleTripMemo.Models;
using System.Collections.Generic;

namespace LittleTripMemo.Repository.Sys;

public class SysNotificationRepository : _BaseRepository
{
    public SysNotificationRepository(
        ITransactionProvider provider,
        ILogger<SysNotificationRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// 現在の表示期間内にある有効なお知らせを全件取得
    /// </summary>
    public async Task<IEnumerable<TSysNotification>> GetActiveNotificationsAsync()
    {
        const string sql = @"
            SELECT * FROM t_sys_notifications 
            WHERE disp_from <= @now 
              AND disp_to   >= @now 
            ORDER BY update_tim DESC
            LIMIT 100";

        return await QueryAsync<TSysNotification>(sql, new { now = DateTime.Now });
    }

    /// <summary>
    /// お知らせの登録または更新 (Upsert)
    /// seq が 0 の場合は新規登録、0以外の場合は更新を行う
    /// </summary>
    public async Task<int> UpsertAsync(TSysNotification notification)
    {
        const string sql = @"
            INSERT INTO t_sys_notifications (
                seq, 
                title, 
                body, 
                link_url,
                kind, 
                disp_from, 
                disp_to, 
                update_tim
            ) VALUES (
                CASE WHEN @seq = 0 THEN nextval('t_sys_notifications_seq_seq') ELSE @seq END, 
                @title, 
                @body, 
                @link_url,
                @kind, 
                @disp_from, 
                @disp_to, 
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (seq) DO UPDATE SET
                title = EXCLUDED.title,
                body = EXCLUDED.body,
                link_url = EXCLUDED.link_url,
                kind = EXCLUDED.kind,
                disp_from = EXCLUDED.disp_from,
                disp_to = EXCLUDED.disp_to,
                update_tim = CURRENT_TIMESTAMP";

        return await ExecuteAsync(sql, notification);
    }

    /// <summary>
    /// 全ての通知を取得（管理者用：期間外や非公開も含む）
    /// </summary>
    public async Task<IEnumerable<TSysNotification>> GetAllNotificationsAsync(int limit = 100)
    {
        const string sql = @"
            SELECT * FROM t_sys_notifications 
            ORDER BY update_tim DESC
            LIMIT @limit";

        return await QueryAsync<TSysNotification>(sql, new { limit });
    }

}