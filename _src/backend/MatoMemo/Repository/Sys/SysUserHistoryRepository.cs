using LittleTripMemo.Models;
using LittleTripMemo.Common;

namespace LittleTripMemo.Repository.Sys;

/// <summary>
/// ユーザーの行動履歴（t_sys_user_histories）の保存・取得を担当するリポジトリ
/// </summary>
public class SysUserHistoryRepository(
    ITransactionProvider provider,
    ILogger<SysUserHistoryRepository> logger,
    UserContext user
) : _BaseRepository(provider, logger, user)
{
    /// <summary>
    /// 履歴レコードを挿入する
    /// </summary>
    public async Task InsertAsync(TSysUserHistory history)
    {
        const string sql = """
            INSERT INTO t_sys_user_histories (
                user_id, 
                action_kind, 
                body, 
                memo_json, 
                create_tim
            ) VALUES (
                @user_id, 
                @action_kind, 
                @body, 
                @memo_json::jsonb, 
                CURRENT_TIMESTAMP
            )
            """;

        await ExecuteAsync(sql, history);
    }

    /// <summary>
    /// 特定ユーザーの履歴を時系列（降順）で取得する
    /// </summary>
    public async Task<IEnumerable<TSysUserHistory>> GetByUserIdAsync(Guid userId)
    {
        const string sql = """
            SELECT * FROM t_sys_user_histories 
            WHERE user_id = @userId 
            ORDER BY create_tim DESC
            """;

        return await QueryAsync<TSysUserHistory>(sql, new { userId });
    }

}