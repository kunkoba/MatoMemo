// firebase設定（google）
const FirebaseConfig = window.ENV_CONFIG.FIREBASE_CONFIG;

let _isAuthInitialized = false;

const AuthManager = {
    Init() {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(window.ENV_CONFIG.FIREBASE_CONFIG);
        }
        // ポップアップブロック対策で auth() を一度実行して iframe を先読み
        const auth = firebase.auth();
        // Firebase Authentication の表示言語を日本語にする
        auth.languageCode = 'ja';
    },
    async GetVerifiedEmailByGoogle() {
        this.Init();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await firebase.auth().signInWithPopup(provider);
        return result.user?.email;
    },
    // ① ログインを実施：成功時は UserCredential を返し、失敗時は例外をそのまま投げる
    //    呼び出し元で auth/invalid-credential を判定して新規登録へ分岐できるようにする
    async SignInEmail(email, password) {
        this.Init();
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);
        return result; // result.user と result.user.getIdToken() が使える形で返す
    },
    // ② ログインできない場合、かつ重複でない場合に呼ばれる：同様に UserCredential を返す
    async SignUpEmail(email, password) {
        this.Init();
        const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
        return result;
    },
    async ResetPassword(email) {
        this.Init();
        await firebase.auth().sendPasswordResetEmail(email);
        return true;
    },
    async SendVerificationMail() {
        const u = firebase.auth().currentUser;
        if (!u) return false;
        await u.sendEmailVerification();
        return true;
    },
    async SignOut() {
        this.Init();
        await firebase.auth().signOut();
    },
};

export default AuthManager;