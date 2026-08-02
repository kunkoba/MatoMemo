export default {
    // ログイン処理
    ShowLoginDialog_2() {
        console.log(">> ShowLoginDialog");
        console.trace();
        const el = $Dom.GenerateTemplate("tpl-login");
        // Googleログインボタン
        $Dom.QuerySelector("#btn-login-google", el).onclick = $Err.CatchAsync(async () => {
            // 認証処理を実行
            const isLoginSuccess = await $App.ExecuteLoginFlow();
            if (!isLoginSuccess) {
                // 失敗時はコンソールにエラーを出力して中断
                console.error("ログイン失敗");
                return;
            }
            // 表示されているすべてのダイアログを破棄
            this._core.closeAll();
            // Init()で全初期化するのではなく、現在の画面モードを維持して再描画する
            await $App.Init();
        });
        this._core.open({
            title: "ログイン",
            content: el,
            help: "aaaa",
        });
    },
    ShowLoginDialog() {
        const el = $Dom.GenerateTemplate("tpl-login");
        const inEmail = $Dom.QuerySelector("#input-login-email", el);
        const inPass = $Dom.QuerySelector("#input-login-password", el);
        // ログイン成功時の共通後処理
        const onAuthSuccess = async () => {
            this._core.closeAll();
            await $App.Init();
            $Notice.Info("ログインに成功しました");
        };
        // Googleログイン
        $Dom.QuerySelector("#btn-login-google", el).onclick = async () => {
            if (await $App.ExecuteLoginFlow()) await onAuthSuccess();
        };
        // メールログイン
        $Dom.QuerySelector("#btn-login-mail", el).onclick = async () => {
            const success = await $App.ExecuteEmailAuthFlow(inEmail.value, inPass.value, false);
            if (success) await onAuthSuccess();
        };
        // メール新規登録
        $Dom.QuerySelector("#btn-signup-mail", el).onclick = async () => {
            const isOk = await this.ShowConfirm({
                title: "SIGN UP",
                message: "入力された内容で新しくアカウントを作成しますか？"
            });
            if (isOk) {
                const success = await $App.ExecuteEmailAuthFlow(inEmail.value, inPass.value, true);
                if (success) await onAuthSuccess();
            }
        };
        // パスワード再設定
        $Dom.QuerySelector("#btn-forgot-password", el).onclick = async () => {
            const email = inEmail.value.trim();
            if (!email) return $Notice.Warn("メールアドレスを入力してください");
            if (await $Auth.ResetPassword(email)) {
                $Notice.Info("再設定メールを送信しました。受信トレイを確認してください");
            }
        };
        this._core.open({ title: "ログイン", content: el, isModal: true });
    },
    // 【📱 メインメニュー】
    ShowMainMenu() {
        const el = $Dom.GenerateTemplate('tpl-menu-main');
        // 各メニューボタンへの遷移設定
        $Dom.QuerySelector('#btn-main-sys', el).onclick = () => this.ShowSystemMenu();
        $Dom.QuerySelector('#btn-main-user', el).onclick = () => this.ShowUserMenu();
        $Dom.QuerySelector('#btn-main-data', el).onclick = () => this.ShowDataMenu();
        $Dom.QuerySelector('#btn-main-action', el).onclick = () => this.ShowActionMenu();
        this._core.open({ 
            title: "メインメニュー", 
            content: el,
            help: "全てのメニューにアクセスできます。" 
        });
    },
    // 【⚙️ システムメニュー】
    ShowSystemMenu() {
        if (!$App.AppData.Context.IsLoggedIn) return this.ShowLoginDialog();
        const el = $Dom.GenerateTemplate('tpl-menu-sys');
        const isLoggedIn = $App.AppData.Context.IsLoggedIn;
        const isAdmin = isLoggedIn && $App.AppData.Owner.Plan === "Admin";
        const b = {
            notice:  $Dom.QuerySelector('#btn-sys-notice', el),
            version: $Dom.QuerySelector('#btn-sys-version', el),
            legal:   $Dom.QuerySelector('#btn-sys-legal', el),
            login:   $Dom.QuerySelector('#btn-sys-login', el),
            admin:   $Dom.QuerySelector('#btn-sys-admin', el),
        };
        // 表示制御
        $Dom.ToggleShow(b.admin, isAdmin);
        const loginLabel = $Dom.QuerySelector('span:last-child', b.login);
        loginLabel.textContent = isLoggedIn ? "ログアウトする" : "ログイン／サインインする";
        // 新着バッジ更新
        $UI.Generator.ApplyNewBadge(b.notice, $App.AppData.Context.UnreadNoticeCount > 0, 'label');
        // 規約更新がある場合「NEW」ラベルを表示
        const hasLegal = !!$App.AppData.Context.HasLegalUpdate;
        $UI.Generator.ApplyNewBadge(b.legal, hasLegal, 'label');
        // 各種イベント
        b.notice.onclick = () => this.ShowNoticeList();
        b.version.onclick = () => this.ShowAppInfo();
        b.login.onclick = async () => {
            if (isLoggedIn) {
                if (await this.ShowConfirm({ title: "LOGOUT", message: "ログアウトしますか？" })) {
                    this._core.closeAll();
                    $App.Logout();
                    setTimeout(() => location.reload(), 500);
                }
            } else {
                this.ShowLoginDialog();
            }
        };
        b.admin.onclick = async () => {
            this.ShowAdminMenu();
        };
        b.legal.onclick = () => this.ShowLegalDocuments();
        //
        this._core.open({ title: "システムメニュー", content: el });
    },
    // 【👤 ユーザーメニュー】
    ShowUserMenu() {
        if (!$App.AppData.Context.IsLoggedIn) return this.ShowLoginDialog();
        const el = $Dom.GenerateTemplate('tpl-menu-user');
        const profile = $App.AppData.Owner.SystemInfo.ownerProfile; // プロフィール取得
        const b = {
            profile: $Dom.QuerySelector('#btn-sys-user-profile', el),
            mail:    $Dom.QuerySelector('#btn-user-mail', el),
            config:  $Dom.QuerySelector('#btn-sys-user-config', el),
            reports: $Dom.QuerySelector('#btn-sys-my-report', el),
            history: $Dom.QuerySelector('#btn-user-history', el),
        };
        // 新着バッヂ更新
        $UI.Generator.ApplyNewBadge(b.mail, $App.AppData.Context.UnreadMailCount > 0, 'label');
        // ① 閲覧履歴が0件（または存在しない）場合はボタンを非表示にする
        const hasHistory = profile.view_history && profile.view_history.length > 0;
        $Dom.ToggleShow(b.history, hasHistory);
        // 各種イベント
        b.profile.onclick = () => this.ShowUserProfile($App.AppData.Owner.SystemInfo.ownerProfile, true);
        b.mail.onclick    = () => this.ShowUserMailList();
        b.config.onclick  = () => this.ShowUserSettingsMenu();
        b.reports.onclick = () => this.ShowMyReportList();
        b.history.onclick = () => this.ShowViewHistory(profile.view_history);
        //
        this._core.open({ 
            title: "ユーザメニュー", 
            content: el 
        });
    },
    // （ユーザ設定）ユーザー設定メニュー（第2階層）
    ShowUserSettingsMenu() {
        const el = $Dom.GenerateTemplate("tpl-menu-user-settings");
        $Dom.QuerySelector('#btn-set-theme', el).onclick = () => this.ShowThemeConfig();
        $Dom.QuerySelector('#btn-set-map', el).onclick = () => this.ShowMapStyleConfig();
        $Dom.QuerySelector('#btn-set-currency', el).onclick = () => this.ShowCurrencyConfig();
        $Dom.QuerySelector('#btn-set-gps', el).onclick = () => this.ShowGpsFollowConfig();
        $Dom.QuerySelector('#btn-set-font', el).onclick = () => this.ShowFontSizeConfig();
        //
        this._core.open({
            title: "ユーザ設定",
            content: el,
            help: "ユーザシステム\nメニュー",
        });
    },
    // （ユーザ設定）テーマ設定ダイアログ
    ShowThemeConfig() {
        let isSaved = false;
        const oldTheme = $App.AppData.Owner.Theme;
        // プレビュー用バーを0-5までループ生成
        let previewItems = '';
        for (let i = 0; i <= 5; i++) {
            const textColor = i > 2 ? 'text-white' : 'text-slate-600';
            previewItems += `<div class="w-full h-10 bg-brand-${i} border border-brand-2 flex items-center px-4 text-[0.9rem] font-bold ${textColor}">LEVEL ${i} PREVIEW</div>`;
        }
        const html = `
            <div class="p-6 w-full space-y-6 bg-brand-0">
                <div class="flex justify-between items-center border-b border-brand-2 pb-6">
                    <button id="th-btn-blue" class="w-12 h-12 bg-[#0ea5e9] border-2 border-white shadow-md active:scale-95 transition-transform"></button>
                    <button id="th-btn-green" class="w-12 h-12 bg-[#22c55e] border-2 border-white shadow-md active:scale-95 transition-transform"></button>
                    <button id="th-btn-red" class="w-12 h-12 bg-[#ef4444] border-2 border-white shadow-md active:scale-95 transition-transform"></button>
                    <button id="th-btn-yellow" class="w-12 h-12 bg-[#eab308] border-2 border-white shadow-md active:scale-95 transition-transform"></button>
                </div>
                <div class="space-y-1 px-6">${previewItems}</div>
            </div>`;
        const el = document.createElement('div');
        el.style.width = "100%";
        el.innerHTML = html;
        const bind = (id, theme) => $Dom.QuerySelector(id, el).onclick = () => $UI.ChangeTheme(theme);
        bind('#th-btn-blue', 'blue'); bind('#th-btn-green', 'green'); bind('#th-btn-red', 'red'); bind('#th-btn-yellow', 'yellow');
        this._core.open({
            title: "テーマカラー",
            content: el,
            help: "",
            onClose: () => {
                if (isSaved) return;
                // もとに戻す
                $UI.ChangeTheme(oldTheme);
            },
            buttons: [[
                {
                    label: "CANCEL",
                    className: "bg-slate-400 text-white shadow-md",
                    handler: () => {
                        this._core.close();
                    },
                },
                {
                    label: "OK",
                    handler: () => {
                        isSaved = true;
                        // 現在のテーマ属性値を取得
                        const current = document.documentElement.getAttribute('data-theme');
                        // テーマの変更・保存処理を実行
                        $App.ChangeTheme(current);
                        this._core.close();
                        $Notice.Info("保存しました。");
                    }
                }
            ]]
        });
    },
    // （ユーザ設定）マップスタイル設定ダイアログ
    ShowMapStyleConfig() {
        let isSaved = false;
        const mapEl = document.getElementById('ui-map-id');
        // 現在の状態を保持（キャンセル時の復元用）
        const oldStyle = $App.AppData.Owner.MapStyle;
        const oldGrayscale = !!$App.AppData.Owner.IsMapGrayscale;
        let selectedStyle = oldStyle;
        let currentGrayscale = oldGrayscale;
        const el = document.createElement('div');
        el.className = "w-full flex flex-col bg-brand-0";
        // --- 1. 上部固定：グレースケール設定エリア ---
        const stickyTop = document.createElement('div');
        stickyTop.className = "sticky top-0 z-20 bg-white border-b-2 border-brand-2 p-5 mb-1 shadow-sm";
        stickyTop.innerHTML = `
            <label class="flex items-center gap-4 cursor-pointer group">
                <input type="checkbox" id="cfg-map-gray" class="w-6 h-6 accent-brand-5" ${currentGrayscale ? 'checked' : ''}>
                <span class="text-[1rem] font-bold text-slate-700 group-active:scale-95 transition-transform">
                    グレースケールにする
                </span>
            </label>
        `;
        el.appendChild(stickyTop);
        // --- 2. 地図スタイル選択リスト ---
        const listContainer = document.createElement('div');
        listContainer.className = "flex flex-col";
        // プレビュー反映（地図の見た目のみを一時的に変える）
        const applyPreview = () => {
            $Map.SetMapStyle(selectedStyle);
            if (mapEl) mapEl.classList.toggle('map-grayscale', currentGrayscale);
            // リストのラジオボタン風表示を更新
            $Dom.QuerySelectorAll('.js-ms-check', listContainer).forEach(span => {
                const key = span.dataset.key;
                span.textContent = (key === selectedStyle.key) ? '●' : '○';
                span.className = (key === selectedStyle.key) 
                    ? "js-ms-check col-span-1 flex justify-center text-[1.2rem] text-brand-5 font-bold" 
                    : "js-ms-check col-span-1 flex justify-center text-[1.2rem] text-slate-400";
            });
        };
        Object.values($Map.MAP_STYLE).forEach(style => {
            const btn = document.createElement('button');
            btn.className = "w-full h-16 grid grid-cols-10 items-center px-4 border-b border-brand-2 hover:bg-brand-1 active:bg-brand-2 transition-colors text-slate-900";
            btn.innerHTML = `
                <span class="js-ms-check col-span-1 flex justify-center text-[1.2rem]" data-key="${style.key}"></span>
                <span class="col-span-1"></span>
                <span class="col-span-8 text-left font-bold text-[1rem] uppercase">${style.name}</span>
            `;
            btn.onclick = () => {
                selectedStyle = style;
                applyPreview();
            };
            listContainer.appendChild(btn);
        });
        el.appendChild(listContainer);
        // チェックボックスのイベント
        $Dom.QuerySelector('#cfg-map-gray', el).onchange = (e) => {
            currentGrayscale = e.target.checked;
            applyPreview();
        };
        // 初期表示の反映
        applyPreview();
        this._core.open({
            title: "地図スタイル",
            content: el,
            help: "地図の種類と、色味の有無を設定できます。\n航空写真をグレースケールにすると視認性が高まります。",
            onClose: () => {
                if (isSaved) return;
                // キャンセル時は元の状態に物理的に戻す
                $Map.SetMapStyle(oldStyle);
                if (mapEl) mapEl.classList.toggle('map-grayscale', oldGrayscale);
            },
            buttons: [[
                {
                    label: "CANCEL",
                    className: "bg-slate-400 text-white shadow-md",
                    handler: () => this._core.close()
                },
                {
                    label: "OK",
                    handler: () => {
                        isSaved = true;
                        // AppDataを更新して保存
                        $App.ChangeMapStyle(selectedStyle, currentGrayscale); 
                        this._core.close();
                        $Notice.Info("保存しました。");
                    }
                }
            ]]
        });
    },
    // （ユーザ設定）通貨単位設定ダイアログ
    ShowCurrencyConfig() {
        let isSaved = false;
        const el = $Dom.GenerateTemplate("tpl-config-currency");
        const inputCurrency = $Dom.QuerySelector('#input-currency', el);
        // 現在の値をセット
        const oldUnit = $App.AppData.Owner.Currency_unit || 'JPY';
        inputCurrency.value = oldUnit;
        this._core.open({
            title: "金額の単位",
            content: el,
            help: "",
            onClose: () => {
                if (isSaved) return;
                // もとに戻す
                $App.ChangeCurrency(oldUnit);
            },
            buttons: [[
                {
                    label: "CANCEL",
                    className: "bg-slate-400 text-white shadow-md",
                    handler: () => {
                        this._core.close();
                    },
                },
                {
                    label: "OK",
                    handler: () => {
                        isSaved = true;
                        const val = inputCurrency.value.trim();
                        // 空の場合は JPY をデフォルトとする
                        $App.ChangeCurrency(val || 'JPY');
                        this._core.close();
                        $Notice.Info("保存しました。");
                    }
                }
            ]]
        });
    },
    // （ユーザ設定）GPS追従設定
    ShowGpsFollowConfig() {
        let isSaved = false;
        const oldSec = $App.AppData.Owner.GpsTrackingSec || 0; // 現在の値を保持
        let tempSec = oldSec; // 操作用の一時変数
        const el = $Dom.GenerateTemplate("tpl-config-gps");
        const slider = $Dom.QuerySelector('#gps-range-slider', el);
        const display = $Dom.QuerySelector('#gps-val-display', el);
        const unit = $Dom.QuerySelector('#gps-unit-display', el);
        // 初期表示の設定
        slider.value = oldSec;
        display.textContent = oldSec === 0 ? "OFF" : oldSec;
        $Dom.ToggleShow(unit, oldSec !== 0);
        // スライダー操作：画面表示だけをリアルタイム更新（Appマネージャにはまだ書かない）
        slider.oninput = (e) => {
            tempSec = parseInt(e.target.value);
            display.textContent = tempSec === 0 ? "OFF" : tempSec;
            $Dom.ToggleShow(unit, tempSec !== 0);
        };
        this._core.open({
            title: "GPS追従の間隔",
            content: el,
            help: "GPSの更新間隔を設定します。\n0sにすると停止します。\n更新間隔が短いほど、バッテリーの消費が早くなります。",
            onClose: () => {
                // 保存せずに閉じた場合は何もしない（値は oldSec のまま維持される）
            },
            buttons: [[
                {
                    label: "CANCEL",
                    className: "bg-slate-400 text-white shadow-md",
                    handler: () => this._core.close()
                },
                {
                    label: "OK",
                    handler: () => {
                        isSaved = true;
                        $App.ChangeGpsTracking(tempSec); // OK時のみ確定して保存
                        this._core.close();
                        $Notice.Info("保存しました。");
                    }
                }
            ]]
        });
    },
    // （ユーザ設定）フォントサイズ設定
    ShowFontSizeConfig() {
        let isSaved = false;
        const oldSize = $App.AppData.Owner.FontSize || 'standard';
        let selectedSize = oldSize;
        const el = document.createElement('div');
        el.className = "w-full bg-brand-0";
        const options = [
            { key: 'small',    label: 'SMALL' },
            { key: 'standard', label: 'STANDARD' },
            { key: 'large',    label: 'LARGE' }
        ];
        // リスト描画（現在の設定に基づきラジオボタン風に表示）
        const renderList = (current) => {
            el.innerHTML = options.map(opt => `
                <button data-key="${opt.key}" class="js-font-btn w-full h-14 flex items-center justify-between px-6 border-b border-brand-2 active:bg-brand-1">
                    <span class="font-bold text-[1rem]">${opt.label}</span>
                    <span class="js-check text-brand-5 font-bold text-[1.2rem]">${current === opt.key ? '●' : '○'}</span>
                </button>
            `).join('');
            // ボタンクリックで「一時適用」
            $Dom.QuerySelectorAll('.js-font-btn', el).forEach(btn => {
                btn.onclick = () => {
                    selectedSize = btn.dataset.key;
                    $UI.ChangeFontSize(selectedSize); // UIだけ一時的に変える
                    renderList(selectedSize); // チェックマークの表示を更新
                };
            });
        };
        renderList(selectedSize);
        this._core.open({
            title: "フォントサイズ",
            content: el,
            help: "アプリ全体の文字サイズを調整します。\nデバイスごとの適切なサイズ差は維持されます。",
            onClose: () => {
                if (isSaved) return;
                $UI.ChangeFontSize(oldSize); // 保存されずに閉じたら元に戻す
            },
            buttons: [[
                {
                    label: "CANCEL",
                    className: "bg-slate-400 text-white shadow-md",
                    handler: () => this._core.close(),
                },
                {
                    label: "OK",
                    handler: () => {
                        isSaved = true;
                        $App.ChangeFontSize(selectedSize); // ここで初めてAppData更新・保存
                        this._core.close();
                        $Notice.Info("保存しました。");
                    }
                }
            ]]
        });
    },
    // プロフィール参照
    async ShowUserProfile(profile, isOwner) {
        if (isOwner) profile = $App.AppData.Owner.SystemInfo.ownerProfile;
        if (!profile) return $Notice.Warn("ユーザー情報がありません");
        const el = $Dom.GenerateTemplate('tpl-view-profile');
        const renderView = () => {
            const pIcon = profile.icon || "👤";
            const pName = profile.nick_name || "No Name";
            const pDesc  = profile.description || "";
            const pL1   = profile.link_1 || "";
            const pL2   = profile.link_2 || "";
            const pL3   = profile.link_3 || "";
            // 新規項目
            const pMemberNo = profile.member_no || "---";
            const pCategory = profile.user_category || "通りすがり";
            const pRank = profile.user_rank || 0;
            $Dom.QuerySelector('#view-profile-icon', el).textContent = pIcon;
            $Dom.QuerySelector('#view-profile-nickname', el).textContent = pName;
            $Dom.QuerySelector('#view-profile-description', el).textContent = pDesc;
            $Dom.QuerySelector('#view-profile-member-no', el).textContent = pMemberNo;
            $Dom.QuerySelector('#view-profile-category', el).textContent = pCategory;
            $Dom.QuerySelector('#view-profile-rank', el).textContent = pRank;
            const viewLinks = $Dom.QuerySelector('#view-profile-links', el);
            // 【重要】追加前に既存のボタンをすべて削除してリセットする
            viewLinks.innerHTML = '';
            // 項目名と値のペアで定義し、入力があるもののみループ
            [
                { val: pL1, key: "link_1" },
                { val: pL2, key: "link_2" },
                { val: pL3, key: "link_3" }
            ].forEach(item => {
                if (!item.val || item.val.trim() === "") return;
                // サーバー送信用パラメータ (AddClickReq 形式)
                const params = {
                    target_type: 1, // ClickTargetType.User
                    target_user_id: profile.user_id,
                    item_name: item.key
                };
                // ジェネレータでボタンを生成（第3引数は ShowUserProfile の引数 isOwner を使用）
                $UI.Generator.LinkButton(viewLinks, item.val, params, isOwner);
            });
        };
        // --- 匿名モード切り替えロジック ---
        const anonArea = $Dom.QuerySelector('#view-profile-anon-area', el);
        const btnAnon = $Dom.QuerySelector('#btn-profile-anon-toggle', el);
        const txtAnon = $Dom.QuerySelector('#js-anon-status-text', el);
        const dotAnon = $Dom.QuerySelector('.js-dot', btnAnon);
        const updateAnonUI = (isOn) => {
            btnAnon.classList.toggle('bg-brand-5', isOn);
            btnAnon.classList.toggle('bg-slate-300', !isOn);
            dotAnon.style.transform = isOn ? "translateX(24px)" : "translateX(0px)";
            txtAnon.textContent = `匿名モード：${isOn ? 'ON' : 'OFF'}`;
        };
        if (isOwner) {
            $Dom.ToggleShow(anonArea, true);
            updateAnonUI(!!profile.anonymous_flg);
            btnAnon.onclick = async () => {
                const nextStatus = !profile.anonymous_flg;
                const msg = nextStatus ? "匿名モードに設定しますか？" : "匿名モードを解除しますか？";
                if (!await this.ShowConfirm({ title: "ANONYMOUS SETTING", message: msg })) return;
                // 既存のプロフ情報をベースにフラグだけ書き換えて更新
                const params = { ...profile, anonymous_flg: nextStatus };
                if (await $Data.Access.UpdateProfile(params)) {
                    profile.anonymous_flg = nextStatus;
                    $Data.Store.UpdateProfile({ anonymous_flg: nextStatus });
                    updateAnonUI(nextStatus);
                    $Notice.Info("設定を更新しました");
                }
            };
        }
        renderView();
		const headerButtons = [];
        const isAdmin = $App.AppData.Owner.Plan === "Admin"; // 管理者判定
        headerButtons.push({
            label: "📚",
            handler: () => this.ShowUserArchiveList(profile)
        });
        if (isOwner || isAdmin) {
            // 統計アイコン
            headerButtons.push({
                label: "📊",
                handler: () => this.ShowUserClickStats(profile)
            });
        }
        if (isOwner) {
            headerButtons.push({
                label: "✏️",
                handler: () => this.ShowEditProfile(profile, renderView)
            });
        } else if (isAdmin) {
            // 【自分が管理者 且つ 他人のプロフ】メッセージ送信（返信）ボタンを表示
            headerButtons.push({
                label: "✉️",
                handler: () => this.ShowAdminSendUserNotification(profile)
            });
        }
        //
		this._core.open({
			title: "ユーザ情報",
			content: el,
            help: "",
			headerButtons: headerButtons
		});
    },
    // プロフィール編集（上にスタックされる）
    ShowEditProfile(profile, onUpdate) {
        const el = $Dom.GenerateTemplate('tpl-edit-profile');
        const editIconPreview = $Dom.QuerySelector('#edit-profile-icon-preview', el);
        const editIconInput = $Dom.QuerySelector('#edit-profile-icon', el);
        const editNickname = $Dom.QuerySelector('#edit-profile-nickname', el);
        const editNicknameCount = $Dom.QuerySelector('#edit-profile-nickname-count', el);
        // 新規項目：カテゴリ
        const editCategory = $Dom.QuerySelector('#edit-profile-category', el);
        const editCategoryCount = $Dom.QuerySelector('#edit-profile-category-count', el);
        const editDesc = $Dom.QuerySelector('#edit-profile-description', el);
        const editDescCount = $Dom.QuerySelector('#edit-profile-description-count', el);
        const editLink1 = $Dom.QuerySelector('#edit-profile-link1', el);
        const editLink2 = $Dom.QuerySelector('#edit-profile-link2', el);
        const editLink3 = $Dom.QuerySelector('#edit-profile-link3', el);
        editIconPreview.textContent = profile.icon || "👤";
        editIconInput.value = profile.icon || "👤";
        editNickname.value = profile.nick_name || "";
        editNicknameCount.textContent = (profile.nick_name || "").length;
        // カテゴリの初期値設定
        editCategory.value = profile.user_category || "";
        editCategoryCount.textContent = (profile.user_category || "").length;
        editDesc.value = profile.description || "";
        editDescCount.textContent = (profile.description || "").length;
        editLink1.value = profile.link_1 || "";
        editLink2.value = profile.link_2 || "";
        editLink3.value = profile.link_3 || "";
        editDesc.addEventListener('input', () => editDescCount.textContent = editDesc.value.length);
        editNickname.addEventListener('input', () => editNicknameCount.textContent = editNickname.value.length);
        // カテゴリの文字数カウントイベント
        editCategory.addEventListener('input', () => editCategoryCount.textContent = editCategory.value.length);
        // 追記：3つのリンクすべてにクリアイベントを紐付け
        [1, 2, 3].forEach(num => {
            const input = $Dom.QuerySelector(`#edit-profile-link${num}`, el);
            $Dom.QuerySelector(`#btn-edit-profile-link${num}-clear`, el).onclick = () => input.value = "";
        });
        $Dom.QuerySelector('#btn-profile-icon-trigger', el).onclick = () => {
            $Util.ShowEmojiPicker((emoji) => {
                editIconPreview.textContent = emoji;
                editIconInput.value = emoji;
            });
        };
        this._core.open({
            title: "プロフィールの編集",
            content: el,
            help: "",
            isFooterFixed: false,   // 編集用
            buttons: [
                [
                    {
                        label: "CANCEL",
                        className: "bg-slate-400 text-white shadow-md",
                        handler: () => {
                            this._core.close();
                        },
                    },
                    {
                        label: "SAVE",
                        className: "bg-brand-4 text-white shadow-md",
                        handler: $Warn.CatchAsync(async () => {
                            const updatedFields = {
                                nick_name: editNickname.value.trim(),
                                user_category: editCategory.value.trim(), // パラメータ追加
                                icon: editIconInput.value,
                                description: editDesc.value.trim(),
                                link_1: editLink1.value.trim(),
                                link_2: editLink2.value.trim(),
                                link_3: editLink3.value.trim(),
                            };
                            const isSuccess = await $Data.Access.UpdateProfile(updatedFields);
                            if (!isSuccess) return;
                            Object.assign(profile, updatedFields);
                            $Notice.Info("プロフィールを更新しました");
                            this._core.close();
                            if (onUpdate) onUpdate();
                            // 下段バーのアイコンを更新
                            $Bar.UpdateUserIcon();
                        })
                    }
                ]
            ]
        });
    },
    // 通報履歴リスト表示
    ShowMyReportList() {
        const reports = $App.AppData.Owner.SystemInfo.myReports || [];
        if (reports.length === 0) {
            $Notice.Warn("通報履歴はありません");
            return;
        }
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        // 日時が新しい順にソート
        [...reports].sort((a, b) => new Date(b.report_tim) - new Date(a.report_tim)).forEach(item => {
            const child = $Dom.GenerateTemplate("tpl-list-child-my-report");
            $Dom.QuerySelector(".js-date", child).textContent = $Util.FormatDate(item.report_tim);
            $Dom.QuerySelector(".js-body", child).textContent = item.body;
            // --- ターゲットユーザー表示（Generator: badgeモードを使用） ---
            const targetWrapper = $Dom.QuerySelector(".js-target-wrapper", child);
            $UI.Generator.UserBadge(targetWrapper, {
                nick_name: item.target_nick_name,
                icon: item.target_icon
            }, { type: 'badge' });
            // ステータスバッジの表示
            if (item.is_deleted) {
                $Dom.ToggleShow($Dom.QuerySelector(".js-badge-deleted", child), true);
            } else {
                if (item.is_closed) {
                    $Dom.ToggleShow($Dom.QuerySelector(".js-badge-closed", child), true);
                } else {
                    $Dom.ToggleShow($Dom.QuerySelector(".js-badge-alive", child), true);
                }
            }
            child.onclick = () => this.ShowMyReportDetail(item);
            root.appendChild(child);
        });
        this._core.open({
            title: "通報したまとめ",
            content: root,
            help: "",
        });
    },
    // 通報詳細表示
    ShowMyReportDetail(report) {
        const el = $Dom.GenerateTemplate("tpl-my-report-detail");
        // --- 1. アーカイブタイトルの表示制御 ---
        const titleEl = $Dom.QuerySelector("#view-report-archive-title", el);
        if (report.is_deleted) {
            titleEl.textContent = "既に削除されています";
            titleEl.classList.add("text-slate-600"); // 無効な感じの色
        } else if (report.is_closed) {
            titleEl.textContent = "現在「CLOSE」中です";
            titleEl.classList.add("text-red-400");   // 警告・停止中の色
        } else {
            titleEl.textContent = report.archive_title || "(No Title)";
            titleEl.classList.add("text-brand-5");   // 通常のブランドカラー
        }
        // 基本反映
        $Dom.QuerySelector(".js-report-tim", el).textContent = $Util.FormatDate(report.report_tim);
        $Dom.QuerySelector("#view-report-body", el).textContent = report.body;
        // ターゲットユーザーボタン（Generatorによる注入へ置換）
        const userWrapper = $Dom.QuerySelector("#view-report-target-user-wrapper", el);
        $UI.Generator.UserBadge(userWrapper, {
            user_id: report.target_user_id,
            nick_name: report.target_nick_name,
            icon: report.target_icon
        }, { type: 'button', isOwner: false });
        // アーカイブジャンプボタン
        const btnJump = $Dom.QuerySelector("#btn-report-jump-archive", el);
        if (report.is_deleted || report.is_closed) {
            btnJump.classList.add("grayscale");
        } else {
            btnJump.onclick = async () => {
                const isOk = await this.ShowConfirm({
                    title: "JUMP",
                    help: "",
                    message: "このアーカイブに移動しますか？"
                });
                if (!isOk) return;
                this._core.closeAll();
                $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.ARCHIVE_PUB;
                $App.AppData.Context.TargetArchiveId = report.archive_id;
                await $App.RefreshScreen();
            };
        }
        this._core.open({
            title: "通報情報の詳細",
            content: el,
        });
    },
    // クリック集計画面の表示
    async ShowClickStats(profile) {
        if (!profile) return;
        const el = $Dom.GenerateTemplate('tpl-click-stats');
        // ユーザー情報の反映
        $Dom.QuerySelector('.js-user-id', el).textContent = profile.nick_name || "Unknown";
        $Dom.QuerySelector('.js-nickname', el).textContent = profile.nick_name || "No Name";
        const container = $Dom.QuerySelector('.js-links-container', el);
        const stats = profile.click_stats || {};
        // link_1 〜 link_3 までをループ処理
        [1, 2, 3].forEach(num => {
            const linkKey = `link_${num}`;
            const url = profile[linkKey];
            // URLが未設定のものはスキップ
            if (!url || url.trim() === "") return;
            // URLからホスト名（ドメイン）を抽出してタイトルにする
            let domainName = "URL";
            try { domainName = new URL(url).hostname; } catch(e) {}
            // 対象リンクの集計データ（無ければ0をデフォルトに）
            const stat = stats[linkKey] || { t: 0, u: 0, g: 0 };
            const child = $Dom.GenerateTemplate('tpl-click-stats-item');
            $Dom.QuerySelector('.js-link-title', child).textContent = `リンク ${num} (${domainName})`;
            $Dom.QuerySelector('.js-link-url', child).textContent = url;
            $Dom.QuerySelector('.js-total', child).textContent = stat.t || 0;
            $Dom.QuerySelector('.js-unique', child).textContent = stat.u || 0;
            $Dom.QuerySelector('.js-guest', child).textContent = stat.g || 0;
            container.appendChild(child);
        });
        // リンクが1つも無い場合の表示
        if (container.children.length === 0) {
            container.innerHTML = `<div class="text-center text-[0.9rem] font-bold text-slate-600 py-6">設定されているリンクがありません</div>`;
        }
        this._core.open({
            title: "クリック数",
            content: el,
            help: "各リンクがクリックされた回数を集計しています。\nUniqueはクリックした人数、Guestはguestクリック数のクリック数です。",
            buttons: []
        });
    },
    // 【管理者機能】ユーザ解析情報
    ShowUserClickStats_2(profile) {
        const el = $Dom.GenerateTemplate("tpl-user-click-stats");
        // 1. ユーザバッジ & 通報数
        $UI.Generator.UserBadge($Dom.QuerySelector(".js-user-badge-container", el), profile, { type: 'badge' });
        $Dom.QuerySelector(".js-report-count", el).textContent = profile.report_count || 0;
        // 2. 実績解析（Private/Public共通ヘルパー）
        const fillStats = (selector, data) => {
            const target = $Dom.QuerySelector(selector, el);
            target.innerHTML = ""; // クリア
            if (!data) {
                target.innerHTML = `<span class="text-slate-600 italic">No Data</span>`;
                return;
            }
            const child = $Dom.GenerateTemplate("tpl-user-activity-summary");
            $Dom.QuerySelector(".js-archive-count", child).textContent = data.archive_count;
            $Dom.QuerySelector(".js-memo-count", child).textContent = data.detail_count;
            target.appendChild(child);
        };
        fillStats(".js-stats-pvt", profile.info_stats);
        fillStats(".js-stats-pub", profile.info_stats_pub);
        // 3. クリック集計リスト
        const container = $Dom.QuerySelector(".js-click-container", el);
        const links = [
            { id: 'link_1', url: profile.link_1 },
            { id: 'link_2', url: profile.link_2 },
            { id: 'link_3', url: profile.link_3 }
        ];
        links.forEach(link => {
            if (!link.url) return;
            const stats = profile.click_stats?.[link.id] || { t: 0, u: 0, g: 0 };
            const child = $Dom.GenerateTemplate("tpl-user-click-stats-item");
            $Dom.QuerySelector(".js-url", child).textContent = `🔗 ${link.url}`;
            $Dom.QuerySelector(".js-total", child).textContent = stats.t;
            $Dom.QuerySelector(".js-unique", child).textContent = stats.u;
            $Dom.QuerySelector(".js-guest", child).textContent = stats.g;
            container.appendChild(child);
        });
        // ▼ ヘッダーボタンの追加（管理者の場合のみ）
        const headerButtons = [];
        if ($App.AppData.Owner.Plan === "Admin") {
            headerButtons.push({
                label: "🕒",
                handler: () => this.ShowAdminUserHistory(profile) // 行動履歴画面の呼び出し
            });
            headerButtons.push({
                label: "✉️",
                handler: () => this.ShowAdminSendUserNotification(profile) // 個別通知送信画面の呼び出し
            });
        }
        // 強制アクション
        const isAdmin = $App.AppData.Owner.Plan === "Admin";
        if (isAdmin && !profile.is_owner) {
            const banCtrl = $Dom.QuerySelector('#admin-ban-control', el);
            const btnBan = $Dom.QuerySelector('#btn-admin-ban', el);
            const btnUnban = $Dom.QuerySelector('#btn-admin-unban', el);
            $Dom.ToggleShow(banCtrl, true);
            const refreshBanUI = (isBanned) => {
                $Dom.ToggleShow(btnBan, !isBanned);
                $Dom.ToggleShow(btnUnban, isBanned);
            };
            refreshBanUI(!!profile.ban_flg);
            const handleBanUpdate = async (isBanning) => {
                const title = isBanning ? "CONFIRM BAN" : "CONFIRM UNBAN";
                const msg = isBanning 
                    ? "このユーザをBANしますか？\n（本人の投稿が他人に表示されなくなります）" 
                    : "BANを解除しますか？";
                if (!await this.ShowConfirm({ title, message: msg })) return;
                if (!await $Util.CheckAdminAuth()) return; // 管理者PW確認
                const success = await $Data.Access.UpdateUserBanStatus({
                    target_user_id: profile.user_id,
                    is_banned: isBanning
                });
                if (success) {
                    profile.ban_flg = isBanning;
                    $Notice.Info(isBanning ? "ユーザをBANしました" : "BANを解除しました");
                    refreshBanUI(isBanning);
                }
            };
            btnBan.onclick = () => handleBanUpdate(true);
            btnUnban.onclick = () => handleBanUpdate(false);
        }
        // 画面を開く
        const help = [
            "【ユーザの解析情報です】",
            "",
            "",
            "",
            "",
            "",
        ].join('\n');
        this._core.open({
            title: "ユーザ情報解析",
            content: el,
            help: help,
            theme: profile.is_owner ? "user" : "admin", // 閲覧者が本人の場合は通常、管理者の場合はAdminテーマ
            headerButtons: headerButtons
        });
    },
    // 【管理者機能】ユーザ解析情報
    ShowUserClickStats(profile) {
        const el = $Dom.GenerateTemplate("tpl-user-click-stats");
        // --- 1. ユーザバッジ & 通報数（既存通り） ---
        $UI.Generator.UserBadge($Dom.QuerySelector(".js-user-badge-container", el), profile, { type: 'badge' });
        $Dom.QuerySelector(".js-report-count", el).textContent = profile.report_count || 0;
        // --- 2. 実績解析（既存通り） ---
        const fillStats = (selector, data) => {
            const target = $Dom.QuerySelector(selector, el);
            target.innerHTML = "";
            if (!data) {
                target.innerHTML = `<span class="text-slate-600 italic">No Data</span>`;
                return;
            }
            const child = $Dom.GenerateTemplate("tpl-user-activity-summary");
            $Dom.QuerySelector(".js-archive-count", child).textContent = data.archive_count;
            $Dom.QuerySelector(".js-memo-count", child).textContent = data.detail_count;
            target.appendChild(child);
        };
        fillStats(".js-stats-pvt", profile.info_stats);
        fillStats(".js-stats-pub", profile.info_stats_pub);
        // --- 3. クリック集計リスト（既存通り） ---
        const container = $Dom.QuerySelector(".js-click-container", el);
        const links = [
            { id: 'link_1', url: profile.link_1 },
            { id: 'link_2', url: profile.link_2 },
            { id: 'link_3', url: profile.link_3 }
        ];
        links.forEach(link => {
            if (!link.url) return;
            const stats = profile.click_stats?.[link.id] || { t: 0, u: 0, g: 0 };
            const child = $Dom.GenerateTemplate("tpl-user-click-stats-item");
            $Dom.QuerySelector(".js-url", child).textContent = `🔗 ${link.url}`;
            $Dom.QuerySelector(".js-total", child).textContent = stats.t;
            $Dom.QuerySelector(".js-unique", child).textContent = stats.u;
            $Dom.QuerySelector(".js-guest", child).textContent = stats.g;
            container.appendChild(child);
        });
        // --- 4. ヘッダーボタン（既存通り） ---
        const headerButtons = [];
        if ($App.AppData.Owner.Plan === "Admin") {
            headerButtons.push({
                label: "🕒",
                handler: () => this.ShowAdminUserHistory(profile)
            });
            headerButtons.push({
                label: "✉️",
                handler: () => this.ShowAdminSendUserNotification(profile)
            });
        }
        // ★★★ 修正箇所：シャドウBANコントロール ★★★
        const isAdmin = $App.AppData.Owner.Plan === "Admin";
        if (isAdmin && !profile.is_owner) {
            const banCtrl = $Dom.QuerySelector('#admin-ban-control', el);
            const btnBan = $Dom.QuerySelector('#btn-admin-ban', el);
            const btnUnban = $Dom.QuerySelector('#btn-admin-unban', el);
            $Dom.ToggleShow(banCtrl, true);
            // UI更新関数：is_ban の状態を見てボタンを出し分ける
            const refreshBanUI = () => {
                const isBanned = !!profile.is_ban; // プロパティ名を is_ban に修正
                $Dom.ToggleShow(btnBan, !isBanned);   // BANされていないなら「BAN実行」を表示
                $Dom.ToggleShow(btnUnban, isBanned);  // BANされているなら「解除」を表示
            };
            refreshBanUI(); // 初期表示
            const handleBanUpdate = async (isBanning) => {
                const title = isBanning ? "CONFIRM BAN" : "CONFIRM UNBAN";
                const msg = isBanning 
                    ? "このユーザをシャドウBANしますか？\n（本人の投稿が他人に表示されなくなります）" 
                    : "シャドウBANを解除しますか？";
                if (!await this.ShowConfirm({ title, message: msg })) return;
                if (!await $Util.CheckAdminAuth()) return; // 管理者PW確認
                const success = await $Data.Access.UpdateUserBanStatus({
                    target_user_id: profile.user_id,
                    is_banned: isBanning
                });
                if (success) {
                    profile.is_ban = isBanning; // 内部メモリのフラグを更新
                    $Notice.Info(isBanning ? "ユーザをBANしました" : "BANを解除しました");
                    refreshBanUI(); // ボタン表示を切り替え
                }
            };
            btnBan.onclick = () => handleBanUpdate(true);
            btnUnban.onclick = () => handleBanUpdate(false);
        }
        this._core.open({
            title: "ユーザ情報解析",
            content: el,
            help: "管理者のための解析画面です。",
            theme: profile.is_owner ? "user" : "admin",
            headerButtons: headerButtons
        });
    },
    // リーガル・ドキュメントのメニュー画面（5つのボタンリスト）
    async ShowLegalDocuments() {
        // 初回のNEWバッジ表示用に全体を取得
        const docs = await $LocalDb.Legal.GetAll();
        const LT = $Const.LEGAL_TYPE;
        const menuItems = [
            { key: LT.TERMS,      label: "利用規約",               icon: "📜" },
            { key: LT.PRIVACY,    label: "プライバシーポリシー",   icon: "🛡️" },
            { key: LT.SCTLAW,     label: "特定商取引法に基づく表記",icon: "⚖️" },
            { key: LT.DISCLAIMER, label: "免責事項",               icon: "⚠️" },
            { key: LT.LICENSE,    label: "ライセンス・権利表記",   icon: "📄" }
        ];
        const el = document.createElement("div");
        el.className = "w-full flex flex-col bg-brand-0";
        menuItems.forEach(item => {
            // 初期描画時のNEWバッジ判定用
            const initData = docs.find(d => d.id === item.key);
            const isUnread = initData ? !!initData.is_unread : false;
            const btn = document.createElement("button");
            btn.className = "w-full h-14 grid grid-cols-10 items-center px-4 border-b border-brand-2 hover:bg-brand-1 active:bg-brand-2 transition-colors text-slate-900 relative";
            btn.innerHTML = `
                <span class="col-span-1 kb-icon-emoji-lg flex justify-center">${item.icon}</span>
                <span class="col-span-1"></span>
                <span class="col-span-8 text-left font-bold text-[1rem] uppercase">${item.label}</span>
            `;
            // NEWバッジの追加（未読時のみ表示）
            if (isUnread) {
                const badge = document.createElement("span");
                badge.className = "absolute right-4 bg-red-500 text-white text-[0.8rem] px-2 py-0.5 rounded-full font-bold";
                badge.textContent = "NEW";
                btn.appendChild(badge);
            }
            btn.onclick = async () => {
                // ★ 修正：ボタン押下時に、ローカルDBから常に最新の1件を取得し直す
                const latestData = await $LocalDb.Legal.Get(item.key);
                this.ShowLegalDocumentDetail(
                    item.key, 
                    item.label, 
                    latestData ? latestData.body : null,
                    latestData ? latestData.update_tim : null
                );
                // 既読化処理も最新データに基づいて行う
                if (latestData && latestData.is_unread) {
                    await $LocalDb.Legal.Save(latestData.id, latestData.body, latestData.update_tim, false);
                    await $Data.LocalDb.CheckLegalUnread();
                    const badge = btn.querySelector('.bg-red-500');
                    if (badge) badge.remove();
                }
            };
            el.appendChild(btn);
        });
        this._core.open({
            title: "利用規約とポリシー",
            content: el,
            help: "各種リーガル情報を確認できます。",
            buttons: []
        });
    },
    // 個別の法的情報表示ダイアログ
    ShowLegalDocumentDetail(key, title, body, updateTim) {
        const el = $Dom.GenerateTemplate("tpl-view-legal");
        const dateEl = $Dom.QuerySelector(".js-legal-date", el);
        const bodyEl = $Dom.QuerySelector(".js-legal-body", el);
        // ★ 追加：値を画面に反映する処理を関数化
        const renderView = (currentBody, currentTim) => {
            dateEl.textContent = currentTim ? $Util.FormatDate(currentTim) : "---";
            bodyEl.textContent = currentBody ? currentBody : "現在、この項目は準備中です。";
        };
        // 初期描画
        renderView(body, updateTim); 
        const headerButtons = [];
        if ($App.AppData.Owner.Plan === "Admin") {
            headerButtons.push({
                label: "✏️",
                handler: () => {
                    // ★ 修正：第3引数にコールバックを渡し、保存完了時に再描画させる
                    this.ShowAdminCoreDocumentEditor(key, title, (updatedBody, updatedTim) => {
                        renderView(updatedBody, updatedTim);
                    });
                }
            });
        }
        this._core.open({
            title: title,
            content: el,
            size: 'lg',
            buttons: [],
            headerButtons: headerButtons
        });
    },
    // 閲覧履歴画面の表示メソッドを新設
    async ShowViewHistory(ids) {
        // ② サーバーからアーカイブ情報を取得
        const isSuccess = await $Data.Access.GetArchiveListByIds({ archive_ids: ids });
        if (!isSuccess) return;
        const archives = $Data.resData.archives || [];
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        const PDS = $Const.PUBLIC_DATA_STATUS; // Nothing, Open, Close, Delete
        archives.forEach(item => {
            const child = $Dom.GenerateTemplate("tpl-list-child-archive");
            // 基本情報の流し込み
            $Dom.QuerySelector(".js-update-tim", child).textContent = $Util.FormatDate(item.update_tim);
            $Dom.QuerySelector(".js-title", child).textContent = item.title;
            $Dom.QuerySelector(".js-memo", child).textContent = item.memo || "";
            $Dom.QuerySelector(".js-count", child).textContent = item.detail_count || "0";
            // ② has_public_status に対応したUI（バッジと枠線）の制御
            const border = $Dom.QuerySelector(".js-item-border", child);
            const countBadge = $Dom.QuerySelector(".js-count-badge", child);
            const status = item.has_public_status;
            // クラスのクリア
            border.className = "js-item-border absolute left-0 top-0 bottom-0 w-1 ";
            countBadge.className = "js-count-badge px-2.5 py-0.5 rounded-full text-[0.9rem] font-bold text-white italic tracking-tight ";
            if (status === PDS.OPEN) {
                border.classList.add("bg-brand-5");
                countBadge.classList.add("bg-brand-5");
            } else {
                // Delete または Nothing（データ異常含む）
                border.classList.add("bg-slate-800");
                countBadge.classList.add("bg-slate-800");
                child.style.opacity = "0.2";
            }
            // クリックイベント
            child.onclick = async () => {
                // ③ Open以外は詳細を開けないようにする
                if (status !== PDS.OPEN) {
                    $Notice.Warn("このまとめは現在、公開されていません。");
                    return;
                }
                // ④ 詳細に飛ぶ前に確認ダイアログを表示
                const isOk = await this.ShowConfirm({
                    title: "OPEN ARCHIVE",
                    message: `「${item.title}」を開きますか？`,
                    label: "OPEN"
                });
                if (!isOk) return;
                // 遷移実行
                this._core.closeAll();
                $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.ARCHIVE_PUB;
                $App.AppData.Context.TargetArchiveId = item.archive_id;
                await $App.RefreshScreen();
            };
            root.appendChild(child);
        });
        this._core.open({
            title: "最近チェックしたまとめ",
            content: root,
            size: "lg",
            help: "最近閲覧した「公開まとめ」の一覧です。\n※現在公開を停止しているものは開くことができません。"
        });
    },
    // 外部リンク起動確認ダイアログ
    async ShowLinkOpen({ url, onOpen }) {
        const el = $Dom.GenerateTemplate("tpl-dialog-link-confirm");
        $Dom.QuerySelector(".js-url", el).textContent = url;
        const help = "【セキュリティ警告】\n直接リンクを開く際のリスクについて\n\n悪意のあるサイト（フィッシング詐欺等）により個人情報が盗まれる可能性があります。信頼できないサイトの場合は、直接開かずに「Google検索」ボタンからサイトの評判を確認することをお勧めします。";
        this._core.open({
            title: "外部リンクの確認",
            content: el,
            help: help,
            buttons: [[
                {
                    label: "Google検索",
                    className: "bg-slate-500 text-white shadow-md",
                    handler: () => {
                        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
                        window.open(searchUrl, '_blank', 'noopener,noreferrer');
                        this._core.close();
                    }
                },
                {
                    label: "直接開く",
                    handler: () => {
                        if (onOpen) onOpen(); // クリック集計等のコールバック実行
                        window.open(url, '_blank', 'noopener,noreferrer');
                        this._core.close();
                    }
                }
            ]]
        });
    },
};