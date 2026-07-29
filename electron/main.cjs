'use strict';

/**
 * RENACE Portal — Electron shell
 * Portal + SSO Odoo + logs de diagnóstico (pantalla en blanco).
 */
const fs = require('fs');
const path = require('path');
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  session,
  dialog,
  clipboard,
  ipcMain,
  screen,
} = require('electron');
const store = require('./secure-store.cjs');
const log = require('./log.cjs');
const { ensurePosAgent, readStartWithWindowsFlag } = require('./posagent-win.cjs');
const posProxy = require('./pos-proxy.cjs');
const updater = require('./updater.cjs');
const winFrameScript = require('./win-frame.js');

app.commandLine.appendSwitch('disable-features', 'PushMessaging,Notifications');

const PORTAL_URL = process.env.RENACE_PORTAL_URL || 'https://renace.tech/portal';
const HOME_URL = process.env.RENACE_HOME_URL || 'https://renace.tech';
const PARTITION = 'persist:renace-portal';
const PRELOAD = path.join(__dirname, 'preload.cjs');
const SETUP_HTML = path.join(__dirname, 'setup.html');
const TECH_UNLOCK_HTML = path.join(__dirname, 'tech-unlock.html');
const TECH_PIN = String(process.env.RENACE_TECH_PIN || '101284');
/** Modo técnico caduca solo; siempre se arranca en usuario */
const ADMIN_TTL_MS = 20 * 60 * 1000;

/** Solo se puede salir con allowQuit (técnico confirmó / update) */
let allowQuit = false;
let techPromptOpen = false;
let adminExpireTimer = null;

function requestQuitForUpdate() {
  allowQuit = true;
  BrowserWindow.getAllWindows().forEach((w) => {
    try {
      w.setClosable(true);
      w.destroy();
    } catch (_) {}
  });
}

function clearAdminExpireTimer() {
  if (adminExpireTimer) {
    clearTimeout(adminExpireTimer);
    adminExpireTimer = null;
  }
}

function revertToUserMode(reason) {
  clearAdminExpireTimer();
  if (store.getAppMode() !== 'admin') return;
  store.setAppMode('user');
  buildMenu();
  BrowserWindow.getAllWindows().forEach((w) => {
    applyUserModeGuards(w);
    applyClosableState(w);
    injectUserShell(w.webContents);
  });
  log.info('tech mode locked', reason || 'manual');
  if (reason === 'ttl') {
    const win = currentWin();
    dialog
      .showMessageBox(win || undefined, {
        type: 'info',
        title: 'Modo técnico',
        message: 'Sesión técnica finalizada (20 min).',
        detail: 'Volviste a modo usuario. Para técnico otra vez: Archivo → Modo técnico… (clave).',
        buttons: ['Entendido'],
      })
      .catch(() => {});
  }
}

function scheduleAdminExpiry() {
  clearAdminExpireTimer();
  adminExpireTimer = setTimeout(() => revertToUserMode('ttl'), ADMIN_TTL_MS);
}

/** Instancia de trabajo vinculada = no cerrar con la X */
function isWorkInstanceLocked() {
  if (allowQuit) return false;
  return !!store.getInstance();
}

function denyCloseMessage(win) {
  dialog
    .showMessageBox(win || undefined, {
      type: 'warning',
      title: 'Instancia de trabajo',
      message: 'No se puede cerrar RENACE Portal.',
      detail:
        'Esta PC tiene una instancia de empresa vinculada.\nPara salir: Ctrl+Shift+Alt+T → contraseña técnico → Salir.',
      buttons: ['Entendido', 'Modo técnico…'],
      defaultId: 0,
      cancelId: 0,
    })
    .then(({ response }) => {
      if (response === 1) unlockAdmin();
    });
}

async function requestQuitFromTech() {
  if (!store.getInstance()) {
    allowQuit = true;
    if (updater.installDeferredIfAny(updaterOpts())) return true;
    app.quit();
    return true;
  }
  if (store.getAppMode() !== 'admin') {
    const ok = await unlockAdmin();
    if (!ok) return false;
  }
  const pending = updater.getPendingUpdate();
  const { response } = await dialog.showMessageBox(currentWin() || undefined, {
    type: 'warning',
    title: 'Salir',
    message: '¿Cerrar RENACE Portal?',
    detail: pending
      ? `Hay una actualización lista (${pending.version || 'nueva'}).\nAl salir se instalará en segundo plano y la app volverá a abrirse.`
      : 'La instancia de trabajo dejará de estar abierta en este PC hasta que vuelvas a abrir la app.',
    buttons: ['Cancelar', pending ? 'Salir e instalar' : 'Cerrar aplicación'],
    defaultId: 0,
    cancelId: 0,
  });
  if (response !== 1) return false;
  allowQuit = true;
  BrowserWindow.getAllWindows().forEach((w) => {
    try {
      w.setClosable(true);
    } catch (_) {}
  });
  if (updater.installDeferredIfAny(updaterOpts())) return true;
  app.quit();
  return true;
}

function applyClosableState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    win.setClosable(!isWorkInstanceLocked());
  } catch (_) {}
}

function updaterOpts() {
  return {
    getWin: () => currentWin(),
    requestQuit: requestQuitForUpdate,
    // Manual "Instalar ahora" requiere modo técnico (o PIN vía runInstallPendingUpdate)
    canInstall: () => store.getAppMode() !== 'user',
  };
}

function runUpdateCheck(silent) {
  return updater.checkForUpdates({ ...updaterOpts(), silent: !!silent });
}

