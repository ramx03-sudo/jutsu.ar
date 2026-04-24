import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import './index.css';
import './hud.css';
/* ── AUDIO ── */
const gAudio = new Audio('/assets/Audios/gojo-reversal-red.mp3');
gAudio.loop = true;
const sAudio = new Audio('/assets/Audios/malevolent_shrine.mp3');
sAudio.loop = true;

function playGojo() { gAudio.currentTime = 0; gAudio.play().catch(() => { }); }
function playSukuna() { sAudio.currentTime = 0; sAudio.play().catch(() => { }); }

function updateJutsuAudio(pg, ps) {
  // Target volumes based on visual power
  const targetG = pg > 0.01 ? pg * 1.0 : 0;
  const targetS = ps > 0.01 ? ps * 0.8 : 0;

  // Gojo — quick fade in, very slow fade out (smooth dissipation)
  if (gAudio.volume < targetG) gAudio.volume = Math.min(1.0, targetG);
  else gAudio.volume = Math.max(0, gAudio.volume - 0.01); // fades over ~100 frames (~1.6s)

  // Sukuna — normal fade out
  if (sAudio.volume < targetS) sAudio.volume = Math.min(1.0, targetS);
  else sAudio.volume = Math.max(0, sAudio.volume - 0.02);

  // Pause when silent
  if (gAudio.volume <= 0.01 && !gAudio.paused) gAudio.pause();
  if (sAudio.volume <= 0.01 && !sAudio.paused) sAudio.pause();
}

/* ── PARTICLE CLASSES ── */
class GojoSparkParticle {
  constructor(cx, cy, power) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 * power + 1;
    this.x = cx; this.y = cy;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = Math.random() * 0.05 + 0.02;
    this.size = Math.random() * 2 * power + 0.5;
    this.trail = [];
  }
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 4) this.trail.shift();
    this.x += this.vx; this.y += this.vy;
    this.vx *= 0.95; this.vy *= 0.95;
    this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0 || this.trail.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.trail[0].x, this.trail[0].y);
    for (let i = 1; i < this.trail.length; i++) {
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
    }
    ctx.strokeStyle = `rgba(255, 80, 0, ${this.life})`;
    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

class SukunaParticle {
  constructor(cx, cy, power) {
    this.x = cx + (Math.random() - 0.5) * window.innerWidth * 1.5;
    this.y = cy + (Math.random() - 0.5) * window.innerHeight * 1.5;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -Math.random() * 6 - 2;
    this.life = 1.0;
    this.decay = Math.random() * 0.015 + 0.005;
    this.size = Math.random() * 8 * power + 2;
    
    const r = Math.random();
    if (r < 0.4) this.type = 'ash';
    else if (r < 0.7) this.type = 'ember';
    else this.type = 'smoke';
  }
  update() { 
    this.x += this.vx; this.y += this.vy; 
    if (this.type === 'smoke') this.size += 0.5;
    this.life -= this.decay; 
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    if (this.type === 'smoke') {
      ctx.globalAlpha = this.life * 0.5;
      ctx.fillStyle = `rgba(10, 5, 5, 1)`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'ember') {
      ctx.globalAlpha = this.life * 0.9;
      ctx.shadowBlur = 10; ctx.shadowColor = '#ff3300';
      ctx.fillStyle = `rgba(255, 60, 0, 1)`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = this.life * 0.7;
      ctx.fillStyle = `rgba(100, 100, 100, 1)`;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
    ctx.restore();
  }
}

/* ── AURA RENDERERS ── */
function drawGojoRedAura(ctx, cx, cy, power, t) {
  if (power < 0.02) return;
  ctx.save();

  // Core sizing (golf ball to small orange ~ 40px max)
  const pulse = 1 + Math.sin(t * 0.01) * 0.05;
  let coreR = 15 + power * 25 * pulse;

  // 1. Cinematic Bloom & Heat Distortion
  const bloomR = coreR * 6;
  const bloom = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, bloomR);
  bloom.addColorStop(0, `rgba(255, 20,  0, ${power * 0.6})`);
  bloom.addColorStop(0.3, `rgba(180, 0,   0, ${power * 0.25})`);
  bloom.addColorStop(0.7, `rgba(60,  0,   0, ${power * 0.1})`);
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(cx, cy, bloomR, 0, Math.PI * 2); ctx.fill();

