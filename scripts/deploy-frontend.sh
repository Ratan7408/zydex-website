#!/bin/bash
set -e
cd /root/zydexweb/frontend
bash "$(dirname "$0")/setup-swap.sh" 2>/dev/null || true
NODE_OPTIONS="--max-old-space-size=384" UV_THREADPOOL_SIZE=2 npm run build
rsync -a --delete dist/ /var/www/zydex-portal/
chown -R www-data:www-data /var/www/zydex-portal
systemctl reload apache2
echo "Deployed — open http://YOUR_IP/portal/"
