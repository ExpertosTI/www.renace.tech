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
} = require('electron');
const store = require('./secure-store.cjs');
const log = require('./log.cjs');
const { ensurePosAgent } = require('./posagent-win.cjs');
const posProxy = require('./pos-proxy.cjs');
const updater = require('./updater.cjs');

app.commandLine.appendSwitch('disable-features', 'PushMessaging,Notifications');

const PORTAL_URL = process.env.RENACE_PORTAL_URL || 'https://renace.tech/portal';
const HOME_URL = process.env.RENACE_HOME_URL || 'https://renace.tech';
const PARTITION = 'persist:renace-portal';
const PRELOAD = path.join(__dirname, 'preload.cjs');
const SETUP_HTML = path.join(__dirname, 'setup.html');

/** Solo modo técnico (o actualización forzada) puede cerrar la app */
let allowQuit = false;

function requestQuitForUpdate() {
  allowQuit = true;
}

function isUserModeLocked() {
  if (allowQuit) return false;
  if (store.getAppMode() !== 'user') return false;
  // Solo con el sistema ya vinculado (instancia abierta)
  return !!store.getInstance();
}

function denyCloseMessage(win) {
  dialog
    .showMessageBox(win || undefined, {
      type: 'warning',
      title: 'Cierre bloqueado',
      message: 'En modo Usuario no se puede cerrar RENACE Portal.',
      detail:
        'Solo un técnico puede cerrar la app.\nAtajo: Ctrl+Shift+Alt+T (o Cmd+Shift+Alt+T) → Modo técnico.',
      buttons: ['Entendido', 'Modo técnico…'],
      defaultId: 0,
      cancelId: 0,
    })
    .then(({ response }) => {
      if (response === 1) unlockAdmin();
    });
}

function updaterOpts() {
  return {
    getWin: () => currentWin(),
    requestQuit: requestQuitForUpdate,
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
    log.info('cids cookie set', { host: new URL(inst.url).host, companyId: inst.companyId });
  } catch (e) {
    log.warn('cids cookie failed', e.message);
  }
}

