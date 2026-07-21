/**
 * RENACE — Notificador WhatsApp global vía Evolution API
 * Config: env + override en data/whatsapp-config.json (panel admin)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'whatsapp-config.json');

let runtime = null;

function envDefaults() {
  return {
    apiUrl: (process.env.EVOLUTION_API_URL || 'https://evoapi.renace.tech').replace(/\/$/, ''),
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instance: process.env.EVOLUTION_INSTANCE || 'RENACE.TECH',
    sender: process.env.WHATSAPP_SENDER_NUMBER || '18093487921',
    notifyNumbers: String(process.env.WHATSAPP_NOTIFY_NUMBERS || '18494577463')
      .split(/[,;\s]+/)
      .map((n) => n.trim())
      .filter(Boolean),
    otpPhones: {},
  };
}

function loadConfig() {
  const base = envDefaults();
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (raw && typeof raw === 'object') {
        if (raw.apiUrl) base.apiUrl = String(raw.apiUrl).replace(/\/$/, '');
        if (raw.apiKey != null && String(raw.apiKey).trim()) base.apiKey = String(raw.apiKey).trim();
        if (raw.instance) base.instance = String(raw.instance).trim();
        if (raw.sender) base.sender = String(raw.sender).replace(/\D/g, '');
        if (Array.isArray(raw.notifyNumbers)) {
          base.notifyNumbers = raw.notifyNumbers.map((n) => String(n).trim()).filter(Boolean);
        } else if (typeof raw.notifyNumbers === 'string') {
          base.notifyNumbers = raw.notifyNumbers.split(/[,;\s]+/).map((n) => n.trim()).filter(Boolean);
        }
        if (raw.otpPhones && typeof raw.otpPhones === 'object') {
          base.otpPhones = raw.otpPhones;
        }
      }
    }
  } catch (e) {
    console.warn('[whatsapp-notify] config load:', e.message);
  }
  runtime = base;
  return runtime;
}

function getConfig() {
  if (!runtime) return loadConfig();
  return runtime;
}

function reloadConfig() {
  runtime = null;
  return loadConfig();
}

function saveConfig(partial) {
  const current = { ...getConfig(), ...partial };
  if (typeof current.notifyNumbers === 'string') {
    current.notifyNumbers = current.notifyNumbers.split(/[,;\s]+/).map((n) => n.trim()).filter(Boolean);
  }
  if (current.apiUrl) current.apiUrl = String(current.apiUrl).replace(/\/$/, '');
  if (current.sender) current.sender = String(current.sender).replace(/\D/g, '');
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const toStore = {
    apiUrl: current.apiUrl,
    apiKey: current.apiKey,
    instance: current.instance,
    sender: current.sender,
    notifyNumbers: current.notifyNumbers,
    otpPhones: current.otpPhones || {},
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(toStore, null, 2)}\n`, 'utf8');
  runtime = null;
  return loadConfig();
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 && /^[89]/.test(digits)) return `1${digits}`;
  return digits;
}

function getRecipients() {
  const cfg = getConfig();
  return [...new Set((cfg.notifyNumbers || []).map(normalizePhone).filter(Boolean))];
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg.apiKey && cfg.instance);
}

function requestEvolution(apiPath, body) {
  const cfg = getConfig();
  return new Promise((resolve, reject) => {
    const base = new URL(cfg.apiUrl);
    const lib = base.protocol === 'https:' ? https : http;
    const bodyStr = JSON.stringify(body);
    const req = lib.request({
      hostname: base.hostname,
      port: base.port || (base.protocol === 'https:' ? 443 : 80),
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        apikey: cfg.apiKey,
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
  const cfg = getConfig();
  const normalized = normalizePhone(number);
  if (!normalized) {
    return { ok: false, error: 'invalid_number' };
  }
  const apiPath = `/message/sendText/${encodeURIComponent(cfg.instance)}`;
  try {
    const result = await requestEvolution(apiPath, {
      number: normalized,
      text: String(text || '').slice(0, 4000),
    });
    const ok = result.statusCode >= 200 && result.statusCode < 300;
    let parsed;
    try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
    return { ok, statusCode: result.statusCode, response: parsed };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function notifyAdmins(text, meta = {}) {
  const cfg = getConfig();
  const appTag = meta.app ? `*[${meta.app}]*\n` : '';
  const eventTag = meta.event ? `\n\n_${meta.event}_` : '';
  const fullText = `${appTag}${text}${eventTag}`.trim();
  const recipients = getRecipients();
  if (!recipients.length) {
    return { ok: false, error: 'no_recipients', sender: cfg.sender };
  }

  const results = [];
  for (const number of recipients) {
    results.push({ number, ...(await sendText(number, fullText)) });
  }
  return {
    ok: results.some((r) => r.ok),
    sender: cfg.sender,
    instance: cfg.instance,
    results,
  };
}

function getOtpPhoneForEmail(email) {
  const cfg = getConfig();
  const key = String(email || '').trim().toLowerCase();
  const mapped = cfg.otpPhones && cfg.otpPhones[key];
  if (mapped) return normalizePhone(mapped);
  // fallback: first notify number
  const recipients = getRecipients();
  return recipients[0] || '';
}

async function sendOtp(email, code) {
  const phone = getOtpPhoneForEmail(email);
  if (!phone) return { ok: false, error: 'no_otp_phone' };
  const text = `🔐 *RENACE Command Center*\n\nTu código de acceso es: *${code}*\nVálido 10 minutos.\n\nNo compartas este código.`;
  return sendText(phone, text);
}

function getStatus() {
  const cfg = getConfig();
  return {
    configured: isConfigured(),
    provider: 'evolution-api',
    instance: cfg.instance,
    sender: cfg.sender,
    recipients: getRecipients(),
    apiUrl: cfg.apiUrl,
    otpPhonesConfigured: Object.keys(cfg.otpPhones || {}).length,
    hasApiKey: Boolean(cfg.apiKey),
  };
}

function getPublicConfig() {
  const cfg = getConfig();
  return {
    apiUrl: cfg.apiUrl,
    instance: cfg.instance,
    sender: cfg.sender,
    notifyNumbers: (cfg.notifyNumbers || []).join(', '),
    otpPhones: cfg.otpPhones || {},
    hasApiKey: Boolean(cfg.apiKey),
    // never return full apiKey — only masked hint
    apiKeyHint: cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}…${cfg.apiKey.slice(-4)}` : '',
  };
}

loadConfig();

module.exports = {
  sendText,
  notifyAdmins,
  sendOtp,
  getStatus,
  getPublicConfig,
  getConfig,
  reloadConfig,
  saveConfig,
  normalizePhone,
  isConfigured,
  getOtpPhoneForEmail,
  CONFIG_PATH,
  get WHATSAPP_SENDER_NUMBER() {
    return getConfig().sender;
  },
};
