import { useState, useEffect } from 'react';
import TrainTab from './TrainTab.jsx';
import CompareTab from './CompareTab.jsx';

export const API_URL = 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('train');
  const [bpeTokenizerId, setBpeTokenizerId] = useState(null);
  const [backendOk, setBackendOk] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API_URL}/`)
      .then(r => r.json())
      .then(data => {
        setBackendOk(true);
        // If the backend has a default pre-trained BPE, use it
        if (data.trained_tokenizers && data.trained_tokenizers.includes('apache-bpe-default')) {
          setBpeTokenizerId('apache-bpe-default');
        }
      })
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" />
          <span>LOGTOKENIZER</span>
          <span className="brand-slash">/</span>
          <span className="brand-sub">bpe from scratch</span>
        </div>
        <div className="header-meta">
          <span>
            <span className={`status-dot ${backendOk ? '' : 'dim'}`} />
            {backendOk ? 'backend online' : 'backend offline'}
          </span>
          <span>v0.1</span>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'train' ? 'active' : ''}`}
          onClick={() => setActiveTab('train')}
        >
          <span className="tab-num">01</span>
          <span>Train</span>
        </button>
        <button
          className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          <span className="tab-num">02</span>
          <span>Compare</span>
        </button>
      </nav>

      <main className="tab-content" key={activeTab}>
        {activeTab === 'train' && (
          <TrainTab onTokenizerTrained={setBpeTokenizerId} />
        )}
        {activeTab === 'compare' && (
          <CompareTab bpeTokenizerId={bpeTokenizerId} />
        )}
      </main>

      <footer className="footer">
        <span>BPE · WordPiece · tiktoken</span>
        <span>tokenizers learn what you train them on</span>
      </footer>
    </div>
  );
}
