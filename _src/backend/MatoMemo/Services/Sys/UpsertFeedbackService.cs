using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services.Common;

namespace LittleTripMemo.Services.Sys;

/// <summary>
/// ユーザーからのフィードバック登録および履歴への保存を担当するサービス
/// </summary>
public class UpsertFeedbackService(
    UserContext userContext,
    SysFeedbackRepository sysFeedbackRepository,
    SysUserNotificationRepository sysUserNotificationRepository,
    ITransactionProvider transactionProvider
) : _BaseService(userContext)
{
    public record UpsertFeedbackReq(Guid login_user_id, string? body, int score) : ILoginUserRequest;

    public record Response(TSysFeedback? feedback);

    /// <summary>
    /// フィードバック処理を実行する
    /// </summary>
    public async Task<Response> ExecuteAsync(UpsertFeedbackReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. 実行（一括処理のためトランザクションを開始）
        using var transaction = transactionProvider.BeginTransaction();
        try
        {
            // 初回投稿かどうかを確認（通知送信用）
            var existingFeedback = await sysFeedbackRepository.GetMyFeedbacksAsync();
            bool isFirstTime = (existingFeedback == null);

            // ① フィードバックテーブルを更新（最新の1件のみ保持）
            await sysFeedbackRepository.UpsertAsync(new TSysFeedback
            {
                user_id = _user.login_user_id,
                body = req.body,
                score = req.score
            });

            // ② ユーザー履歴に登録（「消えない過去ログ」として蓄積）
            // body にはユーザーの生の声をセットする
            await UserHistoryRegister.RegistAsync(new TSysUserHistory
            {
                user_id = _user.login_user_id,
                action_kind = UserHistoryActionKind.Feedback.ToString(),
                body = req.body,
                memo_json = new Dictionary<string, object> { ["score"] = req.score }
            });

            // ③ 初回登録時のみ、サンクスメッセージを個別通知に送る
            if (isFirstTime)
            {
                await sysUserNotificationRepository.InsertAsync(new TSysUserNotification
                {
                    user_id = _user.login_user_id,
                    kind = (short)UserNotificationKind.Info,
                    body = "フィードバックありがとうございます！\nいただいた内容はアプリの改善に役立てさせていただきます。今後ともよろしくお願いいたします。🌻",
                });
            }

            transaction.Commit();

            // 最新のフィードバック情報を取得して返却
            var updatedFeedback = await sysFeedbackRepository.GetMyFeedbacksAsync();
            return new Response(updatedFeedback);
        }
        catch
        {
            // ロールバックは provider の Dispose で自動実行されるが、例外は再送出する
            throw;
        }
    }

    /// <summary>
    /// 業務バリデーション（作法に準拠）
    /// </summary>
    private async Task ValidateAsync(UpsertFeedbackReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.score < 1 || req.score > 5, "スコアは1~5の間で指定してください");

        await Task.CompletedTask;
    }

}