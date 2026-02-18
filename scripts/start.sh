#!/usr/bin/env bash
# Start both the Python backend and Next.js frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_DIR="$ROOT_DIR/scripts/.pids"

mkdir -p "$PID_DIR"

# ── Check for ANTHROPIC_API_KEY ─────────────────────────────────────────────
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "  ERROR: ANTHROPIC_API_KEY is not set."
  echo ""
  echo "  Export your key before running:"
  echo "    export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
  exit 1
fi

# ── Backend ──────────────────────────────────────────────────────────────────
echo "Starting backend (FastAPI on port 8000)..."

BACKEND_DIR="$ROOT_DIR/backend"

# Create and activate a venv if one doesn't exist yet
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "  Creating Python virtual environment..."
  python3 -m venv "$BACKEND_DIR/.venv"
fi

source "$BACKEND_DIR/.venv/bin/activate"

# Install dependencies if needed
pip install -q -r "$BACKEND_DIR/requirements.txt"

# Launch uvicorn in the background, write PID
cd "$BACKEND_DIR"
uvicorn server:app --host 0.0.0.0 --port 8000 > "$ROOT_DIR/scripts/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_DIR/backend.pid"
echo "  Backend PID: $BACKEND_PID  (logs: scripts/backend.log)"

deactivate

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "Starting frontend (Next.js on port 3000)..."

FRONTEND_DIR="$ROOT_DIR/frontend"

# Install Node dependencies if node_modules is missing
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "  Installing Node dependencies..."
  cd "$FRONTEND_DIR" && npm install
fi

cd "$FRONTEND_DIR"
npm run dev > "$ROOT_DIR/scripts/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"
echo "  Frontend PID: $FRONTEND_PID  (logs: scripts/frontend.log)"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "  Both services are starting up."
echo "  Open http://localhost:3000 in your browser."
echo ""
echo "  To stop everything: ./scripts/stop.sh"
echo "  To tail logs:       tail -f scripts/backend.log scripts/frontend.log"
echo ""
