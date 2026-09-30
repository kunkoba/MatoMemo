const fs = require('fs');
const path = require('path');
const renderUrl = process.env.RENDER_API_URL || "https://matomemo-1.onrender.com";    // 取得できない場合はテスト環境へ

const content = `window.ENV_CONFIG = {
    BASE_URL: "${renderUrl}",
    ADMIN_PW: "8855",
    DEBUG_MODE: false,
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyBJ-OSK-D6-NboGQtb1zQiDK7gkwbpXjv8",
        authDomain: "kunkoba.firebaseapp.com",
        projectId: "kunkoba",
        storageBucket: "kunkoba.firebasestorage.app",
        messagingSenderId: "41251112393",
        appId: "1:41251112393:web:836d8f5b87ebfdb59c1418",
        measurementId: "G-6XTLC5G1EY"
    }
};
`;
fs.mkdirSync(path.join(__dirname, 'js'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'js/config.js'), content);
console.log('BASE_URL =', renderUrl);