#!/bin/bash
# LogTokenizer setup — one-shot bootstrap for the backend
set -e

cd "$(dirname "$0")/backend"

echo "▸ creating venv…"
python3 -m venv venv

echo "▸ installing dependencies…"
./venv/bin/pip install --quiet -r requirements.txt

echo "▸ downloading Apache logs from Loghub…"
mkdir -p corpora
curl -sSL -o corpora/apache.txt https://raw.githubusercontent.com/logpai/loghub/master/Apache/Apache_2k.log

echo "▸ downloading Linux logs…"
curl -sSL -o corpora/linux.txt https://raw.githubusercontent.com/logpai/loghub/master/Linux/Linux_2k.log

echo "▸ downloading OpenSSH logs…"
curl -sSL -o corpora/openssh.txt https://raw.githubusercontent.com/logpai/loghub/master/OpenSSH/SSH_2k.log

echo ""
echo "✓ Backend setup complete."
echo ""
echo "Next steps:"
echo "  1.  cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "  2.  In another terminal: cd frontend && npm install && npm run dev"
echo "  3.  Open http://localhost:5173"
