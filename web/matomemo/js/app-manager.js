// --- 内部プロセス（プライベート） ---
const _AppCore = {
    settingsKey: "matomemo_settings",
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
    // localStorageの設定復元（認証情報は復元しない版）
    async restoreLocal(AppData) {
        const raw = localStorage.getItem(this.settingsKey);
        if (raw && raw.includes('loginUserId')) {
            // 旧形式なら一度全削除
            localStorage.removeItem(this.settingsKey);
        }
        const saved = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
        AppData.Owner.Theme = saved.theme;
        AppData.Owner.MapStyle = $Map.MAP_STYLE[saved.mapStyleKey];
        AppData.Owner.IsMapGrayscale = !!saved.isMapGrayscale;
        AppData.Owner.GpsTrackingSec = saved.gpsTrackingSec ?? 0;
        AppData.Owner.Currency_unit = saved.currency_unit || '円';
        AppData.Owner.FontSize = saved.fontSize || 'standard';
        AppData.Owner.LastLoginDate = saved.lastLoginDate;
        AppData.Owner.SoundVolume = saved.soundVolume ?? 0.5;
        // loginUserId と ownerProfile はここでは復元しない
        // Cの確認が終わるまで Guest にしておく
        AppData.Owner.LoginUserId = null;
        AppData.Owner.SystemInfo = null;
        const params = new URLSearchParams(location.search);
        const targetId = $Util.DecodeId(params.get("encodedId"));
        const urlMode = params.get("mode");
        AppData.Context.TargetArchiveId = targetId;
        if (urlMode) {
            AppData.Context.ScreenMode = urlMode;
        } else {
            AppData.Context.ScreenMode = targetId ? $Const.SCREEN_MODE.ARCHIVE_PUB : $Const.SCREEN_MODE.CREATE;
        }
        await $LocalDb.Init();
        const legalData = await $LocalDb.Legal.GetAll();
        legalData.forEach(d => {
            if (AppData.Legal.hasOwnProperty(d.id)) {
                AppData.Legal[d.id] = d;
            }
        });
        await $Data.LocalDb.CheckLegalUnread();
    },
    // 設定とIDの永続化（認証情報は保存しない - 二重管理を物理的に消す）
    save(Owner) {
        localStorage.setItem(this.settingsKey, JSON.stringify({
            theme: Owner.Theme,
            mapStyleKey: Owner.MapStyle?.key,
            isMapGrayscale: Owner.IsMapGrayscale,
            gpsTrackingSec: Owner.GpsTrackingSec,
            currency_unit: Owner.Currency_unit,
            fontSize: Owner.FontSize,
            lastLoginDate: Owner.LastLoginDate,
            soundVolume: Owner.SoundVolume
            // loginUserId と ownerProfile は保存しない
        }));
    },
    // ポーリング登録（ログイン要求を出さない版）
    initPollingTasks() {
        const checkSec = 1;
        const saveDetailSec = $Const.APP_CONFIG.SAVE_DETAIL_SEC;
        const saveReactionSec = $Const.APP_CONFIG.SAVE_REACTION_SEC;
        const activityCheckSec = 300;
        $Polling.Init();
        $Polling.Add($Polling.TASKS.OFFLINE_CHECK, () => {
            const isNowNetOnline = navigator.onLine;
            if ($App.AppData.Context.IsNetOnline && !isNowNetOnline) {
                $App.AppData.Context.IsNetOnline = false;
                $App.AppData.Context.IsServerOnline = false;
                $Notice.Offline.Show("インターネットに接続できません");
            } else if (!$App.AppData.Context.IsNetOnline && isNowNetOnline) {
                $App.AppData.Context.IsNetOnline = true;
            }
        }, checkSec);
        $Polling.Add($Polling.TASKS.GPS_FOLLOW, () => $Marker.RefreshCurrentLocation(), $App.AppData.Owner.GpsTrackingSec || 60);
        $Polling.Add($Polling.TASKS.DATA_DETAIL, async () => {
            if (!$App.AppData.Context.IsLoggedIn || await $LocalDb.Detail.GetCount() === 0) {
                return;
            }
            if (await $Data.LocalDb.BulkSendDetails()) {
                await AppManager.RefreshScreen();
                $Notice.Info("同期完了：地点メモ");
            }
        }, saveDetailSec);
        $Polling.Add($Polling.TASKS.DATA_REACTION, async () => {
            if (!$App.AppData.Context.IsLoggedIn) {
                return;
            }
            const unsent = await $LocalDb.Reaction.GetUnsentAll();
            if (unsent?.length > 0 && await $Data.LocalDb.BulkSendReactions()) {
                $Notice.Info("同期完了：リアクション");
            }
        }, saveReactionSec);
        // 最終利用日の同期チェック（ログイン要求は出さない - 画面遷移時のみ判定）
        $Polling.Add($Polling.TASKS.SYNC_ACTIVITY, async () => {
            await this.syncActivityLog();
            // ここでShowLoginDialogは呼ばない
        }, activityCheckSec);
        $Polling.Start($Polling.TASKS.OFFLINE_CHECK);
    },
    // 最終利用日の同期およびサーバ復帰確認
    async syncActivityLog() {
        if (!navigator.onLine) return false;
        // 常にEnsureを呼ぶ。CookieがあればC=true、なければC=falseが返る
        const isLoggedIn = await $Data.Access.EnsureLoginUser();
        if (isLoggedIn) {
            $App.AppData.Context.IsServerOnline = true;
            $Notice.Offline.Hide();
            const today = new Date().setHours(0, 0, 0, 0);
            $App.AppData.Owner.LastLoginDate = $Util.FormatDate(today, 'YYYY-MM-DD');
            // LastLoginDateだけ保存（認証は保存しない）
            this.save($App.AppData.Owner);
            return true;
        } else {
            // isLoggedIn=falseでも通信自体は成功してる可能性があるので、IsNetOnlineで区別
            // Ensure内で401ならHandleServerFailureがIsLoggedInをfalseにしてる
            if ($App.AppData.Context.IsLoggedIn === false) {
                // C=false確定なのでサーバーは生きてる
                $App.AppData.Context.IsServerOnline = true;
                $Notice.Offline.Hide();
                return true; // サーバーは生きてるのでtrueを返す（ログイン要求は出さない）
            }
            if (!navigator.onLine) {
                $App.AppData.Context.IsNetOnline = false;
                $App.AppData.Context.IsServerOnline = false;
                $Notice.Offline.Show("インターネットに接続できません");
                return false;
            }
            $App.AppData.Context.IsServerOnline = false;
            $Notice.Offline.Show("サーバーに接続できません");
            return false;
        }
    },
    // 法的情報（利用規約・プライバシーポリシー等）の差分更新
    async refreshLegalConfigs() {
        const localData = await $LocalDb.Legal.GetAll(); // DBから全件取得
        // サーバー通信用の差分リスト作成
        const items = Object.values($Const.LEGAL_TYPE).map(key => ({
            key: key, // 規約の識別キー
            last_sync_tim: localData.find(d => d.id === key)?.update_tim || "1900-01-01T00:00:00"
        }));
        // サーバーに最新情報を問い合わせ
        if (!await $Data.Access.GetLegalConfigs({ items })) {
            return; // 失敗時は現在のメモリデータで続行
        }
        const results = $Data.resData.results || []; // サーバーからの返却リスト
        let hasUpdate = false; // 更新有無フラグ
        for (const res of results) { // 受信データをループ
            if (res.value !== null) { // 内容が更新されている場合
                // 1. 物理保存（IndexedDB）
                await $LocalDb.Legal.Save(res.key, res.value, res.update_tim, true);
                // 2. メモリ反映（実行中の AppData）
                const newRecord = { 
                    id: res.key, 
                    body: res.value, 
                    update_tim: res.update_tim, 
                    is_unread: true 
                };
                if (AppManager.AppData.Legal.hasOwnProperty(res.key)) {
                    AppManager.AppData.Legal[res.key] = newRecord; // オブジェクト更新
                }
                hasUpdate = true; // フラグオン
            }
        }
        // 更新があった場合のみ未読バッジを再計算
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
    },
    // ユーザ情報の整合性チェック（旧localStorageは一切見ない版）
    ensureUserInfo(AppData) {
        if (!AppData.Context.IsLoggedIn) {
            AppData.Owner.SystemInfo = {
                login_user_id: 'anonymous',
                ownerProfile: {
                    nick_name: 'Guest',
                    icon: '👤'
                }
            };
            $Data.Store.Restore();
            $Bar.UpdateUserIcon();
            return;
        }
        // ログイン中は SystemInfo が既に _setData で入ってるはず
        // 無ければ Guest に倒すだけで、localStorageは見ない
        if (!AppData.Owner.SystemInfo || !AppData.Owner.SystemInfo.ownerProfile) {
            AppData.Owner.SystemInfo = {
                login_user_id: 'anonymous',
                ownerProfile: {
                    nick_name: 'Guest',
                    icon: '👤'
                }
            };
        }
        $Data.Store.Restore();
        $Bar.UpdateUserIcon();
    },
};
// --- 公開窓口 ---
const AppManager = {
    // アプリケーション全体の状態を保持するデータストア
    AppData: {
        Context: {
            ScreenMode: $Const.SCREEN_MODE.CREATE,
            IsNetOnline: navigator.onLine, // 端末のネット接続状態
            IsServerOnline: true,          // サーバ疎通 ＋ アプリ有効状態
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
            Token: null,
            SoundVolume: 0.5,
            LoginUserId: null,
        },
        Admin: {
            Notifications: [],
            ReportSummary: [],
            FeedbackList: [],
            UserMailList: []
        },
        Legal: {
            TermsOfService: null, // 利用規約
            PrivacyPolicy: null,  // プライバシーポリシー
            SctLaw: null,         // 特定商取引法
            Disclaimer: null,     // 免責事項
            License: null         // ライセンス
        }
    },
    // アプリ起動時の一連の初期化処理
    async Init() {
        console.log("★$Const.APP_INFO.VERSION", $Const.APP_INFO.VERSION);
        try {
            {
                await _AppCore.setupShell();
                $Auth.Init();
                await _AppCore.restoreLocal(this.AppData);
                // 起動時は必ずCに聞く。Aは見ない
                this.AppData.Context.IsLoggedIn = false;
                if (navigator.onLine) {
                    const ok = await _AppCore.syncActivityLog();
                    if (ok && this.AppData.Context.IsLoggedIn) {
                        await $Data.Access.GetSystemInfo();
                    }
                }
                _AppCore.ensureUserInfo(this.AppData);
            }
            {
                this.ChangeTheme(this.AppData.Owner.Theme || $UI.UI_THEME.BLUE);
                this.ChangeMapStyle(this.AppData.Owner.MapStyle || $Map.MAP_STYLE.STANDARD, this.AppData.Owner.IsMapGrayscale);
                this.ChangeFontSize(this.AppData.Owner.FontSize);
                await this.RefreshScreen();
            }
            {
                _AppCore.initPollingTasks();
                if (!navigator.onLine || !this.AppData.Context.IsNetOnline) {
                    $Notice.Offline.Show("サーバーに接続できません");
                }
                if (this.AppData.Owner.GpsTrackingSec > 0) {
                    $Polling.Start($Polling.TASKS.GPS_FOLLOW);
                }
            }
            _AppCore.registerSW();
            _AppCore.refreshLegalConfigs();
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
    // サーバ通信エラー処理（画面を中断せず通知のみに留める）
    async HandleServerFailure(response, isTimeout = false) {
        $Notice.Loading.Hide();
        if (isTimeout) {
            $Notice.Error("通信がタイムアウトしました。");
            return false;
        }
        // 1. ログインエラー (401) はC=falseとしてBとAをクリア
        if (response && response.status === 401) {
            this.AppData.Owner.LoginUserId = '';
            this.AppData.Context.IsLoggedIn = false;
            _AppCore.save(this.AppData.Owner);
            $Notice.Warn("引き続き利用される際は、ログインをしてください。");
            return false;
        }
        // 接続失敗時は論理オフラインへ移行
        this.AppData.Context.IsNetOnline = false;
        $Notice.Offline.Show("サーバーに接続できません");
        let msg = "サーバ接続が切断されました。";
        $Notice.Error(msg);
        return false;
    },
    // Firebaseからサインアウトし、ローカルの認証状態をクリアする
    async Logout() {
        // BとAを先にクリア（Cより先にUIをログアウト状態にする）
        this.AppData.Owner.LoginUserId = '';
        this.AppData.Context.IsLoggedIn = false;
        this.AppData.Owner.SystemInfo = null;
        _AppCore.save(this.AppData.Owner);
        // Firebaseとサーバーはベストエフォートで切る（失敗してもローカルは残さない）
        try {
            if (firebase.apps.length) {
                await firebase.auth().signOut();
            }
        } catch (e) {
            console.warn("Firebase signOut失敗", e);
        }
        try {
            await $Data.Access.Logout();
        } catch (e) {
            console.warn("Server Logout失敗", e);
        }
    },
    // Google認証でメールアドレスを取得し、Firebase経由でログイン処理を行う
    async ExecuteLoginFlow() {
        // オフラインチェック
        if (!this.AppData.Context.IsNetOnline) {
            $Notice.Error("オフライン中はログインできません");
            return false;
        }
        return await $Warn.CatchAsync(async () => {
            await $Auth.GetVerifiedEmailByGoogle();
            const idToken = await firebase.auth().currentUser.getIdToken(true);
            if (await $Data.Access.LoginFirebase({ IdToken: idToken })) {
                // this.AppData.Context.IsLoggedIn = true;
                _AppCore.save(this.AppData.Owner);
                return true;
            }
            return false;
        })();
    },
    // メール認証実行フロー
    async ExecuteEmailAuthFlow_2(email, password, isSignUp = false) {
        // オフラインチェック
        if (!this.AppData.Context.IsNetOnline) {
            $Notice.Error("オフライン中はログインできません");
            return false;
        }
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
                    // this.AppData.Context.IsLoggedIn = true;
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
    // メール認証実行フロー（新1ボタン用：①ログイン→②ダメなら登録して確認メール）
    async ExecuteEmailAuthFlow(email, password) {
        if (!this.AppData.Context.IsNetOnline) {
            $Notice.Error("オフライン中はログインできません");
            return false;
        }
        if (!email || !password) {
            $Notice.Warn("メールアドレスとパスワードを入力してください");
            return false;
        }

        const auth = firebase.auth();

        try {
            // ① ログインを実施する
            $Notice.Info("ログイン中...");
            const cred = await $Auth.SignInEmail(email, password); // UserCredential を返す版
            const cur = cred.user || auth.currentUser;
            if (!cur) throw new Error("Firebase user not found");

            if (!cur.emailVerified) {
                $Notice.Error("メールアドレスが未確認です。受信トレイを確認してください。");
                await $Auth.SignOut();
                return false;
            }

            const idToken = await cur.getIdToken(true);
            if (await $Data.Access.LoginFirebase({ IdToken: idToken })) {
                _AppCore.save(this.AppData.Owner);
                return true;
            }
            return false;

        } catch (e) {
            // ② ログインできない場合、かつ重複でない場合 → 登録してメール送信
            // Firebase v12では user-not-found / wrong-password は全て invalid-credential に統合
            const isNotFound = e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found';

            if (isNotFound) {
                try {
                    $Notice.Info("アカウントを作成しています...");
                    const newCred = await $Auth.SignUpEmail(email, password);
                    await newCred.user.sendEmailVerification();
                    $Notice.Info("アカウントを作成し確認メールを送信しました。メール内のリンクを開いてからログインしてください。");
                    await $Auth.SignOut();
                    return false;
                } catch (e2) {
                    if (e2.code === 'auth/email-already-in-use') {
                        $Notice.Warn("このメールアドレスは既に登録されています。パスワードをご確認ください。");
                    } else if (e2.code === 'auth/weak-password') {
                        $Notice.Warn("パスワードが短すぎます（6文字以上必要です）。");
                    } else {
                        $Notice.Error(e2.message);
                    }
                    return false;
                }
            }

            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                $Notice.Warn("パスワードが正しくありません。");
            } else if (e.code === 'auth/invalid-email') {
                $Notice.Warn("メールアドレスの形式が正しくありません。");
            } else {
                $Notice.Error(e.message);
            }
            return false;
        }
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
        if (this.AppData.Owner.GpsTrackingSec > 0) {
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
        if (this.AppData.Owner.GpsTrackingSec > 0) {
            $Polling.Start($Polling.TASKS.GPS_FOLLOW);
        }
    },
    // 音量変更メソッド
    ChangeSoundVolume(vol) {
        this.AppData.Owner.SoundVolume = parseFloat(vol);
        _AppCore.save(this.AppData.Owner);
    },
};
document.addEventListener('DOMContentLoaded', () => AppManager.Init());
export default AppManager;