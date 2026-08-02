
using LittleTripMemo.Models;

namespace LittleTripMemo.Common;

/// <summary>
/// ユーザー情報を保持するコンテキストクラス
/// </summary>
public class UserContext
{
    public Guid login_user_id { get; set; } = Guid.Empty;
    public int table_id { get; set; } = 0;
    public string plan_type { get; set; } = PlanType.Free.ToString();
    public TAppUser? UpdatedUser { get; set; }  // 更新されたユーザー情報を一時保持

}

