'use strict';

/**
 * Windows-only: asegura POS Agent PRO instalado en resources,
 * registrado en Run (inicio con Windows) y en ejecución.
 * Fuente: https://github.com/dieg0-a/posagentpro
 */
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { app } = require('electron');
const log = require('./log.cjs');

const RUN_VALUE = 'RENACE POS Agent PRO';

function bundledDir() {
  // empaquetado: resources/posagent ; dev: vendor/posagent/app
  const packed = path.join(process.resourcesPath || '', 'posagent');
  if (fs.existsSync(path.join(packed, 'posagent.exe'))) return packed;
  const dev = path.join(__dirname, '..', 'vendor', 'posagent', 'app');
  if (fs.existsSync(path.join(dev, 'posagent.exe'))) return dev;
  return null;
}

function exePath() {
  const dir = bundledDir();
  return dir ? path.join(dir, 'posagent.exe') : null;
}

function regAddRun(exe) {
  return new Promise((resolve) => {
    const quoted = `"${exe}"`;
    execFile(
      'reg',
      ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', RUN_VALUE, '/t', 'REG_SZ', '/d', quoted, '/f'],
      { windowsHide: true },
      (err, stdout, stderr) => {
        if (err) log.warn('posagent Run registry', err.message, String(stderr || '').slice(0, 200));
        else log.info('posagent Run registry ok');
        resolve(!err);
      }
    );
  });
}

function isRunning() {
  return new Promise((resolve) => {
    execFile(
      'tasklist',
      ['/FI', 'IMAGENAME eq posagent.exe', '/NH'],
      { windowsHide: true },
      (err, stdout) => {
        if (err) return resolve(false);
        resolve(/posagent\.exe/i.test(String(stdout || '')));
      }
    );
  });
}

function startAgent(exe) {
  try {
    const child = spawn(exe, [], {
      cwd: path.dirname(exe),
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
    log.info('posagent started', exe);
    return true;
  } catch (e) {
    log.warn('posagent start failed', e.message);
    return false;
  }
}

/**
 * Call once after app.whenReady on win32.
 */
async function ensurePosAgent() {
  if (process.platform !== 'win32') return { ok: false, reason: 'not-windows' };
  const exe = exePath();
  if (!exe) {
    log.warn('posagent bundle missing');
    return { ok: false, reason: 'missing-bundle' };
  }
  await regAddRun(exe);
  const running = await isRunning();
  if (!running) startAgent(exe);
  try {
    const marker = path.join(app.getPath('userData'), 'posagent-ensured.json');
    fs.writeFileSync(marker, JSON.stringify({ at: Date.now(), exe }, null, 2));
  } catch (_) {}
  return { ok: true, exe, running };
}

module.exports = { ensurePosAgent, exePath, bundledDir };
