// 従ファイル群
import DialogSystem from './dialog-manager-system.js';
import DialogApp from './dialog-manager-app.js';
import DialogArchive from './dialog-manager-archive.js';
import DialogNotice from './dialog-manager-notice.js';
import DialogAdmin from './dialog-manager-admin.js';

// UI操作
const _DialogCore = {
    elementId: "ui-dialog-root",
    dialogRoot: null,
    backdrop: null,
    stack:[],
    // 共通クラス定数
    HEADER_BTN_CLASS:   "kb-icon-emoji-md _bg-white h-8 w-8 rounded-full flex items-center justify-center active:scale-95 transition-transform",
    FOOTER_BTN_BASE:    "font-bold text-[1rem] h-12 uppercase active:scale-95 transition-transform",
    FOOTER_BTN_DEFAULT: "bg-brand-5 text-white shadow-md",
    // 初期化
    init() {
        this.dialogRoot = $Dom.GetElementById(this.elementId);
        this.backdrop = $Dom.GetElementById("ui-dialog-backdrop");
        // 1. 背景クリック時は「今のダイアログ」だけ閉じる（既存通り）
        this.backdrop.onclick = (e) => {
            // if (e.target === this.backdrop) this.close();
            if (e.target !== this.backdrop) return;
            if (this.stack[this.stack.length - 1]?._isModal) return; // モーダルなら閉じない
            this.close();
        };
        // 2. 「すべて閉じる」ボタンの onclick に直接 closeAll を設置
        const btnCloseAll = $Dom.GetElementById("dialog-btn-close-all");
        btnCloseAll.onclick = (e) => {
            e.stopPropagation(); // 背景の onclick (close) が動かないようにする
            this.closeAll();
        };
    },
    // ダイアログ開く
    open(options) {
        const frame = this.create(options);
        const prev = this.stack[this.stack.length - 1];
        if (prev) prev.classList.add("hidden");
        this.dialogRoot.appendChild(frame);
        this.stack.push(frame);
        this.backdrop.classList.remove("hidden");
        return frame;
    },
    // ダイアログ画面の構築
    create({ title = "", content = "", buttons = [], headerButtons = [], 
        help = null, onClose = null, theme = null, isFooterFixed = true, isModal = false, size = 'md' }) {
        const frame = $Dom.GenerateTemplate("tpl-dialog-frame", this.elementId);
        frame._isModal = isModal;
        const frameBg = $Dom.QuerySelector("#dialog-frame-bg", frame);
        const titleBar = $Dom.QuerySelector("#dialog-title-bar", frame);
        const titleEl = $Dom.QuerySelector("#dialog-title", frame);
        const contentEl = $Dom.QuerySelector("#dialog-content", frame);
        const headerActions = $Dom.QuerySelector("#dialog-header-actions", frame);
        const btnContainer = $Dom.QuerySelector("#dialog-button-container", frame);
        // --- 1. テーマ別スタイルの明示的ADD ---
        const themeConfigs = {
            admin: {
                frame:  ['bg-white', 'border-4', 'border-red-600'],
                header: ['bg-slate-100'],
                title:  ['text-slate-900'],
                footer: ['bg-slate-100'],
            },
            report: {
                frame:  ['bg-white', 'border-2', 'border-black'],
                header: ['bg-black'],
                title:  ['text-red-500'],
                footer: ['bg-white', 'border-t', '']
            },
            user: { // デフォルト
                frame:  ['bg-brand-0'],
                header: ['bg-brand-0'],
                title:  ['text-brand-5'],
                footer: ['bg-brand-1', 'border-t', 'border-brand-2']
            }
        };
        const config = themeConfigs[theme] || themeConfigs.user;
        frameBg.classList.add(...config.frame);
        titleBar.classList.add(...config.header);
        titleEl.classList.add(...config.title);
        btnContainer.classList.add(...config.footer);
        // --- 2. サイズ（高さ）の制御 ---
        if (size === 'lg') {
            frameBg.classList.add("h-[70vh]");
        } else if (size === 'md') {
            frameBg.classList.add("min-h-[50vh]");
        } else {
            frameBg.classList.add("min-h-[300px]");
        }
        titleEl.textContent = title;
        // --- 3. ヘッダーアクション（ヘルプ・カスタムボタン） ---
        headerActions.innerHTML = "";
        if (headerButtons && headerButtons.length > 0) {
            headerButtons.forEach(btnDef => {
                const btn = document.createElement("button");
                btn.className = this.HEADER_BTN_CLASS;
                btn.innerHTML = btnDef.label;
                if (btnDef.id) btn.id = btnDef.id;
                btn.onclick = () => { if (btnDef.handler) btnDef.handler(); };
                headerActions.appendChild(btn);
            });
        }
        if (help) {
            const btnHelp = document.createElement("button");
            btnHelp.className = `${this.HEADER_BTN_CLASS} text-brand-5 font-bold`;
            btnHelp.textContent = "？";
            btnHelp.onclick = () => {
                const parts = help.split('\n');
                const firstLine = parts.shift(); // 最初の1行を取り出す
                const restText = parts.join('\n'); // 残りのテキスト
                const helpBody = document.getElementById('ui-help-dialog-body');
                helpBody.innerHTML = ""; // 一旦クリア
                // 1行目のスタイル適用
                const titleEl = document.createElement('div');
                titleEl.className = "text-[1rem] font-bold text-slate-900 pb-2";
                titleEl.textContent = firstLine;
                helpBody.appendChild(titleEl);
                // 2行目以降の適用
                if (restText) {
                    const restEl = document.createElement('div');
                    restEl.className = "whitespace-pre-wrap";
                    restEl.textContent = restText;
                    helpBody.appendChild(restEl);
                }
                document.getElementById('ui-help-dialog').classList.remove('hidden');
            };
            headerActions.appendChild(btnHelp);
        }
        // --- 4. コンテンツ流し込み ---
        if (content instanceof HTMLElement) {
            contentEl.innerHTML = "";
            contentEl.appendChild(content);
        } else {
            contentEl.innerHTML = content || "";
        }
        // --- 5. フッターボタン ---
        if (buttons && buttons.length > 0) {
            const targetContainer = (isFooterFixed === false) ? contentEl : btnContainer;
            buttons.forEach(rowDef => {
                const isArray = Array.isArray(rowDef);
                const items = isArray ? rowDef : (rowDef.items || [rowDef]);
                const rowDiv = document.createElement("div");
                rowDiv.className = "w-full flex gap-3 " + (isFooterFixed === false ? "my-4" : "");
                const sizeClass = items.length > 1 ? "flex-1" : "w-full";
                items.forEach(btnDef => {
                    const btn = document.createElement("button");
                    btn.className = `${this.FOOTER_BTN_BASE} ${sizeClass} ${this.FOOTER_BTN_DEFAULT} ${btnDef.className || ''}`;
                    btn.textContent = btnDef.label;
                    if (btnDef.id) btn.id = btnDef.id;
                    btn.onclick = () => { if (btnDef.handler) btnDef.handler(); };
                    rowDiv.appendChild(btn);
                });
                targetContainer.appendChild(rowDiv);
            });
        } else if (isFooterFixed) {
            // btnContainer.classList.add("hidden");
        }
        // --- 6. 閉じる制御 ---
        frame._onClose = onClose;
        if (!isModal) { 
            const btnCloseX = document.createElement("button");
            btnCloseX.className = `${this.HEADER_BTN_CLASS}`;
            btnCloseX.textContent = "✕";
            btnCloseX.onclick = () => this.close();
            headerActions.appendChild(btnCloseX);
        }
        return frame;
    },
    // ダイアログ閉じる
    close() {
        const frame = this.stack.pop();
        if (frame) {
            if (frame._onClose) frame._onClose(); // 閉じる時にコールバックを実行
            frame.remove();
        }
        const prev = this.stack[this.stack.length - 1];
        if (prev) prev.classList.remove("hidden");
        if (this.stack.length === 0) {
            this.backdrop.classList.add("hidden");
        }
    },
    // 全部閉じる
    closeAll() {
        while (this.stack.length > 0) {
            const frame = this.stack.pop();
            if (frame) {
                if (frame._onClose) frame._onClose(); // 閉じる時にコールバックを実行
                frame.remove();
            }
        }
        this.backdrop.classList.add("hidden");
    },
    // 新着バッヂ更新
    updateNoticeBadge() {
        this.stack.forEach(frame => {
            // システム通知
            const btnNotice = frame.querySelector('#btn-sys-notice');
            if (btnNotice) {
                $UI.Generator.ApplyNewBadge(btnNotice, $App.AppData.Context.UnreadNoticeCount > 0, 'label');
            }
            // 受信メール
            const btnMail = frame.querySelector('#btn-user-mail');
            if (btnMail) {
                $UI.Generator.ApplyNewBadge(btnMail, $App.AppData.Context.UnreadMailCount > 0, 'label');
            }
            // 利用規約
            const btnLegal = frame.querySelector('#btn-sys-legal');
            if (btnLegal) {
                $UI.Generator.ApplyNewBadge(btnLegal, $App.AppData.Context.HasLegalUpdate, 'label');
            }
        });
    },
};

