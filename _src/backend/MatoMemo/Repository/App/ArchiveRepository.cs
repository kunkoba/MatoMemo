using LittleTripMemo.Models;
using LittleTripMemo.Common;

namespace LittleTripMemo.Repository.App;

/// <summary>
/// 旅の記録（親）のリポジトリ。
/// 継承元（_BaseRepository）の機能を利用し、モデルのスネークケース定義をそのまま使用する。
/// </summary>
public class ArchiveRepository : _BaseRepository
{
    // コンストラクタ
    public ArchiveRepository(
        ITransactionProvider provider,
        ILogger<ArchiveRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// 新規保存。モデルのスネークケース・プロパティ（user_id）に直接値をセットする。
    /// </summary>
    public async Task<int> InsertAsync(TMemoArchive archive)
    {
        // ログイン中のユーザーIDを強制セット
        archive.user_id = _user.login_user_id;

        const string sql = @"
            INSERT INTO t_memo_archive (
                user_id, title, memo, link_url, currency_unit, del_flg, create_tim, update_tim
            ) VALUES (
                @user_id, @title, @memo, @link_url, @currency_unit, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING archive_id";

        // 継承元のラップメソッドを使用。transaction引数の記述は不要。
        return await ExecuteScalarAsync<int>(sql, archive);
    }

    /// <summary>
    /// 主キー（archive_id）による単一更新。
    /// </summary>
    public async Task<int> UpdateByKeyAsync(TMemoArchive archive)
    {
        archive.user_id = _user.login_user_id;

        const string sql = @"
            UPDATE t_memo_archive SET
                category   = @category,
                title      = @title,
                memo       = @memo,
                link_url   = @link_url,
                currency_unit = @currency_unit,
                update_tim = CURRENT_TIMESTAMP
            WHERE 
                archive_id = @archive_id 
                AND user_id = @user_id
                AND del_flg    = false"; // 公開済み(論理削除)なら更新させない

        return await ExecuteAsync(sql, archive);
    }

    /// <summary>
    /// 主キーによる物理削除（まとめの解体時に使用）
    /// </summary>
    public async Task<int> DeletePhysicalByKeyAsync(int archiveId)
    {
        const string sql = @"
            DELETE FROM t_memo_archive 
            WHERE archive_id = @archive_id 
              AND user_id    = @user_id";

        return await ExecuteAsync(sql, new
        {
            archive_id = archiveId,
            user_id = _user.login_user_id
        });
    }

    /// <summary>
    /// 主キー（archive_id）による論理削除。
    /// </summary>
    public async Task<int> DeleteLogicalByKeyAsync(int archiveId)
    {
        const string sql = @"
            UPDATE t_memo_archive 
            SET del_flg    = true,
                update_tim = CURRENT_TIMESTAMP
            WHERE 
                archive_id = @archive_id 
                AND user_id = @user_id";

        return await ExecuteAsync(sql, new
        {
            archive_id = archiveId,
            user_id = _user.login_user_id
        });
    }

    /// <summary>
    /// 主キー（archive_id）による1件取得。
    /// </summary>
    public async Task<TMemoArchive?> GetByKeyAsync(int archiveId)
    {
        const string sql = @"
            SELECT * FROM t_memo_archive 
            WHERE archive_id = @archive_id 
              AND user_id    = @user_id 
              AND del_flg    = false";

        return await QuerySingleOrDefaultAsync<TMemoArchive>(sql, new
        {
            archive_id = archiveId,
            user_id = _user.login_user_id
        });
    }

    /// <summary>
    /// 秘密データへ戻す（論理削除の復元）。主キー（archive_id）による更新。
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<int> RestoreByKeyAsync(int archiveId)
    {
        const string sql = @"
        UPDATE t_memo_archive
        SET del_flg    = false,
            update_tim = CURRENT_TIMESTAMP
        WHERE
            archive_id = @archive_id
            AND user_id = @user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 管理者権限で復活
    /// </summary>
    /// <param name="archiveId"></param>
    /// <param name="targetUserId"></param>
    /// <returns></returns>
    public async Task<int> AdminRestoreByKeyAsync(int archiveId, Guid targetUserId)
    {
        const string sql = "UPDATE t_memo_archive SET del_flg = false, update_tim = CURRENT_TIMESTAMP WHERE archive_id = @archive_id AND user_id = @target_user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, target_user_id = targetUserId });
    }

    /// <summary>
    /// 明細テーブルから現在の件数を集計し、archiveテーブルの detail_count を更新する
    /// </summary>
    public async Task UpdateDetailCountAsync(int archiveId)
    {
        string sql = $@"
            UPDATE t_memo_archive
            SET update_tim = CURRENT_TIMESTAMP,
                detail_count = (
                    SELECT count(*) 
                    FROM t_memo_detail_{_user.table_id} d 
                    WHERE d.archive_id = t_memo_archive.archive_id 
                      AND d.del_flg = false
                )
            WHERE archive_id = @archive_id 
              AND user_id    = @user_id";

        await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 一覧取得（JOINなし・高速版）
    /// </summary>
    public async Task<IEnumerable<TMemoArchive>> GetAllAsync()
    {
        // COUNTのJOINを排除。detail_countカラムをそのまま返す
        const string sql = @"
            SELECT * FROM t_memo_archive 
            WHERE user_id = @user_id 
              AND del_flg = false
            ORDER BY update_tim DESC
            LIMIT 100
        ";

        return await QueryAsync<TMemoArchive>(sql, new { user_id = _user.login_user_id });
    }

    /// <summary>
    /// 公開済み明細取得
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<TMemoArchive?> GetByKeyWithDeletedAsync(int archiveId)
    {
        const string sql = @"
            SELECT * 
            FROM t_memo_archive 
            WHERE archive_id = @archive_id 
            AND user_id = @user_id
            AND del_flg = true";
        return await QuerySingleOrDefaultAsync<TMemoArchive>(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

}