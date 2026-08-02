using LittleTripMemo.Repository;
using Npgsql;
using System.Data;

public class TransactionProvider : ITransactionProvider
{
    private readonly string _connectionString;
    private IDbConnection? _connection;
    private IDbTransaction? _transaction;
    private bool _isExternal = false;

    public TransactionProvider(string connectionString) => _connectionString = connectionString;

    public IDbConnection Connection => _connection ??= new NpgsqlConnection(_connectionString);
    public IDbTransaction? Transaction => _transaction;

    public void SetExternalTransaction(IDbConnection connection, IDbTransaction transaction)
    {
        _connection = connection;
        _transaction = transaction;
        _isExternal = true;
    }

    public IDbTransaction BeginTransaction()
    {
        if (Connection.State != ConnectionState.Open) Connection.Open();
        return _transaction = Connection.BeginTransaction();
    }

    public void Dispose()
    {
        // 外部接続の場合は、ここでの破棄を避けてEF側に任せる
        if (!_isExternal)
        {
            _transaction?.Dispose();
            _connection?.Dispose();
        }
    }

}