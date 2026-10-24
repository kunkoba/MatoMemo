using MatoMemo.Common;
using MatoMemo.Configs;
using MatoMemo.Models;
using MatoMemo.Repository.App;
using MatoMemo.Repository.Batch;
using MatoMemo.Repository.Core;
using MatoMemo.Repository.Sys;
using Microsoft.Extensions.Options;
using Serilog.Context;
using System.Text.Json;

namespace MatoMemo.Worker;

/// <summary>
/// 統計集計やゴミ掃除など、定期的なシステムメンテナンス処理を実行するバックグラウンドサービス
/// </summary>
public class SystemMaintenanceWorker : BackgroundService
{
    private readonly ILogger<SystemMaintenanceWorker> logger;
    private readonly IServiceScopeFactory serviceScopeFactory;
    private readonly IOptionsMonitor<MyAppSettings> optionsMonitor;
    private readonly SystemStatus systemStatus;

    private MyAppSettings _prev; // 前回の設定値を保持する変数

    private DateTime? _lastClickAggregateDate = null; // 本日の実行済み判定用

    public SystemMaintenanceWorker(
        ILogger<SystemMaintenanceWorker> logger,
        IServiceScopeFactory serviceScopeFactory,
        IOptionsMonitor<MyAppSettings> optionsMonitor,
        SystemStatus systemStatus
    )
    {
        this.logger = logger;
        this.serviceScopeFactory = serviceScopeFactory;
        this.optionsMonitor = optionsMonitor;
        this.systemStatus = systemStatus;

        // 初回の値を保存
        this._prev = optionsMonitor.CurrentValue;

        // ★ 設定変更を監視し、差分がある項目だけログに出す
        this.optionsMonitor.OnChange(next =>
        {
            var changes = new List<string>();

            if (next.TableStatsUpdateIntervalMinutes != _prev.TableStatsUpdateIntervalMinutes)
                changes.Add($"TableStats: {_prev.TableStatsUpdateIntervalMinutes} -> {next.TableStatsUpdateIntervalMinutes}");

            if (next.ReactionCountUpdateIntervalMinutes != _prev.ReactionCountUpdateIntervalMinutes)
                changes.Add($"Reaction: {_prev.ReactionCountUpdateIntervalMinutes} -> {next.ReactionCountUpdateIntervalMinutes}");

            if (next.GarbageCleanupIntervalMinutes != _prev.GarbageCleanupIntervalMinutes)
                changes.Add($"Garbage: {_prev.GarbageCleanupIntervalMinutes} -> {next.GarbageCleanupIntervalMinutes}");

            if (next.ClickAggregateMinutes != _prev.ClickAggregateMinutes)
                changes.Add($"Click: {_prev.ClickAggregateMinutes} -> {next.ClickAggregateMinutes}");

            if (next.UserSummaryUpdateIntervalMinutes != _prev.UserSummaryUpdateIntervalMinutes)
                changes.Add($"UserSummary: {_prev.UserSummaryUpdateIntervalMinutes} -> {next.UserSummaryUpdateIntervalMinutes}");

            if (next.ReportStatsUpdateIntervalMinutes != _prev.ReportStatsUpdateIntervalMinutes)
                changes.Add($"ReportStats: {_prev.ReportStatsUpdateIntervalMinutes} -> {next.ReportStatsUpdateIntervalMinutes}");

            if (next.AppInfoUpdateIntervalMinutes != _prev.AppInfoUpdateIntervalMinutes)
                changes.Add($"AppInfo: {_prev.AppInfoUpdateIntervalMinutes} -> {next.AppInfoUpdateIntervalMinutes}");

            if (next.MaxTableNum != _prev.MaxTableNum)
                changes.Add($"MaxTable: {_prev.MaxTableNum} -> {next.MaxTableNum}");

            if (changes.Count > 0)
            {
                //logger.LogInformation("【設定更新検知】\n  " + string.Join("\n  ", changes));
                logger.Log(AppLogger.Kind.ConfigLoaded, string.Join(" | ", changes));
            }

            _prev = next; // 比較用データを更新
        });
    }

