
using LittleTripMemo.Common;

namespace LittleTripMemo.Models;

#region "App"

// アプリ固有ユーザ
public class TAppUser
{
    public Guid user_id { get; set; }
    public int table_id { get; set; }
    public string plan_type { get; set; } = "Free";
    public long member_no { get; set; }
    public string user_category { get; set; } = "通りすがり";
    public int user_rank { get; set; } = 0;
    public string? icon { get; set; }
    public string? nick_name { get; set; }
    public string? description { get; set; }
    [SafeUrl(2000)]
    public string? link_1 { get; set; }
    [SafeUrl(2000)]
    public string? link_2 { get; set; }
    [SafeUrl(2000)]
    public string? link_3 { get; set; }
    public bool anonymous_flg { get; set; } = false; // 追加
    public bool ban_flg { get; set; } = false;
    public DateTime last_login_tim { get; set; }
    public bool del_flg { get; set; } = false;
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
    public Dictionary<string, ClickCountData> click_stats { get; set; } = new();
    public Dictionary<string, object> info_stats { get; set; } = new();
    public Dictionary<string, object> info_stats_pub { get; set; } = new();
    public int report_count { get; set; } = 0;
    public List<int> view_history { get; set; } = new(); // 追加：閲覧履歴IDリスト
}

// 認証用（Identity標準に戻す）
public class MyAppUser : Microsoft.AspNetCore.Identity.IdentityUser<Guid>
{
    // ここにはアプリ固有のプロパティは持たせない
}

public class TMemoArchive : IAppRecord
{
    public int archive_id { get; set; } = 0;
    public Guid user_id { get; set; }
    public string? category { get; set; } = "気まぐれ旅";
    public string title { get; set; } = "仮のタイトル";
    public string memo { get; set; } = "仮の本文";
    [SafeUrl(2000)]
    public string link_url { get; set; } = string.Empty;
    public string currency_unit { get; set; } = "JPY";
    public bool closed_flg { get; set; } = false;
    public bool del_flg { get; set; } = false;
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
    public bool is_public { get; set; } = false;
    public bool is_owner { get; set; } = true;
    public int detail_count { get; set; } = 0;
    public string has_public_status { get; set; } = PublicStatus.Nothing.ToString();
}

public class TMemoArchivePub : IAppRecord
{
    public int archive_id { get; set; } = 0;
    public Guid user_id { get; set; }
    public string? category { get; set; } = "気まぐれ旅";
    public string title { get; set; } = string.Empty;
    public string memo { get; set; } = string.Empty;
    [SafeUrl(2000)]
    public string link_url { get; set; } = string.Empty;
    public string currency_unit { get; set; } = "JPY";
    public bool closed_flg { get; set; } = false;
    public bool del_flg { get; set; } = false;
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
    public bool limited_open_flg { get; set; } = false;
    public bool is_public { get; set; } = true;
    public bool is_owner { get; set; } = false;
    public int detail_count { get; set; } = 0;
    public Dictionary<string, ClickCountData> click_stats { get; set; } = new();
    public int report_count { get; set; } = 0;
}

public class TMemoDetail : IAppRecord
{
    public long seq { get; set; }
    public int archive_id { get; set; } = 0;
    public Guid user_id { get; set; }
    public decimal latitude { get; set; }
    public decimal longitude { get; set; }
    public string title { get; set; } = string.Empty;
    public string body { get; set; } = string.Empty;
    public string memo_date { get; set; } = string.Empty;
    public string memo_time { get; set; } = string.Empty;
    public string face_emoji { get; set; } = string.Empty;
    public string weather_code { get; set; } = string.Empty;
    [SafeUrl(2000)]
    public string? link_url { get; set; } = string.Empty;
    public int memo_price { get; set; } = 0;
    public int feel_type { get; set; } = 0; // -1:bad, 0:normal, 1:good
    public bool del_flg { get; set; } = false;
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
    public bool is_public { get; set; } = false;
    public bool is_owner { get; set; } = true;
    public string a_title { get; set; } = string.Empty;
}

