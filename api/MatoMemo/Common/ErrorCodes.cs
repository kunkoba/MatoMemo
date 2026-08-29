namespace LittleTripMemo.Common;

public static class ErrorCodes
{
    // DB・サーバー系エラー (ユーザーには詳細を伏せるもの)
    public const string DB_CONNECTION_ERROR = "SERVER_ERROR_101"; // 接続失敗
    public const string DB_QUERY_ERROR      = "SERVER_ERROR_102"; // SQL実行失敗
    public const string DB_CONFLICT_ERROR   = "SERVER_ERROR_103"; // データ重複(一意制約)
    public const string SYSTEM_ERROR        = "SERVER_ERROR_999"; // その他予期せぬエラー
}