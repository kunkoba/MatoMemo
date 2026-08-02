// 定期実行の管理（実処理）
const _PollingCore = {
    _tasks: {}, // 登録されたタスク
    _timers: {}, // 稼働中のタイマー
    init(){
        //
    },
    // タスクの登録
    add(name, fn, ms) {
        this._tasks[name] = { fn, ms };
    },
    // タスクの開始
    start(name) {
        if (this._timers[name]) return;
        const task = this._tasks[name];
        if (!task) return;
        task.fn(); // 初回実行
        this._timers[name] = setInterval(() => task.fn(), task.ms);
    },
    // タスクの停止
    stop(name) {
        if (!this._timers[name]) return;
        clearInterval(this._timers[name]);
        delete this._timers[name];
    },
};

// 窓口
const PollingManager = {
    // タスク名定数（管理用）
    TASKS: {
        GPS_FOLLOW: "GPS_FOLLOW_TRACKING",
        OFFLINE_CHECK: "network_check",
        DATA_DETAIL: "data_detail",
        DATA_REACTION: "data_reaction",
        SYNC_ACTIVITY: "sync_activity", // ログインチェック
    },
    // 初期化
    Init(){
        _PollingCore.init();
    },
    // タスクを追加（秒で指定）
    Add(name, fn, s) { _PollingCore.add(name, fn, s * 1000); },
    // 実行開始
    Start(name) { _PollingCore.start(name); },
    // 実行停止
    Stop(name) { _PollingCore.stop(name); },
};
export default PollingManager;
