using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;

namespace LittleTripMemo.Common;

/// <summary>
/// 全リクエストの入力モデル（ILoginUserRequest実装クラス）と
/// 現在のログインユーザーID（UserContext）の整合性を検証するフィルター
/// </summary>
public class UserValidationFilter(UserContext userContext) : IActionFilter
{
    /// <summary>
    /// アクション実行前の処理
    /// </summary>
    public void OnActionExecuting(ActionExecutingContext context)
    {
        // 1. 全リクエストの引数をチェック
        foreach (var argument in context.ActionArguments.Values)
        {
            // 2. もし引数が ILoginUserRequest を実装していたら自動チェック発動
            if (argument is ILoginUserRequest request)
            {
                // サーバー側のJWT情報（userContext.login_user_id）とリクエスト内のIDを比較
                if (userContext.login_user_id != Guid.Empty && userContext.login_user_id != request.login_user_id)
                {
                    // IDが不一致の場合はビジネス例外をスロー（共通例外ハンドリングへ）
                    throw new BusinessException("不正なリクエストです。ログインユーザーが一致しません。");
                }
            }
        }
    }

    /// <summary>
    /// アクション実行後の処理
    /// </summary>
    public void OnActionExecuted(ActionExecutedContext context)
    {
        // 実行後の処理は不要
    }

}