public class TMemoDetailPub : IAppRecord
{
    public int archive_id { get; set; } = 0;
    public long seq { get; set; }
    public Guid user_id { get; set; }
    public decimal latitude { get; set; }
    public decimal longitude { get; set; }
    public string? title { get; set; } = string.Empty;
    public string? body { get; set; } = string.Empty;
    public string memo_date { get; set; } = string.Empty;
    public string memo_time { get; set; } = string.Empty;
    public string face_emoji { get; set; } = string.Empty;
    public string weather_code { get; set; } = string.Empty;
    [SafeUrl(2000)]
    public string? link_url { get; set; } = string.Empty;
    public int memo_price { get; set; } = 0;
    public int feel_type { get; set; } = 0; // -1:bad, 0:normal, 1:good
    public bool del_flg { get; set; } = false;
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
    public bool is_public { get; set; } = true;
    public bool is_owner { get; set; } = false;
    public int count_funny { get; set; } = 0;
    public int count_love { get; set; } = 0;
    public int count_surprise { get; set; } = 0;
    public int count_sad { get; set; } = 0;
    public string a_title { get; set; } = string.Empty;
    public string currency_unit { get; set; } = string.Empty;
    public Dictionary<string, ClickCountData> click_stats { get; set; } = new();
}

public class TReactionPub
{
    public int archive_id { get; set; } = 0;
    public long seq { get; set; }
    public Guid user_id { get; set; }

    // 4つのリアクションを固定で持つ
    public bool has_funny { get; set; }
    public bool has_love { get; set; }
    public bool has_surprise { get; set; }
    public bool has_sad { get; set; }
}

#endregion

#region "System"

// フィードバック
public class TSysFeedback
    {
        public Guid user_id { get; set; } // アプリ側はGuid
        public string? body { get; set; }
        public int score { get; set; }
        public DateTime create_tim { get; set; }
        public DateTime update_tim { get; set; }
    }

// お知らせ
public class TSysNotification
{
    public long seq { get; set; }
    public string title { get; set; } = string.Empty;
    public string body { get; set; } = string.Empty;
    [SafeUrl(2000)]
    public string link_url { get; set; } = string.Empty; // ★追加
    public short kind { get; set; }
    public DateTime disp_from { get; set; }
    public DateTime disp_to { get; set; }
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
}

// 通報
public class TSysReport
{
    public Guid reporter_user_id { get; set; }
    public Guid target_user_id { get; set; }
    public long archive_id { get; set; }
    public string? body { get; set; }
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
}

// 個人向け通知
public class TSysUserNotification
{
    public long seq { get; set; }   // ただの連番
    public Guid user_id { get; set; }     // 対象ユーザー
    public short kind { get; set; } // varchar から short に変更
    public string body { get; set; } = string.Empty;
    [SafeUrl(2000)]
    public string link_url { get; set; } = string.Empty;
    public DateTime send_tim { get; set; }
}

// ユーザログ
public class TSysUserHistory
{
    public long seq { get; set; }
    public Guid user_id { get; set; }
    public string action_kind { get; set; } = string.Empty;
    public string? body { get; set; }
    public Dictionary<string, object>? memo_json { get; set; }
    public DateTime create_tim { get; set; }
}

// アプリ情報集約テーブル
public class TAppInfo
{
    public double avg_score { get; set; }
    public long total_feedback_count { get; set; }
    public long total_user_count { get; set; }
    public long total_archive_pub_count { get; set; }
    public long total_detail_pub_count { get; set; }
    public DateTime last_aggregate_tim { get; set; }
}

#endregion

#region "DTO"

/// <summary>
/// まとめ親リスト（private＋public）
/// </summary>
public class DtoArchive
{
    public long archive_id { get; set; } = 0;
    public Guid user_id { get; set; }
    public string? category { get; set; } = "気まぐれ旅";
    public string title { get; set; } = string.Empty;
    public string memo { get; set; } = string.Empty;
    [SafeUrl(2000)]
    public string link_url { get; set; } = string.Empty;
    public string currency_unit { get; set; } = "JPY";
    public bool closed_flg { get; set; } = false;
    public bool del_flg { get; set; } = false;
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }
    public bool limited_open_flg { get; set; } = false;
    public bool is_public { get; set; } = true;
    public bool is_owner { get; set; } = false;
    public int detail_count { get; set; } = 0;
    public int report_count { get; set; } = 0;
    public string has_public_status { get; set; } = PublicStatus.Nothing.ToString();
}

