// 矢印設定（Private）
const _ArrowSettings = {
    // color: "blue",
    color: "var(--brand-lvl5)",
    weight: 6,      // 線の太さ
    opacity: 0.5,   // 色の不透明度
    fill: true,     // 塗りつぶし
    // size: '8px',         // 矢印のサイズ
    // frequency: '50px',   // 矢印の間隔
    // yawn: 30,            // 矢印の開き具合
};

// マーカー・矢印・ポップアップの物理操作（Privateコア）
const _MarkerCore = {
    _map: null,
    _markerList: [],
    _arrowList: [],
    locationMarker: null,
    _highlightCircle: null,
    // 初期化
    init(map) {
        if (!this.locationMarker) {
            this._map = map;
            this.clearAll();
            this.locationMarker = L.marker(this._map.getCenter(), { draggable: true }).addTo(this._map);
        }
        this.locationMarker.on("dragend", (e) => {
            if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.CREATE) return;
            this.generateArrowToCurrent();
        });
    },
    // 画面モード変更時
    changeScreenMode(){
        // 業務ルール（画面モード）に基づく初期分岐
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
                break;
        }
    },
    // 地図上の描画要素をクリア
    clearAll() {
        this.clearPointMarker();
        this.clearArrow();
        this.highlightMarker(false);
        this.toggleMarkerPopup(false);
    },
    // マーカーを物理削除
    clearPointMarker() {
        this._markerList.forEach(marker => marker.remove());
        this._markerList = [];
    },
    // 矢印を物理削除
    clearArrow() {
        this._arrowList.forEach(arrow => arrow.remove());
        this._arrowList = [];
    },
    // マーカー生成（まとめて）
    generatePointMarkerList(details, callbacks) {
        const mode = $App.AppData.Context.MarkerMode;
        details.forEach((row, index) => {
            const el = $Dom.GenerateTemplate("tpl-marker-icon");
            const iconContainer = $Dom.QuerySelector(".js-emoji", el);
            if (mode === $Const.MARKER_MODE.FEEL) {
                // Feelモード：画像を表示
                const imgPath = $Util.GetFeelIconPath(row.feel_type);
                iconContainer.innerHTML = `<img src="${imgPath}" class="bg-white w-full h-full object-contain">`;
            } else {
                // Emojiモード：絵文字テキストを表示
                iconContainer.textContent = row.face_emoji || '😀';
            }
            const customIcon = L.divIcon({
                html: el.outerHTML,
                className: '', 
                iconSize: [30, 30],
                iconAnchor: [15, 15] 
            });
            const marker = L.marker([row.latitude, row.longitude], {
                icon: customIcon,
                draggable: true
            }).addTo(this._map);
            // 描画後はテンプレート用ルートから削除しておく（メモリ節約）
            el.remove();
            marker.on('click', () => callbacks.onClick(index));
            marker.on('dragend', (e) => callbacks.onDragEnd(index, e.target.getLatLng()));
            this._markerList.push(marker);
            row.marker = marker;
        });
    },
    // 現在地マーカーの更新
    async refreshCurrentLocation() {
        $Warn.CatchAsync(async () => {
            const pos = await $Util.GetCurrentPosition();
            const p = [pos.coords.latitude, pos.coords.longitude];
            // 明細画面に反映（開いている時だけ）
            $DetailContent.SetPos(pos.coords.latitude, pos.coords.longitude);
            // 現在地マーカー移動
            if (this.locationMarker) this.locationMarker.setLatLng(p);
            if ($App.AppData.Context.ScreenMode == $Const.SCREEN_MODE.CREATE) {
                // 現在地まで線を引く
                this.generateArrowToCurrent();
            }
        })();
    },
    // 矢印生成（まとめて）
    generateArrowList() {
        if ($App.AppData.Context.ScreenMode == $Const.SCREEN_MODE.SEARCH) return;
        setTimeout(() => {
            for (let i = 1; i < this._markerList.length; i++) {
                const fromMarker = this._markerList[i - 1];
                const toMarker = this._markerList[i];
                const arrow = this.generateArrow(fromMarker, toMarker);
                this._arrowList.push(arrow);
            }
            if ($App.AppData.Context.ScreenMode == $Const.SCREEN_MODE.CREATE) {
                this.generateArrowToCurrent();
            }
        }, 100);
    },
    // 矢印生成（単品）
    generateArrow(fromMarker, toMarker) {
        const from = fromMarker.getLatLng();
        const to = toMarker.getLatLng();
        const polyline = L.polyline([from, to], {
            color: _ArrowSettings.color,
            weight: _ArrowSettings.weight,
            opacity: _ArrowSettings.opacity,
        }).addTo(this._map);
        return polyline;
    },
    // 現在地まで矢印を描く
    generateArrowToCurrent(){
        if (this._markerList.length === 0) return; // 地点がなければ矢印は描かない
        const fromMarker = this._markerList[this._markerList.length - 1];
        const toMarker = this.locationMarker;
        const arrow = this.generateArrow(fromMarker, toMarker);
        // 矢印リストに入れる（一括クリアのため）
        this._arrowList.push(arrow);
        // 現在地マーカーと紐づける（矢印更新のため）
        if (this.locationMarker.arrow) this.locationMarker.arrow.remove();
        this.locationMarker.arrow = arrow;
    },
    // 物理的な強調表示
    highlightMarker(isShow, index = null) {
        if (this._highlightCircle) {
            this._highlightCircle.remove();
            this._highlightCircle = null;
        }
        if (isShow && index !== null) {
            const marker = this._markerList[index];
            this._highlightCircle = L.circleMarker(marker.getLatLng(), {
                radius: 30,
                color: "red",
                weight: 3,
                fillOpacity: 0,
            }).addTo(this._map);
        }
    },
    // 物理的なポップアップ表示（DOM生成含む）
    toggleMarkerPopup(isOpen, index = null, detail = null) {
        if (isOpen && index !== null) {
            const marker = this._markerList[index];
            const el = $Dom.GenerateTemplate("tpl-marker-popup");
            $Dom.QuerySelector(".index", el).textContent = (index + 1);
            $Dom.QuerySelector(".js-face", el).textContent = detail.face_emoji || '😀'; // ★追加
            const dateContainer = $Dom.QuerySelector(".js-date-container", el);
            $UI.Generator.MemoDateFormatter(dateContainer, detail); // デフォルトサイズで呼び出し
            $Dom.QuerySelector(".title", el).textContent = detail.title || "";
            const bodyEl = $Dom.QuerySelector(".body", el);
            if (bodyEl) {
                bodyEl.textContent = detail.body || "";
                // 改行コードを認識して表示するようにクラスを追加
                bodyEl.classList.add("whitespace-pre-wrap");
            }
            const btnAction = $Dom.QuerySelector("#btn-popup-action", el);
            const actionText = $Dom.QuerySelector(".js-action-text", el);
            btnAction.onclick = (e) => {
                e.stopPropagation();
                $DetailFrame.Open(detail);
            };
            // ポップアップ
            L.popup({
                offset:[0, -50],
                minWidth: 240, // 新しい幅に合わせて調整
                maxWidth: 240,
                className: 'custom-popup',
                closeButton: false,
            }).setLatLng(marker.getLatLng()).setContent(el).openOn(this._map);
        } else {
            this._map.closePopup();
        }
    },
    // 指定インデックスのマーカー実体を取得
    getMarker(index) {
        return this._markerList[index];
    },
    // 自位置マーカーへのフォーカス
    focusToLocationMarker() {
        if (this.locationMarker) $Map.FocusToTargetMarker(this.locationMarker);
    },
    // マーカー座標の抽出
    getLocationMarkerPos(){
        return this.locationMarker?.getLatLng();
    },
    // 現在地マーカーを任意の座標にセットする
    setLocationMarkerPos(lat, lng) {
        if (this.locationMarker) {
            this.locationMarker.setLatLng([lat, lng]);
            // 明細画面に反映（開いている時だけ）
            $DetailContent.SetPos(lat, lng);
        }
    },
    // 指定インデックスのマーカー座標を返す
    getCurrentMarkerPos(index) {
        const marker = this._markerList[index];
        return marker ? marker.getLatLng() : null;
    },
};

