/**
 * RENACE.TECH — Express Server (Production-Hardened)
 * Security: helmet, rate-limiting, input sanitization, CORS
 * Serves static files + provides API endpoints for:
 * - File upload/download (stored in PostgreSQL)
 * - Contact form (SMTP)
 * - Document listing
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const waNotify = require('./lib/whatsapp-notify');
const security = require('./lib/security');
const portalAuth = require('./lib/portal-auth');
const rnvCatalog = require('./lib/rnv-odoo-catalog');
const { bootstrapSecrets } = require('./lib/secrets-bootstrap');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = security.isProd();
const FORM_DATA_PATH = path.join(__dirname, 'form', 'data.json');
const QUOTE_DATA_PATH = path.join(__dirname, 'data', 'quotes.json');
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const DOCS_DIR = path.join(__dirname, 'docs');
const DATA_DIR = path.join(__dirname, 'data');

// Auto-generate missing security secrets (persisted under /app/data)
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  bootstrapSecrets({ dataDir: DATA_DIR });
} catch (e) {
  console.error('[SECRETS] bootstrap failed:', e.message);
  if (isProd && process.env.SECURITY_STRICT === '1') process.exit(1);
}
const BUNDLED_DOWNLOADS = [
  {
    filename: 'EnviosRH.apk',
    displayName: 'Envíos RH v3.1.0 (Android)',
    mimeType: 'application/vnd.android.package-archive',
    category: 'app',
  },
];
const blockedStaticPathPattern = /(?:^\/(?:server\.js|package(?:-lock)?\.json|docker-compose\.yml|Dockerfile|deploy\.sh)$|\.(?:php|env|yml|yaml|sh|sql|log|bak|md)$)/i;
// Command Center / app superadmins (NOT portal SSO picker)
const ADMIN_EMAILS = [
  ...new Set(
    [
      process.env.ADMIN_EMAIL || 'expertostird@gmail.com',
      'rcexpertos@gmail.com',
      ...(String(process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)),
    ]
      .map((e) => String(e).toLowerCase())
      .filter(Boolean)
  ),
];

// Portal SSO: emails that may pick among multiple Odoo instances after auth
// (separate from Command Center — info@ is access-only, not app superadmin)
const PORTAL_MULTI_INSTANCE_EMAILS = [
  ...new Set(
    [
      'info@renace.tech',
      ...ADMIN_EMAILS,
      ...(String(process.env.PORTAL_MULTI_INSTANCE_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)),
    ]
      .map((e) => String(e).toLowerCase())
      .filter(Boolean)
  ),
];
const MAIL_REPLY_TO = (process.env.MAIL_REPLY_TO || 'info@renace.tech').trim();

function canPickPortalInstances(email) {
  return PORTAL_MULTI_INSTANCE_EMAILS.includes(String(email || '').trim().toLowerCase());
}

function getMailFrom() {
  const raw = (process.env.SMTP_FROM || process.env.SMTP_USER || 'info@renace.tech').trim();
  if (!raw) return 'RENACE.TECH <info@renace.tech>';
  if (raw.includes('<')) return raw;
  // Hostinger exige From == usuario autenticado
  return `RENACE.TECH <${raw}>`;
}

function getMailOptions(extra = {}) {
  return { from: getMailFrom(), replyTo: MAIL_REPLY_TO, ...extra };
}
const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const ADMIN_CODE_TTL_MS = 10 * 60 * 1000; // 10 min
const QUOTE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const REQUEST_METRICS_MAX = 10000;

const METRICS_DATA_PATH = path.join(__dirname, 'data', 'metrics.json');
const CAMPAIGNS_DATA_PATH = path.join(__dirname, 'data', 'campaigns.json');

// Ensure the runtime data directory exists before any read/write of JSON stores.
try {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'data', 'docs'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'downloads'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
} catch { /* noop */ }

let requestMetrics = [];
let campaignData = [
  { id: 1, title: 'Google Ads: Búsqueda Intención', desc: 'Red de búsqueda. Público con alta urgencia buscando "Facturación Electrónica e-CF".', active: true },
  { id: 2, title: 'Meta Ads: Autoridad e Institucional', desc: 'Anuncios sutiles en Facebook/Instagram para perfiles corporativos (+14 años exp).', active: true },
  { id: 3, title: 'TikTok Ads: PyMEs y Creadores', desc: 'Campaña visual con formato vertical. Enfoque: "POS en la nube y control móvil".', active: false },
  { id: 4, title: 'YouTube Ads: Pre-roll Demo', desc: 'Video in-stream de 15 segundos demostrando cómo Odoo emite facturas al instante.', active: false },
  { id: 5, title: 'Retargeting Facebook: Casos de Éxito', desc: 'Testimonios persiguiendo durante 14 días a usuarios que visitaron renace.tech pero no agendaron.', active: false },
  { id: 6, title: 'Email Marketing: Secuencia de Multas DGII', desc: 'Automatización de 3 correos para nutrir leads sobre las sanciones regulatorias para 2026.', active: false }
];

try {
  if (fs.existsSync(METRICS_DATA_PATH)) {
    requestMetrics = JSON.parse(fs.readFileSync(METRICS_DATA_PATH, 'utf8'));
  }
} catch (e) {
  console.warn('[Metrics] Error loading metrics:', e.message);
}

try {
  if (fs.existsSync(CAMPAIGNS_DATA_PATH)) {
    campaignData = JSON.parse(fs.readFileSync(CAMPAIGNS_DATA_PATH, 'utf8'));
  } else {
    fs.writeFileSync(CAMPAIGNS_DATA_PATH, JSON.stringify(campaignData, null, 2));
  }
} catch (e) {
  console.warn('[Campaigns] Error loading campaigns:', e.message);
}

// Persist metrics periodically every minute
setInterval(() => {
  fs.writeFile(METRICS_DATA_PATH, JSON.stringify(requestMetrics), (err) => {
    if (err) console.error('[Metrics] Error saving:', err.message);
  });
}, 60000);

const visitGeoCache = new Map();

// ── Quote request storage helpers ──
async function loadQuoteData() {
  try {
    const raw = await fs.promises.readFile(QUOTE_DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.promises.mkdir(path.dirname(QUOTE_DATA_PATH), { recursive: true });
      await fs.promises.writeFile(QUOTE_DATA_PATH, JSON.stringify({ tokens: [], submissions: [] }, null, 2));
      return { tokens: [], submissions: [] };
    }
    throw err;
  }
}

// ── Quote token management ──
async function createQuoteToken(label = 'Solicitud') {
  const data = await loadQuoteData();
  const token = generateToken(12);
  const exp = Date.now() + QUOTE_TOKEN_TTL_MS;
  data.tokens.push({ token, label, exp, createdAt: new Date().toISOString() });
  await saveQuoteData(data);
  return { token, exp };
}

async function validateQuoteToken(token) {
  const data = await loadQuoteData();
  const now = Date.now();
  data.tokens = data.tokens.filter(t => t.exp > now);
  const found = data.tokens.find(t => t.token === token && t.exp > now);
  await saveQuoteData(data);
  return !!found;
}

async function saveQuoteData(data) {
  await fs.promises.writeFile(QUOTE_DATA_PATH, JSON.stringify(data, null, 2));
}

function generateToken(len = 24) {
  return crypto.randomBytes(len).toString('hex');
}
const adminTokens = new Map(); // token -> { email, exp }
const adminCodes = new Map(); // email -> { code, exp }

// Enable trust proxy for rate limiting behind Traefik
if (isProd) {
  app.set('trust proxy', 1);
}

// ── Admin analytics helpers ──
async function readAccessLogTail(limitLines = ADMIN_ANALYTICS_LIMIT) {
  try {
    const data = await fs.promises.readFile(ACCESS_LOG_PATH, 'utf8');
    const lines = data.trim().split(/\r?\n/);
    return lines.slice(-limitLines);
  } catch (e) {
    console.warn('[analytics] No se pudo leer access log:', e.message);
    return [];
  }
}

function parseNginxLine(line) {
  const full = line.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "([A-Z]+) ([^" ]+)[^"]*" (\d{3}) \S+ "([^"]*)" "([^"]*)"/);
  if (full) {
    const ip = full[1] || '';
    const tsStr = full[2];
    const method = full[3] || 'GET';
    const pathStr = full[4] || '/';
    const status = parseInt(full[5], 10);
    const referrer = full[6] && full[6] !== '-' ? full[6] : '';
    const userAgent = full[7] && full[7] !== '-' ? full[7] : '';
    const date = parseNginxDate(tsStr);
    return { date, method, path: pathStr, status, ip, referrer, userAgent, source: 'nginx' };
  }
  const basic = line.match(/^[^ ]+ [^ ]+ [^ ]+ \[([^\]]+)\] "[A-Z]+ ([^" ]+)/);
  const statusMatch = line.match(/" \s*(\d{3})/);
  if (!basic || !statusMatch) return null;
  const tsStr = basic[1];
  const pathStr = basic[2] || '/';
  const status = parseInt(statusMatch[1], 10);
  const date = parseNginxDate(tsStr);
  return { date, method: 'GET', path: pathStr, status, ip: '', referrer: '', userAgent: '', source: 'nginx' };
}

function extractClientIp(rawAddress) {
  const raw = String(rawAddress || '').trim();
  if (!raw) return '';
  const first = raw.split(',')[0].trim();
  if (first.startsWith('[')) {
    const closeIdx = first.indexOf(']');
    if (closeIdx > 1) return first.slice(1, closeIdx);
  }
  const ipv4WithPort = first.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) return ipv4WithPort[1];
  const mappedIpv4 = first.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
  if (mappedIpv4) return mappedIpv4[1];
  return first;
}

function parseTraefikJsonLine(line) {
  if (!line || line[0] !== '{') return null;
  let data;
  try {
    data = JSON.parse(line);
  } catch {
    return null;
  }
  const status = Number(
    data.DownstreamStatus
    || data.OriginStatus
    || data.status
    || data.statusCode
  );
  if (!Number.isFinite(status)) return null;
  const rawPath = data.RequestPath || data.RequestURI || data.path || '/';
  const path = String(rawPath || '/').split('?')[0] || '/';
  const method = data.RequestMethod || data.method || 'GET';
  const dateRaw = data.StartUTC || data.StartLocal || data.time || data.Timestamp || data.ts;
  const date = dateRaw ? new Date(dateRaw) : null;
  const ip = extractClientIp(data.ClientAddr || data.ClientHost || data.RequestAddr || data.clientAddr || data.client_ip);
  const referrer = data.request_Referer || data.RequestReferer || data.referer || '';
  const userAgent = data.request_UserAgent || data.RequestUserAgent || data.userAgent || '';
  return {
    date: date instanceof Date && !Number.isNaN(date.getTime()) ? date : null,
    method: String(method || 'GET'),
    path,
    status,
    ip,
    referrer: String(referrer || ''),
    userAgent: String(userAgent || ''),
    source: 'traefik',
  };
}

function parseAccessLogLine(line) {
  return parseTraefikJsonLine(line) || parseNginxLine(line);
}

function parseNginxDate(str) {
  // formato: 19/Mar/2024:10:00:00 +0000
  const parts = str.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/);
  if (!parts) return null;
  const [_, d, mon, y, hh, mm, ss, offset] = parts;
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const dt = new Date(Date.UTC(parseInt(y), months[mon], parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss)));
  // offset ignored for simplicity
  return dt;
}

async function summarizeVisits() {
  const lines = await readAccessLogTail();
  const summary = { total: 0, last24h: 0, byStatus: {}, topPaths: [], source: 'traefik' };
  const pathCount = {};
  const sourceCount = {};
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const line of lines) {
    const parsed = parseAccessLogLine(line);
    if (!parsed) continue;
    summary.total += 1;
    if (parsed.date && parsed.date.getTime() >= cutoff) summary.last24h += 1;
    summary.byStatus[parsed.status] = (summary.byStatus[parsed.status] || 0) + 1;
    pathCount[parsed.path] = (pathCount[parsed.path] || 0) + 1;
    const source = parsed.source || 'traefik';
    sourceCount[source] = (sourceCount[source] || 0) + 1;
  }
  summary.topPaths = Object.entries(pathCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));
  const topSource = Object.entries(sourceCount).sort((a, b) => b[1] - a[1])[0];
  if (topSource) summary.source = topSource[0];
  if (summary.total > 0) return summary;
  return summarizeLiveVisits();
}

function summarizeLiveVisits() {
  const summary = { total: 0, last24h: 0, byStatus: {}, topPaths: [], source: 'live' };
  const pathCount = {};
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const row of requestMetrics) {
    summary.total += 1;
    if (row.ts >= cutoff) summary.last24h += 1;
    summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
    pathCount[row.path] = (pathCount[row.path] || 0) + 1;
  }
  summary.topPaths = Object.entries(pathCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));
  return summary;
}

function formatVisitDetailRecord(item) {
  const ts = item.date instanceof Date ? item.date.getTime() : Number(item.ts || Date.now());
  return {
    ip: item.ip || '',
    method: item.method || 'GET',
    path: item.path || '/',
    status: Number(item.status || 0),
    referrer: item.referrer || '',
    userAgent: item.userAgent || '',
    ts,
    at: new Date(ts).toISOString(),
    countryHint: item.countryHint || '',
    source: item.source || 'traefik',
  };
}

function isPrivateIp(ipRaw) {
  const ip = String(ipRaw || '').trim().toLowerCase();
  if (!ip) return true;
  if (ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
  return false;
}

function normalizeIp(ipRaw) {
  const raw = String(ipRaw || '').trim();
  if (!raw) return '';
  return raw.replace('::ffff:', '');
}

async function resolveIpLocation(ipRaw, countryHint = '') {
  const ip = normalizeIp(ipRaw);
  if (!ip || isPrivateIp(ip)) {
    return {
      country: countryHint || 'Local',
      region: '',
      city: '',
      org: '',
      timezone: '',
      lat: null,
      lon: null,
      source: 'local',
    };
  }
  const cached = visitGeoCache.get(ip);
  if (cached && cached.exp > Date.now()) return cached.value;

  let value = {
    country: countryHint || 'Desconocido',
    region: '',
    city: '',
    org: '',
    timezone: '',
    lat: null,
    lon: null,
    source: 'none',
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      value = {
        country: data.country_name || countryHint || 'Desconocido',
        region: data.region || '',
        city: data.city || '',
        org: data.org || data.asn || '',
        timezone: data.timezone || '',
        lat: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
        lon: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
        source: 'ipapi',
      };
    }
  } catch (_e) {}

  visitGeoCache.set(ip, { exp: Date.now() + 6 * 60 * 60 * 1000, value });
  return value;
}

async function collectNginxVisitDetails(limit = 80) {
  const lines = await readAccessLogTail(Math.max(limit * 12, 500));
  const items = [];
  for (let i = lines.length - 1; i >= 0 && items.length < limit; i -= 1) {
    const parsed = parseAccessLogLine(lines[i]);
    if (!parsed) continue;
    items.push(formatVisitDetailRecord(parsed));
  }
  return items;
}

function collectLiveVisitDetails(limit = 80) {
  return requestMetrics
    .slice(-limit)
    .reverse()
    .map(item => formatVisitDetailRecord(item));
}

async function collectVisitDetails(limit = 80) {
  const nginxItems = await collectNginxVisitDetails(limit);
  if (nginxItems.length) {
    return { source: nginxItems[0]?.source || 'traefik', items: nginxItems };
  }
  return { source: 'live', items: collectLiveVisitDetails(limit) };
}

async function enrichVisitDetails(items) {
  return Promise.all(items.map(async item => {
    const location = await resolveIpLocation(item.ip, item.countryHint);
    return {
      ...item,
      location,
    };
  }));
}

function shouldTrackVisit(req) {
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  const targetPath = String(req.path || '/');
  if (targetPath.startsWith('/api/admin')) return false;
  if (targetPath.startsWith('/admin-dashboard')) return false;
  if (targetPath === '/favicon.ico') return false;
  if (/\.(?:css|js|map|png|jpe?g|webp|svg|ico|woff2?|ttf)$/i.test(targetPath)) return false;
  return true;
}

async function summarizeSales() {
  try {
    const orders = await odooExecute('sale.order', 'search_read', [[['state', 'not in', ['cancel']]]], { fields: ['amount_total', 'date_order'], limit: 50, order: 'date_order desc' });
    const totalAmount = orders.reduce((acc, o) => acc + (o.amount_total || 0), 0);
    return { count: orders.length, totalAmount, sample: orders.slice(0, 5).map(o => ({ amount: o.amount_total, date: o.date_order })) };
  } catch (e) {
    console.warn('[analytics] Odoo sales error:', e.message);
    return { degraded: true, error: e.message };
  }
}

// ── Admin helpers ──
function cleanupAdminTokens() {
  const now = Date.now();
  for (const [token, info] of adminTokens.entries()) {
    if (info.exp <= now) adminTokens.delete(token);
  }
}

function cleanupAdminCodes() {
  const now = Date.now();
  for (const [email, info] of adminCodes.entries()) {
    if (info.exp <= now) adminCodes.delete(email);
  }
}

function generateCode(len = 6) {
  const digits = '0123456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}

async function sendAdminCode(email, code) {
  if (!transporter) return false;
  try {
    await Promise.race([
      transporter.sendMail(getMailOptions({
        to: email,
        subject: 'Código de acceso dashboard Renace',
        text: `Tu código de acceso es: ${code} (válido por 10 minutos).`,
      })),
      new Promise((_, reject) => setTimeout(() => reject(new Error('smtp_timeout')), 10000)),
    ]);
    return true;
  } catch (e) {
    console.warn('[admin code email]', e.message);
    return false;
  }
}

async function deliverAdminCode(email, code, channel) {
  const mode = (channel || 'email').toLowerCase();
  const result = { email: false, whatsapp: false, channels: [] };

  if (mode === 'email' || mode === 'both') {
    result.email = await sendAdminCode(email, code);
    if (result.email) result.channels.push('email');
  }
  if (mode === 'whatsapp' || mode === 'both') {
    if (waNotify.isConfigured()) {
      const wa = await waNotify.sendOtp(email, code);
      result.whatsapp = Boolean(wa.ok);
      if (result.whatsapp) result.channels.push('whatsapp');
      else result.waError = wa.error || 'send_failed';
    } else {
      result.waError = 'whatsapp_not_configured';
    }
  }
  return result;
}

// ── CORS (allowlist only — no wildcard *.renace.tech with credentials) ──
app.use((req, res, next) => {
  const rid = req.headers['x-request-id'] || security.requestId();
  req.requestId = rid;
  res.setHeader('X-Request-Id', rid);
  security.applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Middleware ──
// Skip body parsing for Odoo proxy routes (stream must be unparsed)
app.use((req, res, next) => {
  if (req.path.startsWith('/odoo')) return next();
  // Attachments from the portal app may be base64 photos (~1.5MB)
  express.json({ limit: '2mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/odoo')) return next();
  express.urlencoded({ extended: true, limit: '2mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (!shouldTrackVisit(req)) return next();
  res.on('finish', () => {
    const forwardedCountry = String(
      req.headers['cf-ipcountry'] ||
      req.headers['x-country-code'] ||
      req.headers['x-vercel-ip-country'] ||
      ''
    ).trim();
    requestMetrics.push({
      path: String(req.path || '/'),
      method: String(req.method || 'GET'),
      status: Number(res.statusCode || 0),
      ts: Date.now(),
      ip: getRequestClientIp(req),
      referrer: String(req.headers.referer || ''),
      userAgent: String(req.headers['user-agent'] || ''),
      countryHint: forwardedCountry || '',
    });
    if (requestMetrics.length > REQUEST_METRICS_MAX) {
      requestMetrics.splice(0, requestMetrics.length - REQUEST_METRICS_MAX);
    }
  });
  next();
});

// ── Security Headers (Helmet) ──
app.use((req, res, next) => {
  if (req.path.startsWith('/odoo')) return next();
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://ai.renace.tech"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        formAction: ["'self'", "https://*.renace.tech"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  })(req, res, next);
});

// Disable X-Powered-By (helmet does this, but belt-and-suspenders)
app.disable('x-powered-by');

// ── Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Límite de mensajes alcanzado. Intenta más tarde.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas subidas, intenta más tarde.' },
});

const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Chat limitado, intenta más tarde.' },
});

const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso, intenta más tarde.' },
});

const portalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes del portal, intenta más tarde.' },
});

const gateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limited' },
});