async function runInstallPendingUpdate() {
  if (store.getAppMode() === 'user') {
    const ok = await unlockAdmin();
    if (!ok) return;
  }
  const pending = updater.getPendingUpdate();
  if (!pending) {
    dialog.showMessageBox(currentWin() || undefined, {
      type: 'info',
      title: 'Actualizaciones',
      message: 'No hay instalador descargado.',
      detail: 'Usa «Buscar actualizaciones…» primero.',
    });
    return;
  }
  try {
    await updater.installDownloadedUpdate(updaterOpts());
  } catch (e) {
    dialog.showMessageBox(currentWin() || undefined, {
      type: 'error',
      title: 'Actualización',
      message: 'No se pudo iniciar el instalador.',
      detail: e.message,
    });
  }
}
let PUSH_STUB = '';
let COMPANY_FOCUS = '';
let USER_SHELL = '';
try {
  PUSH_STUB = fs.readFileSync(path.join(__dirname, 'push-stub.js'), 'utf8');
} catch (_) {}
try {
  COMPANY_FOCUS = fs.readFileSync(path.join(__dirname, 'company-focus.js'), 'utf8');
} catch (_) {}
try {
  USER_SHELL = fs.readFileSync(path.join(__dirname, 'user-shell.js'), 'utf8');
} catch (_) {}


const ALLOWED = [
  /^https:\/\/renace\.tech(\/|$)/i,
  /^https:\/\/www\.renace\.tech(\/|$)/i,
  /^https:\/\/[a-z0-9.-]+\.renace\.tech(\/|$)/i,
];

function portalSession() {
  return session.fromPartition(PARTITION);
}

function isAllowed(url) {
  const u = String(url || '');
  if (!u) return false;
  if (u.startsWith('file://')) return true;
  if (ALLOWED.some((re) => re.test(u))) return true;
  const inst = store.getInstance();
  if (inst?.url) {
    try {
      const origin = new URL(inst.url).origin;
      if (u === origin || u.startsWith(`${origin}/`)) return true;
    } catch (_) {}
  }
  return false;
}

function windowTitleFor(url) {
  const inst = store.getInstance();
  if (inst?.name && url && String(url).includes(inst.url)) {
    return `${inst.name} — RENACE`;
  }
  if (url && String(url).includes('/web')) return 'RENACE — Odoo';
  return 'RENACE Portal';
}

async function applyInstanceCidsCookie(inst) {
  if (!inst?.url || !inst?.companyId) return;
  try {
    const ses = portalSession();
    const existing = await ses.cookies.get({ url: inst.url, name: 'cids' });
    // No pisar cids si el usuario ya eligió empresa en Odoo
    if (existing?.length && String(existing[0].value || '').length) return;
    await ses.cookies.set({
      url: inst.url,
      name: 'cids',
      value: String(inst.companyId),
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'no_restriction',
      expirationDate: Math.floor(Date.now() / 1000) + 86400 * 365,
    });
    log.info('cids cookie set (soft)', { host: new URL(inst.url).host, companyId: inst.companyId });
  } catch (e) {
    log.warn('cids cookie failed', e.message);
  }
}

function openSetup(win) {
  const w = win || currentWin();
  if (!w) return;
  w.loadFile(SETUP_HTML).catch((e) => log.error('setup load', e.message));
}

async function hasOdooSessionCookie(inst) {
  if (!inst?.url) return false;
  try {
    const cookies = await portalSession().cookies.get({ url: inst.url });
    return cookies.some((c) => c.name === 'session_id' && String(c.value || '').length > 8);
  } catch {
    return false;
  }
}

async function openHome(win) {
  const w = win || currentWin();
  if (!w) return;
  const inst = store.getInstance();
  if (!inst) {
    log.info('openHome: sin instancia → setup');
    openSetup(w);
    return;
  }
  await applyInstanceCidsCookie(inst);
  const loggedIn = await hasOdooSessionCookie(inst);
  // Preferir última URL de la misma instancia (no romper pantalla/formulario al reabrir)
  const last = store.getLastInstanceUrl?.() || null;
  let start;
  if (loggedIn && last && isSameOrigin(last, inst.url) && /\/(web|odoo|pos)/i.test(last)) {
    start = last;
  } else if (loggedIn) {
    start = `${inst.url}/web`;
  } else {
    start = store.getStartUrl(PORTAL_URL);
  }
  log.info('openHome', {
    start,
    instance: inst.url,
    companyId: inst.companyId || null,
    sessionRestored: loggedIn,
  });
  w.setTitle(`${inst.name} — RENACE`);
  w.loadURL(start).catch((e) => {
    log.error('openHome failed', e.message);
    openSetup(w);
  });
}

/**
 * Actualiza la interfaz (caché HTTP) sin tocar instancia, cookies ni secretos.
 */
async function refreshUiSafe(win) {
  const w = win || currentWin();
  if (!w || w.isDestroyed()) return;
  const wc = w.webContents;
  const url = wc.getURL();
  try {
    await portalSession().clearCache();
    log.info('ui refresh: cache cleared (instance preserved)');
  } catch (e) {
    log.warn('ui refresh cache', e.message);
  }
  try {
    if (!url || url === 'about:blank') {
      const inst = store.getInstance();
      if (inst) await openHome(w);
      else openSetup(w);
      return;
    }
    if (url.startsWith('file://') && url.includes('setup.html')) {
      openSetup(w);
      return;
    }
    wc.reloadIgnoringCache();
  } catch (e) {
    log.warn('ui refresh reload', e.message);
    try { wc.reload(); } catch (_) {}
  }
}

function currentWin() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

function isRenaceHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'renace.tech' || h.endsWith('.renace.tech');
}

function isSameOrigin(a, b) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/** Orígenes seguros para mutar instancia / secretos (setup local o portal RENACE) */
function senderIsTrusted(event) {
  try {
    const url = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
    if (!url) return false;
    if (url.startsWith('file://')) return true;
    if (/^https:\/\/(www\.)?renace\.tech(\/|$)/i.test(url)) return true;
    return false;
  } catch {
    return false;
  }
}

function requireTechOrTrusted(event) {
  if (store.getAppMode() === 'admin') return true;
  return senderIsTrusted(event);
}

