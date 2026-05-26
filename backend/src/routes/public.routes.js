import { Router } from 'express';
import { config } from '../config/index.js';

const router = Router();

router.get('/config', (req, res) => {
  res.json({
    telegramSupportUrl: config.telegram.supportUrl,
    telegramConfigured: !!(config.telegram.botToken && config.telegram.chatId),
  });
});

export default router;
