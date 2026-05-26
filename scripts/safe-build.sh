#!/bin/bash
# Low-memory frontend build — use this over raw "npm run build" on 2GB servers.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! swapon --show 2>/dev/null | grep -q swapfile; then
  echo "[safe-build] Enabling 2GB swap first..."
  bash "$ROOT/scripts/setup-swap.sh"
fi

# Prefer swap under memory pressure (reduces OOM killing sshd/node)
if [ -w /proc/sys/vm/swappiness ]; then
  echo 60 > /proc/sys/vm/swappiness 2>/dev/null || true
fi

echo "[safe-build] Memory before build:"
free -h

cd "$ROOT/frontend"
export NODE_OPTIONS="--max-old-space-size=384"
export UV_THREADPOOL_SIZE=2
export CI=1

echo "[safe-build] Starting vite build..."
npm run build

echo "[safe-build] Done."
