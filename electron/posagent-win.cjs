'use strict';

/**
 * Windows-only: asegura POS Agent PRO instalado en resources,
 * registrado en Run (inicio con Windows) y en ejecución.
 * También detecta Visual C++ Redistributable (Qt) e intenta instalarlo.
 * Fuente POS Agent: https://github.com/dieg0-a/posagentpro
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

function vcRedistPath() {
  const packed = path.join(process.resourcesPath || '', 'vcredist', 'VC_redist.x64.exe');
  if (fs.existsSync(packed)) return packed;
  const dev = path.join(__dirname, '..', 'vendor', 'vcredist', 'VC_redist.x64.exe');
  if (fs.existsSync(dev)) return dev;
  return null;
}

function system32(...parts) {
  const root = process.env.SystemRoot || 'C:\\Windows';
  return path.join(root, 'System32', ...parts);
}

function hasVcRedistSync() {
  try {
    if (fs.existsSync(system32('vcruntime140.dll')) && fs.existsSync(system32('msvcp140.dll'))) {
      return true;
    }
  } catch (_) {}
  return false;
}

function readVcInstalledFromRegistry() {
  return new Promise((resolve) => {
    execFile(
      'reg',
      [
        'query',
        'HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64',
        '/v',
        'Installed',
      ],
      { windowsHide: true },
      (err, stdout) => {
        if (err) return resolve(false);
        // REG_DWORD 0x1
        resolve(/Installed\s+REG_DWORD\s+0x1\b/i.test(String(stdout || '')));
      }
    );
  });
}

async function ensureVcRedist() {
  if (hasVcRedistSync()) return { ok: true, already: true };
  const fromReg = await readVcInstalledFromRegistry();
  if (fromReg) return { ok: true, already: true };

  const redist = vcRedistPath();
  if (!redist) {
    log.warn('vcredist missing from bundle');
    return { ok: false, reason: 'missing-vcredist' };
  }

  log.info('vcredist installing', redist);
  return new Promise((resolve) => {
    execFile(
      redist,
      ['/install', '/quiet', '/norestart'],
      { windowsHide: true },
      (err, _stdout, stderr) => {
        // 0 ok, 1638 newer present, 3010 reboot required — treat as success
        const code = err && typeof err.code === 'number' ? err.code : 0;
        if (!err || code === 1638 || code === 3010) {
          log.info('vcredist install ok', code || 0);
          resolve({ ok: true, code: code || 0 });
          return;
        }
        log.warn('vcredist install failed', err.message, String(stderr || '').slice(0, 200));
        resolve({ ok: false, reason: 'install-failed', code });
      }
    );
  });
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

function regDeleteRun() {
  return new Promise((resolve) => {
    execFile(
      'reg',
      ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', RUN_VALUE, '/f'],
      { windowsHide: true },
      () => resolve(true)
    );
  });
}

function readStartWithWindowsFlag() {
  return new Promise((resolve) => {
    execFile(
      'reg',
      ['query', 'HKCU\\Software\\RENACE\\Portal', '/v', 'StartWithWindows'],
      { windowsHide: true },
      (err, stdout) => {
        if (err) return resolve(null);
        const m = String(stdout || '').match(/StartWithWindows\s+REG_SZ\s+(\S+)/i);
        if (!m) return resolve(null);
        resolve(m[1] === '1' || /^true$/i.test(m[1]));
      }
    );
  });
}

/**
 * Call once after app.whenReady on win32.
 * @param {{ openAtLogin?: boolean }} opts
 */
async function ensurePosAgent(opts = {}) {
  if (process.platform !== 'win32') return { ok: false, reason: 'not-windows' };

  const vc = await ensureVcRedist();
  if (!vc.ok) log.warn('vcredist ensure', vc);

  const exe = exePath();
  if (!exe) {
    log.warn('posagent bundle missing');
    return { ok: false, reason: 'missing-bundle', vc };
  }

  let openAtLogin = opts.openAtLogin;
  if (typeof openAtLogin !== 'boolean') {
    const fromReg = await readStartWithWindowsFlag();
    openAtLogin = fromReg == null ? true : fromReg;
  }

  if (openAtLogin) await regAddRun(exe);
  else await regDeleteRun();

  const running = await isRunning();
  if (!running) startAgent(exe);
  try {
    const marker = path.join(app.getPath('userData'), 'posagent-ensured.json');
    fs.writeFileSync(marker, JSON.stringify({ at: Date.now(), exe, vc, openAtLogin }, null, 2));
  } catch (_) {}
  return { ok: true, exe, running, vc, openAtLogin };
}

module.exports = {
  ensurePosAgent,
  exePath,
  bundledDir,
  ensureVcRedist,
  vcRedistPath,
  regAddRun,
  regDeleteRun,
  readStartWithWindowsFlag,
};
