using LittleTripMemo.Common;
using LittleTripMemo.Models;

namespace LittleTripMemo.Repository.Sys;

public class SysUserLogRepository(
    ITransactionProvider provider,
    ILogger<SysUserLogRepository> logger,
    UserContext user
) : _BaseRepository(provider, logger, user)
{
    /// <summary>
    /// ユーザーログを記録する
    /// </summary>
    public async Task InsertAsync(TSysUserHistory log)
    {
        const string sql = """
            INSERT INTO t_sys_user_logs (user_id, action_kind, body, memo_json)
            VALUES (@user_id, @action_kind, @body, @memo_json::jsonb)
            """;
        await ExecuteAsync(sql, log);
    }

    /// <summary>
    /// 特定ユーザーの全履歴を時系列（新しい順）で取得する
    /// </summary>
    public async Task<IEnumerable<TSysUserHistory>> GetByUserIdAsync(Guid userId)
    {
        const string sql = """
            SELECT * FROM t_sys_user_logs 
            WHERE user_id = @userId 
            ORDER BY create_tim DESC
            """;
        return await QueryAsync<TSysUserHistory>(sql, new { userId });
    }

}
