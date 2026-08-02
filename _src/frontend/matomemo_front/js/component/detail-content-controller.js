// UI操作
const _DetailContentCore = {
    _elementId: "ui-detail-content-id",
    // 初期化
    init() {
        if (!this.root) {
            // 要素取得
            this.root = $Dom.GetElementById(this._elementId);
            {
                // --- 参照用（Displayモード） ---
                {
                    this.displayRoot = $Dom.GetElementById("detail-display");
                    this.displayIndexBadge = $Dom.QuerySelector(".js-index-badge", this.displayRoot);
                    this.displayDateContainer = $Dom.GetElementById("detail-display-date-container");
                    this.displayFaceEmoji = $Dom.GetElementById("detail-display-face_emoji");
                    this.displayFeelImage = $Dom.GetElementById("detail-display-feel_image");
                    this.displayFeelText = $Dom.GetElementById("detail-display-feel_text");
                    this.displayWeatherEmoji = $Dom.GetElementById("detail-display-weather_code");
                    this.displayTitle = $Dom.GetElementById("detail-display-title");
                    this.displayBody = $Dom.GetElementById("detail-display-body");
                    this.displayPrice = $Dom.GetElementById("detail-display-memo_price");
                    this.displayPriceUnit = $Dom.GetElementById("detail-display-price-unit");
                    this.btnUrlClear = $Dom.GetElementById("btn-detail-edit-url-clear");
                    // 追加：表示制御用ラッパー
                    this.displayPriceWrapper = $Dom.GetElementById("detail-display-price-wrapper");
                    this.displayUrlWrapper = $Dom.GetElementById("detail-display-url-wrapper");
                }
                // --- 編集用（Editモード） ---
                {
                    this.editRoot = $Dom.GetElementById("detail-edit");
                    this.editDate = $Dom.GetElementById("detail-edit-memo_date");
                    this.editTime = $Dom.GetElementById("detail-edit-memo_time");
                    this.editTitle = $Dom.GetElementById("detail-edit-title");
                    this.editBody = $Dom.GetElementById("detail-edit-body");
                    this.editUrl = $Dom.GetElementById("detail-edit-link_url");
                    this.editArchiveId = $Dom.GetElementById("detail-edit-archive_id");
                    this.editSeq = $Dom.GetElementById("detail-edit-seq");
                    this.editDbid = $Dom.GetElementById("detail-edit-dbid");
                    this.editLat = $Dom.GetElementById("detail-edit-latitude");
                    this.editLng = $Dom.GetElementById("detail-edit-longitude");
                    this.editPrice = $Dom.GetElementById("detail-edit-memo_price");
                    // 
                    this.editFaceEmoji = $Dom.GetElementById("detail-edit-face_emoji");
                    this.editFaceTrigger = $Dom.GetElementById("btn-face-trigger");
                    this.editFacePreview = $Dom.GetElementById("span-face-preview"); // IDを span 用のものに修正
                    // 
                    this.btnAtmosphereTrigger = $Dom.GetElementById("btn-atmosphere-trigger");
                    this.spanAtmospherePreview = $Dom.GetElementById("span-atmosphere-preview");
                    this.editWeatherEmoji = $Dom.GetElementById("detail-edit-weather_code");
                    this.btnAddress = $Dom.GetElementById("btn-address-name");
                    this.editPricePlus = $Dom.GetElementById("detail-edit-price_plus");
                    this.editPriceMinus = $Dom.GetElementById("detail-edit-price_minus");
                    this.countTitle = $Dom.GetElementById("detail-count-title");
                    this.countBody = $Dom.GetElementById("detail-count-body");
                    this.countUrl = $Dom.GetElementById("detail-count-url");
                    // ▼ 追加：評価エリアの要素取得
                    this.editEvalGroup = $Dom.GetElementById("detail-edit-feel-group");
                    this.editEvalInput = $Dom.GetElementById("detail-edit-feel");
                    this.evalBtns = $Dom.QuerySelectorAll(".eval-btn", this.editEvalGroup);
                }
            }
            // イベント登録
            {
                this.btnAtmosphereTrigger.addEventListener('click', () => {
                    const currentCode = this.editWeatherEmoji.value || "0000";
                    $Dialog.ShowAtmospherePicker(currentCode, (code) => {
                        this.spanAtmospherePreview.textContent = code;
                        this.editWeatherEmoji.value = code;
                    });
                });
                this.btnAddress.addEventListener('click', async () => {
                    const data = $DetailContent.GetFormEditData();
                    const addressName = await $Util.GetAddressName(data.latitude, data.longitude, "jp");
                    this.editTitle.value = addressName;
                });
                // 絵文字アイコン選択ボタンのクリックイベント
                this.editFaceTrigger.addEventListener('click', () => {
                    $Util.ShowEmojiPicker((emoji) => {
                        // プレビュー（span等）のテキストを更新
                        this.editFacePreview.textContent = emoji;
                        // 隠しフィールド（face_emoji）に直接絵文字をセット
                        this.editFaceEmoji.value = emoji;
                    });
                });
                // プラスに入力されたらマイナスをクリア
                this.editPricePlus.addEventListener('input', () => {
                    this.editPriceMinus.value = "";
                    this.editPrice.value = this.editPricePlus.value;
                });
                // マイナスに入力されたらプラスをクリア
                this.editPriceMinus.addEventListener('input', () => {
                    this.editPricePlus.value = "";
                    this.editPrice.value = this.editPriceMinus.value * -1;
                });
                this.btnUrlClear.addEventListener('click', () => {
                    this.editUrl.value = "";
                    this.countUrl.textContent = "0"; // 文字数カウントもリセット
                });
                // ▼ 追加：評価ボタンのクリックイベント
                if (this.evalBtns) {
                    this.evalBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            const val = btn.dataset.val;
                            this.editEvalInput.value = val;
                            this._updateEvalUI(val); // UIを更新
                        });
                    });
                }
                // 文字数カウント連動（入力イベント）
                const elements =
                [
                    { input: this.editTitle, count: this.countTitle },
                    { input: this.editBody,  count: this.countBody },
                    { input: this.editUrl,   count: this.countUrl },
                ]
                elements.forEach(detail => {
                    if (detail.input && detail.count) {
                        detail.input.addEventListener("input", () => {
                            // 入力文字数をカウントして表示を更新
                            detail.count.textContent = detail.input.value.length;
                        });
                    }
                });
            }
        }
    },
    // ▼ 追加：評価UIの更新（未選択はグレー、選択時は色・枠線で強調）
    _updateEvalUI(val) {
        if (!this.evalBtns) return;
        // 定数を参照
        const EV = $Const.FEEL_TYPE;
        const config = {
            [EV.GOOD.val]:   { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-500" },
            [EV.NORMAL.val]: { bg: "bg-slate-100",  border: "border-slate-400",   text: "text-slate-600" },
            [EV.BAD.val]:    { bg: "bg-red-50",     border: "border-red-400",     text: "text-red-500" }
        };
        this.evalBtns.forEach(btn => {
            const bVal = Number(btn.dataset.val);
            const icon = $Dom.QuerySelector(".eval-icon", btn);
            const label = $Dom.QuerySelector(".eval-label", btn);
            // 状態によって切り替わる可能性のあるクラスを一旦すべて remove
            btn.classList.remove(
                "bg-emerald-50", "border-emerald-400", "shadow-md",
                "bg-slate-100", "border-slate-400",
                "bg-red-50", "border-red-400",
                "bg-slate-50", "border-transparent", "shadow-sm"
            );
            icon.classList.remove("grayscale", "opacity-30", "grayscale-0", "opacity-100");
            label.classList.remove("text-emerald-500", "text-slate-600", "text-red-500", "text-slate-400");
            // ターゲットの値と一致するかどうかで add するクラスを変える
            if (bVal === Number(val)) {
                const c = config[bVal];
                if (c) {
                    btn.classList.add(c.bg, c.border, "shadow-md");
                    icon.classList.add("grayscale-0", "opacity-100");
                    label.classList.add(c.text);
                }
            } else {
                // 未選択の場合
                btn.classList.add("bg-slate-50", "border-transparent", "shadow-sm");
                icon.classList.add("grayscale", "opacity-30");
                label.classList.add("text-slate-400");
            }
        });
    },
    // 画面モード変更時
    changeScreenMode(){
        switch ($App.AppData.Context.ScreenMode) {
            case $Const.SCREEN_MODE.CREATE:
                // 新規登録
                break;
            case $Const.SCREEN_MODE.ARCHIVE:
			case $Const.SCREEN_MODE.ARCHIVE_PUB:
                // まとめ参照
                break;
            case $Const.SCREEN_MODE.SEARCH:
                // 地図検索
                break;
            default:
                // どれにも当てはまらないとき
                break;
        }
    },
    // フォームに値反映
    renderDetail(detail, isEdit = false) {
        // 要素の取得チェック
        if (!this.root) this.init();
        // 表示内容の切り替えに合わせてスクロール位置を最上部にリセット
        this.root.scrollTop = 0;
        // 引数 detail の有無で「新規作成」かどうかを判定
        const isNew = !detail;
        if (isNew) {
            // 新規入力
            $Dom.ToggleShow(this.editRoot, true);
            $Dom.ToggleShow(this.displayRoot, false);
            this._initEditForm();
        } else {
            // 既存データ
            $Dom.ToggleShow(this.editRoot, isEdit);
            $Dom.ToggleShow(this.displayRoot, !isEdit);
            // 両方のフォームにデータを流し込む（裏側で準備しておく）
            this._renderDisplayMode(detail);
            this._renderEditMode(detail);
        }
        // 環境エフェクトをオンにする
        if (typeof Atmosphere !== 'undefined') {
            if (Atmosphere.canvas) Atmosphere.canvas.style.zIndex = '1005'; // 詳細パネル(1002)より手前
            const code = detail?.weather_code || "0000";
            Atmosphere.show(code);
        }
        // ▼ 画面を開く前にポップアップを閉じる
        $Marker.ClosePopup();
    },
    // 参照用反映
    _renderDisplayMode(detail) {
        // バッジに番号をセット
        if (this.displayIndexBadge) {
            this.displayIndexBadge.textContent = ($Marker._currentIndex + 1);
        }
        // 値反映
        // this.displayDateContainer.innerHTML = "";
        $UI.Generator.MemoDateFormatter(this.displayDateContainer, detail, 'lg');
        // 
        this.displayTitle.textContent = detail.title;
        this.displayBody.textContent = detail.body;
        // 金額の表示制御
        const price = Number(detail.memo_price || 0);
        if (price !== 0) {
            $Dom.ToggleShow(this.displayPriceWrapper, true);
            this.displayPrice.textContent = price.toLocaleString();
            // 通貨単位の決定ロジック
            let displayCurrency = $App.AppData.Owner.Currency_unit || 'JPY';
            if (detail.archive_id > 0) {
                // 親アーカイブの情報をStoreから探す
                const archiveList = $Data.Store.GetArchiveList() || [];
                // Number() で型を確実に合わせて比較する
                const targetArc = archiveList.find(a => Number(a.archive_id) === Number(detail.archive_id)) || $Data.Store.GetArchive();
                if (targetArc && Number(targetArc.archive_id) === Number(detail.archive_id) && targetArc.currency_unit) {
                    displayCurrency = targetArc.currency_unit; // 親の通貨で上書き
                }
            }
            this.displayPriceUnit.textContent = displayCurrency;
            // マイナスなら赤、プラスなら青に色分け
            if (price < 0) {
                this.displayPrice.className += " text-red-500";
            } else {
                this.displayPrice.className += " text-blue-500";
            }
        } else {
            $Dom.ToggleShow(this.displayPriceWrapper, false);
        }
        // URLの表示制御
        if (detail.link_url) {
            $Dom.ToggleShow(this.displayUrlWrapper, true);
            this.displayUrlWrapper.innerHTML = ""; // コンテナをクリア
            // サーバー送信用パラメータ (AddClickReq 形式)
            const params = {
                target_type: 3, // ClickTargetType.Detail
                target_user_id: detail.user_id,
                archive_id: detail.archive_id,
                seq: detail.seq,
                item_name: "link_url"
            };
            // 第3引数に is_owner を渡し、Generator側でログ送信を判定
            const isAdded = $UI.Generator.LinkButton(this.displayUrlWrapper, detail.link_url, params, detail.is_owner);
            $Dom.ToggleShow(this.displayUrlWrapper, isAdded);
        } else {
            $Dom.ToggleShow(this.displayUrlWrapper, false);
        }
        // 絵文字
        this.displayFaceEmoji.textContent = detail.face_emoji || '😀';
        this.displayWeatherEmoji.textContent = detail.weather_code || '0000';
        // 評価（Feel Type）画像の反映
        if (this.displayFeelImage && this.displayFeelText) {
            const feel = (detail.feel_type !== undefined && detail.feel_type !== null) 
                ? Number(detail.feel_type) 
                : $Const.FEEL_TYPE.NORMAL.val;
            this.displayFeelText.classList.remove("text-emerald-500", "text-slate-600", "text-red-500");
            if (feel === $Const.FEEL_TYPE.GOOD.val) {
                this.displayFeelImage.src = $Const.FEEL_TYPE.GOOD.path;
                this.displayFeelText.textContent = $Const.FEEL_TYPE.GOOD.label;
                this.displayFeelText.classList.add("text-emerald-500");
            } else if (feel === $Const.FEEL_TYPE.BAD.val) {
                this.displayFeelImage.src = $Const.FEEL_TYPE.BAD.path;
                this.displayFeelText.textContent = $Const.FEEL_TYPE.BAD.label;
                this.displayFeelText.classList.add("text-red-500");
            } else {
                this.displayFeelImage.src = $Const.FEEL_TYPE.NORMAL.path;
                this.displayFeelText.textContent = $Const.FEEL_TYPE.NORMAL.label;
                this.displayFeelText.classList.add("text-slate-600");
            }
        }
    },
    // 編集用反映
    _renderEditMode(detail) {
        // 表示系の入力項目
        this.editDate.value = detail.memo_date;
        this.editTime.value = detail.memo_time;
        this.editTitle.value = detail.title;
        this.editBody.value = detail.body;
        this.editPrice.value = detail.memo_price;
        this.editUrl.value = detail.link_url;
        // 金額
        const price = Number(detail.memo_price || 0);
        this.editPrice.value = price; // 隠しフィールドにはそのままセット
        // 一旦両方をクリア
        this.editPricePlus.value = "";
        this.editPriceMinus.value = "";
        if (price > 0) {
            // プラスならプラス枠に
            this.editPricePlus.value = price;
        } else if (price < 0) {
            // マイナスなら絶対値（-を取った数字）にしてマイナス枠に
            this.editPriceMinus.value = Math.abs(price);
        }
        // 表情・天気IDとプレビュー画像
        this.editFaceEmoji.value = detail.face_emoji || '😀';
        this.editFacePreview.textContent = detail.face_emoji || '😀';
        // this.editWeatherEmoji.value = detail.weather_code || 'はれ'; // select の value に直接セット
        this.editWeatherEmoji.value = detail.weather_code || '0000';
        this.spanAtmospherePreview.textContent = detail.weather_code || '0000';
        // 更新用隠しフィールド
        this.editArchiveId.value = detail.archive_id;
        this.editSeq.value = detail.seq;
        this.editDbid.value = detail.dbid || "";
        this.editLat.value = detail.latitude;
        this.editLng.value = detail.longitude;
        // ▼ 追加：評価値の反映（0 を判定から漏らさないように null/undefined チェック）
        const evalVal = (detail.feel_type !== undefined && detail.feel_type !== null) 
            ? detail.feel_type
            : $Const.FEEL_TYPE.NORMAL.val;
        this.editEvalInput.value = evalVal;
        this._updateEvalUI(evalVal);
        // 文字数カウンターの同期
        if (this.countTitle) this.countTitle.textContent = (detail.title || "").length;
        if (this.countBody)  this.countBody.textContent  = (detail.body || "").length;
        if (this.countUrl)   this.countUrl.textContent   = (detail.link_url || "").length;
    },
    // 新規入力前状態を作る
    _initEditForm() {
        if (!this.editRoot) return;
        // フォーム内の全入力をリセット（input, textarea）
        this.editRoot.reset();
        // 現在の日付と時刻を取得してセット
        const now = new Date();
        const dateStr = $Util.FormatDate(now, 'YYYY-MM-DD');
        const timeStr = now.toTimeString().slice(0, 5);  // hh:mm
        this.editDate.value = dateStr;
        this.editTime.value = timeStr;
        // 隠しフィールド（ID・座標など）を完全に空にする
        this.editArchiveId.value = "";
        this.editSeq.value = "0";
        this.editDbid.value = ""; // ★この一行を追記
        // 金額の隠しフィールドと入力枠を確実にリセット
        this.editPrice.value = "0";
        this.editPricePlus.value = "";
        this.editPriceMinus.value = "";
        // 現在地マーカーから現在地を取得
        const pos = $Marker.GetLocationMarkerPos();
        // this.editLat.value = pos.lat;
        // this.editLng.value = pos.lng;
        this.setPos(pos.lat, pos.lng);
        this.editFaceEmoji.value = '😀';
        this.editFacePreview.textContent = '😀';
        // this.editWeatherEmoji.value = 'はれ'; // 新規時は「はれ」を選択
        this.editWeatherEmoji.value = '0000';
        this.spanAtmospherePreview.textContent = '0000';
        // ▼ 追加：新規作成時は定数を使って NORMAL を選択状態にする
        this.editEvalInput.value = $Const.FEEL_TYPE.NORMAL.val;
        this._updateEvalUI($Const.FEEL_TYPE.NORMAL.val);
        // 文字数カウンターを0にリセット
        if (this.countTitle) this.countTitle.textContent = "0";
        if (this.countBody)  this.countBody.textContent  = "0";
        if (this.countUrl)   this.countUrl.textContent   = "0";
    },
    // フォームに地点を設定
    setPos(lat, lng){
        // 1. DOM要素がまだ取得されていない（初期化前）場合は安全にスルー（エラー回避）
        if (!this.editLat || !this.editLng) return;
        // 2. アプリの状態が「CREATEモード（新規作成）」以外の時は、フォームへの反映を無視する
        if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.CREATE) return;
        // console.log("setPos:", lat, lng);
        this.editLat.value = lat;
        this.editLng.value = lng;
    },
    // フォーム上のデータをまとめて取得
    getFormEditData(){
        // FormDataを使用して全入力を一括取得し、オブジェクトに変換
        const formData = new FormData(this.editRoot);
        const data = Object.fromEntries(formData.entries());
        // 数値項目（金額）を文字列から数値型に変換しておく
        // 空文字 "" の場合は 0 になるように ( || 0 ) を入れています
        data.seq = Number(data.seq || 0);
        // dbid が空文字、または "0" の場合はプロパティを削除する
        // これにより、IndexedDB が「新規データ」と判断して 1 以上の番号を自動で振るようになる
        if (data.dbid === "" || data.dbid === "0" || Number(data.dbid) === 0) {
            delete data.dbid; 
        } else {
            data.dbid = Number(data.dbid);
        }
        data.archive_id = Number(data.archive_id || 0);
        data.latitude = Number(data.latitude || 0);
        data.longitude = Number(data.longitude || 0);
        data.memo_price = Number(data.memo_price || 0);
        // ▼ 追加：空文字の場合は定数の NORMAL にする
        data.feel_type = (data.feel_type !== "" && data.feel_type !== undefined) 
            ? Number(data.feel_type)
            : $Const.FEEL_TYPE.NORMAL.val;
        // データストアから元の明細データを取得（新規作成時(seq=0)は空オブジェクト）
        let originalData = {};
        // seq または dbid を使って元データを特定する
        if (data.seq > 0 || data.dbid > 0) {
            originalData = $Data.Store.GetDetailByKey(data.archive_id, data.seq, data.dbid) || {};
        }
        // 元データとフォームデータをマージ
        const mergedData = { ...originalData, ...data };
        // 【重要】IndexedDB保存時・JSON化時のエラーを防ぐため、マーカー実体を削除
        delete mergedData.marker;
        //
        return mergedData;
    },
    // 【新規追加】UIの入力欄が空の場合にデフォルト値をセットする
    async fillEmptyFieldsUI() {
        // タイトルが空の場合：住所を取得して入力欄にセット
        if (!this.editTitle.value.trim()) {
            const lat = Number(this.editLat.value);
            const lng = Number(this.editLng.value);
            // 住所取得（非同期）
            const addressName = await $Util.GetAddressName(lat, lng, "jp");
            this.editTitle.value = addressName;
            // 文字数カウントも更新
            if (this.countTitle) this.countTitle.textContent = addressName.length;
        }
        // 本文が空の場合："簡易メモ" を入力欄にセット
        if (!this.editBody.value.trim()) {
            const defaultBody = "簡易メモ";
            this.editBody.value = defaultBody;
            // 文字数カウントも更新
            if (this.countBody) this.countBody.textContent = defaultBody.length;
        }
    },
};

