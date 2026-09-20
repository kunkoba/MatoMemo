// 定数
window.$Const = {
    // アプリ情報
    APP_INFO: {
        NAME: "まとめも（旅の記録を簡単まとめ）",
        DESCRIPTION: "「その日、その時、その場所の思い出」をひとまとめに！旅の記録や日常の気づきを、地図と一緒に残せるアプリです。",
        DEVELOPER: "kunkoba",
        OFFICIAL_SITE: "https://hinekulemonstudio.web.app/",
        VERSION: "1.3.2",
        VERSION_DESCRIPTION: `
メジャー.マイナー.パッチの形式で表されます。

■ メジャー（一番左の数字）
もっとも大きな変更があった時に更新します。既存の機能が動かなくなるような「破壊的な変更」が含まれる場合や、大幅な仕様変更を行った時に数字を上げます。

■ マイナー（真ん中の数字）
新しい機能を追加した時に更新します。これまでの機能との互換性は保たれるため、アップデートしても基本的にプログラムが壊れることはありません。

■ パッチ（一番右の数字）
バグの修正や、内部的な微調整のみを行った時に更新します。機能の追加や変更は行わず、既存の動きを安定させるための更新です。
`,
    },
    // アプリ設定
    APP_CONFIG: {
        ADMIN_PW: (window.ENV_CONFIG && window.ENV_CONFIG.ADMIN_PW) ? window.ENV_CONFIG.ADMIN_PW : "",
        SAVE_DETAIL_SEC: 30,
        SAVE_REACTION_SEC: 300,
        NETWORK_TIMEOUT_SEC: 10,
    },
    // リーガル情報の識別キー
    LEGAL_TYPE: {
        TERMS:      "TermsOfService",   // 利用規約
        PRIVACY:    "PrivacyPolicy",    // プライバシーポリシー
        // SCTLAW:     "SctLaw",           // 特定商取引法に基づく表記
        DISCLAIMER: "Disclaimer",       // 免責事項
        LICENSE:    "License",          // ライセンス
    },
    // 地図設定
    MAP_CONFIG: {
        MIN_ZOOM: 4,
        MAX_ZOOM: 18,
        DEFAULT_ZOOM: 15,
        MOVE_DEFAULT_SEC: 0.5,
        MOVE_ANIMATION_SEC: 2,
    },
    // 画面モード
    SCREEN_MODE: {
        CREATE:      'create',       // 新規登録モード
        ARCHIVE:     'archive',      // まとめ参照モード
        ARCHIVE_PUB: 'archive_pub',  // まとめ参照（Public）モード
        SEARCH:      'search',       // 地図検索モード
    },
    // リアクション種別（ID, 絵文字, DBプロパティ名, ボタンID を統合）
    REACTION_TYPE: {
        FUNNY:    { id: 1, emoji: '🤣', text: 'ｗｗｗ', prop: 'has_funny',    btnId: 'detail-btn-funny' },
        LOVE:     { id: 2, emoji: '😍', text: 'いいね！', prop: 'has_love',     btnId: 'detail-btn-love' },
        SURPRISE: { id: 3, emoji: '😲', text: 'わおっ！', prop: 'has_surprise', btnId: 'detail-btn-surprise' },
        SAD:      { id: 4, emoji: '😢', text: 'なきそう', prop: 'has_sad',      btnId: 'detail-btn-sad' },
    },
    // 全体通知種別
    NOTICE_KIND: {
        OTHER:     { id: 0, emoji: '💬', label: 'Other' },
        IMPORTANT: { id: 1, emoji: '📢', label: 'Important' },
        NOTICE:    { id: 2, emoji: '🔔', label: 'Notice' },
    },
    // 個別通知（メール）種別
    USER_NOTICE_KIND: {
        INFO:    { id: 1, emoji: '✉️', label: 'Info' },
        CAUTION: { id: 8, emoji: '⚠️', label: 'Caution' },
        WARNING: { id: 9, emoji: '🚫', label: 'Warning' },
    },
    // マーカー表示モード
    MARKER_MODE: {
        EMOJI: 'emoji',
        FEEL:  'feel',
    },
    // 公開用データのステータス
    PUBLIC_DATA_STATUS: {
        NOTHING: "Nothing", // 未作成
        OPEN:    "Open",    // 公開中
        CLOSE:   "Close",   // 非公開中（準備中）
        DELETE:  "Delete",  // 削除済み
    },
    // 移動手段と音源の定義
    MOVE_SOUND_TYPE: {
        CLOCK:   { id: 0, emoji: '🕐', file: 'audio/clock.wav' },
        WALK:    { id: 1, emoji: '🚶', file: 'audio/walk.wav' },
        BICYCLE: { id: 2, emoji: '🚲', file: 'audio/bicycle.wav' },
        BIKE:    { id: 3, emoji: '🏍️', file: 'audio/bike.wav' },
        CAR:     { id: 4, emoji: '🚗', file: 'audio/car.wav' },
        TRAIN:   { id: 5, emoji: '🚃', file: 'audio/train.wav' },
        PLANE:   { id: 6, emoji: '✈️', file: 'audio/plane.wav' },
        SHIP:    { id: 7, emoji: '🚢', file: 'audio/ship.wav' },
    },
    // 明細の評価種別
    FEEL_TYPE3: {
        GOOD:   { val: 1,  label: 'Good',   path: 'img/face/face_good.png' },
        NORMAL: { val: 0,  label: 'Normal', path: 'img/face/face_normal.png' },
        BAD:    { val: -1, label: 'Bad',    path: 'img/face/face_bad.png' },
    },
    // 表情リスト（色順：ピンク ⇒ 緑 ⇒ 紫 ⇒ 青 ⇒ 赤）
    FEEL_TYPE: {
        // pink
        PINK_SMILE_HEARTS:   { val: 11,  path: 'img/feel/pink-smile-hearts.png',   label: 'メロメロ' },
        PINK_LAUGH_SQUINT:   { val: 12,  path: 'img/feel/pink-laugh-squint.png',   label: '照れ笑い' },
        PINK_GRIN_HEARTS:    { val: 13,  path: 'img/feel/pink-grin-hearts.png',    label: 'ニヤリハート' },
        // green
        GREEN_GRIN_ALT:      { val: 21,  path: 'img/feel/green-grin-alt.png',     label: 'ニヤリ' },
        GREEN_DROOLING:      { val: 22,  path: 'img/feel/green-drooling.png',     label: 'よだれ' },
        GREEN_SLEEPING:      { val: 23,  path: 'img/feel/green-sleeping.png',     label: 'スヤァ' },
        // purple
        PURPLE_FLUSHED:          { val: 31,  path: 'img/feel/purple-flushed.png',          label: '赤面' },
        PURPLE_EXPRESSIONLESS:   { val: 32,  path: 'img/feel/purple-expressionless.png',   label: '無表情' },
        PURPLE_DOWNCAST_SWEAT:   { val: 33,  path: 'img/feel/purple-downcast-sweat.png',   label: '冷や汗' },
        PURPLE_DIZZY:            { val: 34,  path: 'img/feel/purple-dizzy.png',            label: 'クラクラ' },
        PURPLE_DISAPPOINTED:     { val: 35, path: 'img/feel/purple-disappointed.png',     label: 'ガッカリ' },
        // blue
        BLUE_TIRED:          { val: 41, path: 'img/feel/blue-tired.png',         label: '疲れ' },
        BLUE_SCREAM:         { val: 42, path: 'img/feel/blue-scream.png',        label: '絶叫' },
        BLUE_SAD_TEAR:       { val: 43, path: 'img/feel/blue-sad-tear.png',      label: '涙' },
        BLUE_CONFOUNDED:     { val: 44, path: 'img/feel/blue-confounded.png',    label: '困惑' },
        BLUE_ANXIOUS_SWEAT:  { val: 45, path: 'img/feel/blue-anxious-sweat.png', label: '不安汗' },
        // red
        RED_ANGRY_HORNS:     { val: 51, path: 'img/feel/red-angry-horns.png',    label: '激怒' },
    },
};

