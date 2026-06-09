import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { magnusService } from '../services/magnus.service.js';
import prisma from '../utils/prisma.js';
import { authRequired, loadUser } from '../middleware/auth.js';
import { notificationService } from '../services/notification.service.js';
import { formatPlanRow } from '../constants/plans.js';

const router = Router();

const signupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(4).max(64),
  confirmPassword: z.string().optional(),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().email().optional()
  ),
  firstname: z.string().min(1, 'First name is required'),
  lastname: z.string().optional(),
  id_plan: z.coerce.number().int().positive('Please select a plan'),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.get('/plans', async (req, res) => {
  const plans = await prisma.signupPlan.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json({ rows: plans.map(formatPlanRow) });
});

router.post('/signup', async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);

    if (data.confirmPassword && data.confirmPassword !== data.password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const plan = await prisma.signupPlan.findFirst({
      where: { magnusPlanId: data.id_plan, active: true },
    });
    if (!plan) {
      return res.status(400).json({ error: 'Invalid or inactive plan selected' });
    }

    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const signupBonus = config.signupBonus > 0 ? config.signupBonus : 0;
    const magnusResult = await magnusService.createUser({
      username: data.username,
      password: data.password,
      email: data.email || `${data.username}@zydex.local`,
      firstname: data.firstname,
      lastname: data.lastname || '',
      id_plan: data.id_plan,
      credit: 0,
    });

    if (!magnusResult?.success) {
      const err = magnusResult?.errors || magnusResult?.msg || 'Magnus user creation failed';
      const msg =
        typeof err === 'string'
          ? err
          : typeof err === 'object'
            ? Object.values(err).flat().join(', ') || JSON.stringify(err)
            : 'Magnus user creation failed';
      return res.status(400).json({ error: msg });
    }

    const magnusUser = magnusResult.data;
    const magnusUserId = magnusUser?.id != null ? parseInt(magnusUser.id, 10) : null;
    const passwordHash = await bcrypt.hash(data.password, 12);

    let balance = 0;
    let sipCallerId = null;
    let magnusRow = null;
    if (magnusUserId) {
      magnusRow = await magnusService.getUserByUsername(data.username);
      if (magnusRow?.sip_id) {
        const cidResult = await magnusService.ensureOutboundCallerId(magnusRow.sip_id);
        if (cidResult.ok && cidResult.callerId) {
          sipCallerId = cidResult.callerId;
        } else if (!cidResult.alreadySet && cidResult.reason === 'no_default_callerid') {
          console.warn(`Signup: no Caller ID for ${data.username} — set DEFAULT_OUTBOUND_CALLER_ID`);
        }
      }
      if (signupBonus > 0) {
        const refill = await magnusService.grantSignupBonus(magnusUserId, signupBonus);
        if (!refill.ok) {
          console.error('Signup refill failed:', refill.error);
        }
      }
      balance = await magnusService.getBalance(magnusUserId);
    }

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email || magnusUser?.email,
        passwordHash,
        magnusUserId,
        magnusUsername: data.username,
        role: 'USER',
        wallet: { create: { balance } },
        sipAccounts: {
          create: {
            magnusSipId: magnusRow?.sip_id ?? null,
            username: data.username,
            secret: data.password,
            host: 'dynamic',
            callerId: sipCallerId,
          },
        },
      },
      include: { wallet: true, sipAccounts: true },
    });

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    await notificationService
      .notifyAdmin(
        `✅ New signup\nUser: ${data.username}\nPlan: ${plan.name}\nBalance: $${balance.toFixed(2)}`
      )
      .catch(() => {});

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance,
        sip: { username: data.username, secret: data.password },
      },
      message: signupBonus > 0
        ? `Account created! $${signupBonus.toFixed(2)} test credit added. Check SIP Credentials for your server IP.`
        : 'Account created. Use these SIP credentials in your softphone.',
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const msg = err.errors.map((e) => e.message).join('. ');
      return res.status(400).json({ error: msg || 'Invalid form data' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    let user = await prisma.user.findUnique({
      where: { username },
      include: { wallet: true, sipAccounts: true },
    });

    // Portal-only admin (no Magnus account required)
    if (user?.role === 'ADMIN') {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      if (user.isBlocked) {
        await prisma.user.update({ where: { id: user.id }, data: { isBlocked: false } });
        user.isBlocked = false;
      }
      await prisma.wallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0 },
        update: {},
      });
      const token = jwt.sign(
        { sub: user.id, username: user.username, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: 0,
          magnusUserId: null,
        },
      });
    }

    const magnusUser = await magnusService.validateLogin(username, password);
    if (!magnusUser) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: {
          username,
          passwordHash,
          magnusUserId: magnusUser.id,
          magnusUsername: username,
          role: 'USER',
          wallet: { create: { balance: magnusUser.credit || 0 } },
          sipAccounts: {
            create: {
              magnusSipId: magnusUser.sip_id,
              username: magnusUser.sip_name || username,
              secret: magnusUser.sip_secret,
              callerId: magnusUser.callerid,
            },
          },
        },
        include: { wallet: true, sipAccounts: true },
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    if (magnusUser.sip_id) {
      await magnusService.ensureOutboundCallerId(magnusUser.sip_id);
    }

    const balance = await magnusService.getBalance(magnusUser.id);
    const magnusFresh = await magnusService.getUserByUsername(username);

    await prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance },
      update: { balance },
    });

    if (magnusFresh?.sip_id) {
      await prisma.sipAccount.updateMany({
        where: { userId: user.id },
        data: {
          magnusSipId: magnusFresh.sip_id,
          callerId: magnusFresh.callerid || null,
          host: magnusFresh.host || 'dynamic',
        },
      });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance,
        magnusUserId: magnusUser.id,
        sip: {
          username: magnusFresh?.sip_name || username,
          secret: magnusFresh?.sip_secret,
          host: magnusFresh?.host || 'dynamic',
          callerId: magnusFresh?.callerid,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

router.get('/me', authRequired, loadUser, async (req, res) => {
  const user = req.dbUser;
  let balance = 0;
  let stats = { totalCalls: 0, totalDuration: 0, totalDeposits: 0 };
  if (user.role === 'ADMIN' && !user.magnusUserId) {
    // Portal admin only — no Magnus linkage
  } else if (user.magnusUserId) {
    balance = await magnusService.getBalance(user.magnusUserId);
    Object.assign(stats, await magnusService.getCallStats(user.username));
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      balance,
      ...stats,
    },
  });
});

export default router;
