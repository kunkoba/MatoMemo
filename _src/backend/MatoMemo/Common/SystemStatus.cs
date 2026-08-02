namespace LittleTripMemo.Common;

/// <summary>
/// アプリケーション全体の実行状態（メンテナンス・バージョン等）をメモリ上に保持するクラス。
/// Program.cs で Singleton として登録され、バッチによって定期的に更新されます。
/// </summary>
public class SystemStatus
{
    /// <summary>
    /// メンテナンスモードフラグ（true の場合は一般ユーザーのアクセスを遮断）
    /// </summary>
    public bool IsMaintenanceMode { get; set; } = false;

    /// <summary>
    /// メンテナンス中に画面に表示するメッセージ
    /// </summary>
    public string MaintenanceMessage { get; set; } = string.Empty;

    /// <summary>
    /// 動作を許可する最小アプリバージョン（例: "1.0.0"）
    /// </summary>
    public string MinAppVersion { get; set; } = "1.0.0";

    /// <summary>
    /// 現在の最新アプリバージョン
    /// </summary>
    public string LatestAppVersion { get; set; } = "1.0.0";

    /// <summary>
    /// DBから最後に同期した時刻（生存確認用）
    /// </summary>
    public DateTime LastSyncTime { get; set; } = DateTime.MinValue;

}