
using Dapper;
using LittleTripMemo.Common;
using System.Data;

namespace LittleTripMemo.Repository;

/// <summary>
/// 全リポジトリの共通基底クラス。
/// Dapper実行時の共通ログ出力、例外ハンドリング、トランザクションの自動適用を担当。
/// </summary>
public abstract class _BaseRepository
{
    private readonly ITransactionProvider _provider;
    private readonly ILogger _logger;
    protected readonly UserContext _user; // 継承先（子リポジトリ）でログインユーザー情報を利用可能にする

    /// <summary>
    /// DIコンテナから依存オブジェクトを注入する。
    /// </summary>
    protected _BaseRepository(ITransactionProvider provider, ILogger logger, UserContext user)
    {
        _provider = provider;
        _logger = logger;
        _user = user;
    }

    /// <summary> プロバイダーから「現在生きている接続」を動的に取得する </summary>
    private IDbConnection _db => _provider.Connection;

    /// <summary> プロバイダーから「現在開始されているトランザクション」を動的に取得し、Dapperの引数に渡す </summary>
    private IDbTransaction? _transaction => _provider.Transaction;

    /// <summary>
    /// Dapperの各実行メソッドをラップし、エラー時の詳細ログ記録と例外の再送出を一括して行う。
    /// </summary>
    /// <typeparam name="T">戻り値の型</typeparam>
    /// <param name="sql">実行するSQLクエリ</param>
    /// <param name="param">SQLに渡すパラメータオブジェクト</param>
    /// <param name="action">Dapperの実行関数本体</param>
    private async Task<T> WrapAsync<T>(string sql, object? param, Func<Task<T>> action)
    {
        try
        {
            // 実際のDapper処理を実行
            return await action();
        }
        catch (Exception ex)
        {
            // 1. メッセージから改行以降をカット
            var cleanMsg = ex.Message.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0];

            // 2. SQL内の改行やタブを半角スペースに置換して1行にする
            var flatSql = sql.Replace("\r", " ").Replace("\n", " ").Replace("\t", " ");
            // 連続する空白を1つにまとめるとさらに綺麗（任意）
            flatSql = System.Text.RegularExpressions.Regex.Replace(flatSql, @"\s+", " ");

            _logger.LogError("【SQL実行失敗】Msg: {msg} | SQL: {sql} | Params: {@param}",
                cleanMsg, flatSql.Trim(), param);

            throw; // 例外自体はミドルウェアへ投げる
        }
    }

    #region Dapper Wrappers (リポジトリ継承先でSQL発行に使用するメソッド群)

    /// <summary> INSERT / UPDATE / DELETE を実行し、影響を受けた行数を返す。 </summary>
    protected async Task<int> ExecuteAsync(string sql, object? param = null)
        => await WrapAsync(sql, param, () => _db.ExecuteAsync(sql, param, _transaction));

    /// <summary> COUNT / SUM などの集計結果や、単一カラムの値を1つだけ取得する。 </summary>
    protected async Task<T> ExecuteScalarAsync<T>(string sql, object? param = null)
        => await WrapAsync(sql, param, () => _db.ExecuteScalarAsync<T>(sql, param, _transaction));

    /// <summary> 検索結果をエンティティのリストとして全件取得する。 </summary>
    protected async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
        => await WrapAsync(sql, param, () => _db.QueryAsync<T>(sql, param, _transaction));

    /// <summary> 条件に合う最初の1件を取得する。存在しない場合は default(T) を返す。 </summary>
    protected async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null)
        => await WrapAsync(sql, param, () => _db.QuerySingleOrDefaultAsync<T>(sql, param, _transaction));

    #endregion
}


/// <summary>
/// トランザクションとDB接続の状態を一元管理するインターフェース。
/// サービス層（ユースケース）単位で同一の接続・トランザクションを使い回すために使用。
/// </summary>
public interface ITransactionProvider : IDisposable
{
    // <summary> 現在有効なDB接続。サービス層のライフサイクル中、常に同一のインスタンスを保持する </summary>
    IDbConnection Connection { get; }

    // <summary> 実行中のトランザクション。未開始の場合は null を返す </summary>
    IDbTransaction? Transaction { get; }

    /// <summary> 
    /// トランザクションを明示的に開始する。
    /// 開始されたトランザクションは、このインターフェースを参照する全リポジトリで共有される。
    /// </summary>
    IDbTransaction BeginTransaction();

    // EF Core等の外部で開始された接続とトランザクションをセットする
    void SetExternalTransaction(IDbConnection connection, IDbTransaction transaction);
}

