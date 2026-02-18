#!/usr/bin/env bash
# Stop the backend and frontend services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"

stop_service() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping $name (PID $pid)..."
      kill "$pid"
      rm -f "$pid_file"
    else
      echo "$name is not running (stale PID $pid)."
      rm -f "$pid_file"
    fi
  else
    echo "$name PID file not found — may not be running."
  fi
}

stop_service "backend"
stop_service "frontend"

echo ""
echo "Done. Both services have been stopped."
echo ""