// マーカー管理の窓口（状態管理と指示出し）
const MarkerController = {
    _currentIndex: 0,
    // 初期化
    Init(map) {
        _MarkerCore.init(map);
    },
    ClosePopup() {
        _MarkerCore.toggleMarkerPopup(false);
    },
    // 描画リフレッシュ
    RefreshPointMarker() {
        const details = $Data.Store.GetDetails();
        if (!details) return;
        // 地図検索モード以外の場合のみ、描画前に日時順でソートを実行
        if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.SEARCH) {
            $Data.Formatter.SortDetails(details);
        }
        this.Clear();
        _MarkerCore.generateArrowList();
        // マーカー生成
        _MarkerCore.generatePointMarkerList(details, {
            onClick: (index) => {
                // クリック
                this._currentIndex = index;
                this.FocusToCurrentMarker();
            },
            onDragEnd: (index, latLng) => {
                console.log(">onDragEnd:", latLng);
                // 1. 【重要】生データ(_rawData)は絶対に触らない
                // 作業用メモリ(Store)のデータのみを更新する
                const details = $Data.Store.GetDetails();
                if (details[index]) {
                    details[index].latitude = latLng.lat;
                    details[index].longitude = latLng.lng;
                }
                // 2. 詳細画面の入力項目（緯度経度）を現在のドラッグ位置で即時更新
                // これにより、このまま「SAVE」を押せば新座標で保存される
                $DetailContent.SetPos(latLng.lat, latLng.lng);
                // 3. 矢印の再描画
                _MarkerCore.clearArrow();
                if ($App.AppData.Context.ScreenMode !== $Const.SCREEN_MODE.SEARCH) {
                    _MarkerCore.generateArrowList();
                }
                // 4. フォーカスとインデックスの維持（Restoreは呼ばない）
                this._currentIndex = index;
                this.FocusToCurrentMarker();
            },
        });
    },
    // 画面モード変更時
    async ChangeScreenMode(){
        switch ($App.AppData.Context.ScreenMode) {
            case $Const.SCREEN_MODE.CREATE:
                await _MarkerCore.refreshCurrentLocation();
                if ($App.AppData.Owner.Plan !== "Admin") {
                    // 現在地へ移動
                    this.FocusToLocationMarker();
                }
                break;
            case $Const.SCREEN_MODE.ARCHIVE:
            case $Const.SCREEN_MODE.ARCHIVE_PUB:
                // 地点指定があれば、そこにフォーカス
                const seq = $App.AppData.Context.TargetSeq;
                const defZoom = $Const.MAP_CONFIG.DEFAULT_ZOOM;
                console.log("ChangeScreenMode():", seq);
                if (seq > 0) {
                    // seq指定がある場合、その地点へ定数ズームで移動
                    this.FocusBySeq(seq, defZoom);
                    $App.AppData.Context.TargetSeq = -1;    // 不要になったらクリア
                } else {
                    // 指定がない場合、最初の地点へ定数ズームで移動
                    this.SelectMarker(0, defZoom);
                }
                break;
        }
	},
    // クリア指示
    Clear() {
        _MarkerCore.clearAll();
    },
    // 現在の状態に基づくフォーカス実行
    FocusToCurrentMarker(delay = 200, zoom = null) {
        const details = $Data.Store.GetDetails();
        if (!details) return;
        // すべてのマーカーのZインデックスを一旦リセット
        _MarkerCore._markerList.forEach((m, idx) => {
            if (m && typeof m.setZIndexOffset === 'function') {
                m.setZIndexOffset(0);
            }
        });
        // 現在のマーカーを取得
        const marker = _MarkerCore.getMarker(this._currentIndex);
        if (!marker) return;
        // 現在選択されているマーカーを最前面へ
        marker.setZIndexOffset(1000);
        $Map.FocusToTargetMarker(marker, delay, zoom);
        _MarkerCore.toggleMarkerPopup(true, this._currentIndex, details[this._currentIndex]);
        // ハイライト
        _MarkerCore.highlightMarker(true, this._currentIndex);
    },
    // ナビゲーション
    FocusFirst() {
        this._currentIndex = 0;
        this.FocusToCurrentMarker();
    },
    FocusPrev() {
        if (this._currentIndex > 0) {
            this._currentIndex--;
            this.FocusToCurrentMarker();
        }
    },
    FocusNext() {
        const details = $Data.Store.GetDetails();
        if (details && this._currentIndex < details.length - 1) {
            this._currentIndex++;
            this.FocusToCurrentMarker();
        }
    },
    FocusLast() {
        const details = $Data.Store.GetDetails();
        if (details) {
            this._currentIndex = details.length - 1;
            this.FocusToCurrentMarker();
        }
    },
    FocusToLocationMarker() {
        _MarkerCore.focusToLocationMarker();
    },
    GetLocationMarkerPos() {
        return _MarkerCore.getLocationMarkerPos();
    },
    SetLocationMarkerPos(lat, lng) {
        _MarkerCore.setLocationMarkerPos(lat, lng);
    },
    GetCurrentMarkerPos() {
        return _MarkerCore.getCurrentMarkerPos(this._currentIndex);
    },
    async RefreshCurrentLocation() {
        await _MarkerCore.refreshCurrentLocation();
    },
    RefreshCurrentArrow() {
        _MarkerCore.generateArrowToCurrent();
    },
    // カレントデータ取得
    GetDataWithCurrentIndex() {
        const details = $Data.Store.GetDetails();
        return details[this._currentIndex];
    },
    // 変更を破棄して元に戻す
    RestoreMarkers() {
        // 1. データを生データの状態に戻す
        $Data.Store.Restore();
        // 2. 戻ったデータで地図を全描き直し（これで marker 参照も再配布される）
        this.RefreshPointMarker();
    },
    // 指定インデックスの地点を選択してフォーカス
    SelectMarker(index, zoom = null) {
        this._currentIndex = index;
        this.FocusToCurrentMarker(200, zoom);
    },
    // GoogleMap連携（窓口業務）
    LinkGoogleMap() {
        const detail = this.GetDataWithCurrentIndex();
        if (detail) {
            const googleMapsUrl = `https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`;
            // window.open(encodeURI(googleMapsUrl), '_blank');
            $Util.OpenExternalLink(url);
        }
    },
    // seqを指定してその地点へジャンプする
    FocusBySeq(seq, zoom = null) {
        const details = $Data.Store.GetDetails();
        // 
        const index = details.findIndex(d => Number(d.seq) === Number(seq));
        if (index !== -1) {
            this.SelectMarker(index, zoom);
        }
    },
    // 選択状態（赤丸）を解除
    ClearHighlight() {
        _MarkerCore.highlightMarker(false);
    },
    // 窓口（MarkerController）内に追加
    ClearSelection() {
        this._currentIndex = -1; // インデックスを無効化
        _MarkerCore.highlightMarker(false); // 赤丸を消す
        _MarkerCore.toggleMarkerPopup(false); // ポップアップを閉じる
    },
};

export default MarkerController;
