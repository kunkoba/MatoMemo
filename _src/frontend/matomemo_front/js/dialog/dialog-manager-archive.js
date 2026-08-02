export default {
    // 状態変更の定型処理ヘルパー
    async _execStatusChange(methodName, params, confirmTitle, 
        confirmMsg, successMsg, nextScreenMode = null, onUpdateStore = null) {
        // Promiseで結果を待つ
        const isOk = await this.ShowConfirm({
            title: confirmTitle,
            help: "",
            message: confirmMsg
        });
        if (!isOk) return; // キャンセルならここで終了
        // OKだった場合のAPI実行処理
        await $Warn.CatchAsync(async () => {
            const isSuccess = await $Data.Access[methodName](params);
            if (!isSuccess) return;
            if (onUpdateStore) onUpdateStore();
            $Notice.Info(successMsg);
            this._core.closeAll();
            if (nextScreenMode) {
                $App.AppData.Context.ScreenMode = nextScreenMode;
                await $App.RefreshScreen();
            } else {
                const archive = $Data.Store.GetArchive();
                if (archive) $Bar.ChangeTitle(archive.title);
            }
        })();
    },
    // タイムライン用リスト
    ShowDetailsTimeLine() {
        const details = $Data.Store.GetDetails();
        if (!details || details.length === 0) return $Notice.Warn("データはありません。");
        const isPub = $App.AppData.Context.ScreenMode === $Const.SCREEN_MODE.ARCHIVE_PUB;
        const archive = $Data.Store.GetArchive();
        const canDetach = archive && !archive.is_public && archive.is_owner;
        const el = $Dom.GenerateTemplate("tpl-timeline-container");
        const listContainer = $Dom.QuerySelector(".js-list-container", el);
        // ブレーク判定用（公開ならday番号、自分用なら日付文字列）
        let currentBreakKey = null;
        details.forEach((item, index) => {
            const breakKey = isPub ? item.display_day : item.memo_date;
            // 日付が変わるタイミングでヘッダーを挿入
            if (currentBreakKey !== breakKey) {
                const header = $Dom.GenerateTemplate("tpl-timeline-date");
                const container = $Dom.QuerySelector(".js-date-container", header);
                // 【修正箇所】新部品を呼び出し。ヘッダーなので時刻は表示しないよう null を渡す
                $UI.Generator.MemoDateFormatter(container, { ...item, memo_time: null }, 'lg');
                listContainer.appendChild(header);
                currentBreakKey = breakKey;
            }
            // --- アイテム本体の描画（ここからは既存維持） ---
            const child = $Dom.GenerateTemplate("tpl-timeline-item");
            // 番号バッジの反映
            const indexBadge = $Dom.QuerySelector(".js-index-badge", child);
            if (indexBadge) indexBadge.textContent = (index + 1);
            // Feelアイコンの反映
            const feelImg = $Dom.QuerySelector(".js-feel-image", child);
            feelImg.src = $Util.GetFeelIconPath(item.feel_type);
            $Dom.ToggleShow(feelImg, true);
            // 基本情報の反映
            $Dom.QuerySelector(".js-time", child).textContent = item.memo_time || "";
            $Dom.QuerySelector(".js-face", child).textContent = item.face_emoji || '😀';
            $Dom.QuerySelector(".js-title", child).textContent = item.title || "No Title";
            $Dom.QuerySelector(".js-body", child).textContent = item.body || "";
            const btnDetach = $Dom.QuerySelector(".js-btn-detach", child);
            if (btnDetach && canDetach) {
                $Dom.ToggleShow(btnDetach, true);
                btnDetach.onclick = async (e) => {
                    e.stopPropagation();
                    if (!await this.ShowConfirm({ title: "REMOVE ITEM", message: "このメモをまとめから外し、単独のメモに戻しますか？" })) return;
                    if (await $Data.Access.DetachDetails({ seqs: [item.seq], archive_id: item.archive_id })) {
                        $Notice.Info("まとめから外しました。"); this._core.closeAll(); await $App.RefreshScreen();
                    }
                };
            }
            const priceWrapper = $Dom.QuerySelector(".js-price-wrapper", child);
            const priceEl = $Dom.QuerySelector(".js-price", child);
            const priceUnitEl = $Dom.QuerySelector(".js-price-unit", child);
            if (priceEl && priceWrapper) {
                const price = Number(item.memo_price || 0);
                if (price !== 0) {
                    $Dom.ToggleShow(priceWrapper, true);
                    let displayCurrency = $App.AppData.Owner.Currency_unit || 'JPY';
                    if (item.archive_id > 0) {
                        const arc = $Data.Store.GetArchiveList()?.find(a => a.archive_id === item.archive_id) || $Data.Store.GetArchive();
                        if (arc?.currency_unit) displayCurrency = arc.currency_unit;
                    }
                    if (priceUnitEl) priceUnitEl.textContent = displayCurrency;
                    if (price > 0) {
                        priceEl.textContent = `+${price.toLocaleString()}`; priceEl.className += " text-blue-500";
                    } else {
                        priceEl.textContent = price.toLocaleString(); priceEl.className += " text-red-500";
                    }
                } else { $Dom.ToggleShow(priceWrapper, false); }
            }
            child.onclick = () => { this._core.closeAll(); $Marker.SelectMarker(index); };
            listContainer.appendChild(child);
        });
        this._core.open({ title: "タイムライン", content: el });
    },
    // 検索結果用リスト
    ShowDetailsSearchResult() {
        const details = $Data.Store.GetDetails();
        if (!details || details.length === 0) return $Notice.Warn("データはありません。");
        const el = $Dom.GenerateTemplate("tpl-list-parent");
        const rt = $Const.REACTION_TYPE; // リアクション定数
        details.forEach((item, index) => {
            const child = $Dom.GenerateTemplate("tpl-list-child-search");
            // --- 1. 基本情報の反映 ---
            $Dom.QuerySelector(".js-index", child).textContent = (index + 1);
            $Dom.QuerySelector(".js-face", child).textContent = item.face_emoji || '😀';
            $Dom.QuerySelector(".js-archive-title", child).textContent = item.a_title || "(No Archive)";
            $Dom.QuerySelector(".js-title", child).textContent = item.title || "No Title";
            $Dom.QuerySelector(".js-body", child).textContent = (item.body || "").replace(/\r?\n/g, ' ');
            // --- 【変更】日付情報の反映 ---
            const dateContainer = $Dom.QuerySelector(".js-date-container", child);
            // dateContainer.innerHTML = "";
            $UI.Generator.MemoDateFormatter(dateContainer, item);
            // // --- 3. リアクション統計の反映 ---
            // $Dom.QuerySelector(".js-icon-funny", child).textContent = rt.FUNNY.emoji;
            // $Dom.QuerySelector(".js-count-funny", child).textContent = item.count_funny || 0;
            // $Dom.QuerySelector(".js-icon-love", child).textContent = rt.LOVE.emoji;
            // $Dom.QuerySelector(".js-count-love", child).textContent = item.count_love || 0;
            // $Dom.QuerySelector(".js-icon-surprise", child).textContent = rt.SURPRISE.emoji;
            // $Dom.QuerySelector(".js-count-surprise", child).textContent = item.count_surprise || 0;
            // $Dom.QuerySelector(".js-icon-sad", child).textContent = rt.SAD.emoji;
            // $Dom.QuerySelector(".js-count-sad", child).textContent = item.count_sad || 0;
            // // --- 4. 金額エリアの制御（既存ロジック） ---
            // const priceWrapper = $Dom.QuerySelector(".js-price-wrapper", child);
            // const priceEl = $Dom.QuerySelector(".js-memo-price", child);
            // const currencyEl = $Dom.QuerySelector(".js-memo-currency", child);
            // const price = Number(item.memo_price || 0);
            // if (price !== 0) {
            //     // $Dom.ToggleShow(priceWrapper, true);
            //     let displayCurrency = item.currency_unit || 'JPY';
            //     if (item.archive_id > 0) {
            //         const arc = $Data.Store.GetArchiveList()?.find(a => a.archive_id === item.archive_id) || $Data.Store.GetArchive();
            //         if (arc?.currency_unit) displayCurrency = arc.currency_unit;
            //     }
            //     currencyEl.textContent = displayCurrency;
            //     if (price > 0) {
            //         priceEl.textContent = `+${price.toLocaleString()}`; priceEl.classList.add("text-blue-500");
            //     } else {
            //         priceEl.textContent = price.toLocaleString(); priceEl.classList.add("text-red-500");
            //     }
            // }
            // マーカー選択イベント
            child.onclick = () => { this._core.closeAll(); $Marker.SelectMarker(index); };
            el.appendChild(child);
        });
        this._core.open({ title: "検索の結果", content: el });
    },
    async ShowArchiveList_2() {
        const isSuccess = await $Data.Access.GetArchiveList();
        if (!isSuccess) return;
        const archives = $Data.Store.GetArchiveList() || [];
        if (archives.length == 0) {
            $Notice.Warn("データはありません");
            return;
        }
        const root = document.createElement("div");
        root.className = "w-full flex flex-col";
        const searchBar = $Dom.GenerateTemplate("tpl-dialog-search-bar", "ui-template-root", false);
        const input = $Dom.QuerySelector(".js-input", searchBar);
        const clearBtn = $Dom.QuerySelector(".js-clear", searchBar);
        root.appendChild(searchBar);
        const listContainer = document.createElement("div");
        root.appendChild(listContainer);
        const render = (filterText = "") => {
            listContainer.innerHTML = "";
            const query = filterText.toLowerCase().trim();
            const filtered = archives.filter(item => {
                const target = (item.title || "") + (item.memo || "");
                return target.toLowerCase().includes(query);
            });
            if (filtered.length === 0) {
                listContainer.innerHTML = `<div class="text-center text-[0.9rem] font-bold text-slate-600 py-10">合致するまとめがありません</div>`;
                return;
            }
            const pvt = filtered.filter(item => !item.is_public);
            const pub = filtered.filter(item => item.is_public);
            const draw = (title, list, isPub) => {
                if (list.length === 0) return;
                const header = $Dom.GenerateTemplate("tpl-list-group-header");
                const badge = $Dom.QuerySelector(".js-header-badge", header);
                $Dom.QuerySelector(".js-header-title", header).textContent = title;
                if (isPub) {
                    badge.classList.add("bg-brand-5");
                    $Dom.QuerySelector(".js-header-icon", header).textContent = "◎";
                } else {
                    badge.classList.add("bg-slate-800");
                    $Dom.QuerySelector(".js-header-icon", header).textContent = "🔒";
                }
                listContainer.appendChild(header);
                list.forEach(item => {
                    const child = $Dom.GenerateTemplate("tpl-list-child-archive");
                    $Dom.QuerySelector(".js-update-tim", child).textContent = $Util.FormatDate(item.update_tim);
                    $Dom.QuerySelector(".js-title", child).textContent = item.title;
                    $Dom.QuerySelector(".js-memo", child).textContent = item.memo || "";
                    $Dom.QuerySelector(".js-count", child).textContent = item.detail_count || "0";
                    const border = $Dom.QuerySelector(".js-item-border", child);
                    const countBadge = $Dom.QuerySelector(".js-count-badge", child);
                    if (isPub) {
                        const isCls = !!item.closed_flg;
                        border.classList.add(isCls ? "bg-slate-400" : "bg-brand-5");
                        countBadge.classList.add(isCls ? "bg-slate-400" : "bg-brand-5");
                    } else {
                        border.classList.add("bg-slate-800");
                        countBadge.classList.add("bg-slate-800");
                    }
                    child.onclick = () => {
                        this._core.closeAll();
                        $App.AppData.Context.ScreenMode = isPub ? $Const.SCREEN_MODE.ARCHIVE_PUB : $Const.SCREEN_MODE.ARCHIVE;
                        $App.AppData.Context.TargetArchiveId = item.archive_id;
                        $App.RefreshScreen();
                    };
                    listContainer.appendChild(child);
                });
            };
            draw("Private", pvt, false);
            draw("Pbulic", pub, true);
        };
        input.oninput = (e) => {
            const val = e.target.value;
            $Dom.ToggleShow(clearBtn, val.length > 0);
            render(val);
        };
        clearBtn.onclick = () => {
            input.value = "";
            $Dom.ToggleShow(clearBtn, false);
            render("");
            input.focus();
        };
        render("");
        // 画面を開く
        const help = [
            "まとめ（旅行記）の一覧です",
            "● まとめには「非公開」と「公開用」があります",
            "●「公開用」には「公開中」と「非公開中」があります",
            "【まとめ】",
            "　├─公開用（Private）[黒]",
            "　└─公開用（Public）",
            "　　　├─非公開中（Close）[グレー]",
            "　　　└─公開中（Open）[テーマカラー]",
            "　　　　　├─限定公開（LimitedOpen）",
            "　　　　　└─完全公開（Open）",
        ].join('\n');
        this._core.open({
            title: "まとめ一覧", 
            size: "lg",
            content: root, 
            help: help, 
        });
    },
    // まとめ一覧表示
    async ShowArchiveList() {
        const isSuccess = await $Data.Access.GetArchiveList();
        if (!isSuccess) return;
        const archives = $Data.Store.GetArchiveList() || [];
        if (archives.length === 0) return $Notice.Warn("データはありません");
        const root = document.createElement("div");
        root.className = "w-full flex flex-col";
        // 1. 固定ヘッダー構築
        const stickyHeader = document.createElement("div");
        stickyHeader.className = "sticky top-0 z-20 bg-white pb-2 flex flex-col gap-1";
        const searchBar = $Dom.GenerateTemplate("tpl-dialog-search-bar", "ui-template-root", false);
        const filterToggle = $Dom.GenerateTemplate("tpl-archive-list-filter", "ui-template-root", false);
        stickyHeader.appendChild(searchBar);
        stickyHeader.appendChild(filterToggle);
        root.appendChild(stickyHeader);
        const listContainer = document.createElement("div");
        root.appendChild(listContainer);
        // 2. 状態管理
        let filterText = "";
        let isShowPublic = false;
        // 3. 描画ロジック
        const render = () => {
            listContainer.innerHTML = "";
            const query = filterText.toLowerCase().trim();
            // ボタンの見た目制御：選択中なら不透明、それ以外は10%の半透明
            $Dom.QuerySelectorAll('.js-filter-btn', filterToggle).forEach(btn => {
                const isActive = (btn.dataset.pub === "true") === isShowPublic;
                btn.classList.toggle('opacity-100', isActive);
                btn.classList.toggle('opacity-10', !isActive);
                // 影も不要であれば toggle('shadow-md', isActive) も削除
                btn.classList.toggle('shadow-md', isActive);
                btn.style.pointerEvents = isActive ? 'none' : 'auto'; // 選択中を再度押せなくする
            });
            // フィルタ実行
            const filtered = archives.filter(item => {
                if (item.is_public !== isShowPublic) return false;
                return !query || (item.title + (item.memo || "")).toLowerCase().includes(query);
            });
            if (filtered.length === 0) {
                listContainer.innerHTML = `<div class="text-center text-[0.9rem] font-bold text-slate-600 py-10">該当なし</div>`;
                return;
            }
            // アイテム描画
            filtered.forEach(item => {
                const child = $Dom.GenerateTemplate("tpl-list-child-archive");
                $Dom.QuerySelector(".js-update-tim", child).textContent = $Util.FormatDate(item.update_tim);
                $Dom.QuerySelector(".js-title", child).textContent = item.title;
                $Dom.QuerySelector(".js-memo", child).textContent = item.memo || "";
                $Dom.QuerySelector(".js-count", child).textContent = item.detail_count || "0";
                // ステータスに応じた色分け
                let colorClass = "bg-slate-800"; // デフォルト：非公開（黒）
                if (isShowPublic) {
                    if (item.closed_flg) {
                        colorClass = "bg-slate-400"; // 非公開中（グレー）
                    } else if (item.limited_open_flg) {
                        colorClass = "bg-orange-400"; // 限定公開中（オレンジ）
                    } else {
                        colorClass = "bg-brand-5"; // 公開中（テーマカラー）
                    }
                }
                $Dom.QuerySelector(".js-item-border", child).classList.add(colorClass);
                $Dom.QuerySelector(".js-count-badge", child).classList.add(colorClass);
                child.onclick = () => {
                    this._core.closeAll();
                    $App.AppData.Context.ScreenMode = isShowPublic ? $Const.SCREEN_MODE.ARCHIVE_PUB : $Const.SCREEN_MODE.ARCHIVE;
                    $App.AppData.Context.TargetArchiveId = item.archive_id;
                    $App.RefreshScreen();
                };
                listContainer.appendChild(child);
            });
        };
        // 4. イベント登録
        $Dom.QuerySelector(".js-input", searchBar).oninput = (e) => {
            filterText = e.target.value;
            $Dom.ToggleShow($Dom.QuerySelector(".js-clear", searchBar), filterText.length > 0);
            render();
        };
        $Dom.QuerySelector(".js-clear", searchBar).onclick = () => {
            $Dom.QuerySelector(".js-input", searchBar).value = "";
            filterText = ""; render();
        };
        $Dom.QuerySelectorAll('.js-filter-btn', filterToggle).forEach(btn => {
            btn.onclick = () => { isShowPublic = (btn.dataset.pub === "true"); render(); };
        });
        render();
        this._core.open({ title: "まとめ一覧", size: "lg", content: root });
    },
    // 既存まとめへの追加先選択ダイアログ
    SelectArchiveForAdd(seqs) {
        $Warn.CatchAsync(async () => {
            // 最新のアーカイブリストを取得
            const isSuccess = await $Data.Access.GetArchiveList();
            if (!isSuccess) return;
            const root = $Dom.GenerateTemplate("tpl-list-parent");
            // root.className = "w-full text-slate-600 mb-2 px-1";
            const archives = $Data.Store.GetArchiveList() ||[];
            // プライベートデータのみに絞る
            const privateList = archives.filter(item => !item.is_public);
            if (privateList.length === 0) {
                $Notice.Warn("追加できるまとめデータがありません。");
                return;
            }
            // ヘッダーの生成
            const header = $Dom.GenerateTemplate("tpl-list-group-header");
            $Dom.QuerySelector(".js-header-badge", header).classList.add("bg-slate-800");
            $Dom.QuerySelector(".js-header-icon", header).textContent = "🔒";
            $Dom.QuerySelector(".js-header-title", header).textContent = "SELECT TARGET ARCHIVE";
            root.appendChild(header);
            // リスト描画
            privateList.forEach(item => {
                const child = $Dom.GenerateTemplate("tpl-list-child-archive");
                $Dom.QuerySelector(".js-update-tim", child).textContent = $Util.FormatDate(item.update_tim);
                $Dom.QuerySelector(".js-title", child).textContent = item.title;
                $Dom.QuerySelector(".js-memo", child).textContent = item.memo || "";
                $Dom.QuerySelector(".js-count", child).textContent = item.detail_count || "0";
                // バッジの装飾（PRIVATE固定）
                const leftBorder = $Dom.QuerySelector(".js-item-border", child);
                // leftBorder.className = "absolute left-0 top-0 bottom-0 w-1 bg-slate-800";
                // アイテムクリック時の処理（追加確認 ＆ API実行）
                child.onclick = async () => {
                    const isOk = await this.ShowConfirm({
                        title: "ADD",
                        help: "",
                        message: `${seqs.length}件のアイテムを「${item.title}」に追加しますか？`
                    });
                    if (!isOk) return;
                    const params = { seqs: seqs, archive_id: item.archive_id };
                    const isAddSuccess = await $Data.Access.AddDetails(params);
                    if (!isAddSuccess) return;
                    $Notice.Info("追加しました。");
                    this._core.closeAll();
                    // ARCHIVEモードに切り替えて対象のまとめを開く
                    $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.ARCHIVE;
                    $App.AppData.Context.TargetArchiveId = item.archive_id;
                    await $App.RefreshScreen();
                };
                root.appendChild(child);
            });
            // 選択用ダイアログを開く
            this._core.open({
                title: "追加先のまとめを選択",
                content: root,
                help: "",
                buttons: []
            });
        })();
    },
    // メモをまとめる（複数選択モード）
    async ShowMultiSelectTimeline() {
        // --- ローカルの未更新データを同期処理 ---
        $Notice.Loading.Show(); // ローディング表示
        try {
            // 1. ローカルDBの未送信明細を一括送信
            await $Data.LocalDb.BulkSendDetails();
            // 2. サーバーから最新の「未マージ明細リスト」を再取得
            // (これが成功すると Store も最新化される)
            const isSuccess = await $Data.Access.GetUnMergeDetails({});
            if (!isSuccess) return; // 失敗時はエラーハンドラに任せて終了
        } finally {
            $Notice.Loading.Hide(); // ローディング解除
        }
        // 最新データを表示
        const details = $Data.Store.GetDetails();
        if (!details || details.length === 0) {
            $Notice.Warn("データはありません。");
            return;
        }
        const content = $Dom.GenerateTemplate("tpl-multi-select-content");
        const listContainer = $Dom.QuerySelector(".js-list-container", content);
        const selectedSeqs = new Set();
        let frame = null; // ダイアログ生成後に保持
        const updateSelectionUI = () => {
            const hasSelection = selectedSeqs.size > 0;
            // フッター内に生成されたボタンの活性制御
            if (frame) {
                // 時間差で取得
                const btnMerge = frame.querySelector('#btn-ms-merge');
                const btnAdd = frame.querySelector('#btn-ms-add');
                const btnDelete = frame.querySelector('#btn-ms-delete');
                if (btnMerge) btnMerge.disabled = !hasSelection;
                if (btnAdd) btnAdd.disabled = !hasSelection;
                if (btnDelete) btnDelete.disabled = !hasSelection;
            }
            $Dom.QuerySelectorAll(".js-item-card", content).forEach(card => {
                const seq = Number(card.dataset.seq);
                const isSel = selectedSeqs.has(seq);
                const checkbox = $Dom.QuerySelector(".js-checkbox", card);
                const mark = $Dom.QuerySelector(".js-check-mark", card);
                const cardHtml = "js-item-card flex items-center gap-3 p-3 mb-2 rounded-[1rem] border-2 cursor-pointer active:scale-[0.98] transition-all";
                const checkHtml = "shrink-0 w-6 h-6 rounded-[1rem] border-2 flex items-center justify-center js-checkbox transition-colors";
                if (isSel) {
                    card.className = cardHtml + " border-brand-5 bg-white shadow-md";
                    checkbox.className = checkHtml + " border-brand-5 bg-brand-5";
                    mark.classList.remove("hidden");
                } else {
                    card.className = cardHtml + " border-brand-1 bg-white";
                    checkbox.className = checkHtml + " border-brand-2 bg-transparent";
                    mark.classList.add("hidden");
                }
            });
        };
        const groups = {};
        details.forEach(item => {
            const dateStr = item.memo_date;
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(item);
        });
        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        sortedDates.forEach(date => {
            const header = $Dom.GenerateTemplate("tpl-multi-select-date");
            const dateEl = $Dom.QuerySelector(".js-date-text", header);
            // 共通部品を呼び出し（グループ化のキーである date 文字列をオブジェクトとして渡す）
            $UI.Generator.MemoDateFormatter(dateEl, { memo_date: date });
            header.onclick = () => {
                const groupItems = groups[date];
                const isAllSelected = groupItems.every(item => selectedSeqs.has(item.seq));
                groupItems.forEach(item => {
                    if (isAllSelected) selectedSeqs.delete(item.seq);
                    else selectedSeqs.add(item.seq);
                });
                updateSelectionUI();
            };
            listContainer.appendChild(header);
            groups[date].sort((a, b) => b.memo_time.localeCompare(a.memo_time)).forEach(item => {
                const card = $Dom.GenerateTemplate("tpl-multi-select-item");
                card.dataset.seq = item.seq;
                $Dom.QuerySelector(".js-time", card).textContent = item.memo_time;
                $Dom.QuerySelector(".js-title", card).textContent = item.title;
                $Dom.QuerySelector(".js-body", card).textContent = item.body;
                $Dom.QuerySelector(".js-emoji", card).textContent = item.face_emoji || '😀';
                card.onclick = () => {
                    if (selectedSeqs.has(item.seq)) selectedSeqs.delete(item.seq);
                    else selectedSeqs.add(item.seq);
                    updateSelectionUI();
                };
                listContainer.appendChild(card);
            });
        });
        updateSelectionUI();
        frame = this._core.open({
            title: "地点メモを選択",
            content: content,
            help: "",
            buttons: [[
                {
                    id: "btn-ms-merge",
                    label: "create",
                    className: "disabled:opacity-50",
                    handler: async () => {
                        const seqs = Array.from(selectedSeqs);
                        const isOk = await this.ShowConfirm({
                            title: "MERGE",
                            help: "",
                            message: `${seqs.length}件のメモから\n新しいまとめを作成しますか？`
                        });
                        if (!isOk) return;
                        const isSuccess = await $Data.Access.MergeDetails({
                            seqs,
                            title: "まとめのタイトル" + $Util.FormatDate(new Date(), '_HHmmss'),
                            currency_unit: $App.AppData.Owner.Currency_unit || 'JPY'
                        });
                        if (!isSuccess) return;
                        $Notice.Info("作成しました");
                        this._core.closeAll();
                        $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.ARCHIVE;
                        await $App.RefreshScreen();
                    }
                },
                {
                    id: "btn-ms-add",
                    label: "＋ ADD",
                    className: "disabled:opacity-50",
                    handler: () => {
                        const seqs = Array.from(selectedSeqs);
                        // 新しく作った専用メソッドを呼び出す
                        this.SelectArchiveForAdd(seqs);
                    }
                },
                {
                    id: "btn-ms-delete",
                    label: "DELETE",
                    // 危険な操作なので赤枠・赤文字でデザイン
                    className: "disabled:opacity-50 border-2 border-red-200 !bg-white !text-red-500",
                    handler: async () => {
                        const seqs = Array.from(selectedSeqs);
                        const isOk = await this.ShowConfirm({
                            title: "DELETE ITEMS",
                            help: "",
                            message: `選択した ${seqs.length} 件のアイテムを削除しますか？\n（この操作は元に戻せません）`
                        });
                        if (!isOk) return;
                        const isOk2 = await this.ShowConfirm({
                            title: "DELETE ITEMS",
                            help: "",
                            message: `選択した ${seqs.length} 件のアイテムを削除します。`
                        });
                        if (!isOk2) return;     
                        // API通信でサーバー側に配列を渡す
                        const isSuccess = await $Data.Access.DeleteStrayDetails({ seqs: seqs });
                        if (!isSuccess) return;
                        $Notice.Info("選択したメモを削除しました。");
                        this._core.closeAll();
                        await $App.RefreshScreen(); // マーカーと一覧を最新化
                    }
                }
            ]]
        });
        updateSelectionUI(); // フッターボタン生成後に再度呼んで初期状態の disabled を反映
    },
    // まとめ親詳細参照（アーカイブ）
    ShowArchiveInfo() {
        const archive = $Data.Store.GetArchive();
        const isAdmin = $App.AppData.Context.IsLoggedIn && $App.AppData.Owner.Plan === "Admin";
        // ★修正：データが取得できていない場合は処理を中断
        if (!archive) return;
        const el = $Dom.GenerateTemplate('tpl-view-archive');
        // URLとQRコードの生成（最初に行う）
        const baseUrl = window.location.origin + window.location.pathname;
        const encodedId = $Util.EncodeId(archive.archive_id);
        const shareUrl = `${baseUrl}?mode=archive_pub&encodedId=${encodedId}`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
        // 画像の先読み
        const imgPreload = new Image();
        imgPreload.src = qrImageUrl;
        const renderTitleAndBody = (arc) => {
            $Dom.QuerySelector('#view-mem-category', el).textContent = arc.category || "";
            $Dom.QuerySelector('#view-mem-title', el).textContent = arc.title || "";
            $Dom.QuerySelector('#view-mem-body', el).textContent = arc.memo || "";
        };
        // URLリンクの描画
        const renderUrlLink = (arc) => {
            const urlWrapper = $Dom.QuerySelector('#view-mem-url-wrapper', el);
            urlWrapper.innerHTML = "";
            if (!arc.link_url) {
                $Dom.ToggleShow(urlWrapper, false);
                return;
            }
            $Dom.ToggleShow(urlWrapper, true);
            const params = { target_type: 2, target_user_id: arc.user_id, archive_id: arc.archive_id, item_name: "link_url" };
            const isAdded = $UI.Generator.LinkButton(urlWrapper, arc.link_url, params, arc.is_owner);
            $Dom.ToggleShow(urlWrapper, isAdded);
        };
        // 統計情報の描画
        const renderStats = (arc, details) => {
            const totalPrice = details.reduce((sum, item) => sum + Number(item.memo_price || 0), 0);
            const priceVal = $Dom.QuerySelector('#mem-stat-price', el);
            priceVal.textContent = totalPrice.toLocaleString();
            if (totalPrice > 0) priceVal.className = "font-bold text-[1.1rem] text-blue-500";
            else if (totalPrice < 0) priceVal.className = "font-bold text-[1.1rem] text-red-500";
            else priceVal.className = "font-bold text-[1.1rem] text-slate-900";
            $Dom.QuerySelector('#view-mem-price-unit', el).textContent = arc.currency_unit || $App.AppData.Owner.Currency_unit || 'JPY';
            $Dom.QuerySelector('#mem-stat-distance', el).textContent = $Util.GetTotalDistance(details).toFixed(1);
            $Dom.QuerySelector('#btn-view-mem-timeline', el).onclick = () => this.ShowDetailsTimeLine();
            $Dom.QuerySelector('#mem-stat-count', el).textContent = details.length;
        };
        // 公開状況管理ステッパーの描画
        const renderStatusStepper = (arc) => {
            if (!arc || !arc.is_owner) {
                const container = $Dom.GetElementById('archive-status-bar-container');
                if (container) $Dom.ToggleShow(container, false);
                return;
            }
            // テンプレートを直接挿入し、既存の内容をクリア
            const stepper = $Dom.GenerateTemplate("tpl-archive-status-stepper", "archive-status-bar-container", false);
            const container = $Dom.GetElementById('archive-status-bar-container');
            $Dom.ToggleShow(container, true);
            // 1. ステップ判定 (1:非公開, 2:公開準備, 3:公開中)
            let currentStep = 1;
            if (arc.is_public) {
                currentStep = arc.closed_flg ? 2 : 3;
            }
            // 2. カードの選択状態更新（未選択は半透明）
            $Dom.QuerySelectorAll('.js-step-card', stepper).forEach(card => {
                const step = parseInt(card.dataset.step);
                const isActive = (step === currentStep);
                // 現在の状態なら不透明(100%)、それ以外は半透明(50%)
                card.classList.toggle('opacity-10', !isActive);
            });
            // 3. 限定公開バッジの表示制御
            const isLimited = (currentStep === 3 && arc.limited_open_flg);
            $Dom.QuerySelector('#js-stepper-limited-badge', stepper).style.opacity = isLimited ? "1" : "0";
            // 5. アクションボタンのイベント登録
            $Dom.QuerySelector('#btn-archive-status-change', stepper).onclick = () => {
                this.ShowArchiveStatusChange(arc);
            };
        };
        // 【修正】引数を3つ受け取るように変更
        const buildHeaderButtons = (profile, sUrl, qrIUrl) => {
            const headerButtons = [];
            if (archive.is_public && !archive.closed_flg) {
                headerButtons.push({
                    label: "🔗",
                    handler: () => this.ShowShareArchive(archive, profile, sUrl, qrIUrl)
                });
            }
            if (archive.is_owner) {
                headerButtons.push({
                    label: "✏️",
                    handler: () => this.ShowEditArchive(archive, renderView)
                });
            } else {
                headerButtons.push({
                    label: "🚫",
                    handler: () => this.ShowReportPost(archive)
                });
            }
            if ((archive.is_owner || isAdmin) && archive.is_public) {
                headerButtons.push({
                    label: "📊",
                    handler: () => this.ShowArchiveClickStats(archive)
                });
            }
            return headerButtons;
        };
        // 全体描画
        const renderView = () => {
            const arc = $Data.Store.GetArchive();
            if (!arc) return; // クラッシュ防止
            const details = $Data.Store.GetDetails() || [];
            renderTitleAndBody(arc);
            renderUrlLink(arc);
            renderStats(arc, details);
            renderStatusStepper(arc);
        };
        renderView();
        const profile = $Data.Store.GetUserProfile();
        if (profile) $UI.Generator.UserBadge($Dom.QuerySelector('#view-mem-user-wrapper', el), profile, { type: 'button', isOwner: archive.is_owner });
        // 【修正】生成済みのURLを渡す
        const headerButtons = buildHeaderButtons(profile, shareUrl, qrImageUrl);
        // 画面を開く
        const help = [
            "まとめ（旅行記）の詳細情報です",
            "● 自分のデータ・・・修正したり、解析データを見ることができます",
            "● 他人のデータ・・・閲覧したり、通報したりできます",
            "● 公開用データ・・・まとめを共有できます",
            "",
            "",
        ].join('\n');
        this._core.open({ 
            title: "まとめ詳細", 
            content: el, 
            help: help,
            size: 'lg', 
            headerButtons: headerButtons, 
        });
    },
    // 公開ステータス変更ダイアログ
    ShowArchiveStatusChange(arc) {
        const root = document.createElement("div");
        root.className = "w-full flex flex-col gap-4 p-2";
        // 現在の状態特定
        let current = 2; 
        if (arc.is_public) {
            if (arc.closed_flg) current = 3;
            else if (arc.limited_open_flg) current = 4;
            else current = 5;
        }
        const statusItems = [
            { id: 1, label: "✖ まとめ解体" },
            { id: 2, label: "🔒 非公開中" },
            { id: 3, label: "－ 公開準備中" },
            { id: 4, label: "〇 限定公開中" },
            { id: 5, label: "◎ 完全公開中" }
        ];
        const transitionMap = {
            2: [1, 3],
            3: [2, 4, 5],
            4: [3, 5],
            5: [3, 4]
        };
        const clickableTargets = transitionMap[current] || [];
        statusItems.forEach(item => {
            const btn = document.createElement("button");
            btn.textContent = item.label;
            btn.className = "w-full py-4 text-[1rem] font-bold rounded-[1rem] transition-all outline-none";
            if (item.id === current) {
                btn.classList.add("bg-slate-900", "text-white");
            } else if (clickableTargets.includes(item.id)) {
                btn.classList.add("bg-slate-50", "text-slate-900", "shadow-md", "active:scale-95");
                btn.onclick = async () => {
                    const p = { archive_id: arc.archive_id };
                    // 共通メソッド _execStatusChange を用いて確実に状態を同期
                    switch (item.id) {
                        case 1:
                            this._execStatusChange('DeleteArchive', p, 'RESTORE', 
                                'まとめを解体し、個別のメモに戻しますか？', 
                                '解体しました', $Const.SCREEN_MODE.CREATE
                            );
                            break;
                        case 2:
                            this._execStatusChange('UnpublishArchive', p, 'PRIVATE', 
                                '公開データを削除しますか？', 
                                '削除しました', $Const.SCREEN_MODE.ARCHIVE, 
                                () => $Data.Store.UpdateArchive({ is_public: false, closed_flg: false })
                            );
                            break;
                        case 3:
                            // 公開準備中（Step 3）への遷移
                            if (arc.is_public) {
                                // A. 既に公開中の場合は単なる Close 処理
                                this._execStatusChange('CloseArchive', p, 'CLOSE', 
                                    '公開を一時停止し、準備中に戻しますか？', 
                                    '変更しました', null, 
                                    () => $Data.Store.UpdateArchive({ closed_flg: true })
                                );
                            } else {
                                // B. 新たに「公開化」する場合の判定
                                const status = arc.has_public_status;
                                const PDS = $Const.PUBLIC_DATA_STATUS;
                                // ① 有効な公開データが既にある場合は遮断
                                if (status === PDS.OPEN || status === PDS.CLOSE) {
                                    return $Notice.Warn("既に有効な公開データが存在するため、公開データは作れません。");
                                }
                                // ② 削除済みデータがある場合の選択ロジック
                                let resetFlg = true;
                                if (status === PDS.DELETE) {
                                    // 復活か作り直しかを確認
                                    const isRecreate = await this.ShowConfirm({
                                        title: "公開データの復旧選択",
                                        message: "過去の公開データが見つかりました。\n破棄して作り直しますか？\n\n「OK」：作り直す\n「CANCEL」：復活させる",
                                        label: "OK"
                                    });
                                    resetFlg = isRecreate;
                                }
                                // 実行（reset_flg をパラメータに含める）
                                const params = { ...p, reset_flg: resetFlg };
                                const confirmMsg = resetFlg ? "公開データを作成します。\n続行しますか？" : "過去の公開データを復活させますか？";
                                this._execStatusChange('PublishArchive', params, 'PUBLISH', 
                                    confirmMsg, 
                                    '完了', $Const.SCREEN_MODE.ARCHIVE_PUB, 
                                    () => $Data.Store.UpdateArchive({ is_public: true, closed_flg: true })
                                );
                            }
                            break;
                        case 4:
                            this._execStatusChange('OpenLimitedArchive', p, 'LIMITED', 
                                '限定公開に設定しますか？', 
                                '設定しました', null, () => {
                                    if(arc.closed_flg) $Data.Store.UpdateArchive({ closed_flg: false });
                                    $Data.Store.UpdateArchive({ is_public: true, limited_open_flg: true });
                                }
                            );
                            break;
                        case 5:
                            const isOk = await this.ShowConfirm({
                                title: "セキュリティ喚起",
                                message: "★★　警告　★★\n\n個人情報が含まれていないことを\n確認しましたか？",
                                label: "大丈夫"
                            });
                            if (!isOk) return;
                            if (current === 4) {
                                this._execStatusChange('OpenArchive', p, 'OPEN', 
                                    '限定公開を解除し、全体公開にしますか？', 
                                    '公開しました', null, 
                                    () => $Data.Store.UpdateArchive({ limited_open_flg: false })
                                );
                            } else {
                                this._execStatusChange('OpenArchive', p, 'OPEN', 
                                    '全体に公開しますか？', 
                                    '公開しました', null, 
                                    () => $Data.Store.UpdateArchive({ closed_flg: false, limited_open_flg: false })
                                );
                            }
                            break;
                    }
                };
            } else {
                btn.classList.add("bg-slate-50", "text-slate-400", "opacity-50", "pointer-events-none");
            }
            root.appendChild(btn);
        });
        this._core.open({ title: "公開状態を変更する", content: root, buttons: [] });
    },
    // URL公開画面
    ShowShareArchive(archive, profile, shareUrl, qrImageUrl) {
        const el = $Dom.GenerateTemplate('tpl-share-archive');
        $Dom.QuerySelector('#share-archive-title', el).textContent = archive.title || "No Title";
        // 画像URLをsrcにセット
        const qrImg = $Dom.QuerySelector('#share-qr-image', el);
        qrImg.src = qrImageUrl;
        // ボタン類にはサイトURLをセット
        $Dom.QuerySelector('#btn-share-copy', el).onclick = () => {
            navigator.clipboard.writeText(shareUrl).then(() => $Notice.Info("URLをコピーしました！"));
        };
        $Dom.QuerySelector('#btn-share-line', el).onclick = async () => {
            // if (await $Dialog.ShowConfirm({ title: "LINE 連携", message: "LINE を起動しますか？" })) window.open($Util.GetShareUrl('line', shareUrl), '_blank');
            const isOk = await $Dialog.ShowConfirm({
                title: "LINE 連携",
                message: "LINE を起動しますか？"
            });
            if (isOk) {
                const url = $Util.GetShareUrl('line', shareUrl);
                $Util.OpenExternalLink(url);
            }

        };
        $Dom.QuerySelector('#btn-share-x', el).onclick = async () => {
            // if (await $Dialog.ShowConfirm({ title: "X 連携", message: "X を起動しますか？" })) window.open($Util.GetShareUrl('x', shareUrl, archive.title), '_blank');
            const isOk = await $Dialog.ShowConfirm({
                title: "X連携",
                message: "Xを起動しますか？"
            });
            if (isOk) {
                const url = $Util.GetShareUrl('x', shareUrl, archive.title);
                $Util.OpenExternalLink(url);
            }

        };
        $Dom.QuerySelector('#btn-share-fb', el).onclick = async () => {
            // if (await $Dialog.ShowConfirm({ title: "facebook 連携", message: "facebook を起動しますか？" })) window.open($Util.GetShareUrl('facebook', shareUrl), '_blank');
            const isOk = await $Dialog.ShowConfirm({
                title: "facebook連携",
                message: "facebookを起動しますか？"
            });
            if (isOk) {
                const url = $Util.GetShareUrl('facebook', shareUrl);
                $Util.OpenExternalLink(url);
            }
        };
        this._core.open({ title: "まとめを共有する", content: el, size: 'sm', buttons: [] });
    },
    // まとめ親編集（上にスタックされる）
    ShowEditArchive(archive, onUpdate) {
        const el = $Dom.GenerateTemplate('tpl-edit-archive');
        const editCategory = $Dom.QuerySelector('#edit-mem-category', el);
        const editTitle = $Dom.QuerySelector('#edit-mem-title', el);
        const editBody = $Dom.QuerySelector('#edit-mem-body', el);
        const editUrl = $Dom.QuerySelector('#edit-mem-url', el);
        const btnUrlClear = $Dom.QuerySelector('#btn-edit-mem-url-clear', el);
        btnUrlClear.onclick = () => { editUrl.value = ""; };
        const editCurrency = $Dom.QuerySelector('#edit-mem-currency', el);
        editCategory.value = archive.category || "";
        editTitle.value = archive.title || "";
        editBody.value = archive.memo || "";
        editUrl.value = archive.link_url || "";
        editCurrency.value = archive.currency_unit || $App.AppData.Owner.Currency_unit || 'JPY';
        // --- 文字数カウント制御 ---
        const cCategory = $Dom.QuerySelector('#edit-mem-category-count', el); // 追加
        const cTitle = $Dom.QuerySelector('#edit-mem-title-count', el);
        const cBody  = $Dom.QuerySelector('#edit-mem-body-count', el);
        cCategory.textContent = editCategory.value.length;
        cTitle.textContent = editTitle.value.length;
        cBody.textContent  = editBody.value.length;
        editCategory.addEventListener('input', () => cCategory.textContent = editCategory.value.length);
        editTitle.addEventListener('input', () => cTitle.textContent = editTitle.value.length);
        editBody.addEventListener('input',  () => cBody.textContent  = editBody.value.length);
        //
        this._core.open({
            title: "詳細情報の編集",
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
                        className: "",
                        handler: $Warn.CatchAsync(async () => {
                            const updatedFields = {
                                category: editCategory.value.trim(),
                                title: editTitle.value,
                                memo: editBody.value,
                                link_url: editUrl.value,
                                currency_unit: editCurrency.value.trim(),
                            };
                            const isSuccess = (!archive.is_public)
                                ? await $Data.Access.UpdateArchive({ archive_id: archive.archive_id, ...updatedFields })
                                : await $Data.Access.UpdateArchivePub({ archive_id: archive.archive_id, ...updatedFields });
                            if (!isSuccess) return;
                            $Data.Store.UpdateArchive(updatedFields);
                            $Bar.ChangeTitle(updatedFields.title);
                            $Notice.Info("保存しました。");
                            this._core.closeAll();
                            // if (onUpdate) onUpdate(); // 参照画面のDOMを最新化
                        })
                    }
                ]
            ]
        });
    },
    // アーカイブと明細のクリック集計画面の表示
    ShowArchiveClickStats(archive) {
        if (!archive) return;
        const el = $Dom.GenerateTemplate('tpl-archive-click-stats');
        // --- 1. アーカイブ情報の反映 ---
        $Dom.QuerySelector('.js-arc-title', el).textContent = archive.title || "No Title";
        $Dom.QuerySelector('.js-arc-url', el).textContent = archive.link_url || "リンクなし";
        const arcStats = (archive.click_stats && archive.click_stats.link_url) ? archive.click_stats.link_url : { t: 0, u: 0, g: 0 };
        $Dom.QuerySelector('.js-arc-total', el).textContent = arcStats.t || 0;
        $Dom.QuerySelector('.js-arc-unique', el).textContent = arcStats.u || 0;
        $Dom.QuerySelector('.js-arc-guest', el).textContent = arcStats.g || 0;
        // --- 追加: アーカイブ自体の閲覧数 ---
        const arcViewCount = archive.click_count || (archive.click_stats && archive.click_stats.view && archive.click_stats.view.t) || 0;
        const arcViewCountEl = $Dom.QuerySelector('.js-arc-view-count', el);
        if (arcViewCountEl) arcViewCountEl.textContent = arcViewCount;
        // const statusBadge = $Dom.QuerySelector('.js-arc-status-badge', el);
        // if (!archive.is_public) {
        //     statusBadge.textContent = "非公開";
        //     statusBadge.className += " bg-slate-200 text-slate-900";
        // } else if (archive.closed_flg) {
        //     statusBadge.textContent = "CLOSE";
        //     statusBadge.className += " bg-slate-400 text-white";
        // } else {
        //     statusBadge.textContent = "公開中";
        //     statusBadge.className += " bg-emerald-100 text-emerald-600";
        // }
        // if (archive.is_owner) $Dom.ToggleShow($Dom.QuerySelector('.js-arc-owner-badge', el), true);
        // --- 2. 明細情報の反映 ---
        const detailsContainer = $Dom.QuerySelector('.js-details-container', el);
        const details = $Data.Store.GetDetails() || [];
        if (details.length === 0) {
            detailsContainer.innerHTML = `<div class="text-center text-[0.9rem] font-bold text-slate-600 py-4">明細データがありません</div>`;
        } else {
            details.forEach(dtl => {
                const child = $Dom.GenerateTemplate('tpl-archive-click-stats-item');
                // 修正: seq ではなく no (付与した連番) を表示
                $Dom.QuerySelector('.js-dtl-seq', child).textContent = dtl.no || "-";
                $Dom.QuerySelector('.js-dtl-icon', child).textContent = dtl.face_emoji || "🚩";
                $Dom.QuerySelector('.js-dtl-title', child).textContent = dtl.title || "No Title";
                // --- 2.1 リアクション集計の動的生成 ---
                const reactContainer = $Dom.QuerySelector('.js-dtl-reactions', child);
                reactContainer.innerHTML = ""; 
                Object.values($Const.REACTION_TYPE).forEach(type => {
                    const countProp = type.prop.replace('has_', 'count_');
                    const count = dtl[countProp] || 0;
                    const div = document.createElement("div");
                    div.className = "flex items-center gap-1 text-[0.9rem]";
                    div.innerHTML = `<span class="kb-icon-emoji-sm">${type.emoji}</span><span class="font-bold text-slate-600">${count}</span>`;
                    reactContainer.appendChild(div);
                });
                // --- 2.2 クリック統計の反映 ---
                const urlEl = $Dom.QuerySelector('.js-dtl-url', child);
                const statsBox = $Dom.QuerySelector('.js-dtl-stats-box', child);
                if (dtl.link_url && dtl.link_url.trim() !== "") {
                    urlEl.textContent = dtl.link_url;
                    urlEl.classList.replace("text-slate-600", "text-blue-500");
                    const dStats = (dtl.click_stats && dtl.click_stats.link_url) ? dtl.click_stats.link_url : { t: 0, u: 0, g: 0 };
                    $Dom.QuerySelector('.js-dtl-total', child).textContent = dStats.t || 0;
                    $Dom.QuerySelector('.js-dtl-unique', child).textContent = dStats.u || 0;
                    // $Dom.QuerySelector('.js-dtl-guest', child).textContent = dStats.g || 0;
                    $Dom.ToggleShow(statsBox, true);
                } else {
                    urlEl.textContent = "リンクなし";
                    urlEl.classList.add("text-slate-600", "italic");
                    $Dom.ToggleShow(statsBox, false);
                }
                detailsContainer.appendChild(child);
            });
        }
        // 画面を開く
        const help = [
            "【まとめ（旅行記）の解析データです】",
            "この画面で、「閲覧数・リンククリック数・リアクション数」を確認することができます",
            "（集計頻度：１回/日）",
            "● クリックユーザ数・・・１人が３回クリックしても「１」になります",
            "● guestクリック数・・・未ログインユーザのクリック数",
            "",
            "",
        ].join('\n');
        this._core.open({
            title: "まとめの解析データ",
            content: el,
            help: help,
            size: 'lg'
        });
    },
    // 新設：特定ユーザの公開まとめリストを表示
    async ShowUserArchiveList(profile) {
        // サーバーから対象ユーザの「完全公開」まとめのみ取得
        const isSuccess = await $Data.Access.GetArchiveListByUser({ 
            target_user_id: profile.user_id 
        });
        if (!isSuccess) return;
        // API側で archives にリストが入ってくる想定
        const archives = $Data.resData.archives || [];
        if (archives.length === 0) {
            $Notice.Info("公開されているまとめはありません。");
            return;
        }
        // ③ まとめリストのテンプレートを使いまわす
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        const PDS = $Const.PUBLIC_DATA_STATUS;
        archives.forEach(item => {
            const child = $Dom.GenerateTemplate("tpl-list-child-archive");
            $Dom.QuerySelector(".js-update-tim", child).textContent = $Util.FormatDate(item.update_tim);
            $Dom.QuerySelector(".js-title", child).textContent = item.title;
            $Dom.QuerySelector(".js-memo", child).textContent = item.memo || "";
            $Dom.QuerySelector(".js-count", child).textContent = item.detail_count || "0";
            // 完全公開（OPEN）前提なので、ブランドカラーで統一
            const border = $Dom.QuerySelector(".js-item-border", child);
            const countBadge = $Dom.QuerySelector(".js-count-badge", child);
            border.classList.add("bg-brand-5");
            countBadge.classList.add("bg-brand-5");
            // クリックで確認後に詳細へジャンプ
            child.onclick = async () => {
                const isOk = await this.ShowConfirm({
                    title: "OPEN ARCHIVE",
                    message: `「${item.title}」を開きますか？`,
                    label: "OPEN"
                });
                if (!isOk) return;
                this._core.closeAll();
                $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.ARCHIVE_PUB;
                $App.AppData.Context.TargetArchiveId = item.archive_id;
                await $App.RefreshScreen();
            };
            root.appendChild(child);
        });
        this._core.open({
            title: `公開まとめ一覧`,
            content: root,
            size: "",
            help: "このユーザが全体に公開している「まとめ」の一覧です。"
        });
    },
};