    private DateTime _nextReactionUpdateTime = DateTime.Now.AddMinutes(1);
    private DateTime _nextTableStatsUpdateTime = DateTime.Now.AddMinutes(2);
    private DateTime _nextGarbageCleanupTime = DateTime.Now.AddMinutes(3);
    private DateTime _nextUserSummaryUpdateTime = DateTime.Now.AddMinutes(5);
    private DateTime _nextReportStatsUpdateTime = DateTime.Now.AddMinutes(6);
    private DateTime _nextAppInfoUpdateTime = DateTime.Now.AddMinutes(7);

    /// <summary>
    /// バッチ処理のメインループ。1分ごとに各タスクをチェックして必要に応じて実行する
    /// </summary>
    /// <param name="stoppingToken"></param>
    /// <returns></returns>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.Log(AppLogger.Kind.Info, "--- システムメンテナンス・バッチを稼働中 ---");

        while (!stoppingToken.IsCancellationRequested)
        {
            using (LogContext.PushProperty("CorrelationId", Guid.NewGuid().ToString()[..8]))
            {
                // 定期タスクの実行
                { 
                    await TaskSyncSystemStatusAsync();          // システムステータスの同期（メンテナンスモードや最小アプリバージョンなど）
                    await TaskUpdateReactionCountsAsync();      // リアクション数の再集計
                    await TaskUpdateTableStatisticsAsync();     // テーブル統計情報の更新（件数や最大IDなど）
                    await TaskGarbageCleanupAsync();            // 論理削除された古いデータの物理削除
                    await TaskUpdateUserSummaryStatsAsync();    // ユーザー統計情報の更新（t_app_user_summary の集計）
                    await TaskUpdateReportStatsAsync();         // 通報実績統計の更新（アーカイブ受領数およびユーザー送信数の集計）
                    await TaskUpdateAppInfoStatsAsync();        // アプリ全体統計の更新（ユーザー数・アーカイブ数・明細数など）
                }

                // 日次タスクの実行
                { 
                    await TaskAggregateClickQueueAsync();       // クリック・閲覧数集計キューの処理（日次）
                }
            }

            // 1分間隔でチェック
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    /// <summary>
    /// 実行するタスクをスコープ付きでラップし、ログ出力と例外処理を行う
    /// </summary>
    /// <param name="taskName"></param>
    /// <param name="action"></param>
    /// <returns></returns>
    private async Task RunWithScopeAsync(string taskName, Func<IServiceScope, Task> action)
    {
        try
        {
            //logger.LogInformation("【{TaskName}】を開始します...", taskName);
            using (var scope = serviceScopeFactory.CreateScope())
            {
                await action(scope);
            }
            logger.Log(AppLogger.Kind.TaskCompleted, taskName);
        }
        catch (Exception exception)
        {
            logger.Log(AppLogger.Kind.Error, $"【{taskName}失敗】{exception.GetType().Name}: {exception.Message}", exception);
        }
    }

    #region "定期タスク"

    /// <summary>
    /// システムステータス（メンテナンスモードや最小アプリバージョンなど）を DB から取得して同期するタスク
    /// </summary>
    /// <returns></returns>
    private async Task TaskSyncSystemStatusAsync()
    {
        await RunWithScopeAsync("システムステータス同期", async (scope) =>
        {
            var configRepository = scope.ServiceProvider.GetRequiredService<CoreConfigRepository>();
            var configs = await configRepository.GetConfigsByCategoryAsync("SYSTEM");
            foreach (var config in configs)
            {
                string key = config.key;
                string value = config.value;
                switch (key)
                {
                    case "MaintenanceMode": systemStatus.IsMaintenanceMode = (value.ToLower() == "true"); break;
                    case "MaintenanceMsg": systemStatus.MaintenanceMessage = value; break;
                    case "MinAppVersion": systemStatus.MinAppVersion = value; break;
                    case "LatestAppVersion": systemStatus.LatestAppVersion = value; break;
                }
            }
        });
    }

    /// <summary>
    /// リアクション数の再集計を行うタスク（tmp_reaction_count_queue を処理して、各テーブルの reaction_counts を更新する）
    /// </summary>
    /// <returns></returns>
    private async Task TaskUpdateReactionCountsAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        if (settings.ReactionCountUpdateIntervalMinutes > 0 && DateTime.Now >= _nextReactionUpdateTime)
        {
            await RunWithScopeAsync("リアクション再集計", async (scope) =>
            {
                var repository = scope.ServiceProvider.GetRequiredService<DetailPubRepository>();
                await repository.UpdateAllReactionCountsAsync();
            });
            _nextReactionUpdateTime = DateTime.Now.AddMinutes(settings.ReactionCountUpdateIntervalMinutes);
        }
    }

