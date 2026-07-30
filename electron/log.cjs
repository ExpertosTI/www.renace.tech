'use strict';

/**
 * Logs silenciosos: archivo local + envío periódico a renace.tech.
 * Sin UI visual; sin volcar secretos.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const { app } = require('electron');

const UPLOAD_URL =
  process.env.RENACE_LOG_UPLOAD_URL || 'https://renace.tech/api/portal/desktop-logs';

let logPath = null;
let meta = { version: '', platform: '', deviceId: '', instanceHost: '' };
const queue = [];
let flushTimer = null;
let flushing = false;

const MAX_QUEUE = 200;
const FLUSH_MS = 45 * 1000;
const MAX_LINE = 1200;

function ensureLog() {
  if (logPath) return logPath;
  const dir = path.join(app.getPath('logs'), 'RENACE Portal');
  fs.mkdirSync(dir, { recursive: true });
  logPath = path.join(dir, 'portal.log');
  return logPath;
}

function stamp() {
  return new Date().toISOString();
}

function redact(s) {
  return String(s || '')
    .replace(/session_id[=:]\s*["']?[\w.-]+/gi, 'session_id=***')
    .replace(/password["']?\s*[:=]\s*["'][^"']+/gi, 'password=***')
    .replace(/\bpin["']?\s*[:=]\s*["']?\d+/gi, 'pin=***')
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer ***')
    .slice(0, MAX_LINE);
}

function write(level, msg, extra) {
  const safeExtra =
    extra === undefined
      ? undefined
      : typeof extra === 'string'
        ? redact(extra)
        : JSON.parse(redact(JSON.stringify(extra)));
  const line =
    `${stamp()} [${level}] ${redact(msg)}` +
    (safeExtra !== undefined ? ` ${typeof safeExtra === 'string' ? safeExtra : JSON.stringify(safeExtra)}` : '') +
    '\n';
  try {
    fs.appendFileSync(ensureLog(), line);
  } catch (_) {}

  // Solo ERROR a stderr (consola del proceso) — sin spam INFO
  if (level === 'ERROR') {
    try {
      console.error(line.trim());
    } catch (_) {}
  }

  queue.push({ t: stamp(), level, msg: redact(msg), extra: safeExtra });
  while (queue.length > MAX_QUEUE) queue.shift();
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush().catch(() => {});
  }, FLUSH_MS);
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const u = new URL(url);
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'User-Agent': 'RENACE-Portal-Desktop',
          Accept: 'application/json',
        },
        timeout: 20000,
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`HTTP ${res.statusCode}`));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(data);
    req.end();
  });
}

async function flush() {
  if (flushing || !queue.length) return;
  flushing = true;
  const batch = queue.splice(0, queue.length);
  try {
    await postJson(UPLOAD_URL, {
      ...meta,
      hostname: os.hostname().slice(0, 80),
      lines: batch,
    });
  } catch (_) {
    // Reencolar (limitado) si falla la red
    for (let i = batch.length - 1; i >= 0 && queue.length < MAX_QUEUE; i--) {
      queue.unshift(batch[i]);
    }
  } finally {
    flushing = false;
  }
}

function configure(opts = {}) {
  meta = {
    version: String(opts.version || app.getVersion?.() || ''),
    platform: String(opts.platform || process.platform),
    deviceId: String(opts.deviceId || '').slice(0, 64),
    instanceHost: String(opts.instanceHost || '').slice(0, 120),
  };
}

function setInstanceHost(host) {
  meta.instanceHost = String(host || '').slice(0, 120);
}

module.exports = {
  path: () => ensureLog(),
  configure,
  setInstanceHost,
  flush,
  info: (m, e) => write('INFO', m, e),
  warn: (m, e) => write('WARN', m, e),
  error: (m, e) => write('ERROR', m, e),
  /** Ya no abre carpeta — solo fuerza envío silencioso al servidor */
  open: () => {
    flush().catch(() => {});
  },
};
