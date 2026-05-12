import { useState, useRef, useEffect } from 'react';
import { API_URL } from './App.jsx';
import { Token } from './Token.jsx';

const CORPORA = [
  { name: 'apache', label: 'Apache logs', desc: 'web server access logs' },
  { name: 'linux', label: 'Linux syslog', desc: 'kernel + system messages' },
  { name: 'openssh', label: 'OpenSSH logs', desc: 'auth + session logs' },
];

export default function TrainTab({ onTokenizerTrained }) {
  const [corpusName, setCorpusName] = useState('apache');
  const [vocabSize, setVocabSize] = useState(500);
  const [isTraining, setIsTraining] = useState(false);
  const [visibleMerges, setVisibleMerges] = useState([]);
  const [vocabSample, setVocabSample] = useState([]);
  const [stats, setStats] = useState(null);
  const animationRef = useRef(null);
  const logRef = useRef(null);

  async function handleTrain() {
    // cancel any in-flight animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    setIsTraining(true);
    setVisibleMerges([]);
    setVocabSample([]);
    setStats(null);

    try {
      const res = await fetch(`${API_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpus_name: corpusName, vocab_size: vocabSize }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      onTokenizerTrained(data.tokenizer_id);

      // Animate the merges streaming in
      const allMerges = data.merges;
      let i = 0;
      const batchSize = Math.max(1, Math.floor(allMerges.length / 200));
      const totalDuration = 6000; // ~6 seconds total
      const interval = Math.max(15, Math.floor(totalDuration / (allMerges.length / batchSize)));

      animationRef.current = setInterval(() => {
        i += batchSize;
        if (i >= allMerges.length) {
          setVisibleMerges(allMerges);
          setVocabSample(data.vocab_sample);
          setStats({
            vocab_size: data.vocab_size,
            merges: data.merges.length,
            corpus_chars: data.corpus_chars,
          });
          clearInterval(animationRef.current);
          animationRef.current = null;
          setIsTraining(false);
        } else {
          setVisibleMerges(allMerges.slice(0, i));
        }
      }, interval);
    } catch (err) {
      console.error('Train failed:', err);
      alert(`Training failed: ${err.message}\n\nMake sure the backend is running and corpora/${corpusName}.txt exists.`);
      setIsTraining(false);
    }
  }

  // Auto-scroll the merge log as new rows stream in
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleMerges.length]);

  return (
    <>
      <div className="toolbar">
        <div className="field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span className="field-label">Corpus</span>
          <div className="chip-row">
            {CORPORA.map(c => (
              <button
                key={c.name}
                className={`chip-btn ${corpusName === c.name ? 'active' : ''}`}
                onClick={() => setCorpusName(c.name)}
                title={c.desc}
                disabled={isTraining}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Vocab</span>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={vocabSize}
            onChange={(e) => setVocabSize(parseInt(e.target.value))}
            className="range"
            disabled={isTraining}
          />
          <span className="field-value">{vocabSize}</span>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleTrain}
          disabled={isTraining}
          style={{ marginLeft: 'auto' }}
        >
          {isTraining ? '▸ training…' : '▸ train BPE'}
        </button>
      </div>

      <div className="train-grid">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Merge log</span>
            <span className="panel-meta">
              {visibleMerges.length} {visibleMerges.length === 1 ? 'merge' : 'merges'}
            </span>
          </div>
          <div className="merge-log" ref={logRef}>
            {visibleMerges.length === 0 ? (
              <div className="merge-empty">
                {isTraining ? 'waiting for first merge…' : 'press train to start'}
              </div>
            ) : (
              visibleMerges.map((m, idx) => (
                <div className="merge-row" key={idx}>
                  <span className="merge-idx">{String(idx + 1).padStart(3, '0')}</span>
                  <Token text={m[0]} />
                  <span className="merge-arrow">+</span>
                  <Token text={m[1]} />
                  <span className="merge-arrow">→</span>
                  <Token text={m[0] + m[1]} bold />
                </div>
              ))
            )}
            {isTraining && visibleMerges.length > 0 && <span className="merge-cursor" />}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Learned vocab (sample)</span>
            <span className="panel-meta">
              {vocabSample.length > 0 ? `top ${vocabSample.length}` : '—'}
            </span>
          </div>
          <div className="vocab-chips">
            {vocabSample.length === 0 ? (
              <div className="merge-empty" style={{ padding: '40px 0', width: '100%' }}>
                vocabulary appears after training
              </div>
            ) : (
              vocabSample.map((tok, i) => <Token key={i} text={tok} bold />)
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat">
            <span className="stat-label">vocab size</span>
            <span className="stat-value accent">{stats.vocab_size}</span>
          </div>
          <div className="stat">
            <span className="stat-label">merges learned</span>
            <span className="stat-value">{stats.merges}</span>
          </div>
          <div className="stat">
            <span className="stat-label">corpus size</span>
            <span className="stat-value">{(stats.corpus_chars / 1024).toFixed(1)} KB</span>
          </div>
          <div className="stat" style={{ marginLeft: 'auto' }}>
            <span className="stat-label">ready</span>
            <span className="stat-value accent">→ compare tab</span>
          </div>
        </div>
      )}
    </>
  );
}
