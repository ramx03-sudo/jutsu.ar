import { useState } from 'react';
import Naruto from './Naruto';
import JJK from './JJK';
import './index.css';

function App() {
  const [appState, setAppState] = useState('landing'); // 'landing', 'selection', 'naruto', 'jjk'

  if (appState === 'naruto') {
    return <Naruto onBack={() => setAppState('selection')} />;
  }

  if (appState === 'jjk') {
    return <JJK onBack={() => setAppState('selection')} />;
  }

  if (appState === 'landing') {
    return (
      <div className="landing-screen">
        <div className="landing-overlay"></div>
        <div className="landing-content">
          <div className="landing-badge">AR Experience</div>
          <h1 className="landing-title">Jutsu AR</h1>
          <p className="landing-desc">Step into the anime world. Unleash powerful cursed energy and ancient jutsu using real-time hand tracking.</p>
          
          <button className="start-btn" onClick={() => setAppState('selection')}>
            ENTER NOW
          </button>
        </div>
        <div className="landing-creator">
          Created by <span>Ram Uchiha</span>
        </div>
      </div>
    );
  }

  return (
    <div className="selection-screen">
      <div className="selection-header">
        <h1 className="selection-title">Choose Your Path</h1>
        <p className="selection-subtitle">Select your Anime Universe</p>
      </div>

      <div className="selection-container">
        <div className="selection-cards">
          <div className="card naruto-card" onClick={() => setAppState('naruto')}>
            <div className="card-bg"></div>
            <h2>Naruto</h2>
            <p>Rasengan & Chidori</p>
            <div className="card-icon">🌀</div>
          </div>

          <div className="card jjk-card" onClick={() => setAppState('jjk')}>
            <div className="card-bg"></div>
            <h2>Jujutsu Kaisen</h2>
            <p>Hollow Purple & Domain Expansion</p>
            <div className="card-icon">🤞</div>
          </div>
        </div>
      </div>
      
      <button className="back-btn" onClick={() => setAppState('landing')}>← Back to Home</button>
    </div>
  );
}

export default App;
