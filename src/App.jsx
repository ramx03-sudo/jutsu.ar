import { useState } from 'react';
import Naruto from './Naruto';
import JJK from './JJK';
import './index.css';

function App() {
  const [appMode, setAppMode] = useState(null); // 'naruto', 'jjk', or null

  if (appMode === 'naruto') {
    return <Naruto onBack={() => setAppMode(null)} />;
  }

  if (appMode === 'jjk') {
    return <JJK onBack={() => setAppMode(null)} />;
  }

  return (
    <div className="home-screen">
      <div className="home-header">
        <h1 className="home-title">Jutsu AR</h1>
        <p className="home-subtitle">Augmented Reality Hand Tracking Experience</p>
        <div className="home-creator">
          Created by <span>Ram Mamillapalli</span>
        </div>
      </div>

      <div className="selection-container">
        <h2 className="selection-heading">Choose Your Path</h2>
        <div className="selection-cards">
          <div className="card naruto-card" onClick={() => setAppMode('naruto')}>
            <div className="card-bg"></div>
            <h2>Naruto</h2>
            <p>Rasengan & Chidori</p>
            <div className="card-icon">🌀</div>
          </div>

          <div className="card jjk-card" onClick={() => setAppMode('jjk')}>
            <div className="card-bg"></div>
            <h2>Jujutsu Kaisen</h2>
            <p>Hollow Purple & Domain Expansion</p>
            <div className="card-icon">🤞</div>
          </div>
        </div>
      </div>

      <div className="home-footer">
        © 2026 Ram Mamillapalli. All Rights Reserved.
      </div>
    </div>
  );
}

export default App;
