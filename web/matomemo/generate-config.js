// ■■■■■ vercelビルド時に自動実行されるファイル
// vercel＞setting＞Build and Deployment＞Framework Settings
const fs = require('fs');
const path = require('path');
const renderUrl = process.env.RENDER_API_URL || "https://matomemo-1.onrender.com";    // 取得できない場合はテスト環境へ

const content = `window.ENV_CONFIG = {
    BASE_URL: "${renderUrl}",
    ADMIN_PW: "8855",
    FIREBASE_CONFIG: {
        apiKey: "${process.env.FIREBASE_API_KEY}",
        authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
        projectId: "${process.env.FIREBASE_PROJECT_ID}",
        storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
        messagingSenderId: "${process.env.FIREBASE_SENDER_ID}",
        appId: "${process.env.FIREBASE_APP_ID}",
        measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"
    }
};
`;
fs.mkdirSync(path.join(__dirname, 'js'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'js/config.js'), content);
console.log('BASE_URL =', renderUrl);