// ── Admin auth + analytics (after rate limiters to avoid hoisting issues) ──
app.post('/api/admin/login/request-code', apiLimiter, async (req, res) => {
  res.type('json');
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const channel = String(req.body?.channel || 'email').toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ error: 'No autorizado' });
    if (!['email', 'whatsapp', 'both'].includes(channel)) {
      return res.status(400).json({ error: 'Canal inválido (email | whatsapp | both)' });
    }
    if ((channel === 'whatsapp' || channel === 'both') && !waNotify.isConfigured()) {
      return res.status(503).json({ error: 'WhatsApp no configurado. Ejecuta seed o configúralo en el panel.' });
    }
    if ((channel === 'whatsapp' || channel === 'both') && !waNotify.getOtpPhoneForEmail(email)) {
      return res.status(400).json({ error: 'No hay número WhatsApp OTP para esta identidad.' });
    }

    const code = generateCode();
    const exp = Date.now() + ADMIN_CODE_TTL_MS;
    adminCodes.set(email, { code, exp });

    const delivered = await deliverAdminCode(email, code, channel);
    if (!delivered.channels.length) {
      console.warn('[ADMIN LOGIN] Delivery failed', { email, channel, waError: delivered.waError });
      return res.status(502).json({
        error: channel === 'whatsapp'
          ? 'No se pudo enviar por WhatsApp'
          : 'No se pudo enviar el código (SMTP). Revisa SMTP_PASSWORD con seed-production.sh',
        detail: delivered.waError || 'delivery_failed',
      });
    }

    const labels = delivered.channels.map((c) => (c === 'whatsapp' ? 'WhatsApp' : 'correo'));
    return res.json({
      status: 'ok',
      message: `Código enviado por ${labels.join(' y ')}`,
      channels: delivered.channels,
    });
  } catch (e) {
    console.error('[ADMIN LOGIN] request-code', e.message);
    return res.status(500).json({ error: 'Error interno al solicitar código', detail: e.message });
  }
});

app.post('/api/admin/login/verify-code', apiLimiter, (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const code = (req.body?.code || '').trim();
  cleanupAdminCodes();
  const stored = adminCodes.get(email);
  if (!stored || stored.code !== code) return res.status(401).json({ error: 'Código inválido o expirado' });
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, { email, exp: Date.now() + ADMIN_TOKEN_TTL_MS });
  adminCodes.delete(email);
  res.json({ token, ttlMs: ADMIN_TOKEN_TTL_MS });
});

function securePinMatch(pin, expected) {
  return security.timingSafeEqualString(pin, expected);
}

app.post('/api/admin/gate', gateLimiter, (req, res) => {
  const expected = process.env.ADMIN_ACCESS_PASSWORD;
  if (!expected) return res.status(503).json({ ok: false, error: 'gate_disabled' });
  const pin = getAdminCredential(req);
  if (!securePinMatch(pin, expected)) {
    return res.status(401).json({ ok: false, error: 'invalid_pin' });
  }
  res.json({ ok: true, redirect: '/admin-dashboard.html' });
});

function requireAdminToken(req, res) {
  cleanupAdminTokens();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !adminTokens.has(token)) {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return false;
  }
  req.adminSession = adminTokens.get(token);
  return true;
}

app.get('/api/admin/analytics', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const [visits, sales, quotes] = await Promise.all([
      summarizeVisits(),
      summarizeSales(),
      loadQuoteData().then(data => ({ tokens: data.tokens, submissions: data.submissions.slice(-100).reverse() })),
    ]);
    res.json({ visits, sales, quotes, chats: { note: 'Proxy /api/chat sin métrica local' } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/whatsapp-config', apiLimiter, (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json({ ...waNotify.getPublicConfig(), status: waNotify.getStatus() });
});

app.put('/api/admin/whatsapp-config', apiLimiter, (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const body = req.body || {};
    const patch = {};
    if (body.apiUrl != null) patch.apiUrl = String(body.apiUrl).trim();
    if (body.instance != null) patch.instance = String(body.instance).trim();
    if (body.sender != null) patch.sender = String(body.sender).trim();
    if (body.notifyNumbers != null) patch.notifyNumbers = body.notifyNumbers;
    if (body.otpPhones != null && typeof body.otpPhones === 'object') patch.otpPhones = body.otpPhones;
    // Only update apiKey if provided non-empty (keep existing otherwise)
    if (typeof body.apiKey === 'string' && body.apiKey.trim() && !body.apiKey.includes('…')) {
      patch.apiKey = body.apiKey.trim();
    }
    const saved = waNotify.saveConfig(patch);
    res.json({
      ok: true,
      config: waNotify.getPublicConfig(),
      status: waNotify.getStatus(),
      savedAt: saved.updatedAt || new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/whatsapp-test', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  if (!waNotify.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'whatsapp_not_configured' });
  }
  const result = await waNotify.notifyAdmins(
    '✅ *RENACE WhatsApp OK*\nPrueba desde Command Center.\nNotificaciones CRM · Nomina · POS · Inventario',
    { app: 'renace.tech', event: 'admin-test' }
  );
  res.status(result.ok ? 200 : 502).json({ ...result, status: waNotify.getStatus() });
});

// Deliver security secrets by EMAIL only (never dump secrets to WhatsApp)
const secretsEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Límite de envíos alcanzado (máx. 3/hora).' },
});

app.post('/api/admin/secrets/email', secretsEmailLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const to = String(req.adminSession?.email || '').toLowerCase().trim();
  if (!to || !ADMIN_EMAILS.includes(to)) {
    return res.status(403).json({ ok: false, error: 'Solo identidades admin pueden solicitar secretos' });
  }
  if (!transporter) {
    return res.status(503).json({ ok: false, error: 'SMTP no configurado' });
  }

  const keys = [
    'ADMIN_ACCESS_PASSWORD',
    'ADMIN_TOKEN',
    'PORTAL_ENCRYPTION_KEY',
    'NOTIFY_API_KEY',
    'ADMIN_SESSION_SECRET',
    'PARTICIPANT_SESSION_SECRET',
  ];
  const lines = keys.map((k) => {
    const v = process.env[k];
    return `${k}=${v && String(v).trim() ? String(v).trim() : '(no definido)'}`;
  });

  const when = new Date().toISOString();
  const ip = getRequestClientIp(req);
  try {
    await transporter.sendMail(getMailOptions({
      to,
      subject: `🔐 Secretos RENACE.TECH — solicitud ${when.slice(0, 19)}Z`,
      text: [
        'Solicitud de secretos desde Command Center',
        `Para: ${to}`,
        `Fecha: ${when}`,
        `IP: ${ip}`,
        '',
        'Guarda estos valores en un lugar seguro. No los reenvíes.',
        '',
        ...lines,
        '',
        'Si no solicitaste este correo, rota los secretos en el servidor.',
      ].join('\n'),
      html: `<div style="font-family:system-ui,sans-serif;max-width:640px">
        <h2>🔐 Secretos RENACE.TECH</h2>
        <p>Solicitud desde Command Center para <strong>${to}</strong>.</p>
        <p style="color:#64748b;font-size:13px">Fecha: ${when}<br>IP: ${ip}</p>
        <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:12px;overflow:auto;font-size:12px;line-height:1.5">${lines.map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('\n')}</pre>
        <p style="color:#64748b;font-size:12px">Si no solicitaste este correo, rota los secretos en el servidor.</p>
      </div>`,
    }));

    // WhatsApp: solo aviso, SIN secretos (buena práctica)
    if (waNotify.isConfigured()) {
      waNotify.notifyAdmins(
        `🔐 *RENACE*\nSecretos solicitados por *${to}*.\nEnviados por *correo* (no por WhatsApp).\nIP: ${ip}`,
        { app: 'renace.tech', event: 'secrets_email_notice' }
      ).catch(() => {});
    }

    return res.json({
      ok: true,
      message: `Secretos enviados por correo a ${to}. Revisa bandeja y spam.`,
      to,
      channel: 'email',
    });
  } catch (e) {
    console.error('[admin secrets email]', e.message);
    return res.status(502).json({
      ok: false,
      error: 'SMTP falló al enviar. Revisa Hostinger: usuario=info@renace.tech y contraseña del buzón.',
      detail: e.message,
    });
  }
});

