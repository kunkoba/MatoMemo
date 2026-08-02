using LittleTripMemo.Models;
using LittleTripMemo.Common;

namespace LittleTripMemo.Repository.App;

public class ArchivePubRepository : _BaseRepository
{
    public ArchivePubRepository(
        ITransactionProvider provider,
        ILogger<ArchivePubRepository> logger,
        UserContext user
    ) : base(provider, logger, user) { }

    /// <summary>
    /// 新規公開処理
    /// </summary>
    public async Task<int> InsertAsync(TMemoArchivePub archive)
    {
        archive.user_id = _user.login_user_id;

        const string sql = @"
            INSERT INTO t_memo_archive_pub (
                archive_id, user_id, title, memo, link_url, currency_unit,
                closed_flg, limited_open_flg, del_flg
            )
            VALUES (
                @archive_id, @user_id, @title, @memo, @link_url, @currency_unit,
                TRUE, @limited_open_flg, FALSE
            );
        ";

        return await ExecuteAsync(sql, archive);
    }

    /// <summary>
    /// 公開情報の更新（限定公開フラグの変更を含む）
    /// </summary>
    public async Task<int> UpdateByKeyAsync(TMemoArchivePub archive)
    {
        archive.user_id = _user.login_user_id;

        const string sql = @"
            UPDATE t_memo_archive_pub SET
                title            = @title,
                category         = @category,
                memo             = @memo,
                link_url         = @link_url,
                currency_unit    = @currency_unit,
                limited_open_flg = @limited_open_flg,
                update_tim       = CURRENT_TIMESTAMP
            WHERE
                archive_id = @archive_id
                AND user_id = @user_id
                AND del_flg = false";

        return await ExecuteAsync(sql, archive);
    }

    public async Task<TMemoArchivePub?> GetByKeyAsync(int archiveId)
    {
        const string sql = @"
            SELECT * FROM t_memo_archive_pub
            WHERE archive_id = @archive_id
              AND del_flg    = false";
        return await QuerySingleOrDefaultAsync<TMemoArchivePub>(sql, new { archive_id = archiveId });
    }

    /// <summary>
    /// 状態を取得するためアーカイブID以外の条件を除外
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<TMemoArchivePub?> GetStatsByKeyAsync(int archiveId)
    {
        const string sql = @"
            SELECT * FROM t_memo_archive_pub WHERE archive_id = @archive_id";
        return await QuerySingleOrDefaultAsync<TMemoArchivePub>(sql, new { archive_id = archiveId });
    }

    /// <summary>
    /// 秘密データから公開データへUPSERT（存在すれば最新化して復活、なければ挿入）
    /// </summary>
    public async Task RestoreArchiveAsync(TMemoArchivePub pub)
    {
        const string sql = @"
            INSERT INTO t_memo_archive_pub (
                archive_id, user_id, title, memo, link_url, currency_unit
            ) VALUES (
                @archive_id, @user_id, @title, @memo, @link_url, @currency_unit
            )
            ON CONFLICT (archive_id) DO UPDATE SET
                del_flg = false, 
                closed_flg = true, 
                update_tim = CURRENT_TIMESTAMP";

        await ExecuteAsync(sql, pub);
    }

