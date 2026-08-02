/**
 * Service Worker: Network First with Timeout Strategy
 * 
 * 1. オンライン時はネットワークから最新を取得（3秒以内に応答がない場合はキャッシュへ）
 * 2. オフライン時は即座にキャッシュから取得
 * 3. 更新時はユーザーの許可を待たず、自動的にバックグラウンドで最新化
 */
// --- 設定定数 ---
const NETWORK_TIMEOUT = 3000; // ネットワークを待つ時間（ミリ秒）
const urlParams = new URL(self.location).searchParams;
const CACHE_VERSION = urlParams.get('v') || 'manual-v1';
const CACHE_KEYS = {
    STATIC: `static-cache-${CACHE_VERSION}`,   // CDNや画像など（Cache First）
    DYNAMIC: `dynamic-cache-${CACHE_VERSION}`  // index.htmlや自作JS/CSS（Network First）
};
// 起動時に最低限キャッシュしておくべきコアアセット
const CORE_ASSETS = [
    './',
    './index.html',
    './img/ico/icon-48.png',
    './img/ico/icon-192.png',
    './img/ico/icon-512.png',
    './template/template-core.html',
    './template/template-screen.html',
    './template/template-list.html',
    './template/template-admin.html',
    './css/app-style.css',
    './css/component-style.css'
];
// キャッシュ優先（Cache First）にする外部ドメイン群
const STATIC_DOMAINS = [
    'cdn.tailwindcss.com',
    'unpkg.com',
    'www.gstatic.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.simpleicons.org'
];
// キャッシュ優先（Cache First）にする拡張子
const STATIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
// キャッシュ除外対象（API通信など）
const isApiRequest = (url) => {
    return url.includes('/api/') || url.includes('ngrok-free.app') || url.includes('localhost:5000');
};
// --- 1. インストール処理 ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_KEYS.STATIC).then((cache) => {
            return cache.addAll(CORE_ASSETS);
        })
    );
    // 新しいSWが見つかったら、待機せずに即座に入れ替える
    self.skipWaiting();
});
// --- 2. アクティベート処理 ---
self.addEventListener('activate', (event) => {
    // すべてのクライアントを即座に制御下に置く
    event.waitUntil(self.clients.claim());
    // バージョンが異なる古いキャッシュを物理削除
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!Object.values(CACHE_KEYS).includes(cacheName)) {
                        console.log(`[SW] 古いキャッシュを削除しました: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
// --- 3. リクエストの横取り（Fetchイベント） ---
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);
    // GET以外やAPI通信はSWで干渉しない
    if (req.method !== 'GET' || isApiRequest(req.url)) return;
    // 【戦略A：Cache First】（外部CDNや画像など、ほぼ変更がないもの）
    const isStatic = STATIC_DOMAINS.some(domain => url.hostname.includes(domain)) || 
                    STATIC_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext));
    if (isStatic) {
        event.respondWith(
            caches.match(req).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(req).then((networkResponse) => {
                    return caches.open(CACHE_KEYS.STATIC).then((cache) => {
                        cache.put(req, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }
    // 【戦略B：Network First with Timeout】（index.html、自作JS・CSSなど）
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_KEYS.DYNAMIC);
            // ネットワーク取得とタイムアウト（キャッシュ返し）を競争させる
            try {
                const networkResponse = await Promise.race([
                    fetch(req),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), NETWORK_TIMEOUT)
                    )
                ]);
                // ネットワークが勝った場合：キャッシュを更新して返す
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(req, networkResponse.clone());
                    return networkResponse;
                }
            } catch (err) {
                // タイムアウト、オフライン、またはサーバーエラー時はキャッシュから返す
                console.warn(`[SW] ネットワーク失敗。キャッシュを返します: ${url.pathname}`);
            }
            // ▼修正後（エラーをキャッチして、コンソールの赤文字を防ぐ）
            return (await caches.match(req)) || fetch(req).catch(() => {
                console.warn(`[SW] オフラインかつキャッシュなしのため取得不可: ${url.pathname}`);
                // エラーでアプリが落ちないようにダミーのレスポンスを返す
                return new Response("Offline or Not Found", { 
                    status: 503, 
                    statusText: "Service Unavailable" 
                });
            });
        })()
    );
});
// アプリ側からの強制指令（念のため残すが、基本は install 時の skipWaiting で完結）
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
