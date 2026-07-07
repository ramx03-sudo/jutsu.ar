import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Smoke blobs ──
    const smokes = Array.from({ length: 12 }, () => ({
      x: Math.random() * w,
      y: h + Math.random() * 200,
      r: 80 + Math.random() * 120,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.15 + Math.random() * 0.25),
      alpha: 0.04 + Math.random() * 0.05,
    }));

    // ── Ash flakes ──
    const ashes = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.2 + Math.random() * 0.5),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      alpha: 0.15 + Math.random() * 0.35,
    }));

    // ── Embers ──
    const embers = Array.from({ length: 35 }, () => ({
      x: Math.random() * w,
      y: h * 0.5 + Math.random() * h * 0.5,
      r: 0.5 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.4 + Math.random() * 1.2),
      life: Math.random(),
      decay: 0.002 + Math.random() * 0.003,
      hue: Math.random() < 0.6 ? '#ff6600' : '#ff2200',
    }));

    // ── Energy waves ──
    const waves = Array.from({ length: 4 }, (_, i) => ({
      offset: (i / 4) * Math.PI * 2,
      speed: 0.4 + i * 0.1,
      amplitude: 8 + i * 4,
      y: h * (0.3 + i * 0.15),
      alpha: 0.025 + i * 0.01,
    }));

    // ── Lightning state ──
    let lightning = null;
    let nextLightning = 4000 + Math.random() * 6000;
    let lightningTimer = 0;
    let lastTime = performance.now();

    function spawnLightning() {
      const x = w * (0.1 + Math.random() * 0.8);
      const segments = [];
      let cx = x, cy = 0;
      while (cy < h * 0.7) {
        const nx = cx + (Math.random() - 0.5) * 80;
        const ny = cy + 40 + Math.random() * 60;
        segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
        cx = nx; cy = ny;
      }
      lightning = { segments, life: 1.0 };
    }

    function drawLightning(bolt) {
      if (!bolt) return;
      ctx.save();
      ctx.globalAlpha = bolt.life * 0.7;
      ctx.strokeStyle = `rgba(200, 180, 255, ${bolt.life})`;
      ctx.shadowColor = '#aa88ff';
      ctx.shadowBlur = 20 * bolt.life;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      bolt.segments.forEach((s, i) => {
        if (i === 0) ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
      });
      ctx.stroke();
      ctx.globalAlpha = bolt.life * 0.3;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    }

    function draw(now) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      const t = now * 0.001;

      ctx.clearRect(0, 0, w, h);

      // Base
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Smoke
      smokes.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.y + s.r < 0) { s.y = h + s.r; s.x = Math.random() * w; }
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(20, 10, 30, ${s.alpha})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ash
      ashes.forEach(a => {
        a.x += a.vx;
        a.y += a.vy;
        a.rot += a.rotSpeed;
        if (a.y < -10) { a.y = h + 10; a.x = Math.random() * w; }
        ctx.save();
        ctx.globalAlpha = a.alpha;
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);
        ctx.fillStyle = 'rgba(160, 150, 170, 1)';
        ctx.fillRect(-a.size / 2, -a.size / 2, a.size, a.size);
        ctx.restore();
      });

      // Embers
      embers.forEach(e => {
        e.x += e.vx;
        e.y += e.vy;
        e.life -= e.decay;
        if (e.life <= 0 || e.y < 0) {
          e.y = h * 0.5 + Math.random() * h * 0.5;
          e.x = Math.random() * w;
          e.life = 0.6 + Math.random() * 0.4;
          e.vy = -(0.4 + Math.random() * 1.2);
        }
        ctx.save();
        ctx.globalAlpha = e.life * 0.85;
        ctx.shadowColor = e.hue;
        ctx.shadowBlur = 6;
        ctx.fillStyle = e.hue;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Energy waves
      waves.forEach(wave => {
        const currentY = wave.y;
        ctx.save();
        ctx.globalAlpha = wave.alpha;
        ctx.strokeStyle = 'rgba(168, 85, 247, 1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = currentY + Math.sin(x * 0.008 + t * wave.speed + wave.offset) * wave.amplitude;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });

      // Lightning
      lightningTimer += dt;
      if (lightningTimer >= nextLightning) {
        spawnLightning();
        lightningTimer = 0;
        nextLightning = 4000 + Math.random() * 6000;
      }
      if (lightning) {
        drawLightning(lightning);
        lightning.life -= 0.06;
        if (lightning.life <= 0) lightning = null;
      }

      // Vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.85);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
