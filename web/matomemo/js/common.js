// エラー（重度）※アプリとしては処理続行不可
window.$Err = {
	_errMode: "fatal",
	// エラー処理
    Handle(err, mode) {
        $Notice.Loading.Hide();
        console.error("Fatal Error:", err);
        // ★追加：オフライン中は致命的エラーダイアログを出さない
        if (!navigator.onLine) return;
        // ダイアログ基盤が生きているかチェック
        const errorTemplate = document.getElementById('tpl-dialog-error');
        if (errorTemplate && window.$Dialog && typeof $Dialog.ShowErrorDialog === 'function') {
            $Dialog.ShowErrorDialog(err.message || err);
        } else {
            // ダイアログが使えない場合の最終手段
            alert("アプリ起動中に致命的なエラーが発生しました。再読み込みしてください。\n\n" + err);
            location.reload();
        }
    },
	// エラースロー
    Throw(message, mode = this._errMode) {
        const err = new Error(message);
        this.Handle(err, mode);
        throw err;
    },
	// try～catchでラッピング
    Catch(fn, mode = this._errMode) {
        return (...args) => {
            try {
                // fn(...args);
                const result = fn(...args);
                return result !== undefined ? result : true;
            } catch (err) {
                this.Handle(err, mode);
                return false;
            }
        };
    },
	// try～catchでラッピング（非同期）
    CatchAsync(fn, mode = this._errMode) {
        return async (...args) => {
            try {
                // await fn(...args);
                const result = await fn(...args);
                return result !== undefined ? result : true;
            } catch (err) {
                this.Handle(err, mode);
                return false;
            }
        };
    }
};

// エラー処理のラッパー（警告用）※処理続行可能
window.$Warn = {
	_errMode: "warning",
    Throw(message) { return $Err.Throw(message, this._errMode); },
    Catch(fn) { return $Err.Catch(fn, this._errMode); },
    CatchAsync(fn) { return $Err.CatchAsync(fn, this._errMode); }
};

// UI標準操作
window.$Dom = {
    // 要素取得＋検証
    GetElementById(id) {
        const el = document.getElementById(id);
        if (!el) $Warn.Throw(`[Dom] 要素が見つかりません: #${id}`);
        return el;
    },
    // 要素取得＋検証
    QuerySelector(selector, parent = document) {
        const el = parent.querySelector(selector);
        if (!el) $Warn.Throw(`[Dom] 要素が見つかりません: ${selector}`);
        return el;
    },
    // 要素取得＋検証
    QuerySelectorAll(selector, parent = document) {
        const els = parent.querySelectorAll(selector);
        if (!els.length) $Warn.Throw(`[Dom] 要素が見つかりません: ${selector}`);
        return els;
    },
    // 表示切替
    ToggleShow(el, isOpen) {
        if (el) {
            // true だと閉じる
            el.classList.toggle('hidden', !isOpen);
        }
    },
    // テンプレート生成
    GenerateTemplate(templateHtml, rootHtml = 'ui-template-root', isAppend = true){
        const tpl = this.GetElementById(templateHtml);
        const root = this.GetElementById(rootHtml);
        const el = tpl.content.firstElementChild.cloneNode(true);
        if (!isAppend) root.innerHTML = "";
        root.appendChild(el);
        return el;
    },
};

