import prisma from '../utils/prisma.js';
import { magnusService } from '../services/magnus.service.js';
import { fraudService } from '../services/fraud.service.js';

export async function syncCdrToPortal() {
  const db = await magnusService.getDb();
  const [rows] = await db.execute(
    `SELECT c.id, u.username, c.calledstation, c.sessiontime, c.sessionbill, c.starttime, c.terminatecauseid
     FROM pkg_cdr c
     JOIN pkg_user u ON c.id_user = u.id
     WHERE c.starttime > DATE_SUB(NOW(), INTERVAL 2 HOUR)
     ORDER BY c.id DESC LIMIT 500`
  );

  let synced = 0;
  for (const r of rows) {
    try {
      await prisma.callLog.upsert({
        where: { magnusCdrId: r.id },
        create: {
          magnusCdrId: r.id,
          username: r.username,
          destination: r.calledstation,
          duration: r.sessiontime || 0,
          cost: parseFloat(r.sessionbill || 0),
          startTime: new Date(r.starttime),
          disposition: String(r.terminatecauseid || ''),
        },
        update: {
          duration: r.sessiontime || 0,
          cost: parseFloat(r.sessionbill || 0),
        },
      });
      synced++;
    } catch {
      /* skip duplicates */
    }
  }
  return synced;
}

export async function syncBalances() {
  const users = await prisma.user.findMany({
    where: { magnusUserId: { not: null }, isBlocked: false },
    include: { wallet: true },
  });

  for (const user of users) {
    const balance = await magnusService.getBalance(user.magnusUserId);
    await prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance },
      update: { balance },
    });
  }
}

export function startBackgroundJobs() {
  const INTERVAL = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      await syncCdrToPortal();
      await syncBalances();
      await fraudService.runScan();
    } catch (err) {
      console.error('[jobs]', err.message);
    }
  }, INTERVAL);
  console.log('Background jobs started (CDR sync, balance, fraud every 5 min)');
}