function registerIpc() {
  ipcMain.handle('renace:keychain-available', () => store.canEncrypt());
  ipcMain.handle('renace:secret-set', (event, key, value) => {
    if (!requireTechOrTrusted(event)) return false;
    return store.setSecret(key, value);
  });
  ipcMain.handle('renace:secret-get', (event, key) => {
    if (!requireTechOrTrusted(event)) return '';
    return store.getSecret(key);
  });
  ipcMain.handle('renace:secret-clear', (event) => {
    if (!requireTechOrTrusted(event)) return false;
    store.clearSecrets();
    return true;
  });
  ipcMain.handle('renace:usage-record', (_e, url) => store.recordVisit(url));
  ipcMain.handle('renace:usage-top', (_e, limit) => store.topDestinations(limit));
  ipcMain.handle('renace:instance-get', () => store.getInstance());
  // Lectura OK desde Odoo; escritura solo setup/portal/técnico — no rebind desde XSS
  ipcMain.handle('renace:instance-set', (event, payload) => {
    if (!requireTechOrTrusted(event)) {
      return { ok: false, error: 'No autorizado' };
    }
    const prev = store.getInstance();
    const res = store.setInstance(payload || {});
    log.info('instance-set', {
      ok: res.ok,
      error: res.error || null,
      url: res.instance?.url || null,
      companyId: res.instance?.companyId || null,
      from: 'trusted',
    });
    // Si cambia el host de instancia, no tocar cookies de la anterior (sesión intacta)
    if (res.ok && prev?.url && res.instance?.url && !isSameOrigin(prev.url, res.instance.url)) {
      log.info('instance URL changed — previous Odoo session cookies left intact (no wipe)');
    }
    return res;
  });
  ipcMain.handle('renace:instance-clear', (event) => {
    if (store.getAppMode() !== 'admin' && !senderIsTrusted(event)) {
      return { ok: false, error: 'Requiere modo técnico' };
    }
    store.clearInstance();
    return { ok: true };
  });
  ipcMain.handle('renace:instance-open', async () => {
    await openHome(currentWin());
    return true;
  });
  ipcMain.handle('renace:instance-save-open', async (event, payload) => {
    if (!senderIsTrusted(event) && store.getAppMode() !== 'admin') {
      return { ok: false, error: 'No autorizado' };
    }
    const res = store.setInstance(payload || {});
    log.info('instance-save-open', {
      ok: res.ok,
      error: res.error || null,
      url: res.instance?.url || null,
      companyId: res.instance?.companyId || null,
    });
    if (!res.ok) return res;
    // Tras vincular PC → siempre modo usuario (admin solo sesión corta con PIN)
    store.setAppMode('user');
    clearAdminExpireTimer();
    buildMenu();
    BrowserWindow.getAllWindows().forEach((w) => {
      applyUserModeGuards(w);
      applyClosableState(w);
    });
    await openHome(currentWin());
    return { ...res, mode: store.getAppMode() };
  });
  ipcMain.handle('renace:open-portal', (event) => {
    if (!requireTechOrTrusted(event)) return false;
    currentWin()?.loadURL(PORTAL_URL);
    return true;
  });
  ipcMain.handle('renace:open-setup', async (event) => {
    if (store.getAppMode() !== 'admin' && !senderIsTrusted(event)) {
      const ok = await unlockAdmin();
      if (!ok) return false;
    }
    openSetup(currentWin());
    return true;
  });
  ipcMain.handle('renace:pos-status', () => ({
    platform: process.platform,
    windowsAgent: process.platform === 'win32',
    proxy: posProxy.getSettings(),
    brand: process.platform === 'win32' ? 'POS Agent PRO (bundled)' : 'RENACE POS',
  }));
  ipcMain.handle('renace:mode-get', () => store.getAppMode());
  ipcMain.handle('renace:mode-set', async (_e, mode) => {
    if (mode === 'admin') {
      const ok = await unlockAdmin();
      return ok ? store.getAppMode() : store.getAppMode();
    }
    revertToUserMode('ipc');
    log.info('app mode', 'user');
    return store.getAppMode();
  });
  ipcMain.handle('renace:keymap-get', () => store.getKeymap());
  ipcMain.handle('renace:keymap-set', (event, partial) => {
    if (store.getAppMode() !== 'admin' && !senderIsTrusted(event)) {
      return store.getKeymap();
    }
    const km = store.setKeymap(partial || {});
    BrowserWindow.getAllWindows().forEach((w) => injectUserShell(w.webContents));
    return km;
  });
  ipcMain.on('renace:open-devtools', (event) => {
    if (store.getAppMode() === 'user') return;
    const wc = event.sender;
    if (wc && !wc.isDestroyed()) wc.openDevTools({ mode: 'bottom' });
  });
  ipcMain.on('renace:win-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    if (isWorkInstanceLocked()) {
      try {
        if (!win.isMinimized()) win.minimize();
      } catch (_) {}
      if (store.getAppMode() !== 'admin') denyCloseMessage(win);
      return;
    }
    win.close();
  });
  ipcMain.on('renace:win-min', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });
  ipcMain.on('renace:win-max', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) toggleCoverTaskbar(win);
  });
}

function isPortalCookieDomain(domain) {
  const d = String(domain || '').replace(/^\./, '').toLowerCase();
  return d === 'renace.tech' || d.endsWith('.renace.tech');
}

async function clearRenaceCookies() {
  // Solo cookies del portal RENACE — NO borra session_id de la instancia Odoo del cliente
  const ses = portalSession();
  const cookies = await ses.cookies.get({});
  await Promise.all(
    cookies
      .filter((c) => isPortalCookieDomain(c.domain))
      .map((c) => {
        const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
        return ses.cookies.remove(`https://${domain}${c.path || '/'}`, c.name);
      })
  );
  log.info('portal cookies cleared (instance Odoo cookies preserved)');
}

async function setOdooSessionCookie(publicUrl, sessionId) {
  const base = String(publicUrl || '').replace(/\/$/, '');
  if (!base || !sessionId) return;
  if (!isAllowed(base)) {
    throw new Error('SSO publicUrl no permitido');
  }
  const ses = portalSession();
  const expirationDate = Math.floor(Date.now() / 1000) + 86400;
  await ses.cookies.set({
    url: base,
    name: 'session_id',
    value: String(sessionId),
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'no_restriction',
    expirationDate,
  });
  log.info('odoo session cookie set', { host: new URL(base).host, sidLen: String(sessionId).length });
}

