import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { config } from '../config/index.js';

/** US outbound CLI: 10 digits (→ 1XXXXXXXXXX) or 11 digits starting with 1. */
export function normalizeOutboundCallerId(input) {
  if (input == null || input === '') return '';
  const d = String(input).replace(/\D/g, '');
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith('1')) return d;
  return '';
}

export class MagnusService {
  constructor() {
    this.baseUrl = config.magnus.url.replace(/\/$/, '');
    this.apiKey = config.magnus.apiKey;
    this.apiSecret = config.magnus.apiSecret;
    this._pool = null;
  }

  async getDb() {
    if (!this._pool) {
      this._pool = mysql.createPool({
        host: config.magnus.db.host,
        user: config.magnus.db.user,
        password: config.magnus.db.password,
        database: config.magnus.db.database,
        waitForConnections: true,
        connectionLimit: 5,
      });
    }
    return this._pool;
  }

  signRequest(params) {
    const mt = process.hrtime.bigint ? [Date.now() / 1000, 0] : [Date.now() / 1000, 0];
    const nonce = `${Math.floor(mt[0])}${String(mt[1] || 0).slice(2, 8)}`;
    const body = { ...params, nonce };
    const postData = new URLSearchParams(
      Object.entries(body).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])
    ).toString();
    const sign = crypto.createHmac('sha512', this.apiSecret).update(postData).digest('hex');
    return { body, postData, sign, nonce };
  }

  async apiRequest(module, action, data = {}) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Magnus API credentials not configured. Create API key in Magnus Admin.');
    }
    const params = { module, action, ...data };
    const { postData, sign } = this.signRequest(params);
    const url = `${this.baseUrl}/index.php/${module}/${action}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Key: this.apiKey,
        Sign: sign,
      },
      body: postData,
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Magnus API error: ${text.slice(0, 200)}`);
    }
  }

  async createUser({ username, password, email, firstname, lastname, phone, id_plan, credit }) {
    return this.apiRequest('user', 'save', {
      createUser: 1,
      id: 0,
      username,
      password,
      email: email || `${username}@zydex.local`,
      firstname: firstname || username,
      lastname: lastname || 'User',
      phone: phone || '',
      id_plan: id_plan || config.magnus.defaultPlanId,
      credit: credit ?? 0,
      active: 1,
    });
  }

  async getUserByUsername(username) {
    const db = await this.getDb();
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.password, u.email, u.credit, u.active, u.id_plan,
              s.id as sip_id, s.name as sip_name, s.secret as sip_secret, s.host, s.callerid
       FROM pkg_user u
       LEFT JOIN pkg_sip s ON s.id_user = u.id
       WHERE u.username = ? LIMIT 1`,
      [username]
    );
    return rows[0] || null;
  }

  async validateLogin(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user || user.active !== 1) return null;
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const valid =
      user.password === password ||
      user.password?.toUpperCase() === sha1 ||
      user.sip_secret === password;
    return valid ? user : null;
  }

  async getBalance(magnusUserId) {
    const db = await this.getDb();
    const [rows] = await db.execute('SELECT credit FROM pkg_user WHERE id = ?', [magnusUserId]);
    return parseFloat(rows[0]?.credit || 0);
  }

  async addCredit(magnusUserId, amount, description = 'Zydex crypto top-up') {
    const oldCredit = await this.getBalance(magnusUserId);
    return this.apiRequest('refill', 'save', {
      id: 0,
      id_user: magnusUserId,
      credit: amount,
      description: description.includes('Old credit')
        ? description
        : `${description}, Old credit ${oldCredit}`,
      payment: 1,
      refill_type: 0,
    });
  }

  /** Signup bonus: Magnus refill API first, direct DB insert if API fails */
  async grantSignupBonus(magnusUserId, amount) {
    const description = `Zydex signup bonus — $${amount.toFixed(2)} free test credit`;
    try {
      const apiResult = await this.addCredit(magnusUserId, amount, description);
      if (apiResult?.success !== false) {
        return { ok: true, method: 'api' };
      }
    } catch (err) {
      console.warn('Signup refill API error, trying DB fallback:', err.message);
    }

    try {
      const db = await this.getDb();
      const oldCredit = await this.getBalance(magnusUserId);
      await db.execute(
        `INSERT INTO pkg_refill (id_user, date, credit, description, refill_type, payment)
         VALUES (?, NOW(), ?, ?, 0, 1)`,
        [magnusUserId, amount, `${description}, Old credit ${oldCredit}`]
      );
      await db.execute('UPDATE pkg_user SET credit = credit + ? WHERE id = ?', [amount, magnusUserId]);
      return { ok: true, method: 'sql' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async getCdr(username, limit = 50) {
    const db = await this.getDb();
    const [rows] = await db.execute(
      `SELECT c.id, c.calledstation, c.sessiontime, c.sessionbill, c.buycost,
              c.starttime, c.terminatecauseid, c.src, c.callerid,
              u.username,
              COALESCE(pf.destination, r.destination, 'Unknown') AS destination_name
       FROM pkg_cdr c
       JOIN pkg_user u ON c.id_user = u.id
       LEFT JOIN pkg_prefix pf ON c.id_prefix = pf.id
       LEFT JOIN pkg_rate r ON r.id_prefix = c.id_prefix AND r.id_plan = c.id_plan
       WHERE u.username = ?
       ORDER BY c.starttime DESC
       LIMIT ?`,
      [username, limit]
    );
    return rows;
  }

  async getPlans() {
    const db = await this.getDb();
    const [rows] = await db.execute(
      `SELECT id, name, signup FROM pkg_plan ORDER BY name`
    );
    return rows;
  }

  async updateUserPlan(magnusUserId, id_plan) {
    return this.apiRequest('user', 'save', {
      id: magnusUserId,
      id_plan,
    });
  }

  async getRates(planId) {
    const db = await this.getDb();
    const [rows] = await db.execute(
      `SELECT r.id, r.rateinitial, r.initblock, r.billingblock AS block,
              COALESCE(r.destination, pf.destination) AS destination,
              pf.prefix AS dialprefix
       FROM pkg_rate r
       LEFT JOIN pkg_prefix pf ON r.id_prefix = pf.id
       WHERE r.id_plan = ? AND r.status = 1
       ORDER BY pf.prefix, r.destination
       LIMIT 500`,
      [planId]
    );
    return rows;
  }

  async getOnlineCalls() {
    return this.apiRequest('callOnLine', 'read', { page: 1, start: 0, limit: 100 });
  }

  async getRefills(username, { limit = 10, offset = 0 } = {}) {
    const db = await this.getDb();
    const [rows] = await db.execute(
      `SELECT r.id, r.credit, r.description, r.date
       FROM pkg_refill r
       JOIN pkg_user u ON r.id_user = u.id
       WHERE u.username = ?
       ORDER BY r.date DESC
       LIMIT ? OFFSET ?`,
      [username, limit, offset]
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM pkg_refill r
       JOIN pkg_user u ON r.id_user = u.id WHERE u.username = ?`,
      [username]
    );
    return { rows, total: parseInt(total || 0, 10) };
  }

  async getCallStats(username) {
    const db = await this.getDb();
    const [rows] = await db.execute(
      `SELECT COUNT(*) as total_calls, COALESCE(SUM(c.sessiontime),0) as total_duration
       FROM pkg_cdr c
       JOIN pkg_user u ON c.id_user = u.id
       WHERE u.username = ?`,
      [username]
    );
    const [deposits] = await db.execute(
      `SELECT COUNT(*) as total FROM pkg_refill r
       JOIN pkg_user u ON r.id_user = u.id WHERE u.username = ?`,
      [username]
    );
    return {
      totalCalls: parseInt(rows[0]?.total_calls || 0, 10),
      totalDuration: parseInt(rows[0]?.total_duration || 0, 10),
      totalDeposits: parseInt(deposits[0]?.total || 0, 10),
    };
  }

  async updateSipPassword(sipId, secret) {
    return this.apiRequest('sip', 'save', { id: sipId, secret });
  }

  async updateSip(sipId, fields) {
    return this.apiRequest('sip', 'save', { id: sipId, ...fields });
  }

  /** Standard softphone registration (username + password, host dynamic) */
  async setSipDynamicAuth(sipId, secret) {
    return this.updateSip(sipId, {
      host: 'dynamic',
      secret: secret || '',
      insecure: 'no',
      permit: '',
    });
  }

  /**
   * Many carriers return SIP 403 when outbound CLI is empty/invalid.
   * Sets callerid + cid_number when missing and a default is configured.
   */
  async ensureOutboundCallerId(sipId, preferredCallerId) {
    if (!sipId) return { ok: false, reason: 'no_sip' };

    const db = await this.getDb();
    const [rows] = await db.execute(
      'SELECT callerid, host FROM pkg_sip WHERE id = ? LIMIT 1',
      [sipId]
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: 'sip_not_found' };
    if (this.isIpAuthHost(row.host)) return { ok: true, skipped: 'ip_auth' };

    const current = normalizeOutboundCallerId(row.callerid);
    if (current) return { ok: true, callerId: current, alreadySet: true };

    const fromPreferred = normalizeOutboundCallerId(preferredCallerId);
    const fromDefault = normalizeOutboundCallerId(config.sip.defaultOutboundCallerId);
    const callerId = fromPreferred || fromDefault;
    if (!callerId) return { ok: false, reason: 'no_default_callerid' };

    const result = await this.setCallerId(sipId, callerId);
    if (result?.success === false) {
      return { ok: false, reason: 'magnus_save_failed', error: result };
    }
    return { ok: true, callerId, applied: true };
  }

  /** Backfill Caller ID for SIP accounts missing or invalid CLI. */
  async repairUsersWithoutCallerId() {
    const db = await this.getDb();
    const [rows] = await db.execute(
      `SELECT s.id AS sip_id, u.username, s.callerid, s.host
       FROM pkg_sip s
       JOIN pkg_user u ON s.id_user = u.id
       WHERE s.host IS NULL OR s.host = '' OR s.host = 'dynamic'`
    );
    const results = [];
    for (const row of rows) {
      const valid = normalizeOutboundCallerId(row.callerid);
      if (valid) {
        results.push({ username: row.username, sipId: row.sip_id, ok: true, callerId: valid, alreadySet: true });
        continue;
      }
      const r = await this.ensureOutboundCallerId(row.sip_id);
      results.push({ username: row.username, sipId: row.sip_id, ...r });
    }
    return results;
  }

  /** IP-to-IP: peer authenticates by IP — no SIP password */
  async setCallerId(sipId, callerId) {
    const normalized = normalizeOutboundCallerId(callerId);
    if (!normalized) {
      throw new Error('Invalid Caller ID');
    }
    return this.updateSip(sipId, {
      callerid: normalized,
      cid_number: normalized,
    });
  }

  async setSipIpAuth(sipId, clientIp) {
    const ip = clientIp.trim();
    return this.updateSip(sipId, {
      host: ip,
      secret: '',
      insecure: 'invite,port',
      permit: `${ip}/32`,
    });
  }

  isIpAuthHost(host) {
    return host && host !== 'dynamic' && !host.includes('.invalid');
  }
}

export const magnusService = new MagnusService();