// 汎用処理
window.$Util = {
    // 日付オブジェクトを文字列に変換（デフォルトをハイフン区切りに変更）
    FormatDate(dateObj = new Date(), format = 'YYYY-MM-DD　HH:mm') {
        dateObj = new Date(dateObj);
        // 置換用パーツの作成
        const parts = {
            YYYY: dateObj.getFullYear(),
            MM: ('0' + (dateObj.getMonth() + 1)).slice(-2),
            M: dateObj.getMonth() + 1,
            DD: ('0' + dateObj.getDate()).slice(-2),
            D: dateObj.getDate(),
            HH: ('0' + dateObj.getHours()).slice(-2),
            mm: ('0' + dateObj.getMinutes()).slice(-2),
            ss: ('0' + dateObj.getSeconds()).slice(-2)
        };
        // 指定フォーマットに従って置換（ハイフンもそのまま維持される）
        // return format.replace(/YYYY|MM|M|DD|D/g, (match) => parts[match]);
        return format.replace(/YYYY|MM|M|DD|D|HH|mm|ss/g, (match) => parts[match]);
    },
    // URLのホワイトリストチェック
    IsSafeUrl(url) {
        const SAFE_DOMAINS = [
            'youtube.com', 'youtu.be',
            'twitter.com', 'x.com',
            'instagram.com',
            'facebook.com',
            'tiktok.com',
            'github.com',
            'google.com', 'google.co.jp'
        ];
        try {
            const u = new URL(url);
            // ★ ① protocol制限
            if (u.protocol !== 'https:' && u.protocol !== 'http:') {
                return false;
            }
            const hostname = u.hostname.toLowerCase();
            // ★ ② 完全一致 or 正規サブドメインのみ
            return SAFE_DOMAINS.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch {
            return false;
        }
    },
    // 【新規】URLが安全（http/https）か検証する
    getSafeUrl(urlStr) {
        if (!urlStr) return null;
        try {
            const url = new URL(urlStr);
            if (!['http:', 'https:'].includes(url.protocol)) return null;
            return url.href;
        } catch { return null; }
    },
    // 【新規】安全な画像部品（DOM）を生成して返す
    createUrlIconDom(url, size = 32) {
        const safeUrl = this.getSafeUrl(url);
        if (!safeUrl) return null;
        const img = document.createElement('img');
        img.width = size; img.height = size;
        img.style.width = `${size}px`; img.style.height = `${size}px`;
        img.alt = "icon";
        const u = safeUrl.toLowerCase();
        let slug = "";
        if (u.includes('youtube.com') || u.includes('youtu.be')) slug = "youtube";
        else if (u.includes('instagram.com')) slug = "instagram";
        else if (u.includes('x.com') || u.includes('twitter.com')) slug = "x";
        else if (u.includes('facebook.com')) slug = "facebook";
        else if (u.includes('github.com')) slug = "github";
        else if (u.includes('tiktok.com')) slug = "tiktok";
        // プロパティ代入により、ブラウザが自動的にXSSを防止する
        img.src = slug 
            ? `https://cdn.simpleicons.org/${slug}` 
            : `https://www.google.com/s2/favicons?sz=64&domain=${new URL(safeUrl).hostname}`;
        return img;
    },
    // GPSから現在地を取得する（純粋な座標取得のみ）
    async GetCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject(new Error("GPS非対応"));
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000
            });
        });
    },
    // 文字列から座標オブジェクトを解析して返す
    ParseLatLng(input) {
        if (!input) return null;
        const parts = input.replace(/[\(\)\s]/g, "").split(',');
        if (parts.length !== 2) return null;
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        return (isNaN(lat) || isNaN(lng)) ? null : { lat, lng };
    },
    // 住所名から座標を検索する（外部API使用）　※プラスコードは不可
    async SearchAddressByWord(keyword) {
        if (!keyword) return null;
        // オフラインチェック
        if (!$App.AppData.Context.IsOnline) {
            $Notice.Warn("オフライン中は、機能が制限されます。");
            return false;
        }
        // OpenStreetMapの無料検索APIを利用
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(keyword)}`;
        let res;
        try {
            res = await fetch(url);
        } catch (err) {
            console.log("err:", err);
            // ネットワーク断（オフライン）などの物理エラー
            await $App.HandleServerFailure();
            return null;
        }
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    },
    // 地点情報から地点名を検索する
    async GetAddressName(lat, lng, lang = 'jp') {
        // オフラインチェック
        if (!$App.AppData.Context.IsOnline) {
            $Notice.Warn("オフライン中は、機能が制限されます。");
            return "オフライン中です";
        }
        // 引数のバリデーション
        if (!lat || !lng || typeof lat === 'undefined' || typeof lng === 'undefined') {
            return "無効な座標です。";
        }
        try {
            // 逆ジオコーディングAPIの実行
            const zoom = 18;
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=${zoom}&addressdetails=1&accept-language=${lang}`;
            // HTTPリクエストの送信
            $Notice.Loading.Show();
            const response = await fetch(url);
            $Notice.Loading.Hide();
            if (!response.ok) throw new Error("[GetAddressName]でエラーが発生しました。");
            // レスポンスの解析
            const data = await response.json();
            if (!data.display_name) {
                return "住所が見つかりませんでした。";
            }
            // 住所文字列の分割処理
            const parts = data.display_name.split(',').map(p => p.trim());
            // 住所要素の抽出
            const primary = parts[0] || '';
            const secondary = parts[2] ? ` (${parts[2]})` : '';
            // 整形した文字列の返却
            return `${primary}${secondary}`;
        } catch (error) {
            console.log("error:", error);
            $Notice.Warn("住所を取得できませんでした");
            return null;
        }
    },
    // 絵文字ピッカー
    ShowEmojiPicker(onSelect) {
        const el = $Dom.GenerateTemplate("tpl-emoji-picker", "ui-dialog-root");
        const container = $Dom.GetElementById('emoji-mart-container');
        const picker = new EmojiMart.Picker({
            onEmojiSelect: (emoji) => {
                onSelect(emoji.native);
                el.remove();
            },
            locale: 'en',
            set: 'native',
            navPosition: 'bottom',
            previewPosition: 'none',
            skinTonePosition: 'none',
            perLine: 6,           // 1行あたりの個数を減らす
            emojiSize: 48,        // 絵文字自体のサイズを大きく
            emojiButtonSize: 56   // ボタンのタップ判定を大きく
        });
        // 高さは親に合わせつつ、横幅の強制100%は解除する
        picker.style.height = '100%';
        // コンテナ側でフレックスの中央寄せを指定し、中心軸のズレを解消
        container.classList.add('flex', 'justify-center');
        container.appendChild(picker);
        // 閉じる処理
        $Dom.QuerySelector('.js-close', el).onclick = () => el.remove();
        el.onclick = (e) => { if (e.target === el) el.remove(); };
    },
    // IDを難読化（URL用）
    EncodeId(id) {
        if (!id) return "";
        // 1. 文字列化して標準のBase64エンコード
        // btoaはバイナリ文字列用なので、日本語が含まれないID数値ならこれで十分です
        const base64 = btoa(id.toString()).replace(/=+$/, ""); // パディング削除
        // 2. 文字列を反転させて推測しにくくする
        return base64.split("").reverse().join("");
    },
    // 必要であればJS側でも戻せるようにしておく
    DecodeId(encoded) {
        if (!encoded) return 0;
        try {
            const reversed = encoded.split("").reverse().join("");
            // パディング復元
            let b64 = reversed;
            while (b64.length % 4 !== 0) b64 += "=";
            return parseInt(atob(b64));
        } catch (e) {
            return 0;
        }
    },
    // ステータス用バッヂ制御（UI）
    ApplyBadge(element, statusIndex) {
        element.innerHTML = "";
        // rootHtml（第2引数）を渡さず、手動で appendChild する
        const tpl = document.getElementById("tpl-status-badge");
        const badge = tpl.content.firstElementChild.cloneNode(true);

        const configs = [
            ['bg-slate-800', 'bg-white', 'bg-transparent', 'bg-transparent'], // 0: Private
            ['bg-slate-400', 'bg-transparent', 'bg-white', 'bg-transparent'], // 1: Close
            ['bg-brand-5',   'bg-transparent', 'bg-transparent', 'bg-white']  // 2: Open
        ];

        const [bg, d0, d1, d2] = configs[statusIndex];
        badge.classList.add(bg);
        const dots = badge.querySelectorAll('.dot');
        dots[0].classList.add(d0);
        dots[1].classList.add(d1);
        dots[2].classList.add(d2);

        element.appendChild(badge);
    },
    // リロード処理
    ReloadApp() {
        location.reload();
    },
    // パスワード入力
    async CheckAdminAuth() {
        const pass = await $Dialog.ShowInput({ 
            title: "ADMIN AUTH", 
            type: "password", 
            message: "管理者パスワードを入力してください" 
        });
        if (pass === null) return false;
        if (pass !== $Const.APP_CONFIG.ADMIN_PW) {
            $Notice.Error("パスワードが違います");
            return false;
        }
        return true;
    },
    // 地点データ群から総移動距離を算出する
    GetTotalDistance(details) {
        if (!details || details.length < 2) return 0;
        let totalMeters = 0;
        for (let i = 0; i < details.length - 1; i++) {
            const p1 = L.latLng(details[i].latitude, details[i].longitude);
            const p2 = L.latLng(details[i + 1].latitude, details[i + 1].longitude);
            totalMeters += p1.distanceTo(p2);
        }
        // メートルをkmに変換して返却
        return totalMeters / 1000;
    },
    // SNSシェア用URLの生成
    GetShareUrl(type, url, title = "") {
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        switch(type) {
            case 'line':
                return `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;
            case 'x':
                return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
            case 'facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            default:
                return "";
        }
    },
    // 外部リンク連携
    OpenExternalLink(url) {
        // オフラインチェック
        if (!$App.AppData.Context.IsOnline) {
            $Notice.Warn("オフライン中は、機能が制限されます。");
            return;
        }
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    },
    // feel_typeの数値からアイコンパスを取得
    GetFeelIconPath(val) {
        const item = Object.values($Const.FEEL_TYPE).find(f => f.val === Number(val));
        return item ? item.path : $Const.FEEL_TYPE.NORMAL.path;
    },
};
