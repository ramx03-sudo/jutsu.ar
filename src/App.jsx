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

  if (appState === 'instructions') {
    return (
      <div className="selection-screen">
        <div className="selection-header">
          <h1 className="selection-title">How to Play</h1>
          <p className="selection-subtitle">Master the Hand Signs</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '600px', width: '90%', margin: '0 auto', color: 'white', background: 'rgba(0,0,0,0.4)', padding: '30px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', textAlign: 'left', zIndex: 10, position: 'relative' }}>
          
          <div>
            <h2 style={{ color: '#c084fc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{fontSize:'1.5rem'}}>🤞</span> Jujutsu Kaisen</h2>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
              <li><span style={{color: '#ff5555', fontWeight: 'bold'}}>Right Hand Peace Sign:</span> Reversal Red</li>
              <li><span style={{color: '#55aaff', fontWeight: 'bold'}}>Left Hand Peace Sign:</span> Lapse Blue</li>
              <li><span style={{color: '#c084fc', fontWeight: 'bold'}}>Both Hands Peace Signs:</span> Hollow Purple</li>
              <li><span style={{color: '#ffffff', fontWeight: 'bold'}}>Both Hands Clasped:</span> Domain Expansion</li>
            </ul>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

          <div>
            <h2 style={{ color: '#ffb347', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{fontSize:'1.5rem'}}>🖐️</span> Naruto</h2>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
              <li><span style={{color: '#55aaff', fontWeight: 'bold'}}>Left Hand Open:</span> Rasengan</li>
              <li><span style={{color: '#55aaff', fontWeight: 'bold'}}>Right Hand Open:</span> Chidori</li>
            </ul>
          </div>
          
          <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>* Ensure you are in a well-lit room and your hands are clearly visible to the camera.</p>
        </div>
        
        <button className="back-btn" onClick={() => setAppState('selection')}>← Back</button>
      </div>
    );
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
      <button onClick={() => setAppState('instructions')} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', backdropFilter: 'blur(5px)', transition: 'all 0.3s ease', fontSize: '1rem', fontWeight: 'bold', zIndex: 100 }}>📖 How to Play</button>
    </div>
  );
}

export default App;
