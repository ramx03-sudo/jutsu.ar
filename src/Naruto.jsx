import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import './index.css';


/* ── AUDIO FILES ── */
const rAudio = new Audio('/assets/Audios/rasengan.mp3');
rAudio.loop = true;
const cAudio = new Audio('/assets/Audios/chidori.mp3');
cAudio.loop = true;

function playRasengan() {
  rAudio.currentTime = 0;
  rAudio.volume = 0.8;
  rAudio.play().catch(e => console.warn("Audio play prevented:", e));
}

function playChidori() {
  cAudio.currentTime = 0;
  cAudio.volume = 0.8;
  cAudio.play().catch(e => console.warn("Audio play prevented:", e));
}

function updateJutsuAudio(pwrL, pwrR) {
  if (pwrL > 0.01) {
    rAudio.volume = pwrL * 0.8;
  } else if (!rAudio.paused) {
    rAudio.pause();
  }

  if (pwrR > 0.01) {
    cAudio.volume = pwrR * 0.8;
  } else if (!cAudio.paused) {
    cAudio.pause();
  }
}

function Naruto({ onBack }) {
  const vRef = useRef(null);
  const cRef = useRef(null);
  const nVidRef = useRef(null);
  const sVidRef = useRef(null);
  const flashRef = useRef(null);
  const hintRef = useRef(null);

  const [loadingMsg, setLoadingMsg] = useState('Initialising chakra sensors…');
  const [isLoading, setIsLoading] = useState(true);

  // HUD state
  const [pwrL, setPwrL] = useState(0);
  const [pwrR, setPwrR] = useState(0);
  const [openL, setOpenL] = useState(false);
  const [openR, setOpenR] = useState(false);

  useEffect(() => {
    const vEl = vRef.current;
    const cEl = cRef.current;
    const ctx = cEl.getContext('2d');
    const nVid = nVidRef.current;
    const sVid = sVidRef.current;
    const flash = flashRef.current;
    const hint = hintRef.current;

    let pwr = [0, 0];
    let wasOpen = [false, false];
    let hintHidden = false;
    let lastResize = 0;

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
      flash.className = '';
      void flash.offsetWidth;
      flash.className = type === 'n' ? 'flash-naruto' : 'flash-sasuke';
      if (type === 'n') playRasengan();
      else playChidori();
    }

    function onResults(res) {
      const now = Date.now();
      if (now - lastResize > 250) {
        cEl.width = vEl.videoWidth;
        cEl.height = vEl.videoHeight;
        lastResize = now;
      }

      ctx.save();
      ctx.clearRect(0, 0, cEl.width, cEl.height);

      let fL = false, fR = false;
      nVid.style.display = 'none';
      sVid.style.display = 'none';

      if (res.multiHandLandmarks && res.multiHandedness) {
        if (res.multiHandLandmarks.length > 0 && !hintHidden) {
          hintHidden = true;
          hint.classList.add('hidden');
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
          if (open && !wasOpen[idx]) {
            triggerFlash(isR ? 's' : 'n');
            const vid = isR ? sVid : nVid;
            vid.currentTime = 0; vid.play().catch(e=>{});
          }

          pwr[idx] += open ? 0.05 : -0.15;
          pwr[idx] = Math.max(0, Math.min(1, pwr[idx]));
          wasOpen[idx] = open;

          const wrist = pts[0], knk = pts[9];

          if (pwr[idx] > 0.01) {
            if (isR) {
              fR = true;
              const tx = (wrist.x + knk.x) / 2, ty = (wrist.y + knk.y) / 2;
              sVid.style.left = `${(1 - tx) * window.innerWidth}px`;
              sVid.style.top = `${ty * window.innerHeight}px`;
              sVid.style.display = 'block';
              sVid.style.opacity = pwr[idx];
            } else {
              fL = true;
              const dx = knk.x - wrist.x, dy = knk.y - wrist.y;
              const tx = knk.x + dx * 0.8, ty = knk.y + dy * 0.8;
              nVid.style.left = `${(1 - tx) * window.innerWidth}px`;
              nVid.style.top = `${ty * window.innerHeight - 120}px`;
              nVid.style.display = 'block';
              nVid.style.opacity = pwr[idx];
            }
          }
        });
      }

      if (!fL) {
        pwr[0] = Math.max(0, pwr[0] - 0.15);
        if (pwr[0] > 0.01) { nVid.style.display = 'block'; nVid.style.opacity = pwr[0]; }
        wasOpen[0] = false;
      }
      if (!fR) {
        pwr[1] = Math.max(0, pwr[1] - 0.15);
        if (pwr[1] > 0.01) { sVid.style.display = 'block'; sVid.style.opacity = pwr[1]; }
        wasOpen[1] = false;
      }

      // Update State for HUD
      setPwrL(pwr[0]);
      setPwrR(pwr[1]);
      setOpenL(wasOpen[0]);
      setOpenR(wasOpen[1]);
      

      updateJutsuAudio(pwr[0], pwr[1]);
      
      ctx.restore();
    }

    let handLandmarker = null;
    let animationId = null;
    let lastVideoTime = -1;

    async function initVision() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 4,
        minHandDetectionConfidence: 0.75,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 } });
        vEl.srcObject = stream;
        vEl.addEventListener("loadeddata", predictWebcam);
        setLoadingMsg('Chakra online — prepare your hands!');
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      } catch (err) {
        setLoadingMsg('⚠ Camera access denied.');
      }
    }

    function predictWebcam() {
      if (!vEl || vEl.paused || vEl.ended) return;
      if (vEl.currentTime !== lastVideoTime && handLandmarker) {
        lastVideoTime = vEl.currentTime;
        const results = handLandmarker.detectForVideo(vEl, performance.now());
        
        // Map to legacy format to keep logic working perfectly
        const res = {
          multiHandLandmarks: results.landmarks,
          multiHandedness: results.handednesses.map(h => ({ label: h[0].categoryName }))
        };
        onResults(res);
      }
      animationId = requestAnimationFrame(predictWebcam);
    }

    initVision();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (vEl && vEl.srcObject) {
        vEl.srcObject.getTracks().forEach(t => t.stop());
      }
      if (handLandmarker) {
        handLandmarker.close();
      }
      rAudio.pause();
      cAudio.pause();
    };

  }, []);

  return (
    <div className="ar-container">
      {/* LOADING */}
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

      {/* SCENE */}
      <video id="v_src" ref={vRef} autoPlay playsInline></video>
      <canvas id="out" ref={cRef}></canvas>
      <div className="darkness"></div>

      {/* FLASH */}
      <div id="flash" ref={flashRef}></div>

      {/* JUTSU VIDEOS */}
      <video id="n" ref={nVidRef} className="fx" src="/assets/naruto.mp4" muted autoPlay loop playsInline></video>
      <video id="s" ref={sVidRef} className="fx" src="/assets/sasuke.mp4" muted autoPlay loop playsInline></video>

      {/* TOP BADGE */}
      <div id="top-badge">
        <div className="badge-title">✦ Jutsu Mode Active ✦</div>
      </div>

      {/* HINT */}
      <div id="hint" ref={hintRef}>
        <span className="hint-hand">🖐️</span>
        <div className="hint-text">Open your hands to unleash jutsu</div>
      </div>

      {/* HUD */}
      <div id="hud">
        {/* LEFT: Naruto / Rasengan */}
        <div className="chakra-panel left">
          <div className="hand-label">Left Hand</div>
          <div className="jutsu-name col-n">⚡ Rasengan</div>
          <div className="bar-row">
            <div className={`dot ${openL ? 'on-n' : ''}`}></div>
            <div className="bar-bg">
              <div className="bar-fill bar-n" style={{ width: `${Math.round(pwrL * 100)}%` }}></div>
            </div>
            <span className="pct col-n">{Math.round(pwrL * 100)}%</span>
          </div>
        </div>

        {/* RIGHT: Sasuke / Chidori */}
        <div className="chakra-panel right">
          <div className="hand-label">Right Hand</div>
          <div className="jutsu-name col-s">⚡ Chidori</div>
          <div className="bar-row">
            <span className="pct col-s">{Math.round(pwrR * 100)}%</span>
            <div className="bar-bg">
              <div className="bar-fill bar-s" style={{ width: `${Math.round(pwrR * 100)}%` }}></div>
            </div>
            <div className={`dot ${openR ? 'on-s' : ''}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Naruto;