function openSetup(win) {
  const w = win || currentWin();
  if (!w) return;
  w.loadFile(SETUP_HTML).catch((e) => log.error('setup load', e.message));
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
  const start = store.getStartUrl(PORTAL_URL);
  log.info('openHome', { start, instance: inst.url, companyId: inst.companyId || null });
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

function registerIpc() {
  ipcMain.handle('renace:keychain-available', () => store.canEncrypt());
  ipcMain.handle('renace:secret-set', (_e, key, value) => store.setSecret(key, value));
  ipcMain.handle('renace:secret-get', (_e, key) => store.getSecret(key));
  ipcMain.handle('renace:secret-clear', () => {
    store.clearSecrets();
    return true;
  });
  ipcMain.handle('renace:usage-record', (_e, url) => store.recordVisit(url));
  ipcMain.handle('renace:usage-top', (_e, limit) => store.topDestinations(limit));
  ipcMain.handle('renace:instance-get', () => store.getInstance());
  ipcMain.handle('renace:instance-set', (_e, payload) => {
    const res = store.setInstance(payload || {});
    log.info('instance-set', {
      ok: res.ok,
      error: res.error || null,
      url: res.instance?.url || null,
      companyId: res.instance?.companyId || null,
    });
    return res;
  });
  ipcMain.handle('renace:instance-clear', () => store.clearInstance());
  ipcMain.handle('renace:instance-open', async () => {
    await openHome(currentWin());
    return true;
  });
  ipcMain.handle('renace:instance-save-open', async (_e, payload) => {
    const res = store.setInstance(payload || {});
    log.info('instance-save-open', {
      ok: res.ok,
      error: res.error || null,
      url: res.instance?.url || null,
      companyId: res.instance?.companyId || null,
    });
    if (!res.ok) return res;
    // Tras vincular PC del cliente → modo Usuario por defecto
    if (payload?.mode === 'admin') store.setAppMode('admin');
    else store.setAppMode('user');
    buildMenu();
    BrowserWindow.getAllWindows().forEach((w) => applyUserModeGuards(w));
    await openHome(currentWin());
    return { ...res, mode: store.getAppMode() };
  });
  ipcMain.handle('renace:open-portal', () => {
    currentWin()?.loadURL(PORTAL_URL);
    return true;
  });
  ipcMain.handle('renace:open-setup', () => {
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
  ipcMain.handle('renace:mode-set', (_e, mode) => {
    const m = store.setAppMode(mode);
    buildMenu();
    BrowserWindow.getAllWindows().forEach((w) => {
      applyUserModeGuards(w);
      injectUserShell(w.webContents);
    });
    log.info('app mode', m);
    return m;
  });
  ipcMain.handle('renace:keymap-get', () => store.getKeymap());
  ipcMain.handle('renace:keymap-set', (_e, partial) => {
    const km = store.setKeymap(partial || {});
    BrowserWindow.getAllWindows().forEach((w) => injectUserShell(w.webContents));
    return km;
  });
  ipcMain.on('renace:open-devtools', (event) => {
    if (store.getAppMode() === 'user') return;
    const wc = event.sender;
    if (wc && !wc.isDestroyed()) wc.openDevTools({ mode: 'bottom' });
  });
}

async function clearRenaceCookies() {
  const ses = portalSession();
  const cookies = await ses.cookies.get({});
  await Promise.all(
    cookies
      .filter((c) => String(c.domain || '').includes('renace.tech'))
      .map((c) => {
        const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
        return ses.cookies.remove(`https://${domain}${c.path || '/'}`, c.name);
      })
  );
  log.info('cookies cleared');
}

async function setOdooSessionCookie(publicUrl, sessionId) {
  const base = String(publicUrl || '').replace(/\/$/, '');
  if (!base || !sessionId) return;
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
    const u = new URL(enterUrl);
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
    await setOdooSessionCookie(data.publicUrl, data.sessionId);
    const dest = data.redirectUrl || `${String(data.publicUrl).replace(/\/$/, '')}/web`;
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
  const isWin = process.platform === 'win32';
  // Windows: barra fina bajo titleBarOverlay (32px) y hueco a la derecha para min/max/cerrar.
  // Mac: zona de arrastre junto a traffic lights.
  const height = isWin ? 32 : 28;
  const rightGap = isWin ? 140 : 0;
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

function windowChromeOptions() {
  if (process.platform === 'win32') {
    return {
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#0a0f1a',
        symbolColor: '#e8edf5',
        height: 32,
      },
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

function attachWindowChrome(win) {
  if (!win || win.isDestroyed()) return;
  if (process.platform === 'win32') {
    try {
      win.setAutoHideMenuBar(true);
      win.setMenuBarVisibility(false);
    } catch (_) {}
    win.on('maximize', () => {
      try {
        if (win.isFullScreen()) win.setFullScreen(false);
      } catch (_) {}
    });
  }

  win.on('close', (e) => {
    if (!isUserModeLocked()) return;
    e.preventDefault();
    denyCloseMessage(win);
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
  if (looksBlank) {
    log.warn('BLANK PAGE DETECTED', info);
    injectBlankDiagnostic(wc, { ...info, logPath: log.path() });
    try {
      wc.openDevTools({ mode: 'bottom' });
      log.info('DevTools opened');
    } catch (_) {}
  }
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
        log.warn('sso fallback loadURL', url);
        win.loadURL(url);
      }
    }
  });

  wc.on('will-redirect', async (event, url) => {
    log.info('will-redirect', url);
    if (/\/api\/sso\/enter(\?|$)/i.test(url)) {
      event.preventDefault();
      const ok = await completeSsoEnter(win, url);
      if (!ok) win.loadURL(url);
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
    const u = wc.getURL();
    if (u.startsWith('file://')) return;
    injectPushStub(wc);
    injectCompanyFocus(wc);
    injectUserShell(wc);
    injectDrag(wc);
  });

  wc.on('did-finish-load', () => {
    log.info('did-finish-load', wc.getURL());
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

async function unlockAdmin() {
  const { response, checkboxChecked } = await dialog.showMessageBox(currentWin() || undefined, {
    type: 'question',
    title: 'Modo técnico',
    message: '¿Activar modo técnico (admin)?',
    detail: 'Permite configurar instancia, actualizar y herramientas. Los cajeros deben usar modo Usuario.',
    buttons: ['Cancelar', 'Activar técnico'],
    defaultId: 0,
    cancelId: 0,
    checkboxLabel: 'Recordar en este PC',
    checkboxChecked: false,
  });
  if (response !== 1) return false;
  store.setAppMode('admin');
  buildMenu();
  BrowserWindow.getAllWindows().forEach((w) => {
    applyUserModeGuards(w);
    injectUserShell(w.webContents);
  });
  if (!checkboxChecked) {
    // one-shot session: still saved; user can switch back from menu
  }
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
    // Menú mínimo: sin atrás/recargar/devtools/portal/cerrar
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        ...(isMac
          ? [{
              label: app.name,
              submenu: [
                { role: 'about' },
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
                click: () => {
                  store.setAppMode('user');
                  buildMenu();
                  BrowserWindow.getAllWindows().forEach((w) => {
                    applyUserModeGuards(w);
                    injectUserShell(w.webContents);
                  });
                },
              },
              {
                label: 'Cerrar sesión / limpiar cookies',
                click: async () => {
                  await clearRenaceCookies();
                  openHome(currentWin());
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
              { role: 'quit' },
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
            click: () => {
              store.setAppMode('user');
              buildMenu();
              BrowserWindow.getAllWindows().forEach((w) => {
                applyUserModeGuards(w);
                injectUserShell(w.webContents);
              });
            },
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
          ...(!isMac ? [{ type: 'separator' }, { role: 'quit' }] : []),
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
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
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

  if (process.platform === 'win32') {
    try {
      const pos = await ensurePosAgent();
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
  try {
    await ses.clearCache();
    log.info('cache cleared');
  } catch (e) {
    log.warn('clearCache', e.message);
  }
  app.on('web-contents-created', (_e, wc) => {
    wc.on('dom-ready', () => {
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
  if (isUserModeLocked()) {
    e.preventDefault();
    denyCloseMessage(currentWin());
    return;
  }
  posProxy.stop().catch(() => {});
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  if (isUserModeLocked()) return;
  app.quit();
});
