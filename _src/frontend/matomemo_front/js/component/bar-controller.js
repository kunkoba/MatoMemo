// BarController: 上部バーおよび下部バーの統合制御
const _BarCore = {
    // 初期化
    init_2() {
        if (!this.rootTop) {
            // 要素取得：共通
            this.rootTop = $Dom.GetElementById('ui-top-bar');
            this.rootBot = $Dom.GetElementById('ui-bottom-bar');
            // 要素取得：上部バー関連
            this.btnArchiveTitle = $Dom.GetElementById('ui-archive-title');
            this.uiSortGroup = $Dom.GetElementById('ui-sort-group');
            this.sortField = $Dom.GetElementById('sort-field');
            this.sortReaction = $Dom.GetElementById('sort-reaction');
            this.sortWord = $Dom.GetElementById('sort-word');
            this.sortFeel = $Dom.GetElementById('sort-feel');
            this.btnMarkerEmoji = $Dom.GetElementById('btn-marker-mode-emoji');
            this.btnMarkerFeel = $Dom.GetElementById('btn-marker-mode-feel');
            // 要素取得：下部バー関連
            this.btnSysMenu = $Dom.GetElementById('btn-sys-menu');
            this.btnUserMenu = $Dom.GetElementById('btn-user-menu');
            this.btnDataMenu = $Dom.GetElementById('btn-data-menu');
            this.btnAppMenu = $Dom.GetElementById('btn-app-menu');
            this.groupAction = $Dom.GetElementById('bot-group-action');
            this.btnCreate = $Dom.GetElementById('btn-create');
            this.btnSearch = $Dom.GetElementById('btn-search');
            this.groupMove = $Dom.GetElementById('bot-group-move');
            this.btnFirst = $Dom.GetElementById('btn-bot-move-first');
            this.btnPrev = $Dom.GetElementById('btn-bot-move-prev');
            this.btnOpen = $Dom.GetElementById('btn-bot-move-open');
            this.btnNext = $Dom.GetElementById('btn-bot-move-next');
            this.btnLast = $Dom.GetElementById('btn-bot-move-last');
            this.btnMainToggle = $Dom.GetElementById('main-menu-btn');
            this.btnListBtn = $Dom.GetElementById('point-list-btn');
            this.btnMapSwitch = $Dom.GetElementById('btn-map-main-switch');
            // スイッチクリックイベント
            this.btnMapSwitch.onclick = () => {
                const next = !$App.AppData.Context.IsMapSwitchOn;
                $App.AppData.Context.IsMapSwitchOn = next;
                this._updateMainSwitchUI(next);
            };
            // イベント登録：上部バー
            this.btnArchiveTitle.addEventListener('click', () => $Dialog.ShowArchiveInfo());
            [this.btnMarkerEmoji, this.btnMarkerFeel].forEach(btn => {
                btn.addEventListener('click', () => this.updateMarkerMode(btn.dataset.mode));
            });
            this.sortField.addEventListener("click", (e) => {
                const btn = e.target.closest("button");
                if (!btn) return;
                $Dom.QuerySelectorAll("button", this.sortField).forEach(b => {
                    b.classList.replace("bg-brand-3", "bg-brand-0");
                });
                btn.classList.replace("bg-brand-0", "bg-brand-3");
                const val = btn.dataset.value;
                if (this.sortReaction) $Dom.ToggleShow(this.sortReaction, val === '3');
                if (this.sortWord) $Dom.ToggleShow(this.sortWord, val === '4');
                if (this.sortFeel) $Dom.ToggleShow(this.sortFeel, val === '5');
            });
            // 動的ボタン生成：Feel
            if (this.sortFeel) {
                const feelTypes = Object.values($Const.FEEL_TYPE);
                this.sortFeel.innerHTML = feelTypes.map((f, idx) => `
                    <button data-value="${f.val}" class="ui-btn h-full px-4 transition-colors flex items-center 
                        ${idx === 0 ? 'bg-brand-3' : 'bg-brand-0'} ${f.val == 0 ? 'hidden' : ''}">
                        <img src="${f.path}" class="w-7 h-7 object-contain pointer-events-none">
                    </button>`).join('');
                this.sortFeel.onclick = (e) => {
                    const btn = e.target.closest("button");
                    if (!btn) return;
                    $Dom.QuerySelectorAll("button", this.sortFeel).forEach(b => b.classList.replace("bg-brand-3", "bg-brand-0"));
                    btn.classList.replace("bg-brand-0", "bg-brand-3");
                };
            }
            // 動的ボタン生成：Reaction
            if (this.sortReaction) {
                this.sortReaction.innerHTML = Object.values($Const.REACTION_TYPE).map((t, idx) => `
                    <button data-value="${t.id}" class="ui-btn h-full px-3 transition-colors ${idx === 0 ? 'bg-brand-3' : 'bg-brand-0'}">
                        ${t.emoji}
                    </button>`).join('');
                this.sortReaction.onclick = (e) => {
                    const btn = e.target.closest("button");
                    if (!btn) return;
                    $Dom.QuerySelectorAll("button", this.sortReaction).forEach(b => b.classList.replace("bg-brand-3", "bg-brand-0"));
                    btn.classList.replace("bg-brand-0", "bg-brand-3");
                };
            }
            // イベント登録：下部バー
            this.btnSysMenu.onclick = () => $Dialog.ShowSystemMenu();
            this.btnUserMenu.onclick = () => $Dialog.ShowUserMenu();
            this.btnDataMenu.onclick = () => $Dialog.ShowDataMenu();
            this.btnAppMenu.onclick = () => $Dialog.ShowActionMenu();
            this.btnMainToggle.onclick = () => $Dialog.ShowMainMenu();
            if (this.btnListBtn) {
                this.btnListBtn.onclick = () => ($App.AppData.Context.ScreenMode === $Const.SCREEN_MODE.SEARCH) 
                    ? $Dialog.ShowDetailsSearchResult() : $Dialog.ShowDetailsTimeLine();
            }
            this.btnFirst.onclick = () => $Marker.FocusFirst();
            this.btnPrev.onclick = () => $Marker.FocusPrev();
            this.btnNext.onclick = () => $Marker.FocusNext();
            this.btnLast.onclick = () => $Marker.FocusLast();
            this.btnOpen.onclick = () => $DetailFrame.Open($Marker.GetDataWithCurrentIndex());
            this.btnCreate.onclick = () => {
                if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.CREATE) {
                    $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.CREATE;
                    $App.RefreshScreen();
                    return;
                }
                $Marker.RefreshCurrentArrow();
                $Marker.FocusToLocationMarker();
                setTimeout(() => $DetailFrame.Open(), 100);
            };
            this.btnSearch.onclick = async () => {
                if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.SEARCH) {
                    $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.SEARCH;
                    $App.RefreshScreen();
                    return;
                }
                const params = { ...$Map.GetSearchRange(0.8), ...this.getSortSetting(), limit: 20 };
                $Data.Clear();
                if (await $Data.Access.SearchByLocationPub(params)) {
                    if ($Data.Store.GetDetails().length > 0) $Marker.RefreshPointMarker();
                    else $Notice.Info("データが見つかりませんでした。");
                }
            };
        }
    },
	// 上下バーの初期化・要素取得・イベント登録
    init() {
        if (this.rootTop) return; // 二重初期化防止
        // 1. 基盤要素の取得
        this.rootTop = $Dom.GetElementById('ui-top-bar');
        this.rootBot = $Dom.GetElementById('ui-bottom-bar');
        // 2. 上部バー要素の取得
        this.btnArchiveTitle = $Dom.GetElementById('ui-archive-title');
        this.uiSortGroup = $Dom.GetElementById('ui-sort-group');
        this.sortField = $Dom.GetElementById('sort-field');
        this.sortReaction = $Dom.GetElementById('sort-reaction');
        this.sortWord = $Dom.GetElementById('sort-word');
        this.sortFeel = $Dom.GetElementById('sort-feel');
        this.btnMarkerEmoji = $Dom.GetElementById('btn-marker-mode-emoji');
        this.btnMarkerFeel = $Dom.GetElementById('btn-marker-mode-feel');
        // 3. 下部バー要素の取得
        this.btnSysMenu = $Dom.GetElementById('btn-sys-menu');
        this.btnUserMenu = $Dom.GetElementById('btn-user-menu');
        this.btnDataMenu = $Dom.GetElementById('btn-data-menu');
        this.btnAppMenu = $Dom.GetElementById('btn-app-menu');
        this.groupAction = $Dom.GetElementById('bot-group-action');
        this.btnCreate = $Dom.GetElementById('btn-create');
        this.btnSearch = $Dom.GetElementById('btn-search');
        this.groupMove = $Dom.GetElementById('bot-group-move');
        this.btnFirst = $Dom.GetElementById('btn-bot-move-first');
        this.btnPrev = $Dom.GetElementById('btn-bot-move-prev');
        this.btnOpen = $Dom.GetElementById('btn-bot-move-open');
        this.btnNext = $Dom.GetElementById('btn-bot-move-next');
        this.btnLast = $Dom.GetElementById('btn-bot-move-last');
        this.btnMainToggle = $Dom.GetElementById('main-menu-btn');
        this.btnListBtn = $Dom.GetElementById('point-list-btn');
        // 4. マップスイッチ要素（ON/OFF完全体）の取得
        this.btnSwitchOn = $Dom.GetElementById('btn-map-switch-on');
        this.btnSwitchOff = $Dom.GetElementById('btn-map-switch-off');
        // 5. イベント登録：上部バー
        this.btnArchiveTitle.onclick = () => $Dialog.ShowArchiveInfo();
        [this.btnMarkerEmoji, this.btnMarkerFeel].forEach(btn => {
            btn.onclick = () => this.updateMarkerMode(btn.dataset.mode);
        });
        this.sortField.onclick = (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            $Dom.QuerySelectorAll("button", this.sortField).forEach(b => b.classList.replace("bg-brand-3", "bg-brand-0"));
            btn.classList.replace("bg-brand-0", "bg-brand-3");
            const v = btn.dataset.value;
            if (this.sortReaction) $Dom.ToggleShow(this.sortReaction, v === '3');
            if (this.sortWord) $Dom.ToggleShow(this.sortWord, v === '4');
            if (this.sortFeel) $Dom.ToggleShow(this.sortFeel, v === '5');
        };
        // 6. 動的ボタン生成：Feel（NORMAL除外）
        if (this.sortFeel) {
            this.sortFeel.innerHTML = Object.values($Const.FEEL_TYPE).filter(f => f.val !== 0).map((f, idx) => `
                <button data-value="${f.val}" class="ui-btn h-full px-4 transition-colors flex items-center 
                    ${idx === 0 ? 'bg-brand-3' : 'bg-brand-0'}">
                    <img src="${f.path}" class="w-7 h-7 object-contain pointer-events-none">
                </button>`).join('');
            this.sortFeel.onclick = (e) => {
                const btn = e.target.closest("button");
                if (!btn) return;
                $Dom.QuerySelectorAll("button", this.sortFeel).forEach(b => b.classList.replace("bg-brand-3", "bg-brand-0"));
                btn.classList.replace("bg-brand-0", "bg-brand-3");
            };
        }
        // 7. 動的ボタン生成：Reaction
        if (this.sortReaction) {
            this.sortReaction.innerHTML = Object.values($Const.REACTION_TYPE).map((t, idx) => `
                <button data-value="${t.id}" class="ui-btn h-full px-3 transition-colors ${idx === 0 ? 'bg-brand-3' : 'bg-brand-0'}">
                    ${t.emoji}
                </button>`).join('');
            this.sortReaction.onclick = (e) => {
                const btn = e.target.closest("button");
                if (!btn) return;
                $Dom.QuerySelectorAll("button", this.sortReaction).forEach(b => b.classList.replace("bg-brand-3", "bg-brand-0"));
                btn.classList.replace("bg-brand-0", "bg-brand-3");
            };
        }
        // 8. イベント登録：下部バー
        this.btnSysMenu.onclick = () => $Dialog.ShowSystemMenu();
        this.btnUserMenu.onclick = () => $Dialog.ShowUserMenu();
        this.btnDataMenu.onclick = () => $Dialog.ShowDataMenu();
        this.btnAppMenu.onclick = () => $Dialog.ShowActionMenu();
        this.btnMainToggle.onclick = () => $Dialog.ShowMainMenu();
        if (this.btnListBtn) {
            this.btnListBtn.onclick = () => ($App.AppData.Context.ScreenMode === $Const.SCREEN_MODE.SEARCH) 
                ? $Dialog.ShowDetailsSearchResult() : $Dialog.ShowDetailsTimeLine();
        }
        this.btnFirst.onclick = () => $Marker.FocusFirst();
        this.btnPrev.onclick = () => $Marker.FocusPrev();
        this.btnNext.onclick = () => $Marker.FocusNext();
        this.btnLast.onclick = () => $Marker.FocusLast();
        this.btnOpen.onclick = () => $DetailFrame.Open($Marker.GetDataWithCurrentIndex());
        this.btnCreate.onclick = () => {
            if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.CREATE) {
                $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.CREATE;
                $App.RefreshScreen(); return;
            }
            $Marker.RefreshCurrentArrow(); $Marker.FocusToLocationMarker();
            setTimeout(() => $DetailFrame.Open(), 100);
        };
        this.btnSearch.onclick = async () => {
            if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.SEARCH) {
                $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.SEARCH;
                $App.RefreshScreen(); return;
            }
            const p = { ...$Map.GetSearchRange(0.8), ...this.getSortSetting(), limit: 20 };
            $Data.Clear();
            if (await $Data.Access.SearchByLocationPub(p)) {
                if ($Data.Store.GetDetails().length > 0) $Marker.RefreshPointMarker();
                else $Notice.Info("データが見つかりませんでした。");
            }
        };
        // 9. マップスイッチ：イベント登録と初期反映
        const toggleMap = () => {
            $App.AppData.Context.IsMapSwitchOn = !$App.AppData.Context.IsMapSwitchOn;
            this._updateMainSwitchUI($App.AppData.Context.IsMapSwitchOn);
        };
        this.btnSwitchOn.onclick = toggleMap;
        this.btnSwitchOff.onclick = toggleMap;
        this._updateMainSwitchUI($App.AppData.Context.IsMapSwitchOn);
    },
    // スイッチ表示とUI連動の更新
    _updateMainSwitchUI(isOn) {
        // 1. ボタン自体の表示切替（完全体ボタンの出し分けのみ行う）
        $Dom.ToggleShow(this.btnSwitchOn, isOn);
        $Dom.ToggleShow(this.btnSwitchOff, !isOn);
        // 2. 特定要素の表示切替（①タイトル ②共通操作バー）
        const mode = $App.AppData.Context.ScreenMode;
        const isArc = (mode === $Const.SCREEN_MODE.ARCHIVE || mode === $Const.SCREEN_MODE.ARCHIVE_PUB);
        // タイトル表示の連動
        if (isArc) $Dom.ToggleShow(this.btnArchiveTitle, isOn);
        // 共通操作バー（メニュー）の連動
        if (this.btnSysMenu) {
            $Dom.ToggleShow(this.btnSysMenu.parentElement, isOn);
        }
    },
    // 画面モード変更：上下バーのレイアウト一括更新
    changeScreenMode() {
        const mode = $App.AppData.Context.ScreenMode;
        // 上部状態リセット
        $Dom.ToggleShow(this.btnArchiveTitle, false);
        $Dom.ToggleShow(this.uiSortGroup, false);
        // 下部状態リセット
        $Dom.ToggleShow(this.groupMove, false);
        $Dom.ToggleShow(this.groupAction, false);
        const actOn = ["w-14", "h-14", "text-[1.5rem]", "bg-brand-1", "active:scale-95", "z-10"];
        const actOff = ["w-10", "h-10", "text-[1rem]", "bg-white", "opacity-70", "z-0"];
        // モード別分岐
		if (mode === $Const.SCREEN_MODE.CREATE) {
            $Dom.ToggleShow(this.groupAction, true);
            // 作法：複数クラスは remove/add を使用する
            this.btnCreate.classList.remove(...actOff);
            this.btnCreate.classList.add(...actOn);
            this.btnSearch.classList.remove(...actOn);
            this.btnSearch.classList.add(...actOff);
        } else if (mode === $Const.SCREEN_MODE.SEARCH) {
            $Dom.ToggleShow(this.uiSortGroup, true);
            $Dom.ToggleShow(this.groupAction, true);
            this.btnSearch.classList.remove(...actOff);
            this.btnSearch.classList.add(...actOn);
            this.btnCreate.classList.remove(...actOn);
            this.btnCreate.classList.add(...actOff);
        } else if (mode === $Const.SCREEN_MODE.ARCHIVE || mode === $Const.SCREEN_MODE.ARCHIVE_PUB) {
            $Dom.ToggleShow(this.btnArchiveTitle, true);
            $Dom.ToggleShow(this.groupMove, true);
        }
    },
    // マーカー表示モード更新
    updateMarkerMode(mode) {
        $App.AppData.Context.MarkerMode = mode;
        const isEmoji = mode === $Const.MARKER_MODE.EMOJI;
        this.btnMarkerEmoji.classList.toggle('bg-brand-3', isEmoji);
        this.btnMarkerEmoji.classList.toggle('bg-brand-0', !isEmoji);
        this.btnMarkerFeel.classList.toggle('bg-brand-3', !isEmoji);
        this.btnMarkerFeel.classList.toggle('bg-brand-0', isEmoji);
        $Marker.RefreshPointMarker();
    },
    // まとめタイトル更新
    changeTitle(title) {
        const arc = $Data.Store.GetArchive();
        const icon = $Dom.QuerySelector('.js-icon', this.btnArchiveTitle);
        const text = $Dom.QuerySelector('.js-text', this.btnArchiveTitle);
        if (text) text.textContent = title;
        if (!arc) return;
        this.btnArchiveTitle.classList.remove("bg-black/50", "bg-brand-5", "bg-slate-800/50");
        if (!arc.is_public) {
            this.btnArchiveTitle.classList.add("bg-black/50");
            if (icon) icon.textContent = "🔒";
        } else {
            if (arc.closed_flg) {
                this.btnArchiveTitle.classList.add("bg-slate-800/50");
                if (icon) icon.textContent = "－";
            } else {
                this.btnArchiveTitle.classList.add("bg-brand-5");
                if (icon) icon.textContent = "◎";
            }
        }
    },
    // 検索設定取得
    getSortSetting() {
        const field = this._getSelectedValue(this.sortField);
        const input = $Dom.GetElementById('input-sort-word');
        return {
            isPublic: true,
            sortField: parseInt(field || '1', 10),
            reactionType: field === '3' ? parseInt(this._getSelectedValue(this.sortReaction), 10) : null,
            keyword: field === '4' ? input?.value.trim() : null,
            feelType: field === '5' ? parseInt(this._getSelectedValue(this.sortFeel), 10) : null
        };
    },
    // 値取得ヘルパー
    _getSelectedValue(el) {
        return $Dom.QuerySelector("button.bg-brand-3", el)?.dataset.value;
    },
    // 新着バッジ更新
    updateNoticeBadge() {
        const unreadN = $App.AppData.Context.UnreadNoticeCount || 0;
        const unreadM = $App.AppData.Context.UnreadMailCount || 0;
        const hasL = !!$App.AppData.Context.HasLegalUpdate;
        $UI.Generator.ApplyNewBadge(this.btnSysMenu, (unreadN + unreadM + (hasL ? 1 : 0)) > 0, 'dot');
        $UI.Generator.ApplyNewBadge(this.btnUserMenu, unreadM > 0, 'dot');
    },
    // ユーザアイコン更新
    updateUserIcon() {
        const icon = $App.AppData.Owner.SystemInfo?.ownerProfile?.icon;
        if (icon) this.btnUserMenu.textContent = icon;
    }
};

// 公開窓口
const BarController = {
    Init() { _BarCore.init(); },
    ChangeScreenMode() { _BarCore.changeScreenMode(); },
    ToggleRoot(isOpen) {
        $Dom.ToggleShow(_BarCore.rootTop, isOpen);
        $Dom.ToggleShow(_BarCore.rootBot, isOpen);
    },
    ChangeTitle(title) { _BarCore.changeTitle(title); },
    GetSortSetting() { return _BarCore.getSortSetting(); },
    UpdateNoticeBadge() { _BarCore.updateNoticeBadge(); },
    UpdateUserIcon() { _BarCore.updateUserIcon(); }
};

export default BarController;
