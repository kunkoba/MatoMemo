// notice-controller.js
const Notice = {
    _toast(message, type = "info") {
        const root = $Dom.GenerateTemplate("tpl-toast", "toast-container");
        const el = $Dom.QuerySelector("div", root);
        const config = {
            info:  { bg: "rgb(165, 243, 163)" }, // 緑
            warn:  { bg: "rgb(255, 220, 156)" }, // オレンジ
            error: { bg: "rgb(255, 174, 174)" }, // 赤
        };
        const c = config[type] || config.info;
        el.style.background = c.bg;
        // el.style.color = "#fff";
        el.style.color = "#000";
        $Dom.QuerySelector(".message", el).textContent = message;
        setTimeout(() => {
            el.classList.remove("opacity-0", "-translate-y-2");
            el.classList.add("opacity-100", "translate-y-0");
        }, 0);
        setTimeout(() => {
            el.classList.add("opacity-0", "-translate-y-2");
            el.classList.remove("opacity-100", "translate-y-0");
            setTimeout(() => root.remove(), 300);
        }, 3 * 1000);
        root.addEventListener("click", () => {
            el.classList.add("opacity-0", "-translate-y-2");
            el.classList.remove("opacity-100", "translate-y-0");
            setTimeout(() => root.remove(), 300);
        });
    },
    // ラッパーメソッド
    Info(msg) { this._toast(msg, "info"); },
    Warn(msg) { this._toast(msg, "warn"); },
    Error(msg) { this._toast(msg, "error"); },
    // ローディング
    Loading: {
        Show() {
            if (!this.el) {
                this.el = $Dom.GenerateTemplate("tpl-loading");
            }
            this.el.classList.remove("opacity-0", "pointer-events-none");
        },
        Hide() {
            if (!this.el) return;
            this.el.classList.add("opacity-0", "pointer-events-none");
        }
    },
    // オフライン通知
    Offline: {
        el: null,
        Show_2() {
            if (!this.el) {
                this.el = $Dom.GenerateTemplate("tpl-offline");
            }
            // 既存の opacity-100 クラスを消して、直接操作するように変更
            this.el.style.opacity = "1";
            // $Dom.ToggleShow($Dom.GetElementById('ad-space-mobile-1'), false);
            // $Dom.ToggleShow($Dom.GetElementById('ad-space-mobile-2'), false);
        },
        // メッセージを引数で受け取る
        Show(msg) {
            if (!this.el) { // 要素未生成なら作成
                this.el = $Dom.GenerateTemplate("tpl-offline");
            }
            const textEl = this.el.querySelector(".js-text"); // テキスト要素取得
            if (textEl && msg) { // メッセージがあれば上書き
                textEl.textContent = msg; // 文言反映
            }
            this.el.style.opacity = "1"; // 表示
        },
        Hide() {
            if (!this.el) return;
            this.el.style.opacity = "0";
            // $Dom.ToggleShow($Dom.GetElementById('ad-space-mobile-1'), true);
            // $Dom.ToggleShow($Dom.GetElementById('ad-space-mobile-2'), true);
        }
    }
};

export default Notice;
