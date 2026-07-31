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

# Pull latest code from main branch — force clean state
git fetch origin
git reset --hard origin/main
git clean -fd   # remove untracked files that may block builds

# ─── BACKEND ───────────────────────────────
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

# Run database migrations (fail-safe — won't break deploy if migration fails)
cd "$BACKEND_DIR"
"$PYTHON_BIN" -m alembic upgrade head || echo "WARNING: alembic migration failed, continuing deploy..."

# Restart backend (gunicorn) — kill old process, start fresh
pkill -f "gunicorn.*main:app" || true
sleep 2
cd "$BACKEND_DIR"
nohup "$GUNICORN_BIN" -w 4 -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:2007 > /var/log/iinm-backend.log 2>&1 &
echo "Backend restarted (PID $!)"

# ─── FRONTEND ──────────────────────────────
cd "$FRONTEND_DIR"

# Remove old .next build folder — CRITICAL for fresh build
rm -rf .next

# Install dependencies fresh
npm install

# Build production
npm run build

# Restart frontend Next.js server — kill old, start fresh
pkill -f "next start" || true
sleep 2
cd "$FRONTEND_DIR"
nohup npx next start -p 2021 > /var/log/iinm-frontend.log 2>&1 &
echo "Frontend restarted (PID $!)"

echo "=========================================="
echo "AAPanel deploy completed: $(date)"
echo "=========================================="
