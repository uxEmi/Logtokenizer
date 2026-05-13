import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tiktoken

import bpe

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

current_tokenizer = None
gpt4_encoding = tiktoken.get_encoding("cl100k_base")
CORPORA_DIR = os.path.join(os.path.dirname(__file__), "corpora")
print(CORPORA_DIR)

class TrainRequest(BaseModel):
    corpus_name: str
    vocab_size: int = 2000

class TokenizeRequest(BaseModel):
    text: str

class Gpt4TokenizeRequest(BaseModel):
    text: str


@app.post("/train")
def train(req: TrainRequest):
    global current_tokenizer

    corpus_path = os.path.join(CORPORA_DIR, f"{req.corpus_name}.txt")
    if not os.path.exists(corpus_path):
        raise HTTPException(status_code=404, detail=f"Corpus '{req.corpus_name}' not found")
    with open(corpus_path) as f:
        corpus = f.read()

    current_tokenizer = bpe.train(corpus, vocab_size=req.vocab_size)

    real_tokens = [t for t in current_tokenizer["vocab"].keys() if not t.startswith("[")]
    vocab_sample = sorted(
        [t for t in real_tokens if len(t) > 1],
        key=lambda x: -len(x),
    )[:80]

    longest = max(real_tokens, key=len)
    avg_len = round(sum(len(t) for t in real_tokens) / len(real_tokens), 2)
    length_distribution = {}
    for t in real_tokens:
        bucket = str(len(t)) if len(t) < 6 else "6+"
        length_distribution[bucket] = length_distribution.get(bucket, 0) + 1
    first_merge = list(current_tokenizer["merges"][0]) if current_tokenizer["merges"] else None
    last_merge = list(current_tokenizer["merges"][-1]) if current_tokenizer["merges"] else None

    return {
        "merges": current_tokenizer["merges"],
        "vocab_size": len(current_tokenizer["vocab"]),
        "vocab_sample": vocab_sample,
        "corpus_chars": len(corpus),
        "stats": {
            "longest_token": longest,
            "avg_token_length": avg_len,
            "length_distribution": length_distribution,
            "first_merge": first_merge,
            "last_merge": last_merge,
        },
    }


@app.post("/tokenize")
def tokenize(req: TokenizeRequest):
    if current_tokenizer is None:
        raise HTTPException(status_code=404, detail="No tokenizer trained yet")
    ids = bpe.encode(req.text, current_tokenizer["vocab"], current_tokenizer["merges"])
    id_to_token = {i: t for t, i in current_tokenizer["vocab"].items()}
    tokens = [{"id": i, "text": id_to_token.get(i, "")} for i in ids]
    return {"tokens": tokens, "count": len(tokens)}


@app.post("/tokenize/gpt4")
def tokenize_gpt4(req: Gpt4TokenizeRequest):
    ids = gpt4_encoding.encode(req.text)
    tokens = [{"id": i, "text": gpt4_encoding.decode([i])} for i in ids]
    return {"tokens": tokens, "count": len(tokens)}
