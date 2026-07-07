import { useEffect, useRef } from 'react';

// ── Phase cycle ──────────────────────────────────────────────────────────────
const PHASES = [
  { name: 'idle',          duration: 1800 },
  { name: 'naruto-charge', duration: 2400 },
  { name: 'naruto-peak',   duration: 1400 },
  { name: 'shockwave',     duration: 1000 },
  { name: 'jjk-charge',    duration: 2400 },
  { name: 'jjk-peak',      duration: 1400 },
  { name: 'shockwave-jjk', duration: 1000 },
];

// ── Hand skeleton data ───────────────────────────────────────────────────────
const LEFT_HAND = [
  {x:0.28,y:0.82},{x:0.30,y:0.72},{x:0.26,y:0.64},{x:0.24,y:0.58},{x:0.33,y:0.60},
  {x:0.32,y:0.50},{x:0.31,y:0.42},{x:0.30,y:0.36},{x:0.37,y:0.58},{x:0.36,y:0.47},
  {x:0.36,y:0.38},{x:0.35,y:0.32},{x:0.41,y:0.60},{x:0.41,y:0.49},{x:0.41,y:0.40},
  {x:0.40,y:0.34},{x:0.45,y:0.64},{x:0.45,y:0.55},{x:0.45,y:0.48},{x:0.45,y:0.43},{x:0.45,y:0.39},
];
const RIGHT_HAND = LEFT_HAND.map(p => ({ x: 1 - p.x, y: p.y }));

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// ── Particle class ───────────────────────────────────────────────────────────
class Particle {
  constructor(cx, cy, color) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 0.5 + Math.random() * 2.5;
    this.x = cx; this.y = cy;
    this.vx = Math.cos(angle) * spd; this.vy = Math.sin(angle) * spd;
    this.life = 1; this.decay = 0.02 + Math.random() * 0.025;
    this.r = 1 + Math.random() * 2.5; this.color = color;
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.vx*=0.94; this.vy*=0.94; this.life-=this.decay; }
  draw(ctx) {
    if (this.life<=0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.9;
    ctx.shadowColor = this.color; ctx.shadowBlur = 6;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Shockwave class ──────────────────────────────────────────────────────────
class Shockwave {
  constructor(cx, cy, color) {
    this.cx = cx; this.cy = cy; this.color = color;
    this.r = 20; this.life = 1.0;
  }
  update() { this.r += 6; this.life -= 0.04; }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.life * 0.7;
    ctx.lineWidth = 3 * this.life;
    ctx.shadowColor = this.color; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, this.r, 0, Math.PI*2); ctx.stroke();
    // Second ring slightly bigger
    ctx.globalAlpha = this.life * 0.3;
    ctx.lineWidth = 8 * this.life;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, this.r * 1.3, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

export default function ARPreviewCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let phaseIdx = 0;
    let phaseStart = performance.now();
    let particles = [];
    let shockwaves = [];
    let frameCount = 0;
    let fps = 60;
    let lastFpsTime = performance.now();
    let shockwaveSpawned = false;

    function getPhase(now) {
      let elapsed = now - phaseStart;
      if (elapsed >= PHASES[phaseIdx].duration) {
        phaseStart = now;
        phaseIdx = (phaseIdx + 1) % PHASES.length;
        elapsed = 0;
        shockwaveSpawned = false;
      }
      return { name: PHASES[phaseIdx].name, progress: Math.min(1, elapsed / PHASES[phaseIdx].duration) };
    }

    function jitteredHand(hand, jx, jy, W, H) {
      return hand.map(p => ({ x: p.x + jx / W, y: p.y + jy / H }));
    }

    function drawHand(pts, strokeColor, glowColor, power, W, H) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10 + power * 14;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2 + power * 1.5;
      ctx.lineCap = 'round';
      CONNECTIONS.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(pts[a].x * W, pts[a].y * H);
        ctx.lineTo(pts[b].x * W, pts[b].y * H);
        ctx.stroke();
      });
      ctx.restore();

      // Joint dots
      ctx.save();
      ctx.shadowColor = glowColor; ctx.shadowBlur = 8;
      pts.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? glowColor : '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, i === 0 ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    function drawOrb(cx, cy, r, color1, color2, power, t) {
      ctx.save();
      // Outer bloom
      const bloom = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 5);
      bloom.addColorStop(0, color1.replace('1)', `${power * 0.85})`));
      bloom.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bloom;
      ctx.beginPath(); ctx.arc(cx, cy, r * 5, 0, Math.PI * 2); ctx.fill();

      // Rotating ring
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(t * 0.0025);
      ctx.strokeStyle = color2.replace('1)', `${power * 0.9})`);
      ctx.lineWidth = 2 * power; ctx.shadowColor = color2.replace('1)','1)'); ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 2.0, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      // Second ring opposite spin
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(-t * 0.0018);
      ctx.strokeStyle = color1.replace('1)', `${power * 0.5})`);
      ctx.lineWidth = 1.5 * power;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 0.4, Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      // Core glow
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
      core.addColorStop(0, `rgba(255,255,255,${power})`);
      core.addColorStop(0.35, color1.replace('1)', `${power})`));
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core; ctx.shadowColor = color1.replace('1)','1)'); ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawLabel(text, sub, cx, cy, color) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.font = `bold 13px "Noto Sans JP", sans-serif`;
      ctx.fillText(text, cx, cy);
      ctx.font = `600 9px Inter, sans-serif`;
      ctx.fillStyle = `rgba(255,255,255,0.6)`;
      ctx.shadowBlur = 0;
      ctx.fillText(sub, cx, cy + 14);
      ctx.restore();
    }

    function drawGrid(W, H) {
      ctx.save();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 28) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();
    }

    function drawCornerBrackets(W, H, color) {
      const s = 20, t = 2;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = t;
      // TL
      ctx.beginPath(); ctx.moveTo(8, 8 + s); ctx.lineTo(8, 8); ctx.lineTo(8 + s, 8); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(W - 8 - s, 8); ctx.lineTo(W - 8, 8); ctx.lineTo(W - 8, 8 + s); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(8, H - 8 - s); ctx.lineTo(8, H - 8); ctx.lineTo(8 + s, H - 8); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(W - 8 - s, H - 8); ctx.lineTo(W - 8, H - 8); ctx.lineTo(W - 8, H - 8 - s); ctx.stroke();
      ctx.restore();
    }

    function drawUI(W, H, phase, fps) {
      // LIVE badge
      ctx.save();
      ctx.fillStyle = 'rgba(255, 35, 35, 0.92)';
      ctx.beginPath(); ctx.roundRect(10, 10, 46, 18, 4); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('● LIVE', 15, 22);
      ctx.restore();

      // FPS
      ctx.save();
      ctx.fillStyle = `rgba(${fps >= 55 ? '100,255,100' : '255,160,50'}, 0.85)`;
      ctx.font = '9px "Courier New", monospace'; ctx.textAlign = 'right';
      ctx.fillText(`${fps} FPS`, W - 10, 20);
      ctx.restore();

      // AI status
      const isTracking = phase !== 'idle';
      ctx.save();
      const statusColor = isTracking ? '#a855f7' : 'rgba(255,255,255,0.3)';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.roundRect(W - 10 - 110, H - 28, 110, 18, 4); ctx.fill();
      ctx.fillStyle = statusColor;
      ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(isTracking ? '◉ AI TRACKING ACTIVE' : '○ IDLE — SHOW HANDS', W - 10, H - 15);
      ctx.restore();

      // MediaPipe label bottom-left
      ctx.save();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.font = '8px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('MEDIAPIPE v0.10', 10, H - 15);
      ctx.restore();
    }

    function draw(now) {
      const W = canvas.width;
      const H = canvas.height;
      const { name: phase, progress } = getPhase(now);

      // FPS calculation
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
      }

      // Background
      ctx.fillStyle = '#04040c';
      ctx.fillRect(0, 0, W, H);

      // Scanlines
      ctx.save();
      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.055)';
        ctx.fillRect(0, y, W, 2);
      }
      ctx.restore();

      drawGrid(W, H);

      // Depth vignette
      const vig = ctx.createRadialGradient(W/2, H/2, W*0.2, W/2, H/2, W*0.65);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      const jx = Math.sin(now * 0.0007) * 5;
      const jy = Math.cos(now * 0.0005) * 4;
      const lHand = jitteredHand(LEFT_HAND,  jx, jy, W, H);
      const rHand = jitteredHand(RIGHT_HAND, -jx, jy, W, H);

      const bracketColor = phase === 'naruto-charge' || phase === 'naruto-peak'
        ? 'rgba(255,140,0,0.7)'
        : phase === 'jjk-charge' || phase === 'jjk-peak'
          ? 'rgba(168,85,247,0.7)'
          : 'rgba(168,85,247,0.45)';

      if (phase === 'idle') {
        drawHand(lHand, 'rgba(255,140,0,0.5)', '#ff8c00', 0.2, W, H);
        drawHand(rHand, 'rgba(168,85,247,0.5)', '#a855f7', 0.2, W, H);

      } else if (phase === 'naruto-charge') {
        const p = progress;
        drawHand(lHand, `rgba(255,${120+Math.floor(p*80)},0,${0.6+p*0.4})`, '#ff8c00', 0.4+p*0.6, W, H);
        drawHand(rHand, 'rgba(168,85,247,0.3)', '#a855f7', 0.15, W, H);
        const palmX = lHand[9].x * W;
        const palmY = (lHand[9].y - 0.13) * H;
        const orbR = 10 + p * 22;
        drawOrb(palmX, palmY, orbR, 'rgba(255,140,0,1)', 'rgba(80,180,255,1)', p, now);
        if (Math.random() < 0.35) particles.push(new Particle(palmX, palmY, '#ff8c00'));
        // "HAND DETECTED" near wrist
        ctx.save();
        ctx.fillStyle = 'rgba(255,140,0,0.5)';
        ctx.font = '8px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('HAND DETECTED', lHand[0].x * W, lHand[0].y * H + 14);
        ctx.restore();

      } else if (phase === 'naruto-peak') {
        drawHand(lHand, 'rgba(255,180,50,1)', '#ffb432', 1, W, H);
        drawHand(rHand, 'rgba(168,85,247,0.3)', '#a855f7', 0.15, W, H);
        const palmX = lHand[9].x * W;
        const palmY = (lHand[9].y - 0.13) * H;
        drawOrb(palmX, palmY, 32, 'rgba(255,140,0,1)', 'rgba(80,180,255,1)', 1.0, now);
        if (Math.random() < 0.5) particles.push(new Particle(palmX, palmY, '#ffcc44'));
        if (!shockwaveSpawned) {
          shockwaves.push(new Shockwave(palmX, palmY, '#ff8c00'));
          shockwaveSpawned = true;
        }
        drawLabel('螺旋丸', 'RASENGAN', palmX, palmY - 48, '#ffb432');

      } else if (phase === 'shockwave') {
        drawHand(lHand, 'rgba(255,180,50,0.6)', '#ffb432', 0.5, W, H);
        drawHand(rHand, 'rgba(168,85,247,0.3)', '#a855f7', 0.15, W, H);

      } else if (phase === 'jjk-charge') {
        const p = progress;
        drawHand(lHand, `rgba(0,${150+Math.floor(p*62)},255,${0.5+p*0.5})`, '#00d4ff', 0.4+p*0.6, W, H);
        drawHand(rHand, `rgba(255,${30+Math.floor(p*30)},0,${0.5+p*0.5})`, '#ff2200', 0.4+p*0.6, W, H);
        const lPX = lHand[9].x * W, lPY = (lHand[9].y - 0.1) * H;
        const rPX = rHand[9].x * W, rPY = (rHand[9].y - 0.1) * H;
        drawOrb(lPX, lPY, 10 + p * 16, 'rgba(0,212,255,1)', 'rgba(0,80,200,1)', p, now);
        drawOrb(rPX, rPY, 10 + p * 16, 'rgba(255,50,0,1)', 'rgba(200,0,0,1)', p, now);
        if (Math.random() < 0.3) {
          particles.push(new Particle(lPX, lPY, '#00d4ff'));
          particles.push(new Particle(rPX, rPY, '#ff2200'));
        }

      } else if (phase === 'jjk-peak') {
        drawHand(lHand, 'rgba(0,220,255,1)', '#00d4ff', 1, W, H);
        drawHand(rHand, 'rgba(255,80,0,1)', '#ff5000', 1, W, H);
        const lPX = lHand[9].x * W, lPY = (lHand[9].y - 0.1) * H;
        const rPX = rHand[9].x * W, rPY = (rHand[9].y - 0.1) * H;
        drawOrb(lPX, lPY, 26, 'rgba(0,212,255,1)', 'rgba(0,80,200,1)', 1, now);
        drawOrb(rPX, rPY, 26, 'rgba(255,50,0,1)', 'rgba(200,0,0,1)', 1, now);
        if (Math.random() < 0.5) {
          particles.push(new Particle(lPX, lPY, '#00d4ff'));
          particles.push(new Particle(rPX, rPY, '#ff2200'));
        }
        if (!shockwaveSpawned) {
          const cx = (lPX + rPX) / 2, cy = (lPY + rPY) / 2;
          shockwaves.push(new Shockwave(cx, cy, '#a855f7'));
          shockwaves.push(new Shockwave(lPX, lPY, '#00d4ff'));
          shockwaves.push(new Shockwave(rPX, rPY, '#ff2200'));
          shockwaveSpawned = true;
        }
        const cx = (lPX + rPX) / 2;
        const cy = Math.min(lPY, rPY) - 28;
        drawLabel('虚式：茈', 'HOLLOW PURPLE', cx, cy, '#c084fc');

      } else if (phase === 'shockwave-jjk') {
        drawHand(lHand, 'rgba(0,212,255,0.4)', '#00d4ff', 0.3, W, H);
        drawHand(rHand, 'rgba(255,50,0,0.4)', '#ff2200', 0.3, W, H);
      }

      // Draw particles
      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => { p.update(); p.draw(ctx); });
      if (particles.length > 250) particles.splice(0, particles.length - 250);

      // Draw shockwaves
      shockwaves = shockwaves.filter(s => s.life > 0);
      shockwaves.forEach(s => { s.update(); s.draw(ctx); });

      drawCornerBrackets(W, H, bracketColor);
      drawUI(W, H, phase, fps);

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={460}
      height={360}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
