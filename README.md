# LogTokenizer

By **Mihai and Ayla**.

A project about how tokenizers depend on the data they are trained on. We built a BPE (Byte Pair Encoding) tokenizer from scratch, trained it on real server logs, and compared it against GPT-4's tokenizer to show that a tokenizer trained on logs uses fewer tokens on log data.

## The idea

When you send text to a large language model, it gets split into tokens, and you pay per token. General-purpose tokenizers like GPT-4's are trained on normal text, so they are not great at log data. If you train a tokenizer directly on logs, it learns common log pieces (like `GET`, `HTTP`, `200`, `/api/`) as single tokens, so the same log line takes fewer tokens.

We wanted to actually see this happen, so the app has two parts.

## The two features

**Train** — you pick a log corpus and a vocabulary size, press Train, and watch the BPE algorithm build its vocabulary. The merges show up one by one (for example `G + E → GE`, then `GE + T → GET`) next to the growing list of tokens.

**Compare** — you paste a log line and it gets tokenized two ways at once: by our trained BPE and by GPT-4's tokenizer (using the `tiktoken` library). You can see both token counts and a colored view of how each one splits the text, plus a small panel that turns the difference into an estimated monthly cost.

## Tech we used

- **Backend**: Python with FastAPI. The BPE algorithm is written by hand. We use `tiktoken` for the GPT-4 tokenizer.
- **Frontend**: React with Vite and plain CSS.
- **Data**: Apache and Linux log samples from [Loghub](https://github.com/logpai/loghub), which are free and real.

It all runs locally. No API keys and no GPU needed.

## How to run it

### Quick setup (Mac/Linux)

```bash
./setup.sh
```

This makes the Python virtual environment, installs the dependencies, and downloads the two log files.

### Manual setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download the log files
mkdir -p corpora
curl -o corpora/apache.txt   https://raw.githubusercontent.com/logpai/loghub/master/Apache/Apache_2k.log
curl -o corpora/linux.txt    https://raw.githubusercontent.com/logpai/loghub/master/Linux/Linux_2k.log

# Frontend
cd ../frontend
npm install
```

### Start it

```bash
# Terminal 1
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Then open <http://localhost:5173>. The backend trains a BPE on the Apache logs when it starts, so the Compare tab works right away.

## API endpoints

| Endpoint | What it does |
|---|---|
| `GET /` | health check, lists the trained tokenizers |
| `GET /corpora` | lists the available log corpora |
| `POST /train` | trains a BPE on a corpus, returns the id and the merges |
| `POST /tokenize` | tokenizes text with a trained tokenizer |
| `POST /tokenize/gpt4` | tokenizes text with GPT-4's tokenizer |

## Folder structure

```
logtokenizer/
├── backend/
│   ├── corpora/          # the log datasets
│   ├── bpe.py            # our BPE algorithm (train, encode, decode)
│   ├── main.py           # FastAPI server
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx       # main app + tab switching
│       ├── TrainTab.jsx  # the Train feature
│       ├── CompareTab.jsx # the Compare feature
│       ├── Token.jsx     # small token chip component
│       └── styles.css
├── setup.sh              # setup script
└── README.md
```

## Credits and sources

- BPE algorithm: Sennrich et al. (2016), based on Gage's 1994 compression idea.
- Log datasets: [Loghub](https://github.com/logpai/loghub) (LogPai).
- GPT-4 tokenizer: OpenAI [`tiktoken`](https://github.com/openai/tiktoken).
