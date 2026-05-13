import { useState } from 'react';
import TrainTab from './TrainTab.jsx';
import CompareTab from './CompareTab.jsx';

export const API_URL = 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('train');
  const [hasTokenizer, setHasTokenizer] = useState(false);

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
          <TrainTab onTokenizerTrained={() => setHasTokenizer(true)} />
        )}
        {activeTab === 'compare' && (
          <CompareTab hasTokenizer={hasTokenizer} />
        )}
      </main>

    </div>
  );
}
