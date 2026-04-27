import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { SFXPlayer, audioCtx } from './utils/AudioPlayer';
import { useHandTracking } from './hooks/useHandTracking';
import './index.css';
import './hud.css';

const gAudio = new SFXPlayer('/assets/Audios/gojo-reversal-red.mp3');
const pAudio = new SFXPlayer('/assets/Audios/gojo_domain_expansion.mp3'); 
const sAudio = new SFXPlayer('/assets/Audios/malevolent_shrine.mp3');

function playGojo() { gAudio.play(); }
function playPurple() { pAudio.play(); }
function playSukuna() { sAudio.play(); }

function updateJutsuAudio(pg, pp, ps) {
  const targetG = pg > 0.01 ? pg * 1.0 : 0;
  const targetP = pp > 0.01 ? pp * 1.0 : 0;
  const targetS = ps > 0.01 ? ps * 0.8 : 0;

  let nextGVol = gAudio.logicalVolume;
  if (nextGVol < targetG) nextGVol = Math.min(1.0, targetG);
  else nextGVol = Math.max(0, nextGVol - 0.01);

  let nextPVol = pAudio.logicalVolume;
  if (nextPVol < targetP) nextPVol = Math.min(1.0, targetP);
  else nextPVol = Math.max(0, nextPVol - 0.01);

  let nextSVol = sAudio.logicalVolume;
  if (nextSVol < targetS) nextSVol = Math.min(1.0, targetS);
  else nextSVol = Math.max(0, nextSVol - 0.02);

  if (nextGVol > 0) gAudio.setVolume(nextGVol);
  if (nextPVol > 0) pAudio.setVolume(nextPVol);
  if (nextSVol > 0) sAudio.setVolume(nextSVol);

  if (nextGVol <= 0.01 && gAudio.isPlaying) gAudio.pause();
  if (nextPVol <= 0.01 && pAudio.isPlaying) pAudio.pause();
  if (nextSVol <= 0.01 && sAudio.isPlaying) sAudio.pause();
}

/* ── PARTICLE CLASSES ── */
class GojoSparkParticle {
  constructor(cx, cy, power, isBlue = false) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 * power + 1;
    this.x = cx; this.y = cy;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = Math.random() * 0.05 + 0.02;
    this.size = Math.random() * 2 * power + 0.5;
    this.trail = [];
    this.isBlue = isBlue;
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
    if (this.isBlue) {
       ctx.strokeStyle = `rgba(50, 150, 255, ${this.life})`;
    } else {
       ctx.strokeStyle = `rgba(255, 80, 0, ${this.life})`;
    }
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
function drawGojoAura(ctx, cx, cy, power, t, isBlue) {
  if (power < 0.02) return;
  ctx.save();

  const pulse = 1 + Math.sin(t * 0.01) * 0.05;
  let coreR = 15 + power * 25 * pulse;

  const bloomR = coreR * 6;
  const bloom = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, bloomR);
  if (isBlue) {
    bloom.addColorStop(0, `rgba(0, 100, 255, ${power * 0.6})`);
    bloom.addColorStop(0.3, `rgba(0, 50, 180, ${power * 0.25})`);
    bloom.addColorStop(0.7, `rgba(0, 0, 60, ${power * 0.1})`);
  } else {
    bloom.addColorStop(0, `rgba(255, 20,  0, ${power * 0.6})`);
    bloom.addColorStop(0.3, `rgba(180, 0,   0, ${power * 0.25})`);
    bloom.addColorStop(0.7, `rgba(60,  0,   0, ${power * 0.1})`);
  }
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(cx, cy, bloomR, 0, Math.PI * 2); ctx.fill();

  const numRings = 3;
  const timeMult = isBlue ? -1 : 1; 
  const ringAngles = [timeMult * t * 0.002, timeMult * -t * 0.003, timeMult * t * 0.0015];
  const ringTilts = [0.25, 0.35, 0.15];
  const ringScale = [1.8, 2.4, 3.2];