    /// <summary>
    /// テーブル統計情報（各テーブルの件数や最大IDなど）を更新するタスク
    /// </summary>
    /// <returns></returns>
    private async Task TaskUpdateTableStatisticsAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        if (settings.TableStatsUpdateIntervalMinutes > 0 && DateTime.Now >= _nextTableStatsUpdateTime)
        {
            await RunWithScopeAsync("テーブル統計集計", async (scope) =>
            {
                var repository = scope.ServiceProvider.GetRequiredService<TableStatisticsTaskRepository>();
                for (int i = 1; i <= settings.MaxTableNum; i++)
                {
                    // ★存在確認ガード
                    if (await repository.TableExistsAsync(i))
                    {
                        await repository.SyncStatisticsAsync(i);
                    }
                    else
                    {
                        logger.Log(AppLogger.Kind.Warning, $"集計スキップ: t_memo_detail_{i} が存在しません。");
                    }
                }
            });
            _nextTableStatsUpdateTime = DateTime.Now.AddMinutes(settings.TableStatsUpdateIntervalMinutes);
        }
    }

    /// <summary>
    /// 論理削除された古いデータを物理削除するタスク
    /// </summary>
    /// <returns></returns>
    private async Task TaskGarbageCleanupAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        if (settings.GarbageCleanupIntervalMinutes > 0 && DateTime.Now >= _nextGarbageCleanupTime)
        {
            await RunWithScopeAsync("論理削除データの物理削除", async (scope) =>
            {
                var repository = scope.ServiceProvider.GetRequiredService<TableStatisticsTaskRepository>();

                // 1. 公開側
                await repository.DeleteOldGarbagePublicAsync();

                // 2. 私用明細側（1〜MaxTableNumまでループ）
                for (int tableId = 1; tableId <= settings.MaxTableNum; tableId++)
                {
                    if (await repository.TableExistsAsync(tableId))
                    {
                        await repository.DeleteOldGarbageDetailsAsync(tableId);
                    }
                }
            });
            _nextGarbageCleanupTime = DateTime.Now.AddMinutes(settings.GarbageCleanupIntervalMinutes);
        }
    }

    /// <summary>
    /// ユーザー別活動統計（件数・金額等）の再集計を行うタスク
    /// </summary>
    private async Task TaskUpdateUserSummaryStatsAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        var now = DateTime.Now;

        // 設定値が 0 以下の場合は実行しない
        if (settings.UserSummaryUpdateIntervalMinutes <= 0) return;

        // 実行予定時刻に達しているか確認
        if (now >= _nextUserSummaryUpdateTime)
        {
            await RunWithScopeAsync("ユーザー活動統計集計", async (scope) =>
            {
                var repository = scope.ServiceProvider.GetRequiredService<TableStatisticsTaskRepository>();

                // ① 秘密側（分散テーブルごと）の集計を実行
                for (int i = 1; i <= settings.MaxTableNum; i++)
                {
                    // ★存在確認ガード
                    if (await repository.TableExistsAsync(i))
                    {
                        await repository.SyncUserPrivateStatsAsync(i);
                    }
                    else
                    {
                        logger.Log(AppLogger.Kind.Warning, $"ユーザー統計スキップ: t_memo_detail_{i} が存在しません。");
                    }
                }

                // ② 公開側の集計を実行（全ユーザー一括）
                await repository.SyncUserPublicStatsAsync();
            });

            // 次回の実行予定時刻を更新
            _nextUserSummaryUpdateTime = now.AddMinutes(settings.UserSummaryUpdateIntervalMinutes);
        }
    }

    /// <summary>
    /// 通報実績（アーカイブ受領数およびユーザー送信数）の再集計を行うタスク
    /// </summary>
    private async Task TaskUpdateReportStatsAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        var now = DateTime.Now;

        // 設定値が 0 以下の場合は実行しない
        if (settings.ReportStatsUpdateIntervalMinutes <= 0) return;

        // 実行予定時刻に達しているか確認
        if (now >= _nextReportStatsUpdateTime)
        {
            await RunWithScopeAsync("通報実績統計集約", async (scope) =>
            {
                var repository = scope.ServiceProvider.GetRequiredService<TableStatisticsTaskRepository>();

                // ① アーカイブ側の受領通報数を更新
                await repository.SyncArchiveReportStatsAsync();

                // ② ユーザー側の送信通報数を更新
                await repository.SyncUserReportStatsAsync();
            });

            // 次回の実行予定時刻を更新
            _nextReportStatsUpdateTime = now.AddMinutes(settings.ReportStatsUpdateIntervalMinutes);
        }
    }

    /// <summary>
    /// アプリ全体統計（ユーザー数・アーカイブ数・明細数など）の再集計を行うタスク
    /// </summary>
    /// <returns></returns>
    private async Task TaskUpdateAppInfoStatsAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        if (settings.AppInfoUpdateIntervalMinutes > 0 && DateTime.Now >= _nextAppInfoUpdateTime)
        {
            await RunWithScopeAsync("アプリ全体統計集計", async (scope) =>
            {
                var repository = scope.ServiceProvider.GetRequiredService<AppInfoRepository>();
                await repository.SyncAppInfoAsync();
            });
            _nextAppInfoUpdateTime = DateTime.Now.AddMinutes(settings.AppInfoUpdateIntervalMinutes);
        }
    }

    #endregion

    #region "日次タスク"

    /// <summary>
    /// （日次）クリック集計キューの処理を行うタスク。tmp_click_queue の集計結果を t_memo_archive_pub の click_count に反映する
    /// </summary>
    /// <returns></returns>
    private async Task TaskAggregateClickQueueAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        var now = DateTime.Now;

        // 設定値が 0 以下の場合は実行しない
        if (settings.ClickAggregateMinutes <= 0) return;

        // 本日実行済みならスキップ（00:00でリセットされるフラグ管理）
        var today = now.Date;
        if (_lastClickAggregateDate == today) return;

        // 実行予定時刻（00:00 + ClickAggregateMinutes）に達しているか確認
        var scheduled = today.AddMinutes(settings.ClickAggregateMinutes);
        if (now < scheduled) return;

        _lastClickAggregateDate = today;

        await RunWithScopeAsync("統計データ集計", async (scope) =>
        {
            var repository = scope.ServiceProvider.GetRequiredService<CountQueueTaskRepository>();

            // 従来はC#側でキューを全件取得→グループ化→JSON更新していたが、
            // パフォーマンスと二重管理防止のためDB側のストアドプロシージャに移譲する。
            // 検証(Supabase) / 本番(Neon) 共通で同じプロシージャを呼び出す。
            // 定期実行管理・ログ管理は本Workerの RunWithScopeAsync に一元化する。
            await repository.ExecuteClickStatsProcedureAsync();
        });
    }

    #endregion
}