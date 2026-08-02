export default {
    // 【データメニュー】
    ShowDataMenu() {
        if (!$App.AppData.Context.IsLoggedIn) return this.ShowLoginDialog();
        const isLoggedIn = $App.AppData.Context.IsLoggedIn;
        const el = $Dom.GenerateTemplate('tpl-menu-data');
        const b = {
            archiveList: $Dom.QuerySelector('#btn-app-archive-list', el),
            archiveInfo: $Dom.QuerySelector('#btn-app-info', el),
            pointList:   $Dom.QuerySelector('#btn-app-point-list', el),
            merge:       $Dom.QuerySelector('#btn-app-merge', el),
            search:      $Dom.QuerySelector('#btn-app-search', el),
            create:      $Dom.QuerySelector('#btn-app-create', el),
            jumpUrl:     $Dom.QuerySelector('#btn-app-jump-url', el),
        };
        const mode = $App.AppData.Context.ScreenMode;
        const isArchive = (mode === $Const.SCREEN_MODE.ARCHIVE || mode === $Const.SCREEN_MODE.ARCHIVE_PUB);
        $Dom.ToggleShow(b.archiveInfo, isArchive);
        $Dom.ToggleShow(b.search, isLoggedIn && mode !== $Const.SCREEN_MODE.SEARCH);
        $Dom.ToggleShow(b.create, isLoggedIn && mode !== $Const.SCREEN_MODE.CREATE);
        $Dom.ToggleShow(b.merge, isLoggedIn && mode === $Const.SCREEN_MODE.CREATE);
        b.archiveList.onclick = () => this.ShowArchiveList();
        b.archiveInfo.onclick = () => this.ShowArchiveInfo();
        b.pointList.onclick = () => (mode === $Const.SCREEN_MODE.SEARCH) ? this.ShowDetailsSearchResult() : this.ShowDetailsTimeLine();
        b.merge.onclick = () => this.ShowMultiSelectTimeline();
        b.search.onclick = () => { 
            this._core.closeAll(); 
            $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.SEARCH; 
            $App.RefreshScreen(); 
        };
        b.create.onclick = () => { 
            this._core.closeAll(); 
            $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.CREATE; 
            $App.RefreshScreen(); 
        };
        b.jumpUrl.onclick = () => this.ShowJumpByUrl();
        // 画面を開く
        const help = [
            "地点メモ関連の操作を行います",
            "● 地点メモ・・・その日その時その場所のメモ",
            "● まとめ・・・地点メモをまとめた旅行記",
            "● 公開データ・・・みんなが公開している「まとめ」",
        ].join('\n');
        this._core.open({ 
            title: "アプリメニュー", 
            content: el,
            help: help,
        });
    },
    // 【アクションメニュー】
    ShowActionMenu() {
        const el = $Dom.GenerateTemplate('tpl-menu-action');
        const isLoggedIn = $App.AppData.Context.IsLoggedIn;
        const b = {
            reload:   $Dom.QuerySelector('#btn-app-reload', el),
            refresh:  $Dom.QuerySelector('#btn-app-refresh', el),
            restore:  $Dom.QuerySelector('#btn-app-restore', el),
            current:  $Dom.QuerySelector('#btn-app-current', el),
            pointSearch: $Dom.QuerySelector('#btn-app-point-search', el),
        };
        const mode = $App.AppData.Context.ScreenMode;
        b.reload.onclick = () => { 
            this._core.closeAll(); 
            // オフラインチェック
            if (!$App.AppData.Context.IsOnline) {
                $Notice.Warn("オフライン中は、機能が制限されます。");
                return false;
            }
            $Util.ReloadApp();
        };
        b.refresh.onclick = () => { this._core.closeAll(); $App.RefreshScreen(); };
        b.restore.onclick = () => { this._core.closeAll(); $Marker.RestoreMarkers(); };
        b.current.onclick = () => {
            this._core.closeAll();
            $Marker.RefreshCurrentLocation();
            $Marker.FocusToLocationMarker(1000);
        };
        b.pointSearch.onclick = () => this.PointSearchGoogle((p) => {
            $Map.MoveMap(p.lat, p.lng, 18);
            if ($App.AppData.Owner.Plan  === "Admin") {
                // 現在地マーカーも移動（ダミーまとめ作成用）
                $Marker.SetLocationMarkerPos(p.lat, p.lng);
            }
        });
        // 画面を開く
        const help = [
            "画面関連の操作を行います",
            "● アプリ再起動・・・各データをクラウドから再読み込みします",
            "● 画面再読み込み・・・現在の画面を、再度クラウドから読み込みます",
            "● マーカーを元に戻す・・・移動させてしまったマーカーだけを元に戻します",
            "● 現在地へ移動・・・強制的に現在地に移動します",
        ].join('\n');
        this._core.open({ 
            title: "アクションメニュー", 
            content: el,
            help: help, 
        });
    },
    // 座標・住所指定で移動する
    PointSearchGoogle(onOk) {
        const el = $Dom.GenerateTemplate('tpl-point-search-google');
        // 画面を開く
        const help = [
            "地名や施設名を入力して、地図をその場所へジャンプさせます",
            "",
        ].join('\n');
        this._core.open({
            title: "ワード検索で移動",
            content: el,
            help: help,
            buttons: [
                {
                    label: "GO！",
                    handler: $Warn.CatchAsync(async () => {
                        // IDを指定して入力要素を取得し、前後の空白を除去した値を取得
                        const val = $Dom.QuerySelector("#inputPointValue", el).value.trim();
                        if (!val) { $Notice.Warn("ワードが入力されていません。"); return; }
                        let pos = $Util.ParseLatLng(val);
                        if (!pos) {
                            pos = await $Util.SearchAddressByWord(val);
                        }
                        if (pos && onOk) {
                            this._core.closeAll(); // 見つかった時だけ手動で閉じる
                            onOk(pos);
                        } else {
                            $Notice.Warn("見つかりませんでした。");
                        }
                    })
                }
            ]
        });
    },
    // 環境コード選択ダイアログ
    ShowAtmospherePicker(currentCode, onOk) {
        const el = $Dom.GenerateTemplate('tpl-setting-weather');
        const rngWind = $Dom.QuerySelector('#atm-wind', el);
        const rngDensity = $Dom.QuerySelector('#atm-density', el);
        const rngDarkness = $Dom.QuerySelector('#atm-darkness', el);
        const weatherBtns = $Dom.QuerySelectorAll('.atm-w-btn', el);
        const txtWindVal = $Dom.QuerySelector('#atm-wind-val', el);
        const txtDensityVal = $Dom.QuerySelector('#atm-density-val', el);
        const txtDarknessVal = $Dom.QuerySelector('#atm-darkness-val', el);
        const txtCode = $Dom.QuerySelector('#atm-code-preview', el);
        // 初期値の適用
        let codeStr = String(currentCode || "0000").padStart(4, '0');
        let currentW = codeStr[0];
        rngWind.value = codeStr[1];
        rngDensity.value = codeStr[2];
        rngDarkness.value = codeStr[3];
        // エフェクト更新処理
        const applyEffect = () => {
            const w = rngWind.value;
            const d = rngDensity.value;
            const a = rngDarkness.value;
            txtWindVal.textContent = w;
            txtDensityVal.textContent = d;
            txtDarknessVal.textContent = a;
            const code = `${currentW}${w}${d}${a}`;
            txtCode.textContent = code;
            if (typeof Atmosphere !== 'undefined') {
                if (Atmosphere.canvas) Atmosphere.canvas.style.zIndex = '9999';
                Atmosphere.show(code);
            }
        };
        // ＋ーボタンのイベント登録ヘルパー
        const bindStepper = (minusId, plusId, slider) => {
            $Dom.QuerySelector(minusId, el).onclick = () => {
                slider.value = Math.max(0, parseInt(slider.value) - 1);
                applyEffect();
            };
            $Dom.QuerySelector(plusId, el).onclick = () => {
                slider.value = Math.min(9, parseInt(slider.value) + 1);
                applyEffect();
            };
        };
        // 各ボタンへのバインド
        bindStepper('#btn-wind-minus', '#btn-wind-plus', rngWind);
        bindStepper('#btn-density-minus', '#btn-density-plus', rngDensity);
        bindStepper('#btn-dark-minus', '#btn-dark-plus', rngDarkness);
        // スライダー直接操作時のイベント
        rngWind.addEventListener('input', applyEffect);
        rngDensity.addEventListener('input', applyEffect);
        rngDarkness.addEventListener('input', applyEffect);
        // 天候ボタンのクリックイベント
        weatherBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const clickedVal = btn.dataset.val;
                weatherBtns.forEach(b => {
                    b.classList.remove('bg-brand-5', 'text-white', 'border-brand-5');
                    b.classList.add('bg-white', 'text-brand-5', 'border-brand-2');
                });
                if (clickedVal === "0") {
                    // Clear時はリセット
                    rngWind.value = 0; rngDensity.value = 0; rngDarkness.value = 0;
                    currentW = "0";
                } else {
                    btn.classList.remove('bg-white', 'text-brand-5', 'border-brand-2');
                    btn.classList.add('bg-brand-5', 'text-white', 'border-brand-5');
                    currentW = clickedVal;
                    if (parseInt(rngDensity.value) === 0) rngDensity.value = 1;
                }
                applyEffect();
            });
        });
        // 初期描画
        applyEffect();
        // 天候ボタンの初期選択状態を反映
        weatherBtns.forEach(b => {
            if (b.dataset.val === currentW && currentW !== "0") {
                b.classList.remove('bg-white', 'text-brand-5', 'border-brand-2');
                b.classList.add('bg-brand-5', 'text-white', 'border-brand-5');
            }
        });
        // 画面を開く
        const help = [
            "環境エフェクトを設定できます",
            "● 地点メモを開いたときに、画面にアニメーション効果を付与できます",
            "● 風速、粒度、暗さをスライドバーで調整してください",
            "● クリアボタンでリセットできます",
        ].join('\n');
        this._core.open({
            title: "環境エフェクト",
            content: el,
            help: help,
            onClose: () => {
                if (typeof Atmosphere !== 'undefined') {
                    Atmosphere.hide();
                    if (Atmosphere.canvas) Atmosphere.canvas.style.zIndex = '0';
                }
            },
            buttons: [[
                { label: "CANCEL", className: "bg-slate-400 text-white shadow-md", handler: () => this._core.close() },
                { label: "OK", handler: () => { if (onOk) onOk(txtCode.textContent); this._core.close(); } }
            ]]
        });
    },
    // 共有URL入力・解析・ジャンプ
    ShowJumpByUrl() {
        const el = $Dom.GenerateTemplate('tpl-dialog-url-jump');
        const input = $Dom.QuerySelector('#js-jump-url-input', el);
        const btn = $Dom.QuerySelector('#btn-js-jump-exec', el);
        let targetId = null;
        // リアルタイム解析ロジック
        input.oninput = () => {
            const val = input.value.trim();
            try {
                // URLとして解析（encodedIdパラメータを抽出）
                const url = new URL(val);
                targetId = $Util.DecodeId(url.searchParams.get("encodedId"));
            } catch (e) { targetId = null; }
            // IDが見つかった場合のみボタンを活性化
            const isValid = !!targetId;
            btn.disabled = !isValid;
            btn.classList.toggle('opacity-50', !isValid);
        };
        btn.onclick = async () => {
            if (!targetId) return;
            if (!await this.ShowConfirm({ title: "JUMP", message: "このまとめへ移動しますか？" })) return;
            this._core.closeAll();
            $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.ARCHIVE_PUB;
            $App.AppData.Context.TargetArchiveId = targetId;
            await $App.RefreshScreen();
        };
        this._core.open({ title: "共有URLジャンプ", content: el });
    },
};