async function completeSsoEnter(win, enterUrl) {
  log.info('sso enter start', enterUrl);
  try {
    if (!isAllowed(enterUrl)) {
      throw new Error('SSO enter URL no permitido');
    }
    const u = new URL(enterUrl);
    if (!isRenaceHost(u.hostname)) {
      throw new Error('SSO solo desde renace.tech');
    }
    u.searchParams.set('format', 'json');
    const res = await portalSession().fetch(u.toString(), {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json().catch(() => null);
    log.info('sso enter response', {
      status: res.status,
      ok: data?.ok,
      publicUrl: data?.publicUrl,
      redirectUrl: data?.redirectUrl,
      hasSession: Boolean(data?.sessionId),
      error: data?.error,
    });
    if (!res.ok || !data?.ok || !data.sessionId || !data.publicUrl) {
      throw new Error(data?.error || `SSO HTTP ${res.status}`);
    }
    const publicUrl = String(data.publicUrl).replace(/\/$/, '');
    const dest = String(data.redirectUrl || `${publicUrl}/web`);
    // Solo aceptar destino = instancia vinculada o host renace
    const inst = store.getInstance();
    const destOk =
      isAllowed(dest) &&
      isAllowed(publicUrl) &&
      (isSameOrigin(publicUrl, dest) || isRenaceHost(new URL(dest).hostname)) &&
      (!inst?.url || isSameOrigin(publicUrl, inst.url) || isRenaceHost(new URL(publicUrl).hostname));
    if (!destOk) {
      throw new Error('SSO destino fuera de instancia permitida');
    }
    await setOdooSessionCookie(publicUrl, data.sessionId);
    store.recordVisit(dest);
    log.info('sso loadURL', dest);
    await win.loadURL(dest);
    return true;
  } catch (e) {
    log.error('sso enter failed', e.message);
    return false;
  }
}

function injectPushStub(wc) {
  if (!PUSH_STUB || !wc || wc.isDestroyed()) return;
  wc.executeJavaScript(PUSH_STUB, true).catch(() => {});
}

function injectCompanyFocus(wc) {
  if (!wc || wc.isDestroyed()) return;
  const inst = store.getInstance();
  if (!inst) return;
  const cfg = JSON.stringify({
    url: inst.url,
    name: inst.name,
    companyId: inst.companyId,
    locked: inst.locked,
  });
  const boot = `window.__renaceCompanyCfg = ${cfg};`;
  const script = COMPANY_FOCUS ? `${boot}\n${COMPANY_FOCUS}` : boot;
  wc.executeJavaScript(script, true).catch((e) => log.warn('injectCompanyFocus', e.message));
}

function injectUserShell(wc) {
  if (!wc || wc.isDestroyed() || !USER_SHELL) return;
  const cfg = JSON.stringify({
    mode: store.getAppMode(),
    keymap: store.getKeymap(),
  });
  wc.executeJavaScript(`window.__renaceShellCfg = ${cfg};\n${USER_SHELL}`, true).catch((e) =>
    log.warn('injectUserShell', e.message)
  );
}

function applyUserModeGuards(win) {
  if (!win || win.isDestroyed()) return;
  if (process.platform === 'win32') {
    try {
      win.setAutoHideMenuBar(true);
      win.setMenuBarVisibility(false);
    } catch (_) {}
  }
  const wc = win.webContents;
  wc.removeAllListeners('before-input-event');
  wc.on('before-input-event', (event, input) => {
    if (store.getAppMode() !== 'user') return;
    if (input.type !== 'keyDown') return;
    const key = String(input.key || '');
    const blocked =
      (input.meta || input.control) &&
      ['r', 'R', 'l', 'L', '[', ']', 'ArrowLeft', 'ArrowRight'].includes(key);
    const blockedNav =
      (input.alt && (key === 'ArrowLeft' || key === 'ArrowRight')) ||
      key === 'F5' ||
      ((input.meta || input.control) && input.shift && (key === 'r' || key === 'R' || key === 'i' || key === 'I'));
    if (blocked || blockedNav) {
      event.preventDefault();
    }
  });
}

function injectDrag(wc) {
  if (!wc || wc.isDestroyed()) return;
  // En Windows usamos barra custom izquierda (win-frame); no hace falta drag extra a la derecha.
  if (process.platform === 'win32') return;
  const height = 28;
  const rightGap = 0;
  wc.executeJavaScript(
    `(() => {
      const height = ${height};
      const rightGap = ${rightGap};
      let s = document.getElementById('renace-drag-style');
      if (!s) {
        s = document.createElement('style');
        s.id = 'renace-drag-style';
        document.documentElement.appendChild(s);
      }
      s.textContent =
        '#renace-drag-region{position:fixed;top:0;left:0;right:' + rightGap + 'px;height:' + height + 'px;z-index:2147483645;-webkit-app-region:drag}' +
        'a,button,input,select,textarea,[role=button],.o_main_navbar,.o_menu_systray{-webkit-app-region:no-drag!important}';
      let el = document.getElementById('renace-drag-region');
      if (!el) {
        el = document.createElement('div');
        el.id = 'renace-drag-region';
        document.documentElement.appendChild(el);
      }
    })()`,
    true
  ).catch(() => {});
}

function injectWinFrame(wc) {
  if (process.platform !== 'win32' || !wc || wc.isDestroyed()) return;
  wc.executeJavaScript(winFrameScript(), true).catch((e) => log.warn('injectWinFrame', e.message));
}

function windowChromeOptions() {
  if (process.platform === 'win32') {
    return {
      frame: false,
      autoHideMenuBar: false,
      // Controles propios a la izquierda (win-frame) — no titleBarOverlay a la derecha
    };
  }
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 10 },
    };
  }
  return { autoHideMenuBar: true };
}

function coverTaskbar(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    if (!win.__renaceCovered) {
      win.__renacePrevBounds = win.getBounds();
    }
    win.setBounds(display.bounds);
    win.__renaceCovered = true;
  } catch (e) {
    log.warn('cover taskbar', e.message);
  }
}

