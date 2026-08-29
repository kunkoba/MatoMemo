using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services.Common;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Admin;

/// <summary>
/// 管理者から特定のユーザーに対して個別通知を送信し、その記録を履歴に残すサービス
/// </summary>
public class SendUserNotificationService(
    UserContext userContext,
    SysUserNotificationRepository sysUserNotificationRepository,
    ITransactionProvider transactionProvider
) : _BaseService(userContext)
{
    public record SendUserNotificationReq(
        [Required] Guid login_user_id,
        Guid target_user_id,
        short kind,
        string body
    ) : ILoginUserRequest;

    public record Response(bool is_success);

    /// <summary>
    /// 個別通知送信処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(SendUserNotificationReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. 実行（通知の作成と履歴の登録をアトミックに行うためトランザクションを開始）
        using var transaction = transactionProvider.BeginTransaction();
        try
        {
            // ① 通知テーブルにメッセージを挿入
            await sysUserNotificationRepository.InsertAsync(new TSysUserNotification
            {
                user_id = req.target_user_id,
                kind = req.kind,
                body = req.body
            });

            // ② ユーザー履歴に登録（「管理者の声」として本文をそのまま保存）
            await UserHistoryRegister.RegistAsync(new TSysUserHistory
            {
                user_id = req.target_user_id,
                action_kind = UserHistoryActionKind.AdminMailSent.ToString(),
                body = req.body,
                memo_json = new Dictionary<string, object> { ["kind"] = req.kind }
            });

            transaction.Commit();
            return new Response(true);
        }
        catch
        {
            throw;
        }
    }

    /// <summary>
    /// 業務バリデーション
    /// </summary>
    private async Task ValidateAsync(SendUserNotificationReq req)
    {
        // 権限チェック
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(_user.plan_type != PlanType.Admin.ToString(), "管理者権限が必要です");

        // 入力チェック
        BusinessException.ThrowIf(req.target_user_id == Guid.Empty, "対象ユーザーIDが不正です");
        BusinessException.ThrowIf(string.IsNullOrWhiteSpace(req.body), "本文は必須です");
        BusinessException.ThrowIf(req.body.Length > 500, "本文が長すぎます（最大500文字）");

        await Task.CompletedTask;
    }

}