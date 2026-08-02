// ============================================================
// 天候演出ライブラリ (Atmosphere)
// ============================================================
// 4桁のコード文字列 (例: "2531") を受け取り、
// キャンバス上に雨・雪・桜・落ち葉・嵐などの天候演出を描画する。
// 元コードの挙動・出力は一切変更せず、構造とコメントのみ整理している。
// ============================================================
// 天候種別の定義
const WEATHER_TYPE = Object.freeze({
    NONE: 0,
    LEAF: 1,
    RAIN: 2,
    STORM: 3,
    SNOW: 4,
    CHERRY: 5
});
// ------------------------------------------------------------
// 星型（桜）の画像キャッシュ用キャンバス
// 桜の花びらは全パーティクル共通の形状なので、
// 一度だけ星型を描画したオフスクリーンキャンバスを用意し、
// 毎フレームの描画コストを抑える。
// ------------------------------------------------------------
const CACHE_SIZE = 32;
const cherryCache = document.createElement('canvas');
cherryCache.width = CACHE_SIZE * 2;
cherryCache.height = CACHE_SIZE * 2;
(function buildCherryCache() {
    const cctx = cherryCache.getContext('2d');
    cctx.translate(CACHE_SIZE, CACHE_SIZE);
    cctx.fillStyle = '#ffb7c5';
    cctx.beginPath();
    const spikes = 5;
    const step = Math.PI / spikes;
    let cacheRot = (Math.PI / 2) * 3;
    cctx.moveTo(0, -CACHE_SIZE);
    for (let i = 0; i < spikes; i++) {
        cctx.lineTo(Math.cos(cacheRot) * CACHE_SIZE, Math.sin(cacheRot) * CACHE_SIZE);
        cacheRot += step;
        cctx.lineTo(Math.cos(cacheRot) * (CACHE_SIZE / 2), Math.sin(cacheRot) * (CACHE_SIZE / 2));
        cacheRot += step;
    }
    cctx.closePath();
    cctx.fill();
})();
// ------------------------------------------------------------
// パーティクル種別ごとの挙動定義テーブル
// 元コードでは updatePosition / draw 内で type ごとに
// if / else if を並べて同じような処理を繰り返していたため、
// 「速度係数」と「描画方法」を1箇所にまとめて重複をなくす。
// (計算式・見た目は元コードと完全に同一)
// ------------------------------------------------------------
const PARTICLE_BEHAVIOR = {
    leaf: {
        // 移動速度係数と風の影響度合い（元コードの LEAF 用計算式と同一）
        speedFactorKey: 'LEAF_SPEED_FACTOR',
        windInfluence: 0.5,
        rotates: true,
        draw(ctx, p) {
            ctx.rotate(p.rot);
            ctx.fillStyle = '#de8f4a';
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    cherry: {
        speedFactorKey: 'LEAF_SPEED_FACTOR',
        windInfluence: 0.5,
        rotates: true,
        draw(ctx, p) {
            ctx.rotate(p.rot);
            // キャッシュされた星型イメージをコピー描画
            ctx.drawImage(cherryCache, -p.size, -p.size, p.size * 2, p.size * 2);
        }
    },
    rain: {
        speedFactorKey: 'RAIN_SPEED_FACTOR',
        windInfluence: 0.2,
        rotates: false,
        draw(ctx, p) {
            const moveAngle = Math.atan2(-p.vx, p.vy);
            ctx.rotate(moveAngle);
            ctx.strokeStyle = 'rgba(92,128,182,0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 20);
            ctx.stroke();
        }
    },
    snow: {
        speedFactorKey: 'SNOW_SPEED_FACTOR',
        windInfluence: 0.5,
        rotates: false,
        draw(ctx, p) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};
// 天候種別 → 生成するパーティクル種別・上限数キーの対応表
// (resetParticles 内の分岐と同一の組み合わせ)
const WEATHER_PARTICLE_MAP = {
    [WEATHER_TYPE.LEAF]:   [{ type: 'leaf',   maxKey: 'MAX_LEAF_COUNT' }],
    [WEATHER_TYPE.RAIN]:   [{ type: 'rain',   maxKey: 'MAX_RAIN_COUNT' }],
    [WEATHER_TYPE.STORM]:  [{ type: 'rain',   maxKey: 'MAX_RAIN_COUNT' }],
    [WEATHER_TYPE.SNOW]:   [{ type: 'snow',   maxKey: 'MAX_SNOW_COUNT' }],
    [WEATHER_TYPE.CHERRY]: [{ type: 'cherry', maxKey: 'MAX_CHERRY_COUNT' }]
};
const Atmosphere = {
    // ---- 演出用定数 ----
    MAX_WIND_SPEED: 40,
    MAX_LEAF_COUNT: 20,
    MAX_RAIN_COUNT: 200,
    MAX_SNOW_COUNT: 100,
    MAX_CHERRY_COUNT: 50,
    MAX_DARKNESS: 0.2,
    CODE_MAX_VAL: 9,
    // ---- 角度の刻み幅 ----
    WIND_ANGLE_STEP: 8,
    // ---- エフェクト制御用の定数 ----
    WIND_LINE_THRESHOLD: 0.25,
    WIND_LINE_COUNT_FACTOR: 10,
    TIME_STEP: 0.01,
    // ---- 雷演出用の定数 ----
    LIGHTNING_FREQ: 0.999,
    LIGHTNING_MAX_ALPHA: 0.9,
    LIGHTNING_DECAY: 0.05,
    // ---- 物理挙動係数 ----
    LEAF_SPEED_FACTOR: 0.5,
    RAIN_SPEED_FACTOR: 3,
    SNOW_SPEED_FACTOR: 0.5,
    WIND_LINE_SPEED: 20,
    // ---- 描画境界オフセット ----
    BOUND_OFFSET: 50,
    BOUND_X_OFFSET: 100,
    // ---- 描画コンテキストおよび状態変数 ----
    canvas: null,
    ctx: null,
    particles: [],
    weatherType: WEATHER_TYPE.NONE,
    windSpeed: 0,
    windAngle: 0,
    density: 0,
    darkness: 0,
    lightningAlpha: 0,
    time: 0,
    animationId: null,
    // ============================================================
    // 初期化処理
    // ============================================================
    init: function() {
        this.canvas = document.createElement('canvas');
        Object.assign(this.canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '0',
            display: 'none'
        });
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', () => this.resize());
        this.resize();
    },
    // キャンバスサイズ調整
    resize: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    // ============================================================
    // パラメータ入力および反映
    // ============================================================
    show: function(code) {
        if (!code || code.length !== 4) return;
        // 停止判定および全パラメータのリセット
        if (code === "0000") {
            this.hide();
            return;
        }
        if (this.canvas) this.canvas.style.display = 'block';
        const rawType = parseInt(code[0]);
        const rawW = parseInt(code[1]);
        const rawD = parseInt(code[2]);
        const rawA = parseInt(code[3]);
        this.weatherType = rawType;
        // 風速の計算
        this.windSpeed = (rawW / this.CODE_MAX_VAL) * this.MAX_WIND_SPEED;
        // 回転角度の計算
        this.windAngle = (rawW * this.WIND_ANGLE_STEP) * (Math.PI / 180);
        // 密度の計算
        this.density = (rawD / this.CODE_MAX_VAL);
        // 暗さの計算
        this.darkness = (rawA / this.CODE_MAX_VAL) * this.MAX_DARKNESS;
        this.resetParticles();
        if (!this.animationId) {
            this.loop();
        }
    },
    // 演出の停止
    hide: function() {
        this.weatherType = WEATHER_TYPE.NONE;
        this.particles = [];
        this.darkness = 0;
        this.windSpeed = 0;
        this.density = 0;
        this.windAngle = 0;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.canvas) {
            this.canvas.style.display = 'none';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },
    // ============================================================
    // パーティクルの生成
    // ============================================================
    resetParticles: function() {
        this.particles = [];
        // 現在の天候種別に応じたパーティクル定義を取得し、
        // 密度 (density) に応じた個数だけ生成する。
        // (元コードの LEAF/RAIN/STORM/SNOW/CHERRY 判定と同じ組み合わせ)
        const defs = WEATHER_PARTICLE_MAP[this.weatherType];
        if (!defs) return;
        defs.forEach(({ type, maxKey }) => {
            const count = Math.floor(this.density * this[maxKey]);
            for (let i = 0; i < count; i++) {
                this.particles.push(this.createParticle(type));
            }
        });
    },
    // 個別パーティクルの初期化
    createParticle: function(type) {
        return {
            type: type,
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: 0,
            vy: 0,
            size: type === 'snow' ? Math.random() * 3 + 2 : Math.random() * 4 + 4,
            speed: Math.random() * 5 + 2,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: Math.random() * 0.1 - 0.05
        };
    },
    // ============================================================
    // 描画ループ
    // ============================================================
    loop: function() {
        this.time += this.TIME_STEP;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 雷のフラッシュ描画
        if (this.weatherType === WEATHER_TYPE.STORM) {
            if (Math.random() > this.LIGHTNING_FREQ) {
                this.lightningAlpha = this.LIGHTNING_MAX_ALPHA;
            }
            if (this.lightningAlpha > 0) {
                this.ctx.fillStyle = `rgba(255,255,255,${this.lightningAlpha})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.lightningAlpha -= this.LIGHTNING_DECAY;
            }
        }
        // 画面の暗転描画
        if (this.darkness > 0) {
            this.ctx.fillStyle = `rgba(0,0,0,${this.darkness})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        // 全パーティクルの描画
        this.particles.forEach(p => {
            this.updatePosition(p);
            this.draw(p);
        });
        this.animationId = requestAnimationFrame(() => this.loop());
    },
    // ============================================================
    // 座標の更新
    // ============================================================
    updatePosition: function(p) {
        const dx = Math.sin(this.windAngle);
        const dy = Math.cos(this.windAngle);
        // パーティクル種別ごとの速度係数・風の影響度を
        // PARTICLE_BEHAVIOR テーブルから取得して計算する。
        // (計算式自体は元コードの各 if ブロックと同一)
        const behavior = PARTICLE_BEHAVIOR[p.type];
        if (behavior) {
            const speedFactor = this[behavior.speedFactorKey];
            const moveSpeed = (p.speed + this.windSpeed * behavior.windInfluence) * speedFactor;
            p.vx = dx * moveSpeed;
            p.vy = dy * moveSpeed;
            p.x += p.vx;
            p.y += p.vy;
            if (behavior.rotates) {
                p.rot += p.rotSpeed;
            }
        }
        // 境界ループ処理（画面外に出たパーティクルを反対側へ再配置）
        if (p.y > this.canvas.height + this.BOUND_OFFSET) {
            p.y = -this.BOUND_OFFSET;
            p.x = Math.random() * this.canvas.width;
        } else if (p.y < -this.BOUND_OFFSET) {
            p.y = this.canvas.height + this.BOUND_OFFSET;
            p.x = Math.random() * this.canvas.width;
        }
        if (p.x > this.canvas.width + this.BOUND_X_OFFSET) {
            p.x = -this.BOUND_X_OFFSET;
            p.y = Math.random() * this.canvas.height;
        } else if (p.x < -this.BOUND_X_OFFSET) {
            p.x = this.canvas.width + this.BOUND_X_OFFSET;
            p.y = Math.random() * this.canvas.height;
        }
    },
    // ============================================================
    // 図形の描画
    // ============================================================
    draw: function(p) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(p.x, p.y);
        // パーティクル種別ごとの描画処理を
        // PARTICLE_BEHAVIOR テーブルから呼び出す。
        // (見た目・描画内容は元コードの各 if ブロックと完全に同一)
        const behavior = PARTICLE_BEHAVIOR[p.type];
        if (behavior) {
            behavior.draw(ctx, p);
        }
        ctx.restore();
    }
};
// ライブラリの初期化
Atmosphere.init();
