using LittleTripMemo.Models;
using LittleTripMemo.Common;

namespace LittleTripMemo.Repository.App;

public class ReactionPubRepository : _BaseRepository
{
    public ReactionPubRepository(
        ITransactionProvider provider,
        ILogger<ReactionPubRepository> logger,
        UserContext user
    ) : base(provider, logger, user) { }

    /// <summary>
    /// リアクション状態の更新（UPSERT）
    /// </summary>
    public async Task<int> UpsertAsync(TReactionPub reaction)
    {
        reaction.user_id = _user.login_user_id;

        const string sql = @"
            INSERT INTO t_reaction_pub (
                archive_id, seq, user_id, 
                has_funny, has_love, has_surprise, has_sad, 
                del_flg, update_tim
            ) VALUES (
                @archive_id, @seq, @user_id, 
                @has_funny, @has_love, @has_surprise, @has_sad, 
                false, CURRENT_TIMESTAMP
            )
            ON CONFLICT (archive_id, seq, user_id) DO UPDATE SET
                has_funny    = EXCLUDED.has_funny,
                has_love     = EXCLUDED.has_love,
                has_surprise = EXCLUDED.has_surprise,
                has_sad      = EXCLUDED.has_sad,
                del_flg      = false, 
                update_tim   = CURRENT_TIMESTAMP";

        return await ExecuteAsync(sql, reaction);
    }

    /// <summary>
    /// アーカイブに紐づくリアクションを論理削除する
    /// </summary>
    public async Task<int> DeleteLogicalByArchiveIdAsync(int archiveId)
    {
        const string sql = @"
            UPDATE t_reaction_pub SET 
                del_flg = true, 
                update_tim = CURRENT_TIMESTAMP
            WHERE archive_id = @archive_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId });
    }

    /// <summary>
    /// アーカイブに紐づくリアクションを復元する
    /// </summary>
    public async Task<int> RestoreLogicalByArchiveIdAsync(int archiveId)
    {
        const string sql = @"
            UPDATE t_reaction_pub SET 
                del_flg = false, 
                update_tim = CURRENT_TIMESTAMP
            WHERE archive_id = @archive_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId });
    }

    /// <summary>
    /// アーカイブIDに紐づく「自分の」全リアクションを取得
    /// 1レコードに4種入っているため、取得後のハンドリングが楽になります
    /// </summary>
    public async Task<IEnumerable<TReactionPub>> GetMyReactionsByArchiveIdAsync(int archiveId)
    {
        const string sql = @"
            SELECT * FROM t_reaction_pub 
            WHERE archive_id = @archiveId 
              AND user_id    = @user_id";

        return await QueryAsync<TReactionPub>(sql, new { archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// アーカイブIDに紐づくリアクションをすべて物理削除（公開停止・削除用）
    /// </summary>
    public async Task<int> DeletePhysicalByArchiveIdAsync(int archiveId)
    {
        const string sql = "DELETE FROM t_reaction_pub WHERE archive_id = @archive_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId });
    }

}