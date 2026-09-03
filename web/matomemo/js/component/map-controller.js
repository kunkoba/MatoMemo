// 地図操作の泥臭い実処理をすべて受け持つ（Private）
const _MapCore = {
    // 窓口が知る必要のないPrivate情報（ID、インスタンス、状態）
    _elementId: "ui-map-id",
    _map: null,
    currentPoint: null,
    currentTileLayer: null,
    // 物理的な初期化処理
    init() {
        console.log("map -> init");
        if (!this._map) {
            // DOM要素の取得
            this.root = $Dom.GetElementById(this._elementId);
            this.currentPoint = [35, 135];
            //
            $Err.Catch(() => {
                // Leafletの生成
                this._generateMap();
                // スライダーの初期化
                this._initZoomSlider();
                // ズームボタンの初期化
                this._initZoomButtons();
            })();
            $Marker.Init(this._map);
        }
    },
    // ズームスライダーの同期処理
    _initZoomSlider() {
        const slider = $Dom.GetElementById('ui-map-zoom-slider');
        if (!slider) return;
        // スライダーの最小・最大値を定数から上書き
        slider.min = $Const.MAP_CONFIG.MIN_ZOOM;
        slider.max = $Const.MAP_CONFIG.MAX_ZOOM;
        // Leafletによるイベントの横取りを防止（PCのマウス操作対応）
        const container = slider.parentElement;
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        // 1. スライダー操作時に地図へ反映 (inputイベントでリアルタイム反映)
        slider.addEventListener('input', (e) => {
            const zoomLevel = parseInt(e.target.value);
            this._map.setZoom(zoomLevel);
        });
        // 2. 地図のズーム変化時（ボタンやスクロール）にスライダーへ反映
        this._map.on('zoomend', () => {
            const currentZoom = Math.round(this._map.getZoom());
            slider.value = currentZoom;
        });
        // 初期値を地図に合わせる
        slider.value = this._map.getZoom();
    },
    // 自作ズームボタンのイベント登録
    _initZoomButtons() {
        console.log("_initZoomButtons");
        const slider = document.getElementById('ui-map-zoom-slider');
        const btnIn = document.getElementById('btn-zoom-in');
        const btnOut = document.getElementById('btn-zoom-out');
        if (!slider || !btnIn || !btnOut) return;
        // 【追加】Leafletによるイベント擬似発火（_simulateEvent）の対象から外す
        L.DomEvent.disableClickPropagation(btnIn);
        L.DomEvent.disableClickPropagation(btnOut);
        // ボタンクリック時にスライダーの値を動かし、inputイベントを強制的に発生させる
        btnIn.onclick = () => {
            const current = parseInt(slider.value);
            if (current < parseInt(slider.max)) {
                slider.value = current + 1;
                slider.dispatchEvent(new Event('input')); // スライダーを動かしたことにする
            }
        };
        btnOut.onclick = () => {
            const current = parseInt(slider.value);
            if (current > parseInt(slider.min)) {
                slider.value = current - 1;
                slider.dispatchEvent(new Event('input')); // スライダーを動かしたことにする
            }
        };
    },
    // Leafletの具体的な構築処理
    _generateMap(){
        this._map = L.map(this.root, {
            zoomControl: false,
            attributionControl: false,
            minZoom: $Const.MAP_CONFIG.MIN_ZOOM,
            maxZoom: $Const.MAP_CONFIG.MAX_ZOOM,
        }).setView(this.currentPoint, $Const.MAP_CONFIG.DEFAULT_ZOOM);
        // 生成
        this.setMapStyle($App.AppData.Owner.MapStyle);
    },
    // 地図機能の物理的なロック処理
    lockMap(isLock){
        // scrollWheelZoom(マウスホイール) と touchZoom(スマホのピンチズーム) をロック対象から除外
        const features = ['dragging', 'doubleClickZoom', 'boxZoom', 'keyboard'];
        features.forEach(f => {
            if (this._map[f]) isLock ? this._map[f].disable() : this._map[f].enable();
        });
    },
    // タイル貼り替えの具象処理
    setMapStyle(style, isGray) {
        if (!style?.url) return;
        if (this.currentTileLayer) this._map.removeLayer(this.currentTileLayer);
        this.currentTileLayer = L.tileLayer(style.url, { maxZoom: 18 }).addTo(this._map);
        this.root.classList.toggle('map-grayscale', isGray);
    },
    // 視点移動の実体
    focusToTargetMarker(marker, delay = 500, zoom = null, isFly = false) {
        if (delay > 0) {
            // パネルが開く時などは従来通り遅延＋リサイズ追従
            setTimeout(() => {
                this._map.invalidateSize();
                this._moveTo(marker.getLatLng(), zoom, isFly);
            }, delay + 100);
            this.resizeMap(delay);
        } else {
            // 遅延0の場合は即座に移動するだけ
            this._moveTo(marker.getLatLng(), zoom, isFly);
        }
    },
    // 再計算ループ処理
    resizeMap(delay = 1000) {
        const center = this._map.getCenter();
        let start = null;
        const sync = (time) => {
            if (!start) start = time;
            this._map.invalidateSize({ animate: false });
            this._map.setView(center, this._map.getZoom(), { animate: false });
            if (time - start < delay) requestAnimationFrame(sync);
        };
        requestAnimationFrame(sync);
    },
    // 座標データの抽出
    getCenter() {
        const p = this._map.getCenter();
        return { lat: p.lat, lng: p.lng };
    },
    // 画面の指定された範囲を取得
    getSearchRange(rate = 0.8) {
        if (!this._map) return null;
        const center = this._map.getCenter();
        const width = this.root.offsetWidth;
        const height = this.root.offsetHeight;
        const rectW = width * rate;
        const rectH = height * rate;
        const centerPx = this._map.latLngToContainerPoint(center);
        const p1 = this._map.containerPointToLatLng(L.point(centerPx.x - rectW / 2, centerPx.y - rectH / 2));
        const p2 = this._map.containerPointToLatLng(L.point(centerPx.x + rectW / 2, centerPx.y + rectH / 2));
        return {
            lat_min: Math.min(p1.lat, p2.lat),
            lat_max: Math.max(p1.lat, p2.lat),
            lng_min: Math.min(p1.lng, p2.lng),
            lng_max: Math.max(p1.lng, p2.lng)
        };
    },
    // 指定座標へ地図を移動（Private用）
    moveMap(lat, lng, zoom) {
        console.log("moveMap(lat, lng)");
        if (!this._map) return;
        if (!zoom) zoom = this._map.getZoom();
        this._moveTo([lat, lng], zoom);
    },
    // 移動処理の共通ヘルパー（flyTo と setView を分岐）
    _moveTo(latLng, zoom, isFly = false) {
        const targetZoom = zoom || this._map.getZoom();
        const delay = $Const.MAP_CONFIG.MOVE_ANIMATION_SEC;
        // 修正：isFly が true なら、画面内かどうかに関わらず flyTo を実行する
        if (isFly) {
            this._map.flyTo(latLng, targetZoom, { duration: delay });
        } else {
            // 通常移動（一瞬で切り替え）
            this._map.setView(latLng, targetZoom, { animate: false });
        }
    },
    // 現在の表示範囲内（座標＋ズーム）か判定
    _isInCurrentView(latLng, targetZoom) {
        if (!this._map) return false;
        const isInside = this._map.getBounds().contains(latLng);
        const isSameZoom = Math.round(this._map.getZoom()) === Math.round(targetZoom);
        return isInside && isSameZoom;
    },
};

