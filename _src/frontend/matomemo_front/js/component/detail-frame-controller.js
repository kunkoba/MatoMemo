// UI操作
const _DetailFrameCore = {
    _elementId: "ui-detail-frame-id",
    // 初期化
    init() {
		if (!this.root) {
            // 要素取得
            {
                this.root = $Dom.GetElementById(this._elementId);
                this.btnCurrent = $Dom.GetElementById("detail-btn-current");
                this.btnEarth = $Dom.GetElementById("detail-btn-earth");
                this.btnMap  = $Dom.GetElementById("detail-btn-map");
                this.btnEdit = $Dom.GetElementById("detail-btn-edit");
                this.btnReport = $Dom.GetElementById("detail-btn-report");
                this.btnClose = $Dom.GetElementById("detail-btn-close");
                this.btnCancel = $Dom.GetElementById("detail-btn-cancel");
                this.btnCancel2 = $Dom.GetElementById("detail-btn-cancel2");
                this.btnSave = $Dom.GetElementById("detail-btn-save");
                this.footer = $Dom.GetElementById("detail-footer-id");
                this.groupEdit = $Dom.GetElementById("detail-group-edit");
                // ★追加：SEARCHモード用アクション
                this.groupSearchAction = $Dom.GetElementById("detail-group-search-action");
                this.btnJumpArchive = $Dom.GetElementById("detail-btn-jump-archive");
                this.txtJumpArchiveTitle = $Dom.GetElementById("detail-jump-archive-title"); // タイトル表示用
                // 下部ボタン
                this.groupMove = $Dom.GetElementById("detail-group-move");
                this.btnMoveFirst = $Dom.GetElementById("detail-btn-first");
                this.btnMovePrev = $Dom.GetElementById("detail-btn-prev");
                this.btnMoveNext = $Dom.GetElementById("detail-btn-next");
                this.btnMoveLast = $Dom.GetElementById("detail-btn-last");
                this.groupReaction = $Dom.GetElementById("detail-group-reaction");
                // リアクションボタンを定数から一括生成・登録
                this.reactionButtons = {};
                this.groupReaction.innerHTML = "";
                Object.values($Const.REACTION_TYPE).forEach(type => {
                    const btn = document.createElement("button");
                    btn.id = type.btnId;
                    // デフォルトは未選択（目立たない）状態
                    btn.className = "flex-1 rounded-[1rem] py-2 flex flex-col items-center justify-center active:scale-95 transition-all disabled:opacity-50 bg-slate-50 border-2 border-transparent shadow-sm";
                    btn.innerHTML = `
                        <span class="kb-icon-emoji-lg mb-1">${type.emoji}</span>
                        <span class="js-count text-[0.9rem] font-bold text-slate-600">0</span>
                    `;
                    this.groupReaction.appendChild(btn);
                    this.reactionButtons[type.id] = btn;
                    btn.addEventListener("click", () => this._onReactionClick(type));
                });
                // 
                this.mapBarrier = $Dom.GetElementById("ui-map-barrier");
            }
            // イベント登録
            {
                // 現在地移動（アプリメニューと同じ処理）
                this.btnCurrent.addEventListener("click", () => {
                    // 1. 地図とマーカーの移動は既存の処理に「投げっぱなし」にする
                    $Marker.RefreshCurrentLocation();
                    $Marker.FocusToLocationMarker();
                });
                // Google Earth連携（追加）
                this.btnEarth.addEventListener("click", async () => {
                    const isOk = await $Dialog.ShowConfirm({
                        title: "google Earth",
                        help: "",
                        message: `「google Earth」を開きますか？`
                    });
                    if (!isOk) return;
                    const data = $DetailContent.GetFormEditData();
                    if (data.latitude && data.longitude) {
                        const url = `https://earth.google.com/web/search/${data.latitude},${data.longitude}`;
                        // window.open(url, '_blank');
                        $Util.OpenExternalLink(url);
                    }
                });
                // googleMap連携
                this.btnMap.addEventListener("click", async () => {
                    const isOk = await $Dialog.ShowConfirm({
                        title: "google Map",
                        help: "",
                        message: `「google Map」を開きますか？`
                    });
                    if (!isOk) return;
                    // 画面上の緯度経度を取得（getFormEditDataを利用）
                    const data = $DetailContent.GetFormEditData();
                    if (data.latitude && data.longitude) {
                        const url = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
                        // window.open(url, '_blank');
                        $Util.OpenExternalLink(url);
                    }
                });
                // ★追加：まとめアーカイブへ飛ぶ（フッターボタン）
                this.btnJumpArchive.addEventListener("click", async () => {
                    const data = $DetailContent.GetFormEditData();
                    if (!data || !data.archive_id) return;
                    const isOk = await $Dialog.ShowConfirm({
                        title: "Archive",
                        help: "",
                        message: `このまとめを開きますか？`
                    });
                    if (!isOk) return;
                    this.handleCloseOrCancel(); // 詳細パネルを閉じる
                    $App.AppData.Context.ScreenMode = data.is_public ? $Const.SCREEN_MODE.ARCHIVE_PUB : $Const.SCREEN_MODE.ARCHIVE;
                    $App.AppData.Context.TargetArchiveId = data.archive_id;
                    $App.AppData.Context.TargetSeq = data.seq; // この地点にフォーカスを当てる
                    await $App.RefreshScreen();
                });
                // 通報ボタンクリック時の処理
                this.btnReport.addEventListener("click", () => {
                    const data = $DetailContent.GetFormEditData();
                    if (!data || !data.archive_id) return;
                    let targetUserId = data.user_id; // 明細に直接IDがあればそれを使う
                    const archive = $Data.Store.GetArchive();
                    // 現在開いているアーカイブが一致すれば、そこからオーナーIDを取得
                    if (archive && archive.archive_id === data.archive_id) {
                        targetUserId = archive.user_id;
                    }
                    if (!targetUserId) {
                        $Notice.Warn("ユーザー情報が取得できないため通報できません。");
                        return;
                    }
                    // 擬似的なarchiveオブジェクトを作ってダイアログへ渡す
                    $Dialog.ShowReportPost({
                        archive_id: data.archive_id,
                        user_id: targetUserId
                    });
                });
                // 編集切替ボタン
                this.btnEdit.addEventListener("click", () => {
                    const data = $DetailContent.GetFormEditData();
                    console.log("btnEdit:", data);
                    const currentData = $Data.Store.GetDetailByKey(data.archive_id, data.seq, data.dbid);
                    if (currentData) {
                        $DetailContent.RenderDetail(currentData, true); // 編集モード
                        $Dom.ToggleShow(this.footer, true); // フッターは表示したままにする
                        $Dom.ToggleShow(this.groupEdit, true); // 編集用ボタングループを表示
                        $Dom.ToggleShow(this.btnEdit, false); // 編集ボタン隠す
                        $Dom.ToggleShow(this.groupMove, false);
                        $Dom.ToggleShow(this.groupReaction, false);
                        // SAVEボタンとCANCELボタンを表示
                        $Dom.ToggleShow(this.btnSave, true);
                        $Dom.ToggleShow(this.btnCancel, true);
                    }
                });
                // 保存ボタン
                this.btnSave.addEventListener("click", async () => {
                    // まずUI側の未入力項目を補完し、ユーザーの目に見える状態にする
                    await $DetailContent.FillEmptyFieldsUI();
                    // フォームのデータを取得
                    const detail = $DetailContent.GetFormEditData();
                    // バリデーション実行 ---
                    const isValid = $DetailContent.Validate(detail);
                    if (!isValid) return; // 失敗時はここで中断（NoticeはValidate内で出している）
                    // 確認ダイアログ
                    const isOk = await $Dialog.ShowConfirm({
                        title: "保存前確認",
                        message: "保存してもよろしいですか？",
                        help: "",
                        label: "OK"
                    });
                    if (!isOk) return;
                    // 保存処理
                    await $Warn.CatchAsync(async () => {
                        if (detail.seq > 0) {
                            // サーバ保存されている場合は直接APIをキック
                            if (!$App.AppData.Context.IsOnline) {
                                $Notice.Warn("オフライン時は、サーバーに保存済みのデータを編集できません。");
                                return;
                            }
                            const archive = $Data.Store.GetArchive();
                            const isPublic = detail.is_public || archive?.is_public;
                            let isSuccess = false;
                            // 公開データか非公開データかでAPIを分岐
                            if (isPublic) {
                                isSuccess = await $Data.Access.UpdateDetailPub(detail);
                            } else {
                                isSuccess = await $Data.Access.UpdateDetail(detail);
                            }
                            if (!isSuccess) return; // API更新に失敗した場合は中断
                        } else {
                            // 未同期（seq = 0）のデータはローカルへ新規更新（バックグラウンドで同期される）
                            await $LocalDb.Detail.Save(detail);
                        }
                        // API更新(メモリの更新)
                        await $Data.Store.UpdateDetail(detail);
                        // 描画更新
                        $Marker.RefreshPointMarker();
                        // $Marker.RefreshCurrentLocation();
                        // パネルを閉じる
                        this.toggleDetailPanel(false);
                        // 通知
                        $Notice.Info("保存しました。");
                    })();
                });
                this.btnClose.addEventListener("click", () => this.handleCloseOrCancel());
                this.btnCancel.addEventListener("click", () => this.handleCloseOrCancel());
                this.btnCancel2.addEventListener("click", () => this.handleCloseOrCancel());
                // 移動ボタン
                this.btnMoveFirst.addEventListener("click", () => this._moveAndRender(() => $Marker.FocusFirst()));
                this.btnMovePrev.addEventListener("click",  () => this._moveAndRender(() => $Marker.FocusPrev()));
                this.btnMoveNext.addEventListener("click",  () => this._moveAndRender(() => $Marker.FocusNext()));
                this.btnMoveLast.addEventListener("click",  () => this._moveAndRender(() => $Marker.FocusLast()));
                this.mapBarrier.addEventListener("click", () => this.handleCloseOrCancel());
            }
        }
    },
    // キャンセル
    handleCloseOrCancel() {
        const data = $DetailContent.GetFormEditData();
        const isNew = (!data || !data.seq || data.seq == 0);
        const isEditMode = !this.btnSave.classList.contains("hidden");
        if (isNew) {
            this.toggleDetailPanel(false);
        } else if (isEditMode) {
            const currentData = $Data.Store.GetDetailByKey(data.archive_id, data.seq);
            $DetailFrame.Open(currentData); 
        } else {
            this.toggleDetailPanel(false);
        }
    },
    // 画面モード変更時
    changeScreenMode(){
        $Dom.ToggleShow(this.btnCancel, false);
        $Dom.ToggleShow(this.btnSave, false);
        $Dom.ToggleShow(this.groupMove, false);
        $Dom.ToggleShow(this.groupReaction, false);
        switch ($App.AppData.Context.ScreenMode) {
            case $Const.SCREEN_MODE.CREATE:
                // 新規登録
                $Dom.ToggleShow(this.groupEdit, true);
                $Dom.ToggleShow(this.btnCancel, true);
                $Dom.ToggleShow(this.btnSave, true);
                break;
            case $Const.SCREEN_MODE.ARCHIVE:
			case $Const.SCREEN_MODE.ARCHIVE_PUB:
                // まとめ参照
                $Dom.ToggleShow(this.groupMove, true);
                $Dom.ToggleShow(this.groupReaction, true);
                break;
            case $Const.SCREEN_MODE.SEARCH:
                // 地図検索
                break;
            default:
                // どれにも当てはまらないとき
                break;
        }
    },
    // 移動して詳細画面表示
    _moveAndRender(callback) {
        // 引数として渡された実行処理（アロー関数）を呼び出す
        callback();
        // 移動後のデータを取得して反映
        const detail = $Marker.GetDataWithCurrentIndex();
        $DetailContent.RenderDetail(detail);
        // リアクションも再描画する
        this.renderReactions(detail);
    },
    // 詳細パネルの開閉と関連UIの更新
    toggleDetailPanel(isShow) {
        // パネル占有サイズ設定
        const PANEL_WIDTH = '500px';
        const PANEL_HEIGHT = '80%';
        // 広告差分計算
        const isMobile = window.innerWidth < 768;
        // メイン処理
        if (isShow) {
            $Map.LockMap(true);
            // バリアを展開（マーカーへのタッチを防ぐ）
            if (this.mapBarrier) $Dom.ToggleShow(this.mapBarrier, true);
            // 詳細画面のサイズ
            if (isMobile) {
                this.root.style.height = PANEL_HEIGHT;
                this.root.style.width = "100%";
            } else {
                this.root.style.width = PANEL_WIDTH;
                this.root.style.height = "100%";
            }
            // this.root.style.borderWidth = "2px";
            this.root.classList.remove("opacity-0", "translate-y-full");
            this.root.classList.add("opacity-100", "translate-y-0");
            // このタイミングで移動（Mapのリサイズ含み）
            $Marker.FocusToCurrentMarker();
        } else {
            // バリアを解除
            if (this.mapBarrier) $Dom.ToggleShow(this.mapBarrier, false);
            // パネルを閉じる時に環境エフェクトをオフにし、奥に戻す
            if (typeof Atmosphere !== 'undefined') {
                Atmosphere.hide();
                if (Atmosphere.canvas) Atmosphere.canvas.style.zIndex = '0';
            }
            $Map.LockMap(false);
            // 詳細画面のサイズ
            if (isMobile) {
                this.root.style.height = "0";
            } else {
                this.root.style.width = "0";
            }
            // 詳細画面のサイズ
            this.root.style.borderWidth = "0";
            this.root.classList.remove("opacity-100", "translate-y-0");
            this.root.classList.add("opacity-0", "translate-y-full");
            // シンプルにリサイズだけを呼ぶ
            $Map.ResizeMap(400);
            // パネルを閉じる処理の最後
            $App.ResumeGpsTracking(); // ★パネルを閉じる際にGPSを再開
        }
        // アイコン表示切替
        $UI.ToggleIconBar(!isShow);
    },
    // リアクションのカウントと状態を反映する
    async renderReactions_2(detail) {
        if (!detail) return;
        const isSearch = $App.AppData.Context.ScreenMode === $Const.SCREEN_MODE.SEARCH;
        // 検索時はローカルDBを参照せず、読み取り専用として扱う
        const myLocal = isSearch ? {} : (await $LocalDb.Reaction.Get(detail.archive_id, detail.seq) || {});
        Object.values($Const.REACTION_TYPE).forEach(type => {
            const btn = this.reactionButtons[type.id];
            if (!btn) return;
            const countProp = type.prop.replace('has_', 'count_'); // 'count_funny' 等
            let displayCount = 0;
            if (isSearch) {
                // 検索モード：サーバーから届いた累計値をそのまま表示
                displayCount = Number(detail[countProp] || 0);
            } else {
                // 通常モード：[表示数] = [サーバー総数] - [サーバー時の自分の状態] + [ローカルの自分の状態]
                const prop = type.prop;
                const serverProp = prop.replace('has_', 'server_has_');
                const serverTotal = Number(detail[countProp] || 0);
                const serverMe = detail[serverProp] ? 1 : 0;
                const localMe = myLocal[prop] ? 1 : 0;
                displayCount = serverTotal - serverMe + localMe;
            }
            const countEl = $Dom.QuerySelector('.js-count', btn);
            countEl.textContent = displayCount;
            // 自分の選択状態を反映（検索時は常に未選択色）
            const isActive = !isSearch && !!myLocal[type.prop];
            btn.classList.toggle('bg-white', isActive);
            btn.classList.toggle('border-brand-5', isActive);
            btn.classList.toggle('shadow-md', isActive);
            btn.classList.toggle('bg-slate-50', !isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('shadow-sm', !isActive);
            countEl.classList.toggle('text-brand-5', isActive);
            countEl.classList.toggle('text-slate-400', !isActive);
        });
    },
    // リアクションのカウントと状態を反映する
    async renderReactions(detail) {
        if (!detail) return;
        // 1. 押せるかどうかの判定（自分以外の投稿 且つ 検索モード以外）
        const isClickable = !detail.is_owner && $App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.SEARCH;
        // ローカルDBから自分のリアクション状態を取得
        const myLocal = await $LocalDb.Reaction.Get(detail.archive_id, detail.seq) || {};
        Object.values($Const.REACTION_TYPE).forEach(type => {
            const btn = this.reactionButtons[type.id];
            if (!btn) return;
            // ボタン自体のクリック可否（HTML属性）を制御
            btn.disabled = !isClickable;
            // 2. 集計ロジック：
            // [表示数] = [サーバー総数] - [サーバー時の自分の状態(0or1)] + [ローカルの自分の状態(0or1)]
            const prop = type.prop; // 'has_funny' 等
            const serverProp = prop.replace('has_', 'server_has_'); // 'server_has_funny'
            const countProp = prop.replace('has_', 'count_');       // 'count_funny'
            const serverTotal = Number(detail[countProp] || 0);
            const serverMe    = detail[serverProp] ? 1 : 0;
            const localMe     = myLocal[prop] ? 1 : 0;
            const displayCount = serverTotal - serverMe + localMe;
            // カウント数値の反映
            const countEl = $Dom.QuerySelector('.js-count', btn);
            if (countEl) {
                countEl.textContent = displayCount;
            }
            // 自分の選択状況
            const isActive = !!myLocal[prop];
            // 3. UIクラスの反映（指定の4ルールに基づく制御）
            // ① 押せる → 影付き / ② 押せない → 影ナシ
            btn.classList.remove('shadow-sm'); // 初期作成時の影クラスを除去して競合防止
            btn.classList.toggle('shadow-md', isClickable);
            btn.classList.toggle('shadow-none', !isClickable);
            // ③ 自分は押してない → 枠線なし / ④ 自分が押している → 枠線あり（テーマカラー）
            btn.classList.toggle('border-brand-5', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            // カウント数値の文字色切り替え（選択時はテーマカラー）
            if (countEl) {
                countEl.classList.toggle('text-brand-5', isActive);
                countEl.classList.toggle('text-slate-600', !isActive);
            }
        });
    },
    // リアクションボタンクリック
    async _onReactionClick(type) {
        // ★追加：検索モード時は一切の操作（DB保存）を遮断
        if ($App.AppData.Context.ScreenMode === $Const.SCREEN_MODE.SEARCH) return;
        // 
        const detail = $DetailContent.GetFormEditData();
        if (!detail || !detail.archive_id) return;
        if (detail.is_owner) return $Notice.Warn("You cannot react to your own memories.");
        let myLocal = await $LocalDb.Reaction.Get(detail.archive_id, detail.seq);
        if (!myLocal) {
            myLocal = {
                archive_id: Number(detail.archive_id),
                seq: Number(detail.seq),
                has_funny: false, has_love: false, has_surprise: false, has_sad: false
            };
        }
        // 定数で定義されたプロパティ名を反転
        myLocal[type.prop] = !myLocal[type.prop];
        myLocal.send_flag = 0;
        await $LocalDb.Reaction.Save(myLocal);
        await this.renderReactions(detail);
    },
};

// 窓口
const DetailFrameController = {
    // 初期化
	Init(){
        _DetailFrameCore.init();
	},
    // 画面モード変更時
    ChangeScreenMode(){
		_DetailFrameCore.changeScreenMode();
	},
    // 開く
    Open(detail) {
        $App.PauseGpsTracking(); // ★パネルを開く際にGPSを止める
        // ▼ 画面を開く前にポップアップを閉じる
        $Marker.ClosePopup();
        const isNew = !detail;
        // 新規作成時は強調表示もクリアする
        if (isNew) {
            $Marker.ClearSelection(); // ★旧選択を完全にクリア
            $DetailContent.RenderDetail(null, true); 
        } else {
            $DetailContent.RenderDetail(detail, false);
        }
        // パネルを開く際、中心に固定するターゲット座標を決定
        let targetPos = null;
        if (isNew) {
            targetPos = $Marker.GetLocationMarkerPos(); // 新規作成時は現在地マーカー
        } else {
            targetPos = $Marker.GetCurrentMarkerPos(); // 既存データ時は選択中のマーカー
        }
        _DetailFrameCore.toggleDetailPanel(true, targetPos);
        _DetailFrameCore.toggleDetailPanel(true);
        const isOwner = detail?.is_owner ?? true;
        // ScreenMode または detailのプロパティでPublicデータか判定
        const isPublic = $App.AppData.Context.ScreenMode === $Const.SCREEN_MODE.ARCHIVE_PUB || detail?.is_public === true;
        if (isNew) {
            // 1. 新規入力時
            $DetailContent.RenderDetail(null, true);
            $Dom.ToggleShow(_DetailFrameCore.groupEdit, true);
            $Dom.ToggleShow(_DetailFrameCore.groupSearchAction, false);
            $Dom.ToggleShow(_DetailFrameCore.btnCurrent, true);
            $Dom.ToggleShow(_DetailFrameCore.btnEdit, false);
            $Dom.ToggleShow(_DetailFrameCore.btnReport, false);
            $Dom.ToggleShow(_DetailFrameCore.btnCancel, true);
            $Dom.ToggleShow(_DetailFrameCore.btnSave, true);
            $Dom.ToggleShow(_DetailFrameCore.btnCancel, true);
            $Dom.ToggleShow(_DetailFrameCore.groupMove, false);
            $Dom.ToggleShow(_DetailFrameCore.groupReaction, false);
            $Dom.ToggleShow(_DetailFrameCore.footer, true);
        } else {
            // 2. 既存データ参照時
            const isSearch = $App.AppData.Context.ScreenMode === $Const.SCREEN_MODE.SEARCH;
            $Dom.ToggleShow(_DetailFrameCore.footer, true);
            $Dom.ToggleShow(_DetailFrameCore.groupEdit, false); // ★参照時は隠す
            $Dom.ToggleShow(_DetailFrameCore.btnCurrent, false);
            // ★変更：SEARCHモード時は編集・通報を隠し、新設したフッターボタンを表示
            $Dom.ToggleShow(_DetailFrameCore.btnEdit, !isSearch && isOwner);
            $Dom.ToggleShow(_DetailFrameCore.btnReport, !isSearch && (!isOwner && isPublic));
            $Dom.ToggleShow(_DetailFrameCore.groupSearchAction, isSearch); // SEARCHモード時のみ表示
            // ★追加：SEARCHモードならまとめタイトルをボタンにセット
            if (isSearch && _DetailFrameCore.txtJumpArchiveTitle) {
                _DetailFrameCore.txtJumpArchiveTitle.textContent = detail.a_title || "まとめへ移動";
            }
            //
            $Dom.ToggleShow(_DetailFrameCore.btnEdit, isOwner);
            $Dom.ToggleShow(_DetailFrameCore.btnReport, !isOwner && isPublic);
            $DetailContent.RenderDetail(detail, false);
            $Dom.ToggleShow(_DetailFrameCore.btnCancel, false);
            $Dom.ToggleShow(_DetailFrameCore.btnSave, false);
            $Dom.ToggleShow(_DetailFrameCore.groupMove, true);
            // リアクションボタンの制御
            if (isPublic) {
                $Dom.ToggleShow(_DetailFrameCore.groupReaction, true);
                // リアクションカウントをボタンに描画
                _DetailFrameCore.renderReactions(detail);
                // 自データの場合はボタンを非活性（disabled）にする
                const reactionBtns = $Dom.QuerySelectorAll("button", _DetailFrameCore.groupReaction);
                reactionBtns.forEach(btn => btn.disabled = isOwner);
            } else {
                $Dom.ToggleShow(_DetailFrameCore.groupReaction, false);
            }
        }
    },
    // 閉じる
    Close() {
        _DetailFrameCore.toggleDetailPanel(false);
    },
    // 外部から安全に閉じる（または戻す）ための窓口
    HandleClose() {
        _DetailFrameCore.handleCloseOrCancel();
    },
    // マーカー移動アイコングループ切替え
    ToggleBtnGroupMove(isShow){
        _DetailFrameCore.toggleBtnGroupMove(isShow);
    }
};

// Public
export default DetailFrameController;
