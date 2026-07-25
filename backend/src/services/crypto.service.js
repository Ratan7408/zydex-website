import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { magnusService } from './magnus.service.js';
import prisma from '../utils/prisma.js';
import { notificationService } from './notification.service.js';

const MIN_DEPOSIT_USD = 10;
const OXAPAY_API = 'https://api.oxapay.com/v1';

export class CryptoService {
  async createPayment(userId, amountUsd) {
    const amount = parseFloat(amountUsd);
    if (!amount || amount < MIN_DEPOSIT_USD) {
      throw new Error(`Minimum deposit is $${MIN_DEPOSIT_USD}`);
    }

    if (!config.crypto.apiKey) {
      throw new Error('Payment gateway is not configured. Contact support.');
    }

    const orderId = uuidv4();

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'CRYPTO',
        status: 'PENDING',
        amount,
        currency: 'USD',
        cryptoCurrency: 'OXAPAY',
        metadata: { orderId, provider: 'oxapay' },
      },
    });

    const invoice = await this.createOxaPayInvoice({
      amount,
      orderId,
      transactionId: transaction.id,
      email: undefined,
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          orderId,
          provider: 'oxapay',
          trackId: invoice.trackId,
          paymentUrl: invoice.paymentUrl,
        },
      },
    });

    return {
      transactionId: transaction.id,
      orderId,
      amountUsd: amount,
      trackId: invoice.trackId,
      paymentUrl: invoice.paymentUrl,
      expiresAt: invoice.expiredAt,
      message: 'Redirecting to OxaPay to complete your payment.',
    };
  }

  async createOxaPayInvoice({ amount, orderId, transactionId, email }) {
    const returnUrl = `${config.frontendUrl.replace(/\/$/, '')}/funds?status=success`;
    const body = {
      amount,
      currency: 'USD',
      lifetime: 60,
      fee_paid_by_payer: 1,
      callback_url: config.crypto.webhookUrl,
      return_url: returnUrl,
      order_id: orderId,
      description: `Zydex deposit #${transactionId.slice(0, 8)}`,
      thanks_message: 'Thank you! Your balance will update automatically.',
    };
    if (email) body.email = email;

    const res = await fetch(`${OXAPAY_API}/payment/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        merchant_api_key: config.crypto.apiKey,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== 200 || !json.data?.payment_url) {
      const msg = json?.error?.message || json?.message || 'OxaPay invoice failed';
      console.error('OxaPay invoice failed:', { httpStatus: res.status, apiStatus: json.status, keyPrefix: config.crypto.apiKey.slice(0, 6) });
      throw new Error(msg);
    }

    return {
      trackId: json.data.track_id,
      paymentUrl: json.data.payment_url,
      expiredAt: json.data.expired_at,
    };
  }

  verifyOxaPayHmac(rawBody, hmacHeader) {
    if (!hmacHeader || !config.crypto.apiKey) return false;
    const calculated = crypto.createHmac('sha512', config.crypto.apiKey).update(rawBody).digest('hex');
    return calculated === hmacHeader;
  }

  async handleOxaPayWebhook(rawBody, hmacHeader) {
    if (!this.verifyOxaPayHmac(rawBody, hmacHeader)) {
      throw new Error('Invalid HMAC signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const status = String(payload.status || '').toLowerCase();
    const orderId = payload.order_id;
    const trackId = payload.track_id;

    if (!orderId) {
      return { ok: true, message: 'No order_id' };
    }

    const transaction = await prisma.transaction.findFirst({
      where: { metadata: { path: ['orderId'], equals: orderId } },
      include: { user: true },
    });

    if (!transaction) {
      return { ok: true, message: 'Transaction not found' };
    }

    if (transaction.status === 'CONFIRMED') {
      return { ok: true, message: 'Already processed' };
    }

    if (status === 'paying') {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...(transaction.metadata || {}),
            orderId,
            provider: 'oxapay',
            trackId,
            oxapayStatus: 'Paying',
          },
        },
      });
      return { ok: true, message: 'Paying' };
    }

    if (status === 'paid') {
      await this.confirmPayment(transaction, payload.amount, payload.currency || 'OXAPAY', trackId);
      return { ok: true, message: 'Paid' };
    }

    if (status === 'failed' || status === 'expired') {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: status === 'failed' ? 'FAILED' : 'EXPIRED' },
      });
    }

    return { ok: true };
  }

  async handleWebhook(payload, signature) {
    if (config.crypto.provider === 'nowpayments') {
      return this.handleNowPaymentsWebhook(payload, signature);
    }
    return { ok: true, message: 'Use OxaPay raw webhook' };
  }

  async handleNowPaymentsWebhook(payload, signature) {
    const { order_id, payment_status, pay_amount, pay_currency } = payload;
    const transaction = await prisma.transaction.findFirst({
      where: { metadata: { path: ['orderId'], equals: order_id } },
      include: { user: true },
    });

    if (!transaction || transaction.status === 'CONFIRMED') {
      return { ok: true, message: 'Already processed or not found' };
    }

    if (payment_status === 'finished' || payment_status === 'confirmed') {
      await this.confirmPayment(transaction, pay_amount, pay_currency);
    }

    return { ok: true };
  }

  async confirmPayment(transaction, cryptoAmount, cryptoCurrency, trackId = null) {
    const user = transaction.user;
    const amount = parseFloat(transaction.amount);
    let magnusRefillId = null;
    let oldCredit = 0;

    if (user.magnusUserId) {
      oldCredit = await magnusService.getBalance(user.magnusUserId);
      const trackLabel = trackId || transaction.metadata?.trackId || 'n/a';
      const description = `Oxapay Deposit | Tracking ID: ${trackLabel}, Old credit ${oldCredit}`;
      const refill = await magnusService.addCreditWithFallback(
        user.magnusUserId,
        amount,
        description
      );
      if (!refill.ok) {
        throw new Error(refill.error || 'Magnus credit failed');
      }
      magnusRefillId = refill.refillId || null;
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'CONFIRMED',
        cryptoAmount,
        cryptoCurrency,
        magnusRefillId,
        confirmedAt: new Date(),
        metadata: {
          ...(transaction.metadata || {}),
          trackId: trackId || transaction.metadata?.trackId,
          oxapayStatus: 'Paid',
        },
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: amount },
      update: { balance: { increment: amount } },
    });

    await notificationService.notifyUser(
      user.id,
      'deposit',
      'Deposit Confirmed',
      `$${amount.toFixed(2)} has been added to your account.`
    );

    await notificationService
      .notifyAdmin(
        `💰 Balance added\nUser: ${user.username}\nAmount: $${amount.toFixed(2)}\nVia: OxaPay`
      )
      .catch(() => {});

    return transaction;
  }

  async manualConfirm(transactionId) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });
    if (!transaction) throw new Error('Transaction not found');
    return this.confirmPayment(transaction, transaction.amount, 'MANUAL');
  }
}

export const cryptoService = new CryptoService();
export { MIN_DEPOSIT_USD };
