#!/bin/bash
set -e

REMOTE="shipday-scrapper"
REMOTE_DIR="clickhouse"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Syncing files to $REMOTE..."
rsync -avP \
  --exclude='.git' \
  --exclude='venv' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.env' \
  "$LOCAL_DIR/" "$REMOTE:$REMOTE_DIR"

echo ""
echo "==> Running remote deploy..."
ssh "$REMOTE" bash << 'EOF'
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd ~/clickhouse

echo "--> Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt -q

echo "--> Installing frontend dependencies..."
cd analytics-ui
npm install --silent
cd ..

echo "--> Restarting services..."
pm2 restart analytics-backend analytics-frontend

echo "--> Waiting for startup..."
sleep 3
pm2 list
EOF

echo ""
echo "==> Deploy complete."
echo "    Backend  → http://54.185.23.110:8000"
echo "    Frontend → http://54.185.23.110:5173"
