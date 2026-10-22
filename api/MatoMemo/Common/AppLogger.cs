public static class AppLogger
{
    // ログ種別：基本4つ + 特例
    public enum Kind
    {
        Info,           // 通常情報
        Warning,        // 警告
        Error,          // エラー
        Critical,       // 致命的エラー
        ConfigLoaded,   // 特例：設定取込
        TaskCompleted   // 特例：タスク完了
    }

    /// <summary>
    /// アプリ共通ログ出力
    /// </summary>
    public static void Log(this ILogger logger, Kind kind, string detail = "", Exception? ex = null)
    {
        switch (kind)
        {
            // --- 基本ログ ---
            case Kind.Info:
                logger.LogInformation("{msg}", detail);
                break;
            case Kind.Warning:
                logger.LogWarning("{msg}", detail);
                break;
            case Kind.Error:
                logger.LogError(ex, "{msg}", detail);
                break;
            case Kind.Critical:
                logger.LogCritical(ex, "{msg}", detail);
                break;

            // --- 特例ログ ---
            case Kind.ConfigLoaded:
                logger.LogInformation("設定取込: {msg}", detail);
                break;
            case Kind.TaskCompleted:
                logger.LogInformation("タスク {msg} 完了", detail);
                break;
        }
    }
}