app.get('/api/admin/visit-details', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rawLimit = Number(req.query.limit || 80);
    const limit = Math.min(Math.max(rawLimit || 80, 20), 200);
    const detailed = req.query.detailed !== '0';
    const details = await collectVisitDetails(limit);
    const items = detailed ? await enrichVisitDetails(details.items) : details.items;
    res.json({ source: details.source, total: items.length, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Portal de Clientes Odoo ──────────────────────────────────────────

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const PORTAL_ENCRYPTION_KEY = process.env.PORTAL_ENCRYPTION_KEY || '';
const GOOGLE_REDIRECT_URI  = (process.env.NEXT_PUBLIC_BASE_URL || 'https://renace.tech') + '/api/portal/google/callback';

function portalEncrypt(plaintext) {
  if (!PORTAL_ENCRYPTION_KEY || PORTAL_ENCRYPTION_KEY.length < 16) throw new Error('PORTAL_ENCRYPTION_KEY no configurada');
  const key = crypto.scryptSync(PORTAL_ENCRYPTION_KEY, 'renace-portal-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + tag + ':' + encrypted;
}

function portalDecrypt(ciphertext) {
  if (!PORTAL_ENCRYPTION_KEY || PORTAL_ENCRYPTION_KEY.length < 16) throw new Error('PORTAL_ENCRYPTION_KEY no configurada');
  const key = crypto.scryptSync(PORTAL_ENCRYPTION_KEY, 'renace-portal-salt', 32);
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  if (!ivHex || !tagHex || !encHex) throw new Error('Formato de cifrado inválido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function escAttr(val) {
  return String(val || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clientInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return String(name || 'C').slice(0, 2).toUpperCase();
}

function clientColor(name) {
  const palette = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316','#14b8a6','#6366f1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function buildRedirectPage(safeName, safeUrl) {
  const initials = escAttr(clientInitials(safeName));
  const color    = clientColor(safeName);
  const dest     = escAttr(safeUrl + '/web');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Accediendo a ${safeName}…</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;align-items:center;justify-content:center;min-height:100vh;
      background:#070d18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8edf5}
    .card{text-align:center;padding:2.8rem 3rem;background:#0f1923;
      border:1px solid rgba(148,163,184,0.1);border-radius:20px;
      box-shadow:0 24px 64px rgba(0,0,0,.5);max-width:340px;width:90%}
    .logo-circle{width:72px;height:72px;border-radius:50%;background:${color};
      display:flex;align-items:center;justify-content:center;margin:0 auto 1.4rem;
      font-size:1.6rem;font-weight:800;color:#fff;letter-spacing:-0.02em;
      box-shadow:0 8px 24px ${color}55}
    h2{font-size:1.2rem;font-weight:700;margin-bottom:.4rem;letter-spacing:-0.02em}
    p{color:#64748b;font-size:.85rem;margin-bottom:1.8rem}
    .spinner{width:30px;height:30px;border:2.5px solid #1e293b;border-top-color:${color};
      border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
    @keyframes spin{to{transform:rotate(360deg)}}
    .brand{margin-top:1.6rem;font-size:.7rem;color:#334155;letter-spacing:.05em}
    .brand span{color:#2dd4bf}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-circle">${initials}</div>
    <h2>Accediendo a ${safeName}</h2>
    <p>Iniciando sesión en tu plataforma…</p>
    <div class="spinner"></div>
    <div class="brand">Impulsado por <span>RENACE.TECH</span></div>
  </div>
  <script>window.location.replace('${dest}');</script>
</body>
</html>`;
}

function formatPortalInstanceChoice(row) {
  const publicBase = portalAuth.toPublicOdooUrl(row.odoo_url, row.public_url)
    || rnvCatalog.resolvePublicUrlForInstance(row)
    || null;
  const explicitLogo = String(row.logo_url || '').trim();
  let logoUrl = explicitLogo || null;
  if (!logoUrl && publicBase) {
    logoUrl = `${publicBase.replace(/\/$/, '')}/web/image/res.company/1/logo`;
  }
  let hostLabel = null;
  try {
    if (publicBase) hostLabel = new URL(publicBase).hostname.replace(/^www\./, '');
  } catch (_) {}
  return {
    id: row.id,
    client_name: row.client_name,
    service_code: row.service_code || null,
    public_url: publicBase,
    logo_url: logoUrl,
    subtitle: row.service_code || hostLabel || 'Empresa',
  };
}

function portalPublicBase(req) {
  const envBase = String(process.env.NEXT_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (envBase) return envBase;
  if (req) {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'renace.tech').split(',')[0].trim();
    if (host) return `${proto}://${host}`;
  }
  return 'https://renace.tech';
}

function cookieDomainForPublicUrl(publicUrl) {
  try {
    const host = new URL(publicUrl).hostname.toLowerCase();
    if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
    const parts = host.split('.');
    if (parts.length >= 2 && parts.slice(-2).join('.') === 'renace.tech') return '.renace.tech';
    if (parts.length >= 2) return '.' + parts.slice(-2).join('.');
    return null;
  } catch {
    return '.renace.tech';
  }
}

/** Set Odoo session_id for *.renace.tech (SameSite=None so Electron/desktop handoff works). */
function setOdooSessionCookie(res, sessionId, publicUrl) {
  const cookieDomain = cookieDomainForPublicUrl(publicUrl);
  const cookieParts = [
    `session_id=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Max-Age=86400',
  ];
  if (cookieDomain) cookieParts.push(`Domain=${cookieDomain}`);
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function buildSsoEnterUrl(req, token) {
  return `${portalPublicBase(req)}/api/sso/enter?token=${encodeURIComponent(token)}`;
}

async function fetchUrlText(url, opts = {}) {
  const maxRedirects = opts.maxRedirects === undefined ? 5 : opts.maxRedirects;
  let current = String(url);
  let cookieJar = String(opts.cookie || '');
  let last = null;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const target = new URL(current);
    const lib = target.protocol === 'https:' ? https : http;
    const headers = Object.assign({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }, opts.headers || {});
    if (cookieJar) headers.Cookie = cookieJar;
    if (opts.body && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    if (opts.body) headers['Content-Length'] = Buffer.byteLength(opts.body);

    last = await new Promise((resolve, reject) => {
      const req = lib.request({
        hostname: target.hostname,
        port: parseInt(target.port) || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method: opts.method || 'GET',
        headers,
      }, (proxyRes) => {
        let data = '';
        const setCookies = [].concat(proxyRes.headers['set-cookie'] || []);
        proxyRes.on('data', (c) => { data += c; });
        proxyRes.on('end', () => {
          resolve({
            status: proxyRes.statusCode || 0,
            headers: proxyRes.headers,
            setCookies,
            body: data,
            finalUrl: current,
          });
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout Odoo login')); });
      if (opts.body && (opts.method || 'GET') !== 'GET') req.write(opts.body);
      req.end();
    });

    for (const raw of last.setCookies || []) {
      const m = String(raw).match(/^([^=;]+)=([^;]*)/);
      if (!m) continue;
      const name = m[1].trim();
      const val = m[2];
      // replace existing cookie name in jar
      const parts = cookieJar ? cookieJar.split(/;\s*/).filter(Boolean).filter((c) => !c.startsWith(name + '=')) : [];
      parts.push(`${name}=${val}`);
      cookieJar = parts.join('; ');
    }

    if (last.status >= 300 && last.status < 400 && last.headers.location && hop < maxRedirects) {
      current = new URL(last.headers.location, current).toString();
      opts = { ...opts, method: 'GET', body: undefined, headers: { ...(opts.headers || {}) } };
      delete opts.headers['Content-Type'];
      delete opts.headers['Content-Length'];
      delete opts.headers['content-type'];
      continue;
    }
    last.cookieJar = cookieJar;
    return last;
  }
  return last;
}

/** Server-side Odoo web login → authenticated session_id (avoids browser CSRF mismatch). */
async function odooWebLoginSession(publicBase, login, password, db) {
  const base = String(publicBase || '').replace(/\/$/, '');
  const loginUrl = `${base}/web/login`;
  const page = await fetchUrlText(loginUrl, { method: 'GET', maxRedirects: 3 });
  const csrfToken = extractOdooCsrf(page.body);
  const bootstrapSession = extractSessionIdFromCookies(page.setCookies)
    || (page.cookieJar && (page.cookieJar.match(/(?:^|;\s*)session_id=([^;]+)/) || [])[1]);
  if (!csrfToken) throw new Error('No se pudo obtener csrf_token de Odoo');
  if (!bootstrapSession) throw new Error('Odoo no entregó session_id en /web/login');

  const params = new URLSearchParams();
  params.set('csrf_token', csrfToken);
  params.set('login', login);
  params.set('password', password);
  params.set('redirect', '/web');
  if (db) params.set('db', db);

  const post = await fetchUrlText(loginUrl, {
    method: 'POST',
    maxRedirects: 5,
    cookie: `session_id=${bootstrapSession}`,
    headers: {
      Referer: loginUrl,
      Origin: base,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const sessionId = extractSessionIdFromCookies(post.setCookies)
    || (post.cookieJar && (post.cookieJar.match(/(?:^|;\s*)session_id=([^;]+)/) || [])[1])
    || null;

  const landedOnLogin = /\/web\/login/i.test(post.finalUrl || '')
    || /name=["']password["']/i.test(post.body || '');
  const looksAuthed = Boolean(sessionId)
    && !landedOnLogin
    && (post.status === 200 || post.status === 303 || post.status === 302);

  // Odoo may keep same session_id after login; accept if we left /web/login
  if (sessionId && !/invalid CSRF|Session expired/i.test(post.body || '') && !landedOnLogin) {
    return sessionId;
  }
  if (sessionId && looksAuthed) return sessionId;

  // Fallback: JSON-RPC authenticate on public host
  const auth = await odooValidateCredentials(base, db || 'db', login, password);
  if (auth.valid && auth.sessionId) return auth.sessionId;

  throw new Error('Login Odoo rechazado (credenciales o CSRF)');
}

function extractOdooCsrf(html) {
  const raw = String(html || '');
  let m = raw.match(/name=["']csrf_token["']\s+value=["']([^"']+)["']/i)
    || raw.match(/value=["']([^"']+)["']\s+name=["']csrf_token["']/i)
    || raw.match(/csrf_token["']?\s*:\s*["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractSessionIdFromCookies(setCookies) {
  for (const cookie of setCookies || []) {
    const m = String(cookie).match(/(?:^|;\s*)session_id=([^;]+)/);
    if (m && m[1]) return m[1];
  }
  return null;
}

function buildOdooAutoLoginHtml({ clientName, publicBase, login, password, csrfToken, db }) {
  const action = escAttr(`${String(publicBase).replace(/\/$/, '')}/web/login`);
  const safeName = escAttr(clientName || 'Odoo');
  const safeLogin = escAttr(login);
  const safePass = escAttr(password);
  const safeCsrf = escAttr(csrfToken);
  const safeDb = escAttr(db || '');
  const dbField = safeDb
    ? `<input type="hidden" name="db" value="${safeDb}">`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Accediendo a ${safeName}…</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#070d18;color:#e8edf5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .card{text-align:center;padding:2rem 2.4rem;border-radius:16px;background:#0f1923;border:1px solid rgba(148,163,184,.12)}
    .spinner{width:28px;height:28px;border:2.5px solid #1e293b;border-top-color:#2dd4bf;border-radius:50%;
      animation:spin .7s linear infinite;margin:1rem auto 0}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin:0 0 .4rem;font-size:1.1rem">Accediendo a ${safeName}</h2>
    <p style="margin:0;color:#64748b;font-size:.85rem">Iniciando sesión automáticamente…</p>
    <div class="spinner"></div>
  </div>
  <form id="odoo-sso" method="POST" action="${action}" style="display:none">
    <input type="hidden" name="csrf_token" value="${safeCsrf}">
    <input type="hidden" name="login" value="${safeLogin}">
    <input type="hidden" name="password" value="${safePass}">
    <input type="hidden" name="redirect" value="/web">
    ${dbField}
  </form>
  <script>document.getElementById('odoo-sso').submit();</script>
</body>
</html>`;
}


async function odooValidateCredentials(odooUrl, db, login, password) {
  const target = new URL(odooUrl);
  const lib = target.protocol === 'https:' ? https : http;
  const bodyObj = { jsonrpc: '2.0', method: 'call', id: 1, params: { db, login, password } };
  const bodyStr = JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const req = lib.request({
      hostname: target.hostname,
      port: parseInt(target.port) || (target.protocol === 'https:' ? 443 : 80),
      path: '/web/session/authenticate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
    }, (proxyRes) => {
      let data = '';
      const setCookies = Array.isArray(proxyRes.headers['set-cookie']) ? proxyRes.headers['set-cookie'] : [];
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const uid = parsed?.result?.uid;
          let cookieSessionId = null;
          for (const cookie of setCookies) {
            const m = String(cookie).match(/(?:^|;\s*)session_id=([^;]+)/);
            if (m && m[1]) {
              cookieSessionId = m[1];
              break;
            }
          }
          const sessionId = parsed?.result?.session_id || cookieSessionId || null;
          const valid = !!uid && uid !== false && uid !== null;
          resolve({ valid, sessionId, uid });
        } catch { resolve({ valid: false, sessionId: null, uid: null }); }
      });
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(9000, () => { req.destroy(); reject(new Error('Timeout al conectar con Odoo')); });
    req.write(bodyStr);
    req.end();
  });
}

app.get('/portal', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile('portal.html', { root: __dirname });
});

app.get('/descargas', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile('descargas.html', { root: __dirname });
});
app.get('/descargas.html', (req, res) => res.redirect(301, '/descargas'));

app.post('/api/portal/lookup', portalLimiter, async (req, res) => {
  const serviceCode = String(req.body?.serviceCode || req.body?.service_code || '').trim().toLowerCase().slice(0, 32);
  if (!serviceCode) {
    return res.status(400).json({ ok: false, error: 'ID o código de empresa requerido' });
  }
  try {
    const result = await pool.query(
      `SELECT id, client_name, odoo_url, odoo_db, service_code
       FROM odoo_instances
       WHERE LOWER(service_code) = $1 AND active = TRUE
       LIMIT 1`,
      [serviceCode]
    );
    if (!result.rows.length) {
      return res.status(404).json({ ok: false, error: 'Código de empresa no encontrado o inactivo' });
    }
    const row = result.rows[0];
    res.json({
      ok: true,
      clientName: row.client_name,
      odooUrl: row.odoo_url,
      odooDb: row.odoo_db,
      serviceCode: row.service_code
    });
  } catch (e) {
    console.error('[portal lookup error]', e.message);
    res.status(500).json({ ok: false, error: 'Error al consultar directorio de empresas' });
  }
});

app.post('/api/portal/login', portalLimiter, async (req, res) => {
  const login = String(req.body?.login || req.body?.email || '').trim().slice(0, 254);
  const password = String(req.body?.password || '').slice(0, 256);
  const serviceCode = String(req.body?.serviceCode || req.body?.service_code || '').trim().toLowerCase().slice(0, 32);
  const instanceIdRaw = req.body?.instanceId ?? req.body?.instance_id;
  const requestedInstanceId = instanceIdRaw != null && instanceIdRaw !== ''
    ? parseInt(String(instanceIdRaw), 10)
    : null;
  const acceptsJson = req.xhr || (req.headers['accept'] && req.headers['accept'].includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));

  if (!login || !password) {
    if (acceptsJson) return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos' });
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  if (requestedInstanceId != null && (!Number.isFinite(requestedInstanceId) || requestedInstanceId < 1)) {
    if (acceptsJson) return res.status(400).json({ ok: false, error: 'instanceId inválido' });
    return res.status(400).json({ error: 'instanceId inválido' });
  }

  try {
    const canPickInstances = canPickPortalInstances(login);

    const linkedRes = await pool.query(
      `SELECT cpu.id AS portal_user_id, oi.id AS instance_id, oi.odoo_url, oi.public_url, oi.odoo_db, oi.client_name, oi.service_code
       FROM client_portal_users cpu
       JOIN odoo_instances oi ON oi.id = cpu.instance_id
       WHERE cpu.odoo_login = $1 AND cpu.active = TRUE AND oi.active = TRUE
       ORDER BY oi.id ASC`,
      [login]
    );
    const linked = linkedRes.rows;

    let instanceRow = null;

    if (requestedInstanceId) {
      const instRes = await pool.query(
        `SELECT id AS instance_id, client_name, odoo_url, public_url, odoo_db, service_code
         FROM odoo_instances WHERE id = $1 AND active = TRUE LIMIT 1`,
        [requestedInstanceId]
      );
      if (!instRes.rows.length) {
        if (acceptsJson) return res.status(404).json({ ok: false, error: 'Instancia no encontrada' });
        return res.status(404).json({ error: 'Instancia no encontrada' });
      }
      instanceRow = instRes.rows[0];
      const allowed = canPickInstances || linked.some((r) => r.instance_id === requestedInstanceId);
      if (!allowed) {
        if (acceptsJson) return res.status(403).json({ ok: false, error: 'No tienes acceso a esta instancia' });
        return res.status(403).json({ error: 'No tienes acceso a esta instancia' });
      }
    } else if (serviceCode) {
      const instRes = await pool.query(
        `SELECT id AS instance_id, client_name, odoo_url, public_url, odoo_db, service_code
         FROM odoo_instances
         WHERE LOWER(service_code) = $1 AND active = TRUE
         LIMIT 1`,
        [serviceCode]
      );
      if (!instRes.rows.length) {
        if (acceptsJson) return res.status(401).json({ ok: false, error: 'Código de empresa incorrecto o empresa no registrada' });
        return res.status(401).json({ error: 'Código de empresa incorrecto o empresa no registrada' });
      }
      instanceRow = instRes.rows[0];
    } else if (linked.length === 1 && !canPickInstances) {
      instanceRow = linked[0];
    } else if (linked.length >= 1) {
      instanceRow = linked[0];
    } else {
      if (acceptsJson) {
        return res.status(400).json({
          ok: false,
          error: 'Código de empresa requerido',
          code: 'service_code_required',
          needs_service_code: true,
        });
      }
      return res.status(400).json({ error: 'Código de empresa requerido', needs_service_code: true });
    }

    const instance_id = instanceRow.instance_id;
    const odoo_url = instanceRow.odoo_url;
    const odoo_db = instanceRow.odoo_db;
    const client_name = instanceRow.client_name;
    const resolvedServiceCode = instanceRow.service_code;

    let authResult;
    try {
      authResult = await odooValidateCredentials(odoo_url, odoo_db, login, password);
    } catch (e) {
      console.warn('[portal login] Odoo auth error:', e.message);
      if (acceptsJson) return res.status(503).json({ ok: false, error: 'No se pudo conectar con el servicio Odoo. Intenta más tarde.' });
      return res.status(503).json({ error: 'No se pudo conectar con el servicio. Intenta más tarde.' });
    }

    if (!authResult.valid) {
      if (acceptsJson) return res.status(401).json({ ok: false, error: 'Credenciales incorrectas' });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    let portalUserId = linked.find((r) => r.instance_id === instance_id)?.portal_user_id || null;
    try {
      const bindRes = await pool.query(
        `INSERT INTO client_portal_users (odoo_login, instance_id, active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (odoo_login, instance_id) DO UPDATE SET active = TRUE
         RETURNING id`,
        [login, instance_id]
      );
      portalUserId = bindRes.rows[0]?.id || portalUserId;
    } catch (bindErr) {
      console.warn('[portal login] auto-bind warn:', bindErr.message);
      try {
        const existing = await pool.query(
          `SELECT id FROM client_portal_users WHERE odoo_login = $1 AND instance_id = $2 LIMIT 1`,
          [login, instance_id]
        );
        portalUserId = existing.rows[0]?.id || null;
      } catch (_) {}
    }

    if (!requestedInstanceId && acceptsJson) {
      let selectable = [];
      if (canPickInstances) {
        const allRes = await pool.query(
          `SELECT id, client_name, service_code, odoo_url, public_url, logo_url
           FROM odoo_instances WHERE active = TRUE ORDER BY client_name ASC`
        );
        selectable = allRes.rows;
      } else {
        const refreshed = await pool.query(
          `SELECT oi.id, oi.client_name, oi.service_code, oi.odoo_url, oi.public_url, oi.logo_url
           FROM client_portal_users cpu
           JOIN odoo_instances oi ON oi.id = cpu.instance_id
           WHERE cpu.odoo_login = $1 AND cpu.active = TRUE AND oi.active = TRUE
           ORDER BY oi.client_name ASC`,
          [login]
        );
        selectable = refreshed.rows;
      }
      if (selectable.length > 1) {
        return res.json({
          ok: false,
          needs_instance_selection: true,
          instances: selectable.map(formatPortalInstanceChoice),
          message: 'Selecciona la instancia a la que deseas acceder',
        });
      }
    }

    if (!instanceRow.public_url) {
      const inferred = rnvCatalog.resolvePublicUrlForInstance({
        ...instanceRow,
        odoo_url,
        service_code: resolvedServiceCode,
        client_name,
      });
      if (inferred) {
        instanceRow.public_url = inferred;
        await pool.query(`UPDATE odoo_instances SET public_url = $1 WHERE id = $2`, [inferred, instance_id]);
      }
    }

    const safeUrl = odoo_url.replace(/"/g, '');
    const safeName = escAttr(client_name);
    const publicBase = portalAuth.toPublicOdooUrl(safeUrl, instanceRow.public_url);
    if (!publicBase) {
      if (acceptsJson) {
        return res.status(503).json({
          ok: false,
          error: 'Esta empresa no tiene URL pública SSO configurada. Contacta a RENACE.TECH.',
          code: 'missing_public_url',
        });
      }
      return res.status(503).json({ error: 'Esta empresa no tiene URL pública SSO configurada.' });
    }
    let ssoRedirectUrl = `${publicBase}/web/login`;

    try {
      const sso = await portalAuth.issueSsoRedirect(pool, {
        portalUserId,
        instanceId: instance_id,
        odooLogin: login,
        odooUrl: safeUrl,
        publicUrl: instanceRow.public_url,
        sessionId: authResult.sessionId || null,
        portalBaseUrl: portalPublicBase(req),
        ip: getRequestClientIp(req),
        userAgent: req.get('user-agent') || '',
      });
      ssoRedirectUrl = sso.ssoRedirectUrl;
    } catch (ssoErr) {
      console.warn('[portal login] SSO token warn:', ssoErr.message);
    }

    if (!acceptsJson && authResult.sessionId) {
      try {
        const cookieHost = new URL(publicBase).hostname;
        const cookieDomain = '.' + cookieHost.split('.').slice(-2).join('.');
        res.setHeader('Set-Cookie',
          `session_id=${authResult.sessionId}; Domain=${cookieDomain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
      } catch (_) {}
    }

    if (acceptsJson) {
      const issued = await portalAuth.issueSession(pool, {
        email: login,
        serviceCode: resolvedServiceCode || serviceCode || null,
        instanceId: instance_id,
        clientName: client_name,
        odooUrl: safeUrl,
        odooDb: odoo_db,
        portalUserId,
      }, {
        ip: getRequestClientIp(req),
        userAgent: req.get('user-agent') || '',
      });
      return res.json({
        ok: true,
        clientName: client_name,
        odooUrl: publicBase,
        odooDb: odoo_db,
        serviceCode: resolvedServiceCode || serviceCode || null,
        uid: authResult.uid || 1,
        portalToken: issued.portalToken,
        portalTokenExpiresAt: issued.expiresAt,
        ssoRedirectUrl,
      });
    }

    res.type('html').send(buildRedirectPage(safeName, publicBase));
  } catch (e) {
    console.error('[portal login]', e.message);
    if (acceptsJson) return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Revoke portal session (native logout)
app.post('/api/portal/logout', portalApiLimiter, async (req, res) => {
  await portalAuth.revokeSession(pool, req);
  return res.json({ ok: true });
});

// Mint a fresh short-lived SSO link (requires portal session)
app.post('/api/portal/sso-link', portalApiLimiter, async (req, res) => {
  const session = await portalAuth.resolveSession(pool, req);
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' });
  }
  try {
    const sso = await portalAuth.issueSsoRedirect(pool, {
      portalUserId: session.portalUserId,
      instanceId: session.instanceId,
      odooLogin: session.email,
      odooUrl: session.odooUrl,
      publicUrl: null,
      sessionId: null,
      portalBaseUrl: portalPublicBase(req),
      ip: getRequestClientIp(req),
      userAgent: req.get('user-agent') || '',
    });
    return res.json({ ok: true, ssoRedirectUrl: sso.ssoRedirectUrl, expiresAt: sso.expiresAt });
  } catch (e) {
    console.error('[portal sso-link]', e.message);
    return res.status(500).json({ ok: false, error: 'No se pudo generar el enlace SSO' });
  }
});

// Portal support requests — authenticated only
app.post('/api/portal/requests', portalApiLimiter, async (req, res) => {
  const session = await portalAuth.resolveSession(pool, req);
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Sesión de portal requerida. Vuelve a iniciar sesión.' });
  }

  const serviceCode = String(session.serviceCode || '').trim().toLowerCase().slice(0, 32);
  const subject = String(req.body?.subject || '').replace(/[<>\"]/g, '').trim().slice(0, 200);
  const category = String(req.body?.category || 'soporte').replace(/[<>\"]/g, '').trim().slice(0, 80);
  const priority = String(req.body?.priority || 'media').replace(/[<>\"]/g, '').trim().slice(0, 40);
  const description = String(req.body?.description || '').replace(/[<>\"]/g, '').trim().slice(0, 5000);
  const contactEmail = String(session.email || '').trim().slice(0, 254);
  const clientName = String(session.clientName || '').replace(/[<>\"]/g, '').trim().slice(0, 255);
  const attachment = typeof req.body?.attachment === 'string' ? req.body.attachment : null;
  const hasAttachment = security.isSafeImageDataUrl(attachment);

  if (!subject || !description) {
    return res.status(400).json({ ok: false, error: 'Asunto y descripción son requeridos' });
  }
  if (attachment && !hasAttachment) {
    return res.status(400).json({ ok: false, error: 'Adjunto inválido (solo imagen JPEG/PNG/WebP/GIF ≤ 1.5MB)' });
  }

  let requestId = null;
  try {
    const inserted = await pool.query(
      `INSERT INTO portal_requests
        (service_code, client_name, contact_email, subject, category, priority, description, has_attachment, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        serviceCode || null,
        clientName || null,
        contactEmail || null,
        subject,
        category,
        priority,
        description,
        hasAttachment,
        getRequestClientIp(req),
      ]
    );
    requestId = inserted.rows[0]?.id || null;
  } catch (e) {
    console.warn('[portal requests] DB insert warn:', e.message);
  }

  const ticketRef = requestId ? `PR-${requestId}` : `PR-${Date.now()}`;
  const summary =
    `🛠️ *Solicitud Portal App*\n` +
    `*Ref:* ${ticketRef}\n` +
    `*Empresa:* ${clientName || 'N/D'} (${serviceCode || 'sin código'})\n` +
    `*Contacto:* ${contactEmail || 'N/D'}\n` +
    `*Prioridad:* ${priority}\n` +
    `*Categoría:* ${category}\n` +
    `*Asunto:* ${subject}\n\n${description}` +
    (hasAttachment ? '\n\n(Adjunto imagen incluido en el correo)' : '');

  if (transporter) {
    try {
      const mail = {
        to: ADMIN_EMAILS.join(', '),
        subject: `[Portal] ${priority.toUpperCase()} · ${subject} · ${serviceCode || 'app'}`,
        text: summary.replace(/\*/g, ''),
        html: `<h3>Nueva solicitud — Portal App</h3>
          <p><strong>Ref:</strong> ${ticketRef}</p>
          <p><strong>Empresa:</strong> ${clientName || 'N/D'} (${serviceCode || 'sin código'})</p>
          <p><strong>Contacto:</strong> ${contactEmail || 'N/D'}</p>
          <p><strong>Prioridad:</strong> ${priority} · <strong>Categoría:</strong> ${category}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <p>${description.replace(/\n/g, '<br>')}</p>`,
      };
      const parsed = hasAttachment ? security.parseImageDataUrl(attachment) : null;
      if (parsed) {
        mail.attachments = [{
          filename: `adjunto-${ticketRef}.${parsed.ext}`,
          content: parsed.buffer,
          contentType: parsed.contentType,
        }];
      }
      await transporter.sendMail(getMailOptions(mail));
    } catch (err) {
      console.warn('[portal requests] email warn:', err.message);
    }
  }

  if (waNotify.isConfigured()) {
    waNotify.notifyAdmins(summary.slice(0, 900), { app: 'renace-portal-app', event: 'portal_request' })
      .catch((e) => console.warn('[portal requests] WhatsApp warn:', e.message));
  }

  return res.json({
    ok: true,
    id: requestId,
    ref: ticketRef,
    message: 'Solicitud recibida. El equipo RENACE te contactará pronto.',
  });
});

// ── Google OAuth for Portal ──
const _googleOAuthStates = new Map();

app.get('/api/portal/google', portalLimiter, (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect('/portal?error=' + encodeURIComponent('Login con Google no configurado.'));
  }
  const state = crypto.randomBytes(20).toString('hex');
  _googleOAuthStates.set(state, Date.now() + 5 * 60 * 1000);
  // Cleanup old states
  for (const [k, exp] of _googleOAuthStates.entries()) { if (exp < Date.now()) _googleOAuthStates.delete(k); }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
});

app.get('/api/portal/google/callback', portalLimiter, async (req, res) => {
  const { code, state, error: oauthErr } = req.query;
  if (oauthErr) return res.redirect('/portal?error=' + encodeURIComponent('Acceso con Google cancelado.'));
  if (!code || !state) return res.redirect('/portal?error=' + encodeURIComponent('Parámetros de autenticación inválidos.'));

  const stateExp = _googleOAuthStates.get(state);
  _googleOAuthStates.delete(state);
  if (!stateExp || stateExp < Date.now()) {
    return res.redirect('/portal?error=' + encodeURIComponent('Sesión expirada, intenta de nuevo.'));
  }

  try {
    // Exchange code for token
    const tokenBody = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.warn('[google oauth] token exchange failed:', tokenData);
      return res.redirect('/portal?error=' + encodeURIComponent('No se pudo autenticar con Google.'));
    }

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    if (!userInfo.email) {
      return res.redirect('/portal?error=' + encodeURIComponent('No se pudo obtener el correo de Google.'));
    }

    const googleEmail = userInfo.email.toLowerCase();

    // Look up linked portal user
    const result = await pool.query(
      `SELECT cpu.id, cpu.odoo_login, cpu.odoo_password_enc, oi.odoo_url, oi.odoo_db, oi.client_name
       FROM client_portal_users cpu
       JOIN odoo_instances oi ON oi.id = cpu.instance_id
       WHERE LOWER(cpu.google_email) = $1 AND cpu.active = TRUE AND oi.active = TRUE
       LIMIT 1`,
      [googleEmail]
    );

    if (!result.rows.length) {
      return res.redirect('/portal?error=' + encodeURIComponent('Tu cuenta de Google no está vinculada. Contacta al administrador.'));
    }

    const { odoo_login, odoo_password_enc, odoo_url, odoo_db, client_name } = result.rows[0];

    if (!odoo_password_enc) {
      return res.redirect('/portal?error=' + encodeURIComponent('Credenciales de Odoo no configuradas para login con Google. Contacta al administrador.'));
    }

    let odooPassword;
    try { odooPassword = portalDecrypt(odoo_password_enc); }
    catch (e) {
      console.error('[google oauth] decrypt failed:', e.message);
      return res.redirect('/portal?error=' + encodeURIComponent('Error al procesar credenciales. Contacta al administrador.'));
    }

    // Validate against Odoo
    let authResult;
    try { authResult = await odooValidateCredentials(odoo_url, odoo_db, odoo_login, odooPassword); }
    catch (e) {
      console.warn('[google oauth] Odoo auth error:', e.message);
      return res.redirect('/portal?error=' + encodeURIComponent('No se pudo conectar con Odoo. Intenta más tarde.'));
    }

    if (!authResult.valid) {
      return res.redirect('/portal?error=' + encodeURIComponent('Las credenciales de Odoo vinculadas son inválidas. Contacta al administrador.'));
    }

    const safeUrl  = odoo_url.replace(/"/g, '');
    const safeName = escAttr(client_name);

    if (authResult.sessionId) {
      const cookieDomain = '.' + (new URL(safeUrl).hostname.split('.').slice(-2).join('.'));
      res.setHeader('Set-Cookie',
        `session_id=${authResult.sessionId}; Domain=${cookieDomain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
    }

    res.type('html').send(buildRedirectPage(safeName, safeUrl));
  } catch (e) {
    console.error('[google oauth callback]', e.message);
    res.redirect('/portal?error=' + encodeURIComponent('Error interno del servidor.'));
  }
});

// ── Admin: CRUD Odoo Instances ──
app.get('/api/admin/odoo-instances', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const r = await pool.query('SELECT id, client_name, odoo_url, public_url, logo_url, odoo_db, service_code, active, created_at FROM odoo_instances ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/odoo-instances', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const client_name  = String(req.body?.client_name || '').replace(/[<>"]/g, '').trim().slice(0, 255);
  const odoo_url     = String(req.body?.odoo_url || '').trim().slice(0, 500);
  const public_url   = String(req.body?.public_url || req.body?.publicUrl || '').trim().slice(0, 500);
  const odoo_db      = String(req.body?.odoo_db || '').replace(/[<>"]/g, '').trim().slice(0, 255);
  const service_code = String(req.body?.service_code || req.body?.serviceCode || '').trim().slice(0, 32);

  if (!client_name || !odoo_url || !odoo_db) return res.status(400).json({ error: 'Nombre, URL y base de datos son requeridos' });
  try { new URL(odoo_url); } catch { return res.status(400).json({ error: 'URL inválida' }); }
  if (public_url) {
    try { new URL(public_url); } catch { return res.status(400).json({ error: 'URL pública inválida' }); }
  }

  try {
    let finalCode = service_code;
    if (!finalCode) {
      const countRes = await pool.query('SELECT COUNT(*) FROM odoo_instances');
      const nextNum = parseInt(countRes.rows[0].count, 10) + 101;
      finalCode = String(nextNum);
    }
    const r = await pool.query(
      'INSERT INTO odoo_instances (client_name, odoo_url, public_url, odoo_db, service_code) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [client_name, odoo_url, public_url || null, odoo_db, finalCode]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/odoo-instances/:id', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  const client_name  = String(req.body?.client_name || '').replace(/[<>"]/g, '').trim().slice(0, 255);
  const odoo_url     = String(req.body?.odoo_url || '').trim().slice(0, 500);
  const public_url   = String(req.body?.public_url || req.body?.publicUrl || '').trim().slice(0, 500);
  const odoo_db      = String(req.body?.odoo_db || '').replace(/[<>"]/g, '').trim().slice(0, 255);
  const service_code = String(req.body?.service_code || req.body?.serviceCode || '').trim().slice(0, 32);
  const active       = req.body?.active !== undefined ? !!req.body.active : true;

  if (!client_name || !odoo_url || !odoo_db) return res.status(400).json({ error: 'Campos requeridos' });
  try { new URL(odoo_url); } catch { return res.status(400).json({ error: 'URL inválida' }); }
  if (public_url) {
    try { new URL(public_url); } catch { return res.status(400).json({ error: 'URL pública inválida' }); }
  }
  try {
    const r = await pool.query(
      'UPDATE odoo_instances SET client_name=$1, odoo_url=$2, public_url=$3, odoo_db=$4, service_code=$5, active=$6 WHERE id=$7 RETURNING *',
      [client_name, odoo_url, public_url || null, odoo_db, service_code || null, active, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/odoo-instances/:id', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  try { await pool.query('DELETE FROM odoo_instances WHERE id=$1', [id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RNV Manager Integration: Auto Sync Instances & Tokens ──
app.post('/api/rnv/sync', apiLimiter, async (req, res) => {
  const apiKey = String(req.headers['x-rnv-api-key'] || req.body?.apiKey || '');
  const adminSecret = process.env.ADMIN_TOKEN || '';
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const secretOk = Boolean(adminSecret) && (
    security.timingSafeEqualString(apiKey, adminSecret) ||
    security.timingSafeEqualString(bearer, adminSecret)
  );
  if (!secretOk) {
    if (!requireAdminToken(req, res)) return;
  }

  const items = Array.isArray(req.body?.instances) ? req.body.instances : [req.body];
  if (!items.length || (!items[0]?.client_name && !items[0]?.name && !items[0]?.url && !items[0]?.odoo_url)) {
    return res.status(400).json({ ok: false, error: 'Lista o datos de instancias requeridos de RNV Manager' });
  }

  try {
    const synced = [];
    for (const raw of items) {
      const item = rnvCatalog.normalizeRnvItem(raw);
      if (!item.client_name || (!item.odoo_url && !item.public_url)) continue;

      let finalCode = item.service_code;
      if (!finalCode) {
        const countRes = await pool.query('SELECT COUNT(*) FROM odoo_instances');
        finalCode = String(parseInt(countRes.rows[0].count, 10) + 101);
      }

      const odooUrl = item.odoo_url || item.public_url;
      const publicUrl = item.public_url || rnvCatalog.resolvePublicUrlForInstance({
        ...item,
        odoo_url: odooUrl,
        service_code: finalCode,
      });

      const r = await pool.query(
        `INSERT INTO odoo_instances (client_name, odoo_url, public_url, odoo_db, service_code, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (service_code) DO UPDATE
         SET client_name = EXCLUDED.client_name,
             odoo_url = EXCLUDED.odoo_url,
             public_url = COALESCE(EXCLUDED.public_url, odoo_instances.public_url),
             odoo_db = EXCLUDED.odoo_db,
             active = EXCLUDED.active
         RETURNING *`,
        [item.client_name, odooUrl, publicUrl, item.odoo_db, finalCode, item.active]
      );
      if (r.rows[0]) synced.push(r.rows[0]);
    }

    res.json({ ok: true, count: synced.length, synced });
  } catch (e) {
    console.error('[rnv sync error]', e.message);
    res.status(500).json({ ok: false, error: 'Error al sincronizar desde RNV Manager' });
  }
});

// Purge/fix public SSO URLs from live RNV /api/services (type=odoo) + catalog fallback
app.post('/api/admin/odoo-instances/purge-public-urls', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const pulled = [];
    const rnvPullErrors = [];
    const rnvBase = String(process.env.RNV_API_URL || 'https://rnv.renace.tech').replace(/\/$/, '');
    const rnvKey = String(
      req.body?.rnvToken ||
      process.env.RNV_API_TOKEN ||
      process.env.RNV_API_KEY ||
      ''
    ).trim();

    // Optional: paste RNV services JSON directly { services: [...] } / { instances: [...] }
    const manualList = Array.isArray(req.body?.services)
      ? req.body.services
      : Array.isArray(req.body?.instances)
        ? req.body.instances
        : [];
    for (const row of manualList) {
      if (rnvCatalog.isRnvOdooService(row) || row?.odoo_url || row?.service_code || row?.public_url) {
        pulled.push(row);
      }
    }

    if (rnvKey) {
      for (const pathSuffix of ['/api/services', '/api/topology']) {
        try {
          const rr = await fetch(rnvBase + pathSuffix, {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${rnvKey}`,
            },
          });
          const body = await rr.json().catch(() => ({}));
          if (!rr.ok) {
            rnvPullErrors.push(`${pathSuffix}: HTTP ${rr.status} ${body?.error || ''}`.trim());
            continue;
          }
          let list = rnvCatalog.extractRnvList(body);
          if (pathSuffix === '/api/topology') {
            list = list.filter((n) => String(n?.type || '').toLowerCase() === 'service');
            list = list.map((n) => ({
              name: n.label || n.meta?.name,
              type: n.meta?.type,
              url: n.meta?.url,
              port: n.meta?.port,
              client: n.meta?.clientName ? { name: n.meta.clientName } : null,
              status: n.status,
            }));
          }
          const odooRows = list.filter((row) => rnvCatalog.isRnvOdooService(row));
          for (const row of odooRows) pulled.push(row);
          if (odooRows.length) break;
          if (list.length && !odooRows.length) {
            rnvPullErrors.push(`${pathSuffix}: ${list.length} filas, 0 type=odoo`);
          }
        } catch (e) {
          rnvPullErrors.push(`${pathSuffix}: ${e.message}`);
          console.warn('[purge-public-urls] RNV pull warn:', pathSuffix, e.message);
        }
      }
    } else if (!manualList.length) {
      rnvPullErrors.push('Sin RNV_API_TOKEN / RNV_API_KEY — solo se siembra el catálogo local');
    }

    // Deduplicate by service_code / slug
    const seenPull = new Set();
    const uniquePulled = [];
    for (const raw of pulled) {
      const item = rnvCatalog.normalizeRnvItem(raw);
      const key = String(item.service_code || '').toLowerCase();
      if (!key || seenPull.has(key)) continue;
      if (rnvCatalog.NON_ODOO_HOSTS.has(key)) continue;
      seenPull.add(key);
      uniquePulled.push(raw);
    }

    let upserted = 0;
    for (const raw of uniquePulled) {
      const item = rnvCatalog.normalizeRnvItem(raw);
      if (!item.client_name || (!item.odoo_url && !item.public_url)) continue;
      const finalCode = item.service_code;
      if (!finalCode) continue;
      const odooUrl = item.odoo_url || item.public_url;
      await pool.query(
        `INSERT INTO odoo_instances (client_name, odoo_url, public_url, odoo_db, service_code, active)
         VALUES ($1,$2,$3,$4,$5,TRUE)
         ON CONFLICT (service_code) DO UPDATE
         SET client_name = EXCLUDED.client_name,
             odoo_url = COALESCE(NULLIF(EXCLUDED.odoo_url, ''), odoo_instances.odoo_url),
             public_url = COALESCE(EXCLUDED.public_url, odoo_instances.public_url),
             odoo_db = COALESCE(NULLIF(EXCLUDED.odoo_db, ''), odoo_instances.odoo_db),
             active = TRUE`,
        [item.client_name, odooUrl, item.public_url, item.odoo_db, finalCode]
      );
      upserted += 1;
    }

    const existing = await pool.query(
      `SELECT id, client_name, odoo_url, public_url, odoo_db, service_code, active FROM odoo_instances ORDER BY id ASC`
    );
    const updated = [];
    const coded = [];
    const usedCodes = new Set(
      existing.rows.map((r) => String(r.service_code || '').trim().toLowerCase()).filter(Boolean)
    );

    for (const row of existing.rows) {
      const patch = {};
      const resolvedPublic = rnvCatalog.resolvePublicUrlForInstance(row);
      if (resolvedPublic && String(row.public_url || '').replace(/\/$/, '') !== resolvedPublic.replace(/\/$/, '')) {
        patch.public_url = resolvedPublic;
      }

      let nextCode = String(row.service_code || '').trim().toLowerCase();
      if (!nextCode) {
        const inferred = rnvCatalog.resolveServiceCodeForInstance({
          ...row,
          public_url: patch.public_url || row.public_url,
        });
        if (inferred && !usedCodes.has(inferred)) {
          nextCode = inferred;
          patch.service_code = inferred;
          usedCodes.add(inferred);
        }
      }

      if (!Object.keys(patch).length) continue;
      const r = await pool.query(
        `UPDATE odoo_instances
         SET public_url = COALESCE($1, public_url),
             service_code = COALESCE($2, service_code)
         WHERE id = $3
         RETURNING id, client_name, service_code, odoo_url, public_url`,
        [patch.public_url || null, patch.service_code || null, row.id]
      );
      if (r.rows[0]) {
        updated.push(r.rows[0]);
        if (patch.service_code) coded.push(r.rows[0]);
      }
    }

    // Ensure catalog clients exist (code + public URL) even if never created manually
    let seeded = 0;
    for (const entry of rnvCatalog.RNV_ODOO_PUBLIC) {
      if (entry.slug === 'odoo') continue; // prefer app as main RENACE
      if (usedCodes.has(entry.slug)) continue;
      const nameGuess = entry.slug === 'app' ? 'renace.tech' : entry.slug;
      await pool.query(
        `INSERT INTO odoo_instances (client_name, odoo_url, public_url, odoo_db, service_code, active)
         VALUES ($1, $2, $2, 'db', $3, TRUE)
         ON CONFLICT (service_code) DO UPDATE
         SET public_url = COALESCE(odoo_instances.public_url, EXCLUDED.public_url),
             active = TRUE`,
        [nameGuess, entry.publicUrl, entry.slug]
      );
      usedCodes.add(entry.slug);
      seeded += 1;
    }

    // Clear bogus public_url that point every tenant at app.renace.tech unless it is the main instance
    const cleared = await pool.query(
      `UPDATE odoo_instances
       SET public_url = NULL
       WHERE public_url ILIKE '%app.renace.tech%'
         AND COALESCE(LOWER(service_code), '') NOT IN ('app', 'odoo', 'principal', 'renace')
         AND LOWER(client_name) NOT LIKE '%renace%'
       RETURNING id, client_name, service_code`
    );

    for (const row of cleared.rows) {
      const full = existing.rows.find((x) => x.id === row.id) || row;
      const resolved = rnvCatalog.resolvePublicUrlForInstance({ ...full, public_url: null });
      if (!resolved || resolved.includes('app.renace.tech')) continue;
      await pool.query(`UPDATE odoo_instances SET public_url = $1 WHERE id = $2`, [resolved, row.id]);
      updated.push({ id: row.id, client_name: row.client_name, service_code: row.service_code, public_url: resolved });
    }

    const finalRows = await pool.query(
      `SELECT id, service_code, client_name, odoo_url, public_url, active FROM odoo_instances ORDER BY client_name ASC`
    );

    res.json({
      ok: true,
      pulledFromRnv: uniquePulled.length,
      upsertedFromRnv: upserted,
      updatedPublicUrls: updated.length,
      assignedServiceCodes: coded.length,
      seededFromCatalog: seeded,
      clearedAppFallback: cleared.rowCount || 0,
      totalInstances: finalRows.rowCount || finalRows.rows.length,
      rnvConfigured: Boolean(rnvKey),
      rnvPullErrors,
      instances: finalRows.rows,
    });
  } catch (e) {
    console.error('[purge-public-urls]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Gemini AI Copilot Engine (Replicando comportamiento RNV Manager) ──
app.post('/api/ai/copilot', portalApiLimiter, async (req, res) => {
  const session = await portalAuth.resolveSession(pool, req);
  // Anonymous: only generic help. Authenticated: bind identity from session (ignore spoofed body fields)
  const { question, action, history } = req.body || {};
  const serviceCode = session?.serviceCode || null;
  const clientName = session?.clientName || null;
  const queryText = (question || action || '').trim().slice(0, 2000);

  if (!queryText) {
    return res.status(400).json({ ok: false, error: 'Pregunta o comando no especificado' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // Sin GEMINI_API_KEY: guía honesta (sin métricas inventadas ni acciones falsas en Odoo)
  if (!geminiApiKey) {
    const qLower = queryText.toLowerCase();
    let reply = `🤖 **Copilot RENACE**: Hola ${clientName || 'Cliente'}. Estoy listo para orientarte con tu empresa [ID: **${serviceCode || 'N/D'}**].`;
    let card = null;

    if (qLower.includes('producto') || action === 'create_product_prompt') {
      reply = `📦 **Productos en Odoo**: abre **Acceder a Odoo ERP** → Inventario / Productos para crear o editar artículos reales. Desde esta app también puedes abrir una **Nueva Solicitud** si necesitas que el equipo RENACE lo configure por ti.`;
      card = { type: 'action', title: 'Abrir Odoo para productos', icon: '📦', action: 'open_odoo' };
    } else if (qLower.includes('venta') || qLower.includes('factura') || action === 'view_sales_prompt' || action === 'view_invoices_prompt') {
      reply = `📊 **Ventas y facturas**: las cifras reales viven en tu Odoo (Ventas / Contabilidad). Ábrelo con **Acceder a Odoo ERP**. Si el módulo no está activo en tu plan, crea una **Nueva Solicitud** y te ayudamos.`;
      card = { type: 'action', title: 'Consultar en Odoo', icon: '📊', action: 'open_odoo' };
    } else if (qLower.includes('ticket') || qLower.includes('soporte') || action === 'create_ticket_prompt') {
      reply = `🛠️ **Soporte**: usa **Nueva Solicitud**. Sin internet se guarda en el dispositivo y se sincroniza con renace.tech al reconectar.`;
    } else if (qLower.includes('summary') || qLower.includes('help') || action === 'summary' || action === 'help') {
      reply = `Puedo ayudarte a: (1) abrir tu Odoo con SSO, (2) crear solicitudes de soporte offline, (3) orientarte sobre módulos. Para datos en vivo usa Odoo.`;
    }

    return res.json({
      ok: true,
      reply,
      card,
      suggestedPills: [
        { label: '🛠️ Crear Solicitud de Soporte', action: 'create_ticket_prompt' },
        { label: '📊 Cómo ver ventas', action: 'view_sales_prompt' },
        { label: '📦 Cómo crear productos', action: 'create_product_prompt' }
      ]
    });
  }

  // Llamada a API Gemini con Tool Calling (estilo RNV Manager)
  try {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'odoo_create_product',
            description: 'Crea un producto o artículo de inventario en la instancia Odoo del cliente.',
            parameters: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Nombre del producto' },
                price: { type: 'NUMBER', description: 'Precio de venta' },
                cost: { type: 'NUMBER', description: 'Costo del producto' },
                qty: { type: 'NUMBER', description: 'Cantidad inicial de stock' }
              },
              required: ['name', 'price']
            }
          },
          {
            name: 'odoo_query_sales',
            description: 'Consulta el resumen de ventas y métricas financieras de Odoo.',
            parameters: {
              type: 'OBJECT',
              properties: {
                period: { type: 'STRING', description: 'Período a consultar (hoy, semana, mes)' }
              }
            }
          }
        ]
      }
    ];

    const contents = [
      {
        role: 'user',
        parts: [{ text: `[Cliente: ${clientName || 'Empresa'}, ID: ${serviceCode || '101'}] ${queryText}` }]
      }
    ];

    let responseData = null;
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: 'Eres Copilot RENACE (Gemini), el asistente virtual oficial de RENACE.TECH y Odoo ERP. Responde de forma amable, directa y eficiente. Usa las funciones disponibles cuando el usuario pida acciones sobre Odoo.' }]
            },
            contents,
            tools
          })
        });

        if (gRes.ok) {
          responseData = await gRes.json();
          break;
        }
      } catch (_) {}
    }

    if (!responseData || !responseData.candidates || !responseData.candidates[0]) {
      throw new Error('Sin respuesta del servicio Gemini');
    }

    const candidate = responseData.candidates[0];
    const parts = candidate.content?.parts || [];
    let textReply = '';
    let executedCard = null;

    for (const part of parts) {
      if (part.text) textReply += part.text;
      if (part.functionCall) {
        const call = part.functionCall;
        if (call.name === 'odoo_create_product') {
          const args = call.args || {};
          executedCard = {
            type: 'action',
            title: `Borrador de producto: ${args.name || 'Sin nombre'}`,
            detail: `Precio sugerido: $${args.price || 0} USD | Stock: ${args.qty || 1}`,
            icon: '📦'
          };
          textReply += `\n\n📝 **Borrador listo** (no se escribió en Odoo desde aquí): **${args.name || 'producto'}** a $${args.price || 0} USD. Ábrelo en Odoo Inventory para crearlo de forma real, o envía una **Nueva Solicitud**.`;
        } else if (call.name === 'odoo_query_sales') {
          executedCard = {
            type: 'action',
            title: 'Consultar ventas en Odoo',
            detail: `Período: ${call.args?.period || 'mes'}`,
            icon: '📊'
          };
          textReply += `\n\n📊 No invento cifras. Abre **Acceder a Odoo ERP** → Ventas / Informes para ver el período **${call.args?.period || 'mes'}** con datos reales.`;
        }
      }
    }

    res.json({
      ok: true,
      reply: textReply.trim() || 'He procesado tu consulta.',
      card: executedCard,
      suggestedPills: [
        { label: '📦 Crear Producto', action: 'create_product_prompt' },
        { label: '📊 Ventas del Mes', action: 'view_sales_prompt' }
      ]
    });

  } catch (e) {
    console.warn('[copilot gemini warn]', e.message);
    res.json({
      ok: true,
      reply: `🤖 **Copilot RENACE**: He recibido tu consulta para **${clientName || 'tu empresa'}** [ID: **${serviceCode || '101'}**]. ¿Deseas crear un producto, consultar tus facturas o redactar un ticket de soporte?`,
      suggestedPills: [
        { label: '📦 Crear Producto en Odoo', action: 'create_product_prompt' },
        { label: '📊 Ver Ventas', action: 'view_sales_prompt' }
      ]
    });
  }
});

