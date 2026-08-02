export default {
    // 【管理者機能】管理者メニュー
    ShowAdminMenu() {
        const el = $Dom.GenerateTemplate('tpl-menu-admin');
        $Dom.QuerySelector('#btn-admin-notice', el).onclick = () => this.ShowAdminNoticeList();
        $Dom.QuerySelector('#btn-admin-report', el).onclick = () => this.ShowAdminReportList();
        $Dom.QuerySelector('#btn-admin-feedback', el).onclick = () => this.ShowAdminFeedbackList();
        $Dom.QuerySelector('#btn-admin-user-mail', el).onclick = () => this.ShowAdminUserMailList();
        $Dom.QuerySelector('#btn-admin-ban-users', el).onclick = () => this.ShowAdminBanUserList();
        $Dom.QuerySelector('#btn-admin-core-cfg', el).onclick = () => this.ShowAdminCoreConfig();
        this._core.open({
            title: "管理者ツール",
            content: el,
            theme: "admin",
            help: "",
        });
    },
    // 通知管理リスト（API通信化）
    async ShowAdminNoticeList() {
        const isSuccess = await $Data.Access.GetAdminNotifications();
        if (!isSuccess) return;
        const notices = $App.AppData.Admin.Notifications ||[];
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        // root.className = "w-full text-slate-600 mb-2 px-1";
        const renderList = async () => {
            root.innerHTML = "";
            if (notices.length === 0) {
                root.innerHTML = `<div class="text-center text-[0.9rem] font-bold text-slate-600 py-6">通知データがありません</div>`;
                return;
            }
            const now = new Date();
            const sorted = [...notices].sort((a, b) => new Date(b.update_tim) - new Date(a.update_tim));
            sorted.forEach(item => {
                const child = $Dom.GenerateTemplate("tpl-admin-list-child-notice");
                $Dom.QuerySelector(".js-date", child).textContent = $Util.FormatDate(item.update_tim);
                const kindObj = Object.values($Const.NOTICE_KIND).find(k => k.id === item.kind) || $Const.NOTICE_KIND.NOTICE;
                $Dom.QuerySelector(".js-title", child).textContent = `${kindObj.emoji} ${item.title}`;
                $Dom.QuerySelector(".js-body", child).textContent = item.body;
                const fromDate = new Date(item.disp_from);
                const toDate = new Date(item.disp_to);
                const isPublic = (now >= fromDate && now <= toDate);
                const badge = $Dom.QuerySelector(".js-badge-status", child);
                if (isPublic) {
                    badge.textContent = "公開中";
                    badge.className += " border-brand-3 bg-brand-5 text-white";
                } else if (now < fromDate) {
                    badge.textContent = "公開予定";
                    badge.className += "  bg-slate-100 text-slate-600";
                } else {
                    badge.textContent = "公開終了";
                    badge.className += "  bg-slate-500 text-white";
                }
                // 編集を開き、保存成功時は一覧を閉じて開き直す
                child.onclick = () => {
                    this.ShowAdminNoticeEdit(item, () => {
                        this._core.close(); // 一覧も閉じて
                        this.ShowAdminNoticeList(); // 最新データで再度一覧を開く
                    });
                };
                root.appendChild(child);
            });
        };
        await renderList();
        //
        this._core.open({
            title: "システム通知一覧",
            content: root,
            theme: "admin",
            help: "システム全体への通知を管理します。\n下のボタンから新規作成、一覧の項目タップで編集が可能です。",
            // 新規登録ボタンをここ（下部ボタンエリア）に配置
            buttons: [
                {
                    label: "＋ CREATE",
                    className: "w-full bg-brand-5 text-white shadow-md font-bold",
                    handler: () => {
                        this.ShowAdminNoticeEdit(null, () => {
                            this._core.close(); // 一覧を閉じる
                            this.ShowAdminNoticeList(); // 最新状態で一覧を出し直す
                        });
                    }
                }
            ]
        });
    },
    // 通知の編集・新規登録（三択ボタン形式へ修正）
    ShowAdminNoticeEdit(noticeItem, onSaved) {
        const isNew = !noticeItem;
        const target = isNew ? {
            seq: 0, title: "", body: "", kind: 2, // 初期値は 2:Notice
            link_url: "",
            disp_from: $Util.FormatDate(new Date(), 'YYYY-MM-DD'),
            disp_to: "2099-12-31",
        } : { ...noticeItem };
        const el = $Dom.GenerateTemplate("tpl-admin-notice-edit");
        // --- 1. 種別選択ボタンの生成ロジック ---
        const kindGroup = $Dom.QuerySelector('#edit-notice-kind-group', el);
        const inputKind = $Dom.QuerySelector('#edit-notice-kind-val', el);
        inputKind.value = target.kind;
        Object.values($Const.NOTICE_KIND).forEach(type => {
            const btn = document.createElement("button");
            // 基本スタイル（メール送信画面と同様）
            btn.className = "flex-1 rounded-lg py-2 flex flex-col items-center justify-center active:scale-95 transition-all bg-slate-50 border-2 border-transparent shadow-sm";
            btn.innerHTML = `
                <span class="text-[1.5rem] mb-1">${type.emoji}</span>
                <span class="text-[0.8rem] font-bold text-slate-600">${type.label}</span>
            `;
            const refreshBtnUI = () => {
                const isActive = Number(inputKind.value) === type.id;
                if (isActive) {
                    btn.classList.add('bg-white', 'border-brand-5', 'shadow-md');
                    btn.classList.remove('bg-slate-50', 'border-transparent', 'shadow-sm');
                } else {
                    btn.classList.remove('bg-white', 'border-brand-5', 'shadow-md');
                    btn.classList.add('bg-slate-50', 'border-transparent', 'shadow-sm');
                }
            };
            btn.onclick = () => {
                inputKind.value = type.id;
                // 全ボタンのUIを更新
                Array.from(kindGroup.children).forEach(child => {
                    // 各ボタンに設定された自身の更新処理をキック（またはループで再計算）
                    // ここではシンプルに全体を再描画する代わりに、クラス操作を直接行います
                    const b = child;
                    b.classList.remove('bg-white', 'border-brand-5', 'shadow-md');
                    b.classList.add('bg-slate-50', 'border-transparent', 'shadow-sm');
                });
                btn.classList.add('bg-white', 'border-brand-5', 'shadow-md');
                btn.classList.remove('bg-slate-50', 'border-transparent', 'shadow-sm');
            };
            kindGroup.appendChild(btn);
            refreshBtnUI(); // 初回状態反映
        });
        // --- 2. その他の要素制御（既存のまま） ---
        const inptTitle = $Dom.QuerySelector('#edit-notice-title', el);
        const inptBody = $Dom.QuerySelector('#edit-notice-body', el);
        const inptUrl = $Dom.QuerySelector('#edit-notice-url', el);
        const inptFrom = $Dom.QuerySelector('#edit-notice-from', el);
        const inptTo = $Dom.QuerySelector('#edit-notice-to', el);
        const countTitle = $Dom.QuerySelector('#edit-notice-title-count', el);
        const countBody = $Dom.QuerySelector('#edit-notice-body-count', el);
        inptTitle.value = target.title;
        inptBody.value = target.body;
        inptUrl.value = target.link_url || "";
        inptFrom.value = $Util.FormatDate(target.disp_from, 'YYYY-MM-DD');
        inptTo.value = $Util.FormatDate(target.disp_to, 'YYYY-MM-DD');
        countTitle.textContent = inptTitle.value.length;
        countBody.textContent = inptBody.value.length;
        inptTitle.addEventListener('input', () => countTitle.textContent = inptTitle.value.length);
        inptBody.addEventListener('input', () => countBody.textContent = inptBody.value.length);
        $Dom.QuerySelector('#btn-clear-notice-from', el).onclick = () => inptFrom.value = "";
        $Dom.QuerySelector('#btn-clear-notice-to', el).onclick = () => inptTo.value = "";
        this._core.open({
            title: isNew ? "システム通知 登録" : "システム通知 編集",
            content: el,
            theme: "admin",
            isFooterFixed: false,
            buttons:[[
                {
                    label: "CANCEL",
                    className: "bg-slate-400 text-white shadow-md",
                    handler: () => this._core.close(),
                },
                {
                    label: "SAVE",
                    className: "bg-brand-5 text-white shadow-md",
                    handler: async () => {
                        const isOk = await this.ShowConfirm({ 
                            title: isNew ? "NEW NOTICE" : "EDIT NOTICE",
                            message: "通知情報を保存しますか？" 
                        });
                        if (!isOk) return;
                        const req = {
                            seq: target.seq,
                            title: inptTitle.value.trim() || "No Title",
                            body: inptBody.value.trim(),
                            link_url: inptUrl.value.trim(),
                            kind: Number(inputKind.value), // 隠しフィールドから取得
                            disp_from: (inptFrom.value || $Util.FormatDate(new Date(), 'YYYY-MM-DD')) + "T00:00:00",
                            disp_to: (inptTo.value || "2099-12-31") + "T23:59:59"
                        };
                        const isSuccess = await $Data.Access.UpsertNotification(req);
                        if (!isSuccess) return;
                        $Notice.Info("保存しました。");
                        await $Data.Access.GetAdminAllInfo();
                        this._core.close();
                        if (onSaved) onSaved();
                    }
                }
            ]]
        });
    },
    // 通報集計一覧（API通信化）
    async ShowAdminReportList() {
        const isSuccess = await $Data.Access.GetReportSummary();
        if (!isSuccess) return;
        const reportSummary = $App.AppData.Admin.ReportSummary || [];
        if (reportSummary.length === 0) {
            $Notice.Warn("通報データはありません");
            return;
        }
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        // 通報件数の多い順にソート
        const sorted = [...reportSummary].sort((a, b) => b.report_count - a.report_count);
        sorted.forEach(item => {
            const child = $Dom.GenerateTemplate("tpl-admin-list-child-report-summary");
            // ① まとめタイトルの反映
            $Dom.QuerySelector(".js-archive-title", child).textContent = item.archive_title || "Unknown Title";
            // ② 通報件数の反映
            $Dom.QuerySelector(".js-badge-count", child).textContent = `${item.report_count}`;
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
            // ④ ユーザーバッジの生成と反映（キー名は実際のAPIに合わせてください）
            const userWrapper = $Dom.QuerySelector(".js-user-wrapper", child);
            $UI.Generator.UserBadge(userWrapper, {
                user_id: item.target_user_id,
                nick_name: item.target_nick_name,
                icon: item.target_icon,
            }, { type: 'badge' }); // ラベル（バッジ）タイプで出力
            child.onclick = () => this.ShowAdminReportDetail(item);
            root.appendChild(child);
        });
        this._core.open({
            title: "通報情報の集計結果",
            content: root,
            theme: "admin",
            help: "",
            buttons: []
        });
    },
    // 【管理者機能】通報詳細
    async ShowAdminReportDetail(summaryItem) {
        const isSuccess = await $Data.Access.GetReportDetails({
            target_user_id: summaryItem.target_user_id,
            archive_id: summaryItem.archive_id
        });
        if (!isSuccess) return;
        const reports = $Data.resData.reports || [];
        const el = $Dom.GenerateTemplate("tpl-admin-report-detail");
        // --- ① タイトル表示：加工せずそのまま表示 ---
        const titleEl = $Dom.QuerySelector(".js-archive-title", el);
        titleEl.textContent = summaryItem.archive_title || "Unknown Title";
        // ターゲットユーザー設定（既存通り）
        const userWrapper = $Dom.QuerySelector("#view-report-target-user-wrapper", el);
        const profile = $Data.resData.target_userProfile;
        if (profile) {
            $UI.Generator.UserBadge(userWrapper, profile, { type: 'button', isOwner: false });
        }
        // --- ② ボタンの活性・非活性制御 ---
        const btnOpenArchive = $Dom.QuerySelector("#btn-admin-report-open-archive", el);
        const btnClose       = $Dom.QuerySelector("#btn-admin-report-close", el);
        const btnPrivate     = $Dom.QuerySelector("#btn-admin-report-private", el);
        const isClosed  = !!summaryItem.is_closed;
        const isDeleted = !!summaryItem.is_deleted;
        // 非活性化用の共通処理
        const setDisabled = (btn) => {
            btn.disabled = true;
            btn.classList.add("opacity-30", "cursor-not-allowed", "grayscale");
            btn.classList.remove("active:scale-95", "hover:bg-slate-700"); // 既存のホバーやアクティブ効果を消す
            btn.onclick = null;
        };
        // CLOSEボタン：既に Close または Delete 済みの場合は押せない
        if (isClosed || isDeleted) {
            setDisabled(btnClose);
            if (isClosed) btnClose.textContent = "CLOSE済み";
        }
        // DELETEボタン：既に Delete 済みの場合は押せない
        if (isDeleted) {
            setDisabled(btnPrivate);
            btnPrivate.textContent = "DELETE済み";
            // 削除済みの場合はアーカイブを開くボタンも無効化
            setDisabled(btnOpenArchive);
            $Dom.QuerySelector("span:last-child", btnOpenArchive).textContent = "🚫";
        }
        // アーカイブを開くボタンのクリックイベント（削除されていない場合のみ）
        if (!isDeleted) {
            btnOpenArchive.onclick = async () => {
                const isOk = await this.ShowConfirm({ title: "JUMP", message: "この Public まとめデータを開きますか？" });
                if (!isOk) return;
                this._core.closeAll();
                $App.AppData.Context.ScreenMode = $Const.SCREEN_MODE.ARCHIVE_PUB;
                $App.AppData.Context.TargetArchiveId = summaryItem.archive_id;
                await $App.RefreshScreen();
            };
        }
        // Close実行処理（活性時のみ）
        if (!btnClose.disabled) {
            btnClose.onclick = async () => {
                const isOk = await this.ShowConfirm({ title: "FORCE CLOSE", message: "強制的に公開停止(Close)にしますか？" });
                if (!isOk) return;
                const success = await $Data.Access.AdminCloseArchive({ 
                    archive_id: summaryItem.archive_id, 
                    target_user_id: summaryItem.target_user_id 
                });
                if (success) { $Notice.Info("強制的にCloseしました"); this._core.closeAll(); }
            };
        }
        // Delete実行処理（活性時のみ）
        if (!btnPrivate.disabled) {
            btnPrivate.onclick = async () => {
                const isOk = await this.ShowConfirm({ title: "FORCE DELETE", message: "強制的に非公開(Private)に戻し、削除扱いとしますか？" });
                if (!isOk) return;
                const success = await $Data.Access.AdminUnpublishArchive({ 
                    archive_id: summaryItem.archive_id, 
                    target_user_id: summaryItem.target_user_id 
                });
                if (success) { $Notice.Info("非公開に戻しました"); this._core.closeAll(); }
            };
        }
        // 下部の通報理由リスト描画（既存通り）
        const listContainer = $Dom.QuerySelector("#admin-report-detail-list", el);
        if (reports.length === 0) {
            listContainer.innerHTML = `<div class="text-[0.9rem] text-slate-600 p-2">詳細データがありません</div>`;
        } else {
            reports.sort((a, b) => new Date(b.report_tim) - new Date(a.report_tim)).forEach(rep => {
                const child = $Dom.GenerateTemplate("tpl-admin-list-child-report-item");
                $Dom.QuerySelector(".js-report-tim", child).textContent = $Util.FormatDate(rep.report_tim);
                $Dom.QuerySelector(".js-report-body", child).textContent = rep.body || "（内容なし）";
                child.onclick = () => this.ShowAdminReportItemDetail(rep);
                listContainer.appendChild(child);
            });
        }
        this._core.open({ 
            title: "通報集計詳細", 
            content: el, 
            size: 'lg',
            theme: "admin", 
            buttons: [] 
        });
    },
    // 【管理者機能】通報1件の全文詳細を表示
    async ShowAdminReportItemDetail(rep) {
        const el = $Dom.GenerateTemplate("tpl-admin-report-item-detail");
        // 1. 日時と本文の反映
        $Dom.QuerySelector(".js-report-tim", el).textContent = $Util.FormatDate(rep.report_tim);
        $Dom.QuerySelector(".js-report-body", el).textContent = rep.body || "（内容なし）";
        // 共通のUIジェネレータでボタンを生成して追加
        const userWrapper = $Dom.QuerySelector("#view-report-user-wrapper", el);
        // userWrapper.innerHTML = "";
        // const userBtn = $UI.Generator.UserBadge({
        //     icon: rep.icon,
        //     nick_name: rep.nick_name,
        //     user_id: rep.reporter_user_id
        // }, { type: 'button', isOwner: false });
        // if (userBtn) userWrapper.appendChild(userBtn);
        $UI.Generator.UserBadge(userWrapper, {
            icon: rep.icon,
            nick_name: rep.nick_name,
            user_id: rep.reporter_user_id
        }, { type: 'button', isOwner: false });
        //
        this._core.open({
            title: "通報情報詳細",
            content: el,
            theme: "admin",
            size: 'lg',
            help: "",
            buttons: []
        });
    },
    // 【管理者機能】フィードバックリスト
    async ShowAdminFeedbackList() {
        // 初回のみ全件取得
        const isSuccess = await $Data.Access.GetAllFeedback({ score: 0 });
        if (!isSuccess) return;
        const frame = $Dom.GenerateTemplate("tpl-admin-feedback-list-parent");
        const listContainer = $Dom.QuerySelector("#feedback-list-container", frame);
        const scoreButtons = $Dom.QuerySelectorAll(".js-score-btn", frame);
        // 検索バーの追加
        const searchBar = $Dom.GenerateTemplate("tpl-dialog-search-bar", "ui-template-root", false);
        const input = $Dom.QuerySelector(".js-input", searchBar);
        const clearBtn = $Dom.QuerySelector(".js-clear", searchBar);
        // スコアフィルタバーの前に検索バーを挿入
        const filterBar = $Dom.QuerySelector(".sticky", frame);
        filterBar.insertBefore(searchBar, filterBar.firstChild);
        // データと状態の初期化
        const allData = $App.AppData.Admin.FeedbackList || [];
        let currentScore = 0;
        let filterText = "";
        // ★数の集計（件数計算）
        const counts = [0, 0, 0, 0, 0, 0];
        allData.forEach(item => {
            const score = item.score || 0;
            if (score >= 1 && score <= 5) counts[score]++;
            counts[0]++; // ALL
        });
        // ボタンに集計件数を反映（1行で表示）
        scoreButtons.forEach(btn => {
            const score = parseInt(btn.dataset.score);
            btn.textContent = score === 0 ? `ALL(${counts[0]})` : `${score}(${counts[score]})`;
        });
        const renderList = () => {
            // ボタンのスタイル更新
            scoreButtons.forEach(btn => {
                const score = parseInt(btn.dataset.score);
                if (score === currentScore) {
                    btn.classList.add("bg-brand-5", "text-white", "shadow-md");
                    btn.classList.remove("text-slate-600");
                } else {
                    btn.classList.add("text-slate-600");
                    btn.classList.remove("bg-brand-5", "text-white", "shadow-md");
                }
            });
            // フィルタリング処理（★数 ＆ ワード）
            const query = filterText.toLowerCase().trim();
            const filtered = allData.filter(item => {
                // スコアフィルタ
                if (currentScore > 0 && item.score !== currentScore) return false;
                // ワードフィルタ (本文に合致するか)
                if (query.length > 0) {
                    const target = item.body || "";
                    if (!target.toLowerCase().includes(query)) return false;
                }
                return true;
            });
            // リスト再描画
            listContainer.innerHTML = "";
            if (filtered.length === 0) {
                listContainer.innerHTML = `<div class="text-center text-[0.9rem] font-bold text-slate-600 py-10">合致するデータはありません。</div>`;
                return;
            }
            filtered.forEach(item => {
                const child = $Dom.GenerateTemplate("tpl-admin-list-child-feedback");
                $Dom.QuerySelector(".js-date", child).textContent = $Util.FormatDate(item.update_tim);
                $Dom.QuerySelector(".js-score", child).textContent = "★".repeat(item.score) + "☆".repeat(5 - item.score);
                $Dom.QuerySelector(".js-body", child).textContent = item.body || "（内容なし）";
                // クリックで詳細画面へ
                child.onclick = () => this.ShowAdminFeedbackDetail(item);
                listContainer.appendChild(child);
            });
        };
        // スコアボタンのイベント設定
        scoreButtons.forEach(btn => {
            btn.onclick = () => {
                currentScore = parseInt(btn.dataset.score);
                renderList();
            };
        });
        // 検索バーのイベント設定
        input.oninput = (e) => {
            filterText = e.target.value;
            $Dom.ToggleShow(clearBtn, filterText.length > 0);
            renderList();
        };
        clearBtn.onclick = () => {
            input.value = "";
            filterText = "";
            $Dom.ToggleShow(clearBtn, false);
            renderList();
            input.focus();
        };
        // 初回描画の実行
        renderList();
        this._core.open({
            title: "みんなの評価一覧",
            content: frame,
            size: 'lg',
            theme: "admin",
            help: "",
        });
    },
    // 【管理者機能】フィードバック詳細
    ShowAdminFeedbackDetail(item) {
        const el = $Dom.GenerateTemplate("tpl-admin-feedback-detail");
        $Dom.QuerySelector(".js-date", el).textContent = $Util.FormatDate(item.update_tim);
        $Dom.QuerySelector(".js-score", el).textContent = "★".repeat(item.score) + "☆".repeat(5 - item.score);
        $Dom.QuerySelector(".js-body", el).textContent = item.body || "（内容なし）";
        // --- ユーザーボタンへの反映 ---
        const userWrapper = $Dom.QuerySelector("#view-feedback-user-wrapper", el);
        $UI.Generator.UserBadge(userWrapper, {
            icon: item.icon,
            nick_name: item.nick_name,
            user_id: item.user_id
        }, { type: 'button', isOwner: false });
        //
        this._core.open({
            title: "フィードバック詳細",
            content: el,
            theme: "admin",
            help: "",
            headerButtons: []
        });
    },
    // 【管理者機能】個別通知送信ダイアログ
    async ShowAdminSendUserNotification(profile) {
        if (!profile) return $Notice.Warn("ユーザー情報が不明です");
        const el = $Dom.GenerateTemplate("tpl-admin-send-user-notification");
        // --- 1. 宛先ユーザー情報の反映 ---
        const userWrapper = $Dom.QuerySelector('#admin-send-target-user-wrapper', el);
        $UI.Generator.UserBadge(userWrapper, {
            icon: profile.icon,
            nick_name: profile.nick_name,
            user_id: profile.user_id
        }, { type: 'badge' });
        // --- 2. メッセージ種別選択 (3ボタン選択制) ---
        const kindGroup = $Dom.QuerySelector('#admin-send-kind-group', el);
        const inputKind = $Dom.QuerySelector('#admin-send-emoji-val', el);
        let currentKind = $Const.USER_NOTICE_KIND.INFO;
        inputKind.value = currentKind.id;
        kindGroup.innerHTML = "";
        Object.values($Const.USER_NOTICE_KIND).forEach(type => {
            const btn = document.createElement("button");
            btn.className = "flex-1 rounded-lg py-2 flex flex-col items-center justify-center active:scale-95 transition-all bg-slate-50 border-2 border-transparent shadow-sm";
            btn.innerHTML = `
                <span class="text-[1.5rem] mb-1">${type.emoji}</span>
                <span class="text-[0.8rem] font-bold text-slate-600">${type.label}</span>
            `;
            btn.onclick = () => {
                inputKind.value = type.id;
                Array.from(kindGroup.children).forEach(b => {
                    b.classList.remove('bg-white', 'border-brand-5', 'shadow-md');
                    b.classList.add('bg-slate-50', 'border-transparent', 'shadow-sm');
                });
                btn.classList.add('bg-white', 'border-brand-5', 'shadow-md');
                btn.classList.remove('bg-slate-50', 'border-transparent', 'shadow-sm');
            };
            kindGroup.appendChild(btn);
            if (type.id === currentKind.id) {
                btn.classList.add('bg-white', 'border-brand-5', 'shadow-md');
                btn.classList.remove('bg-slate-50', 'border-transparent', 'shadow-sm');
            }
        });
        // --- 3. 本文入力の設定 ---
        const inputBody = $Dom.QuerySelector('#admin-send-body', el);
        const countBody = $Dom.QuerySelector('#admin-send-body-count', el);
        countBody.textContent = inputBody.value.length;
        inputBody.addEventListener('input', () => countBody.textContent = inputBody.value.length);
        
        inputBody.addEventListener('input', () => countBody.textContent = inputBody.value.length);
        // 追加：HTML上のボタンに直接イベントをバインド
        $Dom.QuerySelector('#btn-admin-send-cancel', el).onclick = () => this._core.close();
        $Dom.QuerySelector('#btn-admin-send-submit', el).onclick = async () => {
            const body = inputBody.value.trim();
            if (!body) return $Notice.Warn("本文を入力してください");
            if (await $Util.CheckAdminAuth()) {
                const isSuccess = await $Data.Access.SendUserNotification({
                    target_user_id: profile.user_id,
                    kind: Number(inputKind.value),
                    body: body
                });
                if (isSuccess) {
                    $Notice.Info("通知を送信しました。");
                    this._core.close();
                }
            }
        };
        this._core.open({
            title: "ユーザ個別メール送信",
            content: el,
            theme: "admin",
            help: "",
            buttons: [] // フッターボタンは使用しない
        });
    },
    // 【管理者機能】ユーザーメール一覧
    async ShowAdminUserMailList() {
        const isSuccess = await $Data.Access.GetSentUserMailList();
        if (!isSuccess) return;
        const mails = $App.AppData.Admin.UserMailList  || []; // API側で notifications に格納される想定
        if (mails.length === 0) {
            $Notice.Warn("送信メールはありません");
            return;
        }
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        mails.forEach(item => {
            const child = $Dom.GenerateTemplate("tpl-admin-list-child-user-mail");
            $Dom.QuerySelector(".js-date", child).textContent = $Util.FormatDate(item.send_tim);
            // --- 宛先ユーザー表示（Generator: badgeモードを使用） ---
            const userWrapper = $Dom.QuerySelector(".js-user-wrapper", child);
            $UI.Generator.UserBadge(userWrapper, {
                icon: item.icon,
                nick_name: item.nick_name || item.user_id.slice(0, 8),
                user_id: item.user_id
            }, { type: 'badge' });
            // 
            const kindObj = Object.values($Const.USER_NOTICE_KIND).find(k => k.id === item.kind) || $Const.USER_NOTICE_KIND.INFO;
            $Dom.QuerySelector(".js-emoji", child).textContent = kindObj.emoji; // リスト時
            $Dom.QuerySelector(".js-body", child).textContent = item.body;
            child.onclick = () => this.ShowAdminUserMailDetail(item);
            root.appendChild(child);
        });
        this._core.open({
            title: "メール送信履歴一覧",
            content: root,
            theme: "admin",
            help: "",
        });
    },
    // 【管理者機能】ユーザーメール詳細
    ShowAdminUserMailDetail(item) {
        const el = $Dom.GenerateTemplate('tpl-view-notice');
        // --- 2. ユーザー情報ボタンを表示・設定する ---
        const userWrapper = $Dom.QuerySelector('#view-notice-user-wrapper', el);
        userWrapper.innerHTML = ""; // コンテナをクリア
        $Dom.ToggleShow(userWrapper, true);
        $Dom.ToggleShow($Dom.QuerySelector('#view-notice-title-area', el), false);
        // --- 差出人表示（Generator: buttonモードを使用） ---
        $UI.Generator.UserBadge(userWrapper, {
            icon: item.icon,
            nick_name: item.nick_name || item.user_id.slice(0, 8),
            user_id: item.user_id
        }, { type: 'button', isOwner: false });
        // 右上のメール（封筒）アイコンなど
        const kindObj = Object.values($Const.USER_NOTICE_KIND).find(k => k.id === item.kind) || $Const.USER_NOTICE_KIND.INFO;
        $Dom.QuerySelector('#view-notice-icon', el).textContent = kindObj.emoji; // 詳細時
        // 送信日時
        $Dom.QuerySelector('#view-notice-date', el).textContent = $Util.FormatDate(item.send_tim);
        // 本文（全文表示）
        $Dom.QuerySelector('#view-notice-body', el).textContent = item.body;
        this._core.open({
            title: "メッセージ詳細 (ADMIN)",
            content: el,
            theme: "admin",
            help: "",
            headerButtons: []
        });
    },
    // 【管理者機能】ユーザー操作履歴一覧
    async ShowAdminUserHistory(item) {
        const isSuccess = await $Data.Access.GetUserHistory({ target_user_id: item.user_id });
        if (!isSuccess) return;
        // historyList から取得
        const historyList = $Data.resData.historyList || [];
        if (historyList.length === 0) {
            $Notice.Warn("通報データはありません");
            return;
        }
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        historyList.forEach(item => {
            const child = $Dom.GenerateTemplate("tpl-admin-list-child-history");
            $Dom.QuerySelector(".js-date", child).textContent = $Util.FormatDate(item.create_tim);
            $Dom.QuerySelector(".js-action", child).textContent = item.action_kind;
            $Dom.QuerySelector(".js-body", child).textContent = item.body || "（説明なし）";
            child.onclick = () => this.ShowAdminUserHistoryDetail(item);
            root.appendChild(child);
        });
        this._core.open({ 
            title: "ユーザの行動履歴", 
            content: root, 
            theme: "admin", 
            size: "lg" 
        });
    },
    // 【管理者機能】操作履歴の詳細表示
    ShowAdminUserHistoryDetail(item) {
        const el = $Dom.GenerateTemplate("tpl-admin-user-history-detail");
        $Dom.QuerySelector(".js-tim", el).textContent = $Util.FormatDate(item.create_tim);
        $Dom.QuerySelector(".js-action", el).textContent = item.action_kind;
        $Dom.QuerySelector(".js-body", el).textContent = item.body || "（説明なし）";
        const payloadContainer = $Dom.QuerySelector(".js-payload-container", el);
        if (item.memo_json) {
            let jsonObj;
            try {
                jsonObj = typeof item.memo_json === 'string' ? JSON.parse(item.memo_json) : item.memo_json;
            } catch (e) {
                // パース失敗時はそのままテキストで出力
                payloadContainer.textContent = item.memo_json;
                jsonObj = null;
            }
            if (jsonObj) {
                const table = document.createElement("table");
                table.className = "w-full text-left text-[1rem] border-collapse";
                const tbody = document.createElement("tbody");
                table.appendChild(tbody);
                let rowIdCounter = 0;
                // 再帰的にテーブル行を構築するローカル関数
                const buildRows = (data, parentId, level) => {
                    for (const key in data) {
                        const val = data[key];
                        const isObj = val !== null && typeof val === 'object';
                        const tr = document.createElement("tr");
                        tr.className = `border-b  ${parentId ? 'hidden' : ''}`;
                        if (parentId) tr.dataset.parentId = parentId;
                        const tdKey = document.createElement("td");
                        tdKey.className = "py-2 align-top text-slate-600 font-bold w-1/3";
                        tdKey.style.paddingLeft = `${level * 1 + 0.5}rem`;
                        const tdVal = document.createElement("td");
                        tdVal.className = "py-2 pr-2 font-mono break-all text-slate-900";
                        if (isObj) {
                            const childCount = Object.keys(val).length;
                            const currentId = `json-node-${rowIdCounter++}`;
                            tdKey.innerHTML = `<span class="cursor-pointer text-brand-5 select-none hover:opacity-70 transition-opacity">▶ ${key}</span>`;
                            tdVal.textContent = Array.isArray(val) ? `[ ${childCount} items ]` : `{ ${childCount} items }`;
                            tdVal.classList.add("text-slate-400", "italic");
                            // 開閉イベント
                            tdKey.querySelector('span').onclick = (e) => {
                                const isOpen = e.target.textContent.startsWith('▼');
                                e.target.textContent = isOpen ? `▶ ${key}` : `▼ ${key}`;
                                // 自分の直下の子要素のみ表示切替
                                const children = tbody.querySelectorAll(`tr[data-parent-id="${currentId}"]`);
                                children.forEach(c => c.classList.toggle("hidden", isOpen));
                            };
                            tr.appendChild(tdKey);
                            tr.appendChild(tdVal);
                            tbody.appendChild(tr);
                            // 子要素の生成
                            buildRows(val, currentId, level + 1);
                        } else {
                            tdKey.textContent = key;
                            tdVal.textContent = val === "" ? '""' : String(val);
                            tr.appendChild(tdKey);
                            tr.appendChild(tdVal);
                            tbody.appendChild(tr);
                        }
                    }
                };
                buildRows(jsonObj, "", 0);
                payloadContainer.appendChild(table);
            }
        } else {
            payloadContainer.textContent = "詳細データはありません";
            payloadContainer.classList.add("text-slate-500", "text-[0.9rem]", "p-2");
        }
        this._core.open({
            title: "履歴の詳細",
            content: el,
            theme: "admin",
            size: "lg"
        });
    },
    // 【管理者機能】BANユーザー一覧
    async ShowAdminBanUserList() {
        const isSuccess = await $Data.Access.GetBanUsers();
        if (!isSuccess) return;
        const banUsers = $Data.resData.banUserList || [];
        if (banUsers.length === 0) {
            $Notice.Warn("BANされたユーザーはいません");
            return;
        }
        const root = $Dom.GenerateTemplate("tpl-list-parent");
        const sorted = [...banUsers].sort((a, b) => new Date(b.update_tim) - new Date(a.update_tim));
        sorted.forEach(item => {
            const child = $Dom.GenerateTemplate("tpl-admin-list-child-ban-user");
            $Dom.QuerySelector(".js-date", child).textContent = $Util.FormatDate(item.update_tim);
            // ユーザーバッジをボタン型で生成（タップでプロフィール詳細へ）
            const userWrapper = $Dom.QuerySelector(".js-user-wrapper", child);
            $UI.Generator.UserBadge(userWrapper, {
                user_id: item.user_id,
                nick_name: item.nick_name,
                icon: item.icon
            }, { type: 'button', isOwner: false });
            root.appendChild(child);
        });
        this._core.open({
            title: "BANユーザー一覧",
            content: root,
            theme: "admin",
            help: "シャドウBANされたユーザーの一覧です。",
            buttons: []
        });
    },
    // 【管理者機能】アプリ基盤設定 メニュー一覧
    async ShowAdminCoreConfig() {
        const isSuccess = await $Data.Access.GetCoreConfig();
        if (!isSuccess) return;
        const configList = $Data.resData.configs || [];
        const getVal = (key) => configList.find(c => c.key === key)?.value || "";
        const el = $Dom.GenerateTemplate("tpl-menu-admin-core");
        // 現在の値（日本語）を反映
        const latest = getVal("LatestAppVersion");
        const min = getVal("MinAppVersion");
        $Dom.QuerySelector('#sub-core-version', el).textContent = `最新: v${latest} / 必須: v${min}`;
        const isMaint = getVal("MaintenanceMode") === "true";
        const subMaint = $Dom.QuerySelector('#sub-core-maint', el);
        if (isMaint) {
            subMaint.textContent = "🔴 メンテナンス中";
            subMaint.classList.add("text-red-500");
        } else {
            subMaint.textContent = "⚪️ 通常稼働";
            subMaint.classList.add("text-emerald-500");
        }
        // 個別編集画面への遷移
        $Dom.QuerySelector('#btn-core-version', el).onclick = () => this.ShowAdminCoreVersion(configList);
        $Dom.QuerySelector('#btn-core-maint', el).onclick = () => this.ShowAdminCoreMaint(configList);
        $Dom.QuerySelector('#btn-core-legal', el).onclick = () => this.ShowLegalDocuments();
        // 
        this._core.open({
            title: "アプリ基盤設定",
            content: el,
            theme: "admin",
            help: "アプリ全体の挙動を制御する重要な設定です。"
        });
    },
    // アプリバージョン管理 編集
    async ShowAdminCoreVersion(configList) {
        // 定数（今のプログラム）が「最新」の正解
        const appVerStr = $Const.APP_INFO.VERSION; 
        const appVerArr = appVerStr.split('.').map(Number);
        // サーバーに保存されている「必須バージョン」の初期値
        const serverMinStr = configList.find(c => c.key === "MinAppVersion")?.value || "1.0.0";
        const serverMinArr = serverMinStr.split('.').map(Number);
        // 作業用状態
        let curMin = [...serverMinArr];
        const el = $Dom.GenerateTemplate("tpl-admin-core-version");
        $Dom.QuerySelector('.js-app-ver', el).textContent = appVerStr;
        // 比較用関数
        const toVal = (arr) => arr[0] * 10000 + arr[1] * 100 + arr[2];
        const appVerNum = toVal(appVerArr);
        const render = () => {
            // LATESTの表示（固定）
            for (let i = 0; i < 3; i++) {
                $Dom.QuerySelector(`#v-lat-${i}`, el).textContent = appVerArr[i];
                $Dom.QuerySelector(`#v-min-${i}`, el).textContent = curMin[i];
            }
            // MINの「＋」ボタン上限ガード
            $Dom.QuerySelectorAll('.js-v-min-btn', el).forEach(btn => {
                if (btn.dataset.op === 'plus') {
                    const idx = parseInt(btn.dataset.idx);
                    const testArr = [...curMin];
                    testArr[idx]++;
                    const isOver = toVal(testArr) > appVerNum;
                    btn.disabled = isOver;
                    btn.classList.toggle('opacity-30', isOver);
                }
            });
        };
        // MIN操作イベント
        $Dom.QuerySelectorAll('.js-v-min-btn', el).forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                if (btn.dataset.op === 'plus') {
                    curMin[idx]++;
                } else {
                    // R(Reset): サーバーに今保存されている値に戻す
                    curMin[idx] = serverMinArr[idx];
                }
                render();
            };
        });
        // コピーボタン
        $Dom.QuerySelector('#btn-version-copy', el).onclick = () => {
            curMin = [...appVerArr];
            render();
            $Notice.Info("最新バージョンをMINに反映しました");
        };
        render();
        this._core.open({
            title: "バージョン管理",
            content: el, theme: "admin",
            buttons: [[
                { label: "cancel", className: "bg-slate-400 text-white", handler: () => this._core.close() },
                {
                    label: "save",
                    handler: async () => {
                        if (toVal(curMin) > appVerNum) return $Notice.Warn("プログラムVerを超える設定はできません");
                        if (!await $Util.CheckAdminAuth()) return;
                        const params = {
                            items: [
                                { key: "LatestAppVersion", value: appVerStr }, // 最新Verは定数で上書き
                                { key: "MinAppVersion",    value: curMin.join('.') }
                            ]
                        };
                        if (await $Data.Access.UpdateCoreConfig(params)) {
                            $Notice.Info("バージョン設定を更新しました");
                            this._core.closeAll();
                        }
                    }
                }
            ]]
        });
    },
    // メンテナンス設定 編集
    async ShowAdminCoreMaint(configList) {
        const getVal = (key) => configList.find(c => c.key === key)?.value || "";
        const el = $Dom.GenerateTemplate("tpl-admin-core-maint");
        const btnToggle = $Dom.QuerySelector('#btn-cfg-maint-toggle', el);
        const valMaint = $Dom.QuerySelector('#val-cfg-maint', el);
        const txtMsg = $Dom.QuerySelector('#cfg-maint-msg', el);
        const updateToggleUI = (isOn) => {
            const dot = btnToggle.querySelector('.js-dot');
            if (isOn) {
                btnToggle.classList.replace('bg-slate-300', 'bg-red-500');
                dot.style.transform = "translateX(32px)";
                valMaint.value = "true";
            } else {
                btnToggle.classList.replace('bg-red-500', 'bg-slate-300');
                dot.style.transform = "translateX(0px)";
                valMaint.value = "false";
            }
        };
        // 初期値反映
        updateToggleUI(getVal("MaintenanceMode") === "true");
        txtMsg.value = getVal("MaintenanceMsg");
        btnToggle.onclick = () => updateToggleUI(valMaint.value === "false");
        this._core.open({
            title: "メンテナンス設定",
            content: el, theme: "admin",
            buttons: [[
                { label: "cancel", className: "bg-slate-400 text-white", handler: () => this._core.close() },
                {
                    label: "save",
                    handler: async () => {
                        if (!await $Util.CheckAdminAuth()) return;
                        // ★リクエストパラメータを { items: [...] } 形式で構築
                        const params = {
                            items: [
                                { key: "MaintenanceMode", value: valMaint.value },
                                { key: "MaintenanceMsg",  value: txtMsg.value.trim() }
                            ]
                        };
                        if (await $Data.Access.UpdateCoreConfig(params)) {
                            $Notice.Info("メンテナンス設定を更新しました");
                            this._core.closeAll();
                        }
                    }
                }
            ]]
        });
    },
    // 長文ドキュメント編集画面（利用規約 / プライバシーポリシー）
    // ★ 修正：第3引数に onUpdate を追加
    async ShowAdminCoreDocumentEditor(key, title, onUpdate = null) { 
        // 1. ローカルDBから該当キーのデータを直接取得
        const record = await $LocalDb.Legal.Get(key);
        // 2. 取得した本文（なければ空文字）を初期値にする
        const initialValue = record ? record.body : "";
        const el = $Dom.GenerateTemplate("tpl-admin-core-editor");
        const textarea = $Dom.QuerySelector('#js-editor-input', el);
        const countLabel = $Dom.QuerySelector('#js-editor-count', el);
        $Dom.QuerySelector('#js-editor-label', el).textContent = title;
        // 3. エディタに流し込み
        textarea.value = initialValue;
        countLabel.textContent = initialValue.length;
        textarea.oninput = () => countLabel.textContent = textarea.value.length;
        this._core.open({
            title: `${title}の編集`,
            content: el,
            size: 'lg',
            theme: 'admin',
            help: `${title}の編集画面です。\n保存するとサーバーの更新日時が更新され、全ユーザーに差分が配信されます。`,
            buttons: [[
                { label: "cancel", className: "bg-slate-400 text-white", handler: () => this._core.close() },
                {
                    label: "save",
                    handler: async () => {
                        const newBody = textarea.value.trim();
                        if (!newBody) return $Notice.Warn("本文を入力してください");
                        if (!await $Util.CheckAdminAuth()) return;
                        // 4. 専用エンドポイントへ送信
                        const params = {
                            key: key,
                            value: newBody
                        };
                        if (await $Data.Access.UpdateLegalConfig(params)) {
                            $Notice.Info(`${title}を更新しました`);
                            this._core.close(); // ★ 修正：エディタだけを閉じる
                            const nowStr = new Date().toISOString();
                            await $LocalDb.Legal.Save(key, newBody, nowStr, false);
                            // ★ 追加：裏の画面を再描画するためのコールバックを実行
                            if (onUpdate) onUpdate(newBody, nowStr); 
                        }
                    }
                }
            ]]
        });
    },
};