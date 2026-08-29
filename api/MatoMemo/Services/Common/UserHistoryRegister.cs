using LittleTripMemo.Common;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Common;

/// <summary>
/// ユーザーの履歴（t_sys_user_histories）を、DI注入の手間なくどこからでも記録するための静的ゲートウェイ。
/// IHttpContextAccessor を利用して、実行時にリポジトリを動的に取得します。
/// </summary>
public static class UserHistoryRegister
{
    private static IHttpContextAccessor? _accessor;

    /// <summary>
    /// Program.cs で初期化を行い、HttpContext へのアクセスを可能にします。
    /// </summary>
    public static void Configure(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    /// <summary>
    /// 履歴を記録します。
    /// 呼び出し側の利便性のため、操作した管理者の情報は UserContext から自動的に抽出して memo_json にマージします。
    /// </summary>
    /// <param name="history">user_id, action_kind, body, memo_json をセットしたモデル</param>
    public static async Task RegistAsync(TSysUserHistory history, SysUserHistoryRepository? repo = null)
    {
        var context = _accessor?.HttpContext;

        // リポジトリが未指定なら HttpContext から取得を試みる
        repo ??= context?.RequestServices.GetRequiredService<SysUserHistoryRepository>();

        // どちらからもリポジトリが取れない（バッチ等で引数未指定）場合は終了
        if (repo == null) return;

        // UserContext（管理者情報）の取得を試みる
        var userContext = context?.RequestServices.GetService<UserContext>();

        // 管理者による操作の場合、操作者情報を memo_json に自動付与する
        if (userContext != null && userContext.login_user_id != Guid.Empty)
        {
            history.memo_json ??= new Dictionary<string, object>();

            if (!history.memo_json.ContainsKey("admin_id"))
            {
                history.memo_json["admin_id"] = userContext.login_user_id;
                history.memo_json["admin_plan"] = userContext.plan_type;
            }
        }

        // 保存実行
        await repo.InsertAsync(history);
    }

}