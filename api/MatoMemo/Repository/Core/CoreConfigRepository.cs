using MatoMemo.Common;

namespace MatoMemo.Repository.Core;

/// <summary>
/// アプリ基盤設定（mgr_sys_config）の読み書きを担当するリポジトリ
/// </summary>
public class CoreConfigRepository : _BaseRepository
{
    public CoreConfigRepository(
        ITransactionProvider provider,
        ILogger<CoreConfigRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// 指定されたカテゴリーに属する設定をすべて取得する
    /// </summary>
    public async Task<IEnumerable<dynamic>> GetConfigsByCategoryAsync(string category)
    {
        const string sql = @"
            SELECT key, value, description, update_tim 
            FROM mgr_sys_config 
            WHERE category = @category";

        return await QueryAsync<dynamic>(sql, new { category });
    }

    /// <summary>
    /// 特定の設定値を更新する（管理者窓口用）
    /// </summary>
    public async Task<int> UpdateConfigAsync(string category, string key, string value)
    {
        const string sql = @"
            INSERT INTO mgr_sys_config (category, key, value, description, update_tim)
            VALUES (@category, @key, @value, '', CURRENT_TIMESTAMP)
            ON CONFLICT (category, key) 
            DO UPDATE SET 
                value = @value, 
                update_tim = CURRENT_TIMESTAMP";

        return await ExecuteAsync(sql, new { category, key, value });
    }

}