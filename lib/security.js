/**
 * Shared security helpers for the RENACE API hub.
 */
'use strict';

const crypto = require('crypto');

const CAPACITOR_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const DEFAULT_WEB_ORIGINS = new Set([
  'https://renace.tech',
  'https://www.renace.tech',
]);

function extraCorsOrigins() {
  return String(process.env.CORS_EXTRA_ORIGINS || '')
    .split(/[,;\s]+/)
    .map((o) => o.trim())
    .filter(Boolean);
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return false;
  if (CAPACITOR_ORIGINS.has(origin) || DEFAULT_WEB_ORIGINS.has(origin)) return true;
  if (extraCorsOrigins().includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    // Dev only: vite / capacitor schemes
    if (!isProd() && (protocol === 'capacitor:' || protocol === 'ionic:')) return true;
    return false;
  } catch {
    return false;
  }
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function requestId() {
  return randomToken(8);
}

/**
 * Warn (or fail hard if SECURITY_STRICT=1) when production secrets are missing.
 * Call AFTER secrets-bootstrap so auto-generated values count as present.
 */
function assertProductionSecrets() {
  if (!isProd()) return { ok: true, missing: [] };
  const missing = [];
  const weak = (v) => !v || String(v).trim().length < 12;
  if (weak(process.env.ADMIN_TOKEN)) missing.push('ADMIN_TOKEN');
  if (weak(process.env.ADMIN_ACCESS_PASSWORD)) missing.push('ADMIN_ACCESS_PASSWORD');
  if (weak(process.env.PORTAL_ENCRYPTION_KEY) || String(process.env.PORTAL_ENCRYPTION_KEY || '').length < 16) {
    missing.push('PORTAL_ENCRYPTION_KEY');
  }
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');

  if (missing.length) {
    const msg = `[SECURITY] Missing production secrets after bootstrap: ${missing.join(', ')}`;
    if (process.env.SECURITY_STRICT === '1') {
      throw new Error(msg);
    }
    console.error(msg);
  }
  return { ok: missing.length === 0, missing };
}

function isSafeImageDataUrl(value, maxBytes = 1_500_000) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return false;
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return false;
  const b64 = match[2].replace(/\s+/g, '');
  const approxBytes = Math.floor((b64.length * 3) / 4);
  return approxBytes > 0 && approxBytes <= maxBytes;
}

function parseImageDataUrl(value) {
  const match = String(value || '').match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  return {
    contentType: match[1].toLowerCase().replace('image/jpg', 'image/jpeg'),
    buffer: Buffer.from(match[2].replace(/\s+/g, ''), 'base64'),
    ext: (match[1].split('/')[1] || 'jpg').replace('jpeg', 'jpg'),
  };
}

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedCorsOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, X-Portal-Token, X-Request-Id'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Vary', 'Origin');
  }
}

module.exports = {
  isAllowedCorsOrigin,
  isProd,
  timingSafeEqualString,
  sha256Hex,
  randomToken,
  requestId,
  assertProductionSecrets,
  isSafeImageDataUrl,
  parseImageDataUrl,
  applyCorsHeaders,
};
