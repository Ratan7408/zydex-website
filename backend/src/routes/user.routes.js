import { Router } from 'express';
import { z } from 'zod';
import { authRequired, loadUser } from '../middleware/auth.js';
import { magnusService, normalizeOutboundCallerId } from '../services/magnus.service.js';
import { cryptoService } from '../services/crypto.service.js';
import { config } from '../config/index.js';
import prisma from '../utils/prisma.js';
import { formatPlanRow } from '../constants/plans.js';

const router = Router();
router.use(authRequired, loadUser);

const switchPlanSchema = z.object({
  id_plan: z.coerce.number().int().positive('Please select a plan'),
});

router.get('/dashboard', async (req, res) => {
  const user = req.dbUser;
  const balance = user.magnusUserId
    ? await magnusService.getBalance(user.magnusUserId)
    : 0;
  const stats = await magnusService.getCallStats(user.username);
  const magnusUser = await magnusService.getUserByUsername(user.username);
  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const signupPlans = await prisma.signupPlan.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const magnusPlans = await magnusService.getPlans();
  const currentSignupPlan = signupPlans.find((p) => p.magnusPlanId === magnusUser?.id_plan);
  const magnusPlanRow = magnusUser?.id_plan
    ? magnusPlans.find((p) => p.id === magnusUser.id_plan)
    : null;
  const planName = currentSignupPlan?.name ?? magnusPlanRow?.name ?? null;
  const planManagedByMagnus = !!(magnusUser?.id_plan && !currentSignupPlan);

  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance },
    update: { balance },
  });

  if (magnusUser?.sip_id) {
    await prisma.sipAccount.updateMany({
      where: { userId: user.id },
      data: {
        magnusSipId: magnusUser.sip_id,
        callerId: magnusUser.callerid || null,
        host: magnusUser.host || 'dynamic',
      },
    });
  }

  res.json({
    greeting: `Welcome back, ${user.username}!`,
    balance,
    planName,
    currentPlanId: magnusUser?.id_plan ?? null,
    currentPlan: currentSignupPlan ? formatPlanRow(currentSignupPlan) : null,
    planManagedByMagnus,
    accountStatus: magnusUser?.active === 1 ? 'Active' : 'Inactive',
    totalCalls: stats.totalCalls,
    totalDeposits: stats.totalDeposits,
    announcements,
  });
});

router.get('/cdr', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const cdr = await magnusService.getCdr(req.dbUser.username, limit);
  const formatDestination = (name) => {
    if (!name) return 'Unknown';
    const n = String(name).toLowerCase();
    if (n === 'usa' || n.includes('united states')) {
      return 'United States / Canada / Puerto Rico';
    }
    return String(name).replace(/\b\w/g, (c) => c.toUpperCase());
  };

  res.json({
    rows: cdr.map((r) => ({
      id: r.id,
      dateTime: r.starttime,
      username: r.username,
      source: r.src,
      callerId: r.callerid,
      calledStation: r.calledstation,
      destination: formatDestination(r.destination_name),
      sessionTime: r.sessiontime ?? 0,
      sessionBill: parseFloat(r.sessionbill || 0),
      buyCost: parseFloat(r.buycost || 0),
      disposition: r.terminatecauseid,
    })),
  });
});

router.get('/rates', async (req, res) => {
  const magnusUser = await magnusService.getUserByUsername(req.dbUser.username);
  if (!magnusUser?.id_plan) {
    return res.json({ rows: [] });
  }
  const rates = await magnusService.getRates(magnusUser.id_plan);
  const markups = await prisma.rateMarkup.findMany({ where: { active: true } });

  const rows = rates.map((r) => {
    const prefixKey = String(r.dialprefix || '').replace(/^\+/, '');
    const markup =
      markups.find((m) => prefixKey && prefixKey.startsWith(String(m.prefix).replace(/^\+/, ''))) ||
      markups.find((m) =>
        r.destination?.toLowerCase().includes(String(m.label || m.prefix).toLowerCase())
      );
    // Always show this user's Magnus plan rate on the website
    const buyRate = parseFloat(r.rateinitial || 0);
    const displayPrefix = r.dialprefix ? String(r.dialprefix).replace(/^\+/, '') : '—';
    const countryLabel = markup?.label || r.destination || 'Unknown';

    return {
      prefix: displayPrefix,
      country: countryLabel,
      billing: 'prepaid',
      buyRate,
      userCustomRate: buyRate,
      rate: buyRate,
      hasCustomRate: true,
      initBlock: r.initblock,
      block: r.block,
    };
  });

  res.json({ rows });
});

