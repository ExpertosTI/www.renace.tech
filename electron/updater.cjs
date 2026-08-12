'use strict';

/**
 * Actualizaciones del Portal Desktop desde renace.tech
 * - Al abrir: descarga en silencio (defer)
 * - Al cerrar / Salir: instala pendiente
 * Manifiesto: GET https://renace.tech/api/portal/desktop-update
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const log = require('./log.cjs');

const UPDATE_URL =
  process.env.RENACE_UPDATE_URL || 'https://renace.tech/api/portal/desktop-update';

let checking = false;
let downloadedPath = null;
let pendingManifest = null;
let installing = false;

function updatesDir() {
  const dir = path.join(app.getPath('userData'), 'updates');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function pendingMetaPath() {
  return path.join(updatesDir(), 'pending.json');
}

function savePendingMeta(filePath, version) {
  try {
    fs.writeFileSync(
      pendingMetaPath(),
      JSON.stringify({ path: filePath, version: version || null, at: new Date().toISOString() }, null, 2),
      'utf8'
    );
  } catch (e) {
    log.warn('pending meta save', e.message);
  }
}

function clearPendingMeta() {
  try {
    fs.unlinkSync(pendingMetaPath());
  } catch (_) {}
}

function loadPendingFromDisk() {
  try {
    const raw = fs.readFileSync(pendingMetaPath(), 'utf8');
    const meta = JSON.parse(raw);
    if (meta?.path && fs.existsSync(meta.path)) {
      downloadedPath = meta.path;
      if (meta.version) {
        pendingManifest = { ...(pendingManifest || {}), version: meta.version };
      }
      return { path: meta.path, version: meta.version || null };
    }
  } catch (_) {}
  if (downloadedPath && fs.existsSync(downloadedPath)) {
    return { path: downloadedPath, version: pendingManifest?.version || null };
  }
  return null;
}

function platformKey() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  if (process.platform === 'win32') return 'win32-x64';
  if (process.platform === 'darwin') return `darwin-${arch}`;
  return `${process.platform}-${arch}`;
}

function parseVersion(v) {
  return String(v || '0')
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .map((n) => parseInt(n, 10) || 0);
}

function isNewer(remote, local) {
  const a = parseVersion(remote);
  const b = parseVersion(local);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

function fetchJson(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { Accept: 'application/json', 'User-Agent': 'RENACE-Portal-Desktop' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchJson(res.headers.location, timeoutMs));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    const req = lib.get(url, { headers: { 'User-Agent': 'RENACE-Portal-Desktop' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return resolve(downloadFile(res.headers.location, dest, onProgress));
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10) || 0;
      let got = 0;
      res.on('data', (chunk) => {
        got += chunk.length;
        if (onProgress && total) onProgress(got / total);
      });
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    });
    req.on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
    req.setTimeout(10 * 60 * 1000, () => {
      req.destroy();
      reject(new Error('download timeout'));
    });
  });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * @param {{ silent?: boolean, deferInstall?: boolean, getWin?: () => any, requestQuit?: () => void, canInstall?: () => boolean }} opts
 */
async function checkForUpdates(opts = {}) {
  const silent = !!opts.silent;
  const deferInstall = opts.deferInstall === true || silent;
  if (checking) return { ok: false, reason: 'busy' };
  checking = true;
  try {
    const local = app.getVersion();
    const manifest = await fetchJson(UPDATE_URL);
    pendingManifest = manifest;
    const remote = String(manifest.version || '');
    if (!remote || !isNewer(remote, local)) {
      log.info('updater up-to-date', { local, remote });
      if (!silent) {
        dialog.showMessageBox(opts.getWin?.() || undefined, {
          type: 'info',
          title: 'Actualizaciones',
          message: 'RENACE Portal está al día.',
          detail: `Versión instalada: ${local}`,
        });
      }
      return { ok: true, update: false, local, remote };
    }

    const key = platformKey();
    const asset = manifest.platforms?.[key];
    if (!asset?.url) {
      log.warn('updater no asset', key);
      if (!silent) {
        dialog.showMessageBox(opts.getWin?.() || undefined, {
          type: 'warning',
          title: 'Actualización',
          message: `Hay versión ${remote}, pero no hay instalador para ${key}.`,
        });
      }
      return { ok: false, reason: 'no-asset', remote };
    }

    // Reutilizar descarga previa válida
    const existing = loadPendingFromDisk();
    if (existing?.path && existing.version === remote) {
      downloadedPath = existing.path;
      log.info('updater reuse pending', existing.path);
      if (deferInstall) {
        return { ok: true, update: true, downloaded: true, deferred: true, remote, path: existing.path };
      }
    } else {
      log.info('updater downloading', { remote, url: asset.url });
      if (!silent) {
        dialog.showMessageBox(opts.getWin?.() || undefined, {
          type: 'info',
          title: 'Descargando actualización',
          message: `Descargando RENACE Portal v${remote}...`,
          detail: 'La descarga ha comenzado. Al finalizar, la aplicación se actualizará y se reiniciará automáticamente.',
        }).catch(() => {});
      }
      const ext = path.extname(new URL(asset.url).pathname) || (process.platform === 'win32' ? '.exe' : '.dmg');
      const dest = path.join(updatesDir(), `RENACE-Portal-${remote}${ext}`);
      await downloadFile(asset.url, dest);

      if (asset.sha256) {
        const got = await sha256File(dest);
        if (got.toLowerCase() !== String(asset.sha256).toLowerCase()) {
          fs.unlink(dest, () => {});
          throw new Error('checksum mismatch');
        }
      }

      downloadedPath = dest;
      savePendingMeta(dest, remote);
      log.info('updater downloaded', dest);
    }

    if (deferInstall) {
      // Fondo: sin diálogos — se instala al cerrar
      log.info('updater deferred until quit', remote);
      return { ok: true, update: true, downloaded: true, deferred: true, remote, path: downloadedPath };
    }

    // Instalación inmediata solo si modo técnico lo pide (menú); sin popup “Más tarde”
    const canInstall = typeof opts.canInstall === 'function' ? opts.canInstall() : true;
    if (!canInstall) {
      log.info('updater waiting quit (user mode)', remote);
      return { ok: true, update: true, downloaded: true, deferred: true, remote, path: downloadedPath };
    }

    log.info('updater installing now', remote);
    await installDownloadedUpdate(opts);
    return { ok: true, update: true, installing: true, remote };
  } catch (e) {
    log.warn('updater check failed', e.message);
    if (!silent) {
      dialog.showMessageBox(opts.getWin?.() || undefined, {
        type: 'error',
        title: 'Actualización',
        message: 'No se pudo comprobar o descargar la actualización.',
        detail: e.message,
      });
    }
    return { ok: false, reason: e.message };
  } finally {
    checking = false;
  }
}