// ── Admin: CRUD Portal Users ──
app.get('/api/admin/portal-users', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const r = await pool.query(
      `SELECT cpu.id, cpu.odoo_login, cpu.google_email, cpu.active, cpu.created_at,
              cpu.odoo_password_enc IS NOT NULL AS has_password,
              oi.client_name, oi.id AS instance_id
       FROM client_portal_users cpu
       JOIN odoo_instances oi ON oi.id = cpu.instance_id
       ORDER BY cpu.created_at DESC`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/portal-users', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const odoo_login   = String(req.body?.odoo_login || '').replace(/[<>]/g, '').trim().slice(0, 254);
  const instance_id  = parseInt(req.body?.instance_id);
  const google_email = String(req.body?.google_email || '').replace(/[<>]/g, '').trim().toLowerCase().slice(0, 254) || null;
  const odoo_password = String(req.body?.odoo_password || '').slice(0, 256) || null;
  if (!odoo_login || !instance_id) return res.status(400).json({ error: 'Login e instancia son requeridos' });
  let passwordEnc = null;
  if (odoo_password) {
    try { passwordEnc = portalEncrypt(odoo_password); }
    catch (e) { return res.status(500).json({ error: 'No se pudo cifrar la contraseña: ' + e.message }); }
  }
  try {
    const r = await pool.query(
      'INSERT INTO client_portal_users (odoo_login, instance_id, google_email, odoo_password_enc) VALUES ($1,$2,$3,$4) RETURNING *',
      [odoo_login, instance_id, google_email, passwordEnc]
    );
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Este usuario ya está registrado en esa instancia' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/portal-users/:id', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  const active = req.body?.active !== undefined ? !!req.body.active : undefined;
  const google_email = req.body?.google_email !== undefined
    ? (String(req.body.google_email || '').replace(/[<>]/g, '').trim().toLowerCase().slice(0, 254) || null)
    : undefined;
  const odoo_password = req.body?.odoo_password !== undefined
    ? (String(req.body.odoo_password || '').slice(0, 256) || null)
    : undefined;

  const sets = [];
  const vals = [];
  let idx = 1;
  if (active !== undefined) { sets.push(`active=$${idx++}`); vals.push(active); }
  if (google_email !== undefined) { sets.push(`google_email=$${idx++}`); vals.push(google_email); }
  if (odoo_password !== undefined) {
    let enc = null;
    if (odoo_password) {
      try { enc = portalEncrypt(odoo_password); }
      catch (e) { return res.status(500).json({ error: 'No se pudo cifrar la contraseña: ' + e.message }); }
    }
    sets.push(`odoo_password_enc=$${idx++}`); vals.push(enc);
  }
  if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });
  vals.push(id);
  try {
    const r = await pool.query(`UPDATE client_portal_users SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, vals);
    if (!r.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/portal-users/:id', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  try { await pool.query('DELETE FROM client_portal_users WHERE id=$1', [id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SSO: Service Validator Helper ──
async function validateServiceCredentials(url, db, login, password) {
  if (url.includes('forms.renace.tech') || url.includes('forms.local.renace.tech')) {
    try {
      // Direct REST auth to RNV Manager
      const baseUrl = url.replace(/\/admin\/?$/, '');
      const res = await fetch(baseUrl + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: login, password })
      });
      const data = await res.json();
      return { valid: res.ok && !!data.token, sessionId: data.token, customService: true };
    } catch (e) {
      console.error('[rnv auth error]', e.message);
      return { valid: false };
    }
  }
  // Fallback to Odoo XML-RPC
  return await odooValidateCredentials(url, db, login, password);
}

// ── SSO: Generate Token for Portal Login ──
app.post('/api/sso/generate-token', portalLimiter, async (req, res) => {
  const odoo_login = String(req.body?.odoo_login || req.body?.login || '').trim().slice(0, 254);
  const password = String(req.body?.password || '').slice(0, 256);
  const serviceCode = String(req.body?.serviceCode || req.body?.service_code || '').trim().toLowerCase().slice(0, 32);
  const instanceIdRaw = req.body?.instanceId ?? req.body?.instance_id;
  const requestedInstanceId = instanceIdRaw != null && instanceIdRaw !== ''
    ? parseInt(String(instanceIdRaw), 10)
    : null;

  if (!odoo_login || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  if (requestedInstanceId != null && (!Number.isFinite(requestedInstanceId) || requestedInstanceId < 1)) {
    return res.status(400).json({ error: 'instanceId inválido' });
  }

  try {
    const canPickInstances = canPickPortalInstances(odoo_login);

    const linkedRes = await pool.query(
      `SELECT cpu.id, cpu.odoo_login, oi.id AS instance_id, oi.odoo_url, oi.public_url, oi.odoo_db,
              oi.client_name, oi.service_code
       FROM client_portal_users cpu
       JOIN odoo_instances oi ON oi.id = cpu.instance_id
       WHERE cpu.odoo_login = $1 AND cpu.active = TRUE AND oi.active = TRUE
       ORDER BY oi.id ASC`,
      [odoo_login]
    );
    const linked = linkedRes.rows;

    let targetInstance = null;

    if (requestedInstanceId) {
      const instRes = await pool.query(
        `SELECT id AS instance_id, odoo_url, public_url, odoo_db, client_name, service_code
         FROM odoo_instances WHERE id = $1 AND active = TRUE LIMIT 1`,
        [requestedInstanceId]
      );
      if (!instRes.rows.length) {
        return res.status(404).json({ error: 'Instancia no encontrada' });
      }
      targetInstance = instRes.rows[0];
      const allowed = canPickInstances || linked.some((r) => r.instance_id === requestedInstanceId);
      if (!allowed) {
        return res.status(403).json({ error: 'No tienes acceso a esta instancia' });
      }
    } else if (serviceCode) {
      const instRes = await pool.query(
        `SELECT id AS instance_id, odoo_url, public_url, odoo_db, client_name, service_code
         FROM odoo_instances
         WHERE LOWER(service_code) = $1 AND active = TRUE
         LIMIT 1`,
        [serviceCode]
      );
      if (!instRes.rows.length) {
        return res.status(401).json({ error: 'Código de empresa incorrecto o empresa no registrada' });
      }
      targetInstance = instRes.rows[0];
    } else if (linked.length === 1 && !canPickInstances) {
      targetInstance = linked[0];
    } else if (linked.length >= 1) {
      // Auth against first linked instance, then may ask for selection
      targetInstance = linked[0];
    } else {
      return res.status(400).json({
        error: 'Código de empresa requerido',
        code: 'service_code_required',
        needs_service_code: true,
      });
    }

    let customServiceToken = null;
    let authResult;
    try {
      authResult = await validateServiceCredentials(
        targetInstance.odoo_url,
        targetInstance.odoo_db,
        odoo_login,
        password
      );
      if (!authResult.valid) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }
      if (authResult.customService) customServiceToken = authResult.sessionId;
    } catch (e) {
      console.warn('[sso generate] Auth error:', e.message);
      return res.status(503).json({ error: 'No se pudo conectar con el servicio. Intenta más tarde.' });
    }

    // Bind / upsert portal user for this instance
    let portalUserId = linked.find((r) => r.instance_id === targetInstance.instance_id)?.id || null;
    try {
      const bindRes = await pool.query(
        `INSERT INTO client_portal_users (odoo_login, instance_id, active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (odoo_login, instance_id) DO UPDATE SET active = TRUE
         RETURNING id`,
        [odoo_login, targetInstance.instance_id]
      );
      portalUserId = bindRes.rows[0]?.id || portalUserId;
    } catch (bindErr) {
      console.warn('[sso generate] auto-bind warn:', bindErr.message);
      if (!portalUserId) {
        const existing = await pool.query(
          `SELECT id FROM client_portal_users WHERE odoo_login = $1 AND instance_id = $2 LIMIT 1`,
          [odoo_login, targetInstance.instance_id]
        );
        portalUserId = existing.rows[0]?.id || null;
      }
    }

    if (!portalUserId) {
      return res.status(500).json({ error: 'No se pudo vincular el usuario del portal' });
    }

    if (PORTAL_ENCRYPTION_KEY) {
      try {
        const encryptedPassword = portalEncrypt(password);
        await pool.query(
          `UPDATE client_portal_users SET odoo_password_enc = $1 WHERE id = $2`,
          [encryptedPassword, portalUserId]
        );
      } catch (e) {
        console.warn('[sso generate] Could not encrypt password:', e.message);
      }
    }

    // Instance selection: multi-access emails see all active; multi-link users see their links
    const needsExplicitPick = !requestedInstanceId;
    if (needsExplicitPick) {
      let selectable = [];
      if (canPickInstances) {
        const allRes = await pool.query(
          `SELECT id, client_name, service_code, odoo_url, public_url, logo_url
           FROM odoo_instances WHERE active = TRUE ORDER BY client_name ASC`
        );
        selectable = allRes.rows;
      } else {
        const refreshed = await pool.query(
          `SELECT oi.id, oi.client_name, oi.service_code, oi.odoo_url, oi.public_url, oi.logo_url
           FROM client_portal_users cpu
           JOIN odoo_instances oi ON oi.id = cpu.instance_id
           WHERE cpu.odoo_login = $1 AND cpu.active = TRUE AND oi.active = TRUE
           ORDER BY oi.client_name ASC`,
          [odoo_login]
        );
        selectable = refreshed.rows;
      }

      if (selectable.length > 1) {
        return res.json({
          success: false,
          needs_instance_selection: true,
          instances: selectable.map(formatPortalInstanceChoice),
          message: 'Selecciona la instancia a la que deseas acceder',
        });
      }
    }

    // Ensure each instance has its own public SSO URL (never invent app.renace.tech for clients)
    if (!targetInstance.public_url) {
      const inferred = rnvCatalog.resolvePublicUrlForInstance(targetInstance);
      if (inferred) {
        targetInstance.public_url = inferred;
        await pool.query(`UPDATE odoo_instances SET public_url = $1 WHERE id = $2`, [inferred, targetInstance.instance_id]);
      }
    }

    const publicBase = portalAuth.toPublicOdooUrl(targetInstance.odoo_url, targetInstance.public_url);
    if (!publicBase) {
      return res.status(503).json({
        error: 'Esta empresa no tiene URL pública SSO configurada. Contacta a RENACE.TECH.',
        code: 'missing_public_url',
      });
    }

    if (customServiceToken) {
      const redirectUrl = `${publicBase.replace(/\/admin\/?$/, '')}/admin?token=${customServiceToken}`;
      return res.json({
        success: true,
        token: customServiceToken,
        redirect_url: redirectUrl,
        client_name: targetInstance.client_name,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
    }

    // Prefer a session created against the PUBLIC host (same path the browser will use)
    let odooSessionId = authResult.sessionId || null;
    try {
      const publicAuth = await odooValidateCredentials(publicBase, targetInstance.odoo_db, odoo_login, password);
      if (publicAuth.valid && publicAuth.sessionId) odooSessionId = publicAuth.sessionId;
    } catch (e) {
      console.warn('[sso generate] public auth warn:', e.message);
    }

    let authSecretEnc = null;
    if (PORTAL_ENCRYPTION_KEY) {
      try { authSecretEnc = portalEncrypt(password); }
      catch (e) { console.warn('[sso generate] auth secret enc warn:', e.message); }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO sso_tokens
        (token, user_id, instance_id, odoo_login, expires_at, ip_address, user_agent, session_id, public_redirect_url, auth_secret_enc)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        token,
        portalUserId,
        targetInstance.instance_id,
        odoo_login,
        expiresAt,
        req.ip,
        req.get('user-agent'),
        odooSessionId,
        publicBase,
        authSecretEnc,
      ]
    );

    // /renace/sso no existe en Odoo (404). Entregar session_id vía portal y abrir /web en la instancia elegida.
    const redirectUrl = buildSsoEnterUrl(req, token);

    res.json({
      success: true,
      token,
      redirect_url: redirectUrl,
      client_name: targetInstance.client_name,
      expires_at: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error('[sso generate]', e.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── SSO: Admin Generate Token (called by Odoo module, authenticated via HMAC) ──
app.post('/api/sso/admin-generate', apiLimiter, async (req, res) => {
  const { odoo_login, odoo_db, odoo_url, instance_name, timestamp, signature } = req.body || {};

  if (!odoo_login || !odoo_db || !odoo_url || !timestamp || !signature) {
    return res.status(400).json({ error: 'Parámetros incompletos' });
  }

  // ── Verify timestamp (prevent replay attacks: ±5 minutes) ──
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return res.status(401).json({ error: 'Timestamp inválido o expirado' });
  }

  // ── Verify HMAC signature ──
  const portalKey = PORTAL_ENCRYPTION_KEY;
  if (!portalKey) {
    return res.status(500).json({ error: 'PORTAL_ENCRYPTION_KEY no configurada en el servidor' });
  }

  const { createHmac } = require('crypto');
  const expectedSig = createHmac('sha256', portalKey)
    .update(`${odoo_login}:${odoo_db}:${timestamp}`)
    .digest('hex');

  if (!require('crypto').timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSig, 'hex')
  )) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  try {
    // Find or create the portal user linked to this Odoo instance
    let userResult = await pool.query(
      `SELECT cpu.id, cpu.odoo_login, oi.id AS instance_id, oi.odoo_url, oi.odoo_db, oi.client_name
       FROM client_portal_users cpu
       JOIN odoo_instances oi ON oi.id = cpu.instance_id
       WHERE cpu.odoo_login = $1 AND oi.odoo_db = $2 AND cpu.active = TRUE AND oi.active = TRUE
       LIMIT 1`,
      [odoo_login, odoo_db]
    );

    // If user doesn't exist, auto-create the instance + user
    if (!userResult.rows.length) {
      // Upsert the Odoo instance
      const instanceResult = await pool.query(
        `INSERT INTO odoo_instances (odoo_url, odoo_db, client_name, active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (odoo_db) DO UPDATE SET odoo_url = EXCLUDED.odoo_url, client_name = EXCLUDED.client_name, active = TRUE
         RETURNING id`,
        [odoo_url, odoo_db, instance_name || odoo_url]
      );
      const instanceId = instanceResult.rows[0].id;

      // Create the portal user
      const newUser = await pool.query(
        `INSERT INTO client_portal_users (odoo_login, instance_id, active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (odoo_login, instance_id) DO UPDATE SET active = TRUE
         RETURNING id`,
        [odoo_login, instanceId]
      );

      // Re-fetch full user row
      userResult = await pool.query(
        `SELECT cpu.id, cpu.odoo_login, oi.id AS instance_id, oi.odoo_url, oi.odoo_db, oi.client_name
         FROM client_portal_users cpu
         JOIN odoo_instances oi ON oi.id = cpu.instance_id
         WHERE cpu.id = $1`,
        [newUser.rows[0].id]
      );
    }

    const user = userResult.rows[0];

    // Registro garantizado en el portal. No generamos token de 5 minutos según solicitud.
    const redirectUrl = `https://renace.tech/portal`;

    console.log(`[sso admin-generate] Usuario registrado exitosamente desde Odoo: ${odoo_login}@${odoo_db}`);

    res.json({
      success: true,
      redirect_url: redirectUrl,
      client_name: user.client_name
    });

  } catch (e) {
    console.error('[sso admin-generate]', e.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── SSO: Enter — auto-login on the chosen public Odoo host ──
app.get('/api/sso/enter', portalLimiter, async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token || token.length < 32) {
    return res.status(400).type('html').send('<h1>Token inválido</h1><p><a href="/portal">Volver al portal</a></p>');
  }

  try {
    const result = await pool.query(
      `SELECT st.id, st.odoo_login, st.used, st.expires_at, st.session_id, st.public_redirect_url, st.auth_secret_enc,
              oi.odoo_url, oi.public_url, oi.odoo_db, oi.client_name,
              cpu.odoo_password_enc
       FROM sso_tokens st
       JOIN client_portal_users cpu ON cpu.id = st.user_id
       JOIN odoo_instances oi ON oi.id = st.instance_id
       WHERE st.token = $1
       LIMIT 1`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(404).type('html').send('<h1>Token inválido</h1><p><a href="/portal">Volver al portal</a></p>');
    }

    const row = result.rows[0];
    if (row.used) {
      return res.status(403).type('html').send('<h1>Este enlace ya fue usado</h1><p><a href="/portal">Volver al portal</a></p>');
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(403).type('html').send('<h1>Enlace expirado</h1><p><a href="/portal">Volver al portal</a></p>');
    }

    const publicBase = portalAuth.toPublicOdooUrl(row.odoo_url, row.public_redirect_url || row.public_url);
    if (!publicBase) {
      return res.status(503).type('html').send('<h1>Instancia sin URL pública</h1><p><a href="/portal">Volver al portal</a></p>');
    }

    let password = null;
    if (PORTAL_ENCRYPTION_KEY) {
      const enc = row.auth_secret_enc || row.odoo_password_enc;
      if (enc) {
        try { password = portalDecrypt(enc); }
        catch (e) { console.warn('[sso enter] decrypt warn:', e.message); }
      }
    }

    // Preferred: login server-side on the PUBLIC host, then hand cookie to browser (GET /web).
    // Browser auto-POST was causing Odoo "Session expired (invalid CSRF token)" in Electron/desktop.
    if (password) {
      try {
        const sessionId = await odooWebLoginSession(
          publicBase,
          row.odoo_login,
          password,
          row.odoo_db || null
        );
        await pool.query(
          `UPDATE sso_tokens SET used = TRUE, used_at = NOW(), auth_secret_enc = NULL WHERE id = $1`,
          [row.id]
        );

        const wantsJson = String(req.query.format || '').toLowerCase() === 'json'
          || String(req.headers.accept || '').includes('application/json');
        if (wantsJson) {
          res.setHeader('Cache-Control', 'no-store');
          return res.json({
            ok: true,
            sessionId,
            publicUrl: publicBase,
            redirectUrl: `${publicBase.replace(/\/$/, '')}/web`,
            clientName: row.client_name,
            login: row.odoo_login,
          });
        }

        setOdooSessionCookie(res, sessionId, publicBase);
        res.setHeader('Cache-Control', 'no-store');
        return res.type('html').send(buildRedirectPage(escAttr(row.client_name || 'Odoo'), publicBase));
      } catch (e) {
        console.warn('[sso enter] server web-login warn:', e.message);
      }
    }

    // Fallback: session cookie handoff (may fail across reverse proxies)
    let sessionId = row.session_id || null;
    if (!sessionId && password) {
      try {
        const auth = await odooValidateCredentials(publicBase, row.odoo_db, row.odoo_login, password);
        if (auth.valid && auth.sessionId) sessionId = auth.sessionId;
      } catch (e) {
        console.warn('[sso enter] public re-auth warn:', e.message);
      }
    }
    if (!sessionId && password) {
      try {
        const auth = await odooValidateCredentials(row.odoo_url, row.odoo_db, row.odoo_login, password);
        if (auth.valid && auth.sessionId) sessionId = auth.sessionId;
      } catch (e) {
        console.warn('[sso enter] internal re-auth warn:', e.message);
      }
    }

    if (!sessionId) {
      const wantsJson = String(req.query.format || '').toLowerCase() === 'json'
        || String(req.headers.accept || '').includes('application/json');
      if (wantsJson) {
        return res.status(503).json({ ok: false, error: 'No se pudo abrir la sesión de Odoo', publicUrl: publicBase });
      }
      return res.status(503).type('html').send('<h1>No se pudo abrir la sesión de Odoo</h1><p><a href="/portal">Volver al portal</a></p>');
    }

    await pool.query(
      `UPDATE sso_tokens SET used = TRUE, used_at = NOW(), auth_secret_enc = NULL WHERE id = $1`,
      [row.id]
    );

    const wantsJson = String(req.query.format || '').toLowerCase() === 'json'
      || String(req.headers.accept || '').includes('application/json');
    if (wantsJson) {
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        sessionId,
        publicUrl: publicBase,
        redirectUrl: `${publicBase.replace(/\/$/, '')}/web`,
        clientName: row.client_name,
        login: row.odoo_login,
      });
    }

    setOdooSessionCookie(res, sessionId, publicBase);
    res.setHeader('Cache-Control', 'no-store');
    return res.type('html').send(buildRedirectPage(escAttr(row.client_name || 'Odoo'), publicBase));
  } catch (e) {
    console.error('[sso enter]', e.message);
    res.status(500).type('html').send('<h1>Error interno</h1><p><a href="/portal">Volver al portal</a></p>');
  }
});

// ── SSO: Verify Token (called by Odoo module) ──
app.get('/api/sso/verify', apiLimiter, async (req, res) => {
  const token = String(req.query.token || '').trim();
  
  if (!token) {
    return res.status(400).json({ error: 'Token requerido' });
  }

  try {
    const result = await pool.query(
      `SELECT st.id, st.user_id, st.odoo_login, st.used, st.expires_at,
              oi.odoo_url, oi.odoo_db, oi.client_name,
              cpu.odoo_password_enc
       FROM sso_tokens st
       JOIN client_portal_users cpu ON cpu.id = st.user_id
       JOIN odoo_instances oi ON oi.id = st.instance_id
       WHERE st.token = $1
       LIMIT 1`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Token inválido' });
    }

    const tokenData = result.rows[0];

    // Check if already used
    if (tokenData.used) {
      return res.status(403).json({ error: 'Token ya utilizado' });
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Token expirado' });
    }

    // Mark token as used
    await pool.query(
      `UPDATE sso_tokens SET used = TRUE, used_at = NOW() WHERE id = $1`,
      [tokenData.id]
    );

    // Return user data for Odoo to create session
    res.json({
      valid: true,
      odoo_login: tokenData.odoo_login,
      odoo_db: tokenData.odoo_db,
      client_name: tokenData.client_name
    });

  } catch (e) {
    console.error('[sso verify]', e.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Admin: Link User Without Password ──
app.post('/api/admin/portal-users/link', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  
  const odoo_login = String(req.body?.odoo_login || '').trim().slice(0, 254);
  const instance_id = parseInt(req.body?.instance_id);
  const google_email = String(req.body?.google_email || '').trim().slice(0, 254) || null;
  
  if (!odoo_login || !instance_id) {
    return res.status(400).json({ error: 'Login de Odoo e ID de instancia son requeridos' });
  }

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM client_portal_users WHERE odoo_login = $1 AND instance_id = $2',
      [odoo_login, instance_id]
    );

    if (existing.rows.length) {
      return res.status(409).json({ error: 'Usuario ya existe para esta instancia' });
    }

    // Create user without password
    const result = await pool.query(
      `INSERT INTO client_portal_users (odoo_login, instance_id, google_email, active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, odoo_login, google_email, active, created_at`,
      [odoo_login, instance_id, google_email]
    );

    res.json(result.rows[0]);
  } catch (e) {
    console.error('[link user]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// HTML routes
app.get('/admin-dashboard.html', (req, res) => {
  res.type('html');
  res.sendFile('admin-dashboard.html', { root: __dirname });
});

app.get('/cotizacion.html', (req, res) => {
  res.type('html');
  res.sendFile('cotizacion.html', { root: __dirname });
});

// Quote endpoints
app.post('/api/admin/quote-tokens', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const label = sanitizeText(req.body?.label || 'Solicitud');
  try {
    const { token, exp } = await createQuoteToken(label);
    res.json({ token, exp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/quotes', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const data = await loadQuoteData();
    res.json({ tokens: data.tokens, submissions: data.submissions.slice(-100).reverse() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/quote/validate', apiLimiter, async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Falta token' });
  const valid = await validateQuoteToken(token);
  if (!valid) return res.status(401).json({ error: 'Token inválido o expirado' });
  res.json({ ok: true });
});

app.post('/api/quote/submit', apiLimiter, async (req, res) => {
  const payload = req.body || {};
  const token = String(payload.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Falta token' });
  const valid = await validateQuoteToken(token);
  if (!valid) return res.status(401).json({ error: 'Token inválido o expirado' });

  const name = sanitizeText(payload.name || '');
  const email = sanitizeText(payload.email || '');
  const phone = sanitizeText(payload.phone || '');
  const business = sanitizeText(payload.business || '');
  const cashiers = sanitizeText(payload.cashiers || '');
  const employees = sanitizeText(payload.employees || '');
  const revenue = sanitizeText(payload.revenue || '');
  const message = sanitizeText(payload.message || '');
  const sector = sanitizeText(payload.sector || '');
  const objective = sanitizeText(payload.objective || '');
  const timeline = sanitizeText(payload.timeline || '');
  const callDate = sanitizeText(payload.callDate || '');
  const callSlot = sanitizeText(payload.callSlot || '');
  const callTimezone = sanitizeText(payload.callTimezone || '');
  const architecture = sanitizeText(payload.architecture || '');
  const modules = Array.isArray(payload.modules) ? payload.modules.map(m => sanitizeText(m)) : [];

  if (!name || !email || !business || !callDate || !callSlot) {
    return res.status(400).json({ error: 'Nombre, email, modelo de negocio, fecha y horario de llamada son obligatorios' });
  }

  try {
    const data = await loadQuoteData();
    const submission = {
      id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      token,
      name,
      email,
      phone,
      business,
      sector,
      objective,
      timeline,
      callDate,
      callSlot,
      callTimezone,
      architecture,
      modules,
      cashiers,
      employees,
      revenue,
      message,
      ip: getRequestClientIp(req),
      userAgent: sanitizeText(req.headers['user-agent'] || 'Unknown'),
      createdAt: new Date().toISOString(),
    };
    data.submissions.push(submission);
    await saveQuoteData(data);
    
    // Notify Admin (Fire and forget to not block the user response)
    sendAdminNotification(submission, req).catch(err => console.error('[Error in admin notification]:', err.message));

    res.json({ status: 'ok', id: submission.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/quote/assistant', apiLimiter, async (req, res) => {
  const payload = req.body || {};
  const token = String(payload.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Falta token' });
  const valid = await validateQuoteToken(token);
  if (!valid) return res.status(401).json({ error: 'Token inválido o expirado' });
  if (!CHAT_WEBHOOK) return res.status(500).json({ error: 'Asistente no configurado' });

  const context = {
    name: sanitizeText(payload.name || ''),
    sector: sanitizeText(payload.sector || ''),
    business: sanitizeText(payload.business || ''),
    objective: sanitizeText(payload.objective || ''),
    timeline: sanitizeText(payload.timeline || ''),
    currentSystem: sanitizeText(payload.currentSystem || ''),
    locations: sanitizeText(payload.locations || ''),
    modules: Array.isArray(payload.modules) ? payload.modules.map(v => sanitizeText(v)).filter(Boolean).slice(0, 20) : [],
  };

  const guidance = [
    'Eres un arquitecto senior de soluciones empresariales para RENACE.',
    'Debes responder en español con tono empresarial y accionable.',
    'Incluye enfoque de ERP, automatizaciones, integraciones, agentes IA y software a medida cuando aplique.',
    'IMPORTANTE: Siempre pregunta si la empresa ya emite comprobantes fiscales electrónicos (e-CF) según la DGII. Recomienda incluir facturación electrónica si aún no la tienen.',
    'Devuelve SIEMPRE JSON válido con esta forma exacta:',
    '{"message":"texto corto","recommendations":["r1","r2","r3"],"options":[{"label":"texto","sector":"...","objective":"...","timeline":"...","modules":["..."]}]}',
    'options debe incluir entre 2 y 4 opciones concretas adaptadas al contexto.',
    'No incluyas markdown ni texto fuera del JSON.'
  ].join('\n');

  const upstreamPayload = {
    message: `${guidance}\n\nContexto:\n${JSON.stringify(context)}`,
    sessionId: `quote-${token.slice(0, 12)}`,
    source: 'renace-quote-form',
    mode: 'quote_assistant',
    context,
  };

  try {
    const upstream = await requestChatWebhook(upstreamPayload, req);
    if (upstream.statusCode >= 400) {
      return res.status(upstream.statusCode).json({ error: 'Asistente no disponible' });
    }
    let parsed = null;
    try {
      parsed = upstream.bodyText ? JSON.parse(upstream.bodyText) : null;
    } catch {
      parsed = null;
    }
    const rawReply = typeof parsed?.reply === 'string'
      ? parsed.reply
      : typeof parsed?.text === 'string'
        ? parsed.text
        : typeof parsed?.output === 'string'
          ? parsed.output
          : typeof parsed?.message === 'string'
            ? parsed.message
            : upstream.bodyText;

    let responseJson = null;
    if (parsed && typeof parsed === 'object' && parsed.message && Array.isArray(parsed.options)) {
      responseJson = parsed;
    } else if (typeof rawReply === 'string') {
      try {
        responseJson = JSON.parse(rawReply);
      } catch {
        responseJson = null;
      }
    }

    const fallback = buildQuoteAssistantFallback(context);
    const normalized = {
      message: sanitizeText(responseJson?.message || fallback.message),
      recommendations: Array.isArray(responseJson?.recommendations)
        ? responseJson.recommendations.map(v => sanitizeText(v)).filter(Boolean).slice(0, 5)
        : fallback.recommendations,
      options: Array.isArray(responseJson?.options)
        ? responseJson.options
          .map(opt => ({
            label: sanitizeText(opt?.label || ''),
            sector: sanitizeText(opt?.sector || context.sector),
            objective: sanitizeText(opt?.objective || ''),
            timeline: sanitizeText(opt?.timeline || ''),
            modules: Array.isArray(opt?.modules) ? opt.modules.map(v => sanitizeText(v)).filter(Boolean).slice(0, 10) : [],
          }))
          .filter(opt => opt.label)
          .slice(0, 4)
        : fallback.options,
    };

    if (!normalized.recommendations.length) normalized.recommendations = fallback.recommendations;
    if (!normalized.options.length) normalized.options = fallback.options;
    res.json(normalized);
  } catch (e) {
    res.status(502).json(buildQuoteAssistantFallback(context));
  }
});

// ── Paths ──
const ACCESS_LOG_PATH = process.env.TRAEFIK_ACCESS_LOG || process.env.NGINX_ACCESS_LOG || '/var/log/traefik/access.log';
const ADMIN_ANALYTICS_LIMIT = 1000; // líneas máximas a procesar del log

// ── Database ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool security
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS odoo_instances (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        odoo_url VARCHAR(500) NOT NULL,
        odoo_db VARCHAR(255) NOT NULL,
        service_code VARCHAR(32) UNIQUE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='odoo_instances' AND column_name='service_code') THEN
          ALTER TABLE odoo_instances ADD COLUMN service_code VARCHAR(32) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='odoo_instances' AND column_name='public_url') THEN
          ALTER TABLE odoo_instances ADD COLUMN public_url VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='odoo_instances' AND column_name='logo_url') THEN
          ALTER TABLE odoo_instances ADD COLUMN logo_url VARCHAR(500);
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS client_portal_users (
        id SERIAL PRIMARY KEY,
        odoo_login VARCHAR(255) NOT NULL,
        instance_id INTEGER REFERENCES odoo_instances(id) ON DELETE CASCADE,
        google_email VARCHAR(255),
        odoo_password_enc TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(odoo_login, instance_id)
      );
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_portal_users' AND column_name='google_email') THEN
          ALTER TABLE client_portal_users ADD COLUMN google_email VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_portal_users' AND column_name='odoo_password_enc') THEN
          ALTER TABLE client_portal_users ADD COLUMN odoo_password_enc TEXT;
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        size VARCHAR(50),
        mime_type VARCHAR(100),
        data BYTEA,
        category VARCHAR(50) DEFAULT 'other',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        message TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sso_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        user_id INTEGER REFERENCES client_portal_users(id) ON DELETE CASCADE,
        instance_id INTEGER REFERENCES odoo_instances(id) ON DELETE CASCADE,
        odoo_login VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(255),
        public_redirect_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sso_tokens' AND column_name='session_id') THEN
          ALTER TABLE sso_tokens ADD COLUMN session_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sso_tokens' AND column_name='public_redirect_url') THEN
          ALTER TABLE sso_tokens ADD COLUMN public_redirect_url VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sso_tokens' AND column_name='auth_secret_enc') THEN
          ALTER TABLE sso_tokens ADD COLUMN auth_secret_enc TEXT;
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS portal_requests (
        id SERIAL PRIMARY KEY,
        service_code VARCHAR(32),
        client_name VARCHAR(255),
        contact_email VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        category VARCHAR(80),
        priority VARCHAR(40),
        description TEXT NOT NULL,
        has_attachment BOOLEAN DEFAULT FALSE,
        status VARCHAR(40) DEFAULT 'open',
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await portalAuth.ensureSchema(pool);
    await portalAuth.purgeExpired(pool);
    console.log('✓ Database tables ready');
  } catch (err) {
    console.warn('⚠ Database not available, running in static mode');
  }
}

// ── SMTP (Hostinger) ──
// Docs: smtp.hostinger.com · auth = full mailbox address · password = mailbox password
// Prefer 465+SSL; fallback 587+STARTTLS. From MUST equal SMTP_USER for Hostinger.
let transporter = null;
function buildSmtpTransport(opts) {
  const host = opts.host || 'smtp.hostinger.com';
  const port = parseInt(opts.port || '465', 10);
  const user = String(opts.user || '').trim();
  const pass = String(opts.pass || '');
  const secure = opts.secure != null
    ? Boolean(opts.secure)
    : (port === 465);
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    requireTLS: !secure && port === 587,
    tls: { minVersion: 'TLSv1.2', servername: host },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
  });
}

if (process.env.SMTP_HOST || process.env.SMTP_USER) {
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === '1'
    || process.env.SMTP_SECURE === 'true'
    || smtpPort === 465;
  transporter = buildSmtpTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: smtpPort,
    secure: smtpSecure,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  });
  transporter.verify()
    .then(() => {
      console.log(`[SMTP] OK ${process.env.SMTP_HOST || 'smtp.hostinger.com'}:${smtpPort} as ${process.env.SMTP_USER || '(no user)'}`);
    })
    .catch(async (err) => {
      console.warn(`[SMTP] verify failed on :${smtpPort}:`, err.message);
      // Auto-fallback Hostinger STARTTLS 587 if 465 auth/connect fails
      if (smtpPort === 465) {
        try {
          const alt = buildSmtpTransport({
            host: process.env.SMTP_HOST || 'smtp.hostinger.com',
            port: 587,
            secure: false,
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          });
          await alt.verify();
          transporter = alt;
          console.log(`[SMTP] OK fallback smtp.hostinger.com:587 STARTTLS as ${process.env.SMTP_USER}`);
        } catch (e2) {
          console.warn('[SMTP] fallback 587 also failed:', e2.message);
        }
      }
    });
}

// ── Middleware ──
const upload = multer({
  storage: multer.memoryStorage(),
  // Allow files up to 400MB
  limits: { fileSize: 400 * 1024 * 1024, files: 10 },
  fileFilter: (_req, _file, cb) => cb(null, true),
});
const documentUpload = upload.fields([
  { name: 'files', maxCount: 10 },
  { name: 'files[]', maxCount: 10 },
]);

function getUploadedFiles(req) {
  if (!req.files || typeof req.files !== 'object') return [];
  const directFiles = Array.isArray(req.files.files) ? req.files.files : [];
  const bracketFiles = Array.isArray(req.files['files[]']) ? req.files['files[]'] : [];
  return [...directFiles, ...bracketFiles];
}

function getAdminCredential(req) {
  const headerValue = typeof req.headers['x-admin-pin'] === 'string' ? req.headers['x-admin-pin'] : '';
  const bodyValue = typeof req.body?.pin === 'string' ? req.body.pin : '';
  return (headerValue || bodyValue).trim();
}

function getRequestClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

function requireBasicAuth(req, res) {
  const user = process.env.RENACE_BASIC_USER;
  const pass = process.env.RENACE_BASIC_PASS;
  if (!user || !pass) {
    res.status(500).json({ error: 'Auth no configurada' });
    return false;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Basic ') ? header.slice(6) : '';
  const decoded = Buffer.from(token, 'base64').toString('utf8');
  const [u = '', p = ''] = decoded.split(':');
  const userBuf = Buffer.from(user);
  const passBuf = Buffer.from(pass);
  const uBuf = Buffer.from(u);
  const pBuf = Buffer.from(p);
  const valid = uBuf.length === userBuf.length && pBuf.length === passBuf.length
    && crypto.timingSafeEqual(uBuf, userBuf) && crypto.timingSafeEqual(pBuf, passBuf);
  if (!valid) {
    res.set('WWW-Authenticate', 'Basic realm="Renace"');
    res.status(401).json({ error: 'No autorizado' });
    return false;
  }
  return true;
}

function getStaticBundledDocs() {
  const docs = [];
  for (const bundle of BUNDLED_DOWNLOADS) {
    const filePath = path.join(DOWNLOADS_DIR, bundle.filename);
    if (!fs.existsSync(filePath)) continue;
    const stat = fs.statSync(filePath);
    const ext = path.extname(bundle.filename).replace('.', '').toUpperCase();
    const sizeLabel = stat.size > 1024 * 1024
      ? `${(stat.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(stat.size / 1024).toFixed(1)} KB`;
    docs.push({
      name: bundle.displayName,
      type: ext,
      size: sizeLabel,
      file: `/downloads/${bundle.filename}`,
      category: bundle.category || 'other',
      available: true,
    });
  }
  return docs;
}

/** Resolve a documents.json file path to an existing on-disk file. */
function resolvePublicDownload(fileRef) {
  if (!fileRef || typeof fileRef !== 'string') return null;
  const raw = fileRef.trim().replace(/^\/+/, '');
  if (!raw || raw.includes('..')) return null;

  const basename = path.basename(raw);
  // Prefer volumen persistente /app/data/docs (Swarm). /app/downloads es capa del
  // contenedor y a menudo falla al servir .exe tras docker cp.
  const candidates = [
    path.join(DATA_DIR, 'docs', basename),
    path.join(DATA_DIR, 'downloads', basename),
    path.join(DATA_DIR, basename),
    path.join(DOCS_DIR, basename),
    path.join(DOWNLOADS_DIR, basename),
  ];
  if (raw.startsWith('docs/') || raw.startsWith('downloads/')) {
    candidates.unshift(path.join(__dirname, raw));
  }

  for (const abs of candidates) {
    try {
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        fs.accessSync(abs, fs.constants.R_OK);
        const filename = path.basename(abs);
        // Documentos del sitio: siempre /docs/ (no hay página "downloads")
        const url = filename === 'EnviosRH.apk' && abs.startsWith(DOWNLOADS_DIR + path.sep)
          ? `/downloads/${filename}`
          : `/docs/${filename}`;
        return { abs, url, filename };
      }
    } catch { /* skip unreadable */ }
  }
  return null;
}

function formatSizeLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'N/A';
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function loadLegacyDocumentsJson() {
  const jsonPath = path.join(DATA_DIR, 'documents.json');
  if (!fs.existsSync(jsonPath)) return [];
  try {
    const legacy = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return Array.isArray(legacy) ? legacy : [];
  } catch {
    return [];
  }
}

/** Keep only legacy entries whose files exist; rewrite URLs to absolute public paths. */
function getAvailableLegacyDocs() {
  const out = [];
  for (const item of loadLegacyDocumentsJson()) {
    const resolved = resolvePublicDownload(item.file);
    if (!resolved) continue;
    const stat = fs.statSync(resolved.abs);
    const ext = path.extname(resolved.filename).replace('.', '').toUpperCase();
    out.push({
      name: item.name || resolved.filename,
      type: item.type || ext,
      size: item.size && item.size !== 'N/A' ? item.size : formatSizeLabel(stat.size),
      file: resolved.url,
      category: item.category || getCategory(ext),
      available: true,
    });
  }
  return out;
}

async function sendDocumentsList(res) {
  try {
    const result = await pool.query(
      'SELECT id, name, type, size, mime_type, category, created_at FROM documents ORDER BY created_at DESC'
    );
    const docs = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      size: row.size,
      file: `/api/documents/${row.id}/download`,
      category: row.category,
      available: true,
    }));
    const names = new Set(docs.map(d => d.name));
    for (const item of [...getStaticBundledDocs(), ...getAvailableLegacyDocs()]) {
      if (!names.has(item.name)) {
        docs.push(item);
        names.add(item.name);
      }
    }
    return res.json(docs);
  } catch {
    const merged = [];
    const names = new Set();
    for (const item of [...getAvailableLegacyDocs(), ...getStaticBundledDocs()]) {
      if (names.has(item.name)) continue;
      merged.push(item);
      names.add(item.name);
    }
    return res.json(merged);
  }
}

function sendAttachmentFile(res, absPath, fallbackName) {
  const filename = sanitizeFilename(fallbackName || path.basename(absPath));
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.apk': 'application/vnd.android.package-archive',
    '.exe': 'application/octet-stream',
    '.msi': 'application/octet-stream',
    '.dmg': 'application/octet-stream',
    '.ipa': 'application/octet-stream',
    '.zip': 'application/zip',
    '.pdf': 'application/pdf',
  };
  try {
    fs.accessSync(absPath, fs.constants.R_OK);
  } catch (err) {
    console.error(`[downloads] no readable: ${absPath} (${err.code || err.message})`);
    return res.status(404).json({ error: 'Archivo no disponible' });
  }
  res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.sendFile(absPath, (err) => {
    if (!err) return;
    if (res.headersSent) return;
    console.error(`[downloads] sendFile failed: ${absPath}`, err.message);
    res.status(500).json({ error: 'No se pudo descargar el archivo' });
  });
}

async function handleDocumentUpload(req, res) {
  const adminPin = getAdminCredential(req);
  if (!process.env.ADMIN_ACCESS_PASSWORD || adminPin !== process.env.ADMIN_ACCESS_PASSWORD) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const files = getUploadedFiles(req);
  if (files.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron archivos' });
  }

  try {
    const inserted = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).replace('.', '').toUpperCase();
      const sizeLabel = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      const result = await pool.query(
        'INSERT INTO documents (name, type, size, mime_type, data, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name',
        [sanitizeFilename(file.originalname), ext, sizeLabel, file.mimetype, file.buffer, getCategory(ext)]
      );
      inserted.push(result.rows[0]);
    }

    return res.json({
      message: `${inserted.length} archivo(s) subidos correctamente`,
      files: inserted,
      subidos: inserted.map(file => file.name),
      errores: [],
    });
  } catch {
    return res.status(500).json({ error: 'Error al subir archivos' });
  }
}

async function handleContactSubmission(req, res) {
  const { name, email, message, website } = req.body || {};

  if (website) {
    return res.json({ status: 'success', message: '¡Mensaje recibido!' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const safeName = sanitizeText(name).slice(0, 100);
  const safeEmail = sanitizeText(email).slice(0, 254);
  const safeMessage = sanitizeText(message).slice(0, 5000);

  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, message, ip_address) VALUES ($1, $2, $3, $4)',
      [safeName, safeEmail, safeMessage, getRequestClientIp(req)]
    );
  } catch {}

  if (transporter) {
    try {
      await transporter.sendMail(getMailOptions({
        to: ADMIN_EMAILS.join(', '),
        subject: `🎯 Nuevo Lead/Contacto: ${safeName} — renace.tech`,
        text: `Nombre: ${safeName}\nEmail: ${safeEmail}\n\n${safeMessage}`,
        html: `<h3>Nuevo lead desde renace.tech (Formulario de Contacto)</h3>
          <p><strong>Nombre:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p>${safeMessage.replace(/\n/g, '<br>')}</p>`,
      }));
    } catch (err) {
      console.warn('Email send failed:', err.message);
    }
  }

  if (waNotify.isConfigured()) {
    const waText = `📩 *Nuevo contacto web*\n\n*Nombre:* ${safeName}\n*Email:* ${safeEmail}\n\n${safeMessage}`;
    waNotify.notifyAdmins(waText, { app: 'renace.tech', event: 'contacto' })
      .catch((e) => console.warn('[Contact WhatsApp]', e.message));
  }

  return res.json({ status: 'success', message: '¡Mensaje recibido! Te contactaremos pronto.' });
}

async function readFormEntries() {
  try {
    const raw = await fs.promises.readFile(FORM_DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.promises.writeFile(FORM_DATA_PATH, '[]\n', 'utf8');
      return [];
    }
    throw err;
  }
}

async function writeFormEntries(entries) {
  await fs.promises.writeFile(FORM_DATA_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function buildQuoteAssistantFallback(context) {
  const sector = context.sector || 'general';
  const bySector = {
    retail: {
      message: 'Para retail conviene arrancar con ventas, inventario y POS conectados a automatizaciones comerciales.',
      recommendations: [
        'Inicia con datos maestros de productos y precios.',
        'Asegura stock en tiempo real por sucursal y canal.',
        'Conecta facturación y cierres con tableros ejecutivos.',
      ],
      options: [
        { label: 'Retail omnicanal rápido', sector: 'retail', objective: 'automatizar_ventas', timeline: 'urgente_30', modules: ['ventas', 'inventario', 'punto_de_venta', 'facturacion', 'automatizaciones'] },
        { label: 'Retail con control total', sector: 'retail', objective: 'control_inventario', timeline: 'plan_60_90', modules: ['inventario', 'compras', 'contabilidad', 'bi_analytics'] },
      ],
    },
    distribucion: {
      message: 'En distribución, la prioridad es alinear demanda, inventario y reposición con reglas automáticas.',
      recommendations: [
        'Define reglas de reabastecimiento automáticas.',
        'Implementa trazabilidad por lote cuando aplique.',
        'Unifica ventas, compras y almacén con integraciones API.',
      ],
      options: [
        { label: 'Distribución inteligente', sector: 'distribucion', objective: 'control_inventario', timeline: 'plan_60_90', modules: ['inventario', 'compras', 'ventas', 'contabilidad', 'integraciones_api'] },
        { label: 'Escala logística por fases', sector: 'distribucion', objective: 'escalar_sucursales', timeline: 'q_siguiente', modules: ['inventario', 'compras', 'facturacion', 'bi_analytics'] },
      ],
    },
    servicios: {
      message: 'Para servicios funciona mejor una ruta con CRM, proyectos, agentes IA y componentes de software a medida.',
      recommendations: [
        'Estandariza el embudo comercial por etapas.',
        'Alinea proyectos con tiempos y responsables.',
        'Conecta avance operativo con facturación, automatizaciones y agentes IA.',
      ],
      options: [
        { label: 'Servicios comerciales', sector: 'servicios', objective: 'automatizar_ventas', timeline: 'plan_60_90', modules: ['crm', 'ventas', 'proyectos', 'facturacion', 'automatizaciones'] },
        { label: 'Servicios con agentes IA', sector: 'servicios', objective: 'agentes_ia', timeline: 'plan_60_90', modules: ['crm', 'helpdesk', 'integraciones_api', 'agentes_ia'] },
        { label: 'Servicios con software a medida', sector: 'servicios', objective: 'software_medida', timeline: 'q_siguiente', modules: ['crm', 'proyectos', 'helpdesk', 'software_medida'] },
      ],
    },
    manufactura: {
      message: 'En manufactura recomendamos una implementación por capas con foco en trazabilidad y métricas.',
      recommendations: [
        'Primero consolida inventario y compras.',
        'Luego estructura productos, variantes y listas técnicas.',
        'Activa manufactura cuando la base esté estable y medible.',
      ],
      options: [
        { label: 'Base operativa manufactura', sector: 'manufactura', objective: 'control_inventario', timeline: 'plan_60_90', modules: ['inventario', 'compras', 'contabilidad', 'bi_analytics'] },
        { label: 'Escalamiento manufactura', sector: 'manufactura', objective: 'escalar_sucursales', timeline: 'q_siguiente', modules: ['manufactura', 'inventario', 'compras', 'rrhh', 'integraciones_api'] },
      ],
    },
    tecnologia: {
      message: 'Para negocios de tecnología, electrodomésticos y reparación, recomendamos inventario por número de serie, helpdesk para órdenes de servicio y POS integrado.',
      recommendations: [
        'Controla equipos por número de serie y estado de reparación.',
        'Usa helpdesk para gestionar órdenes de servicio y garantías.',
        'Conecta POS con inventario para venta de equipos y accesorios.',
      ],
      options: [
        { label: 'Tienda tech con POS', sector: 'tecnologia', objective: 'automatizar_ventas', timeline: 'plan_60_90', modules: ['ventas', 'inventario', 'punto_de_venta', 'facturacion', 'contabilidad'] },
        { label: 'Taller de reparación digital', sector: 'tecnologia', objective: 'orden_operativa', timeline: 'plan_60_90', modules: ['helpdesk', 'inventario', 'facturacion', 'automatizaciones'] },
      ],
    },
  };
  const selected = bySector[sector] || {
    message: 'Podemos estructurar tu ruta digital en una primera fase clara, ejecutable y medible.',
    recommendations: [
      'Define el resultado de negocio que quieres acelerar primero.',
      'Selecciona capacidades críticas entre ERP, automatización e integración.',
      'Establece un horizonte realista para una fase inicial efectiva.',
    ],
    options: [
      { label: 'Arranque operativo', sector: context.sector || '', objective: 'orden_operativa', timeline: 'plan_60_90', modules: ['ventas', 'inventario', 'facturacion', 'automatizaciones'] },
      { label: 'Ruta con agentes IA', sector: context.sector || '', objective: 'agentes_ia', timeline: 'plan_60_90', modules: ['crm', 'helpdesk', 'integraciones_api', 'agentes_ia'] },
      { label: 'Ruta de software a medida', sector: context.sector || '', objective: 'software_medida', timeline: 'q_siguiente', modules: ['integraciones_api', 'software_medida', 'bi_analytics'] },
    ],
  };
  return selected;
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

function requestChatWebhook(payload, req) {
  return new Promise((resolve, reject) => {
    const upstream = new URL(CHAT_WEBHOOK);
    const bodyStr = JSON.stringify(payload || {});
    const lib = upstream.protocol === 'https:' ? https : http;
    const preq = lib.request({
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      path: upstream.pathname + upstream.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
        'x-forwarded-host': req.headers['x-forwarded-host'] || req.headers.host,
        'x-forwarded-proto': req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'),
      },
    }, (pres) => {
      let data = '';
      pres.on('data', c => { data += c; });
      pres.on('end', () => {
        resolve({
          statusCode: pres.statusCode || 502,
          bodyText: data,
        });
      });
    });
    preq.on('error', reject);
    preq.setTimeout(60000, () => {
      preq.destroy(new Error('timeout'));
    });
    preq.write(bodyStr);
    preq.end();
  });
}

async function sendAdminNotification(submission, req) {
  const waMessage = `🚨 *Nueva solicitud de cotización*\n\n*Cliente:* ${submission.name}\n*Empresa:* ${submission.business}\n*Sector:* ${submission.sector}\n*WhatsApp:* ${submission.phone}\n*Email:* ${submission.email}\n*Objetivo:* ${submission.objective}\n*Timeline:* ${submission.timeline}\n*Cajas:* ${submission.cashiers} · *Empleados:* ${submission.employees}\n*Ingresos:* ${submission.revenue}\n\n*Mensaje:* ${submission.message || 'Sin mensaje adicional.'}`;

  // 1. WhatsApp vía Evolution API (RENACE.TECH · 809-348-7921)
  if (waNotify.isConfigured()) {
    try {
      const waResult = await waNotify.notifyAdmins(waMessage, {
        app: 'renace.tech',
        event: 'cotización',
      });
      if (!waResult.ok) {
        console.warn('[Admin Notif WhatsApp]', JSON.stringify(waResult));
      }
    } catch (e) {
      console.warn('[Admin Notif WhatsApp failed]:', e.message);
    }
  } else if (CHAT_WEBHOOK) {
    // Fallback legacy (OpenClaw / n8n)
    const chatPayload = {
      message: waMessage,
      sessionId: `admin-notif-${Date.now()}`,
      source: 'renace-server-notif',
      mode: 'admin_notification',
      context: {
        name: submission.name,
        business: submission.business,
        sector: submission.sector,
        revenue: submission.revenue,
      },
    };
    try {
      await requestChatWebhook(chatPayload, req);
    } catch (e) {
      console.warn('[Admin Notif Webhook failed]:', e.message);
    }
  }

  // 2. Email Notification
  if (transporter && ADMIN_EMAILS.length > 0) {
    try {
      const adminList = ADMIN_EMAILS.join(', ');
      await transporter.sendMail(getMailOptions({
        to: adminList,
        subject: `🚨 Nueva Cotización: ${submission.name} — renace.tech`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb;">Nueva solicitud de cotización</h2>
            <p>Se ha recibido una nueva solicitud desde el formulario interactivo.</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><strong>Cliente:</strong> ${submission.name}</p>
            <p><strong>Email:</strong> ${submission.email}</p>
            <p><strong>Teléfono/WA:</strong> ${submission.phone}</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><strong>Negocio:</strong> ${submission.business}</p>
            <p><strong>Sector:</strong> ${submission.sector}</p>
            <p><strong>Facturación:</strong> ${submission.revenue}</p>
            <p><strong>Escala:</strong> ${submission.cashiers} cajas / ${submission.employees} empleados</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><strong>Objetivo:</strong> ${submission.objective}</p>
            <p><strong>Llamada:</strong> ${submission.callDate} a las ${submission.callSlot} (${submission.callTimezone})</p>
            <p><strong>Módulos:</strong> ${submission.modules.join(', ')}</p>
            <p><strong>Mensaje:</strong> ${submission.message || 'N/A'}</p>
            <br>
            <a href="https://renace.tech/admin-dashboard.html" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Abrir Panel de Admin</a>
          </div>
        `
      }));
    } catch (e) {
      console.warn('[Admin Notif Email failed]:', e.message);
    }
  }
}


app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!CHAT_WEBHOOK) return res.status(500).json({ error: 'CHAT_WEBHOOK no configurado' });
  try {
    const upstream = await requestChatWebhook(req.body || {}, req);
    res.status(upstream.statusCode);
    try { res.json(JSON.parse(upstream.bodyText)); }
    catch { res.send(upstream.bodyText); }
  } catch (e) {
    if (String(e.message || '').toLowerCase().includes('timeout')) {
      return res.status(504).json({ error: 'Chat upstream timeout' });
    }
    console.error('[Chat proxy]', e.message);
    res.status(502).json({ error: 'Chat upstream error' });
  }
});

app.get('/api/health/live', (req, res) => {
  res.json({
    status: 'ok',
    mail: {
      configured: Boolean(transporter),
      from: getMailFrom(),
      replyTo: MAIL_REPLY_TO,
    },
    whatsapp: waNotify.getStatus(),
  });
});

app.get('/api/public-config', (req, res) => {
  const wa = waNotify.WHATSAPP_SENDER_NUMBER;
  res.json({
    whatsapp: wa,
    whatsappUrl: `https://wa.me/${wa}`,
    whatsappDisplay: `+${wa.replace(/^1(\d{3})(\d{3})(\d{4})$/, '1 ($1) $2-$3')}`,
    notifyApi: '/api/notify/whatsapp',
  });
});

app.post('/api/notify/whatsapp', apiLimiter, async (req, res) => {
  const expected = process.env.NOTIFY_API_KEY || process.env.ADMIN_ACCESS_PASSWORD || '';
  const key = typeof req.headers['x-notify-key'] === 'string'
    ? req.headers['x-notify-key']
    : (typeof req.body?.key === 'string' ? req.body.key : '');
  if (!expected || !security.timingSafeEqualString(key, expected)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { text, to, app, event } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ ok: false, error: 'text_required' });
  }

  if (to) {
    const result = await waNotify.sendText(to, text);
    return res.status(result.ok ? 200 : 502).json(result);
  }

  const result = await waNotify.notifyAdmins(text, { app, event });
  return res.status(result.ok ? 200 : 502).json(result);
});

app.post('/api/health/wa-test', gateLimiter, async (req, res) => {
  const expected = process.env.ADMIN_ACCESS_PASSWORD;
  if (!expected) return res.status(503).json({ ok: false, error: 'gate_disabled' });
  const pin = getAdminCredential(req);
  if (!securePinMatch(pin, expected)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  if (!waNotify.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'whatsapp_not_configured' });
  }
  const result = await waNotify.notifyAdmins(
    '✅ *RENACE notifier OK*\nPrueba post-despliegue desde Evolution API.\nInstancia RENACE.TECH · 809-348-7921',
    { app: 'renace.tech', event: 'deploy-test' }
  );
  return res.status(result.ok ? 200 : 502).json({ ...result, status: waNotify.getStatus() });
});

app.post('/api/health/mail-test', gateLimiter, async (req, res) => {
  const expected = process.env.ADMIN_ACCESS_PASSWORD;
  if (!expected) return res.status(503).json({ ok: false, error: 'gate_disabled' });
  const pin = getAdminCredential(req);
  if (!securePinMatch(pin, expected)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  if (!transporter) {
    return res.status(503).json({ ok: false, error: 'smtp_not_configured' });
  }
  const target = ADMIN_EMAILS[0];
  try {
    await transporter.sendMail(getMailOptions({
      to: target,
      subject: 'RENACE — verificación de notificaciones',
      text: `Prueba post-despliegue OK.\nRemitente: ${getMailFrom()}\nReply-To: ${MAIL_REPLY_TO}\nHora: ${new Date().toISOString()}`,
      html: `<p>Prueba post-despliegue <strong>OK</strong>.</p>
        <p><strong>Remitente:</strong> ${getMailFrom()}</p>
        <p><strong>Reply-To:</strong> ${MAIL_REPLY_TO}</p>
        <p><strong>Hora:</strong> ${new Date().toISOString()}</p>`,
    }));
    res.json({ ok: true, from: getMailFrom(), replyTo: MAIL_REPLY_TO, to: target });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/documents.php', apiLimiter, async (req, res) => sendDocumentsList(res));
app.post('/upload.php', uploadLimiter, documentUpload, async (req, res) => handleDocumentUpload(req, res));
app.post('/contact.php', contactLimiter, upload.none(), async (req, res) => handleContactSubmission(req, res));
app.get('/form/guardar.php', apiLimiter, async (req, res) => {
  if (!requireBasicAuth(req, res)) return;
  try {
    res.json(await readFormEntries());
  } catch {
    res.status(500).json([]);
  }
});
app.post('/form/guardar.php', apiLimiter, async (req, res) => {
  if (!requireBasicAuth(req, res)) return;
  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ status: 'error', message: 'JSON inválido' });
  }

  try {
    const entries = await readFormEntries();
    const nextEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      evaluator: payload.evaluator ?? { name: 'Anónimo', role: 'Usuario' },
      winner: payload.winner ?? 'N/A',
      comments: payload.comments ?? '',
      scores: payload.scores ?? {},
      ip: getRequestClientIp(req),
      user_agent: req.headers['user-agent'] ?? 'Unknown',
    };
    entries.push(nextEntry);
    await writeFormEntries(entries);
    return res.json({
      status: 'success',
      message: 'Datos guardados correctamente',
      entry_id: nextEntry.id,
    });
  } catch {
    return res.status(500).json({ status: 'error', message: 'No se pudo escribir el archivo' });
  }
});
app.use((req, res, next) => {
  if (blockedStaticPathPattern.test(req.path)) {
    return res.status(404).end();
  }
  return next();
});

// ── Static Files ──
// Explicit download routes (force attachment + verify path)
app.get('/downloads/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  if (!filename || filename.includes('..')) return res.status(400).end();
  const resolved = resolvePublicDownload(`downloads/${filename}`) || resolvePublicDownload(`docs/${filename}`);
  if (!resolved) return res.status(404).end();
  return sendAttachmentFile(res, resolved.abs, filename);
});

app.get('/docs/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  if (!filename || filename.includes('..')) return res.status(400).end();
  const resolved = resolvePublicDownload(`docs/${filename}`) || resolvePublicDownload(`downloads/${filename}`);
  if (!resolved) return res.status(404).end();
  return sendAttachmentFile(res, resolved.abs, filename);
});

app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
  dotfiles: 'deny',          // Block .env, .git, etc.
  setHeaders: (res, filePath) => {
    // Disable caching to prevent clients from getting stuck on old JS/HTML
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Prevent MIME sniffing (belt-and-suspenders with helmet)
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// ── Sanitization ──
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 5000); // Max 5000 chars
}

