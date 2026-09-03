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
        AppData.Owner.SoundVolume = saved.soundVolume ?? 0.5;
        if (saved.loginUserId) {
            AppData.Owner.SystemInfo = { 
                login_user_id: saved.loginUserId, // ID復元
                ownerProfile: saved.ownerProfile // プロフィール情報をローカルから復元
            };
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
        // 起動時にローカルDBから法的情報をメモリへロード
        const legalData = await $LocalDb.Legal.GetAll(); // 全取得
        legalData.forEach(d => { // 取得データをループ
            if (AppData.Legal.hasOwnProperty(d.id)) { // 定義済みキーか確認
                AppData.Legal[d.id] = d; // メモリに展開
            }
        });
        // 初期ロード後に未読バッジ状態を確認
        await $Data.LocalDb.CheckLegalUnread(); // 未読チェック
    },
    // 設定とIDの永続化
    save(Owner) {
        localStorage.setItem(this.settingsKey, JSON.stringify({
            theme: Owner.Theme, // テーマ
            mapStyleKey: Owner.MapStyle?.key, // 地図
            isMapGrayscale: Owner.IsMapGrayscale, // 白黒
            gpsTrackingSec: Owner.GpsTrackingSec, // GPS
            token: Owner.Token, // トークン
            currency_unit: Owner.Currency_unit, // 通貨
            fontSize: Owner.FontSize, // 文字サイズ
            lastLoginDate: Owner.LastLoginDate, // ログイン日
            loginUserId: Owner.SystemInfo?.login_user_id, // ユーザID
            ownerProfile: Owner.SystemInfo?.ownerProfile, // プロフィール情報を追加
            soundVolume: Owner.SoundVolume,     // 音量
        }));
    },
    // オフライン監視・GPS追従・データ同期などのポーリング処理をまとめて登録する
    initPollingTasks() {
        const checkSec = 1;
        const saveDetailSec = $Const.APP_CONFIG.SAVE_DETAIL_SEC;
        const saveReactionSec = $Const.APP_CONFIG.SAVE_REACTION_SEC;
        const activityCheckSec = 300;
        $Polling.Init();
        // オフライン監視
        $Polling.Add($Polling.TASKS.OFFLINE_CHECK, () => {
            const isNowNetOnline = navigator.onLine;
            // 状態が「オンライン」から「オフライン」に変わった瞬間
            if ($App.AppData.Context.IsNetOnline && !isNowNetOnline) {
                $App.AppData.Context.IsNetOnline = false;
                $App.AppData.Context.IsServerOnline = false; // ネットがなければサーバもオフ扱い
                $Notice.Offline.Show("インターネットに接続できません");
            }
            // 状態が「オフライン」から「オンライン」に変わった瞬間
            else if (!$App.AppData.Context.IsNetOnline && isNowNetOnline) {
                $App.AppData.Context.IsNetOnline = true;
                // ネットが復帰したら即座にサーバ疎通チェック（Check ②④）を走らせる
                this.syncActivityLog();
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
    // 最終利用日の同期およびサーバ復帰確認
    async syncActivityLog() {
        // 端末自体がオフラインなら何もしない（監視スレッド側で処理するため）
        if (!navigator.onLine) return false;
        let isSuccess = false;
        // ログイン状態によって、使用するAPIを切り替える（Check ③ の分離）
        if ($App.AppData.Context.IsLoggedIn && $App.AppData.Owner.Token) {
            // ログイン中：ユーザチェック ＋ 生存確認
            isSuccess = await $Data.Access.EnsureLoginUser();
        } else {
            // 未ログイン：生存確認のみ（ユーザチェックは行わない）
            isSuccess = await $Data.Access.GetAppInfo();
        }
        if (isSuccess) {
            // サーバ疎通成功 ＋ アプリ有効
            $App.AppData.Context.IsServerOnline = true;
            $Notice.Offline.Hide();
            // ログイン中の場合は最終利用日を更新
            if ($App.AppData.Context.IsLoggedIn) {
                const today = new Date().setHours(0, 0, 0, 0);
                $App.AppData.Owner.LastLoginDate = $Util.FormatDate(today, 'YYYY-MM-DD');
                this.save($App.AppData.Owner);
            }
            return true;
        } else {
            // 失敗した原因が「そもそもネットが切れたから」でないか確認
            if (!navigator.onLine) {
                $App.AppData.Context.IsNetOnline = false;
                $App.AppData.Context.IsServerOnline = false;
                $Notice.Offline.Show("インターネットに接続できません");
                return false;
            }
            // ネットはあるのに失敗した（サーバダウン・メンテ）場合のみ表示
            $App.AppData.Context.IsServerOnline = false;
            $Notice.Offline.Show("サービスに接続できません");
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
    // ユーザ情報の整合性チェックとローカル補完（同期処理追加版）
    ensureUserInfo(AppData) {
        // console.log("★ensureUserInfo:", AppData);
        // ローカルストレージから設定読み込み
        const saved = JSON.parse(localStorage.getItem(this.settingsKey) || '{}'); // JSON解析
        // メモリ上のプロフ情報が欠落しているかチェック
        if (!AppData.Owner.SystemInfo || !AppData.Owner.SystemInfo.ownerProfile) {
            // ローカルにキャッシュがあるか判定
            if (saved.loginUserId && saved.ownerProfile) {
                console.log("◆ユーザ復元");
                // ローカルキャッシュから復元
                AppData.Owner.SystemInfo = {
                    login_user_id: saved.loginUserId, // ID復元
                    ownerProfile: saved.ownerProfile  // プロフ復元
                };
            } else {
                console.log("◆ユーザなし");
                // キャッシュも無い場合はゲスト情報を生成
                AppData.Owner.SystemInfo = {
                    login_user_id: 'anonymous', // ゲストID
                    ownerProfile: {
                        nick_name: 'Guest', // 名前
                        icon: '👤' // アイコン
                    }
                };
            }
            // 決定した情報を他コンポーネントに反映させる
            $Data.Store.Restore(); // データストアへ同期（ダイアログ用）
        }
        $Bar.UpdateUserIcon(); // バーのアイコンを更新（メニュー用）
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
    // アプリ起動時の一連の初期化処理（描画基盤 → ローカル復元 → ログイン確認 → 画面描画 → ポーリング開始 → SW登録）をまとめて実行する
    async Init() {
        console.log("★$Const.APP_INFO.VERSION", $Const.APP_INFO.VERSION);
        try {
            // 描画基盤とローカル設定の復元
            {
                await _AppCore.setupShell(); // UI準備
                $Auth.Init(); // ★認証基盤を事前初期化（ポップアップブロック対策）
                await _AppCore.restoreLocal(this.AppData); // 基本設定復元
                // トークンがある場合のログイン維持処理
                if (this.AppData.Owner.Token) {
                    this.AppData.Context.IsLoggedIn = true; // ログインフラグ
                    // オンライン時のみサーバから最新情報を取得
                    if (navigator.onLine) {
                        await _AppCore.syncActivityLog(); // 最終日同期
                        await $Data.Access.GetSystemInfo(); // 最新プロフ取得
                    }
                    // サーバ取得の成否に関わらず、最終的な情報の整合性を確保する
                    _AppCore.ensureUserInfo(this.AppData); // 情報補完実行
                    // // 確定した情報をローカルへ書き戻す
                    // _AppCore.save(this.AppData.Owner); // 永続化
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
                // 起動時にすでにオフラインなら即表示
                if (!navigator.onLine || !this.AppData.Context.IsNetOnline) {
                    $Notice.Offline.Show();
                }
                if (this.AppData.Owner.GpsTrackingSec > 0) {
                    $Polling.Start($Polling.TASKS.GPS_FOLLOW);
                }
            }
            // // 未ログイン・共有リンクでもない・オンラインの場合はログインダイアログを表示
            // if (!this.AppData.Context.TargetArchiveId && !this.AppData.Context.IsLoggedIn && navigator.onLine) {
            //     $Dialog.ShowLoginDialog();
            // }
            // その他
            _AppCore.registerSW();
            _AppCore.refreshLegalConfigs();
            // ログイン中の場合のみユーザーチェックを実行する
            if (this.AppData.Context.IsLoggedIn) {
                $Data.Access.EnsureLoginUser();
            }
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
        console.warn(">> HandleServerFailure", response?.status, "isTimeout:", isTimeout);
        $Notice.Loading.Hide();
        // タイムアウト時の専用メッセージを表示
        if (isTimeout) {
            $Notice.Error("通信がタイムアウトしました。");
            return false;
        }
        // 1. ログインエラー (401) は認証をクリアするのみ
        if (response && response.status === 401) {
            this.AppData.Context.IsLoggedIn = false;
            this.AppData.Owner.Token = null;
            $Notice.Warn("引き続き利用される際は、ログインをしてください。");
            return false;
        }
        {
            // // 2. 通信・サーバエラーの判定
            // let msg = "サーバへ接続できません。ローカル機能のみ利用可能です。";
            // if (response) {
            //     try {
            //         const res = await response.json();
            //         msg = res.message || "サーバでエラーが発生しました。";
            //     } catch (e) {
            //         msg = "データの取得に失敗しました。";
            //     }
            // } else if (!navigator.onLine) {
            //     msg = "オフラインのため通信をスキップしました。";
            // }
            // // 全てトースト通知で処理し、例外は投げない
            // $Notice.Error(msg);
            // return false;
        }
        // 接続失敗時は論理オフラインへ移行
        this.AppData.Context.IsNetOnline = false;
        $Notice.Offline.Show(); // オフラインバーを表示
        let msg = "サーバ接続が切断されました。";
        $Notice.Error(msg);
        return false;
    },
    // Google認証でメールアドレスを取得し、Firebase経由でログイン処理を行う
    async ExecuteLoginFlow() {
        // オフラインチェック
        if (!this.AppData.Context.IsNetOnline) {
            $Notice.Error("オフライン中はログインできません");
            return false;
        }
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