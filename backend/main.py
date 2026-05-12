"""
LogTokenizer backend — FastAPI server.

Run with:
    uvicorn main:app --reload

Endpoints:
    GET  /                  — health check
    GET  /corpora           — list available corpora
    POST /train             — train a custom BPE tokenizer
    POST /tokenize          — tokenize text with a trained tokenizer
    POST /tokenize/gpt4     — tokenize text with GPT-4's tokenizer
"""

import os
import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tiktoken

import bpe

app = FastAPI(title="LogTokenizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

trained_tokenizers: dict = {}
gpt4_encoding = tiktoken.get_encoding("cl100k_base")
CORPORA_DIR = os.path.join(os.path.dirname(__file__), "corpora")


# ---------------------------------------------------------------------------
# Pre-train at startup so the Compare tab works instantly
# ---------------------------------------------------------------------------

@app.on_event("startup")
def pretrain():
    """Pre-train a BPE on Apache logs so users don't have to wait."""
    apache_path = os.path.join(CORPORA_DIR, "apache.txt")
    if os.path.exists(apache_path):
        with open(apache_path) as f:
            corpus = f.read()
        result = bpe.train(corpus, vocab_size=500)
        trained_tokenizers["apache-bpe-default"] = result
        print(f"[startup] Pre-trained Apache BPE: {len(result['vocab'])} tokens")
    else:
        print(f"[startup] WARNING: {apache_path} not found — Train tab will fail until you download the corpus")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TrainRequest(BaseModel):
    corpus_name: str
    vocab_size: int = 500

class TokenizeRequest(BaseModel):
    tokenizer_id: str
    text: str

class Gpt4TokenizeRequest(BaseModel):
    text: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def health():
    return {
        "status": "ok",
        "trained_tokenizers": list(trained_tokenizers.keys()),
    }


@app.get("/corpora")
def list_corpora():
    """List all available corpora (.txt files in the corpora directory)."""
    if not os.path.isdir(CORPORA_DIR):
        return {"corpora": []}
    files = [f for f in os.listdir(CORPORA_DIR) if f.endswith(".txt")]
    out = []
    for f in sorted(files):
        path = os.path.join(CORPORA_DIR, f)
        size = os.path.getsize(path)
        out.append({
            "name": f.replace(".txt", ""),
            "size_kb": round(size / 1024, 1),
        })
    return {"corpora": out}


@app.post("/train")
def train(req: TrainRequest):
    """Train a BPE tokenizer on the chosen corpus."""
    corpus_path = os.path.join(CORPORA_DIR, f"{req.corpus_name}.txt")
    if not os.path.exists(corpus_path):
        raise HTTPException(status_code=404, detail=f"Corpus '{req.corpus_name}' not found")
    with open(corpus_path) as f:
        corpus = f.read()

    result = bpe.train(corpus, vocab_size=req.vocab_size)
    tokenizer_id = str(uuid.uuid4())
    trained_tokenizers[tokenizer_id] = result

    # Build a sample of the vocab to show in the UI
    vocab_sample = sorted(
        [t for t in result["vocab"].keys() if len(t) > 1 and not t.startswith("[")],
        key=lambda x: -len(x),
    )[:80]

    return {
        "tokenizer_id": tokenizer_id,
        "merges": result["merges"],
        "vocab_size": len(result["vocab"]),
        "vocab_sample": vocab_sample,
        "corpus_chars": len(corpus),
    }


@app.post("/tokenize")
def tokenize(req: TokenizeRequest):
    """Tokenize text using one of our trained tokenizers."""
    if req.tokenizer_id not in trained_tokenizers:
        raise HTTPException(status_code=404, detail="Tokenizer not found")
    tok = trained_tokenizers[req.tokenizer_id]
    ids = bpe.encode(req.text, tok["vocab"], tok["merges"])
    id_to_token = {i: t for t, i in tok["vocab"].items()}
    tokens = [{"id": i, "text": id_to_token.get(i, "")} for i in ids]
    return {"tokens": tokens, "count": len(tokens)}


@app.post("/tokenize/gpt4")
def tokenize_gpt4(req: Gpt4TokenizeRequest):
    """Tokenize text using GPT-4's tokenizer (tiktoken)."""
    ids = gpt4_encoding.encode(req.text)
    tokens = [{"id": i, "text": gpt4_encoding.decode([i])} for i in ids]
    return {"tokens": tokens, "count": len(tokens)}
