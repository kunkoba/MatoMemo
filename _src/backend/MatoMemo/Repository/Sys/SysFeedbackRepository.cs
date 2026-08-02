using LittleTripMemo.Models;
using LittleTripMemo.Common;

namespace LittleTripMemo.Repository.Sys;

public class SysFeedbackRepository : _BaseRepository
{
    public SysFeedbackRepository(
        ITransactionProvider provider,
        ILogger<SysFeedbackRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// フィードバックの登録または更新 (Upsert)
    /// </summary>
    public async Task<int> UpsertAsync(TSysFeedback feedback)
    {
        feedback.user_id = _user.login_user_id;

        const string sql = @"
            INSERT INTO t_sys_feedbacks (
                user_id, 
                body, 
                score, 
                create_tim,
                update_tim
            ) VALUES (
                @user_id, 
                @body, 
                @score, 
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id) DO UPDATE SET
                body = EXCLUDED.body,
                score = EXCLUDED.score,
                update_tim = clock_timestamp()";

        return await ExecuteAsync(sql, feedback);
    }

    /// <summary>
    /// 自分のフィードバックをリスト形式で取得
    /// </summary>
    public async Task<TSysFeedback?> GetMyFeedbacksAsync()
    {
        const string sql = @"
            SELECT * FROM t_sys_feedbacks 
            WHERE user_id = @user_id";

        return await QuerySingleOrDefaultAsync<TSysFeedback>(sql, new { user_id = _user.login_user_id });
    }

    /// <summary>
    /// 全体平均スコアを取得
    /// </summary>
    public async Task<double> GetAverageScoreAsync()
    {
        const string sql = "SELECT COALESCE(AVG(score), 0) FROM t_sys_feedbacks";

        return await ExecuteScalarAsync<double>(sql);
    }

    /// <summary>
    /// フィードバックを条件指定で取得（ユーザー情報結合、スコア検索、最新100件固定）
    /// </summary>
    public async Task<IEnumerable<DtoFeedbackDetail>> GetAllFeedbacksAsync(int score)
    {
        const int LIMIT = 100;

        string sql;

        if (score == 0)
        {
            sql = $"""
                WITH RankedFeedbacks AS (
                    SELECT 
                        f.*,
                        u.icon,      
                        u.nick_name,
                        ROW_NUMBER() OVER(PARTITION BY f.score ORDER BY f.update_tim DESC) as row_num
                    FROM t_sys_feedbacks f
                    LEFT JOIN t_app_user u ON f.user_id = u.user_id 
                )
                SELECT * FROM RankedFeedbacks
                WHERE row_num <= {LIMIT}
                ORDER BY update_tim DESC
                """;
        }
        else
        {
            sql = $"""
                SELECT 
                    f.*,
                    u.icon,      
                    u.nick_name  
                FROM t_sys_feedbacks f
                LEFT JOIN t_app_user u ON f.user_id = u.user_id 
                WHERE f.score = @score
                ORDER BY f.update_tim DESC 
                LIMIT {LIMIT}
                """;
        }

        return await QueryAsync<DtoFeedbackDetail>(sql, new { score });

    }

}