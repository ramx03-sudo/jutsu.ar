import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export function useHandTracking(videoRef, onResults) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Initializing...');
  const handLandmarkerRef = useRef(null);
  const animationIdRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const onResultsRef = useRef(onResults);

  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    let active = true;
    const vEl = videoRef.current;
    
    async function initVision() {
      try {
        setLoadingMsg('Loading AI Models...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        if (!active) return;

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
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

        if (!active) return;

        setLoadingMsg('Starting Camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 } });
        
        if (!active) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }

        if (vEl) {
          vEl.srcObject = stream;
          vEl.addEventListener("loadeddata", () => {
            if (active) {
              setLoadingMsg('Ready!');
              setTimeout(() => { if (active) setIsLoading(false); }, 200);
              predictWebcam();
            }
          });
        }
      } catch (err) {
        if (active) setLoadingMsg('⚠ Camera access denied or model failed to load.');
        console.error(err);
      }
    }

    function predictWebcam() {
      if (!vEl || vEl.paused || vEl.ended || !active) return;
      
      const handLandmarker = handLandmarkerRef.current;
      if (vEl.currentTime !== lastVideoTimeRef.current && handLandmarker) {
        lastVideoTimeRef.current = vEl.currentTime;
        try {
          const results = handLandmarker.detectForVideo(vEl, performance.now());
          onResultsRef.current({
            multiHandLandmarks: results.landmarks,
            multiHandedness: results.handednesses.map(h => ({ label: h[0].categoryName }))
          });
        } catch(e) {
          console.error("HandLandmarker error:", e);
        }
      }

      if (active) {
        if ('requestVideoFrameCallback' in vEl) {
          animationIdRef.current = vEl.requestVideoFrameCallback(predictWebcam);
        } else {
          animationIdRef.current = requestAnimationFrame(predictWebcam);
        }
      }
    }

    initVision();

    return () => {
      active = false;
      if (animationIdRef.current) {
        if (vEl && 'cancelVideoFrameCallback' in vEl) {
          try { vEl.cancelVideoFrameCallback(animationIdRef.current); } catch(e){}
        } else {
          cancelAnimationFrame(animationIdRef.current);
        }
      }
      if (vEl && vEl.srcObject) {
        vEl.srcObject.getTracks().forEach(t => t.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, [videoRef]);

  return { isLoading, loadingMsg };
}
