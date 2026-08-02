using Dapper;
using System.Data;
using System.Text.Json;

namespace LittleTripMemo.DataAccess;

/// <summary>
/// Dapperで JSONB型カラム と Dictionary型プロパティ を相互変換するためのハンドラー
/// </summary>
/// <typeparam name="T">変換対象のオブジェクト型</typeparam>
public class JsonbTypeHandler<T> : SqlMapper.TypeHandler<T> where T : class
{
    // DBへ保存する際（Object -> JSON文字列）
    public override void SetValue(IDbDataParameter parameter, T? value)
    {
        parameter.Value = value == null
            ? DBNull.Value
            : JsonSerializer.Serialize(value);
        parameter.DbType = DbType.String; // PostgreSQL側で ::jsonb キャストされる前提
    }

    // DBから読み込む際（JSON文字列 -> Object）
    public override T? Parse(object value)
    {
        var json = value.ToString();
        if (string.IsNullOrEmpty(json)) return null;

        return JsonSerializer.Deserialize<T>(json);
    }

}