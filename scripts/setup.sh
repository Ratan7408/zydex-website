#!/bin/bash
set -e

echo "=== Zydex Portal Setup ==="

# PostgreSQL
if ! su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='zydex'\"" 2>/dev/null | grep -q 1; then
  su - postgres -c "psql -c \"CREATE USER zydex WITH PASSWORD 'zydex_secret';\"" 2>/dev/null || true
fi
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='zydexweb'\"" 2>/dev/null | grep -q 1 || \
  su - postgres -c "createdb -O zydex zydexweb"

# Copy env if missing
if [ ! -f /root/zydexweb/backend/.env ]; then
  cp /root/zydexweb/.env.example /root/zydexweb/backend/.env
  # Set Magnus DB password from server config
  MAGNUS_PASS=$(grep dbpass /etc/asterisk/res_config_mysql.conf | cut -d= -f2 | tr -d ' ')
  sed -i "s|your_magnus_db_password|${MAGNUS_PASS}|" /root/zydexweb/backend/.env
  sed -i "s|change-this-to-a-long-random-string|$(openssl rand -hex 32)|" /root/zydexweb/backend/.env
  echo "Created backend/.env - EDIT Magnus API keys!"
fi

cd /root/zydexweb/backend
npm install
npx prisma generate
npx prisma db push

cd /root/zydexweb/frontend
npm install
npm run build

echo ""
echo "=== Setup complete ==="
echo "1. Create Magnus API key: Magnus Admin > Configuration > API"
echo "2. Edit /root/zydexweb/backend/.env with MAGNUS_API_KEY and MAGNUS_API_SECRET"
echo "3. Run: cd /root/zydexweb/backend && npm start"
echo "4. Configure Apache (see README.md)"
