/**
 * RENACE — Notificador WhatsApp global vía Evolution API
 * Instancia: RENACE.TECH · Remitente: 809-348-7921 (18093487921)
 */
const https = require('https');
const http = require('http');

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'https://evoapi.renace.tech').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'RENACE.TECH';
const WHATSAPP_SENDER_NUMBER = process.env.WHATSAPP_SENDER_NUMBER || '18093487921';
const WHATSAPP_NOTIFY_NUMBERS = process.env.WHATSAPP_NOTIFY_NUMBERS || '18494577463';

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // República Dominicana: 809/829/849 sin código → +1
  if (digits.length === 10 && /^[89]/.test(digits)) return `1${digits}`;
  return digits;
}

function getRecipients() {
  return [...new Set(
    WHATSAPP_NOTIFY_NUMBERS.split(/[,;\s]+/).map(normalizePhone).filter(Boolean)
  )];
}

function isConfigured() {
  return Boolean(EVOLUTION_API_KEY && EVOLUTION_INSTANCE);
}

function requestEvolution(path, body) {
  return new Promise((resolve, reject) => {
    const base = new URL(EVOLUTION_API_URL);
    const lib = base.protocol === 'https:' ? https : http;
    const bodyStr = JSON.stringify(body);
    const req = lib.request({
      hostname: base.hostname,
      port: base.port || (base.protocol === 'https:' ? 443 : 80),
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        apikey: EVOLUTION_API_KEY,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 502, body: data });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Evolution API timeout')));
    req.write(bodyStr);
    req.end();
  });
}

async function sendText(number, text) {
  if (!isConfigured()) {
    return { ok: false, error: 'whatsapp_not_configured' };
  }
  const normalized = normalizePhone(number);
  if (!normalized) {
    return { ok: false, error: 'invalid_number' };
  }
  const path = `/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
  try {
    const result = await requestEvolution(path, { number: normalized, text: String(text || '').slice(0, 4000) });
    const ok = result.statusCode >= 200 && result.statusCode < 300;
    let parsed;
    try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
    return { ok, statusCode: result.statusCode, response: parsed };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function notifyAdmins(text, meta = {}) {
  const appTag = meta.app ? `*[${meta.app}]*\n` : '';
  const eventTag = meta.event ? `\n\n_${meta.event}_` : '';
  const fullText = `${appTag}${text}${eventTag}`.trim();
  const recipients = getRecipients();
  if (!recipients.length) {
    return { ok: false, error: 'no_recipients', sender: WHATSAPP_SENDER_NUMBER };
  }

  const results = [];
  for (const number of recipients) {
    results.push({ number, ...(await sendText(number, fullText)) });
  }
  return {
    ok: results.some((r) => r.ok),
    sender: WHATSAPP_SENDER_NUMBER,
    instance: EVOLUTION_INSTANCE,
    results,
  };
}

function getStatus() {
  return {
    configured: isConfigured(),
    provider: 'evolution-api',
    instance: EVOLUTION_INSTANCE,
    sender: WHATSAPP_SENDER_NUMBER,
    recipients: getRecipients(),
    apiUrl: EVOLUTION_API_URL,
  };
}

module.exports = {
  sendText,
  notifyAdmins,
  getStatus,
  normalizePhone,
  isConfigured,
  WHATSAPP_SENDER_NUMBER,
};