function sanitizeFilename(name) {
  return String(name || 'file')
    .replace(/[^\w.\-() ]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 200);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// ── API: List Documents ──
app.get('/api/documents', apiLimiter, async (req, res) => {
  return sendDocumentsList(res);
});

// ── API: Download Document ──
app.get('/api/documents/:id/download', apiLimiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

  try {
    const result = await pool.query('SELECT name, mime_type, data FROM documents WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });

    const doc = result.rows[0];
    const safeName = sanitizeFilename(doc.name);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(doc.data);
  } catch {
    res.status(500).json({ error: 'Error al descargar' });
  }
});

// ── API: Upload Document (Admin-only) ──
app.post('/api/documents', uploadLimiter, documentUpload, async (req, res) => handleDocumentUpload(req, res));

// ── API: Delete Document (Admin-only) ──
app.delete('/api/documents/:id', apiLimiter, async (req, res) => {
  const adminPin = getAdminCredential(req);
  if (!process.env.ADMIN_ACCESS_PASSWORD || adminPin !== process.env.ADMIN_ACCESS_PASSWORD) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ── API: Campaigns ──
app.get('/api/admin/campaigns', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(campaignData);
});

app.post('/api/admin/campaigns', apiLimiter, async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const newCampaigns = req.body;
  if (!Array.isArray(newCampaigns)) return res.status(400).json({ error: 'Formato inválido' });
  
  campaignData = newCampaigns.map(c => ({
    id: Number(c.id),
    title: sanitizeText(c.title || ''),
    desc: sanitizeText(c.desc || ''),
    active: !!c.active
  }));

  try {
    await fs.promises.writeFile(CAMPAIGNS_DATA_PATH, JSON.stringify(campaignData, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Contact Form ──
app.post('/api/contact', contactLimiter, async (req, res) => handleContactSubmission(req, res));

// ── Helper ──
function getCategory(ext) {
  const cats = {
    image: ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'SVG', 'WEBP'],
    video: ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM'],
    audio: ['MP3', 'WAV', 'OGG', 'AAC', 'FLAC'],
    archive: ['ZIP', 'RAR', '7Z', 'TAR', 'GZ'],
    document: ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'CSV'],
    app: ['APK', 'IPA', 'AAB', 'EXE', 'MSI', 'DMG'],
  };
  for (const [cat, exts] of Object.entries(cats)) {
    if (exts.includes(ext)) return cat;
  }
  return 'other';
}

async function seedBundledDownloads() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return;
  for (const bundle of BUNDLED_DOWNLOADS) {
    const filePath = path.join(DOWNLOADS_DIR, bundle.filename);
    if (!fs.existsSync(filePath)) continue;
    try {
      const existing = await pool.query(
        'SELECT id FROM documents WHERE name = $1 LIMIT 1',
        [bundle.displayName]
      );
      if (existing.rows.length) continue;

      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(bundle.filename).replace('.', '').toUpperCase();
      const sizeLabel = buffer.length > 1024 * 1024
        ? `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
        : `${(buffer.length / 1024).toFixed(1)} KB`;

      await pool.query(
        'INSERT INTO documents (name, type, size, mime_type, data, category) VALUES ($1,$2,$3,$4,$5,$6)',
        [bundle.displayName, ext, sizeLabel, bundle.mimeType, buffer, getCategory(ext)]
      );
      console.log(`[downloads] Registered: ${bundle.displayName}`);
    } catch (e) {
      console.warn(`[downloads] Could not seed ${bundle.filename}:`, e.message);
    }
  }
}

// ── Odoo Reverse Proxy ──────────────────────────────────────────
// Best practices: proxy_mode=True in odoo.conf (already set),
// strip /odoo prefix, forward real IP/proto headers, rewrite redirects.
const ODOO_URL          = process.env.ODOO_URL          || 'http://85.31.224.232:7015';
const ODOO_LONGPOLL_URL = process.env.ODOO_LONGPOLL_URL || 'http://85.31.224.232:7018';
const CHAT_WEBHOOK      = process.env.CHAT_WEBHOOK      || 'https://ai.renace.tech/webhook/6e33280a-faeb-4394-a34c-142fee0ebfc7';
const DEFAULT_LANG      = process.env.ODOO_LANG         || 'en_US';
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
]);

function buildOdooProxyHeaders(req) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k] = v;
  }
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  headers['x-forwarded-for']   = clientIp;
  headers['x-forwarded-proto'] = 'https';
  headers['x-forwarded-host']  = 'renace.tech';
  headers['x-real-ip']         = clientIp;
  return headers;
}

function rewriteOdooLocation(location) {
  if (!location) return location;
  // Strip internal scheme+host and re-root under /odoo
  return location
    .replace(/^https?:\/\/[^/]+(\/|$)/, (_, slash) => `https://renace.tech/odoo${slash === '/' ? '/' : ''}`)
    .replace(/^\/(?!odoo)/, '/odoo/');
}

function odooProxy(req, res, targetBase, stripPrefix) {
  const target = new URL(targetBase);
  const lib    = target.protocol === 'https:' ? https : http;

  // Strip the matched prefix from the path
  const upstreamPath = req.url.startsWith(stripPrefix)
    ? req.url.slice(stripPrefix.length) || '/'
    : req.url;

  const options = {
    hostname: target.hostname,
    port:     target.port || (target.protocol === 'https:' ? 443 : 80),
    path:     upstreamPath,
    method:   req.method,
    headers:  { ...buildOdooProxyHeaders(req), host: target.host },
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    const outHeaders = {};
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (HOP_BY_HOP.has(k.toLowerCase())) continue;
      outHeaders[k] = k.toLowerCase() === 'location'
        ? rewriteOdooLocation(Array.isArray(v) ? v[0] : v)
        : v;
    }
    // Disable caching for dynamic Odoo content
    outHeaders['cache-control'] = outHeaders['cache-control'] || 'no-store';
    res.writeHead(proxyRes.statusCode, outHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Odoo proxy]', err.message);
    if (!res.headersSent) {
      res.status(502).send(`
        <html><body style="font:1rem monospace;background:#0d1117;color:#e6edf3;padding:2rem">
          <h2>⚡ Odoo no disponible</h2>
          <p>El servicio en ${targetBase} no responde.<br>
          Verifica que Odoo esté activo: <code>sudo systemctl status renace-server</code></p>
        </body></html>`);
    }
  });

  // Stream body (POST/PUT/PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
}

// ── Odoo External API Client ─────────────────────────────────────
// Per docs: https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
//
// Mode 1 — JSON-2 (Odoo 17+/19):
//   POST /json/2/<model>/<method>
//   Headers: Authorization: bearer <API_KEY>
//            X-Odoo-Database: <db>
//   Body: direct JSON params (domain, fields, ids, etc.)
//
// Mode 2 — Legacy JSON-RPC (Odoo 14-18, still works in 19):
//   POST /jsonrpc  (service: common → authenticate → uid)
//   POST /jsonrpc  (service: object → execute_kw → [db,uid,apikey,model,method,args,kwargs])
//   Completely stateless — no session cookie needed.
//
// Required env vars: ODOO_API_USER, ODOO_API_KEY
// Optional:          ODOO_DB (auto-detected via /jsonrpc db.list if not set)

let _odooDbCache  = null;
let _odooUidCache = null;   // uid for legacy mode
let _odooApiMode  = 'legacy';   // force legacy to avoid lang errors

function odooHttpPost(path, bodyObj, extraHeaders) {
  const target  = new URL(ODOO_URL);
  const bodyStr = JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: target.hostname,
      port:     parseInt(target.port) || 7015,
      path,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...extraHeaders,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Odoo timeout')));
    req.write(bodyStr);
    req.end();
  });
}

async function odooGetDb() {
  if (_odooDbCache) return _odooDbCache;
  if (process.env.ODOO_DB) { _odooDbCache = process.env.ODOO_DB; return _odooDbCache; }
  // Auto-detect via legacy JSON-RPC db service
  try {
    const { body } = await odooHttpPost('/jsonrpc',
      { jsonrpc: '2.0', method: 'call', id: 1, params: { service: 'db', method: 'list', args: [] } });
    const r = JSON.parse(body);
    if (Array.isArray(r.result) && r.result.length) {
      _odooDbCache = r.result[0];
      console.log(`[Odoo] Auto-detected DB: "${_odooDbCache}"`);
      return _odooDbCache;
    }
  } catch (e) {
    console.warn('[Odoo] DB auto-detect error:', e.message);
  }
  return null;
}

// Legacy: authenticate once → get integer uid
async function odooLegacyAuth(db, login, apikey) {
  if (_odooUidCache) return _odooUidCache;
  const { body, status } = await odooHttpPost('/jsonrpc', {
    jsonrpc: '2.0', method: 'call', id: Date.now(),
    params: { service: 'common', method: 'authenticate', args: [db, login, apikey, {}] },
  });
  if (status !== 200) throw new Error(`Odoo auth HTTP ${status}: ${body.substring(0, 200)}`);
  const r = JSON.parse(body);
  if (r.error) throw new Error(r.error.data?.message || r.error.message || 'Odoo auth error');
  if (!r.result || typeof r.result !== 'number') {
    throw new Error('Auth failed — check ODOO_API_USER and ODOO_API_KEY (got: ' + JSON.stringify(r.result) + ')');
  }
  _odooUidCache = r.result;
  console.log(`✓ Odoo legacy auth OK (uid=${_odooUidCache}, db=${db})`);
  return _odooUidCache;
}

// Legacy: stateless call with [db, uid, apikey, model, method, args, kwargs]
async function odooLegacyExecute(model, method, args, kwargs, db, uid, apikey) {
  const { body, status } = await odooHttpPost('/jsonrpc', {
    jsonrpc: '2.0', method: 'call', id: Date.now(),
    params: { service: 'object', method: 'execute_kw', args: [db, uid, apikey, model, method, args, { ...kwargs, context: { lang: DEFAULT_LANG, ...(kwargs?.context || {}) } }] },
  });
  if (status !== 200) throw new Error(`Odoo execute HTTP ${status}`);
  const r = JSON.parse(body);
  if (r.error) throw new Error(r.error.data?.message || r.error.message || 'Odoo execute error');
  return r.result;
}

// JSON-2: POST /json/2/<model>/<method> with bearer token
async function odooJson2Execute(model, method, params, db, apikey) {
  const { body, status } = await odooHttpPost(`/json/2/${model}/${method}`, params, {
    Authorization:      `bearer ${apikey}`,
    'X-Odoo-Database':  db,
    'User-Agent':       'RENACE.TECH NodeProxy/1.0',
  });
  if (status === 404) return { notFound: true };
  if (status === 401) throw new Error('API key inválida o usuario sin permisos (401)');
  if (status >= 400) {
    let msg = `HTTP ${status}`;
    try { msg = JSON.parse(body)?.message || msg; } catch {}
    throw new Error(`Odoo JSON-2 error: ${msg}`);
  }
  return { result: JSON.parse(body) };
}

// Main entry — auto-detects API mode, transparently retries legacy on 404
async function odooExecute(model, method, args = [], kwargs = {}) {
  const login  = process.env.ODOO_API_USER;
  const apikey = process.env.ODOO_API_KEY;
  if (!login || !apikey) throw new Error('Faltan env vars: ODOO_API_USER y ODOO_API_KEY');

  const db = await odooGetDb();
  if (!db) throw new Error('No se encontró base de datos. Define ODOO_DB en el .env.');

  // Legacy JSON-RPC (forced)
  const uid = await odooLegacyAuth(db, login, apikey);
  const ctxMerged = { ...kwargs, context: { lang: DEFAULT_LANG, ...(kwargs?.context || {}) } };
  return odooLegacyExecute(model, method, args, ctxMerged, db, uid, apikey);
}

// Force legacy execution (skip JSON-2) — used for sale.order create to avoid lang issues
async function odooForceLegacy(model, method, args = [], kwargs = {}) {
  const login  = process.env.ODOO_API_USER;
  const apikey = process.env.ODOO_API_KEY;
  if (!login || !apikey) throw new Error('Faltan env vars: ODOO_API_USER y ODOO_API_KEY');
  const db = await odooGetDb();
  if (!db) throw new Error('No se encontró base de datos. Define ODOO_DB en el .env.');
  const uid = await odooLegacyAuth(db, login, apikey);
  return odooLegacyExecute(model, method, args, kwargs, db, uid, apikey);
}

// GET /api/odoo/products[?q=search&categ=name&limit=24]
app.get('/api/odoo/products', apiLimiter, async (req, res) => {
  try {
    // Sanitize query params
    const q      = String(req.query.q || '').trim().replace(/[<>"']/g, '').substring(0, 80);
    const categ  = String(req.query.categ || '').trim().replace(/[<>"']/g, '').substring(0, 50);
    const limit  = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 48);

    const domain = [['sale_ok', '=', true], ['active', '=', true]];
    if (q) {
      domain.push('|');
      domain.push(['name', 'ilike', q]);
      domain.push(['description_sale', 'ilike', q]);
    }
    if (categ) domain.push(['categ_id.name', 'ilike', categ]);

    const products = await odooExecute(
      'product.template', 'search_read',
      [domain],
      {
        fields: ['id', 'name', 'list_price', 'description_sale', 'image_128', 'image_1920', 'categ_id', 'type'],
        limit,
        order: 'name asc',
        context: { bin_size: false }
      }
    );
    const withUrls = (products || []).map(p => ({
      ...p,
      image_url: p.id ? `/api/odoo/image/${p.id}` : ''
    }));
    res.json(withUrls);
  } catch (e) {
    console.error('[Odoo products]', e.message);
    res.status(502).json({ error: e.message });
  }
});

// GET /api/odoo/image/:id  — lightweight product image proxy (avoids huge base64 in product list)
app.get('/api/odoo/image/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).end();
  try {
    const target = new URL(ODOO_URL);
    const lib    = target.protocol === 'https:' ? https : http;
    const path   = `/web/image/product.template/${id}/image_128`;
    const proxyReq = lib.request({
      hostname: target.hostname,
      port:     parseInt(target.port) || 7015,
      path,
      method:   'GET',
      headers:  { 'User-Agent': 'RENACE.TECH NodeProxy/1.0' },
    }, (proxyRes) => {
      if (proxyRes.statusCode === 200) {
        res.set('Content-Type', proxyRes.headers['content-type'] || 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        proxyRes.pipe(res);
      } else {
        res.status(proxyRes.statusCode || 404).end();
      }
    });
    proxyReq.on('error', () => res.status(502).end());
    proxyReq.setTimeout(5000, () => { proxyReq.destroy(); res.status(504).end(); });
    proxyReq.end();
  } catch (e) {
    res.status(502).end();
  }
});

// POST /api/odoo/quote
app.post('/api/odoo/quote', apiLimiter, async (req, res) => {
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || !items.length || items.length > 30)
    return res.status(400).json({ error: 'Items requeridos (máximo 30)' });

  // Validate item structure
  for (const it of items) {
    if (!Number.isInteger(it.id) || it.id < 1) return res.status(400).json({ error: 'ID de producto inválido' });
    if (!Number.isInteger(it.qty) && typeof it.qty !== 'number') it.qty = 1;
    it.qty = Math.min(Math.max(Math.round(Number(it.qty) || 1), 1), 999);
  }

  // Sanitize customer input
  const name    = String(customer?.name    || '').replace(/[<>]/g, '').substring(0, 100);
  const email   = String(customer?.email   || '').replace(/[<>]/g, '').substring(0, 120);
  const phone   = String(customer?.phone   || '').replace(/[<>]/g, '').substring(0, 30);
  const message = String(customer?.message || '').replace(/[<>]/g, '').substring(0, 500);

  try {
    // ── SECURITY: Fetch real prices from Odoo — never trust client-provided prices ──
    const productIds = [...new Set(items.map(i => i.id))];
    const realProducts = await odooExecute('product.template', 'search_read',
      [[['id', 'in', productIds], ['sale_ok', '=', true], ['active', '=', true]]],
      { fields: ['id', 'name', 'list_price'], limit: productIds.length });

    if (!realProducts?.length) return res.status(400).json({ error: 'Productos no encontrados o no disponibles para venta' });
    const priceMap = Object.fromEntries(realProducts.map(p => [p.id, { price: p.list_price, name: p.name }]));

    // Only include items that actually exist in Odoo
    const validItems = items.filter(i => priceMap[i.id]);
    if (!validItems.length) return res.status(400).json({ error: 'Ningún producto válido en el pedido' });

    // ── Partner lookup / creation (force legacy) ──
    let partnerId = parseInt(process.env.ODOO_DEFAULT_PARTNER || '3', 10);
    if (email) {
      const existing = await odooForceLegacy('res.partner', 'search_read',
        [[['email', '=', email]]], { fields: ['id'], limit: 1 });
      if (existing?.length) {
        partnerId = existing[0].id;
      } else {
        const created = await odooForceLegacy('res.partner', 'create',
          [{ name: name || email, email, phone }]);
        partnerId = Array.isArray(created) ? created[0] : created;
      }
    }

    const orderVals = {
      partner_id: partnerId,
      note: (message || 'Cotización creada desde web chat RENACE.TECH').substring(0, 500),
      order_line: validItems.map(item => [0, 0, {
        product_id: item.id,
        product_uom_qty: item.qty,
        price_unit: priceMap[item.id].price,  // server-side price
        name: priceMap[item.id].name,         // server-side name
      }]),
    };

    // Use legacy explicitly to avoid JSON-2 language issues
    const created = await odooForceLegacy('sale.order', 'create', [orderVals]);
    const orderId = Array.isArray(created) ? created[0] : created;
    const order   = await odooForceLegacy('sale.order', 'search_read',
      [[['id', '=', orderId]]], { fields: ['name', 'amount_total'], limit: 1 });
    res.json({ success: true, orderId, orderRef: order?.[0]?.name || `SO-${orderId}`, total: order?.[0]?.amount_total || 0 });
  } catch (e) {
    console.error('[Odoo quote]', e.message);
    res.status(502).json({ error: 'No se pudo crear la cotización: ' + e.message });
  }
});

// Longpolling (gevent port 7018) — must be before the generic /odoo route
app.use('/odoo/longpolling', (req, res) => odooProxy(req, res, ODOO_LONGPOLL_URL, '/odoo/longpolling'));

// Redirect bare /odoo → /odoo/web
app.get('/odoo', (req, res) => res.redirect(301, '/odoo/web'));

// All other /odoo/** → Odoo HTTP port 7015
app.use('/odoo', (req, res) => odooProxy(req, res, ODOO_URL, '/odoo'));

// ── /web/** → Odoo (native Odoo paths: /web/login, /web/assets, etc.) ──
// These are Odoo's own URLs — must NOT be handled by Node.js catch-all.
app.use('/web', (req, res) => {
  const target = new URL(ODOO_URL);
  const lib    = target.protocol === 'https:' ? https : http;
  const upstreamPath = '/web' + (req.url === '/' ? '' : req.url);

  // Re-serialize body (body-parser already consumed the stream)
  let bodyStr = '';
  const ctype = req.headers['content-type'] || '';
  if (req.body && Object.keys(req.body).length) {
    if (ctype.includes('json')) bodyStr = JSON.stringify(req.body);
    else bodyStr = new URLSearchParams(req.body).toString();
  }

  const proxyReq = lib.request({
    hostname: target.hostname,
    port:     target.port || (target.protocol === 'https:' ? 443 : 80),
    path:     upstreamPath,
    method:   req.method,
    headers:  {
      ...buildOdooProxyHeaders(req),
      host: target.host,
      'content-length': bodyStr ? Buffer.byteLength(bodyStr) : 0,
      'content-type':   ctype || 'application/x-www-form-urlencoded',
    },
  }, (proxyRes) => {
    const outHeaders = {};
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (HOP_BY_HOP.has(k.toLowerCase())) continue;
      outHeaders[k] = v; // keep Location as-is for /web paths
    }
    res.writeHead(proxyRes.statusCode, outHeaders);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', (err) => {
    console.error('[Odoo /web proxy]', err.message);
    if (!res.headersSent) res.status(502).send('Odoo unavailable');
  });
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && bodyStr) {
    proxyReq.write(bodyStr);
    proxyReq.end();
  } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
});

// ── Global Error Handler ──
app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Archivo demasiado grande (máx 20MB)' });
    }
    return res.status(400).json({ error: 'Error en la subida de archivos' });
  }
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Catch-all (SPA fallback) ──
app.use((req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
  // Prevent serving index.html for static files that don't exist (like manifest.json)
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).end();
  }
  // Disable caching for the HTML fallback to immediately deploy UI changes
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile('index.html', { root: __dirname });
});

