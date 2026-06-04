/**
 * Zydex logo — one image used everywhere (favicon, sidebar, landing, login).
 * Override with VITE_BRAND_LOGO_URL in frontend/.env.local if needed.
 */
export const BRAND_LOGO_URL = 'https://cdn.corenexis.com/files/c/6233222720.png';
export const BRAND_FAVICON = 'https://cdn.corenexis.com/files/c/9311422720.jpg';

/** Telegram icon for floating support button */
export const TELEGRAM_LOGO_URL =
  'https://i.pinimg.com/736x/0a/50/c1/0a50c1516e434e0108649d2987cfaeb0.jpg';

export const BRAND_LOGO = import.meta.env.VITE_BRAND_LOGO_URL || BRAND_LOGO_URL;

/** @deprecated use BRAND_LOGO — kept for imports */
export const BRAND_ICON = BRAND_LOGO;
export const BRAND_WORDMARK = BRAND_LOGO;

export const TELEGRAM_SUPPORT = 'https://t.me/zydex_p1';

/** Public channel — join for updates (popup + promotions) */
export const TELEGRAM_CHANNEL = 'https://t.me/+qN1BmoNuCxs3YWFl';

export const WHATSAPP_NUMBER = '13273273805';
export const WHATSAPP_DISPLAY = '+1 327 327 3805';
export const WHATSAPP_SUPPORT = `https://wa.me/${WHATSAPP_NUMBER}`;
