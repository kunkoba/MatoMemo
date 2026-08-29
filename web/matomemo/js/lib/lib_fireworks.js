// lib_fireworks.js
const Fireworks = {
    // 物理演算・演出用の定数
    COLORS: ['#ff6f91', '#5ddcff', '#ffd166', '#c792ff', '#ff9f6b', '#8dffb0', '#ff5c5c', '#4d8dff', '#ffe45c', '#ff8ad1'],
    SPAWN_INTERVAL_FRAMES: 120, // 2秒（60fps換算）
    HEAD_SIZE: 2.4,
    TRAIL_SIZE: 2.0,
    // 状態変数
    canvas: null,
    ctx: null,
    rockets: [],
    particles: [],
    frame: 0,
    animationId: null,
    // 初期化（DOMにキャンバスを生成するが、非表示にしておく）
    init() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        Object.assign(this.canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '9999',
            display: 'none' // 初期状態は非表示（レンダリング負荷ゼロ）
        });
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', () => this.resize());
        this.resize();
    },
    // リサイズ対応
    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    // 打ち上げ花火の生成
    spawnRocket() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const x = 60 + Math.random() * (w - 120);
        const targetY = 60 + Math.random() * 140;
        this.rockets.push({
            x: x, 
            y: h - 30, 
            targetY: targetY,
            vy: -6 - Math.random() * 1.8,
            color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
            trail: []
        });
    },
    // 爆発処理（パーティクル生成）
    explode(x, y) {
        const count = 30 + Math.floor(Math.random() * 14);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.15;
            const speed = 1.6 + Math.random() * 2.6;
            this.particles.push({
                x: x, 
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
                life: 1, 
                decay: 0.008 + Math.random() * 0.012, 
                trail: []
            });
        }
    },
    // 軌跡描画
    drawTrail(p, size) {
        for (let k = 1; k < p.trail.length; k++) {
            const a = (k / p.trail.length) * Math.max(p.life !== undefined ? p.life : 1, 0);
            this.ctx.strokeStyle = p.color;
            this.ctx.globalAlpha = a * 0.7;
            this.ctx.lineWidth = size;
            this.ctx.beginPath();
            this.ctx.moveTo(p.trail[k - 1].x, p.trail[k - 1].y);
            this.ctx.lineTo(p.trail[k].x, p.trail[k].y);
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1;
    },
    // 描画ループ
    loop() {
        this.frame++;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 一定フレーム間隔、または画面に何もない時に打ち上げ
        if (this.frame % this.SPAWN_INTERVAL_FRAMES === 0 || (this.rockets.length === 0 && this.particles.length === 0)) {
            this.spawnRocket();
        }
        // 打ち上げ玉の更新・描画
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.trail.push({ x: r.x, y: r.y });
            if (r.trail.length > 8) r.trail.shift();
            r.y += r.vy;
            this.drawTrail(r, this.HEAD_SIZE);
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, this.HEAD_SIZE, 0, Math.PI * 2);
            this.ctx.fillStyle = r.color;
            this.ctx.fill();
            if (r.y <= r.targetY) { 
                this.explode(r.x, r.y); 
                this.rockets.splice(i, 1); 
            }
        }
        // パーティクル（爆発後）の更新・描画
        for (let j = this.particles.length - 1; j >= 0; j--) {
            const p = this.particles[j];
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 6) p.trail.shift();
            p.vy += 0.045; 
            p.x += p.vx; 
            p.y += p.vy; 
            p.life -= p.decay;
            if (p.life <= 0) { 
                this.particles.splice(j, 1); 
                continue; 
            }
            this.drawTrail(p, this.TRAIL_SIZE);
            this.ctx.globalAlpha = Math.max(p.life, 0);
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, this.TRAIL_SIZE, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
        // ループ継続
        this.animationId = requestAnimationFrame(() => this.loop());
    },
    // 演出開始
    show() {
        if (this.animationId) return; // 既に実行中なら無視
        if (!this.canvas) this.init();
        this.canvas.style.display = 'block'; // レンダリング有効化
        this.frame = 0;
        this.loop();
    },
    // 演出停止
    hide() {
        // ループを止める
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // DOM非表示＆メモリ解放
        if (this.canvas) {
            this.canvas.style.display = 'none';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.rockets = [];
        this.particles = [];
    }
};
// 読み込み時に初期化だけ済ませておく（描画ループは回さない）
Fireworks.init();
