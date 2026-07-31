'use strict';

/**
 * Acceso de personal ligado a este PC.
 * PIN local → credenciales Odoo fuertes cifradas (safeStorage).
 * Los PIN no viajan a renace.tech ni sirven como contraseña web de Odoo.
 */
const crypto = require('crypto');
const store = require('./secure-store.cjs');

const MAX_STAFF = 24;
const PIN_MIN = 4;
const PIN_MAX = 12;

function passKey(id) {
  return `staff.odooPass.${id}`;
}

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

function normalizePin(pin) {
  return String(pin || '').trim();
}

function validPin(pin) {
  const p = normalizePin(pin);
  if (p.length < PIN_MIN || p.length > PIN_MAX) return false;
  // Solo dígitos / alfanumérico simple — sin espacios
  return /^[0-9A-Za-z]+$/.test(p);
}

function hashPin(pin, salt) {
  const s = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt), 'base64');
  return crypto.scryptSync(normalizePin(pin), s, 32).toString('base64');
}

function makeSalt() {
  return crypto.randomBytes(16).toString('base64');
}

function defaultId() {
  return store.getDefaultStaffId();
}

function withDefaultFlag(rows) {
  const def = defaultId();
  return rows
    .map((p) => ({ ...p, isDefault: Boolean(def && p.id === def) }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || String(a.name).localeCompare(String(b.name), 'es'));
}

function publicList() {
  return withDefaultFlag(
    store.listStaff().map((p) => ({
      id: p.id,
      name: p.name,
    })),
  );
}

function techList() {
  return withDefaultFlag(
    store.listStaff().map((p) => ({
      id: p.id,
      name: p.name,
      odooLogin: p.odooLogin,
      hasPassword: Boolean(store.getSecret(passKey(p.id))),
      createdAt: p.createdAt || null,
    })),
  );
}

function hasProfiles() {
  return store.listStaff().length > 0;
}

/**
 * Alta / edición (solo técnico). password Odoo se guarda cifrada; pin solo como hash.
 * @param {{ id?: string, name: string, odooLogin: string, pin?: string, odooPassword?: string, isDefault?: boolean }} payload
 */
function upsert({ id, name, odooLogin, pin, odooPassword, isDefault }) {
  const displayName = String(name || '').trim().slice(0, 80);
  const login = String(odooLogin || '').trim().slice(0, 120);
  if (!displayName) return { ok: false, error: 'Nombre requerido' };
  if (!login) return { ok: false, error: 'Usuario Odoo requerido' };

  const existing = id
    ? store.getStaffById(id)
    : store.listStaff().find((p) => p.odooLogin === login) || null;
  const staffId = existing?.id || newId();

  const pinStr = normalizePin(pin);
  let pinSalt = existing?.pinSalt || null;
  let pinHash = existing?.pinHash || null;

  if (pinStr) {
    if (!validPin(pinStr)) {
      return { ok: false, error: `PIN de ${PIN_MIN}–${PIN_MAX} caracteres (letras/números)` };
    }
    pinSalt = makeSalt();
    pinHash = hashPin(pinStr, pinSalt);
  } else if (!existing) {
    return { ok: false, error: 'PIN requerido' };
  }

  const passStr = odooPassword != null ? String(odooPassword) : '';
  if (passStr) {
    const saved = store.setSecret(passKey(staffId), passStr);
    if (!saved) return { ok: false, error: 'No se pudo cifrar la contraseña Odoo' };
  } else if (!existing || !store.getSecret(passKey(staffId))) {
    return { ok: false, error: 'Contraseña Odoo requerida' };
  }

  const list = store.listStaff();
  if (!existing && list.length >= MAX_STAFF) {
    return { ok: false, error: `Máximo ${MAX_STAFF} perfiles en este PC` };
  }

  const row = {
    id: staffId,
    name: displayName,
    odooLogin: login,
    pinSalt,
    pinHash,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.saveStaff(row);

  // Primer perfil → predeterminado automático; o si el técnico lo marca
  const markDefault = isDefault === true || (!existing && !defaultId() && list.length === 0);
  if (markDefault) {
    store.setDefaultStaffId(staffId);
  } else if (isDefault === false && defaultId() === staffId) {
    store.setDefaultStaffId(null);
  }

  return {
    ok: true,
    profile: {
      id: row.id,
      name: row.name,
      odooLogin: row.odooLogin,
      isDefault: defaultId() === row.id,
    },
  };
}

function remove(id) {
  const row = store.getStaffById(id);
  if (!row) return { ok: false, error: 'No encontrado' };
  store.setSecret(passKey(id), '');
  store.removeStaff(id);
  return { ok: true };
}

function setDefault(id) {
  const sid = id != null ? String(id).trim() : '';
  if (!sid) {
    store.setDefaultStaffId(null);
    return { ok: true, defaultStaffId: null };
  }
  return store.setDefaultStaffId(sid);
}

function getDefault() {
  const id = defaultId();
  if (!id) return null;
  const row = store.getStaffById(id);
  if (!row) return null;
  return { id: row.id, name: row.name };
}

/**
 * Verifica PIN local. No expone la contraseña Odoo al renderer.
 * @returns {{ ok: boolean, error?: string, odooLogin?: string, odooPassword?: string }}
 */
function unlockWithPin(id, pin) {
  const row = store.getStaffById(id);
  if (!row || !row.pinHash || !row.pinSalt) {
    return { ok: false, error: 'Perfil no encontrado' };
  }
  if (!validPin(pin)) {
    return { ok: false, error: 'PIN inválido' };
  }
  let candidate;
  try {
    candidate = hashPin(pin, row.pinSalt);
  } catch {
    return { ok: false, error: 'PIN inválido' };
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(String(row.pinHash));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'PIN incorrecto' };
  }
  const odooPassword = store.getSecret(passKey(id));
  if (!odooPassword) {
    return { ok: false, error: 'Credencial Odoo no disponible en este PC' };
  }
  return {
    ok: true,
    odooLogin: row.odooLogin,
    odooPassword,
    name: row.name,
  };
}

module.exports = {
  publicList,
  techList,
  hasProfiles,
  upsert,
  remove,
  setDefault,
  getDefault,
  unlockWithPin,
  validPin,
  PIN_MIN,
  PIN_MAX,
  MAX_STAFF,
};
