# LogTokenizer

> A demonstration that **tokenizers are shaped by their training data** — implement BPE from scratch, train it on real Apache logs, and watch it beat GPT-4's tokenizer on log data.

## What it shows

When you feed logs into an LLM (for analysis, anomaly detection, on-call assistance), every token costs money. **A tokenizer trained on logs encodes log data using fewer tokens than a general-purpose tokenizer like GPT-4's** — because it learned domain patterns (`GET`, `HTTP`, `200`, `/api/`) as single tokens.

This project quantifies that, visually and in dollars.

## The two features

**01 · Train** — pick a log corpus, choose a vocab size, and watch a BPE algorithm build its vocabulary in real time. Merges stream in (`G + E → GE`, `GE + T → GET`, eventually `HTTP`, `200`, `/api/`) with the growing vocabulary panel beside it.

**02 · Compare** — paste a log line and see it tokenized side-by-side by your trained BPE vs GPT-4's tokenizer (via `tiktoken`). Token counts, colored chips for visual diff, plus a cost panel that translates the difference into dollars per month at production log volumes.

## Stack

- **Backend**: FastAPI · BPE from scratch (~100 lines of Python) · tiktoken for the GPT-4 reference
- **Frontend**: React · Vite · vanilla CSS · IBM Plex Mono/Sans
- **Data**: Apache and Linux logs from [Loghub](https://github.com/logpai/loghub) — free, academic, real

Everything runs offline. No API keys, no GPU, no external services.

## Quick start

### One-shot setup (Mac/Linux)

```bash
./setup.sh
```

This creates the Python venv, installs dependencies, and downloads two real log corpora.

### Manual setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download corpora
mkdir -p corpora
curl -o corpora/apache.txt   https://raw.githubusercontent.com/logpai/loghub/master/Apache/Apache_2k.log
curl -o corpora/linux.txt    https://raw.githubusercontent.com/logpai/loghub/master/Linux/Linux_2k.log

# Frontend
cd ../frontend
npm install
```

### Run

```bash
# Terminal 1
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Open <http://localhost:5173>. The backend pre-trains a BPE on Apache logs at startup, so the Compare tab works immediately — no need to wait.

## API

| Endpoint | Purpose |
|---|---|
| `GET /` | health check, lists available trained tokenizers |
| `GET /corpora` | list available corpora |
| `POST /train` | train a BPE on a corpus, returns `tokenizer_id` + merges |
| `POST /tokenize` | tokenize text with a trained tokenizer |
| `POST /tokenize/gpt4` | tokenize text with GPT-4's tokenizer |

## Demo flow (90 seconds)

1. **Train tab.** Pick Apache logs, vocab 500, press Train. Watch tokens like `GET`, `HTTP`, `200`, `/api/` emerge as the algorithm learns them.
2. **Compare tab.** Click the *Apache log line* preset. Your BPE: ~18 tokens. GPT-4: ~31. Point at the cost panel: ≈ $1,200/month at 1M log lines/day.
3. **Plain prose preset.** Now GPT-4 wins. Tokenizers are domain-specific — pick yours to match your data.

## Folder structure

```
logtokenizer/
├── backend/
│   ├── corpora/          # log datasets from Loghub
│   ├── bpe.py            # BPE algorithm — train, encode, decode
│   ├── main.py           # FastAPI server
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx       # shell + tab switcher
│       ├── TrainTab.jsx  # feature 1
│       ├── CompareTab.jsx # feature 2
│       ├── Token.jsx     # shared token chip component
│       └── styles.css
├── setup.sh              # one-shot bootstrap
└── README.md
```

## Credits

- BPE algorithm: Sennrich et al. (2016), originally from Gage's 1994 compression scheme.
- Log datasets: [Loghub](https://github.com/logpai/loghub) (LogPai).
- GPT-4 tokenizer: OpenAI [`tiktoken`](https://github.com/openai/tiktoken).
