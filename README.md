# Zydex — VOIP Self-Service Portal

Modern SaaS portal for your Magnus Billing clients. Users sign up on your website, get SIP credentials automatically, manage balance, view CDR, and top up via crypto.

## Architecture

```
                    ┌─────────────────┐
   Your Domain  ──► │  Apache/Nginx   │
   (DNS A record)   │  Static React   │
                    │  + /api proxy   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        Zydex API      PostgreSQL     Magnus Billing
        (Node.js)      (portal DB)    (MySQL + API)
```

## Quick Start

```bash
chmod +x /root/zydexweb/scripts/setup.sh
bash /root/zydexweb/scripts/setup.sh
```

### 1. Magnus API Key (Required)

1. Log into Magnus Billing admin: `http://YOUR_SERVER_IP/mbilling`
2. Go to **Configuration → API** (or Module API)
3. Create new API with permissions: **create, read, update**
4. Copy API Key and Secret into `/root/zydexweb/backend/.env`:

```env
MAGNUS_API_KEY=your_key
MAGNUS_API_SECRET=your_secret
MAGNUS_URL=http://127.0.0.1/mbilling
```

5. Add your server IP to API restriction (or leave empty for localhost)

### 2. Start API

```bash
cd /root/zydexweb/backend
npm start
# Or install systemd service:
cp /root/zydexweb/scripts/zydex-api.service /etc/systemd/system/
systemctl enable --now zydex-api
```

### 3. Connect Your Domain (DNS)

| Type | Name | Value |
|------|------|-------|
| A | portal (or @) | YOUR_SERVER_IP |

Then configure Apache:

```bash
cp /root/zydexweb/scripts/apache-zydex.conf /etc/apache2/sites-available/zydex.conf
# Edit ServerName to your domain
a2ensite zydex
a2enmod proxy proxy_http rewrite
systemctl reload apache2
```

For HTTPS: `certbot --apache -d portal.yourdomain.com`

## Default Admin Login

After first start:
- **Username:** `admin` (from `.env` ADMIN_USERNAME)
- **Password:** `ChangeMe123!` (change in `.env` immediately)

## Features

### Client Portal
- Sign up / Login (synced with Magnus Billing)
- Dashboard with balance, calls, deposits
- SIP credentials display
- CDR reports
- Call rates (with markup)
- Crypto fund top-up (NOWPayments-ready)

### Admin Panel (`/admin`)
- User management
- Transaction overview
- Live calls monitor
- Announcements
- Rate markup system

### Magnus Integration
- Auto-create SIP users on signup
- Balance sync from Magnus
- CDR from Magnus database
- Credit refill on crypto payment

### Crypto Payments
Configure in `.env`:
```env
CRYPTO_PROVIDER=nowpayments
CRYPTO_API_KEY=your_key
CRYPTO_WEBHOOK_URL=https://yourdomain.com/api/webhooks/crypto
```

Webhook endpoint: `POST /api/webhooks/crypto`

## Production build (low RAM / SSH stability)

On servers with ~2GB RAM and no swap, an unbounded `npm run build` can trigger the Linux OOM killer and drop your SSH session. Use the deploy script (sets a Node heap cap) or build from `frontend/` where `npm run build` already limits memory:

```bash
bash /root/zydexweb/scripts/deploy-all.sh
# Optional: add 2GB swap first if builds still fail
bash /root/zydexweb/scripts/setup-swap.sh
```

## Development

```bash
# Terminal 1 - API
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000

## Project Structure

```
zydexweb/
├── backend/          # Express API + Prisma
│   ├── src/
│   │   ├── routes/   # auth, user, admin, webhooks
│   │   └── services/ # magnus, crypto
│   └── prisma/       # PostgreSQL schema
├── frontend/         # React + Tailwind + Vite
│   └── src/pages/    # Login, Dashboard, CDR, etc.
├── scripts/          # setup, apache, systemd
└── README.md
```

## Portal URL (current server)

| Service | URL |
|---------|-----|
| Client portal | `http://YOUR_SERVER_IP:8080` |
| API health | `http://YOUR_SERVER_IP:8080/api/health` |
| Magnus admin | `http://YOUR_SERVER_IP/` |

## What You Need Checklist

- [x] Magnus Billing installed (you have this)
- [ ] Magnus API key created (required for signup)
- [x] PostgreSQL running
- [ ] Domain DNS pointing to server
- [x] Apache portal on port 8080
- [ ] Crypto gateway API keys (optional, for auto top-up)
- [ ] SMTP / Telegram for notifications (optional)

## Telegram

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot that sends **admin alerts** to your channel |
| `TELEGRAM_CHAT_ID` | Channel/group ID (e.g. `-1001414108317`) — new signups, deposits, low balance |
| `TELEGRAM_SUPPORT_URL` | Public link for users (default `https://t.me/zydex_p1`) — Tutorials + floating button |

Add the bot as **admin** in your Telegram channel so it can post messages.

## Security Notes

- Change `JWT_SECRET` and `ADMIN_PASSWORD` in production
- Use HTTPS for your domain
- Restrict Magnus API to server IP
- Never commit `.env` to git

## Support

Magnus Billing docs: https://www.magnusbilling.org  
API wrapper: https://github.com/magnussolution/magnusbilling-api