function toggleCoverTaskbar(win) {
  if (!win || win.isDestroyed()) return;
  if (win.__renaceCovered) {
    try {
      if (win.__renacePrevBounds) win.setBounds(win.__renacePrevBounds);
      else win.unmaximize();
    } catch (_) {}
    win.__renaceCovered = false;
    return;
  }
  coverTaskbar(win);
}

function attachWindowChrome(win) {
  if (!win || win.isDestroyed()) return;
  if (process.platform === 'win32') {
    try {
      win.setAutoHideMenuBar(false);
      win.setMenuBarVisibility(true);
    } catch (_) {}
  }

  applyClosableState(win);

  win.on('close', (e) => {
    if (!isWorkInstanceLocked()) return;
    e.preventDefault();
    try {
      if (!win.isMinimized()) win.minimize();
    } catch (_) {}
    if (store.getAppMode() !== 'admin') {
      denyCloseMessage(win);
    }
  });
}

/** Banner de diagnóstico si Odoo/portal queda vacío */
function injectBlankDiagnostic(wc, meta) {
  if (!wc || wc.isDestroyed()) return;
  const payload = JSON.stringify(meta || {});
  wc.executeJavaScript(
    `(() => {
      const meta = ${payload};
      const existing = document.getElementById('renace-debug-banner');
      if (existing) existing.remove();
      const el = document.createElement('div');
      el.id = 'renace-debug-banner';
      el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:14px 16px;border-radius:12px;background:#111827;color:#e5e7eb;font:13px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);border:1px solid #374151;';
      el.innerHTML = '<div style="font-weight:700;margin-bottom:6px;color:#fbbf24">RENACE debug — pantalla vacía detectada</div>' +
        '<div><b>URL</b>: ' + (meta.url || '') + '</div>' +
        '<div><b>title</b>: ' + (meta.title || '') + '</div>' +
        '<div><b>bodyLen</b>: ' + (meta.bodyLen || 0) + '</div>' +
        '<div style="margin-top:8px;opacity:.8">Log: ' + (meta.logPath || '') + '</div>' +
        '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button id="renace-dbg-portal" style="padding:8px 12px;border-radius:8px;border:0;background:#0087ff;color:#fff;cursor:pointer">Volver al portal</button>' +
        '<button id="renace-dbg-reload" style="padding:8px 12px;border-radius:8px;border:0;background:#374151;color:#fff;cursor:pointer">Recargar</button>' +
        '<button id="renace-dbg-devtools" style="padding:8px 12px;border-radius:8px;border:0;background:#374151;color:#fff;cursor:pointer">DevTools</button>' +
        '</div>';
      document.documentElement.appendChild(el);
      document.getElementById('renace-dbg-portal')?.addEventListener('click', () => { location.href = 'https://renace.tech/portal'; });
      document.getElementById('renace-dbg-reload')?.addEventListener('click', () => location.reload());
      document.getElementById('renace-dbg-devtools')?.addEventListener('click', () => {
        window.renaceDesktop?.openDevTools?.();
      });
    })()`,
    true
  ).catch((e) => log.warn('injectBlankDiagnostic', e.message));
}

async function checkBlankPage(win) {
  if (!win || win.isDestroyed()) return;
  const wc = win.webContents;
  const current = wc.getURL();
  if (current.startsWith('file://') && current.includes('setup.html')) return;
  let info = { url: current, title: '', bodyLen: 0, hasOdoo: false };
  try {
    info = await wc.executeJavaScript(`({
      url: location.href,
      title: document.title || '',
      bodyLen: (document.body && document.body.innerText || '').trim().length,
      hasOdoo: !!document.querySelector('.o_web_client, .o_main_navbar, .o_home_menu, .oe_login_form, .o_login_form'),
      sample: (document.body && document.body.innerText || '').trim().slice(0, 120),
    })`);
  } catch (e) {
    log.warn('checkBlankPage eval failed', e.message);
    return;
  }
  log.info('page check', info);
  const looksBlank =
    info.bodyLen < 30 ||
    (/^odoo$/i.test(info.title) && !info.hasOdoo && info.bodyLen < 80);
  if (!looksBlank) return;
  log.warn('BLANK PAGE DETECTED', info);
  // Solo modo técnico ve diagnóstico / DevTools en pantalla
  if (store.getAppMode() !== 'admin') return;
  injectBlankDiagnostic(wc, { ...info, logPath: log.path() });
  try {
    wc.openDevTools({ mode: 'bottom' });
    log.info('DevTools opened');
  } catch (_) {}
}

function hardenSession(ses) {
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission !== 'notifications');
  });
  ses.webRequest.onCompleted({ urls: ['*://*.renace.tech/*', '*://renace.tech/*'] }, (details) => {
    if (details.resourceType === 'mainFrame') {
      log.info('mainFrame completed', { url: details.url, status: details.statusCode });
    }
  });
  ses.webRequest.onErrorOccurred({ urls: ['*://*.renace.tech/*', '*://renace.tech/*'] }, (details) => {
    if (details.resourceType === 'mainFrame' || details.resourceType === 'xhr' || details.resourceType === 'script') {
      log.warn('request error', {
        url: details.url,
        type: details.resourceType,
        error: details.error,
      });
    }
  });
}

