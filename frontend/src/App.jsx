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
          <span>LOGTOKENIZER</span>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'train' ? 'active' : ''}`}
          onClick={() => setActiveTab('train')}
        >
          <span>Train</span>
        </button>
        <button
          className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
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

    </div>
  );
}
