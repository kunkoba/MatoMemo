// --- 内部プロセス（プライベート） ---
const _AppCore = {
    settingsKey: "little_trip_settings",
    // ビューポート制御（キーボード対策）とUI初期化を行う
    async setupShell() {
        // ビューポート制御（キーボード対策）
        if (window.visualViewport) {
            const root = document.getElementById('app-root');
            const adjust = () => {
                // 入力中（IME/キーボード表示中）はリサイズ処理をスキップ
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                    return;
                }
                root.style.height = `${window.visualViewport.height}px`;
                window.scrollTo(0, 0);
            };
            window.visualViewport.addEventListener('resize', adjust);
            window.visualViewport.addEventListener('scroll', adjust);
        }
        // UI基盤初期化とテンプレート読込待機
        $UI.Init();
        await new Promise(resolve => {
            const check = () => document.getElementById('tpl-dialog-error') ? resolve() : setTimeout(check, 30);
            check();
        });
    },
    // localStorageの設定復元 → URLパラメータ解析 → DB接続 の順で行う
    async restoreLocal(AppData) {
        // localStorage から設定と ID を復元
        const saved = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
        AppData.Owner.Theme = saved.theme;
        AppData.Owner.MapStyle = $Map.MAP_STYLE[saved.mapStyleKey];
        AppData.Owner.IsMapGrayscale = !!saved.isMapGrayscale;
        AppData.Owner.GpsTrackingSec = saved.gpsTrackingSec ?? 0;
        AppData.Owner.Currency_unit = saved.currency_unit || '円';
        AppData.Owner.FontSize = saved.fontSize || 'standard';
        AppData.Owner.Token = saved.token;
        AppData.Owner.LastLoginDate = saved.lastLoginDate;
        if (saved.loginUserId) {
            AppData.Owner.SystemInfo = { login_user_id: saved.loginUserId };
        }
        // URLパラメータ解析
        const params = new URLSearchParams(location.search);
        const targetId = $Util.DecodeId(params.get("encodedId"));
        const urlMode = params.get("mode");
        AppData.Context.TargetArchiveId = targetId;
        if (urlMode) {
            // モード指定がある場合はそれを優先
            AppData.Context.ScreenMode = urlMode;
        } else {
            // 指定が無い場合はターゲットIDの有無からモードを推定
            AppData.Context.ScreenMode = targetId ? $Const.SCREEN_MODE.ARCHIVE_PUB : $Const.SCREEN_MODE.CREATE;
        }
        // 身分確定後にDB接続
        await $LocalDb.Init();
    },
    // 設定とIDの永続化
    save(Owner) {
        localStorage.setItem(this.settingsKey, JSON.stringify({
            theme: Owner.Theme,
            mapStyleKey: Owner.MapStyle?.key,
            isMapGrayscale: Owner.IsMapGrayscale,
            gpsTrackingSec: Owner.GpsTrackingSec,
            token: Owner.Token,
            currency_unit: Owner.Currency_unit,
            fontSize: Owner.FontSize,
            lastLoginDate: Owner.LastLoginDate,
            loginUserId: Owner.SystemInfo?.login_user_id
        }));
    },
    // オフライン監視・GPS追従・データ同期などのポーリング処理をまとめて登録する
    initPollingTasks() {
        const checkSec = 10;
        const saveDetailSec = $Const.APP_CONFIG.SAVE_DETAIL_SEC;
        const saveReactionSec = $Const.APP_CONFIG.SAVE_REACTION_SEC;
        const activityCheckSec = 300;
        $Polling.Init();
        // オフライン監視
        $Polling.Add($Polling.TASKS.OFFLINE_CHECK, () => {
            const isOn = navigator.onLine;
            $App.AppData.Context.IsOnline = isOn;
            if (isOn) {
                // オンライン復帰時：通知を隠し、各同期タスクを再開
                $Notice.Offline.Hide();
                $Polling.Start($Polling.TASKS.DATA_DETAIL);
                $Polling.Start($Polling.TASKS.DATA_REACTION);
                $Polling.Start($Polling.TASKS.SYNC_ACTIVITY);
            } else {
                // オフライン時：通知を表示し、各同期タスクを停止
                $Notice.Offline.Show();
                $Polling.Stop($Polling.TASKS.DATA_DETAIL);
                $Polling.Stop($Polling.TASKS.DATA_REACTION);
                $Polling.Stop($Polling.TASKS.SYNC_ACTIVITY);
            }
        }, checkSec);
        // GPS追従（初期登録）
        $Polling.Add(
            $Polling.TASKS.GPS_FOLLOW,
            () => $Marker.RefreshCurrentLocation(),
            $App.AppData.Owner.GpsTrackingSec || 60
        );
        // データ同期：地点メモ（詳細情報）
        $Polling.Add($Polling.TASKS.DATA_DETAIL, async () => {
            if (!$App.AppData.Context.IsLoggedIn || await $LocalDb.Detail.GetCount() === 0) {
                return;
            }
            if (await $Data.LocalDb.BulkSendDetails()) {
                await AppManager.RefreshScreen();
                $Notice.Info("同期完了：地点メモ");
            }
        }, saveDetailSec);
        // データ同期：リアクション
        $Polling.Add($Polling.TASKS.DATA_REACTION, async () => {
            if (!$App.AppData.Context.IsLoggedIn) {
                return;
            }
            const unsent = await $LocalDb.Reaction.GetUnsentAll();
            if (unsent?.length > 0 && await $Data.LocalDb.BulkSendReactions()) {
                $Notice.Info("同期完了：リアクション");
            }
        }, saveReactionSec);
        // 最終利用日の同期チェック（未ログイン扱いになっていないか確認）
        $Polling.Add($Polling.TASKS.SYNC_ACTIVITY, async () => {
            if (!await this.syncActivityLog()) {
                $Dialog.ShowLoginDialog();
            }
        }, activityCheckSec);
        $Polling.Start($Polling.TASKS.OFFLINE_CHECK);
    },
    // 最終利用日の同期
    async syncActivityLog() {
        if (!$App.AppData.Context.IsLoggedIn || !navigator.onLine) {
            return true;
        }
        const today = new Date().setHours(0, 0, 0, 0);
        const last = $App.AppData.Owner.LastLoginDate
            ? new Date($App.AppData.Owner.LastLoginDate).setHours(0, 0, 0, 0)
            : 0;
        // 既に当日分を同期済みなら何もしない
        if (today <= last) {
            return true;
        }
        if (await $Data.Access.EnsureLoginUser()) {
            $App.AppData.Owner.LastLoginDate = $Util.FormatDate(today, 'YYYY-MM-DD');
            this.save($App.AppData.Owner);
            return true;
        }
        return false;
    },
    // 法的情報（利用規約・プライバシーポリシー等）の差分更新
    async refreshLegalConfigs() {
        const localData = await $LocalDb.Legal.GetAll();
        // ローカルの最終更新日時を各項目ごとに算出
        const items = Object.values($Const.LEGAL_TYPE).map(key => ({
            key: key,
            last_sync_tim: localData.find(d => d.id === key)?.update_tim || "1900-01-01T00:00:00"
        }));
        if (!await $Data.Access.GetLegalConfigs({ items })) {
            return;
        }
        const results = $Data.resData.results || [];
        let hasUpdate = false;
        for (const res of results) {
            if (res.value !== null) {
                await $LocalDb.Legal.Save(res.key, res.value, res.update_tim, true);
                hasUpdate = true;
            }
        }
        if (hasUpdate) {
            await $Data.LocalDb.CheckLegalUnread();
        }
    },
    // サービスワーカー登録
    registerSW() {
        if (!('serviceWorker' in navigator)) {
            return;
        }
        navigator.serviceWorker
            .register(`./sw.js?v=${$Const.APP_INFO.VERSION}`)
            .catch(e => console.error(e));
    }
};
// --- 公開窓口 ---
const AppManager = {
    // アプリケーション全体の状態を保持するデータストア
    AppData: {
        Context: {
            ScreenMode: $Const.SCREEN_MODE.CREATE,
            IsOnline: navigator.onLine,
            IsLoggedIn: false,
            TargetArchiveId: 0,
            TargetSeq: 0,
            IsMapSwitchOn: true,
        },
        Owner: {
            Plan: "Free",
            Theme: null,
            MapStyle: null,
            GpsTrackingSec: 0,
            Currency_unit: '円',
            FontSize: 'standard',
            LastLoginDate: null,
            SystemInfo: null,
            Token: null
        },
        Admin: {
            Notifications: [],
            ReportSummary: [],
            FeedbackList: [],
            UserMailList: []
        },
        Legal: {
            TermsOfService: null,
            PrivacyPolicy: null,
            License: null
        }
    },
    // アプリ起動時の一連の初期化処理（描画基盤 → ローカル復元 → ログイン確認 → 画面描画 → ポーリング開始 → SW登録）をまとめて実行する
    async Init() {
        try {
            // 描画基盤とローカル設定の復元
            {
                await _AppCore.setupShell();
                await _AppCore.restoreLocal(this.AppData);
                // トークンがあればログイン済みとして扱い、オンラインならサーバと同期
                if (this.AppData.Owner.Token) {
                    this.AppData.Context.IsLoggedIn = true;
                    if (navigator.onLine) {
                        await _AppCore.syncActivityLog();
                        await $Data.Access.GetSystemInfo();
                        _AppCore.save(this.AppData.Owner);
                    }
                }
            }
            // 見た目設定（テーマ・地図スタイル・フォントサイズ）を復元・適用
            {
                this.ChangeTheme(this.AppData.Owner.Theme || $UI.UI_THEME.BLUE);
                this.ChangeMapStyle(this.AppData.Owner.MapStyle || $Map.MAP_STYLE.STANDARD, this.AppData.Owner.IsMapGrayscale);
                this.ChangeFontSize(this.AppData.Owner.FontSize);
                // 画面描画
                await this.RefreshScreen();
            }
            // 定期タスク（ポーリング）の登録・開始
            {
                _AppCore.initPollingTasks();
                if (this.AppData.Owner.GpsTrackingSec > 0 && navigator.onLine) {
                    $Polling.Start($Polling.TASKS.GPS_FOLLOW);
                }
            }
            // 未ログイン・共有リンクでもない・オンラインの場合はログインダイアログを表示
            if (!this.AppData.Context.TargetArchiveId && !this.AppData.Context.IsLoggedIn && navigator.onLine) {
                $Dialog.ShowLoginDialog();
            }
            // その他
            _AppCore.registerSW();
            _AppCore.refreshLegalConfigs();
            $Data.Access.EnsureLoginUser();
        } catch (e) {
            $Err.Handle(e, 'fatal');
        }
    },
    // 現在のスクリーンモードに応じてデータを取得し直し、UI・マーカーを更新する
    async RefreshScreen() {
        $Data.Clear();
        const mode = this.AppData.Context.ScreenMode;
        const aid = this.AppData.Context.TargetArchiveId;
        if (mode === $Const.SCREEN_MODE.CREATE && this.AppData.Context.IsLoggedIn) {
            // 作成モード：未マージの地点メモをサーバ・ローカルDB両方から取得
            await $Data.Access.GetUnMergeDetails({});
            (await $LocalDb.Detail.GetAll()).forEach(d => $Data.Store.UpdateDetail(d));
        } else if (mode === $Const.SCREEN_MODE.ARCHIVE && this.AppData.Context.IsLoggedIn) {
            if (await $Data.Access.GetArchiveDetails({ archive_id: aid })) {
                // 取得成功時にタイトルを反映
                $Bar.ChangeTitle($Data.Store.GetArchive()?.title || "");
            } else {
                this.AppData.Context.ScreenMode = $Const.SCREEN_MODE.CREATE;
            }
        } else if (mode === $Const.SCREEN_MODE.ARCHIVE_PUB && aid) {
            // 公開アーカイブモード：取得成功時はリアクションもローカルDBへ反映
            if (await $Data.Access.GetArchiveDetailsPub({ archive_id: aid })) {
                if (this.AppData.Context.IsLoggedIn) {
                    await $Data.LocalDb.SetReactionsToLocalDb();
                }
                // 取得成功時にタイトルを反映
                $Bar.ChangeTitle($Data.Store.GetArchive()?.title || "");
            } else {
                // ★未ログインならログイン要求
                if (!this.AppData.Context.IsLoggedIn) {
                    $Dialog.ShowLoginDialog();
                    return;
                }
                this.AppData.Context.ScreenMode = $Const.SCREEN_MODE.CREATE;
            }
        } else if (mode === $Const.SCREEN_MODE.SEARCH) {
            $Marker.Clear();
        }
        $UI.ChangeScreenMode();
        $Marker.ChangeScreenMode();
    },
    // サーバ通信エラー処理
    async HandleServerFailure_2(response) {
        $Notice.Loading.Hide();
        // オフラインの場合はその旨だけ通知
        if (!navigator.onLine) {
            $Notice.Warn("オフライン中は機能が制限されます");
            return false;
        }
        // 認証切れ（401）の場合はログアウト状態にしてログインダイアログを表示
        if (response?.status === 401) {
            this.AppData.Context.IsLoggedIn = false;
            this.AppData.Owner.Token = null;
            $Dialog.ShowLoginDialog();
            return false;
        }
        // それ以外のエラー：レスポンス本文からメッセージを取得（失敗時はデフォルト文言）
        let msg = "サーバが稼働していません";
        if (response) {
            try {
                msg = (await response.json()).message || "通信エラー";
            } catch (e) {
                msg = "解析エラー";
            }
        }
        $Notice.Error(msg);
        return false;
    },
    // サーバ通信エラー処理（画面を中断せず通知のみに留める）
    async HandleServerFailure(response) {
        console.warn(">> HandleServerFailure", response?.status);
        $Notice.Loading.Hide();
        // 1. ログインエラー (401) は認証をクリアするのみ
        if (response && response.status === 401) {
            this.AppData.Context.IsLoggedIn = false;
            this.AppData.Owner.Token = null;
            $Notice.Warn("ログインセッションが切れました。再度ログインが必要です。");
            return false;
        }
        // 2. 通信・サーバエラーの判定
        let msg = "サーバへ接続できません。ローカル機能のみ利用可能です。";
        if (response) {
            try {
                const res = await response.json();
                msg = res.message || "サーバでエラーが発生しました。";
            } catch (e) {
                msg = "データの取得に失敗しました。";
            }
        } else if (!navigator.onLine) {
            msg = "オフラインのため通信をスキップしました。";
        }
        // 全てトースト通知で処理し、例外は投げない
        $Notice.Error(msg);
        return false;
    },
    // Google認証でメールアドレスを取得し、Firebase経由でログイン処理を行う
    async ExecuteLoginFlow() {
        return await $Warn.CatchAsync(async () => {
            const email = await $Auth.GetVerifiedEmailByGoogle();
            if (await $Data.Access.LoginFirebase({ Email: email })) {
                this.AppData.Context.IsLoggedIn = true;
                _AppCore.save(this.AppData.Owner);
                return true;
            }
            return false;
        })();
    },
    // Firebaseからサインアウトし、ローカルの認証状態をクリアする
    async Logout() {
        if (firebase.apps.length) {
            await firebase.auth().signOut();
        }
        this.AppData.Context.IsLoggedIn = false;
        this.AppData.Owner.Token = null;
        _AppCore.save(this.AppData.Owner);
    },
// メール認証実行フロー
    async ExecuteEmailAuthFlow(email, password, isSignUp = false) {
        return await $Warn.CatchAsync(async () => {
            if (!email || !password) {
                $Notice.Warn("メールアドレスとパスワードを入力してください");
                return false;
            }
            $Notice.Info(isSignUp ? "処理中..." : "ログイン中...");
            try {
                // 1. Firebase認証実行
                const verifiedEmail = isSignUp 
                    ? await $Auth.SignUpEmail(email, password)
                    : await $Auth.SignInEmail(email, password);
                // 2. 自サーバへログイン通知
                if (verifiedEmail && await $Data.Access.LoginFirebase({ Email: verifiedEmail })) {
                    this.AppData.Context.IsLoggedIn = true;
                    _AppCore.save(this.AppData.Owner);
                    return true;
                }
            } catch (e) {
                // Firebase固有のエラーコードを判定
                let msg = "認証に失敗しました";
                switch (e.code) {
                    case 'auth/email-already-in-use':
                        msg = "このアドレスは登録済みです。Googleログインを試してください。";
                        break;
                    case 'auth/wrong-password':
                        msg = "パスワードが正しくありません。";
                        break;
                    case 'auth/user-not-found':
                        msg = "アカウントが見つかりません。新規登録してください。";
                        break;
                    case 'auth/weak-password':
                        msg = "パスワードが短すぎます（6文字以上必要です）。";
                        break;
                    case 'auth/invalid-email':
                        msg = "メールアドレスの形式が正しくありません。";
                        break;
                    default:
                        msg = `エラー: ${e.message}`;
                }
                $Notice.Error(msg);
            }
            return false;
        })();
    },
    // テーマ変更
    ChangeTheme(theme) {
        this.AppData.Owner.Theme = theme;
        _AppCore.save(this.AppData.Owner);
        $UI.ChangeTheme(theme);
    },
    // 地図スタイル変更（グレースケール表示の切替も含む）
    ChangeMapStyle(style, isGray) {
        this.AppData.Owner.MapStyle = style;
        this.AppData.Owner.IsMapGrayscale = isGray;
        _AppCore.save(this.AppData.Owner);
        $Map.SetMapStyle(style, isGray);
    },
    // GPS追従間隔（秒）の変更。0以下の場合は追従を停止する
    ChangeGpsTracking(sec) {
        this.AppData.Owner.GpsTrackingSec = parseInt(sec || 0);
        $Polling.Stop($Polling.TASKS.GPS_FOLLOW);
        if (this.AppData.Owner.GpsTrackingSec > 0 && navigator.onLine) {
            $Polling.Add(
                $Polling.TASKS.GPS_FOLLOW,
                () => $Marker.RefreshCurrentLocation(),
                this.AppData.Owner.GpsTrackingSec
            );
            $Polling.Start($Polling.TASKS.GPS_FOLLOW);
        }
        _AppCore.save(this.AppData.Owner);
    },
    // 通貨単位の変更
    ChangeCurrency(unit) {
        this.AppData.Owner.Currency_unit = unit;
        _AppCore.save(this.AppData.Owner);
    },
    // フォントサイズの変更
    ChangeFontSize(size) {
        this.AppData.Owner.FontSize = size;
        _AppCore.save(this.AppData.Owner);
        $UI.ChangeFontSize(size);
    },
    // GPS追従を一時停止する
    PauseGpsTracking() {
        $Polling.Stop($Polling.TASKS.GPS_FOLLOW);
    },
    // GPS追従を再開する（設定が有効かつオンライン時のみ）
    ResumeGpsTracking() {
        if (this.AppData.Owner.GpsTrackingSec > 0 && navigator.onLine) {
            $Polling.Start($Polling.TASKS.GPS_FOLLOW);
        }
    }
};
document.addEventListener('DOMContentLoaded', () => AppManager.Init());
export default AppManager;