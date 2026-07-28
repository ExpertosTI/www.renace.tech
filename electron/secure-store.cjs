'use strict';

const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const FILE = () => path.join(app.getPath('userData'), 'renace-secure.json');

function canEncrypt() {
  try {
    return Boolean(safeStorage && safeStorage.isEncryptionAvailable());
  } catch {
    return false;
  }
}

function readStore() {
  try {
    const raw = fs.readFileSync(FILE(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { secrets: {}, usage: {} };
  }
}

function writeStore(data) {
  const dir = path.dirname(FILE());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(data), { mode: 0o600 });
}

function encrypt(plain) {
  if (!canEncrypt()) return { plain: String(plain || '') };
  const buf = safeStorage.encryptString(String(plain || ''));
  return { enc: buf.toString('base64') };
}

function decrypt(entry) {
  if (!entry) return '';
  if (entry.plain != null) return String(entry.plain);
  if (!entry.enc) return '';
  if (!canEncrypt()) return '';
  try {
    return safeStorage.decryptString(Buffer.from(entry.enc, 'base64'));
  } catch {
    return '';
  }
}

function setSecret(key, value) {
  const k = String(key || '').trim().slice(0, 120);
  if (!k) return false;
  const store = readStore();
  if (value == null || value === '') {
    delete store.secrets[k];
  } else {
    store.secrets[k] = encrypt(value);
  }
  writeStore(store);
  return true;
}

function getSecret(key) {
  const k = String(key || '').trim().slice(0, 120);
  if (!k) return '';
  const store = readStore();
  return decrypt(store.secrets[k]);
}

function clearSecrets() {
  const store = readStore();
  store.secrets = {};
  writeStore(store);
}

function normalizeHost(url) {
  try {
    const u = new URL(String(url || ''));
    if (!/\.renace\.tech$/i.test(u.hostname) && u.hostname !== 'renace.tech') return null;
    return u.origin;
  } catch {
    return null;
  }
}

function recordVisit(url) {
  const origin = normalizeHost(url);
  if (!origin) return null;
  const store = readStore();
  if (!store.usage) store.usage = {};
  const row = store.usage[origin] || { count: 0, lastAt: 0 };
  row.count = (row.count || 0) + 1;
  row.lastAt = Date.now();
  store.usage[origin] = row;
  writeStore(store);
  return { origin, ...row };
}

function topDestinations(limit = 3) {
  const store = readStore();
  const usage = store.usage || {};
  return Object.entries(usage)
    .map(([origin, meta]) => ({
      origin,
      count: meta.count || 0,
      lastAt: meta.lastAt || 0,
      warmUrl: `${origin}/web`,
    }))
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
    .slice(0, Math.max(1, Math.min(8, limit)));
}

module.exports = {
  canEncrypt,
  setSecret,
  getSecret,
  clearSecrets,
  recordVisit,
  topDestinations,
  normalizeHost,
};
