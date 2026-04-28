import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { SFXPlayer, audioCtx } from './utils/AudioPlayer';
import { useHandTracking } from './hooks/useHandTracking';
import CinematicTitle from './components/CinematicTitle';
import './index.css';

const rAudio = new SFXPlayer('/assets/Audios/rasengan.mp3');
const cAudio = new SFXPlayer('/assets/Audios/chidori.mp3');

function playRasengan() { rAudio.play(); }
function playChidori() { cAudio.play(); }

function updateJutsuAudio(pwrL, pwrR) {
  if (pwrL > 0.01) rAudio.setVolume(pwrL * 0.8);
  else rAudio.pause();

  if (pwrR > 0.01) cAudio.setVolume(pwrR * 0.8);
  else cAudio.pause();
}

function Naruto({ onBack }) {
  const vRef = useRef(null);
  const cRef = useRef(null);
  const nVidRef = useRef(null);
  const sVidRef = useRef(null);
  const flashRef = useRef(null);
  const hintRef = useRef(null);

  // HUD state
  const [pwrL, setPwrL] = useState(0);
  const [pwrR, setPwrR] = useState(0);
  const [openL, setOpenL] = useState(false);
  const [openR, setOpenR] = useState(false);
  const [activeTitle, setActiveTitle] = useState(null);
  const lastState = useRef({ n: false, s: false });

  // We use Refs for power and state inside the onResults callback so we don't have to recreate it
  const stateRef = useRef({
    pwr: [0, 0],
    wasOpen: [false, false],
    hintHidden: false,
    lastResize: 0
  });

  const onResults = useCallback((res) => {
    const vEl = vRef.current;
    const cEl = cRef.current;
    if (!vEl || !cEl) return;
    
    const ctx = cEl.getContext('2d');
    const nVid = nVidRef.current;
    const sVid = sVidRef.current;
    const flash = flashRef.current;
    const hint = hintRef.current;
    const st = stateRef.current;

    const now = Date.now();
    if (now - st.lastResize > 250) {
      cEl.width = vEl.videoWidth || window.innerWidth;
      cEl.height = vEl.videoHeight || window.innerHeight;
      st.lastResize = now;
    }

    ctx.save();
    ctx.clearRect(0, 0, cEl.width, cEl.height);

    let fL = false, fR = false;
    if (nVid) nVid.style.display = 'none';
    if (sVid) sVid.style.display = 'none';

    function getScreenCoords(nx, ny) {
      if (!vEl || !vEl.videoWidth) return { x: (1 - nx) * window.innerWidth, y: ny * window.innerHeight };
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
      const pips = [6, 10, 14, 18];
      for (let i = 0; i < 4; i++) {
        const tipD = Math.hypot(pts[tips[i]].x - wrist.x, pts[tips[i]].y - wrist.y);
        const pipD = Math.hypot(pts[pips[i]].x - wrist.x, pts[pips[i]].y - wrist.y);
        if (tipD > pipD) count++;
      }
      const tTip = Math.hypot(pts[4].x - wrist.x, pts[4].y - wrist.y);
      const tIP = Math.hypot(pts[3].x - wrist.x, pts[3].y - wrist.y);
      if (tTip > tIP) count += 0.5;
      return count >= 3;
    }

    function triggerFlash(type) {
      if (!flash) return;
      flash.className = '';
      void flash.offsetWidth;
      flash.className = type === 'n' ? 'flash-naruto' : 'flash-sasuke';
      if (type === 'n') playRasengan();
      else playChidori();
    }

    if (res.multiHandLandmarks && res.multiHandedness) {
      if (res.multiHandLandmarks.length > 0 && !st.hintHidden) {
        st.hintHidden = true;
        if (hint) hint.classList.add('hidden');
      }

      const drawingUtils = new DrawingUtils(ctx);

      res.multiHandLandmarks.forEach((pts, i) => {
        const isR = res.multiHandedness[i].label === 'Right';
        const idx = isR ? 1 : 0;

        ctx.save();
        if (isR) {
          ctx.shadowBlur = 14; ctx.shadowColor = '#a855f7';
          drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#c084fc', lineWidth: 3 });
        } else {
          ctx.shadowBlur = 14; ctx.shadowColor = '#ff8c00';
          drawingUtils.drawConnectors(pts, HandLandmarker.HAND_CONNECTIONS, { color: '#ffb347', lineWidth: 3 });
        }
        drawingUtils.drawLandmarks(pts, { color: '#ffffff', lineWidth: 1, radius: 2 });
        ctx.restore();

        const open = checkOpen(pts);
        if (open && !st.wasOpen[idx]) {
          triggerFlash(isR ? 's' : 'n');
          const vid = isR ? sVid : nVid;
          if (vid) { vid.currentTime = 0; vid.play().catch(e=>{}); }
        }

        st.pwr[idx] += open ? 0.05 : -0.15;
        st.pwr[idx] = Math.max(0, Math.min(1, st.pwr[idx]));
        st.wasOpen[idx] = open;

        const wrist = pts[0], knk = pts[9];

        if (st.pwr[idx] > 0.01) {
          if (isR && sVid) {
            fR = true;
            const tx = (wrist.x + knk.x) / 2, ty = (wrist.y + knk.y) / 2;
            const coords = getScreenCoords(tx, ty);
            sVid.style.left = `${coords.x}px`;
            sVid.style.top = `${coords.y}px`;
            sVid.style.display = 'block';
            sVid.style.opacity = st.pwr[idx];
          } else if (nVid) {
            fL = true;
            const dx = knk.x - wrist.x, dy = knk.y - wrist.y;
            const tx = knk.x + dx * 0.8, ty = knk.y + dy * 0.8;
            const offset = window.innerWidth < 768 ? 20 : 120;
            const coords = getScreenCoords(tx, ty);
            nVid.style.left = `${coords.x}px`;
            nVid.style.top = `${coords.y - offset}px`;
            nVid.style.display = 'block';
            nVid.style.opacity = st.pwr[idx];
          }
        }
      });
    }

    if (!fL && nVid) {
      st.pwr[0] = Math.max(0, st.pwr[0] - 0.15);
      if (st.pwr[0] > 0.01) { nVid.style.display = 'block'; nVid.style.opacity = st.pwr[0]; }
      st.wasOpen[0] = false;
    }
    if (!fR && sVid) {
      st.pwr[1] = Math.max(0, st.pwr[1] - 0.15);
      if (st.pwr[1] > 0.01) { sVid.style.display = 'block'; sVid.style.opacity = st.pwr[1]; }
      st.wasOpen[1] = false;
    }

    setPwrL(st.pwr[0]);
    setPwrR(st.pwr[1]);
    setOpenL(st.pwr[0] > 0.01);
    setOpenR(st.pwr[1] > 0.01);
    
    const nOn = st.pwr[0] > 0.9;
    const sOn = st.pwr[1] > 0.9;
    
    if (nOn && !lastState.current.n) setActiveTitle({ id: Date.now(), type: 'rasengan' });
    if (sOn && !lastState.current.s) setActiveTitle({ id: Date.now() + 1, type: 'chidori' });
    
    lastState.current = { n: nOn, s: sOn };

    updateJutsuAudio(st.pwr[0], st.pwr[1]);
    
    ctx.restore();
  }, []);

  const { isLoading, loadingMsg } = useHandTracking(vRef, onResults);

  useEffect(() => {
    return () => {
      rAudio.pause();
      cAudio.pause();
    };
  }, []);

  return (
    <div className="ar-container">
      <div id="loading-screen" className={isLoading ? '' : 'hidden'}>
        <div className="loader-ring">
          <div className="loader-ring-inner">
            <div className="loader-dot"></div>
          </div>
        </div>
        <div className="loader-title">NARUTO AR</div>
        <div className="loader-sub">Hand Tracking Jutsu Experience</div>
        <div className="loader-status">{loadingMsg}</div>
      </div>

      <button className="back-btn" onClick={onBack}>← Back</button>

      <video id="v_src" ref={vRef} autoPlay playsInline></video>
      <canvas id="out" ref={cRef}></canvas>
      <div className="darkness"></div>

      <div id="flash" ref={flashRef}></div>

      <video id="n" ref={nVidRef} className="fx" src="/assets/naruto.mp4" muted autoPlay loop playsInline></video>
      <video id="s" ref={sVidRef} className="fx" src="/assets/sasuke.mp4" muted autoPlay loop playsInline></video>

      <div id="top-badge">
        <div className="badge-title">✦ Jutsu Mode Active ✦</div>
      </div>

      <div id="hint" ref={hintRef}>
        <span className="hint-hand">🖐️</span>
        <div className="hint-text">Open your hands to unleash jutsu</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: '1.4' }}>
          Left Hand Open = <b>Rasengan</b> &nbsp;|&nbsp; Right Hand Open = <b>Chidori</b>
        </div>
      </div>

      {/* CINEMATIC TITLE POPUP */}
      {activeTitle && activeTitle.type === 'rasengan' && (
        <CinematicTitle
          key={activeTitle.id}
          kanji="螺旋丸"
          subtitle="RASENGAN"
          color="#88ccff"
          onDone={() => setActiveTitle(null)}
          isActive={openL}
        />
      )}
      {activeTitle && activeTitle.type === 'chidori' && (
        <CinematicTitle
          key={activeTitle.id}
          kanji="千鳥"
          subtitle="CHIDORI"
          color="#cc88ff"
          onDone={() => setActiveTitle(null)}
          isActive={openR}
        />
      )}
    </div>
  );
}

export default Naruto;