// 窓口
const DetailContentController = {
    // 初期化
	Init(){
        _DetailContentCore.init();
	},
    // 画面モード変更時
    ChangeScreenMode(){
		_DetailContentCore.changeScreenMode();
	},
    // 値反映
    RenderDetail(detail, isEdit = false){
        _DetailContentCore.renderDetail(detail, isEdit);
    },
    // フォーム上のデータをまとめて取得
    GetFormEditData(){
        return _DetailContentCore.getFormEditData();
    },
    // DetailContentController (窓口) 内に追加
    Validate(detail) {
        console.log("Validate:", detail);
        // 1. タイトル必須チェック
        if (!detail.title || detail.title.trim().length === 0) {
            $Notice.Warn("タイトルを入力してください。");
            return false;
        }
        if (!detail.body || detail.body.trim().length === 0) {
            $Notice.Warn("本文を入力してください。");
            return false;
        }
        // 3. 日付・時刻チェック（HTML5のinputで制限されていますが、JSでも念のため）
        if (!detail.memo_date || !detail.memo_time) {
            $Notice.Warn("日付と時刻を入力してください。");
            return false;
        }
        // 5. URL形式チェック（入力されている場合のみ）
        if (detail.link_url && detail.link_url.trim().length > 0) {
            // 【修正点】新設した検証関数を通す
            if (!$Util.getSafeUrl(detail.link_url)) {
                $Notice.Warn("有効なURLを入力してください。");
                return false;
            }
        }
        return true; // 全てOK
    },
    // フォームに地点を設定
    SetPos(lat, lng){
        _DetailContentCore.setPos(lat, lng);
    },
    // 簡易入力処理
    async FillEmptyFieldsUI() {
        await _DetailContentCore.fillEmptyFieldsUI();
    },
};

// Public
export default DetailContentController;
