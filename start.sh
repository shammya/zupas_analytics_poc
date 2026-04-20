#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend..."
source "$ROOT/venv/bin/activate"
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting frontend..."
cd "$ROOT/analytics-ui"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend  → http://localhost:8000"
echo "Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM
wait
