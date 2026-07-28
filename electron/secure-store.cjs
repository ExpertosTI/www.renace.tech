'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const FILE = () => path.join(app.getPath('userData'), 'renace-secure.json');

function canEncrypt() {
  return true;
}

function readStore() {
  try {
    const raw = fs.readFileSync(FILE(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { secrets: {}, usage: {}, instance: null, pos: {} };
  }
}

function writeStore(data) {
  const dir = path.dirname(FILE());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(data, null, 2), { mode: 0o600 });
}

function setSecret(key, value) {
  const k = String(key || '').trim().slice(0, 120);
  if (!k) return false;
  const store = readStore();
  if (value == null || value === '') {
    delete store.secrets[k];
  } else {
    store.secrets[k] = { plain: String(value) };
  }
  writeStore(store);
  return true;
}

function getSecret(key) {
  const k = String(key || '').trim().slice(0, 120);
  if (!k) return '';
  const store = readStore();
  const entry = store.secrets[k];
  if (!entry) return '';
  if (entry.plain != null) return String(entry.plain);
  return '';
}

function clearSecrets() {
  const store = readStore();
  store.secrets = {};
  writeStore(store);
}

/** Normaliza URL de instancia Odoo del cliente */
function normalizeInstanceUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(u.protocol)) return null;
  // Quitar paths de login/web → origen limpio
  const origin = u.origin;
  return origin.replace(/\/$/, '');
}

function getInstance() {
  const store = readStore();
  const inst = store.instance;
  if (!inst || !inst.url) return null;
  const companyId = inst.companyId != null && inst.companyId !== ''
    ? Number(inst.companyId)
    : null;
  return {
    url: String(inst.url).replace(/\/$/, ''),
    name: String(inst.name || '').trim() || 'Empresa',
    companyId: Number.isFinite(companyId) && companyId > 0 ? companyId : null,
    locked: Boolean(inst.locked),
    configuredAt: inst.configuredAt || null,
  };
}

function setInstance({ url, name, locked, companyId }) {
  const normalized = normalizeInstanceUrl(url);
  if (!normalized) return { ok: false, error: 'URL inválida' };
  const store = readStore();
  const prev = store.instance || {};
  let cid = companyId != null && companyId !== '' ? Number(companyId) : prev.companyId;
  if (!Number.isFinite(Number(cid)) || Number(cid) <= 0) cid = null;
  else cid = Number(cid);
  store.instance = {
    url: normalized,
    name: String(name || prev.name || '').trim() || new URL(normalized).hostname,
    companyId: cid,
    locked: locked !== false,
    configuredAt: new Date().toISOString(),
  };
  writeStore(store);
  return { ok: true, instance: getInstance() };
}

function clearInstance() {
  const store = readStore();
  store.instance = null;
  writeStore(store);
  return true;
}

function getStartUrl(portalFallback) {
  const inst = getInstance();
  if (!inst) return portalFallback;
  // Login de esa empresa; cids fuerza logo/contexto multiempresa (no la primera)
  if (inst.companyId) {
    return `${inst.url}/web/login?cids=${encodeURIComponent(String(inst.companyId))}`;
  }
  return `${inst.url}/web/login`;
}

function companyLogoUrl(inst) {
  const i = inst || getInstance();
  if (!i?.url || !i?.companyId) return null;
  return `${i.url}/web/image/res.company/${i.companyId}/logo`;
}

function getAppMode() {
  const store = readStore();
  return store.appMode === 'admin' ? 'admin' : 'user';
}

function setAppMode(mode) {
  const store = readStore();
  store.appMode = mode === 'admin' ? 'admin' : 'user';
  writeStore(store);
  return getAppMode();
}

/** Inicio con Windows / macOS Login Item */
function getOpenAtLogin() {
  const store = readStore();
  if (typeof store.openAtLogin === 'boolean') return store.openAtLogin;
  return null; // null = aún no definido (leer registro / default)
}

function setOpenAtLogin(enabled) {
  const store = readStore();
  store.openAtLogin = !!enabled;
  writeStore(store);
  return store.openAtLogin;
}

/** Atajos tipo Eleventa (migraciones POS) */
function defaultKeymap() {
  return {
    enabled: true,
    profile: 'eleventa',
    sales: 'F1',
    pay: 'F12',
    payPrint: 'F1',
    payNoPrint: 'F2',
    cancel: 'Escape',
    priceCheck: 'F9',
    wholesale: 'F11',
  };
}

function getKeymap() {
  const store = readStore();
  return { ...defaultKeymap(), ...(store.keymap || {}) };
}

function setKeymap(partial) {
  const store = readStore();
  store.keymap = { ...getKeymap(), ...partial };
  writeStore(store);
  return getKeymap();
}

function getPosSettings() {
  const store = readStore();
  return {
    port: Number(store.pos?.port) || 9069,
    printer: store.pos?.printer || '',
    enabled: store.pos?.enabled !== false,
  };
}

function setPosSettings(partial) {
  const store = readStore();
  store.pos = { ...getPosSettings(), ...partial };
  writeStore(store);
  return getPosSettings();
}

function normalizeHost(url) {
  try {
    const u = new URL(String(url || ''));
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
  normalizeInstanceUrl,
  getInstance,
  setInstance,
  clearInstance,
  getStartUrl,
  getPosSettings,
  setPosSettings,
  companyLogoUrl,
  getAppMode,
  setAppMode,
  getOpenAtLogin,
  setOpenAtLogin,
  getKeymap,
  setKeymap,
  defaultKeymap,
};
