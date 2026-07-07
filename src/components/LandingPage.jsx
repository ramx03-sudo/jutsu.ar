import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from './ParticleBackground';
import ARPreviewCanvas from './ARPreviewCanvas';
import CursorParticles from './CursorParticles';
import './LandingPage.css';

// ── Apple-style easing ────────────────────────────────────────────────────────
const EASE = [0.25, 0.46, 0.45, 0.94];



// ── Rotating headline words ───────────────────────────────────────────────────
const ROTATING_WORDS = ['Chakra.', 'Jutsu.', 'Power.', 'Reality.'];

// ── Animated stat counter ─────────────────────────────────────────────────────
function CountUp({ target, duration = 1200, suffix = '' }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const isNum = typeof target === 'number';
        function step(now) {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          if (isNum) setValue(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  if (typeof target !== 'number') return <span ref={ref}>{target}</span>;
  return <span ref={ref}>{value}{suffix}</span>;
}

// ── Entrance animation ────────────────────────────────────────────────────────
const ENTRANCE_KEY = 'jutsu_ar_entrance_seen';

function EntranceSequence({ onComplete }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    // If already played this session, skip immediately
    if (sessionStorage.getItem(ENTRANCE_KEY)) {
      onComplete();
      return;
    }
    const t1 = setTimeout(() => setStep(1), 350);
    const t2 = setTimeout(() => setStep(2), 800);
    const t3 = setTimeout(() => {
      sessionStorage.setItem(ENTRANCE_KEY, '1');
      onComplete();
    }, 1350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  // If already seen, render nothing
  if (sessionStorage.getItem(ENTRANCE_KEY)) return null;

  return (
    <AnimatePresence>
      {step < 2 && (
        <motion.div className="entrance-overlay"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: EASE }}
        >
          <motion.div className="entrance-orb"
            initial={{ scale: 0, opacity: 0 }}
            animate={step >= 1
              ? { scale: [1, 40, 120], opacity: [1, 0.5, 0] }
              : { scale: 1, opacity: 1 }
            }
            transition={step >= 1
              ? { duration: 0.9, ease: EASE }
              : { duration: 0.35 }
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage({ onEnter, onSelectNaruto, onSelectJJK }) {
  // Skip entrance if already played this session
  const [entranceDone, setEntranceDone] = useState(
    () => !!sessionStorage.getItem(ENTRANCE_KEY)
  );
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  const cursorRef = useRef(null);
  const ctaBtnRef = useRef(null);

  // Rotating headline
  useEffect(() => {
    if (!entranceDone) return;
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIdx(i => (i + 1) % ROTATING_WORDS.length);
        setWordVisible(true);
      }, 500);
    }, 2400);
    return () => clearInterval(interval);
  }, [entranceDone]);

  // CTA cursor convergence
  const handleCtaEnter = useCallback(() => {
    const btn = ctaBtnRef.current;
    if (!btn || !cursorRef.current) return;
    const rect = btn.getBoundingClientRect();
    cursorRef.current.setConverge(true, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, []);
  const handleCtaLeave = useCallback(() => {
    cursorRef.current?.setConverge(false);
  }, []);
  const handleCtaClick = useCallback((e) => {
    cursorRef.current?.burst(e.clientX, e.clientY);
    setTimeout(() => onEnter(), 200);
  }, [onEnter]);

  const playTestSound = useCallback(() => {
    try {
      const audio = new Audio('/Audios/testing aaudio.mp3');
      audio.volume = 0.8;
      audio.play();
    } catch (e) {}
  }, []);

  // 3D tilt handler factory
  const makeTiltHandlers = (cardRef) => ({
    onMouseMove(e) {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const my = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      el.style.setProperty('--ry', `${mx * 7}deg`);
      el.style.setProperty('--rx', `${-my * 5}deg`);
    },
    onMouseLeave(e) {
      const el = cardRef.current;
      if (!el) return;
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    },
  });

  const narutoCardRef = useRef(null);
  const jjkCardRef = useRef(null);
  const narutoTilt = makeTiltHandlers(narutoCardRef);
  const jjkTilt = makeTiltHandlers(jjkCardRef);

  // Framer variants (Apple-paced)
  const container = { hidden: {}, visible: { transition: { staggerChildren: 0.2 } } };
  const fadeUp  = { hidden: { opacity: 0, y: 36 }, visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: EASE } } };
  const fadeIn  = { hidden: { opacity: 0 },         visible: { opacity: 1,     transition: { duration: 1.0 } } };
  const slideR  = { hidden: { opacity: 0, x: -44 }, visible: { opacity: 1, x: 0, transition: { duration: 1.0, ease: EASE } } };
  const scaleIn = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 1.1, ease: EASE } } };

  return (
    <div className="landing-root">
      <EntranceSequence onComplete={() => setEntranceDone(true)} />
      <ParticleBackground />
      <CursorParticles ref={cursorRef} />

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="nav-logo-jutsu">JUTSU</span>
          <span className="nav-logo-ar"> AR</span>
        </div>
        <div className="nav-actions">
          <button className="nav-audio-btn" onClick={playTestSound} aria-label="Test audio">
            🎧 Test Audio
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      {entranceDone && (
        <motion.section className="hero-section"
          variants={container} initial="hidden" animate="visible"
        >
          <div className="hero-left">
            <motion.div variants={slideR} className="hero-badge">
              <span className="hero-badge-dot" />
              Real-Time AI Hand Tracking
            </motion.div>

            <motion.h1 variants={slideR} className="hero-headline">
              <span className="hero-headline-line1">Your Hands.</span>
              <span className="hero-headline-rotating-wrap">
                <AnimatePresence mode="wait">
                  {wordVisible && (
                    <motion.span
                      key={wordIdx}
                      className="hero-headline-accent"
                      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
                      exit={{    opacity: 0, y: -20, filter: 'blur(8px)' }}
                      transition={{ duration: 0.55, ease: EASE }}
                    >
                      Your {ROTATING_WORDS[wordIdx]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="hero-sub">
              Perform real anime hand signs.{' '}
              <strong>AI recognizes your gestures instantly</strong> and unleashes
              cinematic powers — Rasengan, Chidori, Domain Expansion — directly in your browser.
            </motion.p>

            <motion.div variants={fadeUp} className="hero-cta-group">
              <motion.button
                ref={ctaBtnRef}
                className="cta-primary"
                onMouseEnter={handleCtaEnter}
                onMouseLeave={handleCtaLeave}
                onClick={handleCtaClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                aria-label="Launch AR"
              >
                ▶ Launch AR
              </motion.button>
              <motion.button
                className="cta-secondary"
                onClick={() => document.getElementById('universe-section')?.scrollIntoView({ behavior: 'smooth' })}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                aria-label="Choose your universe"
              >
                Choose Universe ↓
              </motion.button>
            </motion.div>

            <motion.div variants={fadeIn} className="hero-trust">
              {['No Download', 'Browser Only', '60 FPS', 'Mobile Ready', 'AI Powered'].map(l => (
                <span key={l} className="trust-pill">{l}</span>
              ))}
            </motion.div>
          </div>

          <motion.div variants={scaleIn} className="hero-right">
            <div className="camera-window">
              <ARPreviewCanvas />
            </div>
          </motion.div>
        </motion.section>
      )}

      {/* ── SCROLLABLE SECTIONS ── */}
      {entranceDone && (
        <div className="scroll-content">
          <div className="section-divider" />

          {/* Universe Cards */}
          <section className="universe-section" id="universe-section">
            <div className="section-header">
              <span className="section-eyebrow">Choose Your Path</span>
              <h2 className="section-title">Your Universe Awaits</h2>
            </div>

            <div className="universe-cards">
              {/* Naruto */}
              <motion.div
                ref={narutoCardRef}
                className="universe-card naruto-theme"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.95, ease: EASE }}
                onClick={onSelectNaruto}
                onMouseLeave={narutoTilt.onMouseLeave}
                onMouseMove={narutoTilt.onMouseMove}
                role="button" tabIndex={0}
                onKeyDown={e => (e.key==='Enter'||e.key===' ') && onSelectNaruto()}
                aria-label="Enter Naruto mode"
              >
                <div className="card-content">
                  <span className="card-icon-large">🌀</span>
                  <h3 className="card-universe-name">Naruto</h3>
                  <p className="card-universe-sub">OPEN PALM JUTSU</p>
                  <ul className="card-techniques">
                    <li>🔵 Left Hand Open — <strong>Rasengan</strong></li>
                    <li>⚡ Right Hand Open — <strong>Chidori</strong></li>
                  </ul>
                  <button className="card-enter-btn" onClick={onSelectNaruto} tabIndex={-1}>ENTER →</button>
                </div>
              </motion.div>

              {/* JJK */}
              <motion.div
                ref={jjkCardRef}
                className="universe-card jjk-theme"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.95, ease: EASE, delay: 0.12 }}
                onClick={onSelectJJK}
                onMouseLeave={jjkTilt.onMouseLeave}
                onMouseMove={jjkTilt.onMouseMove}
                role="button" tabIndex={0}
                onKeyDown={e => (e.key==='Enter'||e.key===' ') && onSelectJJK()}
                aria-label="Enter Jujutsu Kaisen mode"
              >
                <div className="card-content">
                  <span className="card-icon-large">🤞</span>
                  <h3 className="card-universe-name">Jujutsu Kaisen</h3>
                  <p className="card-universe-sub">CURSED TECHNIQUE</p>
                  <ul className="card-techniques">
                    <li>🔴 Right Peace Sign — <strong>Reversal Red</strong></li>
                    <li>🔵 Left Peace Sign — <strong>Lapse Blue</strong></li>
                    <li>🟣 Both Signs — <strong>Hollow Purple</strong></li>
                    <li>🏯 Both Clasped — <strong>Domain Expansion</strong></li>
                  </ul>
                  <button className="card-enter-btn" onClick={onSelectJJK} tabIndex={-1}>ENTER →</button>
                </div>
              </motion.div>

              {/* Bleach */}
              <motion.div
                className="universe-card bleach-theme locked"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 0.48, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.95, ease: EASE, delay: 0.22 }}
                aria-label="Bleach — Coming Soon"
              >
                <span className="card-soon-badge">COMING SOON</span>
                <div className="card-content">
                  <span className="card-icon-large">⚔️</span>
                  <h3 className="card-universe-name">Bleach</h3>
                  <p className="card-universe-sub">SHINIGAMI POWERS</p>
                  <ul className="card-techniques">
                    <li>⚔️ <strong>Getsuga Tensho</strong></li>
                    <li>🔒 More coming...</li>
                  </ul>
                  <button className="card-enter-btn" disabled style={{cursor:'not-allowed',opacity:0.4}}>LOCKED</button>
                </div>
              </motion.div>
            </div>
          </section>

          <div className="section-divider" />

          {/* How It Works */}
          <section className="how-section" aria-label="How it works">
            <div className="section-header">
              <span className="section-eyebrow">Simple as That</span>
              <h2 className="section-title">How It Works</h2>
            </div>
            <div className="steps-timeline">
              {[
                { icon: '📷', label: 'Open Camera',    desc: 'Grant camera access in one click. No install, no sign-up.' },
                { icon: '🙌', label: 'Show Your Hands', desc: 'Hold them up — the AI maps 21 landmarks per hand instantly.' },
                { icon: '🤞', label: 'Perform Signs',   desc: 'Make the hand gesture for your chosen technique.' },
                { icon: '✨', label: 'Watch Magic',     desc: 'Cinematic effects render at 60 FPS around you in real time.' },
              ].map((step, i) => (
                <motion.div key={step.label} className="step"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: EASE, delay: i * 0.14 }}
                >
                  <div className="step-number">{step.icon}</div>
                  <div className="step-label">{step.label}</div>
                  <div className="step-desc">{step.desc}</div>
                </motion.div>
              ))}
            </div>
          </section>

          <div className="section-divider" />

          {/* Why Browser */}
          <section className="why-section" aria-label="Why browser-based">
            <div className="section-header">
              <span className="section-eyebrow">Zero Friction</span>
              <h2 className="section-title">Why Browser?</h2>
            </div>
            <div className="why-pills">
              {[
                { icon: '🚫', label: 'No App Store', sub: 'No approval wait' },
                { icon: '📦', label: 'No Download',  sub: 'Nothing to install' },
                { icon: '🔑', label: 'No Login',     sub: 'No account needed' },
                { icon: '⚡', label: 'No Waiting',   sub: 'Loads in seconds' },
              ].map((p, i) => (
                <motion.div key={p.label} className="why-pill"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.85, ease: EASE, delay: i * 0.1 }}
                >
                  <span className="why-pill-icon">{p.icon}</span>
                  <span className="why-pill-label">{p.label}</span>
                  <span className="why-pill-sub">{p.sub}</span>
                </motion.div>
              ))}
            </div>
            <motion.p className="why-flow"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <strong>Open</strong><span>→</span>
              <strong>Allow Camera</strong><span>→</span>
              <strong>Play</strong>
            </motion.p>
          </section>

          <div className="section-divider" />

          {/* Feature Stats */}
          <section className="features-section" aria-label="Features">
            <div className="section-header">
              <span className="section-eyebrow">Under the Hood</span>
              <h2 className="section-title">Built Different</h2>
            </div>
            <div className="features-grid">
              {[
                { icon: '🖐️', target: 21,    suffix: '+',  label: 'Hand Landmarks' },
                { icon: '⚡', target: 60,     suffix: '',   label: 'FPS Rendering' },
                { icon: '🌐', target: 100,    suffix: '%',  label: 'Browser Native' },
                { icon: '🤖', target: 'AI',   suffix: '',   label: 'MediaPipe Vision' },
              ].map((f, i) => (
                <motion.div key={f.label} className="feature-card"
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.85, ease: EASE, delay: i * 0.1 }}
                >
                  <span className="feature-icon">{f.icon}</span>
                  <span className="feature-stat">
                    <CountUp target={f.target} suffix={f.suffix} duration={1300} />
                  </span>
                  <span className="feature-label">{f.label}</span>
                </motion.div>
              ))}
            </div>
          </section>

          <div className="section-divider" />

          {/* Tech Stack Strip */}
          <section className="tech-section" aria-label="Technology stack">
            <motion.div className="tech-strip"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.0 }}
            >
              <span className="tech-label">Powered by</span>
              {['MediaPipe', 'React 19', 'Three.js', 'Canvas API', 'Web Audio', 'WebGL', 'Vite'].map(t => (
                <span key={t} className="tech-badge">{t}</span>
              ))}
            </motion.div>
          </section>

          <div className="section-divider" />

          {/* Audio */}
          <section className="audio-section" aria-label="Audio">
            <motion.div className="audio-card"
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.95, ease: EASE }}
            >
              <span className="audio-icon">🎧</span>
              <h3 className="audio-title">Best with Headphones</h3>
              <p className="audio-sub">Spatial audio recommended for full immersion</p>
              <button className="audio-test-btn" onClick={playTestSound} aria-label="Test audio">
                ▶ Test Audio
              </button>
            </motion.div>
          </section>
        </div>
      )}

      {/* Footer */}
      {entranceDone && (
        <footer className="landing-footer">
          <div className="footer-left">
            Built by{' '}
            <a href="https://github.com/ramx03-sudo" target="_blank" rel="noopener noreferrer">
              Ram Mamillapalli
            </a>
            {' '}· Open Source
          </div>
          <div className="footer-right">
            {['React', 'MediaPipe', 'Three.js', 'Web Audio', 'WebGL'].map(t => (
              <span key={t} className="footer-tag">{t}</span>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
