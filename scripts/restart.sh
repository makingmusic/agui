#!/usr/bin/env bash
# Restart both services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/stop.sh"
"$SCRIPT_DIR/start.sh"
