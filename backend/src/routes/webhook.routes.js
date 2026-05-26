import { Router } from 'express';
import express from 'express';
import { cryptoService } from '../services/crypto.service.js';

const router = Router();

/** OxaPay requires raw body + HMAC header; responds with "ok" */
export async function handleOxaPayCryptoWebhook(req, res) {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const hmac = req.headers.hmac || req.headers.HMAC;
    await cryptoService.handleOxaPayWebhook(rawBody, hmac);
    res.status(200).send('ok');
  } catch (err) {
    console.error('OxaPay webhook error:', err.message);
    res.status(400).send(err.message);
  }
}

/** Legacy NOWPayments JSON webhook */
router.post('/crypto/nowpayments', async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'] || req.headers['x-signature'];
    const result = await cryptoService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