  // 2. 3D Orbiting Plasma Rings
  // Using ellipse() to simulate true 3D rotation in space
  const numRings = 3;
  const ringAngles = [t * 0.002, -t * 0.003, t * 0.0015]; // Spin speed
  const ringTilts = [0.25, 0.35, 0.15]; // Y-axis squash for 3D depth
  const ringScale = [1.8, 2.4, 3.2]; // Radius multipliers

  for (let i = 0; i < numRings; i++) {
    ctx.save();
    ctx.translate(cx, cy);

    // Global wobble/angle of the ring plane
    const ellipseRot = i * (Math.PI / 1.5) + Math.sin(t * 0.001 + i) * 0.2;

    const radiusX = coreR * ringScale[i];
    const radiusY = radiusX * ringTilts[i];
    const spin = ringAngles[i] * 3;

    // Motion blur trails
    const numTrails = 8;
    for (let j = 0; j < numTrails; j++) {
      ctx.beginPath();
      const arcOffset = j * 0.15;
      const start = spin - Math.PI * 0.6 + arcOffset;
      const end = spin + arcOffset;
      // ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
      ctx.ellipse(0, 0, radiusX, radiusY, ellipseRot, start, end);

      ctx.lineWidth = (6 - j * 0.6) * power;
      const alpha = power * (1 - j / numTrails);
      ctx.strokeStyle = `rgba(255, ${40 + j * 15}, 0, ${alpha})`;
      ctx.lineCap = 'round';

      if (j === 0) { ctx.shadowColor = '#ff2000'; ctx.shadowBlur = 15 * power; }
      else { ctx.shadowBlur = 0; }

      ctx.stroke();
    }

    // Faint full orbit path for grounding
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, ellipseRot, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(255, 30, 0, ${power * 0.15})`;
    ctx.stroke();

    ctx.restore();
  }

  // 3. Dense Volumetric Core Sphere
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const plasmaG = ctx.createRadialGradient(cx, cy, coreR * 0.2, cx, cy, coreR);
  plasmaG.addColorStop(0, `rgba(255, 255, 255, ${power})`);     // White hot center
  plasmaG.addColorStop(0.3, `rgba(255, 180, 50,  ${power})`);     // Orange-white
  plasmaG.addColorStop(0.55, `rgba(255, 20,  0,   ${power})`);     // Crimson red
  plasmaG.addColorStop(0.85, `rgba(160, 0,   0,   ${power * 0.9})`);
  plasmaG.addColorStop(1, `rgba(0,   0,   0,   0)`);
  ctx.fillStyle = plasmaG;
  ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 40 * power;
  ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();

  // 4. Pressure Pulse Phase (Release)
  if (power > 0.8) {
    const sw = (power - 0.8) * 5; // scales 0 to 1
    ctx.strokeStyle = `rgba(255, 60, 0, ${1 - sw})`;
    ctx.lineWidth = 6 * (1 - sw);
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx, cy, coreR * (1 + sw * 2.5), 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();
}

function drawSukunaAura(ctx, cx, cy, power, t) {
  if (power < 0.05) return;
  ctx.save();
  
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  
  // 1. World Tint, Vignette, Flicker
  ctx.globalAlpha = power * 0.8;
  ctx.fillStyle = 'rgba(20, 0, 0, 1)';
  ctx.fillRect(0, 0, w, h);
  
  const vignette = ctx.createRadialGradient(w/2, h/2, w*0.3, w/2, h/2, w*0.8);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, `rgba(0,0,0,${power})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  
  if (Math.random() < 0.1) {
     ctx.fillStyle = `rgba(255, 0, 0, ${power * 0.1})`;
     ctx.fillRect(0, 0, w, h);
  }

  // 2. Giant 3D Shrine Gate (Far Behind)
  ctx.save();
  const plxX = (cx - w/2) * 0.1;
  const plxY = (cy - h/2) * 0.1;
  const loomScale = 1 + power * 0.1;
  
  ctx.translate(w/2 + plxX, h/2 + plxY);
  ctx.scale(loomScale, loomScale);
  
  ctx.globalAlpha = power * 0.7;
  ctx.fillStyle = '#0a0000';
  ctx.shadowBlur = 50 * power;
  ctx.shadowColor = '#ff0000';
  
  const gateW = 1200;
  const gateH = 1000;
  
  ctx.fillRect(-gateW*0.3, -gateH*0.4, gateW*0.08, gateH); // Left pillar
  ctx.fillRect(gateW*0.22, -gateH*0.4, gateW*0.08, gateH); // Right pillar
  ctx.fillRect(-gateW*0.4, -gateH*0.2, gateW*0.8, gateH*0.08); // Lower crossbeam
  ctx.fillRect(-gateW*0.45, -gateH*0.4, gateW*0.9, gateH*0.1); // Upper crossbeam
  
  ctx.beginPath();
  ctx.moveTo(-gateW*0.5, -gateH*0.4);
  ctx.quadraticCurveTo(0, -gateH*0.6, gateW*0.5, -gateH*0.4);
  ctx.lineTo(gateW*0.5, -gateH*0.5);
  ctx.quadraticCurveTo(0, -gateH*0.75, -gateW*0.5, -gateH*0.5);
  ctx.fill();
  ctx.restore();

  // 3. Ground Cracks
  ctx.save();
  ctx.translate(w/2, h); // bottom center
  ctx.globalAlpha = power * 0.9;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 10; ctx.shadowColor = '#ff0000';
  for(let i=0; i<5; i++) {
     ctx.beginPath();
     ctx.moveTo(0, 0);
     const ang = -Math.PI/2 + (i - 2) * 0.4 + Math.sin(t*0.001+i)*0.1;
     const len = 300 * power + Math.random()*50;
     ctx.lineTo(Math.cos(ang)*len, Math.sin(ang)*len);
     ctx.lineTo(Math.cos(ang+0.2)*len*1.2, Math.sin(ang+0.2)*len*1.2);
     ctx.stroke();
  }
  ctx.restore();

  // 4. Pressure Pulse / Demonic Core
  ctx.globalAlpha = 1;
  const r = 110 * power + Math.sin(t * 0.01) * 8;
  const cg = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.5);
  cg.addColorStop(0, `rgba(255, 20, 0, ${power})`);
  cg.addColorStop(0.3, `rgba(80, 0, 0, ${power * 0.8})`);
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; 
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2); ctx.fill();

  // 5. Text Flash
  // (Removed as requested)

  ctx.restore();
}