// ── Start ── (raw http.Server for WebSocket upgrade support)
const rawServer = http.createServer(app);

// WebSocket tunnel for Odoo bus / longpolling (no external deps)
rawServer.on('upgrade', (req, socket, head) => {
  const isOdooWs = req.url.startsWith('/odoo/longpolling') ||
                   req.url.startsWith('/odoo/websocket')  ||
                   req.url.startsWith('/odoo/bus');
  if (!isOdooWs) { socket.destroy(); return; }

  const target = new URL(ODOO_LONGPOLL_URL);
  const upstream = http.request({
    hostname: target.hostname,
    port: target.port || 80,
    path: req.url.replace(/^\/odoo/, '') || '/',
    method: 'GET',
    headers: {
      ...req.headers,
      host: target.host,
      'x-forwarded-for': req.socket.remoteAddress,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'renace.tech',
    },
  });

  upstream.on('upgrade', (upRes, upSocket, upHead) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      Object.entries(upRes.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n'
    );
    if (upHead?.length) upSocket.unshift(upHead);
    upSocket.pipe(socket);
    socket.pipe(upSocket);
    socket.on('error', () => upSocket.destroy());
    upSocket.on('error', () => socket.destroy());
  });

  upstream.on('error', () => socket.destroy());
  upstream.end();
});