  for (let i = 0; i < numRings; i++) {
    ctx.save();
    ctx.translate(cx, cy);

    const ellipseRot = i * (Math.PI / 1.5) + Math.sin(t * 0.001 + i) * 0.2;
    const radiusX = coreR * ringScale[i];
    const radiusY = radiusX * ringTilts[i];
    const spin = ringAngles[i] * 3;

    const numTrails = 8;
    for (let j = 0; j < numTrails; j++) {
      ctx.beginPath();
      const arcOffset = j * 0.15;
      const start = spin - Math.PI * 0.6 + arcOffset;
      const end = spin + arcOffset;
      ctx.ellipse(0, 0, radiusX, radiusY, ellipseRot, start, end);

      ctx.lineWidth = (6 - j * 0.6) * power;
      const alpha = power * (1 - j / numTrails);
      
      if (isBlue) {
        ctx.strokeStyle = `rgba(${40 + j * 15}, 150, 255, ${alpha})`;
        if (j === 0) { ctx.shadowColor = '#0088ff'; ctx.shadowBlur = 15 * power; }
      } else {
        ctx.strokeStyle = `rgba(255, ${40 + j * 15}, 0, ${alpha})`;
        if (j === 0) { ctx.shadowColor = '#ff2000'; ctx.shadowBlur = 15 * power; }
      }
      
      ctx.lineCap = 'round';
      if (j !== 0) ctx.shadowBlur = 0;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, ellipseRot, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isBlue ? `rgba(0, 100, 255, ${power * 0.15})` : `rgba(255, 30, 0, ${power * 0.15})`;
    ctx.stroke();
    ctx.restore();
  }

  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const plasmaG = ctx.createRadialGradient(cx, cy, coreR * 0.2, cx, cy, coreR);
  if (isBlue) {
    plasmaG.addColorStop(0, `rgba(255, 255, 255, ${power})`);
    plasmaG.addColorStop(0.3, `rgba(150, 220, 255,  ${power})`);
    plasmaG.addColorStop(0.55, `rgba(0, 100, 255,   ${power})`);
    plasmaG.addColorStop(0.85, `rgba(0, 0, 160,   ${power * 0.9})`);
  } else {
    plasmaG.addColorStop(0, `rgba(255, 255, 255, ${power})`);
    plasmaG.addColorStop(0.3, `rgba(255, 180, 50,  ${power})`);
    plasmaG.addColorStop(0.55, `rgba(255, 20,  0,   ${power})`);
    plasmaG.addColorStop(0.85, `rgba(160, 0,   0,   ${power * 0.9})`);
  }
  plasmaG.addColorStop(1, `rgba(0,   0,   0,   0)`);
  ctx.fillStyle = plasmaG;
  ctx.shadowColor = isBlue ? '#0044ff' : '#ff0000'; 
  ctx.shadowBlur = 40 * power;
  ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();

  if (power > 0.8) {
    const sw = (power - 0.8) * 5;
    ctx.strokeStyle = isBlue ? `rgba(0, 150, 255, ${1 - sw})` : `rgba(255, 60, 0, ${1 - sw})`;
    ctx.lineWidth = 6 * (1 - sw);
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx, cy, coreR * (1 + sw * 2.5), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawHollowPurpleCinematic(ctx, w, h, positions, power, t) {
  if (power < 0.01) return;
  
  ctx.save();
  
  const centerX = w * 0.5;
  const centerY = h * 0.4;
  
  let leftX = w * 0.25; 
  let leftY = centerY; 
  let rightX = w * 0.75; 
  let rightY = centerY;

  if (positions) {
     if (positions.red) { leftX = positions.red.x; leftY = positions.red.y; }
     if (positions.blue) { rightX = positions.blue.x; rightY = positions.blue.y; }
  }

  const draw3DOrb = (x, y, r, type, powerScale) => {
    ctx.save();
    
    let colorCore, colorMid, colorEdge;
    if (type === 'blue') {
      colorCore = `rgba(150, 200, 255, ${powerScale})`;
      colorMid = `rgba(0, 100, 255, ${powerScale * 0.7})`;
      colorEdge = '#00aaff';
    } else if (type === 'red') {
      colorCore = `rgba(255, 150, 150, ${powerScale})`;
      colorMid = `rgba(255, 20, 0, ${powerScale * 0.7})`;
      colorEdge = '#ff2200';
    } else if (type === 'purple') {
      colorCore = `rgba(10, 0, 20, ${powerScale})`;
      colorMid = `rgba(150, 0, 255, ${powerScale * 0.9})`;
      colorEdge = '#aa00ff';
    }

    const bloomR = r * 5;
    const bloom = ctx.createRadialGradient(x, y, r * 0.1, x, y, bloomR);
    bloom.addColorStop(0, colorCore);
    bloom.addColorStop(0.3, colorMid);
    if (type === 'purple') bloom.addColorStop(0.6, `rgba(50, 0, 100, ${powerScale * 0.4})`);
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.globalAlpha = 1;
    ctx.fillStyle = bloom;
    ctx.beginPath(); ctx.arc(x, y, bloomR, 0, Math.PI * 2); ctx.fill();

    const numRings = 3;
    const timeScale = type === 'blue' ? -t * 0.003 : t * 0.002; 
    const ringAngles = [timeScale, timeScale * 1.5, -timeScale * 0.8];
    const ringTilts = [0.2, 0.35, 0.15];
    const ringScale = [1.5, 2.2, 3.0];
    
    for (let i = 0; i < numRings; i++) {
      ctx.save();
      ctx.translate(x, y);
      
      const ellipseRot = i * (Math.PI / 1.5) + (type === 'purple' ? Math.sin(t*0.001)*0.5 : 0);
      const radiusX = r * ringScale[i] * (type === 'purple' ? 1.5 : 1);
      const radiusY = radiusX * ringTilts[i];
      const spin = ringAngles[i] * 3;
      
      const numTrails = type === 'purple' ? 12 : 8;
      for (let j = 0; j < numTrails; j++) {
        ctx.beginPath();
        const arcOffset = j * 0.15;
        const start = spin - Math.PI * 0.6 + arcOffset;
        const end = spin + arcOffset;
        ctx.ellipse(0, 0, radiusX, radiusY, ellipseRot, start, end);
        
        ctx.lineWidth = (type === 'purple' ? 10 : 5) * powerScale * (1 - j / numTrails);
        const alpha = powerScale * (1 - j / numTrails);
        
        if (type === 'blue') ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
        else if (type === 'red') ctx.strokeStyle = `rgba(255, 100, 50, ${alpha})`;
        else if (type === 'purple') ctx.strokeStyle = `rgba(200, 100, 255, ${alpha})`;
        
        ctx.lineCap = 'round';
        if (j === 0) { ctx.shadowColor = colorEdge; ctx.shadowBlur = 15; }
        else { ctx.shadowBlur = 0; }
        
        ctx.stroke();
      }
      
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, ellipseRot, 0, Math.PI * 2);
      ctx.lineWidth = type === 'purple' ? 2 : 1.5;
      if (type === 'blue') ctx.strokeStyle = `rgba(50, 150, 255, ${powerScale * 0.2})`;
      else if (type === 'red') ctx.strokeStyle = `rgba(255, 50, 0, ${powerScale * 0.2})`;
      else if (type === 'purple') ctx.strokeStyle = `rgba(150, 0, 255, ${powerScale * 0.4})`;
      ctx.stroke();
      
      ctx.restore();
    }
    
    ctx.fillStyle = type === 'purple' ? '#050010' : '#ffffff';
    ctx.shadowBlur = 30;
    ctx.shadowColor = colorEdge;
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  const pulse = 1 + Math.sin(t * 0.015) * 0.1;

  if (power < 0.4) {
    const p = power / 0.4;
    const size = 30 + p * 20;
    
    draw3DOrb(leftX, leftY, size * pulse, 'red', p);
    draw3DOrb(rightX, rightY, size * pulse, 'blue', p);

  } else if (power < 0.7) {
    const p = (power - 0.4) / 0.3;
    const ease = p * p * p; 
    const shake = p * 15;
    
    const curLeftX = leftX + (centerX - leftX) * ease + (Math.random()-0.5)*shake;
    const curLeftY = leftY + (centerY - leftY) * ease + (Math.random()-0.5)*shake;
    
    const curRightX = rightX + (centerX - rightX) * ease + (Math.random()-0.5)*shake;
    const curRightY = rightY + (centerY - rightY) * ease + (Math.random()-0.5)*shake;
    
    const size = 50 + p * 15;
    
    draw3DOrb(curLeftX, curLeftY, size * pulse, 'red', 1);
    draw3DOrb(curRightX, curRightY, size * pulse, 'blue', 1);

    if (Math.random() > 0.2) {
      ctx.strokeStyle = `rgba(180, 50, 255, ${p})`;
      ctx.lineWidth = 4 + p * 6;
      ctx.beginPath();
      ctx.moveTo(curLeftX, curLeftY);
      ctx.lineTo((curLeftX+curRightX)/2 + (Math.random()-0.5)*100, (curLeftY+curRightY)/2 + (Math.random()-0.5)*100);
      ctx.lineTo(curRightX, curRightY);
      ctx.stroke();
    }

  } else if (power < 0.95) {
    const p = (power - 0.7) / 0.25;
    const size = 70 + p * 40;
    
    ctx.translate((Math.random()-0.5)*15, (Math.random()-0.5)*15);
    
    draw3DOrb(centerX, centerY, size, 'purple', 1);

  } else {
    ctx.translate((Math.random()-0.5)*20, (Math.random()-0.5)*20);
    
    const pulseHeld = 1 + Math.sin(t * 0.05) * 0.1;
    draw3DOrb(centerX, centerY, 110 * pulseHeld, 'purple', 1);

    const bloom = ctx.createRadialGradient(centerX, centerY, 100, centerX, centerY, w * 0.8);
    bloom.addColorStop(0, `rgba(200, 100, 255, 0.3)`);
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.beginPath(); ctx.arc(centerX, centerY, w * 0.8, 0, Math.PI * 2); ctx.fill();
    
    const ringT = (t * 0.003) % 1; 
    ctx.strokeStyle = `rgba(255, 150, 255, ${(1 - ringT) * 0.6})`;
    ctx.lineWidth = 30 * (1 - ringT);
    ctx.beginPath(); ctx.arc(centerX, centerY, ringT * w * 0.6, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();
}

function drawSukunaAura(ctx, cx, cy, power, t) {
  if (power < 0.05) return;
  ctx.save();
  
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  
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
  
  ctx.fillRect(-gateW*0.3, -gateH*0.4, gateW*0.08, gateH); 
  ctx.fillRect(gateW*0.22, -gateH*0.4, gateW*0.08, gateH); 
  ctx.fillRect(-gateW*0.4, -gateH*0.2, gateW*0.8, gateH*0.08); 
  ctx.fillRect(-gateW*0.45, -gateH*0.4, gateW*0.9, gateH*0.1); 
  
  ctx.beginPath();
  ctx.moveTo(-gateW*0.5, -gateH*0.4);
  ctx.quadraticCurveTo(0, -gateH*0.6, gateW*0.5, -gateH*0.4);
  ctx.lineTo(gateW*0.5, -gateH*0.5);
  ctx.quadraticCurveTo(0, -gateH*0.75, -gateW*0.5, -gateH*0.5);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(w/2, h); 
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

  ctx.globalAlpha = 1;
  const r = 110 * power + Math.sin(t * 0.01) * 8;
  const cg = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.5);
  cg.addColorStop(0, `rgba(255, 20, 0, ${power})`);
  cg.addColorStop(0.3, `rgba(80, 0, 0, ${power * 0.8})`);
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; 
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2); ctx.fill();

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
  const efxRef = useRef(null);
  const flashRef = useRef(null);
  const hintRef = useRef(null);

  const [pwrRed, setPwrRed] = useState(0);
  const [pwrBlue, setPwrBlue] = useState(0);
  const [pwrPurple, setPwrPurple] = useState(0);
  const [pwrSukuna, setPwrSukuna] = useState(0);
  const [activeRed, setActiveRed] = useState(false);
  const [activeBlue, setActiveBlue] = useState(false);
  const [activePurple, setActivePurple] = useState(false);
  const [activeSukuna, setActiveSukuna] = useState(false);

  const stateRef = useRef({
    pwr: { red: 0, blue: 0, purple: 0, sukuna: 0 },
    wasActive: { red: false, blue: false, purple: false, sukuna: false },
    hintHidden: false,
    lastResize: 0,
    redParticles: [],
    blueParticles: [],
    sukunaParticles: [],
    lastPurplePos: null
  });

  const onResults = useCallback((res) => {
    const vEl = vRef.current;
    const cEl = cRef.current;
    const efx = efxRef.current;
    if (!vEl || !cEl || !efx) return;

    const ctx = cEl.getContext('2d');
    const efxCtx = efx.getContext('2d');
    const flash = flashRef.current;
    const hint = hintRef.current;
    const st = stateRef.current;

    const now = Date.now();
    if (now - st.lastResize > 250) {
      cEl.width = vEl.videoWidth || window.innerWidth;
      cEl.height = vEl.videoHeight || window.innerHeight;
      efx.width = cEl.width;
      efx.height = cEl.height;
      st.lastResize = now;
    }

    ctx.save(); ctx.clearRect(0, 0, cEl.width, cEl.height);

    let foundRedHand = null;
    let foundBlueHand = null;
    let foundSukunaHand = false;

    if (res.multiHandLandmarks && res.multiHandedness) {
      if (res.multiHandLandmarks.length > 0 && !st.hintHidden) {
        st.hintHidden = true; if (hint) hint.classList.add('hidden');
      }

      const isSukuna = isSukunaSign(res.multiHandLandmarks);
      const drawingUtils = new DrawingUtils(ctx);

      res.multiHandLandmarks.forEach((pts) => {
        let gesture = null;
        if (isSukuna) { gesture = 'sukuna'; foundSukunaHand = true; }
        else { 
          gesture = getGesture(pts); 
          if (gesture === 'gojo') {
             const cx = (1 - pts[9].x) * cEl.width;
             if (cx < cEl.width / 2) {
               foundRedHand = pts;
               gesture = 'red';
             } else {
               foundBlueHand = pts;
               gesture = 'blue';
             }
          } 
        }

        ctx.save();
        if (gesture === 'sukuna') {
          ctx.shadowBlur = 16; ctx.shadowColor = '#ff0000';
          drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#ff3333', lineWidth: 3 });
        } else if (gesture === 'red') {
          ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
          drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#ff4422', lineWidth: 3 });
        } else if (gesture === 'blue') {
          ctx.shadowBlur = 20; ctx.shadowColor = '#0088ff';
          drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#22aaff', lineWidth: 3 });
        } else {
          ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff';
          drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: 'rgba(255,255,255,0.35)', lineWidth: 2 });
        }
        
        drawingUtils.drawLandmarks(pts, { color: '#ffffff', lineWidth: 1, radius: 2 });
        ctx.restore();
      });
    }

    const foundPurpleHands = (foundRedHand && foundBlueHand);

    function triggerFlash(type) {
      if (!flash) return;
      flash.className = '';
      void flash.offsetWidth;
      flash.className = type === 'red' || type === 'blue' ? 'flash-gojo' : (type === 'purple' ? 'flash-purple' : 'flash-sukuna');
      if (type === 'red' || type === 'blue') playGojo(); 
      else if (type === 'purple') playPurple();
      else playSukuna();
    }

    let redPos = null;
    let bluePos = null;
    let sukunaPos = null;

    if (foundRedHand) {
       const t8 = foundRedHand[8], t12 = foundRedHand[12], wrist = foundRedHand[0];
       const handSize = Math.hypot(t8.x - wrist.x, t8.y - wrist.y);
       redPos = { x: (1 - (t8.x + t12.x) / 2) * cEl.width, y: ((t8.y + t12.y) / 2) * cEl.height - handSize * 0.3 * cEl.height };
    }
    if (foundBlueHand) {
       const t8 = foundBlueHand[8], t12 = foundBlueHand[12], wrist = foundBlueHand[0];
       const handSize = Math.hypot(t8.x - wrist.x, t8.y - wrist.y);
       bluePos = { x: (1 - (t8.x + t12.x) / 2) * cEl.width, y: ((t8.y + t12.y) / 2) * cEl.height - handSize * 0.3 * cEl.height };
    }

    if (foundPurpleHands && !foundSukunaHand) {
      if (!st.wasActive.purple) { triggerFlash('purple'); }
      st.pwr.purple = Math.min(1, st.pwr.purple + 0.01);
      st.wasActive.purple = true;
      st.lastPurplePos = { red: redPos, blue: bluePos };
      
      st.pwr.red = Math.max(0, st.pwr.red - 0.1);
      st.pwr.blue = Math.max(0, st.pwr.blue - 0.1);
      st.pwr.sukuna = Math.max(0, st.pwr.sukuna - 0.1);
    } else {
      st.pwr.purple = Math.max(0, st.pwr.purple - 0.03);
      if (st.pwr.purple < 0.01) st.lastPurplePos = null;
      st.wasActive.purple = false;

      if (foundRedHand && !foundSukunaHand) {
        if (!st.wasActive.red) { triggerFlash('red'); }
        st.pwr.red = Math.min(1, st.pwr.red + 0.04);
        st.wasActive.red = true;
        
        const count = Math.floor(st.pwr.red * 4) + 1;
        for (let i = 0; i < count; i++) st.redParticles.push(new GojoSparkParticle(redPos.x, redPos.y, st.pwr.red, false));
      } else {
        st.pwr.red = Math.max(0, st.pwr.red - 0.04);
        st.wasActive.red = false;
      }

      if (foundBlueHand && !foundSukunaHand) {
        if (!st.wasActive.blue) { triggerFlash('blue'); }
        st.pwr.blue = Math.min(1, st.pwr.blue + 0.04);
        st.wasActive.blue = true;
        
        const count = Math.floor(st.pwr.blue * 4) + 1;
        for (let i = 0; i < count; i++) st.blueParticles.push(new GojoSparkParticle(bluePos.x, bluePos.y, st.pwr.blue, true));
      } else {
        st.pwr.blue = Math.max(0, st.pwr.blue - 0.04);
        st.wasActive.blue = false;
      }

      if (foundSukunaHand && res.multiHandLandmarks.length >= 2) {
        if (!st.wasActive.sukuna) { triggerFlash('sukuna'); }
        st.pwr.sukuna = Math.min(1, st.pwr.sukuna + 0.04);
        st.wasActive.sukuna = true;
        const w1 = res.multiHandLandmarks[0][0], w2 = res.multiHandLandmarks[1][0];
        sukunaPos = { x: (1 - (w1.x + w2.x) / 2) * cEl.width, y: ((w1.y + w2.y) / 2) * cEl.height };
        const count = Math.floor(st.pwr.sukuna * 7) + 2;
        for (let i = 0; i < count; i++) st.sukunaParticles.push(new SukunaParticle(sukunaPos.x, sukunaPos.y, st.pwr.sukuna));
      } else {
        st.pwr.sukuna = Math.max(0, st.pwr.sukuna - 0.04);
        if (st.pwr.sukuna < 0.01) sukunaPos = null;
        st.wasActive.sukuna = false;
      }
    }

    const t = performance.now();
    efxCtx.clearRect(0, 0, efx.width, efx.height);

    if (st.pwr.red > 0.72 && st.pwr.purple === 0) {
      const shakeAmt = (st.pwr.red - 0.72) / 0.28 * 4;
      efxCtx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
    } else if (st.pwr.blue > 0.72 && st.pwr.purple === 0) {
      const shakeAmt = (st.pwr.blue - 0.72) / 0.28 * 4;
      efxCtx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
    } else if (st.pwr.sukuna > 0.05 && st.pwr.sukuna < 0.4 && st.pwr.purple === 0) {
      const shakeAmt = (0.4 - st.pwr.sukuna) * 20;
      efxCtx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
    }

    if (redPos && st.pwr.purple === 0) drawGojoAura(efxCtx, redPos.x, redPos.y, st.pwr.red, t, false);
    if (bluePos && st.pwr.purple === 0) drawGojoAura(efxCtx, bluePos.x, bluePos.y, st.pwr.blue, t, true);
    if (sukunaPos && st.pwr.purple === 0) drawSukunaAura(efxCtx, sukunaPos.x, sukunaPos.y, st.pwr.sukuna, t);
    
    if (st.pwr.purple > 0) {
      drawHollowPurpleCinematic(efxCtx, efx.width, efx.height, st.lastPurplePos, st.pwr.purple, t);
    }

    for (let i = st.redParticles.length - 1; i >= 0; i--) {
      st.redParticles[i].update();
      st.redParticles[i].draw(efxCtx);
      if (st.redParticles[i].life <= 0) st.redParticles.splice(i, 1);
    }
    if (st.redParticles.length > 200) st.redParticles.splice(0, st.redParticles.length - 200);

    for (let i = st.blueParticles.length - 1; i >= 0; i--) {
      st.blueParticles[i].update();
      st.blueParticles[i].draw(efxCtx);
      if (st.blueParticles[i].life <= 0) st.blueParticles.splice(i, 1);
    }
    if (st.blueParticles.length > 200) st.blueParticles.splice(0, st.blueParticles.length - 200);

    for (let i = st.sukunaParticles.length - 1; i >= 0; i--) {
      st.sukunaParticles[i].update();
      st.sukunaParticles[i].draw(efxCtx);
      if (st.sukunaParticles[i].life <= 0) st.sukunaParticles.splice(i, 1);
    }
    if (st.sukunaParticles.length > 400) st.sukunaParticles.splice(0, st.sukunaParticles.length - 400);

    setPwrRed(st.pwr.red);
    setPwrBlue(st.pwr.blue);
    setPwrPurple(st.pwr.purple);
    setPwrSukuna(st.pwr.sukuna);
    setActiveRed(st.wasActive.red);
    setActiveBlue(st.wasActive.blue);
    setActivePurple(st.wasActive.purple);
    setActiveSukuna(st.wasActive.sukuna);
    
    updateJutsuAudio(Math.max(st.pwr.red, st.pwr.blue), st.pwr.purple, st.pwr.sukuna);
    ctx.restore();
  }, []);

  const { isLoading, loadingMsg } = useHandTracking(vRef, onResults);

  useEffect(() => {
    return () => {
      gAudio.pause(); pAudio.pause(); sAudio.pause();
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
      <canvas id="efx" ref={efxRef} style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', objectFit: 'cover', pointerEvents: 'none' }}></canvas>
      <div className="darkness jjk-darkness"></div>

      <div id="flash" ref={flashRef}></div>

      <div id="top-badge">
        <div className="badge-title">✦ Special Grade ✦</div>
      </div>

      <div id="hint" ref={hintRef}>
        <span className="hint-hand">🤞</span>
        <div className="hint-text">Show a Hand Sign to trigger Cursed Energy</div>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
          Right Hand Peace = Reversal Red &nbsp;|&nbsp; Left Hand Peace = Lapse Blue &nbsp;|&nbsp; Both = Hollow Purple
        </div>
      </div>

      <div id="hud" className="dynamic-hud" style={{ display: activePurple ? 'none' : 'flex' }}>
        {activeRed && !activePurple && (
          <div className="power-card gojo-card">
            <div className="power-header">
              <span className="power-icon">✌️</span>
              <span className="power-name">REVERSAL RED</span>
              <span className="power-pct">{Math.round(pwrRed * 100)}%</span>
            </div>
            <div className="power-bar-bg">
              <div className="power-bar-fill" style={{ width: `${Math.round(pwrRed * 100)}%` }}></div>
            </div>
            {pwrRed > 0.9 && <div className="power-ready">READY TO RELEASE</div>}
          </div>
        )}
        {activeBlue && !activePurple && (
          <div className="power-card gojo-card" style={{ borderColor: '#0088ff' }}>
            <div className="power-header">
              <span className="power-icon">✌️</span>
              <span className="power-name" style={{ color: '#0088ff' }}>LAPSE BLUE</span>
              <span className="power-pct">{Math.round(pwrBlue * 100)}%</span>
            </div>
            <div className="power-bar-bg">
              <div className="power-bar-fill" style={{ width: `${Math.round(pwrBlue * 100)}%`, background: '#0088ff', boxShadow: '0 0 10px #0088ff' }}></div>
            </div>
            {pwrBlue > 0.9 && <div className="power-ready" style={{ color: '#0088ff', textShadow: '0 0 8px #0088ff' }}>READY TO RELEASE</div>}
          </div>
        )}
        {activeSukuna && !activePurple && (
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