/* ── GESTURE HELPERS ── */
function isFingerUp(pts, ti, pi) {
  const w = pts[0];
  return Math.hypot(pts[ti].x - w.x, pts[ti].y - w.y) > Math.hypot(pts[pi].x - w.x, pts[pi].y - w.y) + 0.02;
}
function getGesture(pts) {
  const iU = isFingerUp(pts, 8, 6), mU = isFingerUp(pts, 12, 10), rU = isFingerUp(pts, 16, 14), pU = isFingerUp(pts, 20, 18);
  if (iU && mU && !rU && !pU) return 'gojo';
  return null;
}
function isSukunaSign(hands) {
  if (hands.length < 2) return false;

  // Check all pairs of hands if multiple people are in frame
  for (let i = 0; i < hands.length; i++) {
    for (let j = i + 1; j < hands.length; j++) {
      const h1 = hands[i], h2 = hands[j];
      const tips = [8, 12, 16, 20];
      let minD = 1.0;
      for (const t1 of tips) {
        for (const t2 of tips) {
          const d = Math.hypot(h1[t1].x - h2[t2].x, h1[t1].y - h2[t2].y);
          if (d < minD) minD = d;
        }
      }
      const palmD = Math.hypot(h1[9].x - h2[9].x, h1[9].y - h2[9].y);
      if (palmD < 0.25 && minD < 0.08) return true;
    }
  }
  return false;
}

