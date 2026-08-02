using LittleTripMemo.Common;
using LittleTripMemo.Models;
using Npgsql;

namespace LittleTripMemo.Repository.App;

/// <summary>
/// 旅の詳細履歴（t_memo_detail_n）用リポジトリ。
/// 動的テーブル生成に対応し、基底クラスを通じてログ・トランザクションを管理する。
/// </summary>
public class DetailRepository : _BaseRepository
{
    // コンストラクタ
    public DetailRepository(
        ITransactionProvider provider,
        ILogger<DetailRepository> logger,
        UserContext user
    ) : base(provider, logger, user)
    {
    }

    /// <summary>
    /// 明細登録。モデルのスネークケース（user_id等）をそのままSQLパラメータに使用。
    /// </summary>
    public async Task<long> InsertAsync(TMemoDetail entity)
    {
        entity.user_id = _user.login_user_id;

        // _tableId を用いて物理テーブル名を指定
        string sql = $@"
            INSERT INTO t_memo_detail_{_user.table_id} (
                archive_id, user_id, latitude, longitude, title, body, 
                memo_date, memo_time, face_emoji, weather_code, link_url, 
                memo_price, feel_type, create_tim, update_tim
            ) VALUES (
                @archive_id, @user_id, @latitude, @longitude, @title, @body, 
                @memo_date, @memo_time, @face_emoji, @weather_code, @link_url, 
                @memo_price, @feel_type, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING seq";

        return await ExecuteScalarAsync<int>(sql, entity);
    }

    /// <summary>
    /// 主キー（seq）による単一更新。
    /// </summary>
    public async Task<int> UpdateByKeyAsync(TMemoDetail detail)
    {
        detail.user_id = _user.login_user_id;

        string sql = $@"
            UPDATE t_memo_detail_{_user.table_id} SET
                latitude     = @latitude,
                longitude    = @longitude,
                title        = @title,
                body         = @body,
                memo_date    = @memo_date,
                memo_time    = @memo_time,
                face_emoji   = @face_emoji,
                weather_code = @weather_code,
                link_url     = @link_url,
                memo_price   = @memo_price,
                feel_type    = @feel_type,
                update_tim   = CURRENT_TIMESTAMP
            WHERE seq        = @seq 
              AND user_id    = @user_id 
              AND del_flg    = false";

        return await ExecuteAsync(sql, detail);
    }

    /// <summary>
    /// 親ID（archive_id）紐づき取得。
    /// </summary>
    public async Task<IEnumerable<TMemoDetail>> GetByArchiveIdAsync(int archiveId)
    {
        string sql = $@"
            SELECT * FROM t_memo_detail_{_user.table_id} 
            WHERE archive_id = @archive_id 
              AND user_id    = @user_id 
              AND del_flg    = false 
            ORDER BY memo_date ASC, memo_time ASC, seq ASC";

        return await QueryAsync<TMemoDetail>(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 指定された seq リストの明細に archive_id をセット。
    /// 条件：seq IN (@seqs) AND archive_id = 0 AND user_id = @user_id
    /// </summary>
    public async Task<int> UpdateArchiveIdBySeqsAsync(int archiveId, long[] seqs)
    {
        string sql = $@"
        UPDATE t_memo_detail_{_user.table_id} SET
            archive_id = @archive_id,
            update_tim = CURRENT_TIMESTAMP
        WHERE 
            seq        = ANY(@seqs)
            AND archive_id = 0
            AND user_id    = @user_id";

        return await ExecuteAsync(sql, new
        {
            archive_id = archiveId,
            seqs,
            user_id = _user.login_user_id
        });
    }

    /// <summary>
    /// 主キー（seq）による論理削除。
    /// </summary>
    public async Task<int> DeleteByArchiveIdAsync(int archive_id)
    {
        string sql = $@"
            UPDATE t_memo_detail_{_user.table_id} SET
                del_flg    = true,
                update_tim = CURRENT_TIMESTAMP
            WHERE 
                archive_id = @archive_id 
                AND user_id = @user_id";

        return await ExecuteAsync(sql, new { archive_id, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 未まとめ明細取得（archive_id = 0）。
    /// </summary>
    public async Task<IEnumerable<TMemoDetail>> GetUnMergedAsync()
    {
        string sql = $@"
            SELECT * FROM t_memo_detail_{_user.table_id} 
            WHERE archive_id = 0
              AND user_id    = @user_id 
              AND del_flg    = false 
            ORDER BY memo_date ASC, memo_time ASC, seq ASC
            LIMIT 100
        ";

        return await QueryAsync<TMemoDetail>(sql, new { user_id = _user.login_user_id });
    }

    /// <summary>
    /// 指定されたアーカイブIDに紐づく明細を解放（archive_id = 0 に戻す）
    /// </summary>
    public async Task<int> ReleaseArchiveIdAsync(int archiveId)
    {
        string sql = $@"
            UPDATE t_memo_detail_{_user.table_id} SET
                archive_id = 0,
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
    /// 秘密データへ戻す（論理削除の復元）。主キー（archive_id）による更新。
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<int> RestoreByKeyAsync(int archiveId)
    {
        string sql = $@"
            UPDATE t_memo_detail_{_user.table_id}
            SET del_flg    = false,
                update_tim = CURRENT_TIMESTAMP
            WHERE
                archive_id = @archive_id
                AND user_id = @user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 管理者用：対象ユーザーの TableId を指定して復元
    /// </summary>
    /// <param name="archiveId"></param>
    /// <param name="targetUserId"></param>
    /// <param name="targetTableId"></param>
    /// <returns></returns>
    public async Task<int> AdminRestoreByKeyAsync(int archiveId, Guid targetUserId, int targetTableId)
    {
        string sql = $@"
        UPDATE t_memo_detail_{targetTableId} SET del_flg = false, update_tim = CURRENT_TIMESTAMP 
        WHERE archive_id = @archive_id AND user_id = @target_user_id";
        return await ExecuteAsync(sql, new { archive_id = archiveId, target_user_id = targetUserId });
    }

    /// <summary>
    /// 指定された seq リスト（未まとめ明細のみ）を論理削除する
    /// </summary>
    public async Task<int> DeleteStrayBySeqsAsync(long[] seqs)
    {
        string sql = $@"
            UPDATE t_memo_detail_{_user.table_id} SET
                del_flg    = true,
                update_tim = CURRENT_TIMESTAMP
            WHERE 
                seq        = ANY(@seqs)
                AND archive_id = 0
                AND user_id    = @user_id";

        return await ExecuteAsync(sql, new { seqs, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 指定された seq リストをアーカイブから切り離す（archive_id を 0 に戻す）
    /// </summary>
    public async Task<int> DetachBySeqsAsync(long[] seqs)
    {
        string sql = $@"
            UPDATE t_memo_detail_{_user.table_id} SET
                archive_id = 0,
                update_tim = CURRENT_TIMESTAMP
            WHERE 
                seq        = ANY(@seqs)
                AND archive_id > 0
                AND user_id    = @user_id";

        return await ExecuteAsync(sql, new { seqs, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 公開済み明細取得（論理削除済みも含む）
    /// </summary>
    /// <param name="archiveId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<TMemoDetail>> GetByArchiveIdWithDeletedAsync(int archiveId)
    {
        string sql = $@"
            SELECT * 
            FROM t_memo_detail_{_user.table_id} 
            WHERE archive_id = @archive_id 
            AND user_id = @user_id";
        return await QueryAsync<TMemoDetail>(sql, new { archive_id = archiveId, user_id = _user.login_user_id });
    }

    /// <summary>
    /// 特定のアーカイブに属する明細の地点情報のみを更新する
    /// </summary>
    public async Task<int> UpdateCoordinatesAsync(int archiveId, long seq, decimal lat, decimal lng)
    {
        string sql = $@"
        UPDATE t_memo_detail_{_user.table_id} SET
            latitude   = @lat,
            longitude  = @lng,
            update_tim = CURRENT_TIMESTAMP
        WHERE seq      = @seq 
          AND archive_id = @archiveId
          AND user_id    = @user_id 
          AND del_flg    = false";

        return await ExecuteAsync(sql, new { archiveId, seq, lat, lng, user_id = _user.login_user_id });
    }

}