function buildSipResponse(magnusUser, username) {
  const host = magnusUser?.host || 'dynamic';
  const ipAuth = magnusService.isIpAuthHost(host);
  return {
    username: magnusUser?.sip_name || username,
    secret: ipAuth ? null : magnusUser?.sip_secret,
    host,
    callerId: magnusUser?.callerid,
    server: config.sip.server,
    voipUrl: config.sip.server,
    authType: ipAuth ? 'ip' : 'dynamic',
    clientIp: ipAuth ? host : null,
  };
}

router.get('/sip', async (req, res) => {
  const magnusUser = await magnusService.getUserByUsername(req.dbUser.username);
  res.json(buildSipResponse(magnusUser, req.dbUser.username));
});

const sipSettingsSchema = z.object({
  authType: z.enum(['dynamic', 'ip']),
  clientIp: z.string().optional(),
  password: z.string().min(4).max(64).optional(),
});

router.post('/sip/settings', async (req, res) => {
  const data = sipSettingsSchema.parse(req.body);
  const magnusUser = await magnusService.getUserByUsername(req.dbUser.username);
  if (!magnusUser?.sip_id) {
    return res.status(400).json({ error: 'SIP account not found in Magnus' });
  }

  if (data.authType === 'ip') {
    const ip = data.clientIp?.trim();
    if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      return res.status(400).json({ error: 'Enter a valid IPv4 address for IP-to-IP' });
    }
    const result = await magnusService.setSipIpAuth(magnusUser.sip_id, ip);
    if (result?.success === false) {
      const err = result.errors || result.msg || 'Failed to update SIP';
      return res.status(400).json({
        error: typeof err === 'object' ? JSON.stringify(err) : String(err),
      });
    }
    await prisma.sipAccount.updateMany({
      where: { userId: req.dbUser.id },
      data: { host: ip, secret: null },
    });
  } else {
    const secret = data.password || magnusUser.sip_secret;
    if (!secret) {
      return res.status(400).json({ error: 'Password is required for standard SIP registration' });
    }
    const result = await magnusService.setSipDynamicAuth(magnusUser.sip_id, secret);
    if (result?.success === false) {
      const err = result.errors || result.msg || 'Failed to update SIP';
      return res.status(400).json({
        error: typeof err === 'object' ? JSON.stringify(err) : String(err),
      });
    }
    await prisma.sipAccount.updateMany({
      where: { userId: req.dbUser.id },
      data: { host: 'dynamic', secret },
    });
  }

  const updated = await magnusService.getUserByUsername(req.dbUser.username);
  res.json({
    success: true,
    message: data.authType === 'ip' ? 'IP-to-IP mode enabled' : 'Standard SIP registration updated',
    ...buildSipResponse(updated, req.dbUser.username),
  });
});

router.post('/sip/callerid', async (req, res) => {
  const { callerId } = req.body;
  if (!callerId || String(callerId).trim().length < 3) {
    return res.status(400).json({ error: 'Caller ID must be at least 3 characters' });
  }
  const magnusUser = await magnusService.getUserByUsername(req.dbUser.username);
  if (!magnusUser?.sip_id) {
    return res.status(400).json({ error: 'SIP account not found' });
  }
  if (magnusService.isIpAuthHost(magnusUser.host)) {
    return res.status(400).json({ error: 'Caller ID cannot be changed in IP-to-IP mode' });
  }
  const cid = normalizeOutboundCallerId(String(callerId).trim());
  if (!cid) {
    return res.status(400).json({ error: 'Caller ID must be a valid US number (10 or 11 digits)' });
  }
  const result = await magnusService.setCallerId(magnusUser.sip_id, cid);
  if (result?.success === false) {
    const err = result.errors || result.msg || 'Failed to update Caller ID';
    return res.status(400).json({
      error: typeof err === 'object' ? JSON.stringify(err) : String(err),
    });
  }
  const updated = await magnusService.getUserByUsername(req.dbUser.username);
  res.json({
    success: true,
    message: 'Caller ID updated',
    ...buildSipResponse(updated, req.dbUser.username),
  });
});

router.get('/plans', async (req, res) => {
  const plans = await prisma.signupPlan.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const magnusUser = await magnusService.getUserByUsername(req.dbUser.username);
  const magnusPlans = await magnusService.getPlans();
  const currentSignupPlan = plans.find((p) => p.magnusPlanId === magnusUser?.id_plan);
  const magnusPlanRow = magnusUser?.id_plan
    ? magnusPlans.find((p) => p.id === magnusUser.id_plan)
    : null;
  res.json({
    currentPlanId: magnusUser?.id_plan ?? null,
    currentPlanName: currentSignupPlan?.name ?? magnusPlanRow?.name ?? null,
    planManagedByMagnus: !!(magnusUser?.id_plan && !currentSignupPlan),
    rows: plans.map(formatPlanRow),
  });
});

