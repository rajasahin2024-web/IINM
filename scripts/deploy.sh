#!/bin/bash
set -e

PROJECT_DIR="/www/wwwroot/IINM"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_FILE="/var/log/iinm-aapanel-deploy.log"

exec >> "$LOG_FILE" 2>&1

echo "=========================================="
echo "AAPanel deploy started: $(date)"
echo "=========================================="

cd "$PROJECT_DIR"

# Pull latest code from main branch
git fetch origin
git reset --hard origin/main

# Deploy backend dependencies
cd "$BACKEND_DIR"

# Activate venv if it exists, otherwise use the active python (aaPanel env)
if [ -d "venv" ]; then
  source venv/bin/activate
fi

pip install --upgrade pip
pip install -r requirements.txt

# Uncomment only after testing migrations with a backup
# alembic upgrade head

# Build production frontend
cd "$FRONTEND_DIR"
npm install
npm run build

# Restart backend (gunicorn): try graceful reload, else start
cd "$BACKEND_DIR"
GUNICORN_MASTER=$(pgrep -f "gunicorn: master" | head -n1)
if [ -n "$GUNICORN_MASTER" ]; then
  echo "Reloading gunicorn master (PID $GUNICORN_MASTER)"
  kill -HUP "$GUNICORN_MASTER"
else
  echo "Gunicorn master not found; starting new instance..."
  nohup gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:2007 > /var/log/iinm-backend.log 2>&1 &
fi

# Restart frontend Next.js server
cd "$FRONTEND_DIR"
pkill -f "next start" || true
sleep 2
nohup npx next start -p 2021 > /var/log/iinm-frontend.log 2>&1 &

echo "=========================================="
echo "AAPanel deploy completed: $(date)"
echo "=========================================="