/// <summary>
/// フィードバック集計結果
/// </summary>
public class DtoFeedbackSummary
{
    public IEnumerable<TSysFeedback> LatestFeedbacks { get; set; } = Enumerable.Empty<TSysFeedback>();
    public double AverageScore { get; set; }
}

/// <summary>
/// 通報情報集計結果
/// </summary>
public class DtoReportSummary
{
    public Guid target_user_id { get; set; }
    public long archive_id { get; set; }
    public string archive_title { get; set; } = string.Empty; 
    public long report_count { get; set; }
    public bool is_closed { get; set; }  // t_memo_archive_pub.closed_flg
    public bool is_deleted { get; set; } // t_memo_archive_pub.del_flg
    public string? target_icon { get; set; }
    public string? target_nick_name { get; set; }
}

/// <summary>
/// 通報の詳細（通報文＋通報した人のプロフィール）
/// </summary>
public class DtoReportDetail
{
    // --- 通報データ (t_sys_reports) ---
    public Guid reporter_user_id { get; set; }
    public Guid target_user_id { get; set; }
    public long archive_id { get; set; }
    public string? body { get; set; }
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }

    public string icon { get; set; } = string.Empty;
    public string nick_name { get; set; } = string.Empty;
}

/// <summary>
/// 孤児あて通知情報
/// </summary>
public class DtoUserNotification
    {
        public long seq { get; set; }
        public Guid user_id { get; set; }
        public string emoji { get; set; } = string.Empty;
        public string body { get; set; } = string.Empty;
        [SafeUrl(2000)]
        public string link_url { get; set; } = string.Empty;
        public DateTime send_tim { get; set; }

        // 宛先ユーザーの情報
        public string nick_name { get; set; } = string.Empty;
        public string icon { get; set; } = string.Empty;
}

/// <summary>
/// フィードバック詳細情報
/// </summary>
public class DtoFeedbackDetail
{
    public Guid user_id { get; set; }
    public string? body { get; set; }
    public int score { get; set; }
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }

    // 追加するユーザー情報
    public string icon { get; set; } = string.Empty;
    public string nick_name { get; set; } = string.Empty;
}

/// <summary>
/// ユーザの通報情報
    /// </summary>
public class DtoMyReportDetail
{
    // --- 通報データ (t_sys_reports) ---
    public Guid target_user_id { get; set; }
    public long archive_id { get; set; }
    public string? body { get; set; }
    public DateTime create_tim { get; set; }
    public DateTime update_tim { get; set; }

    // --- ターゲットユーザー情報 (AspNetUsers) ---
    public string target_icon { get; set; } = string.Empty;
    public string target_nick_name { get; set; } = string.Empty;

    // --- アーカイブの状態 (t_memo_archive_pub) ---
    public string archive_title { get; set; } = string.Empty;
    public bool is_closed { get; set; } // closed_flg
    public bool is_deleted { get; set; } // del_flg
}

/// <summary>
/// ユーザープロフィールの共通DTO
/// </summary>
public record DtoUserProfile(
    Guid user_id,
    long member_no,
    string? user_category,
    int user_rank,
    string? icon,
    string? nick_name,
    string? description,
    string? link_1, string? link_2, string? link_3,
    bool anonymous_flg, // 追加
    bool is_owner,
    bool is_ban,
    Dictionary<string, ClickCountData> click_stats,
    Dictionary<string, object> info_stats,    
    Dictionary<string, object> info_stats_pub,
    int report_count,
    List<int> view_history 
);

/// <summary>
/// リンククリック統計の1項目分（JSONBの各要素）
/// </summary>
public class ClickCountData
{
    public long t { get; set; } = 0; // total: 総クリック数
    public long u { get; set; } = 0; // user: ログインユーザー
    public long g { get; set; } = 0; // guest: ゲスト
}

/// <summary>
/// クリックキューテーブル (tmp_count_queue) のエンティティ
/// </summary>
public class TCountQueue
{
    public CountTargetType target_type { get; set; }
    public Guid target_user_id { get; set; }
    public int? archive_id { get; set; }
    public long? seq { get; set; }
    public string item_name { get; set; } = string.Empty;
    public Guid? viewer_user_id { get; set; }
    public DateTime create_tim { get; set; }
}

#endregion
