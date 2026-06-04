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

  /** Admin Telegram — signup + successful balance top-up only (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) */
  async notifyAdmin(text) {
    return this.sendTelegram(text);
  }

  async sendEmail(to, subject, body) {
    if (!config.smtp?.host) return;
    console.log(`[email] to=${to} subject=${subject}`);
  }

  async sendTelegram(text) {
    const { botToken, chatId } = config.telegram || {};
    if (!botToken || !chatId) {
      return { ok: false, error: 'telegram_not_configured' };
    }
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      console.error('[telegram]', JSON.stringify(body).slice(0, 300));
      return { ok: false, error: body.description || 'telegram_send_failed' };
    }
    return { ok: true, messageId: body.result?.message_id };
  }

}

export const notificationService = new NotificationService();