// 外部Public用の窓口（知らなくていい情報は一切持たない）
const MapController = {
    // マップスタイル
    MAP_STYLE: {
        STANDARD: {
            key: 'STANDARD',
            name: '標準（OSM）',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxZoom: 18
        },
        LIGHT: {
            key: 'LIGHT',
            name: '白地図（Carto Light）',
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            maxZoom: 18
        },
        PHOTO: {
            key: 'PHOTO',
            name: '航空写真（Esri）',
            url: 'https://server.arcgIsNetOnline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 18
        },
        // 世界地形図（Esri）
        WORLD_TOPO: {
            key: 'WORLD_TOPO',
            name: '世界地形図',
            url: 'https://server.arcgIsNetOnline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 18,
            attribution: 'Esri'
        },
        GSI_PHOTO: {
            key: 'GSI_PHOTO',
            name: '地理院写真',
            url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
            maxZoom: 18,
            attribution: '国土地理院'
        },
    },
    // コアを叩くだけの窓口業務
    Init() {
        _MapCore.init();
    },
    LockMap(isLock) {
        _MapCore.lockMap(isLock);
    },
    SetMapStyle(style, isGray) {
        _MapCore.setMapStyle(style, isGray);
    },
    ResizeMap(delay) {
        _MapCore.resizeMap(delay);
    },
    FocusToTargetMarker(marker, delay, zoom = null, isFly = false) {
        _MapCore.focusToTargetMarker(marker, delay, zoom, isFly);
    },
    GetCenter() {
        return _MapCore.getCenter();
    },
    // 検索範囲取得
    GetSearchRange(rate) {
        return _MapCore.getSearchRange(rate);
    },
    // MapController (窓口) 内に追加
    // 指定座標へ地図を移動（Public用）
    MoveMap(lat, lng, zoom) {
        _MapCore.moveMap(lat, lng, zoom);
    },
};

export default MapController;
