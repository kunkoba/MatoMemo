<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confetti Popper Effect</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #0f172a;
        }
        canvas {
            display: block;
        }
        /* クラッカーのサイズを半分に指定 */
        .popper-cone {
            position: absolute;
            bottom: 50px;
            width: 0;
            height: 0;
            border-left: 20px solid transparent;
            border-right: 20px solid transparent;
            border-top: 40px solid #ef4444;
            cursor: pointer;
            z-index: 10;
        }
    </style>
</head>
<body>
    <div id="leftPopper" class="popper-cone left-[20%] rotate-[30deg]"></div>
    <div id="rightPopper" class="popper-cone right-[20%] -rotate-[30deg]"></div>
    <!-- 中央の起動ボタン -->
    <button id="centerButton" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-3 bg-white text-slate-900 rounded-full font-bold z-20">
        PUSH
    </button>
    <canvas id="canvas"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const leftPopper = document.getElementById('leftPopper');
        const rightPopper = document.getElementById('rightPopper');
        const centerButton = document.getElementById('centerButton');
        let particles = [];
        let width, height;
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();
        class Particle {
            constructor(x, y, angle) {
                this.x = x;
                this.y = y;
                /* 拡散角の計算 */
                const spread = (Math.random() * 0.5 - 0.25);
                const speed = Math.random() * 10 + 5;
                this.vx = Math.cos(angle + spread) * speed;
                this.vy = Math.sin(angle + spread) * speed;
                this.size = Math.random() * 6 + 1;
                this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
                this.gravity = 0.15;
                this.friction = 0.99;
                this.life = 1;
                this.decay = Math.random() * 0.005 + 0.002;
            }
            update() {
                /* 移動速度と重力の適用 */
                this.vx *= this.friction;
                this.vy *= this.friction;
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;
            }
            draw() {
                /* 粒子の描画 */
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.fillRect(this.x, this.y, this.size, this.size);
            }
        }
        function createExplosion(x, y, angle) {
            /* 粒子数設定 */
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(x, y, angle));
            }
        }
        function fire(element, angleModifier) {
            const rect = element.getBoundingClientRect();
            /* 回転角に応じた開口部位置の特定 */
            const rad = angleModifier * Math.PI / 180;
            const popperX = rect.left + rect.width / 2 + Math.sin(rad) * 20;
            const popperY = rect.top + rect.height / 2 - Math.cos(rad) * 20;
            createExplosion(popperX, popperY, -Math.PI / 2 + rad);
        }
        function animate() {
            /* 背景の残像描写 */
            ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
            ctx.fillRect(0, 0, width, height);
            particles = particles.filter(p => p.life > 0);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }
        centerButton.addEventListener('click', () => {
            /* 左右のクラッカーを同時に起動 */
            fire(leftPopper, 30);
            fire(rightPopper, -30);
        });
        animate();
    </script>
</body>
</html>