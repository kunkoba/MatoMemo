namespace LittleTripMemo.Exceptions;

/// <summary>
/// 業務上のルール違反（例：日付の逆転など）を通知するための例外。
/// この例外を投げると、共通処理が自動でキャッチして 400 Bad Request を返します。
/// </summary>
// Exceptions/BusinessException.cs

public class BusinessException : Exception
{
    public string? ErrorCode { get; init; }
    // ★ 追加：管理者・ログ出力用の詳細メッセージ
    public string? AdminMessage { get; init; }

    // ★ コンストラクタを拡張
    public BusinessException(string userMessage, string? errorCode = null, string? adminMessage = null)
        : base(userMessage)
    {
        ErrorCode = errorCode;
        AdminMessage = adminMessage;
    }

    // ★ ガード節も拡張
    public static void ThrowIf(bool condition, string userMessage, string? errorCode = null, string? adminMessage = null)
    {
        if (condition) throw new BusinessException(userMessage, errorCode, adminMessage);
    }
}