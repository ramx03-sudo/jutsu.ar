import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { SFXPlayer } from './utils/AudioPlayer';
import { useHandTracking } from './hooks/useHandTracking';
import CinematicTitle from './components/CinematicTitle';
import { VFXEngine } from './vfx/VFXEngine';
import { SenbonzakuraEffect } from './vfx/effects/SenbonzakuraEffect';
import './index.css';

// ── Pure utility functions ──────────────────────────────────────────────────

function getScreenCoords(vEl, nx, ny) {
  if (!vEl || !vEl.videoWidth) {
    return { x: (1 - nx) * window.innerWidth, y: ny * window.innerHeight };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const vRatio = vEl.videoWidth / vEl.videoHeight;
  const sRatio = vw / vh;
  let renderW, renderH, offsetX, offsetY;
  if (sRatio > vRatio) {
    renderW = vw; renderH = vw / vRatio;
    offsetX = 0; offsetY = (vh - renderH) / 2;
  } else {
    renderH = vh; renderW = vh * vRatio;
    offsetX = (vw - renderW) / 2; offsetY = 0;
  }
  return { x: (1 - nx) * renderW + offsetX, y: ny * renderH + offsetY };
}

function checkOpen(pts) {
  let count = 0;
  const wrist = pts[0];
  const tips = [8, 12, 16, 20];
  const pips  = [6, 10, 14, 18];
  for (let i = 0; i < 4; i++) {
    const tipD = Math.hypot(pts[tips[i]].x - wrist.x, pts[tips[i]].y - wrist.y);
    const pipD = Math.hypot(pts[pips[i]].x - wrist.x, pts[pips[i]].y - wrist.y);
    if (tipD > pipD) count++;
  }
  const tTip = Math.hypot(pts[4].x - wrist.x, pts[4].y - wrist.y);
  const tIP  = Math.hypot(pts[3].x - wrist.x, pts[3].y - wrist.y);
  if (tTip > tIP) count += 0.5;
  return count >= 3.5;
}

function checkClasped(hands) {
  if (hands.length < 2) return false;
  // Check distance between wrists
  const d = Math.hypot(hands[0][0].x - hands[1][0].x, hands[0][0].y - hands[1][0].y);
  return d < 0.15; // Hands are very close
}

function checkFist(pts) {
  let count = 0;
  const wrist = pts[0];
  const tips = [8, 12, 16, 20];
  const pips  = [6, 10, 14, 18];
  for (let i = 0; i < 4; i++) {
    const tipD = Math.hypot(pts[tips[i]].x - wrist.x, pts[tips[i]].y - wrist.y);
    const pipD = Math.hypot(pts[pips[i]].x - wrist.x, pts[pips[i]].y - wrist.y);
    if (tipD < pipD) count++;
  }
  return count >= 3;
}

// Removed 2D SenbonzakuraSword and SenbonzakuraPetal classes as they are now handled by Three.js VFXEngine.


class GetsugaSlash {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx * 25; // fast forward speed
    this.vy = vy * 25;
    this.life = 1.0;
    this.angle = Math.atan2(vy, vx);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.05; // lives for ~20 frames (0.33s)
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(1 + (1 - this.life), 1 + (1 - this.life) * 0.5);

    // Sharp crescent shape
    ctx.beginPath();
    ctx.moveTo(0, -100);
    ctx.quadraticCurveTo(50, 0, 0, 100);
    ctx.quadraticCurveTo(20, 0, 0, -100);
    
    // Deep blue + black gradient
    const grad = ctx.createLinearGradient(0, -100, 0, 100);
    grad.addColorStop(0, `rgba(0, 50, 200, ${this.life})`);
    grad.addColorStop(0.5, `rgba(0, 0, 50, ${this.life})`);
    grad.addColorStop(1, `rgba(0, 50, 200, ${this.life})`);
    
    ctx.fillStyle = grad;
    ctx.shadowColor = '#0055ff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
function Bleach({ onBack }) {
  const vRef    = useRef(null);
  const cRef    = useRef(null);
  const efxRef  = useRef(null);
  const vfxEngineRef = useRef(null);
  const animFrameRef = useRef(null);
  const flashRef = useRef(null);
  const hintRef  = useRef(null);

  // Callback ref for Three.js canvas — fires when canvas mounts/unmounts
  const threeRef = useCallback(node => {
    if (node && !vfxEngineRef.current) {
      console.log('[Bleach] Three.js canvas mounted, starting VFXEngine...');
      const engine = new VFXEngine(node);
      vfxEngineRef.current = engine;

      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate); // schedule FIRST
        engine.update();
      };
      animate();

      const handleResize = () => engine.resize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', handleResize);
      node._cleanup = () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animFrameRef.current);
        engine.clear();
        vfxEngineRef.current = null;
      };
    } else if (!node && vfxEngineRef.current) {
      // Canvas unmounted
      if (node && node._cleanup) node._cleanup();
    }
  }, []);

  const drawingUtilsRef = useRef(null);
  const titleIdRef = useRef(0);
  const handleTitleDone = useCallback(() => setActiveTitle(null), []);

  const [activeTitle, setActiveTitle] = useState(null);
  const [darkness, setDarkness] = useState(0);

  const stateRef = useRef({
    getsuga: [],
    bankaiLines: [],
    lastPos: [null, null],
    lastResize: 0,
    hintHidden: false,
    bankaiPower: 0,
    senbonPower: 0,
    hasActiveSenbonzakura: false
  });


  const onResults = useCallback((res) => {
    const vEl = vRef.current;
    const cEl = cRef.current;
    const efx = efxRef.current;
    if (!vEl || !cEl || !efx) return;

    const ctx = cEl.getContext('2d');
    const efxCtx = efx.getContext('2d');
    const st = stateRef.current;

    const now = Date.now();
    if (now - st.lastResize > 250) {
      cEl.width = vEl.videoWidth || window.innerWidth;
      cEl.height = vEl.videoHeight || window.innerHeight;
      efx.width = cEl.width;
      efx.height = cEl.height;
      st.lastResize = now;
    }

    if (!drawingUtilsRef.current) drawingUtilsRef.current = new DrawingUtils(ctx);
    const drawingUtils = drawingUtilsRef.current;

    ctx.save(); ctx.clearRect(0, 0, cEl.width, cEl.height);
    efxCtx.clearRect(0, 0, efx.width, efx.height);

    if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
      if (!st.hintHidden && hintRef.current) {
        st.hintHidden = true;
        hintRef.current.classList.add('hidden');
      }

      let clasped = checkClasped(res.multiHandLandmarks);
      let isFist = false;
      for (let i=0; i<res.multiHandLandmarks.length; i++) {
         if (checkFist(res.multiHandLandmarks[i])) isFist = true;
      }

      if (clasped) {
        st.bankaiPower = Math.min(1, st.bankaiPower + 0.05);
        if (st.bankaiPower > 0.8 && !activeTitle) {
          setActiveTitle({ id: ++titleIdRef.current, type: 'bankai', kanji: '卍解', sub: 'BANKAI' });
        }
      } else {
        st.bankaiPower = Math.max(0, st.bankaiPower - 0.05);
      }

      // Check if any senbonzakura effect is currently running in the engine
      const engine = vfxEngineRef.current;
      const activeSenbon = engine ? engine.activeEffects.find(e => e instanceof SenbonzakuraEffect && !e.done) : null;

      if (isFist && !clasped) {
        if (!activeSenbon) {
          st.senbonPower = Math.min(1, st.senbonPower + 0.08); // faster charge
          if (st.senbonPower > 0.5) { // lower threshold - easier trigger
             const wristCoords = getScreenCoords(vEl, res.multiHandLandmarks[0][0].x, res.multiHandLandmarks[0][0].y);
             if (engine) engine.spawn(new SenbonzakuraEffect(wristCoords.x, wristCoords.y));
             st.senbonPower = 0; // reset so it can re-trigger
             if (!activeTitle) {
               setActiveTitle({ id: ++titleIdRef.current, type: 'senbonzakura', kanji: '千本桜景厳', sub: 'SENBONZAKURA KAGEYOSHI' });
             }
          }
        }
      } else {
        st.senbonPower = Math.max(0, st.senbonPower - 0.05);
      }

      res.multiHandLandmarks.forEach((pts, i) => {
        // Draw hands (Clean, sharp, minimal)
        ctx.save();
        ctx.shadowBlur = 5; ctx.shadowColor = '#ffffff';
        drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: 'rgba(255,255,255,0.2)', lineWidth: 1 });
        drawingUtils.drawLandmarks(pts, { color: '#ffffff', lineWidth: 1, radius: 1.5 });
        ctx.restore();

        const isOpen = checkOpen(pts);
        const wrist = pts[0];
        const coords = getScreenCoords(vEl, wrist.x, wrist.y);

        if (isOpen && !clasped && !isFist) {
          if (st.lastPos[i]) {
            const dx = coords.x - st.lastPos[i].x;
            const dy = coords.y - st.lastPos[i].y;
            const dist = Math.hypot(dx, dy);
            
            // Fast swipe detection
            if (dist > 40) { // arbitrary fast threshold
              const angle = Math.atan2(dy, dx);
              st.getsuga.push(new GetsugaSlash(coords.x, coords.y, Math.cos(angle), Math.sin(angle)));
              if (!activeTitle) {
                setActiveTitle({ id: ++titleIdRef.current, type: 'getsuga', kanji: '月牙天衝', sub: 'GETSUGA TENSHO' });
              }
              // Reset pos to prevent multiple spawns in one continuous fast move, require slow down
              st.lastPos[i] = coords; 
            } else {
              st.lastPos[i] = coords;
            }
          } else {
            st.lastPos[i] = coords;
          }
        } else {
          st.lastPos[i] = coords;
        }
      });
    }

    // Update VFX
    setDarkness(st.bankaiPower * 0.15); // 10-15% darkening

    // DEBUG HUD
    efxCtx.save();
    efxCtx.fillStyle = 'lime';
    efxCtx.font = '20px monospace';
    efxCtx.fillText(`Senbon Power: ${st.senbonPower.toFixed(2)}`, 20, 60);
    const engine = vfxEngineRef.current;
    const activeSenb = engine ? engine.activeEffects.find(e => e instanceof SenbonzakuraEffect && !e.done) : null;
    efxCtx.fillText(`Active Senbon: ${activeSenb ? 'YES' : 'NO'}`, 20, 90);
    efxCtx.fillText(`Engine frames: ${engine ? engine.frameCount : 'NO ENGINE'}`, 20, 120);
    if (engine && engine.lastError) {
      efxCtx.fillStyle = 'red';
      efxCtx.fillText(`Error: ${engine.lastError}`, 20, 150);
    } else if (activeSenb && activeSenb.sword) {
      efxCtx.fillText(`Sword Y: ${activeSenb.sword.position.y.toFixed(0)}`, 20, 150);
      efxCtx.fillText(`Time: ${activeSenb.time.toFixed(2)}`, 20, 180);
    }
    efxCtx.restore();

    if (st.bankaiPower > 0) {
      // Draw Bankai energy lines
      efxCtx.save();
      efxCtx.lineWidth = 2;
      efxCtx.strokeStyle = `rgba(255, 0, 0, ${st.bankaiPower * 0.8})`;
      efxCtx.shadowColor = '#ff0000';
      efxCtx.shadowBlur = 10;
      for (let i = 0; i < 10; i++) {
         efxCtx.beginPath();
         const x = (Math.sin(now * 0.001 + i) * 0.5 + 0.5) * efx.width;
         efxCtx.moveTo(x, efx.height);
         efxCtx.lineTo(x + (Math.random()-0.5)*50, efx.height - (Math.random() * 300 * st.bankaiPower) - 100);
         efxCtx.stroke();
      }
      
      efxCtx.strokeStyle = `rgba(0, 0, 0, ${st.bankaiPower * 0.9})`;
      efxCtx.shadowBlur = 0;
      for (let i = 0; i < 5; i++) {
         efxCtx.beginPath();
         const x = (Math.cos(now * 0.0015 + i) * 0.5 + 0.5) * efx.width;
         efxCtx.moveTo(x, efx.height);
         efxCtx.lineTo(x + (Math.random()-0.5)*20, efx.height - (Math.random() * 400 * st.bankaiPower) - 50);
         efxCtx.stroke();
      }
      efxCtx.restore();
    }

    // 2D Senbonzakura removed, drawn via Three.js canvas over this one.

    for (let i = st.getsuga.length - 1; i >= 0; i--) {
      st.getsuga[i].update();
      st.getsuga[i].draw(efxCtx);
      if (st.getsuga[i].life <= 0) st.getsuga.splice(i, 1);
    }

    ctx.restore();
  }, [activeTitle]);

  const { isLoading, loadingMsg } = useHandTracking(vRef, onResults);

  return (
    <div className="ar-container">
      <div id="loading-screen" className={isLoading ? '' : 'hidden'}>
        <div className="loader-ring bleach-ring">
          <div className="loader-ring-inner bleach-ring-inner">
            <div className="loader-dot bleach-dot"></div>
          </div>
        </div>
        <div className="loader-title bleach-title">BLEACH AR</div>
        <div className="loader-sub">Spiritual Pressure Experience</div>
        <div className="loader-status">{loadingMsg}</div>
      </div>

      <button className="back-btn" onClick={onBack}>← Back</button>

      <video id="v_src" ref={vRef} autoPlay playsInline></video>
      <canvas id="out" ref={cRef}></canvas>
      <canvas id="efx" ref={efxRef} style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', objectFit: 'cover', pointerEvents: 'none', zIndex: 10 }}></canvas>
      <canvas id="three" ref={threeRef} style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', objectFit: 'cover', pointerEvents: 'none', zIndex: 11 }}></canvas>
      
      <div className="darkness bleach-darkness" style={{ background: `rgba(0,0,0,${darkness})` }}></div>

      <div id="flash" ref={flashRef}></div>

      <div id="top-badge">
        <div className="badge-title" style={{color: 'rgba(255,255,255,0.7)'}}>✦ Soul Reaper ✦</div>
      </div>

      <div id="hint" ref={hintRef}>
        <span className="hint-hand" style={{color: '#fff'}}>⚔️</span>
        <div className="hint-text">Unleash your Zanpakuto</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: '1.4' }}>
          Open Hand + Fast Swipe = <b>Getsuga Tensho</b><br/>
          Show Fist = <b>Senbonzakura</b> &nbsp;|&nbsp; Both Hands Clasped = <b>Bankai</b>
        </div>
      </div>

      {activeTitle && (
        <CinematicTitle
          key={activeTitle.id}
          kanji={activeTitle.kanji}
          subtitle={activeTitle.sub}
          color={activeTitle.type === 'getsuga' ? '#0088ff' : activeTitle.type === 'senbonzakura' ? '#ffb4c8' : '#ff0000'}
          onDone={handleTitleDone}
          isActive={true}
          holdMs={1000} // Faster, snappier reveal
        />
      )}
    </div>
  );
}

export default Bleach;