function attachWindowGuards(win) {
  const wc = win.webContents;

  wc.setWindowOpenHandler(({ url }) => {
    log.info('window open', url);
    if (isAllowed(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  wc.on('will-navigate', async (event, url) => {
    log.info('will-navigate', url);
    if (!isAllowed(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    if (/\/api\/sso\/enter(\?|$)/i.test(url)) {
      event.preventDefault();
      const ok = await completeSsoEnter(win, url);
      if (!ok) {
        log.warn('sso enter failed — stay on current page (no fallback load)');
      }
    }
  });

  wc.on('will-redirect', async (event, url) => {
    log.info('will-redirect', url);
    if (/\/api\/sso\/enter(\?|$)/i.test(url)) {
      event.preventDefault();
      const ok = await completeSsoEnter(win, url);
      if (!ok) log.warn('sso redirect failed — no fallback');
    }
  });

  wc.on('did-navigate', (_e, url) => {
    log.info('did-navigate', url);
    store.recordVisit(url);
    win.setTitle(windowTitleFor(url));
  });
  wc.on('did-navigate-in-page', (_e, url) => log.info('did-navigate-in-page', url));
  wc.on('page-title-updated', (_e, title) => log.info('title', title));

  wc.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) log.warn('renderer console', { level, message: String(message).slice(0, 300), sourceId, line });
  });

  wc.on('dom-ready', () => {
    log.info('dom-ready', wc.getURL());
    injectWinFrame(wc);
    const u = wc.getURL();
    if (u.startsWith('file://')) return;
    injectPushStub(wc);
    injectCompanyFocus(wc);
    injectUserShell(wc);
    injectDrag(wc);
  });

  wc.on('did-finish-load', () => {
    log.info('did-finish-load', wc.getURL());
    injectWinFrame(wc);
    const u = wc.getURL();
    if (u.startsWith('file://')) return;
    injectPushStub(wc);
    injectCompanyFocus(wc);
    injectUserShell(wc);
    injectDrag(wc);
    setTimeout(() => checkBlankPage(win), 2000);
    setTimeout(() => checkBlankPage(win), 5000);
  });

  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    log.error('did-fail-load', { code, desc, url });
    // Usuarios: sin popups de error/log. Solo modo técnico.
    if (store.getAppMode() !== 'admin') return;
    dialog
      .showMessageBox(win, {
        type: 'error',
        title: 'Error de carga',
        message: 'No se pudo cargar la página.',
        detail: `${desc}\n${url}\n\nLog: ${log.path()}`,
        buttons: ['Reintentar portal', 'Abrir log', 'Cerrar'],
      })
      .then(({ response }) => {
        if (response === 0) openHome(win);
        if (response === 1) log.open();
      });
  });
}

async function promptOpenSetup() {
  if (store.getAppMode() === 'user') {
    const ok = await unlockAdmin();
    if (!ok) return;
  }
  const inst = store.getInstance();
  if (inst?.locked) {
    const { response } = await dialog.showMessageBox(currentWin() || undefined, {
      type: 'warning',
      title: 'Instancia bloqueada',
      message: `Este PC está vinculado a «${inst.name}».`,
      detail: `${inst.url}\n\n¿Cambiar la instancia de empresa de este equipo?`,
      buttons: ['Cancelar', 'Cambiar instancia'],
      defaultId: 0,
      cancelId: 0,
    });
    if (response !== 1) return;
  }
  openSetup(currentWin());
}

function promptTechPassword() {
  if (techPromptOpen) return Promise.resolve(null);
  techPromptOpen = true;
  return new Promise((resolve) => {
    const parent = currentWin();
    const box = new BrowserWindow({
      width: 400,
      height: 260,
      modal: Boolean(parent),
      parent: parent || undefined,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      show: false,
      backgroundColor: '#0a0f1a',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: PRELOAD,
      },
    });
    try {
      box.setMenuBarVisibility(false);
    } catch (_) {}

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      techPromptOpen = false;
      ipcMain.removeListener('renace:tech-password', onSubmit);
      ipcMain.removeListener('renace:tech-password-cancel', onCancel);
      try {
        if (!box.isDestroyed()) box.close();
      } catch (_) {}
      resolve(value);
    };
    const onSubmit = (_e, password) => finish(String(password || ''));
    const onCancel = () => finish(null);

    ipcMain.on('renace:tech-password', onSubmit);
    ipcMain.on('renace:tech-password-cancel', onCancel);
    box.on('closed', () => finish(null));
    box.loadFile(TECH_UNLOCK_HTML).catch((e) => {
      log.warn('tech unlock load', e.message);
      finish(null);
    });
    box.once('ready-to-show', () => {
      try {
        box.show();
        box.focus();
      } catch (_) {}
    });
  });
}

async function applyOpenAtLogin(enabled) {
  const on = !!enabled;
  store.setOpenAtLogin(on);
  try {
    app.setLoginItemSettings({
      openAtLogin: on,
      openAsHidden: false,
      path: process.execPath,
      args: [],
    });
  } catch (e) {
    log.warn('setLoginItemSettings', e.message);
  }
  if (process.platform === 'win32') {
    try {
      await ensurePosAgent({ openAtLogin: on });
    } catch (e) {
      log.warn('posagent autostart sync', e.message);
    }
  }
  log.info('openAtLogin', on);
  return on;
}

async function syncOpenAtLoginFromInstaller() {
  let pref = store.getOpenAtLogin();
  if (pref == null && process.platform === 'win32') {
    const fromReg = await readStartWithWindowsFlag();
    if (fromReg != null) pref = fromReg;
  }
  if (pref == null) pref = false;
  await applyOpenAtLogin(pref);
  return pref;
}

async function toggleOpenAtLogin() {
  const cur = app.getLoginItemSettings?.().openAtLogin ?? store.getOpenAtLogin() ?? false;
  const next = !cur;
  await applyOpenAtLogin(next);
  dialog.showMessageBox(currentWin() || undefined, {
    type: 'info',
    title: 'Inicio con Windows',
    message: next
      ? 'RENACE Portal se iniciará automáticamente con Windows.'
      : 'Inicio automático desactivado.',
    detail: next
      ? 'También se mantendrá POS Agent en el arranque (impresoras).'
      : 'Puedes volver a activarlo desde este menú.',
  });
  buildMenu();
  return next;
}

