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
    <div className="selection-screen">
      <h1 className="selection-title">Choose Your Path</h1>
      <p className="selection-subtitle">Select an Augmented Reality Experience</p>

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
  );
}

export default App;