async function installDownloadedUpdate(opts = {}) {
  if (installing) return;
  loadPendingFromDisk();
  const file = downloadedPath;
  if (!file || !fs.existsSync(file)) {
    throw new Error('No hay instalador descargado');
  }

  installing = true;
  if (typeof opts.requestQuit === 'function') opts.requestQuit();

  if (process.platform === 'win32') {
    const helper = path.join(updatesDir(), 'apply-update.cmd');
    const exePath = file.replace(/"/g, '');
    const currentExe = process.execPath.replace(/"/g, '');
    const sysDir = process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32') : 'C:\\Windows\\System32';
    const taskkill = path.join(sysDir, 'taskkill.exe');
    const bat = [
      '@echo off',
      'setlocal',
      'title Actualizando RENACE Portal...',
      'color 0A',
      'echo ===================================================',
      'echo   RENACE Portal — Aplicando actualizacion...',
      'echo   Por favor espere unos segundos mientras se instala.',
      'echo ===================================================',
      'echo.',
      'echo [1/3] Cerrando procesos anteriores...',
      `"${taskkill}" /F /IM "RENACE Portal.exe" >nul 2>&1`,
      `"${taskkill}" /F /IM "posagent.exe" >nul 2>&1`,
      'timeout /t 2 /nobreak >nul',
      'echo [2/3] Instalando nueva version...',
      `"${exePath}" /S`,
      'timeout /t 2 /nobreak >nul',
      'echo [3/3] Reiniciando RENACE Portal...',
      `start "" "${currentExe}"`,
      'endlocal',
      'exit',
    ].join('\r\n');
    fs.writeFileSync(helper, bat, 'utf8');
    clearPendingMeta();
    spawn('cmd.exe', ['/c', 'start', 'Actualizando RENACE Portal', 'cmd.exe', '/c', helper], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      cwd: path.dirname(helper),
    }).unref();
    setTimeout(() => {
      try {
        app.exit(0);
      } catch (_) {
        process.exit(0);
      }
    }, 300);
    return;
  }

  clearPendingMeta();
  await shell.openPath(file);
  dialog.showMessageBox(opts.getWin?.() || undefined, {
    type: 'info',
    title: 'Instalador abierto',
    message: 'Arrastra RENACE Portal a Aplicaciones (reemplaza la copia vieja) y vuelve a abrir la app.',
  });
  installing = false;
}

/**
 * Si hay update pendiente, lanza instalador (Windows) y sale.
 * @returns {boolean} true si se inició instalación
 */
function installDeferredIfAny(opts = {}) {
  if (installing) return false;
  const pending = loadPendingFromDisk();
  if (!pending?.path) return false;
  if (process.platform !== 'win32') {
    // macOS: abrir DMG al salir
    installDownloadedUpdate(opts).catch((e) => log.warn('deferred mac update', e.message));
    return true;
  }
  log.info('installing deferred update on quit', pending);
  installDownloadedUpdate(opts).catch((e) => log.warn('deferred install', e.message));
  return true;
}

function getPendingUpdate() {
  return loadPendingFromDisk();
}

function startAutoUpdateLoop(opts) {
  const run = () => {
    checkForUpdates({ ...opts, silent: true, deferInstall: true }).catch(() => {});
  };
  // Pronto al abrir (fondo) + cada 4 h
  setTimeout(run, 8000);
  setInterval(run, 4 * 60 * 60 * 1000);
}

module.exports = {
  checkForUpdates,
  installDownloadedUpdate,
  installDeferredIfAny,
  getPendingUpdate,
  startAutoUpdateLoop,
  loadPendingFromDisk,
  isNewer,
  platformKey,
};
