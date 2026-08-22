// firebase設定（google）
const FirebaseConfig = window.ENV_CONFIG.FIREBASE_CONFIG;

// Firebaseの初期化状態を管理するフラグ
let _isAuthInitialized = false; // 初期化済みフラグ

// 認証マネージャー（外部にPublicする窓口）
const AuthManager = {
    // 認証基盤を事前準備（ブラウザのポップアップブロック対策）
    Init() {
        if (firebase.apps.length === 0) { // インスタンス未生成なら
            firebase.initializeApp(window.ENV_CONFIG.FIREBASE_CONFIG); // 初期化
        }
        firebase.auth(); // ★一度実行して通信用iframeを裏でロードさせる
    },
    // Googleログインを実行
    async GetVerifiedEmailByGoogle() {
        this.Init(); // 念のため初期化を確認
        const provider = new firebase.auth.GoogleAuthProvider(); // プロバイダ
        provider.setCustomParameters({ prompt: 'select_account' }); // 選択画面
        const result = await firebase.auth().signInWithPopup(provider); // ポップアップ
        return result.user?.email; // アドレス返却
    },
    // メールログイン
    async SignInEmail(email, password) {
        this._ensureInit();
        const result = await firebase.auth()
            .signInWithEmailAndPassword(email, password);
        return result.user?.email;
    },
    // メール新規登録
    async SignUpEmail(email, password) {
        this._ensureInit();
        const result = await firebase.auth()
            .createUserWithEmailAndPassword(email, password);
        return result.user?.email;
    },
    // パスワード再設定メール送信
    async ResetPassword(email) {
        this._ensureInit();
        await firebase.auth().sendPasswordResetEmail(email);
        return true;
    }
};

// Public
export default AuthManager;