// window.$Const の中、あるいは直後に配置
window.$Const.GetMockData = function(key, count = 10) {
    const list = [];
    const now = new Date();
    for (let i = 1; i <= count; i++) {
        switch (key) {
            case 'REPORT_SUMMARY': // 管理者：通報集計
                list.push({
                    target_user_name: `User_${i}`,
                    target_user_id: `c7c2583e-e389-4f7c-b6b5-e28541507791`,
                    archive_id: 3,
                    archive_title: `通報されたまとめ案 #${i} の長いタイトル`,
                    report_count: Math.floor(Math.random() * 50) + 1
                });
                break;
            case 'REPORT_DETAIL': // 管理者：通報詳細
                list.push({
                    reporter_user_id: `reporter-guid-${i}`,
                    report_tim: new Date(now.getTime() - i * 600000).toISOString(),
                    body: `${i}番目の通報理由：\n不適切なコンテンツが含まれています。\n規約違反の疑いがあります。\nあああああ\nああああ\nあああ\nあああああ\nああああああ\nあああああ\nあああああ`
                });
                break;
            case 'FEEDBACK': // フィードバック
                list.push({
                    create_tim: new Date(now.getTime() - i * 1800000).toISOString(),
                    score: (i % 5) + 1,
                    body: `フィードバック #${i}: \nアプリのデザインがとても使いやすいです！${'あああ\n'.repeat(i % 50)}`
                });
                break;
        }
    }
    return list;
};
