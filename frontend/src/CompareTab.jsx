import { useState, useEffect } from 'react';
import { API_URL } from './App.jsx';
import { Token } from './Token.jsx';

const PLACEHOLDER = `Paste a log line — for example:

Apache: 192.168.1.42 - - [25/Mar/2024:10:30:15] "GET /api/users/42 HTTP/1.1" 200 1842
Linux:  Jun 14 15:16:01 combo sshd(pam_unix)[19939]: authentication failure`;

export default function CompareTab({ hasTokenizer }) {
  const [text, setText] = useState('');
  const [bpeResult, setBpeResult] = useState(null);
  const [gpt4Result, setGpt4Result] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text || !hasTokenizer) return;

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [bpeRes, gpt4Res] = await Promise.all([
          fetch(`${API_URL}/tokenize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          }).then(r => r.json()),
          fetch(`${API_URL}/tokenize/gpt4`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          }).then(r => r.json()),
        ]);
        setBpeResult(bpeRes);
        setGpt4Result(gpt4Res);
      } catch (err) {
        console.error('Tokenize failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [text, hasTokenizer]);

  if (!hasTokenizer) {
    return (
      <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
        <div className="section-label" style={{ justifyContent: 'center', marginBottom: 12 }}>No tokenizer trained</div>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Train a BPE on the Train tab to enable comparison.
        </div>
      </div>
    );
  }

  // Calculate win/lose
  const bpeCount = bpeResult?.count;
  const gpt4Count = gpt4Result?.count;
  const bpeWins = bpeCount != null && gpt4Count != null && bpeCount < gpt4Count;

  return (
    <>
      <div className="input-block">
        <div className="input-label-row">
          <span className="section-label">Test input</span>
          <span className="panel-meta">{text.length} chars</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={5}
        />
      </div>

      <div className="compare-grid">
        <Column
          title="BPE"
          subtitle="trained on apache logs"
          result={bpeResult}
          loading={loading}
          win={bpeWins}
          lose={!bpeWins && bpeResult && gpt4Result}
        />
        <Column
          title="GPT-4 · tiktoken"
          subtitle="cl100k_base"
          result={gpt4Result}
          loading={loading}
          win={!bpeWins && bpeResult && gpt4Result}
          lose={bpeWins}
        />
      </div>

    </>
  );
}

function Column({ title, subtitle, result, loading, win, lose }) {
  return (
    <div className="col">
      <div className="col-header">
        <div>
          <div className="col-title">{title}</div>
        </div>
        <div className={`col-count ${win ? 'win' : ''} ${lose ? 'lose' : ''}`}>
          {result ? result.count : '—'}
        </div>
      </div>
      <div className="col-subtitle">{subtitle}</div>
      <div className="col-tokens">
        {!result ? (
          <div className="col-empty">{loading ? 'tokenizing…' : 'no input'}</div>
        ) : result.tokens.length === 0 ? (
          <div className="col-empty">empty</div>
        ) : (
          result.tokens.map((tok, i) => <Token key={i} text={tok.text} />)
        )}
      </div>
    </div>
  );
}