async function unlockAdmin() {
  const password = await promptTechPassword();
  if (password == null) return false;
  if (String(password) !== TECH_PIN) {
    dialog.showMessageBox(currentWin() || undefined, {
      type: 'error',
      title: 'Modo técnico',
      message: 'Contraseña incorrecta.',
      buttons: ['OK'],
    });
    return false;
  }
  store.setAppMode('admin');
  scheduleAdminExpiry();
  buildMenu();
  BrowserWindow.getAllWindows().forEach((w) => {
    applyUserModeGuards(w);
    applyClosableState(w);
    injectUserShell(w.webContents);
  });
  log.info('tech mode unlocked', { ttlMin: ADMIN_TTL_MS / 60000 });
  dialog
    .showMessageBox(currentWin() || undefined, {
      type: 'info',
      title: 'Modo técnico',
      message: 'Modo técnico activo.',
      detail: 'Por seguridad vuelve a modo usuario a los 20 minutos (o antes si eliges Modo Usuario).',
      buttons: ['OK'],
    })
    .catch(() => {});
  return true;
}

/** Configurar atajos tipo Eleventa (migraciones POS) */
async function promptKeymapConfig() {
  const km = store.getKeymap();
  const win = currentWin();
  const { response } = await dialog.showMessageBox(win || undefined, {
    type: 'question',
    title: 'Atajos POS (perfil Eleventa)',
    message: 'Perfil actual de teclado para el POS',
    detail:
      `Pagar / cobro: ${km.pay}\n` +
      `Cobrar e imprimir (pantalla pago): ${km.payPrint}\n` +
      `Cobrar sin imprimir: ${km.payNoPrint}\n` +
      `Cancelar / atrás: ${km.cancel}\n` +
      `Ventas / foco: ${km.sales}\n` +
      `Verificador precio: ${km.priceCheck}\n` +
      `Mayoreo: ${km.wholesale}\n\n` +
      'Restablecer deja el perfil Eleventa clásico (F12 / F1 / F2 / Esc).',
    buttons: ['Cerrar', 'Restablecer Eleventa', km.enabled ? 'Desactivar atajos' : 'Activar atajos'],
    defaultId: 0,
    cancelId: 0,
  });
  if (response === 1) {
    store.setKeymap(store.defaultKeymap());
  } else if (response === 2) {
    store.setKeymap({ enabled: !km.enabled });
  } else {
    return;
  }
  BrowserWindow.getAllWindows().forEach((w) => injectUserShell(w.webContents));
  const next = store.getKeymap();
  dialog.showMessageBox(win || undefined, {
    type: 'info',
    title: 'Atajos POS',
    message: next.enabled ? 'Atajos activos (perfil Eleventa).' : 'Atajos desactivados.',
    detail: `Pagar ${next.pay} · Imprimir ${next.payPrint} · Sin imprimir ${next.payNoPrint} · Cancelar ${next.cancel}`,
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const isUser = store.getAppMode() === 'user';

  if (isUser) {
    // Usuario: Archivo con actualizaciones (instalar pide PIN técnico) — sin salir/devtools
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        ...(isMac
          ? [{
              label: app.name,
              submenu: [
                { role: 'about' },
                { type: 'separator' },
                {
                  label: 'Buscar actualizaciones…',
                  click: () => runUpdateCheck(false),
                },
                {
                  label: 'Instalar actualización descargada…',
                  click: () => runInstallPendingUpdate(),
                },
                { type: 'separator' },
                {
                  label: 'Modo técnico…',
                  accelerator: 'CmdOrCtrl+Shift+Alt+T',
                  click: () => unlockAdmin(),
                },
              ],
            }]
          : []),
        {
          label: 'Archivo',
          submenu: [
            {
              label: 'Buscar actualizaciones…',
              click: () => runUpdateCheck(false),
            },
            {
              label: 'Instalar actualización descargada…',
              click: () => runInstallPendingUpdate(),
            },
            { type: 'separator' },
            {
              label: 'Modo técnico…',
              accelerator: 'CmdOrCtrl+Shift+Alt+T',
              click: () => unlockAdmin(),
            },
          ],
        },
        { label: 'Editar', submenu: [{ role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      ])
    );
    return;
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac
        ? [{
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Ir a la instancia',
                accelerator: 'CmdOrCtrl+Shift+H',
                click: () => openHome(currentWin()),
              },
              {
                label: 'Configurar instancia de empresa…',
                accelerator: 'CmdOrCtrl+,',
                click: () => promptOpenSetup(),
              },
              {
                label: 'Modo Usuario',
                click: () => revertToUserMode('menu'),
              },
              {
                label: 'Limpiar cookies del portal RENACE',
                click: async () => {
                  await clearRenaceCookies();
                  // No openHome: no interrumpir sesión Odoo de la instancia
                },
              },
              { type: 'separator' },
              {
                label: 'Buscar actualizaciones…',
                click: () => runUpdateCheck(false),
              },
              {
                label: 'Instalar actualización descargada…',
                click: () => runInstallPendingUpdate(),
              },
              { type: 'separator' },
              {
                label: 'Salir…',
                accelerator: 'CmdOrCtrl+Q',
                click: () => requestQuitFromTech(),
              },
            ],
          }]
        : []),
      {
        label: 'Archivo',
        submenu: [
          { label: 'Instancia / Odoo', accelerator: 'CmdOrCtrl+1', click: () => openHome(currentWin()) },
          {
            label: 'Configurar instancia de empresa…',
            accelerator: isMac ? undefined : 'CmdOrCtrl+,',
            click: () => promptOpenSetup(),
          },
          {
            label: 'Actualizar interfaz',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => refreshUiSafe(currentWin()),
          },
          {
            label: 'Modo Usuario',
            click: () => revertToUserMode('menu'),
          },
          {
            label: (() => {
              const on = store.getOpenAtLogin() ?? app.getLoginItemSettings?.().openAtLogin;
              return on ? 'Inicio con Windows: activado' : 'Iniciar con Windows…';
            })(),
            click: () => toggleOpenAtLogin(),
          },
          { label: 'Portal RENACE', click: () => currentWin()?.loadURL(PORTAL_URL) },
          { label: 'Sitio RENACE.TECH', click: () => currentWin()?.loadURL(HOME_URL) },
          { type: 'separator' },
          {
            label: 'Buscar actualizaciones…',
            click: () => runUpdateCheck(false),
          },
          {
            label: 'Instalar actualización descargada…',
            click: () => runInstallPendingUpdate(),
          },
          { type: 'separator' },
          {
            label: 'Abrir en el navegador',
            click: () => {
              const u = currentWin()?.webContents.getURL();
              if (u) shell.openExternal(u);
            },
          },
          {
            label: 'Copiar URL',
            click: () => {
              const u = currentWin()?.webContents.getURL();
              if (u) clipboard.writeText(u);
            },
          },
          ...(!isMac
            ? [
                { type: 'separator' },
                {
                  label: 'Salir…',
                  accelerator: 'Alt+F4',
                  click: () => requestQuitFromTech(),
                },
              ]
            : []),
        ],
      },
      { label: 'Editar', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      {
        label: 'Ver',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          {
            label: 'Abrir archivo de log',
            accelerator: 'CmdOrCtrl+Shift+L',
            click: () => log.open(),
          },
          {
            label: 'Estado RENACE POS',
            click: async () => {
              const st = posProxy.getSettings();
              const km = store.getKeymap();
              const printers = process.platform === 'darwin' || process.platform === 'linux'
                ? await posProxy.listCupsPrinters()
                : [];
              dialog.showMessageBox(currentWin() || undefined, {
                type: 'info',
                title: 'RENACE POS',
                message: process.platform === 'win32'
                  ? 'En Windows se usa POS Agent PRO (incluido en el instalador).'
                  : 'Proxy local RENACE POS (compatible IoT / hw_proxy).',
                detail: `Puerto: ${st.port}\nImpresora: ${st.printer || 'predeterminada'}\nActivo: ${st.enabled ? 'sí' : 'no'}\nAtajos Eleventa: pagar ${km.pay}, cobrar+imprimir ${km.payPrint}, sin imprimir ${km.payNoPrint}, cancelar ${km.cancel}\n${printers.length ? `CUPS: ${printers.join(', ')}` : ''}`,
              });
            },
          },
          {
            label: 'Atajos teclado POS (Eleventa)…',
            click: () => promptKeymapConfig(),
          },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      { label: 'Ventana', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }] },
      {
        label: 'Ayuda',
        submenu: [
          {
            label: 'Soporte RENACE',
            click: () => shell.openExternal('https://wa.me/8494577463'),
          },
        ],
      },
    ])
  );
}

