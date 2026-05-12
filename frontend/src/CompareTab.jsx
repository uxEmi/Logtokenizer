import { useState, useEffect } from 'react';
import { API_URL } from './App.jsx';
import { Token } from './Token.jsx';

const DEFAULT_INPUT = '192.168.1.42 - - [25/Mar/2024:10:30:15] "GET /api/users/42 HTTP/1.1" 200 1842';

// GPT-4o input pricing: $2.50 per 1M tokens
const GPT4O_PRICE_PER_M = 2.50;
const DEMO_DAILY_VOLUME = 1_000_000;

export default function CompareTab({ bpeTokenizerId }) {
  const [text, setText] = useState(DEFAULT_INPUT);
  const [bpeResult, setBpeResult] = useState(null);
  const [gpt4Result, setGpt4Result] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text || !bpeTokenizerId) return;

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [bpeRes, gpt4Res] = await Promise.all([
          fetch(`${API_URL}/tokenize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenizer_id: bpeTokenizerId, text }),
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
  }, [text, bpeTokenizerId]);

  if (!bpeTokenizerId) {
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

  const tokensSaved = (gpt4Count ?? 0) - (bpeCount ?? 0);
  const pctReduction = gpt4Count ? ((tokensSaved / gpt4Count) * 100) : 0;
  const monthlySavings = (tokensSaved * DEMO_DAILY_VOLUME * 30 / 1_000_000) * GPT4O_PRICE_PER_M;

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
          rows={3}
        />
      </div>

      <div className="compare-grid">
        <Column
          title="BPE"
          subtitle="trained on apache logs · from scratch"
          result={bpeResult}
          loading={loading}
          win={bpeWins}
          lose={!bpeWins && bpeResult && gpt4Result}
        />
        <Column
          title="GPT-4 · tiktoken"
          subtitle="cl100k_base · general-purpose"
          result={gpt4Result}
          loading={loading}
          win={!bpeWins && bpeResult && gpt4Result}
          lose={bpeWins}
        />
      </div>

      {bpeResult && gpt4Result && (
        <CostPanel
          bpeCount={bpeCount}
          gpt4Count={gpt4Count}
          tokensSaved={tokensSaved}
          pctReduction={pctReduction}
          monthlySavings={monthlySavings}
          bpeWins={bpeWins}
        />
      )}
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

function CostPanel({ bpeCount, gpt4Count, tokensSaved, pctReduction, monthlySavings, bpeWins }) {
  if (bpeWins) {
    return (
      <div className="cost-panel">
        <div className="cost-header">
          <span>◆</span>
          <span>Cost impact · domain-trained BPE wins</span>
        </div>
        <div className="cost-headline">
          Your BPE saves <span className="cost-big">{tokensSaved} tokens</span>{' '}
          ({pctReduction.toFixed(0)}%) vs GPT-4 on this input.
        </div>
        <div className="cost-row">
          At GPT-4o input pricing (${GPT4O_PRICE_PER_M.toFixed(2)} / 1M tok) × 1M log lines/day:
        </div>
        <div className="cost-row">
          <span className="cost-big" style={{ fontSize: 16 }}>
            ≈ ${monthlySavings.toFixed(0)} / month
          </span>
          <span className="cost-secondary">in tokenization savings</span>
        </div>
      </div>
    );
  }

  // GPT-4 wins on this input — the honest moment
  const gpt4Saves = bpeCount - gpt4Count;
  return (
    <div className="cost-panel" style={{ borderLeftColor: 'var(--amber)' }}>
      <div className="cost-header" style={{ color: 'var(--amber)' }}>
        <span>◇</span>
        <span>The honest tradeoff · GPT-4 wins here</span>
      </div>
      <div className="cost-headline">
        On this input, GPT-4 uses <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{gpt4Saves} fewer tokens</span> than our BPE.
      </div>
      <div className="cost-row cost-secondary">
        Our BPE was trained on logs — it's specialized, not universal.
        Tokenizers are shaped by their training data: pick yours to match your domain.
      </div>
    </div>
  );
}
