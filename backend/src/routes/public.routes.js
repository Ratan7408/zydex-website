import { Router } from 'express';
import { config } from '../config/index.js';

const router = Router();

router.get('/config', (req, res) => {
  const signupBonus = config.signupBonus > 0 ? config.signupBonus : 0;
  res.json({
    telegramSupportUrl: config.telegram.supportUrl,
    telegramConfigured: !!(config.telegram.botToken && config.telegram.chatId),
    signupBonusCredit: signupBonus,
    signupBonusMessage:
      signupBonus > 0
        ? `Get $${signupBonus.toFixed(2)} free test credit when you create your account.`
        : null,
  });
});

export default router;