function createWindow() {
  log.info('createWindow');
  const primary = screen.getPrimaryDisplay();
  const startBounds =
    process.platform === 'win32'
      ? primary.bounds
      : { width: 1280, height: 860 };
  const win = new BrowserWindow({
    ...(process.platform === 'win32'
      ? { x: startBounds.x, y: startBounds.y, width: startBounds.width, height: startBounds.height }
      : { width: 1280, height: 860 }),
    minWidth: 960,
    minHeight: 640,
    show: true,
    backgroundColor: '#0a0f1a',
    title: 'RENACE Portal',
    ...windowChromeOptions(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: PARTITION,
      preload: PRELOAD,
      backgroundThrottling: false,
    },
  });

  attachWindowChrome(win);
  attachWindowGuards(win);
  applyUserModeGuards(win);
  if (process.platform === 'win32') {
    // Pantalla completa al inicio (incluye barra de tareas)
    coverTaskbar(win);
    win.once('ready-to-show', () => coverTaskbar(win));
    win.on('show', () => {
      if (!win.__renaceCovered) coverTaskbar(win);
    });
  }
  win.focus();

  const inst = store.getInstance();
  if (!inst) {
    log.info('no instance — setup');
    openSetup(win);
  } else {
    openHome(win);
  }

  return win;
}

app.whenReady().then(async () => {
  log.info('app ready', { version: app.getVersion(), log: log.path(), platform: process.platform });

  // Siempre arrancar en modo usuario (técnico solo con clave, máx. 20 min)
  store.setAppMode('user');
  clearAdminExpireTimer();
  updater.loadPendingFromDisk();

  if (process.platform === 'win32') {
    try {
      await syncOpenAtLoginFromInstaller();
      const pos = await ensurePosAgent({ openAtLogin: store.getOpenAtLogin() !== false });
      log.info('posagent ensure', pos);
    } catch (e) {
      log.warn('posagent ensure failed', e.message);
    }
  } else {
    // Mac / Linux: proxy propio con identidad RENACE (POS Agent PRO no tiene build Mac)
    try {
      const posCfg = store.getPosSettings();
      const printers = await posProxy.listCupsPrinters();
      if (!posCfg.printer && printers.length) {
        store.setPosSettings({ printer: printers[0] });
        posCfg.printer = printers[0];
      }
      const started = await posProxy.start(posCfg);
      log.info('renace pos proxy', started);
    } catch (e) {
      log.warn('pos proxy failed', e.message);
    }
  }

  const ses = portalSession();
  hardenSession(ses);
  // No borrar caché al arrancar: preserva sesión Odoo / recursos del usuario
  app.on('web-contents-created', (_e, wc) => {
    wc.on('dom-ready', () => {
      injectWinFrame(wc);
      const u = wc.getURL();
      if (u.startsWith('file://')) return;
      injectPushStub(wc);
      injectCompanyFocus(wc);
    });
  });
  registerIpc();
  buildMenu();
  createWindow();
  updater.startAutoUpdateLoop(updaterOpts());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', (e) => {
  if (isWorkInstanceLocked()) {
    e.preventDefault();
    denyCloseMessage(currentWin());
    return;
  }
  // Salida autorizada: si hay update descargada, instalarla al cerrar
  const pending = updater.getPendingUpdate();
  if (pending && process.platform === 'win32') {
    e.preventDefault();
    if (!updater.installDeferredIfAny(updaterOpts())) {
      // Sin instalador usable — salir igual
      allowQuit = true;
      setTimeout(() => app.exit(0), 100);
    }
    return;
  }
  posProxy.stop().catch(() => {});
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  if (isWorkInstanceLocked()) {
    // No salir: recrear ventana si alguien logró cerrarla
    setTimeout(() => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    }, 200);
    return;
  }
  app.quit();
});
