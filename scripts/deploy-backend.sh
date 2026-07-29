#!/bin/bash
set -e

PROJECT_DIR="/www/wwwroot/iinm"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_FILE="/var/log/iinm-backend-deploy.log"

exec >> "$LOG_FILE" 2>&1

echo "==== Backend deploy started: $(date) ===="

cd "$BACKEND_DIR"

# Create virtual environment if missing
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Database migration (MUST backup before enabling in production)
# alembic upgrade head

echo "==== Backend deploy completed: $(date) ===="
