#!/bin/bash
set -e

PROJECT_DIR="/www/wwwroot/iinm"
LOG_FILE="/var/log/iinm-deploy.log"

exec >> "$LOG_FILE" 2>&1

echo "=========================================="
echo "Deploy started: $(date)"
echo "=========================================="

cd "$PROJECT_DIR"

# Pull latest code as www user
sudo -u www git fetch origin
sudo -u www git reset --hard origin/main
sudo -u www git clean -fd

# Deploy backend
bash "$PROJECT_DIR/scripts/deploy-backend.sh"

# Deploy frontend
bash "$PROJECT_DIR/scripts/deploy-frontend.sh"

# Restart services
# If using systemd:
sudo systemctl restart iinm-backend
sudo systemctl restart iinm-frontend

# If using AAPanel Python/Node Project managers, comment above and use panel UI/API.

echo "=========================================="
echo "Deploy completed: $(date)"
echo "=========================================="
