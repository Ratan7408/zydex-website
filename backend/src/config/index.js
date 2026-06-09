import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'zydex-dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  magnus: {
    url: (process.env.MAGNUS_URL || 'http://127.0.0.1/mbilling').replace(/\/$/, ''),
    apiKey: process.env.MAGNUS_API_KEY || '',
    apiSecret: process.env.MAGNUS_API_SECRET || '',
    defaultPlanId: parseInt(process.env.MAGNUS_DEFAULT_PLAN_ID || '1', 10),
    premiumPlanId: parseInt(process.env.MAGNUS_PREMIUM_PLAN_ID || '0', 10) || null,
    db: {
      host: process.env.MAGNUS_DB_HOST || '127.0.0.1',
      database: process.env.MAGNUS_DB_NAME || 'mbilling',
      user: process.env.MAGNUS_DB_USER || 'mbillingUser',
      password: process.env.MAGNUS_DB_PASS || '',
    },
  },
  crypto: {
    provider: (process.env.CRYPTO_PROVIDER || 'oxapay').trim().toLowerCase(),
    apiKey: (process.env.CRYPTO_API_KEY || '').trim(),
    ipnSecret: (process.env.CRYPTO_IPN_SECRET || '').trim(),
    webhookUrl: (process.env.CRYPTO_WEBHOOK_URL || '').trim(),
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  sip: {
    server: process.env.SIP_SERVER || process.env.VOIP_SERVER_IP || '103.252.119.18',
    /** If set, applied to new Magnus SIP accounts that have no Caller ID (many carriers reject with 403). */
    defaultOutboundCallerId: (process.env.DEFAULT_OUTBOUND_CALLER_ID || '').replace(/\D/g, ''),
  },
  signupBonus: parseFloat(process.env.SIGNUP_BONUS_CREDIT || '1'),
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
    email: process.env.ADMIN_EMAIL || 'admin@zydex.com',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@zydex.com',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    supportUrl: process.env.TELEGRAM_SUPPORT_URL || 'https://t.me/zydex_p1',
  },
};