async function initOdooSSOKey() {
  const odooUrl = process.env.ODOO_URL;
  const db = process.env.ODOO_DB;
  const user = process.env.ODOO_API_USER;
  const pass = process.env.ODOO_API_KEY;
  const ssoKey = process.env.PORTAL_ENCRYPTION_KEY;
  
  if (!odooUrl || !db || !user || !pass || !ssoKey) {
    console.log('[Odoo SSO Key] Saltando config automática (faltan variables).');
    return;
  }
  
  try {
    const authResult = await odooValidateCredentials(odooUrl, db, user, pass);
    if (!authResult.valid || !authResult.uid) {
      console.warn('[Odoo SSO Key] Fallo la autenticación de Odoo API.');
      return;
    }
    
    const target = new URL(odooUrl);
    const lib = target.protocol === 'https:' ? https : http;
    const bodyObj = { 
      jsonrpc: '2.0', 
      method: 'call', 
      params: { 
        service: 'object', 
        method: 'execute_kw', 
        args: [
          db, 
          authResult.uid, 
          pass, 
          'ir.config_parameter', 
          'set_param', 
          ['renace_sso.portal_encryption_key', ssoKey]
        ] 
      }, 
      id: Math.floor(Math.random() * 1000)
    };
    
    const bodyStr = JSON.stringify(bodyObj);
    
    await new Promise((resolve, reject) => {
      const req = lib.request({ 
        hostname: target.hostname, 
        port: parseInt(target.port) || (target.protocol === 'https:' ? 443 : 80), 
        path: '/jsonrpc', 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } 
      }, proxyRes => { 
        proxyRes.on('data', () => {}); 
        proxyRes.on('end', resolve); 
      });
      req.on('error', reject); 
      req.write(bodyStr); 
      req.end();
    });
    console.log('[Odoo SSO Key] Parámetro de cifrado inyectado exitosamente en Odoo.');
  } catch (e) {
    console.error('[Odoo SSO Key] Error al sincronizar con Odoo:', e.message);
  }
}

rawServer.listen(PORT, async () => {
  console.log(`🚀 RENACE.TECH running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  try {
    security.assertProductionSecrets();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  await initDB();
  await seedBundledDownloads();
  await initOdooSSOKey();
  // Periodic cleanup of expired portal/SSO tokens
  setInterval(() => {
    portalAuth.purgeExpired(pool).catch(() => {});
  }, 60 * 60 * 1000);
});