/* ── COMPONENT ── */
function JJK({ onBack }) {
  const vRef = useRef(null);
  const cRef = useRef(null);
  const efxRef = useRef(null); // particle canvas
  const flashRef = useRef(null);
  const hintRef = useRef(null);

  const [loadingMsg, setLoadingMsg] = useState('Expanding Domain…');
  const [isLoading, setIsLoading] = useState(true);
  const [pwrGojo, setPwrGojo] = useState(0);
  const [pwrSukuna, setPwrSukuna] = useState(0);
  const [activeGojo, setActiveGojo] = useState(false);
  const [activeSukuna, setActiveSukuna] = useState(false);

  useEffect(() => {
    const vEl = vRef.current;
    const cEl = cRef.current;
    const ctx = cEl.getContext('2d');
    const efx = efxRef.current;
    const efxCtx = efx.getContext('2d');
    const flash = flashRef.current;
    const hint = hintRef.current;

    let pwr = { gojo: 0, sukuna: 0 };
    let wasActive = { gojo: false, sukuna: false };
    let hintHidden = false;
    let lastResize = 0;

    // Particle pools
    const gojoParticles = [];
    const sukunaParticles = [];

    // Hand positions for aura rendering
    let gojoPos = null;
    let sukunaPos = null;

    function triggerFlash(type) {
      flash.className = '';
      void flash.offsetWidth;
      flash.className = type === 'gojo' ? 'flash-gojo' : 'flash-sukuna';
      if (type === 'gojo') playGojo(); else playSukuna();
    }

    function onResults(res) {
      const now = Date.now();
      if (now - lastResize > 250) {
        cEl.width = vEl.videoWidth || window.innerWidth;
        cEl.height = vEl.videoHeight || window.innerHeight;
        efx.width = cEl.width;
        efx.height = cEl.height;
        lastResize = now;
      }

      ctx.save(); ctx.clearRect(0, 0, cEl.width, cEl.height);

      let foundGojoHand = null;
      let foundSukunaHand = false;

      if (res.multiHandLandmarks && res.multiHandedness) {
        if (res.multiHandLandmarks.length > 0 && !hintHidden) {
          hintHidden = true; hint.classList.add('hidden');
        }

        const isSukuna = isSukunaSign(res.multiHandLandmarks);
        const drawingUtils = new DrawingUtils(ctx);

        res.multiHandLandmarks.forEach((pts) => {
          let gesture = null;
          if (isSukuna) { gesture = 'sukuna'; foundSukunaHand = true; }
          else { 
            gesture = getGesture(pts); 
            if (gesture === 'gojo') foundGojoHand = pts; 
          }

          ctx.save();
          if (gesture === 'sukuna') {
            ctx.shadowBlur = 16; ctx.shadowColor = '#ff0000';
            drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#ff3333', lineWidth: 3 });
          } else if (gesture === 'gojo') {
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
            drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#ff4422', lineWidth: 3 });
          } else {
            ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff';
            drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: 'rgba(255,255,255,0.35)', lineWidth: 2 });
          }
          drawingUtils.drawLandmarks(pts, { color: '#ffffff', lineWidth: 1, radius: 2 });
          ctx.restore();
        });
      }

      // Gojo power (Reversal: Red)
      if (foundGojoHand) {
        if (!wasActive.gojo) { triggerFlash('gojo'); }
        pwr.gojo = Math.min(1, pwr.gojo + 0.04);
        wasActive.gojo = true;
        // Position: 3-8cm above the midpoint of index and middle tip
        const t8 = foundGojoHand[8], t12 = foundGojoHand[12], wrist = foundGojoHand[0];

        // Estimate hand size to scale the offset properly (wrist to index tip distance)
        const handSize = Math.hypot(t8.x - wrist.x, t8.y - wrist.y);
        const offsetY = handSize * 0.3 * cEl.height; // Hovers just slightly above fingertips

        gojoPos = {
          x: (1 - (t8.x + t12.x) / 2) * cEl.width,
          y: ((t8.y + t12.y) / 2) * cEl.height - offsetY
        };
        const count = Math.floor(pwr.gojo * 4) + 1; // lightweight burst
        for (let i = 0; i < count; i++) gojoParticles.push(new GojoSparkParticle(gojoPos.x, gojoPos.y, pwr.gojo));
      } else {
        pwr.gojo = Math.max(0, pwr.gojo - 0.04);
        if (pwr.gojo < 0.01) gojoPos = null;
        wasActive.gojo = false;
      }

      // Sukuna power
      if (foundSukunaHand && res.multiHandLandmarks.length >= 2) {
        if (!wasActive.sukuna) { triggerFlash('sukuna'); }
        pwr.sukuna = Math.min(1, pwr.sukuna + 0.04);
        wasActive.sukuna = true;
        const w1 = res.multiHandLandmarks[0][0], w2 = res.multiHandLandmarks[1][0];
        sukunaPos = { x: (1 - (w1.x + w2.x) / 2) * cEl.width, y: ((w1.y + w2.y) / 2) * cEl.height };
        const count = Math.floor(pwr.sukuna * 7) + 2;
        for (let i = 0; i < count; i++) sukunaParticles.push(new SukunaParticle(sukunaPos.x, sukunaPos.y, pwr.sukuna));
      } else {
        pwr.sukuna = Math.max(0, pwr.sukuna - 0.04);
        if (pwr.sukuna < 0.01) sukunaPos = null;
        wasActive.sukuna = false;
      }

      // Draw effects canvas
      const t = performance.now();
      efxCtx.clearRect(0, 0, efx.width, efx.height);

      // SCREEN SHAKE
      if (pwr.gojo > 0.72) {
        const shakeAmt = (pwr.gojo - 0.72) / 0.28 * 4;
        const sx = (Math.random() - 0.5) * shakeAmt;
        const sy = (Math.random() - 0.5) * shakeAmt;
        efxCtx.translate(sx, sy);
      } else if (pwr.sukuna > 0.05 && pwr.sukuna < 0.4) {
        // Pressure pulse camera shake on domain activation
        const shakeAmt = (0.4 - pwr.sukuna) * 20;
        const sx = (Math.random() - 0.5) * shakeAmt;
        const sy = (Math.random() - 0.5) * shakeAmt;
        efxCtx.translate(sx, sy);
      }

      // Draw auras
      if (gojoPos) drawGojoRedAura(efxCtx, gojoPos.x, gojoPos.y, pwr.gojo, t);
      if (sukunaPos) drawSukunaAura(efxCtx, sukunaPos.x, sukunaPos.y, pwr.sukuna, t);

      // Update & draw Gojo particles
      for (let i = gojoParticles.length - 1; i >= 0; i--) {
        gojoParticles[i].update();
        gojoParticles[i].draw(efxCtx);
        if (gojoParticles[i].life <= 0) gojoParticles.splice(i, 1);
      }
      // Limit pool size
      if (gojoParticles.length > 300) gojoParticles.splice(0, gojoParticles.length - 300);

      // Update & draw Sukuna particles
      for (let i = sukunaParticles.length - 1; i >= 0; i--) {
        sukunaParticles[i].update();
        sukunaParticles[i].draw(efxCtx);
        if (sukunaParticles[i].life <= 0) sukunaParticles.splice(i, 1);
      }
      if (sukunaParticles.length > 400) sukunaParticles.splice(0, sukunaParticles.length - 400);

      setPwrGojo(pwr.gojo);
      setPwrSukuna(pwr.sukuna);
      setActiveGojo(wasActive.gojo);
      setActiveSukuna(wasActive.sukuna);
      updateJutsuAudio(pwr.gojo, pwr.sukuna);
      ctx.restore();
    }

    let handLandmarker = null;
    let animationId = null;
    let lastVideoTime = -1;

    async function initVision() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 4,
        minHandDetectionConfidence: 0.75,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 } });
        vEl.srcObject = stream;
        vEl.addEventListener('loadeddata', predictWebcam);
        setLoadingMsg('Cursed Energy Online!');
        setTimeout(() => setIsLoading(false), 200);
      } catch {
        setLoadingMsg('⚠ Camera access denied.');
      }
    }

    function predictWebcam() {
      if (!vEl || vEl.paused || vEl.ended) return;
      if (vEl.currentTime !== lastVideoTime && handLandmarker) {
        lastVideoTime = vEl.currentTime;
        const results = handLandmarker.detectForVideo(vEl, performance.now());
        onResults({
          multiHandLandmarks: results.landmarks,
          multiHandedness: results.handednesses.map(h => ({ label: h[0].categoryName }))
        });
      }
      animationId = requestAnimationFrame(predictWebcam);
    }

    initVision();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (vEl?.srcObject) vEl.srcObject.getTracks().forEach(t => t.stop());
      if (handLandmarker) handLandmarker.close();
      gAudio.pause(); sAudio.pause();
    };
  }, []);

  return (
    <div className="ar-container">
      <div id="loading-screen" className={isLoading ? '' : 'hidden'}>
        <div className="loader-ring jjk-ring">
          <div className="loader-ring-inner jjk-ring-inner">
            <div className="loader-dot jjk-dot"></div>
          </div>
        </div>
        <div className="loader-title jjk-title">JUJUTSU AR</div>
        <div className="loader-sub">Cursed Technique Experience</div>
        <div className="loader-status">{loadingMsg}</div>
      </div>

      <button className="back-btn" onClick={onBack}>← Back</button>

      <video id="v_src" ref={vRef} autoPlay playsInline></video>
      <canvas id="out" ref={cRef}></canvas>
      {/* Particle / Effect canvas on top */}
      <canvas id="efx" ref={efxRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></canvas>
      <div className="darkness jjk-darkness"></div>

      <div id="flash" ref={flashRef}></div>

      <div id="top-badge">
        <div className="badge-title">✦ Special Grade ✦</div>
      </div>

      <div id="hint" ref={hintRef}>
        <span className="hint-hand">🤞</span>
        <div className="hint-text">Show a Hand Sign to trigger Cursed Energy</div>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
          1 Hand Peace Sign = Gojo &nbsp;|&nbsp; 2 Hands Clasped = Sukuna
        </div>
      </div>

      <div id="hud" className="dynamic-hud">
        {activeGojo && (
          <div className="power-card gojo-card">
            <div className="power-header">
              <span className="power-icon">✌️</span>
              <span className="power-name">REVERSAL RED</span>
              <span className="power-pct">{Math.round(pwrGojo * 100)}%</span>
            </div>
            <div className="power-bar-bg">
              <div className="power-bar-fill" style={{ width: `${Math.round(pwrGojo * 100)}%` }}></div>
            </div>
            {pwrGojo > 0.9 && <div className="power-ready">READY TO RELEASE</div>}
          </div>
        )}
        {activeSukuna && (
          <div className="power-card sukuna-card">
            <div className="power-header">
              <span className="power-icon">🙏</span>
              <span className="power-name">MALEVOLENT SHRINE</span>
              <span className="power-pct">{Math.round(pwrSukuna * 100)}%</span>
            </div>
            <div className="power-bar-bg">
              <div className="power-bar-fill" style={{ width: `${Math.round(pwrSukuna * 100)}%` }}></div>
            </div>
            {pwrSukuna > 0.9 && <div className="power-ready">DOMAIN EXPANDED</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default JJK;