const DialogController = {
    // 🌟 コアを内包させる（従ファイルからは this._core でアクセス）
    _core: _DialogCore,
    // 🌟 従ファイルをスプレッド構文で展開して結合
    ...DialogSystem,
    ...DialogApp,
    ...DialogArchive,
    ...DialogNotice,
    ...DialogAdmin,
    // 【共通】確認用ダイアログ
    async ShowConfirm({ title = "", message = "", label = "OK", help = ""}) {
        return new Promise((resolve) => {
            const el = $Dom.GenerateTemplate('tpl-confirm-base');
            $Dom.QuerySelector('.js-message', el).textContent = message;
            let isResolved = false;
            this._core.open({
                title: title,
                content: el,
                help: help,
                size: 'sm',
                onClose: () => { if (!isResolved) resolve(false); },
                buttons: [[
                    { label: "CANCEL", className: "bg-slate-400 text-white shadow-md", handler: () => { isResolved = true; resolve(false); this._core.close(); } },
                    { label: label, handler: () => { isResolved = true; resolve(true); this._core.close(); } }
                ]]
            });
        });
    },
    // 【共通】エラー用ダイアログ
    ShowErrorDialog(message) {
        const el = $Dom.GenerateTemplate('tpl-dialog-error');
        const msgEl = $Dom.QuerySelector('.js-error-message', el);
        // 補足情報の流し込み
        msgEl.textContent = message || "通信環境を確認するか、しばらく時間をおいてから再度お試しください。";
        const frame = this._core.open({
            title: "アプリでエラーが発生しました",
            isModal: true, // 背景クリックやXボタンで閉じさせない
            content: el,
            buttons: [[
                {
                    label: "RELOAD",
                    className: "bg-brand-5 text-white w-full",
                    handler: () => $Util.ReloadApp()
                },
                {
                    label: "refresh",
                    className: "bg-brand-5 text-white w-full",
                    handler: () => {
                        this._core.closeAll();
                        $App.RefreshScreen();
                    }
                }
            ]]
        });
        // ✕ボタンを強制非表示にして閉じられないようにする
        const headerActions = frame.querySelector("#dialog-header-actions");
        if (headerActions && headerActions.lastChild) {
            headerActions.lastChild.classList.add("hidden");
        }
    },
    // 【共通】入力用ダイアログ
    async ShowInput({ title = "", message = "", type = "text", placeholder = "", initialValue = "", label = "OK" }) {
        return new Promise((resolve) => {
            const div = document.createElement('div');
            div.className = "w-full p-4 space-y-3";
            if (message) {
                const msg = document.createElement('p');
                msg.className = "text-[0.9rem] font-bold text-slate-900";
                msg.textContent = message;
                div.appendChild(msg);
            }
            const input = (type === 'textarea') 
                ? document.createElement('textarea') 
                : document.createElement('input');
            input.className = "w-full border-2 border-brand-3 px-4 py-2 text-[1rem] rounded-[1rem] focus:outline-none focus:border-brand-5 bg-white";
            if (type === 'textarea') {
                input.classList.add("h-[150px]", "resize-none");
            } else {
                input.type = type; // text, password等
                input.classList.add("text-[1.2rem]", "font-bold");
            }
            input.placeholder = placeholder;
            input.value = initialValue;
            div.appendChild(input);
            let isResolved = false;
            this._core.open({
                title: title,
                content: div,
                onClose: () => { if (!isResolved) resolve(null); },
                buttons: [[
                    { label: "CANCEL", className: "bg-slate-400 text-white shadow-md", handler: () => { isResolved = true; resolve(null); this._core.close(); } },
                    { label: label, handler: () => { isResolved = true; resolve(input.value); this._core.close(); } }
                ]]
            });
            setTimeout(() => input.focus(), 100);
        });
    },
    // ダイアログ内の新着バッヂを巡回して更新
    UpdateNoticeBadgeDialog() {
        this._core.updateNoticeBadge();
    },
};

// 初期処理
DialogController._core.init();

export default DialogController;
