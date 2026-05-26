import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../utils/prisma.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminRequired(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export async function loadUser(req, res, next) {
  if (!req.user?.sub) return next();
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) {
    return res.status(403).json({ error: 'Account blocked or not found' });
  }
  if (user.isBlocked && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Account blocked or not found' });
  }
  req.dbUser = user;
  next();
}
