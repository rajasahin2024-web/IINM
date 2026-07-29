#!/bin/bash
set -e

PROJECT_DIR="/www/wwwroot/iinm"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_FILE="/var/log/iinm-frontend-deploy.log"

exec >> "$LOG_FILE" 2>&1

echo "==== Frontend deploy started: $(date) ===="

cd "$FRONTEND_DIR"

# Install dependencies
npm install

# Build production bundle
npm run build

echo "==== Frontend deploy completed: $(date) ===="
