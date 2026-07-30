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

# Detect aaPanel Python environment
AAPANEL_PYENV=""
for PYENV in "/www/server/pyporject_evn/versions/3.11.15" "/www/server/pyproject_evn/versions/3.11.15"; do
  if [ -d "$PYENV" ]; then
    AAPANEL_PYENV="$PYENV"
    break
  fi
done

if [ -n "$AAPANEL_PYENV" ]; then
  PYTHON_BIN="$AAPANEL_PYENV/bin/python"
  GUNICORN_BIN="$AAPANEL_PYENV/bin/gunicorn"
else
  PYTHON_BIN=$(command -v python3 || command -v python)
  GUNICORN_BIN=$(command -v gunicorn)
fi

"$PYTHON_BIN" -m pip install --upgrade pip || true
"$PYTHON_BIN" -m pip install -r requirements.txt

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
  nohup "$GUNICORN_BIN" -w 4 -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:2007 > /var/log/iinm-backend.log 2>&1 &
fi

# Restart frontend Next.js server
cd "$FRONTEND_DIR"
pkill -f "next start" || true
sleep 2
nohup npx next start -p 2021 > /var/log/iinm-frontend.log 2>&1 &

echo "=========================================="
echo "AAPanel deploy completed: $(date)"
echo "=========================================="
