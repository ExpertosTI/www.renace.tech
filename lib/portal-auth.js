/**
 * Portal session auth — hashed tokens in Postgres (memory fallback).
 * Raw token is shown once to the client; only SHA-256 is stored.
 */
'use strict';

const security = require('./security');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const memorySessions = new Map();

/** Optional default — only used when an instance explicitly has no better public host. Prefer per-client public_url. */
const ODOO_PUBLIC_BASE_URL = String(process.env.ODOO_PUBLIC_BASE_URL || 'https://app.renace.tech')
  .trim()
  .replace(/\/$/, '');

function isPrivateOrInternalHostname(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h || h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const p = h.split('.').map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 127) return true;
    // VPS IP used as internal Odoo endpoint (main or multi-port) — never expose in browser SSO
    if (h === '85.31.224.232') return true;
    return false;
  }
  const extra = String(process.env.ODOO_INTERNAL_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(h);
}

function originFromUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    if (!u.hostname) return null;
    return `${u.protocol}//${u.host}`.replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Browser-facing Odoo origin for SSO redirects.
 * Each client must resolve to ITS public domain (from public_url or a public odoo_url).
 * Does NOT rewrite unknown clients to app.renace.tech.
 */
function toPublicOdooUrl(odooUrl, publicUrl) {
  const preferred = originFromUrl(publicUrl);
  if (preferred) {
    try {
      const host = new URL(preferred).hostname;
      if (!isPrivateOrInternalHostname(host)) return preferred;
    } catch (_) {}
  }

  const fromOdoo = originFromUrl(odooUrl);
  if (fromOdoo) {
    try {
      const host = new URL(fromOdoo).hostname;
      if (!isPrivateOrInternalHostname(host)) return fromOdoo;
    } catch (_) {}
  }

  return null;
}

function cleanupMemory() {
  const now = Date.now();
  for (const [hash, session] of memorySessions.entries()) {
    if (!session || session.exp < now || session.revoked) memorySessions.delete(hash);
  }
}

async function ensureSchema(pool) {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_sessions (
      id SERIAL PRIMARY KEY,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      portal_user_id INTEGER REFERENCES client_portal_users(id) ON DELETE SET NULL,
      instance_id INTEGER REFERENCES odoo_instances(id) ON DELETE CASCADE,
      odoo_login VARCHAR(255) NOT NULL,
      service_code VARCHAR(32),
      client_name VARCHAR(255),
      odoo_url VARCHAR(500),
      odoo_db VARCHAR(255),
      ip_address VARCHAR(45),
      user_agent TEXT,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON portal_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON portal_sessions(portal_user_id);
  `);
}

async function issueSession(pool, payload, meta = {}) {
  const rawToken = security.randomToken(32);
  const tokenHash = security.sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const row = {
    email: payload.email,
    serviceCode: payload.serviceCode || null,
    instanceId: payload.instanceId || null,
    clientName: payload.clientName || null,
    odooUrl: payload.odooUrl || null,
    odooDb: payload.odooDb || null,
    portalUserId: payload.portalUserId || null,
    exp: expiresAt.getTime(),
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO portal_sessions
          (token_hash, portal_user_id, instance_id, odoo_login, service_code, client_name, odoo_url, odoo_db, ip_address, user_agent, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          tokenHash,
          row.portalUserId,
          row.instanceId,
          row.email,
          row.serviceCode,
          row.clientName,
          row.odooUrl,
          row.odooDb,
          meta.ip || null,
          meta.userAgent || null,
          expiresAt,
        ]
      );
    } catch (e) {
      console.warn('[portal-auth] DB issue fallback to memory:', e.message);
      cleanupMemory();
      memorySessions.set(tokenHash, { ...row, revoked: false });
    }
  } else {
    cleanupMemory();
    memorySessions.set(tokenHash, { ...row, revoked: false });
  }

  return {
    portalToken: rawToken,
    expiresAt: expiresAt.toISOString(),
    ttlMs: SESSION_TTL_MS,
  };
}

function extractRawToken(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return bearer || String(req.headers['x-portal-token'] || req.body?.portalToken || '').trim();
}

async function resolveSession(pool, req) {
  const raw = extractRawToken(req);
  if (!raw || raw.length < 32 || raw.length > 128) return null;
  const tokenHash = security.sha256Hex(raw);

  if (pool) {
    try {
      const result = await pool.query(
        `SELECT id, portal_user_id, instance_id, odoo_login, service_code, client_name, odoo_url, odoo_db, expires_at, revoked_at
         FROM portal_sessions
         WHERE token_hash = $1
         LIMIT 1`,
        [tokenHash]
      );
      const row = result.rows[0];
      if (!row) {
        // memory fallback for pre-restart tokens during rolling deploy
      } else if (row.revoked_at) {
        return null;
      } else if (new Date(row.expires_at).getTime() < Date.now()) {
        return null;
      } else {
        pool.query(
          `UPDATE portal_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.id]
        ).catch(() => {});
        return {
          token: raw,
          tokenHash,
          sessionId: row.id,
          email: row.odoo_login,
          serviceCode: row.service_code,
          instanceId: row.instance_id,
          clientName: row.client_name,
          odooUrl: row.odoo_url,
          odooDb: row.odoo_db,
          portalUserId: row.portal_user_id,
          exp: new Date(row.expires_at).getTime(),
        };
      }
    } catch (e) {
      console.warn('[portal-auth] resolve DB warn:', e.message);
    }
  }

  cleanupMemory();
  const mem = memorySessions.get(tokenHash);
  if (!mem || mem.revoked || mem.exp < Date.now()) {
    memorySessions.delete(tokenHash);
    return null;
  }
  return { token: raw, tokenHash, ...mem };
}

