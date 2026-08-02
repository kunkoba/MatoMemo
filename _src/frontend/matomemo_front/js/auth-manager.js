// firebase設定（google）
const FirebaseConfig = window.ENV_CONFIG.FIREBASE_CONFIG;

// 認証マネージャー（外部にPublicする窓口）
const AuthManager_2 = {
    // 外部(Firebase)ログインを実行し、確実な身分（メールアドレス）だけを返す
    async GetVerifiedEmailByGoogle() {
        if (!firebase.apps.length) firebase.initializeApp(FirebaseConfig); 
        const auth = firebase.auth();
        const provider = new firebase.auth.GoogleAuthProvider();
    // Googleのアカウント選択画面を必ず出すようにする
    provider.setCustomParameters({
        prompt: 'select_account'
    });
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        //
        if (!user || !user.email) {
            throw new Error("ユーザー情報が取得できませんでした。");
        }
        // 自サーバーとの通信はしない！身分証明（email）だけを返す！
        return user.email;
    }
};
const AuthManager = {
    // Firebase初期化ヘルパー
    _ensureInit() {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.ENV_CONFIG.FIREBASE_CONFIG);
        }
    },
    // Googleログイン
    async GetVerifiedEmailByGoogle() {
        this._ensureInit();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await firebase.auth().signInWithPopup(provider);
        return result.user?.email;
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