router.post('/plan/switch', async (req, res) => {
  try {
    const { id_plan } = switchPlanSchema.parse(req.body);
    const user = req.dbUser;

    if (!user.magnusUserId) {
      return res.status(400).json({ error: 'Your account is not linked to a VOIP plan yet' });
    }

    const plan = await prisma.signupPlan.findFirst({
      where: { magnusPlanId: id_plan, active: true },
    });
    if (!plan) {
      return res.status(400).json({ error: 'Invalid or inactive plan selected' });
    }

    const magnusUser = await magnusService.getUserByUsername(user.username);
    if (magnusUser?.id_plan === id_plan) {
      return res.json({
        success: true,
        message: `You are already on ${plan.name}`,
        planName: plan.name,
        currentPlan: formatPlanRow(plan),
      });
    }

    const result = await magnusService.updateUserPlan(user.magnusUserId, id_plan);
    if (result?.success === false) {
      const err = result.errors || result.msg || 'Failed to switch plan';
      const msg =
        typeof err === 'string'
          ? err
          : typeof err === 'object'
            ? Object.values(err).flat().join(', ') || JSON.stringify(err)
            : 'Failed to switch plan';
      return res.status(400).json({ error: msg });
    }

    res.json({
      success: true,
      message: `Plan switched to ${plan.name}`,
      planName: plan.name,
      currentPlan: formatPlanRow(plan),
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join('. ') });
    }
    console.error('Plan switch error:', err);
    res.status(500).json({ error: err.message || 'Failed to switch plan' });
  }
});

router.get('/balance', async (req, res) => {
  const user = req.dbUser;
  let balance = 0;
  if (user.magnusUserId) {
    balance = await magnusService.getBalance(user.magnusUserId);
    await prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance },
      update: { balance },
    });
  }
  res.json({ balance });
});

router.post('/sip/password', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  const magnusUser = await magnusService.getUserByUsername(req.dbUser.username);
  if (!magnusUser?.sip_id) {
    return res.status(400).json({ error: 'SIP account not found' });
  }
  if (magnusService.isIpAuthHost(magnusUser.host)) {
    return res.status(400).json({ error: 'Switch to Standard Registration before changing password' });
  }
  await magnusService.setSipDynamicAuth(magnusUser.sip_id, password);
  res.json({ success: true, message: 'SIP password updated' });
});

router.get('/transactions', async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.dbUser.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ rows: transactions });
});

router.get('/funds', async (req, res) => {
  const user = req.dbUser;
  const balance = user.magnusUserId
    ? await magnusService.getBalance(user.magnusUserId)
    : parseFloat((await prisma.wallet.findUnique({ where: { userId: user.id } }))?.balance || 0);

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit || '10', 10)));
  const offset = (page - 1) * limit;

  const refills = await magnusService.getRefills(user.username, { limit, offset });

  const pending = await prisma.transaction.findMany({
    where: { userId: user.id, status: 'PENDING', type: 'CRYPTO' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({
    username: user.username,
    accountStatus: user.isBlocked ? 'Blocked' : 'Active',
    balance,
    refills: refills.rows.map((r) => ({
      id: r.id,
      amount: parseFloat(r.credit),
      description: r.description || '',
      date: r.date,
    })),
    refillsTotal: refills.total,
    page,
    limit,
    pendingRequests: pending.map((t) => ({
      id: t.id,
      amount: parseFloat(t.amount),
      status: t.status,
      trackId: t.metadata?.trackId,
      paymentUrl: t.metadata?.paymentUrl,
      createdAt: t.createdAt,
    })),
  });
});

router.post('/funds/create', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!amount || amount < 10) {
    return res.status(400).json({ error: 'Minimum deposit is $10' });
  }
  try {
    const payment = await cryptoService.createPayment(req.dbUser.id, amount);
    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/notifications', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.dbUser.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ rows: notifications });
});

router.get('/calls/live', async (req, res) => {
  try {
    // Users must only see their own live calls — never the full panel
    const result = await magnusService.getOnlineCallsForUser(
      req.dbUser.username,
      req.dbUser.magnusUserId || null
    );
    res.json(result);
  } catch (err) {
    res.json({ rows: [], error: err.message });
  }
});

export default router;