async function revokeSession(pool, req) {
  const raw = extractRawToken(req);
  if (!raw) return false;
  const tokenHash = security.sha256Hex(raw);
  memorySessions.delete(tokenHash);
  if (!pool) return true;
  try {
    const r = await pool.query(
      `UPDATE portal_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );
    return r.rowCount > 0;
  } catch (e) {
    console.warn('[portal-auth] revoke warn:', e.message);
    return true;
  }
}

async function revokeAllForUser(pool, portalUserId) {
  if (!pool || !portalUserId) return 0;
  try {
    const r = await pool.query(
      `UPDATE portal_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE portal_user_id = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [portalUserId]
    );
    return r.rowCount || 0;
  } catch {
    return 0;
  }
}

async function issueSsoRedirect(pool, { portalUserId, instanceId, odooLogin, odooUrl, publicUrl, ip, userAgent }) {
  let resolvedOdooUrl = odooUrl;
  let resolvedPublicUrl = publicUrl;
  if (pool && instanceId) {
    try {
      const r = await pool.query(
        `SELECT odoo_url, public_url FROM odoo_instances WHERE id = $1 LIMIT 1`,
        [instanceId]
      );
      if (r.rows[0]) {
        resolvedOdooUrl = resolvedOdooUrl || r.rows[0].odoo_url;
        if (!resolvedPublicUrl) resolvedPublicUrl = r.rows[0].public_url;
      }
    } catch (_) {}
  }
  const publicBase = toPublicOdooUrl(resolvedOdooUrl, resolvedPublicUrl);
  if (!publicBase) {
    const err = new Error('Instancia sin URL pública SSO configurada');
    err.code = 'missing_public_url';
    throw err;
  }
  if (!pool || !portalUserId || !instanceId || !odooLogin || !resolvedOdooUrl) {
    return { ssoRedirectUrl: `${publicBase}/web/login` };
  }
  const ssoToken = security.randomToken(32);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await pool.query(
    `INSERT INTO sso_tokens (token, user_id, instance_id, odoo_login, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ssoToken, portalUserId, instanceId, odooLogin, expiresAt, ip || null, userAgent || '']
  );
  return {
    ssoToken,
    ssoRedirectUrl: `${publicBase}/renace/sso?token=${ssoToken}`,
    expiresAt: expiresAt.toISOString(),
  };
}

async function purgeExpired(pool) {
  cleanupMemory();
  if (!pool) return;
  try {
    await pool.query(`DELETE FROM portal_sessions WHERE expires_at < NOW() - INTERVAL '7 days'`);
    await pool.query(`DELETE FROM sso_tokens WHERE expires_at < NOW() - INTERVAL '1 day'`);
  } catch (_) {}
}

module.exports = {
  SESSION_TTL_MS,
  ODOO_PUBLIC_BASE_URL,
  ensureSchema,
  issueSession,
  resolveSession,
  revokeSession,
  revokeAllForUser,
  issueSsoRedirect,
  toPublicOdooUrl,
  purgeExpired,
  extractRawToken,
};
