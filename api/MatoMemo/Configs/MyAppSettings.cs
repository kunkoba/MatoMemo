// Models/MyAppSettings.cs
namespace MatoMemo.Configs;

/// <summary>
/// アプリケーション固有の設定を一括管理するクラス。
/// appsettings.json の "MyAppSettings" セクションと紐付きます。
/// </summary>
public class MyAppSettings
{
    // Program.cs で使用するセクション名定数
    public const string SectionName = "MyAppSettings";

    public int MaxTableNum { get; set; } = -1;   // テーブル分散の最大数

    // バッチの実行間隔（分）
    public int ReactionCountUpdateIntervalMinutes { get; set; } = -1;   // リアクション集計
    public int TableStatsUpdateIntervalMinutes { get; set; } = -1;      // テーブル件数集計
    public int GarbageCleanupIntervalMinutes { get; set; } = -1;    // 明細のゴミ掃除
    public int ClickAggregateIntervalMinutes { get; set; } = -1;    // クリック数の集計
    public int UserSummaryUpdateIntervalMinutes { get; set; } = -1;     // ユーザー関連情報の集計の更新
    public int ReportStatsUpdateIntervalMinutes { get; set; } = -1;     // レポート関連情報の集計の更新
    public int AppInfoUpdateIntervalMinutes { get; set; } = -1;     // アプリ情報の集計の更新
    public int VacuumMinutes { get; set; } = -1;    // （日次）データベースのバキューム処理の実行間隔
    public int ReindexMinutes { get; set; } = -1;   // （日次）データベースの再インデックス処理の実行間隔
    public int ClickAggregateMinutes { get; set; } = -1;    // （日次）クリック数の集計の実行間隔


}

/// <summary>
/// JWTを管理するクラス。
/// appsettings.json の "JwtSettings" セクションと紐付きます。
/// </summary>
public class JwtSettings
{
    public const string SectionName = "JwtSettings";

    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpireDays { get; set; } = 60;

}

