import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// Cursor particle system
// - Idle: particles drift near cursor
// - CTA hover: particles converge toward target
// - Click: radial burst explosion

class Particle {
  constructor(x, y, mode = 'idle') {
    this.x = x;
    this.y = y;
    this.ox = x;
    this.oy = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = mode === 'burst'
      ? 4 + Math.random() * 8
      : 0.3 + Math.random() * 1.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = mode === 'burst'
      ? 0.018 + Math.random() * 0.02
      : 0.006 + Math.random() * 0.006;
    this.r = mode === 'burst'
      ? 1.5 + Math.random() * 3
      : 0.8 + Math.random() * 1.8;
    this.mode = mode;
    // purple / orange mix
    this.color = Math.random() < 0.7
      ? `rgba(168, 85, 247,`
      : `rgba(255, 140, 0,`;
    this.trail = [];
  }

  update(targetX, targetY, converge) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();

    if (converge && this.mode !== 'burst') {
      // Pull toward target
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);
      const force = Math.min(0.15, 80 / (dist + 1));
      this.vx += (dx / dist) * force;
      this.vy += (dy / dist) * force;
      // Cap speed
      const spd = Math.hypot(this.vx, this.vy);
      if (spd > 5) { this.vx = (this.vx / spd) * 5; this.vy = (this.vy / spd) * 5; }
    } else if (this.mode === 'idle') {
      // Gentle friction + drift toward spawn area
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.vx += (Math.random() - 0.5) * 0.15;
      this.vy += (Math.random() - 0.5) * 0.15;
    } else {
      // burst: free flight with gravity-less deceleration
      this.vx *= 0.96;
      this.vy *= 0.96;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = this.life;

    // Trail
    if (this.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = `${this.color}${alpha * 0.4})`;
      ctx.lineWidth = this.r * 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      this.trail.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }

    // Core dot
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `${this.color}1)`;
    ctx.shadowColor = `${this.color}0.8)`;
    ctx.shadowBlur = this.r * 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const CursorParticles = forwardRef(function CursorParticles(props, ref) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    mouse: { x: -999, y: -999 },
    converge: false,
    convergeTarget: { x: 0, y: 0 },
    particles: [],
    animId: null,
  });

  // Expose trigger methods to parent
  useImperativeHandle(ref, () => ({
    setConverge(active, targetX, targetY) {
      const st = stateRef.current;
      st.converge = active;
      if (targetX !== undefined) {
        st.convergeTarget.x = targetX;
        st.convergeTarget.y = targetY;
      }
    },
    burst(x, y) {
      const st = stateRef.current;
      for (let i = 0; i < 50; i++) {
        st.particles.push(new Particle(x, y, 'burst'));
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
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

    const onMove = (e) => {
      st.mouse.x = e.clientX;
      st.mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove);

    let spawnTimer = 0;

    function draw(now) {
      ctx.clearRect(0, 0, w, h);

      // Spawn idle particles near cursor at rate ~10/s
      spawnTimer++;
      if (spawnTimer % 6 === 0 && st.mouse.x > 0) {
        const jx = st.mouse.x + (Math.random() - 0.5) * 30;
        const jy = st.mouse.y + (Math.random() - 0.5) * 30;
        st.particles.push(new Particle(jx, jy, 'idle'));
      }
      // Burst extra particles when converging
      if (st.converge && spawnTimer % 3 === 0 && st.mouse.x > 0) {
        const jx = st.mouse.x + (Math.random() - 0.5) * 60;
        const jy = st.mouse.y + (Math.random() - 0.5) * 60;
        st.particles.push(new Particle(jx, jy, 'idle'));
      }

      // Cap total
      if (st.particles.length > 300) st.particles.splice(0, st.particles.length - 300);

      // Update & draw
      st.particles = st.particles.filter(p => p.life > 0);
      st.particles.forEach(p => {
        p.update(st.convergeTarget.x, st.convergeTarget.y, st.converge);
        p.draw(ctx);
      });

      st.animId = requestAnimationFrame(draw);
    }

    st.animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(st.animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
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
        zIndex: 999,
        mixBlendMode: 'screen',
      }}
    />
  );
});

export default CursorParticles;
