namespace LittleTripMemo.Exceptions;

/// <summary>
/// クライアント（JS）へ返すエラー情報の標準形式。
/// 画面側はこのクラスの構造を前提にエラー表示処理を書けば良くなります。
/// </summary>
public class ErrorResponse
{
    // ユーザーに画面表示するためのメッセージ
    public string Message { get; init; } = string.Empty;

    // 特定の処理分岐が必要な場合に使用するエラーコード
    public string? ErrorCode { get; init; }

    // 開発中に役立つエラー詳細（スタックトレース等）
    public string? DebugInfo { get; init; }
}

