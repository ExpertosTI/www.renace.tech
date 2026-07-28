'use strict';

/**
 * Actualizaciones del Portal Desktop desde renace.tech
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

function updatesDir() {
  const dir = path.join(app.getPath('userData'), 'updates');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
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
 * @param {{ silent?: boolean, getWin?: () => any, requestQuit?: () => void, canInstall?: () => boolean }} opts
 */
async function checkForUpdates(opts = {}) {
  const silent = !!opts.silent;
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

    log.info('updater downloading', { remote, url: asset.url });
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
    log.info('updater downloaded', dest);

    const canInstall = typeof opts.canInstall === 'function' ? opts.canInstall() : true;
    if (!canInstall) {
      if (!silent) {
        dialog.showMessageBox(opts.getWin?.() || undefined, {
          type: 'info',
          title: 'Actualización descargada',
          message: `Versión ${remote} lista.`,
          detail: 'En modo Usuario no se instala sola. Un técnico (Modo técnico) puede instalarla desde el menú.',
        });
      }
      return { ok: true, update: true, downloaded: true, needsTech: true, remote, path: dest };
    }

    const { response } = await dialog.showMessageBox(opts.getWin?.() || undefined, {
      type: 'question',
      title: 'Actualización disponible',
      message: `RENACE Portal ${remote} está lista.`,
      detail: `Versión actual: ${local}\n\n¿Instalar ahora? La app se cerrará un momento.`,
      buttons: ['Más tarde', 'Instalar ahora'],
      defaultId: 1,
      cancelId: 0,
    });
    if (response === 1) {
      await installDownloadedUpdate(opts);
      return { ok: true, update: true, installing: true, remote };
    }
    return { ok: true, update: true, downloaded: true, remote, path: dest };
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
  const file = downloadedPath;
  if (!file || !fs.existsSync(file)) {
    throw new Error('No hay instalador descargado');
  }

  if (typeof opts.requestQuit === 'function') opts.requestQuit();

  if (process.platform === 'win32') {
    // NSIS silent install + relaunch
    spawn(file, ['/S'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    setTimeout(() => app.exit(0), 400);
    return;
  }

  // macOS: abrir DMG para que el técnico arrastre a Aplicaciones
  await shell.openPath(file);
  dialog.showMessageBox(opts.getWin?.() || undefined, {
    type: 'info',
    title: 'Instalador abierto',
    message: 'Arrastra RENACE Portal a Aplicaciones y vuelve a abrir la app.',
  });
}

function getPendingUpdate() {
  return downloadedPath && fs.existsSync(downloadedPath)
    ? { path: downloadedPath, version: pendingManifest?.version || null }
    : null;
}

function startAutoUpdateLoop(opts) {
  const run = () => {
    checkForUpdates({ ...opts, silent: true }).catch(() => {});
  };
  setTimeout(run, 12000);
  setInterval(run, 4 * 60 * 60 * 1000);
}

module.exports = {
  checkForUpdates,
  installDownloadedUpdate,
  getPendingUpdate,
  startAutoUpdateLoop,
  isNewer,
  platformKey,
};
