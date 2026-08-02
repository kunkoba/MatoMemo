namespace LittleTripMemo.Common;

// 料金プラン・権限
public enum PlanType
{
    Admin,       // 管理者
    Free,       // 無料プラン
    Standard,   // 標準プラン
    Premium,    // プレミアムプラン
    Test,       // テスト用（無制限）
}

// メール（個別通知）種別
public enum UserNotificationKind : short
{
    Info = 1,     // 通常（フィードバックありがとう、など）
    Caution = 8,  // 注意（強制クローズ：t_memo_archive_pub.closed_flg = true）
    Warning = 9,  // 警告（強制公開停止：データが秘密側へ戻された）
}

// クリック数、閲覧数の統計の対象種別
public enum CountTargetType : short
{
    User = 1,
    Archive = 2,
    Detail = 3,
}

// ユーザーログのアクション種別
public enum UserHistoryActionKind
{
    Feedback,       // フィードバック送信
    Withdrawal,     // 退会
    AdminClose,     // 管理者による強制クローズ
    AdminUnpublish, // 管理者による強制公開停止
    AdminMailSent,  // 管理者からの個別メール送信
    AdminBan,       // BAN実行
    AdminUnban      // BAN解除
}

/// <summary>
/// 公開側まとめの状態
/// </summary>
public enum PublicStatus : short
{
    Nothing,
    Open,
    Close,
    Delete
}

