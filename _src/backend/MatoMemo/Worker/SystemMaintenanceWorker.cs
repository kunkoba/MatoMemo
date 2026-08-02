using LittleTripMemo.Common;
using LittleTripMemo.Configs;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Repository.Batch;
using LittleTripMemo.Repository.Core;
using LittleTripMemo.Repository.Sys;
using Microsoft.Extensions.Options;
using Serilog.Context;
using System.Text.Json;

namespace LittleTripMemo.Worker;

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

            if (next.ClickAggregateIntervalMinutes != _prev.ClickAggregateIntervalMinutes)
                changes.Add($"Click: {_prev.ClickAggregateIntervalMinutes} -> {next.ClickAggregateIntervalMinutes}");

            if (next.UserSummaryUpdateIntervalMinutes != _prev.UserSummaryUpdateIntervalMinutes)
                changes.Add($"UserSummary: {_prev.UserSummaryUpdateIntervalMinutes} -> {next.UserSummaryUpdateIntervalMinutes}");

            if (next.ReportStatsUpdateIntervalMinutes != _prev.ReportStatsUpdateIntervalMinutes)
                changes.Add($"ReportStats: {_prev.ReportStatsUpdateIntervalMinutes} -> {next.ReportStatsUpdateIntervalMinutes}");

            if (next.AppInfoUpdateIntervalMinutes != _prev.AppInfoUpdateIntervalMinutes)
                changes.Add($"AppInfo: {_prev.AppInfoUpdateIntervalMinutes} -> {next.AppInfoUpdateIntervalMinutes}");

            if (next.DailyMaintenanceTime != _prev.DailyMaintenanceTime)
                changes.Add($"DailyTime: {_prev.DailyMaintenanceTime} -> {next.DailyMaintenanceTime}");

            if (next.MaxTableNum != _prev.MaxTableNum)
                changes.Add($"MaxTable: {_prev.MaxTableNum} -> {next.MaxTableNum}");

            if (changes.Count > 0)
            {
                //logger.LogInformation("【設定更新検知】\n  " + string.Join("\n  ", changes));
                logger.LogInformation("【設定更新検知】 " + string.Join(" | ", changes));
            }

            _prev = next; // 比較用データを更新
        });
    }

    private DateTime _nextReactionUpdateTime = DateTime.Now.AddMinutes(1);
    private DateTime _nextTableStatsUpdateTime = DateTime.Now.AddMinutes(2);
    private DateTime _nextGarbageCleanupTime = DateTime.Now.AddMinutes(3);
    private DateTime _nextClickAggregateTime = DateTime.Now.AddMinutes(4);
    private DateTime _nextUserSummaryUpdateTime = DateTime.Now.AddMinutes(5);
    private DateTime _nextReportStatsUpdateTime = DateTime.Now.AddMinutes(6);
    private DateTime _nextAppInfoUpdateTime = DateTime.Now.AddMinutes(7);

    private DateTime? _lastMaintenanceDate = null; // 本日の実行済み判定用

    /// <summary>
    /// バッチ処理のメインループ。1分ごとに各タスクをチェックして必要に応じて実行する
    /// </summary>
    /// <param name="stoppingToken"></param>
    /// <returns></returns>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("--- システムメンテナンス・バッチを稼働中 ---");

        while (!stoppingToken.IsCancellationRequested)
        {
            using (LogContext.PushProperty("CorrelationId", Guid.NewGuid().ToString()[..8]))
            {
                // 定期タスクの実行
                {
                    await TaskSyncSystemStatusAsync();  // システムステータスの同期（メンテナンスモードや最小アプリバージョンなど）
                    await TaskUpdateReactionCountsAsync();  // リアクション数の再集計
                    await TaskUpdateTableStatisticsAsync();     // テーブル統計情報の更新（件数や最大IDなど）
                    await TaskGarbageCleanupAsync();    // 論理削除された古いデータの物理削除
                    await TaskAggregateClickQueueAsync();   // クリック・閲覧数集計キューの処理
                    await TaskUpdateUserSummaryStatsAsync();    // ユーザー統計情報の更新（t_app_user_summary の集計）
                    await TaskUpdateReportStatsAsync(); // 通報実績統計の更新（アーカイブ受領数およびユーザー送信数の集計）
                    await TaskUpdateAppInfoStatsAsync();    // アプリ全体統計の更新（ユーザー数・アーカイブ数・明細数など）
                }

                // 日次タスクの実行
                {
                    await TaskDailyMaintenanceAsync();  // DBメンテ
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
            logger.LogInformation("【{TaskName}】を完了しました。", taskName);
        }
        catch (Exception exception)
        {
            logger.LogError("【{TaskName}失敗】{Type}: {Message}", taskName, exception.GetType().Name, exception.Message);
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
                        logger.LogWarning("集計スキップ: t_memo_detail_{i} が存在しません。", i);
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
                await repository.DeleteOldGarbagePublicAsync();
            });
            _nextGarbageCleanupTime = DateTime.Now.AddMinutes(settings.GarbageCleanupIntervalMinutes);
        }
    }

    /// <summary>
    /// クリック・閲覧数集計キュー（tmp_count_queue）を処理し、各テーブルの統計情報を更新するタスク
    /// </summary>
    private async Task TaskAggregateClickQueueAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        if (settings.ClickAggregateIntervalMinutes <= 0) return;

        if (DateTime.Now >= _nextClickAggregateTime)
        {
            await RunWithScopeAsync("統計データ集計", async (scope) =>
            {
                var repository = scope.ServiceProvider.GetRequiredService<CountQueueTaskRepository>();

                // 1. キューテーブルから未処理の生データを全件取得
                var queueItems = await repository.GetQueueAllAsync();
                if (!queueItems.Any()) return;

                DateTime lastProcessedTime = DateTime.MinValue;

                // 2. ターゲット（更新対象の行）ごとにグループ化
                var targetGroups = queueItems.GroupBy(queue => new {
                    TargetType = (int)queue.target_type,
                    UserId = (Guid?)queue.target_user_id,
                    ArchiveId = (int?)queue.archive_id,
                    Seq = (long?)queue.seq
                });

                foreach (var targetGroup in targetGroups)
                {
                    // 3. 現在の統計 JSONB を対象テーブルから取得
                    var currentJson = await repository.GetCurrentStatsJsonAsync(
                        targetGroup.Key.TargetType,
                        targetGroup.Key.UserId,
                        targetGroup.Key.ArchiveId,
                        targetGroup.Key.Seq
                    );

                    // JSON を Dictionary にデシリアライズ（存在しなければ新規作成）
                    var statsMap = string.IsNullOrEmpty(currentJson)
                        ? new Dictionary<string, ClickCountData>()
                        : JsonSerializer.Deserialize<Dictionary<string, ClickCountData>>(currentJson) ?? new();

                    // 4. アイテム（イベント名）ごとに集計
                    var itemGroups = targetGroup.GroupBy(item => (string)item.item_name);
                    foreach (var itemGroup in itemGroups)
                    {
                        string key = itemGroup.Key;

                        if (!statsMap.ContainsKey(key))
                        {
                            statsMap[key] = new ClickCountData();
                        }

                        var stats = statsMap[key];
                        // 総クリック/閲覧数
                        stats.t += itemGroup.Count();
                        // ユニークユーザー数（ログイン済みの viewer_user_id があるもののみ重複排除して加算）
                        stats.u += itemGroup.Where(x => x.viewer_user_id != null).Select(x => (Guid)x.viewer_user_id!).Distinct().Count();
                        // ゲスト閲覧数
                        stats.g += itemGroup.Count(x => x.viewer_user_id == null);
                    }

                    // 5. 計算後の JSON を DB へ書き戻し
                    await repository.UpdateStatsJsonAsync(
                        targetGroup.Key.TargetType,
                        targetGroup.Key.UserId,
                        targetGroup.Key.ArchiveId,
                        targetGroup.Key.Seq,
                        JsonSerializer.Serialize(statsMap)
                    );

                    // 処理したデータの最大時刻を保持
                    var maxTimeInGroup = targetGroup.Max(x => (DateTime)x.create_tim);
                    if (maxTimeInGroup > lastProcessedTime) lastProcessedTime = maxTimeInGroup;
                }

                // 6. 今回処理した時刻までのキューを削除（物理削除）
                if (lastProcessedTime > DateTime.MinValue)
                {
                    await repository.DeleteProcessedQueueAsync(lastProcessedTime);
                }
            });

            _nextClickAggregateTime = DateTime.Now.AddMinutes(settings.ClickAggregateIntervalMinutes);
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
                        logger.LogWarning("ユーザー統計スキップ: t_memo_detail_{i} が存在しません。", i);
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
    /// 設定された時刻に、日次のデータベース物理メンテナンスを実行する
    /// </summary>
    private async Task TaskDailyMaintenanceAsync()
    {
        var settings = optionsMonitor.CurrentValue;
        var now = DateTime.Now;

        if (now.ToString("HH:mm") == settings.DailyMaintenanceTime && _lastMaintenanceDate != now.Date)
        {
            _lastMaintenanceDate = now.Date;
            // 結果を無視する（破棄する）
            // 実行を別スレッドに放り投げる。ループは即座に「1分待ち」へ進む
            _ = Task.Run(async () => {
                await RunWithScopeAsync("日次DB物理メンテナンス", async (scope) => {
                    var repository = scope.ServiceProvider.GetRequiredService<TableStatisticsTaskRepository>();
                    await repository.ExecuteDbMaintenanceAsync();
                });
            }).ContinueWith(t => {
                if (t.IsFaulted) logger.LogError("【日次メンテナンス致命的失敗】{ex}", t.Exception);
            });
        }
    }

    #endregion

}