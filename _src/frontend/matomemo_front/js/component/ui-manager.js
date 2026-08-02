// UI操作
const _UI_Core = {
    // 初期化
    init() {
		// 要素取得
		this.noticeText = $Dom.GetElementById('notice-bar-text');
    },
	// カラーテーマの変更
	setTheme(theme){
        document.documentElement.setAttribute('data-theme', theme);
	},
	// 通知領域テキスト表示
	updateNoticeBarText(word){
		if (this.noticeText) {
			this.noticeText.textContent = word;
		}
	}
};

// 窓口
const UI_Manager = {
    // カラーテーマ
    UI_THEME: {
        BLUE: 'blue',
        GREEN: 'green',
        RED: 'red',
        YELLOW: 'yellow',
    },
    // パーツ生成を担うジェネレータ
    Generator: {
        // URLリンクボタンの生成（戻り値として true/false を返す）
		LinkButton(parentEl, url, params = null, isOwner = false) {
            if (!url) return;
            if (!parentEl) return;
            // 安全な画像DOMを生成
            const iconDom = $Util.createUrlIconDom(url, 24); // カプセル枠に合わせて少し小さく
            if (!iconDom) return false; // ★無効なURLなら false を返す
            const btn = $Dom.GenerateTemplate("tpl-link-button", "ui-template-root");
            // 1. アイコンDOMの注入
            const iconContainer = $Dom.QuerySelector('.js-icon-container', btn);
            iconContainer.innerHTML = ""; 
            iconContainer.appendChild(iconDom);
            // 2. URLテキストの注入
            const urlText = $Dom.QuerySelector('.js-url-text', btn);
            urlText.textContent = url;
			btn.onclick = (e) => {
                e.stopPropagation();
                if (!$App.AppData.Context.IsOnline) {
					$Notice.Warn("オフライン中は、機能が制限されます。");
					return;
				}
                const safeUrl = $Util.getSafeUrl(url);
                if (!safeUrl) return $Notice.Error("無効なURLです。");
                // 専用ダイアログを表示
                $Dialog.ShowLinkOpen({
                    url: safeUrl,
                    onOpen: () => {
                        // 直接開く選択時のみ、オーナー以外ならクリック集計を送信
                        if (params && !isOwner) $Data.Access.AddClick(params);
                    }
                });
            };
            parentEl.appendChild(btn);
            return true; // ★追加成功時に true を返す
        },
		// ユーザ情報バッヂの生成
		UserBadge(parentEl, profile, options = {}) {
			if (!profile) return null;
			if (!parentEl) return;
			parentEl.innerHTML = "";	// 消しちゃダメ
			const type = options.type || 'button'; // 'button' or 'badge'
			const isOwner = !!options.isOwner;
			// テンプレートの生成
			const tplId = (type === 'button') ? 'tpl-user-button' : 'tpl-user-badge';
			const el = $Dom.GenerateTemplate(tplId, "ui-template-root");
			// データの流し込み
			$Dom.QuerySelector(".js-icon", el).textContent = profile.icon || "👤";
			$Dom.QuerySelector(".js-name", el).textContent = profile.nick_name || "No Name";
			// ボタンタイプの場合のみイベントを付与
			if (type === 'button') {
				el.onclick = async (e) => {
					e.stopPropagation();
                    // ★修正：匿名かつ自分以外（管理者以外）なら中断
                    if (profile.anonymous_flg && !isOwner && $App.AppData.Owner.Plan !== "Admin") {
                        $Notice.Warn("このユーザーは情報を公開していません");
                        return;
                    }
					if (isOwner) {
						// 自分の場合は保存済みのプロフを表示
						$Dialog.ShowUserProfile($App.AppData.Owner.SystemInfo.ownerProfile, true);
					} else {
						// 他人の場合はAPIで詳細を取得して表示
						const isSuccess = await $Data.Access.GetUserProfile({ target_user_id: profile.user_id });
						if (isSuccess) $Dialog.ShowUserProfile($Data.Store.GetUserProfile(), false);
					}
				};
			}
			// return el;
			parentEl.appendChild(el);
		},
		// 新規バッヂ生成
		ApplyNewBadge(parentEl, isShow, type = 'dot') {
			if (!parentEl) return;
			// parentEl.innerHTML = "";	// 消しちゃダメ
			let badge = parentEl.querySelector('.js-unread-badge');
			// const isShow = count > 0;
			if (isShow && !badge) {
				parentEl.classList.add('relative');
				badge = document.createElement('span');
				badge.className = 'js-unread-badge absolute bg-red-500 text-white font-bold flex items-center justify-center pointer-events-none  whitespace-nowrap ';
				if (type === 'dot') {
					badge.className += 'w-3 h-3 rounded-full top-0 right-0 border-2 border-brand-1';
				} else {
					badge.className += 'text-[0.9rem] px-2 py-0.5 rounded-full top-1/2 -translate-y-1/2 right-4';
					badge.textContent = 'NEW';
				}
				parentEl.appendChild(badge);
			}
			if (badge) $Dom.ToggleShow(badge, isShow);
		},
		// 日付ラベルを生成
		MemoDateFormatter(parentEl, detail, size = 'sm') {
			if (!parentEl || !detail) return;
			parentEl.innerHTML = "";
			const el = $Dom.GenerateTemplate("tpl-date-label", "ui-template-root");
			// 1. レイアウト切り替え（detailサイズ時のみ差分クラスをadd）
			if (size === 'lg') {
				el.classList.add('gap-6');
				$Dom.QuerySelector(".js-main-text", el).classList.add('text-[1.2rem]');
				$Dom.QuerySelector(".js-time-text", el).classList.add('text-[1.2rem]');
				const badge = $Dom.QuerySelector(".js-day-badge", el);
				badge.classList.add('w-20', 'h-10', 'text-[1.2rem]'); // テンプレート側のサイズクラスを上書き
			} else {
				el.classList.add('gap-4');
				$Dom.QuerySelector(".js-main-text", el).classList.add('text-[1rem]');
				$Dom.QuerySelector(".js-time-text", el).classList.add('text-[1rem]');
				const badge = $Dom.QuerySelector(".js-day-badge", el);
				badge.classList.add('w-16', 'h-8', 'text-[0.9rem]'); // テンプレート側のサイズクラスを上書き
			}
			// 2. データの流し込み（Formatterで加工済みの値を信頼して代入）
			const mainText = $Dom.QuerySelector(".js-main-text", el);
			let dateText = detail.memo_date;
			if (!detail.is_owner && dateText) {
				const mask = $Data.Formatter._getMask(dateText);
				// まとめ表示中かつDay設定がある場合
				if (detail.display_day > 0) {
					dateText = (detail.display_day === 1) ? `${mask} 1 Day` : `${detail.display_day} Day`;
				} else {
					dateText = mask;
				}
			}
			mainText.textContent = dateText;
			const timeEl = $Dom.QuerySelector(".js-time-text", el);
			if (detail.memo_time) {
				timeEl.textContent = detail.memo_time;
			} else {
				$Dom.ToggleShow(timeEl, false);
			}
			// 3. DAYバッジ制御
			if (detail.display_day > 0 && $App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.SEARCH) {
				const badge = $Dom.QuerySelector(".js-day-badge", el);
				$Dom.ToggleShow(badge, true);
				$Dom.QuerySelector(".js-day-text", badge).textContent = `${detail.display_day} Day`;
			}
			parentEl.appendChild(el);
		},
    },
	// 初期化
	Init(){
		// 本体初期化
		_UI_Core.init();
		// 初期処理
		this.ChangeTheme($App.AppData.Owner.Theme);
		// アイコンバー
		$Bar.Init();
		$Bar.Init();
		// 詳細画面
		$DetailFrame.Init();
		$DetailContent.Init();
		// 地図
		$Map.Init();
	},
    // 画面モード変更時
    ChangeScreenMode(){
		const mode = $App.AppData.Context.ScreenMode;
        // 通知バー
        switch (mode) {
            case $Const.SCREEN_MODE.CREATE:
                $UI.UpdateNoticeBarText("「＋」ボタンで地点メモを作成することができます");
                break;
            case $Const.SCREEN_MODE.ARCHIVE:
                $UI.UpdateNoticeBarText("画面下部の「操作ボタン」で各メモを移動できます");
                break;
            case $Const.SCREEN_MODE.ARCHIVE_PUB:
                $UI.UpdateNoticeBarText("公開データは「Open」にしないと公開されません");
                break;
            case $Const.SCREEN_MODE.SEARCH:
                $UI.UpdateNoticeBarText("画面範囲内のメモを検索できます");
                break;
            default:
				$Dialog.ShowLoginDialog();
                return;
        }
		// アイコンバー
		$Bar.ChangeScreenMode();
		$Bar.ChangeScreenMode();
		// 詳細画面
		$DetailFrame.ChangeScreenMode();
		$DetailContent.ChangeScreenMode();
		// 地図
		// $Marker.Clear();
		if (mode != $Const.SCREEN_MODE.SEARCH) {$Marker.RefreshPointMarker();}
	},
	// カラーテーマの変更
	ChangeTheme(theme){
        _UI_Core.setTheme(theme);
	},
	// 通知領域テキスト表示
	UpdateNoticeBarText(word){
		_UI_Core.updateNoticeBarText(word);
	},
	// アイコンバーの開閉
	ToggleIconBar(isShow){
		$Bar.ToggleRoot(isShow);
		$Bar.ToggleRoot(isShow);
	},
	// フォントサイズの変更
	ChangeFontSize(size){
        // const sizes = { small: '14px', standard: '16px', large: '18px' };
        // document.documentElement.style.fontSize = sizes[size] || sizes.standard;
		document.documentElement.setAttribute('data-font-size', size || 'standard');
	},
	// 通知バッヂの更新
	UpdateNoticeBadge() {
		// 下段バーのバッヂ更新
		$Bar.UpdateNoticeBadge();
		// ダイアログのバッヂ更新
		$Dialog.UpdateNoticeBadgeDialog();
	},
	// GPSボタンの表示切替
    ToggleGpsButton(isOn) {
        const btn = document.getElementById('btn-map-gps-toggle');
        if (!btn) return;
        if (isOn) {
            // ONのスタイル（発光する緑）
            btn.classList.remove('bg-slate-700', 'text-slate-600', 'border-slate-600', 'shadow-md');
            btn.classList.add(
                'bg-emerald-500', 
                'text-white', 
                'border-emerald-400', 
                'shadow-[0_0_20px_rgba(16,185,129,0.8)]'
            );
        } else {
            // OFFのスタイル（沈んだダークグレー）
            btn.classList.remove(
                'bg-emerald-500', 
                'text-white', 
                'border-emerald-400', 
                'shadow-[0_0_20px_rgba(16,185,129,0.8)]'
            );
            btn.classList.add('bg-slate-700', 'text-slate-600', 'border-slate-600', 'shadow-md');
        }
    },
};

// Public
export default UI_Manager;