    /// <summary>
    /// 論理削除
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<int> DeleteLogicalByKeyAsync(int archiveId)
    {
        const string sql = @"
            UPDATE t_memo_archive_pub SET 
                del_flg = true, 
                update_tim = CURRENT_TIMESTAMP
            WHERE archive_id = @archive_id 
            AND user_id = @user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 主キーによる物理削除（再作成時などに使用）
    /// </summary>
    public async Task<int> DeletePhysicalByKeyAsync(int archiveId)
    {
        const string sql = @"
            DELETE FROM t_memo_archive_pub
            WHERE archive_id = @archive_id
              AND user_id    = @user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 管理者による強制クローズ（closed_flg = true）
    /// </summary>
    /// <param name="archiveId"></param>
    /// <param name="targetUserId"></param>
    /// <returns></returns>
    public async Task<int> AdminCloseByKeyAsync(int archiveId, Guid targetUserId)
    {
        const string sql = @"
        UPDATE t_memo_archive_pub 
        SET closed_flg = true, 
            update_tim = CURRENT_TIMESTAMP 
        WHERE archive_id = @archive_id 
          AND user_id    = @target_user_id"; // 所有者チェック追加

        return await ExecuteAsync(sql, new { archive_id = archiveId, target_user_id = targetUserId });
    }

    /// <summary>
    /// 管理者による物理削除
    /// </summary>
    /// <param name="archiveId"></param>
    /// <param name="targetUserId"></param>
    /// <returns></returns>
    public async Task<int> AdminDeletePhysicalByKeyAsync(int archiveId, Guid targetUserId)
    {
        const string sql = @"
        DELETE FROM t_memo_archive_pub 
        WHERE archive_id = @archive_id 
          AND user_id    = @target_user_id"; // 所有者チェック追加

        return await ExecuteAsync(sql, new { archive_id = archiveId, target_user_id = targetUserId });
    }

    /// <summary>
    /// 他の公開アーカイブ用ID一括チェック
    /// </summary>
    /// <param name="ids"></param>
    /// <returns></returns>
    public async Task<IEnumerable<int>> GetActiveArchiveIdsAsync(IEnumerable<int> ids)
    {
        const string sql = @"
        SELECT archive_id 
        FROM t_memo_archive_pub 
        WHERE archive_id = ANY(@ids) 
          AND del_flg    = false 
          AND closed_flg = false";

        return await QueryAsync<int>(sql, new { ids = ids.ToArray() });
    }

    /// <summary>
    /// 明細件数を更新
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task UpdateDetailCountAsync(int archiveId)
    {
        const string sql = @"
            UPDATE t_memo_archive_pub
            SET update_tim = CURRENT_TIMESTAMP,
                detail_count = (
                    SELECT count(*) 
                    FROM t_memo_detail_pub d 
                    WHERE d.archive_id = t_memo_archive_pub.archive_id 
                      AND d.del_flg = false
                )
            WHERE archive_id = @archive_id 
              AND user_id = @user_id";

        await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 一覧取得
    /// </summary>
    /// <returns></returns>
    public async Task<IEnumerable<TMemoArchivePub>> GetAllAsync()
    {
        const string sql = @"
            SELECT * FROM t_memo_archive_pub
            WHERE user_id = @user_id
              AND del_flg = false
            ORDER BY update_tim DESC
            LIMIT 100
        ";

        return await QueryAsync<TMemoArchivePub>(sql, new { user_id = _user.login_user_id });
    }

    /// <summary>
    /// 公開（open）化
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<int> OpenByKeyAsync(int archiveId)
    {
        const string sql = @"
        UPDATE t_memo_archive_pub
        SET closed_flg = false,
            limited_open_flg = false,
            update_tim = CURRENT_TIMESTAMP
        WHERE archive_id = @archive_id
          AND user_id    = @user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 更新：限定公開フラグの変更
    /// </summary>
    /// <param name="archiveId"></param>
    /// <param name="isLimited"></param>
    /// <returns></returns>
    public async Task<int> UpdateLimitedOpenByKeyAsync(int archiveId, bool isLimited)
    {
        const string sql = @"
        UPDATE t_memo_archive_pub
        SET limited_open_flg = @isLimited,
            closed_flg = false,
            update_tim = CURRENT_TIMESTAMP
        WHERE archive_id = @archiveId
          AND user_id    = @user_id";
        return await ExecuteAsync(sql, new { archiveId, isLimited, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 公開解除（close）化
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<int> CloseByKeyAsync(int archiveId)
    {
        const string sql = @"
            UPDATE t_memo_archive_pub
            SET closed_flg = true,
                update_tim = CURRENT_TIMESTAMP
            WHERE archive_id = @archive_id
              AND user_id    = @user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 閲覧履歴用まとめリスト
    /// </summary>
    /// <param name="ids"></param>
    /// <returns></returns>
    public async Task<IEnumerable<TMemoArchivePub>> GetAllByIdsAsync(IEnumerable<int> ids)
    {
        const string sql = "SELECT * FROM t_memo_archive_pub WHERE archive_id = ANY(@ids)";
        return await QueryAsync<TMemoArchivePub>(sql, new { ids = ids.ToArray() });
    }

    /// <summary>
    /// 指定ユーザーの公開中のまとめ一覧を取得する（第三者参照用）
    /// </summary>
    public async Task<IEnumerable<TMemoArchivePub>> GetPublicListByUserIdAsync(Guid targetUserId)
    {
        const string sql = @"
        SELECT * FROM t_memo_archive_pub
        WHERE user_id    = @targetUserId
          AND del_flg    = false
          AND closed_flg = false
          AND limited_open_flg = false
        ORDER BY update_tim DESC
        LIMIT 100";

        return await QueryAsync<TMemoArchivePub>(sql, new { targetUserId });
    }

}