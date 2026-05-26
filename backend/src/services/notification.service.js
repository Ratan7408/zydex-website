import { config } from '../config/index.js';
import prisma from '../utils/prisma.js';

export class NotificationService {
  /** In-app (+ optional email) notification for a portal user */
  async notifyUser(userId, type, title, message) {
    await prisma.notification.create({
      data: { userId, type, title, message },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await this.sendEmail(user.email, title, message).catch(() => {});
    }
  }

  /** Admin Telegram channel — new signups, deposits, alerts (uses TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) */
  async notifyAdmin(text) {
    return this.sendTelegram(text);
  }

  async sendEmail(to, subject, body) {
    if (!config.smtp?.host) return;
    console.log(`[email] to=${to} subject=${subject}`);
  }

  async sendTelegram(text) {
    const { botToken, chatId } = config.telegram || {};
    if (!botToken || !chatId) return;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[telegram]', err.slice(0, 200));
    }
  }

  async lowBalanceAlert(userId, balance) {
    if (balance > 5) return;
    await this.notifyUser(
      userId,
      'low_balance',
      'Low Balance Warning',
      `Your balance is $${balance.toFixed(2)}. Please add funds to continue calling.`
    );
    if (balance <= 1) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.notifyAdmin(
          `⚠️ Low balance\nUser: ${user.username}\nBalance: $${balance.toFixed(2)}`
        ).catch(() => {});
      }
    }
  }
}

export const notificationService = new NotificationService();
