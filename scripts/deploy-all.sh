#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# --- Memory safety (prevents SSH drop during npm/vite build on 2GB RAM) ---
if ! swapon --show 2>/dev/null | grep -q swapfile; then
  echo "=== Enabling swap ==="
  bash "$ROOT/scripts/setup-swap.sh"
fi

AVAIL_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
if [ "$AVAIL_KB" -lt 350000 ] 2>/dev/null; then
  echo "=== Low RAM (${AVAIL_KB}KB free) — syncing caches before build ==="
  sync
fi

echo "=== Building frontend (safe mode: 320MB heap, low priority) ==="
cd "$ROOT/frontend"
export NODE_OPTIONS="--max-old-space-size=320"
export UV_THREADPOOL_SIZE=2
export CI=1

# nice + ionice reduces SSH/session kill risk under memory pressure
nice -n 15 ionice -c 3 npm run build

echo "=== Deploying to /var/www/zydex-portal ==="
rsync -a --delete dist/ /var/www/zydex-portal/
chown -R www-data:www-data /var/www/zydex-portal

echo "=== Restarting services ==="
systemctl reload apache2
systemctl restart zydex-api

echo "=== Done. Open http://YOUR_IP/portal/ (Ctrl+F5) ==="
grep -q "ZYDEX\|zydex\|portal" /var/www/zydex-portal/assets/*.js 2>/dev/null && echo "VERIFY OK: deployed" || echo "VERIFY: check dist"
