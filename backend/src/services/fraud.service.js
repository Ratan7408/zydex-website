import prisma from '../utils/prisma.js';
import { magnusService } from './magnus.service.js';

const CALLS_PER_HOUR_LIMIT = 200;
const HIGH_COST_DESTINATION_PREFIXES = ['882', '883', '870', '881'];

export class FraudService {
  async scanUser(username) {
    const db = await magnusService.getDb();
    const [recent] = await db.execute(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(c.sessionbill),0) as cost
       FROM pkg_cdr c
       JOIN pkg_user u ON c.id_user = u.id
       WHERE u.username = ? AND c.starttime > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [username]
    );
    const count = parseInt(recent?.cnt || 0, 10);
    const alerts = [];

    if (count > CALLS_PER_HOUR_LIMIT) {
      alerts.push({
        reason: `${count} calls in the last hour (limit ${CALLS_PER_HOUR_LIMIT})`,
        severity: 'high',
        autoBlock: true,
      });
    }

    const [suspicious] = await db.execute(
      `SELECT c.calledstation, COUNT(*) as cnt
       FROM pkg_cdr c
       JOIN pkg_user u ON c.id_user = u.id
       WHERE u.username = ? AND c.starttime > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       GROUP BY c.calledstation
       HAVING cnt > 50
       ORDER BY cnt DESC LIMIT 5`,
      [username]
    );

    for (const row of suspicious) {
      const dest = String(row.calledstation || '');
      const isPremium = HIGH_COST_DESTINATION_PREFIXES.some((p) => dest.startsWith(p));
      if (isPremium || row.cnt > 100) {
        alerts.push({
          reason: `Suspicious destination ${dest}: ${row.cnt} calls in 24h`,
          severity: isPremium ? 'high' : 'medium',
          autoBlock: isPremium,
        });
      }
    }

    return alerts;
  }

  async runScan() {
    const users = await prisma.user.findMany({
      where: { role: 'USER', isBlocked: false },
      select: { id: true, username: true },
      take: 500,
    });

    let created = 0;
    for (const user of users) {
      const alerts = await this.scanUser(user.username);
      for (const alert of alerts) {
        const exists = await prisma.fraudAlert.findFirst({
          where: { username: user.username, reason: alert.reason, resolved: false },
        });
        if (exists) continue;

        await prisma.fraudAlert.create({
          data: {
            username: user.username,
            reason: alert.reason,
            severity: alert.severity,
            autoBlocked: alert.autoBlock,
          },
        });
        created++;

        if (alert.autoBlock) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isBlocked: true },
          });
        }
      }
    }
    return { scanned: users.length, alertsCreated: created };
  }
}

export const fraudService = new FraudService();
