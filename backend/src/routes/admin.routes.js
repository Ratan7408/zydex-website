import { Router } from 'express';
import { authRequired, adminRequired, loadUser } from '../middleware/auth.js';
import { magnusService } from '../services/magnus.service.js';
import { cryptoService } from '../services/crypto.service.js';
import prisma from '../utils/prisma.js';

const router = Router();
router.use(authRequired, loadUser, adminRequired);

router.get('/dashboard', async (req, res) => {
  const [users, transactions, alerts] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'CONFIRMED' },
    }),
    prisma.fraudAlert.count({ where: { resolved: false } }),
  ]);

  let onlineCalls = { rows: [] };
  try {
    onlineCalls = await magnusService.getOnlineCalls();
  } catch {}

  res.json({
    totalUsers: users,
    totalRevenue: parseFloat(transactions._sum.amount || 0),
    activeAlerts: alerts,
    liveCalls: onlineCalls.rows?.length || 0,
  });
});

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    include: { wallet: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ rows: users });
});

router.post('/users/:id/block', async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (target.role === 'ADMIN') {
    return res.status(400).json({ error: 'Admin accounts cannot be blocked' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isBlocked: true },
  });
  await prisma.adminLog.create({
    data: {
      adminId: req.dbUser.id,
      action: 'block_user',
      target: user.username,
      ipAddress: req.ip,
    },
  });
  res.json({ success: true });
});

router.post('/users/:id/unblock', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isBlocked: false },
  });
  await prisma.adminLog.create({
    data: { adminId: req.dbUser.id, action: 'unblock_user', target: user.username },
  });
  res.json({ success: true });
});

router.get('/analytics', async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [txByDay, callVolume] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['status'],
      _sum: { amount: true },
      _count: true,
      where: { createdAt: { gte: since }, status: 'CONFIRMED' },
    }),
    prisma.callLog.aggregate({
      _count: true,
      _sum: { duration: true, cost: true },
      where: { startTime: { gte: since } },
    }),
  ]);
  res.json({
    revenue30d: txByDay.reduce((s, t) => s + parseFloat(t._sum.amount || 0), 0),
    deposits30d: txByDay.reduce((s, t) => s + t._count, 0),
    calls30d: callVolume._count,
    minutes30d: Math.round((callVolume._sum.duration || 0) / 60),
    callCost30d: parseFloat(callVolume._sum.cost || 0),
  });
});

router.get('/transactions', async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ rows: transactions });
});

router.post('/transactions/:id/confirm', async (req, res) => {
  const result = await cryptoService.manualConfirm(req.params.id);
  res.json({ success: true, transaction: result });
});

router.get('/calls/live', async (req, res) => {
  const result = await magnusService.getOnlineCalls();
  res.json(result);
});

router.get('/fraud-alerts', async (req, res) => {
  const alerts = await prisma.fraudAlert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ rows: alerts });
});

router.post('/announcements', async (req, res) => {
  const { title, message } = req.body;
  const announcement = await prisma.announcement.create({
    data: { title, message },
  });
  res.json(announcement);
});

router.get('/logs', async (req, res) => {
  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ rows: logs });
});

router.get('/plans', async (req, res) => {
  const plans = await prisma.signupPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  res.json({ rows: plans });
});

router.get('/plans/magnus', async (req, res) => {
  const rows = await magnusService.getPlans();
  res.json({ rows });
});

router.post('/plans', async (req, res) => {
  const { magnusPlanId, name, description, active, sortOrder } = req.body;
  if (!magnusPlanId || !name) {
    return res.status(400).json({ error: 'magnusPlanId and name are required' });
  }
  const plan = await prisma.signupPlan.create({
    data: {
      magnusPlanId: parseInt(magnusPlanId, 10),
      name,
      description: description || null,
      active: active !== false,
      sortOrder: parseInt(sortOrder || '0', 10),
    },
  });
  await prisma.adminLog.create({
    data: { adminId: req.dbUser.id, action: 'create_signup_plan', target: name },
  });
  res.json(plan);
});

router.put('/plans/:id', async (req, res) => {
  const { name, description, active, sortOrder, magnusPlanId } = req.body;
  const plan = await prisma.signupPlan.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(active !== undefined && { active }),
      ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder, 10) }),
      ...(magnusPlanId && { magnusPlanId: parseInt(magnusPlanId, 10) }),
    },
  });
  res.json(plan);
});

router.delete('/plans/:id', async (req, res) => {
  await prisma.signupPlan.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  res.json({ success: true });
});

router.get('/rates/markups', async (req, res) => {
  const rows = await prisma.rateMarkup.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json({ rows });
});

router.post('/rates/markups', async (req, res) => {
  const { prefix, label, buyRate, sellRate, marginPct, active } = req.body;
  if (!prefix || sellRate === undefined || sellRate === '') {
    return res.status(400).json({ error: 'prefix and sellRate are required' });
  }
  const sell = parseFloat(sellRate);
  const buy = parseFloat(buyRate || 0);
  const margin =
    marginPct !== undefined && marginPct !== ''
      ? parseFloat(marginPct)
      : buy > 0
        ? Math.round(((sell - buy) / buy) * 10000) / 100
        : 0;

  const markup = await prisma.rateMarkup.create({
    data: {
      prefix: String(prefix).replace(/^\+/, ''),
      label: label || 'USA CLI',
      buyRate: buy,
      sellRate: sell,
      marginPct: margin,
      active: active !== false,
    },
  });
  await prisma.adminLog.create({
    data: { adminId: req.dbUser.id, action: 'create_rate_markup', target: markup.prefix },
  });
  res.json(markup);
});

router.put('/rates/markups/:id', async (req, res) => {
  const { label, buyRate, sellRate, marginPct, active } = req.body;
  const existing = await prisma.rateMarkup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Rate markup not found' });

  const buy = buyRate !== undefined ? parseFloat(buyRate) : parseFloat(existing.buyRate);
  const sell = sellRate !== undefined ? parseFloat(sellRate) : parseFloat(existing.sellRate);
  const margin =
    marginPct !== undefined && marginPct !== ''
      ? parseFloat(marginPct)
      : buy > 0
        ? Math.round(((sell - buy) / buy) * 10000) / 100
        : parseFloat(existing.marginPct);

  const markup = await prisma.rateMarkup.update({
    where: { id: req.params.id },
    data: {
      ...(label !== undefined && { label }),
      ...(buyRate !== undefined && { buyRate: buy }),
      ...(sellRate !== undefined && { sellRate: sell }),
      marginPct: margin,
      ...(active !== undefined && { active }),
    },
  });
  res.json(markup);
});

router.delete('/rates/markups/:id', async (req, res) => {
  await prisma.rateMarkup.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

/** Fix SIP accounts with missing/invalid Caller ID (carrier 403 declines). */
router.post('/sip/repair-callerids', async (req, res) => {
  const results = await magnusService.repairUsersWithoutCallerId();
  res.json({
    success: true,
    repaired: results.filter((r) => r.applied).length,
    skipped: results.filter((r) => r.alreadySet).length,
    failed: results.filter((r) => !r.ok).length,
    rows: results,
  });
});

export default router;
