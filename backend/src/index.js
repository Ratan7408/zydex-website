import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { config } from './config/index.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import webhookRoutes, { handleOxaPayCryptoWebhook } from './routes/webhook.routes.js';
import publicRoutes from './routes/public.routes.js';
import prisma from './utils/prisma.js';
import { startBackgroundJobs } from './jobs/sync.job.js';
import { ensureDefaultPlans } from './services/plan.service.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
const corsOrigins = new Set(['http://localhost:5173', 'https://zydex.me', 'https://www.zydex.me', 'http://zydex.me', 'http://www.zydex.me']);
try {
  const u = new URL(config.frontendUrl);
  corsOrigins.add(`${u.protocol}//${u.host}`);
} catch {
  corsOrigins.add(config.frontendUrl);
}
app.use(cors({ origin: [...corsOrigins], credentials: true }));

// OxaPay webhook must use raw body for HMAC validation (see docs.oxapay.com/webhook)
app.post(
  '/api/webhooks/crypto',
  express.raw({ type: 'application/json' }),
  handleOxaPayCryptoWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  '/api/',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'zydex-api', version: '1.0.0' });
});

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);

async function bootstrapAdmin() {
  const passwordHash = await bcrypt.hash(config.admin.password, 12);
  const target = config.admin.username;

  const byName = await prisma.user.findUnique({ where: { username: target } });
  if (byName) {
    await prisma.user.update({
      where: { id: byName.id },
      data: {
        role: 'ADMIN',
        passwordHash,
        isBlocked: false,
        ...(byName.email ? {} : { email: config.admin.email }),
      },
    });
    const others = await prisma.user.findMany({
      where: { role: 'ADMIN', NOT: { id: byName.id } },
    });
    for (const o of others) {
      await prisma.user.delete({ where: { id: o.id } });
    }
    console.log(`Admin synced: ${target}`);
  } else {
    const legacy = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (legacy) {
      await prisma.user.update({
        where: { id: legacy.id },
        data: { username: target, passwordHash, email: config.admin.email, isBlocked: false },
      });
      console.log(`Admin renamed to: ${target}`);
    } else {
      await prisma.user.create({
        data: {
          username: target,
          email: config.admin.email,
          passwordHash,
          role: 'ADMIN',
          wallet: { create: { balance: 0 } },
        },
      });
      console.log(`Admin user created: ${target}`);
    }
  }

  await ensureDefaultPlans();
}

async function start() {
  try {
    await prisma.$connect();
    await bootstrapAdmin();
    startBackgroundJobs();
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Zydex API running on http://0.0.0.0:${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
