using LittleTripMemo.Common;
using LittleTripMemo.Models;
using System.Collections.Generic;

namespace LittleTripMemo.Repository.Sys;

/// <summary>
/// アプリ専用ユーザ情報（t_app_user）および
/// ユーザ管理に付随するDB操作を担当するリポジトリ。
/// </summary>
public class AppUserRepository : _BaseRepository
{
    public AppUserRepository(
        ITransactionProvider provider,
        ILogger<AppUserRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// 業務ユーザ情報の新規登録
    /// </summary>
    public async Task<int> InsertAsync(TAppUser user)
    {
        const string sql = @"
            INSERT INTO t_app_user (
                user_id, table_id, plan_type, icon, nick_name,
                member_no, user_rank
            ) VALUES (
                @user_id, @table_id, @plan_type, @icon, @nick_name,
                nextval('t_app_user_member_no_seq'), 1
            )"
        ;
        return await ExecuteAsync(sql, user);
    }

    /// <summary>
    /// ユーザIDによる業務ユーザ情報の取得
    /// </summary>
    public async Task<TAppUser?> GetByUserIdAsync(Guid user_id)
    {
        const string sql = "SELECT * FROM t_app_user WHERE user_id = @user_id";
        return await QuerySingleOrDefaultAsync<TAppUser>(sql, new { user_id });
    }

    /// <summary>
    /// ユーザプロフィールの更新
    /// </summary>
    public async Task<int> UpdateProfileAsync(TAppUser user)
    {
        const string sql = @"
            UPDATE t_app_user SET
                nick_name     = @nick_name,
                user_category = @user_category,
                icon          = @icon,
                description   = @description,
                anonymous_flg = @anonymous_flg,
                link_1        = @link_1,
                link_2        = @link_2,
                link_3        = @link_3,
                update_tim    = CURRENT_TIMESTAMP
            WHERE user_id = @user_id"   
        ;
        return await ExecuteAsync(sql, user);
    }

    /// <summary>
    /// 指定された番号の明細テーブルのレコード件数を統計情報から取得する（高速版）
    /// 旧 AccountRepository からの移行
    /// </summary>
    public async Task<long> GetTableCountAsync(int table_no)
    {
        var table_name = $"t_memo_detail_{table_no}";
        const string sql = @"
            SELECT reltuples::BIGINT 
            FROM pg_class 
            WHERE relname = @table_name";

        return await ExecuteScalarAsync<long>(sql, new { table_name });
    }

    /// <summary>
    /// 最終ログイン日時のみを現在時刻に更新する
    /// </summary>
    public async Task<int> UpdateLastLoginTimeAsync(Guid userId)
    {
        const string sql = @"
            UPDATE t_app_user 
            SET last_login_tim = CURRENT_TIMESTAMP 
            WHERE user_id = @userId";

        return await ExecuteAsync(sql, new { userId });
    }

    /// <summary>
    /// ユーザーのBAN状態を更新する（管理者用）
    /// </summary>
    public async Task<int> UpdateBanStatusAsync(Guid userId, bool isBanned)
    {
        const string sql = @"
            UPDATE t_app_user SET 
                ban_flg    = @isBanned, 
                update_tim = CURRENT_TIMESTAMP 
            WHERE user_id  = @userId";

        return await ExecuteAsync(sql, new { userId, isBanned });
    }

    /// <summary>
    /// ユーザーの退会状態（論理削除）を更新する
    /// </summary>
    public async Task<int> UpdateDeleteStatusAsync(Guid userId, bool isDeleted)
    {
        const string sql = @"
            UPDATE t_app_user SET 
                del_flg    = @isDeleted, 
                update_tim = CURRENT_TIMESTAMP 
            WHERE user_id  = @userId";

        return await ExecuteAsync(sql, new { userId, isDeleted });
    }

    /// <summary>
    /// banユーザを取得する
    /// </summary>
    /// <returns></returns>
    public async Task<IEnumerable<TAppUser>> GetShadowBanUsersAsync()
    {
        const string sql = "SELECT * FROM t_app_user WHERE ban_flg = true AND del_flg = false ORDER BY update_tim DESC";
        return await QueryAsync<TAppUser>(sql);
    }

    /// <summary>
    /// ユーザーの閲覧履歴（JSONB配列）を更新する
    /// </summary>
    /// <param name="userId"></param>
    /// <param name="history"></param>
    /// <returns></returns>
    public async Task<int> UpdateViewHistoryAsync(Guid userId, List<int> history)
    {
        const string sql = "UPDATE t_app_user SET view_history = @history::jsonb, update_tim = CURRENT_TIMESTAMP WHERE user_id = @userId";
        return await ExecuteAsync(sql, new { userId, history = System.Text.Json.JsonSerializer.Serialize(history) });
    }

}