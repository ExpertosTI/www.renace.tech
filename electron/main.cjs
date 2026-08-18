'use strict';

/**
 * RENACE Portal — Electron shell
 * Portal + SSO Odoo. Logs silenciosos → servidor. Notificaciones nativas en PC.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
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
  Notification,
  globalShortcut,
  nativeImage,
} = require('electron');
const store = require('./secure-store.cjs');
const staffLocal = require('./staff-local.cjs');
const log = require('./log.cjs');
const {
  ensurePosAgent,
  readStartWithWindowsFlag,
  setPortalOpenAtLogin,
  clearDuplicatePortalAutostart,
} = require('./posagent-win.cjs');
const posProxy = require('./pos-proxy.cjs');
const updater = require('./updater.cjs');
const winFrameScript = require('./win-frame.js');
const { techToolbarScript, techToolbarRemoveScript } = require('./tech-toolbar.js');

// Una sola instancia: segundo arranque (autostart duplicado, doble clic) enfoca la existente.
// app.exit(0) fuerza salida inmediata — app.quit() a veces deja el proceso vivo un momento.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.exit(0);
} else {
  app.on('second-instance', (_event, _argv, _cwd) => {
    try {
      focusExistingPortalWindow();
    } catch (_) {}
  });
}

// FCM web push en Chromium es problemático; las notificaciones las gestiona Portal (OS + Odoo bus)
app.commandLine.appendSwitch('disable-features', 'PushMessaging');

const PORTAL_URL = process.env.RENACE_PORTAL_URL || 'https://renace.tech/portal';
const HOME_URL = process.env.RENACE_HOME_URL || 'https://renace.tech';
const PARTITION = 'persist:renace-portal';
const PRELOAD = path.join(__dirname, 'preload.cjs');
const SETUP_HTML = path.join(__dirname, 'setup.html');
const STAFF_LOGIN_HTML = path.join(__dirname, 'staff-login.html');
const TECH_UNLOCK_HTML = path.join(__dirname, 'tech-unlock.html');
const APP_ICON_PNG = path.join(__dirname, 'brand', 'icon-512.png');
const TECH_PIN = String(process.env.RENACE_TECH_PIN || '101284');
/** Modo técnico caduca solo; siempre se arranca en usuario */
const ADMIN_TTL_MS = 20 * 60 * 1000;
const ZOOM_STEP = 0.1;
/** En POS no permitir zoom “alejado” (UI chica / botón pagar difícil). */
const POS_ZOOM_FLOOR = 1.0;
/** Monitores anchos: piso ligeramente por encima de 100%. */
const POS_ZOOM_FLOOR_LARGE = 1.1;

function resolveAppIcon() {
  try {
    if (fs.existsSync(APP_ICON_PNG)) {
      const img = nativeImage.createFromPath(APP_ICON_PNG);
      if (!img.isEmpty()) return img;
    }
  } catch (_) {}
  return undefined;
}

/** Piso de zoom en POS: 100% normal, 110% en pantallas ≥1920px de ancho útil. */
function posZoomFloor(wc) {
  try {
    const win = wc && !wc.isDestroyed() ? BrowserWindow.fromWebContents(wc) : BrowserWindow.getFocusedWindow();
    const bounds = win && !win.isDestroyed() ? win.getBounds() : null;
    const display = bounds
      ? screen.getDisplayMatching(bounds)
      : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const w = display?.workAreaSize?.width || display?.size?.width || 0;
    if (w >= 1920) return POS_ZOOM_FLOOR_LARGE;
  } catch (_) {}
  return POS_ZOOM_FLOOR;
}

function isPosContext(wc) {
  if (!wc || wc.isDestroyed()) return false;
  try {
    if (isPosLikeUrl(wc.getURL())) return true;
  } catch (_) {}
  return !!wc.__renacePosUi;
}

function resolveZoomForWc(wc, factor) {
  let z = store.clampZoomFactor(factor != null ? factor : store.getZoomFactor());
  if (isPosContext(wc)) {
    z = Math.max(z, posZoomFloor(wc));
  }
  return z;
}

function applyZoomFactor(wc, factor) {
  if (!wc || wc.isDestroyed()) return;
  const z = resolveZoomForWc(wc, factor);
  try {
    wc.setZoomFactor(z);
  } catch (_) {}
}

function applyZoomToAll(factor) {
  BrowserWindow.getAllWindows().forEach((w) => {
    try {
      applyZoomFactor(w.webContents, factor);
    } catch (_) {}
  });
  return store.clampZoomFactor(factor != null ? factor : store.getZoomFactor());
}

function setAppZoom(factor) {
  const z = store.setZoomFactor(factor);
  applyZoomToAll(z);
  return z;
}

function adjustAppZoom(delta) {
  const win = BrowserWindow.getFocusedWindow();
  const wc = win && !win.isDestroyed() ? win.webContents : null;
  if (wc && isPosContext(wc)) {
    const floor = posZoomFloor(wc);
    const effective = Math.max(store.getZoomFactor(), floor);
    const next = store.clampZoomFactor(effective + delta);
    return setAppZoom(Math.max(next, floor));
  }
  return setAppZoom(store.getZoomFactor() + delta);
}

/**
 * Al entrar al POS: si el zoom guardado quedó muy lejos (p.ej. 80%),
 * sube al piso POS (y persiste) para que Pagar sea usable en pantallas grandes.
 */
function ensurePosZoom(wc) {
  const target = wc && !wc.isDestroyed() ? wc : BrowserWindow.getFocusedWindow()?.webContents;
  if (target && !target.isDestroyed()) {
    target.__renacePosUi = true;
  }
  const floor = posZoomFloor(target);
  const current = store.getZoomFactor();
  if (current < floor) {
    return setAppZoom(floor);
  }
  if (target) applyZoomFactor(target);
  else applyZoomToAll();
  return Math.max(current, floor);
}

/** Entradas de menú Ver / zoom (usuario y técnico). Persistidas en secure-store. */
function zoomMenuTemplate() {
  const pct = Math.round(store.getZoomFactor() * 100);
  return [
    {
      label: `Zoom + (${pct}%)`,
      accelerator: 'CmdOrCtrl+=',
      click: () => adjustAppZoom(ZOOM_STEP),
    },
    {
      label: 'Zoom +',
      accelerator: 'CmdOrCtrl+Plus',
      visible: false,
      acceleratorWorksWhenHidden: true,
      click: () => adjustAppZoom(ZOOM_STEP),
    },
    {
      label: 'Zoom −',
      accelerator: 'CmdOrCtrl+-',
      click: () => adjustAppZoom(-ZOOM_STEP),
    },
    {
      label: 'Zoom 100%',
      accelerator: 'CmdOrCtrl+0',
      click: () => setAppZoom(1),
    },
    { type: 'separator' },
    { label: 'Zoom 90%', click: () => setAppZoom(0.9) },
    { label: 'Zoom 110%', click: () => setAppZoom(1.1) },
    { label: 'Zoom 125%', click: () => setAppZoom(1.25) },
  ];
}

/** Solo se puede salir con allowQuit (técnico confirmó / update) */
let allowQuit = false;
let techPromptOpen = false;
let techUnlockInFlight = false;
let adminExpireTimer = null;
/** Atajo modo técnico — menú oculto / frameless en Windows no dispara accelerators */
const TECH_UNLOCK_ACCELERATOR = 'CommandOrControl+Shift+Alt+T';

function isTechUnlockChord(input) {
  if (!input || input.type !== 'keyDown' || input.isAutoRepeat) return false;
  const key = String(input.key || '');
  const code = String(input.code || '');
  const isT = key === 't' || key === 'T' || code === 'KeyT';
  if (!isT) return false;
  const mod = !!(input.control || input.meta);
  return mod && !!input.shift && !!input.alt;
}

function requestTechUnlockFromShortcut() {
  if (store.getAppMode() === 'admin') return;
  unlockAdmin().catch((e) => log.warn('unlockAdmin shortcut', e && e.message));
}

function registerTechUnlockGlobalShortcut() {
  try {
    globalShortcut.unregister(TECH_UNLOCK_ACCELERATOR);
  } catch (_) {}
  try {
    const ok = globalShortcut.register(TECH_UNLOCK_ACCELERATOR, () => {
      requestTechUnlockFromShortcut();
    });
    if (!ok) log.warn('tech unlock globalShortcut register failed');
  } catch (e) {
    log.warn('tech unlock globalShortcut', e.message);
  }
}

function unregisterTechUnlockGlobalShortcut() {
  try {
    globalShortcut.unregister(TECH_UNLOCK_ACCELERATOR);
  } catch (_) {}
}

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
  // Windows frameless: hay que recrear sin frame nativo y ocultar menú
  syncWindowsChromeForMode();
  BrowserWindow.getAllWindows().forEach((w) => {
    if (w.getParentWindow()) return;
    refreshTechChrome(w);
  });
  log.info('tech mode locked', reason || 'manual');
  if (reason === 'ttl') {
    const win = currentWin();
    dialog
      .showMessageBox(win || undefined, {
        type: 'info',
        title: 'Modo técnico',
        message: 'Sesión técnica finalizada (20 min).',
        detail: 'Volviste a modo usuario. Para técnico otra vez: Ctrl+Shift+Alt+T (clave).',
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
    canInstall: () => true,
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
let PUSH_BRIDGE = '';
let COMPANY_FOCUS = '';
let USER_SHELL = '';
try {
  PUSH_BRIDGE = fs.readFileSync(path.join(__dirname, 'push-bridge.js'), 'utf8');
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

function openStaffLogin(win) {
  const w = win || currentWin();
  if (!w) return;
  w.loadFile(STAFF_LOGIN_HTML).catch((e) => log.error('staff-login load', e.message));
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

function extractOdooCsrf(html) {
  const raw = String(html || '');
  const m =
    raw.match(/name=["']csrf_token["']\s+value=["']([^"']+)["']/i) ||
    raw.match(/value=["']([^"']+)["']\s+name=["']csrf_token["']/i) ||
    raw.match(/csrf_token["']?\s*:\s*["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/**
 * Login Odoo en esta partición (cookies del partition). No publica secretos.
 * No borra cookies previas de otras instancias.
 */
async function odooLocalWebLogin(publicBase, login, password) {
  const base = String(publicBase || '').replace(/\/$/, '');
  if (!base || !login || !password) throw new Error('Faltan datos de acceso');
  if (!isAllowed(base)) throw new Error('Instancia no permitida');
  const ses = portalSession();
  const loginUrl = `${base}/web/login`;

  const getRes = await ses.fetch(loginUrl, {
    method: 'GET',
    headers: { Accept: 'text/html', 'User-Agent': 'RENACE-Portal-Desktop' },
  });
  const html = await getRes.text();
  const csrf = extractOdooCsrf(html);

  if (csrf) {
    const params = new URLSearchParams();
    params.set('csrf_token', csrf);
    params.set('login', login);
    params.set('password', password);
    params.set('redirect', '/web');
    const postRes = await ses.fetch(loginUrl, {
      method: 'POST',
      headers: {
        Accept: 'text/html',
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: base,
        Referer: loginUrl,
        'User-Agent': 'RENACE-Portal-Desktop',
      },
      body: params.toString(),
      redirect: 'follow',
    });
    const finalUrl = String(postRes.url || '');
    const body = await postRes.text().catch(() => '');
    const onLogin =
      /\/web\/login/i.test(finalUrl) || /name=["']password["']/i.test(body || '');
    if (!onLogin && (postRes.ok || postRes.status === 303 || postRes.status === 302)) {
      return { ok: true, via: 'web' };
    }
  }

  // Fallback JSON-RPC (misma partición → Set-Cookie en session)
  const authBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params: { db: false, login, password },
  });
  const authRes = await ses.fetch(`${base}/web/session/authenticate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: base,
      'User-Agent': 'RENACE-Portal-Desktop',
    },
    body: authBody,
  });
  const authJson = await authRes.json().catch(() => null);
  const uid = authJson?.result?.uid;
  if (uid) return { ok: true, via: 'jsonrpc' };

  // Segundo intento con db genérico (instancias single-db)
  const authBody2 = JSON.stringify({
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params: { db: 'odoo', login, password },
  });
  const authRes2 = await ses.fetch(`${base}/web/session/authenticate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: base,
      'User-Agent': 'RENACE-Portal-Desktop',
    },
    body: authBody2,
  });
  const authJson2 = await authRes2.json().catch(() => null);
  if (authJson2?.result?.uid) return { ok: true, via: 'jsonrpc-db' };

  throw new Error('Credenciales Odoo rechazadas');
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
  const hasStaff = staffLocal.hasProfiles();
  const activeStaffId = store.getActiveStaffId?.() || null;
  const cookieSession = await hasOdooSessionCookie(inst);
  // Solo restaurar sesión si fue abierta vía personal local (PIN → Odoo).
  // Cookie suelta (setup/técnico/sesión caduca mal) → puerta PIN + usuario fijo.
  const loggedIn = cookieSession && (!hasStaff || Boolean(activeStaffId));
  if (hasStaff && cookieSession && !activeStaffId) {
    log.info('openHome: cookie Odoo sin personal activo → puerta PIN', {
      instance: inst.url,
      profiles: staffLocal.publicList().length,
      defaultStaffId: store.getDefaultStaffId?.() || null,
    });
    await clearInstanceSessionCookie();
  }
  // Preferir última URL de la misma instancia (no romper pantalla/formulario al reabrir)
  const last = store.getLastInstanceUrl?.() || null;
  if (loggedIn) {
    let start;
    if (last && isSameOrigin(last, inst.url) && /\/(web|odoo|pos)/i.test(last)) {
      start = last;
    } else {
      start = `${inst.url}/web`;
    }
    log.info('openHome', {
      start,
      instance: inst.url,
      companyId: inst.companyId || null,
      sessionRestored: true,
      activeStaffId: activeStaffId || null,
    });
    w.setTitle(`${inst.name} — RENACE`);
    w.loadURL(start).catch((e) => {
      log.error('openHome failed', e.message);
      openSetup(w);
    });
    return;
  }

  // Sin sesión de personal: puerta PIN (no exponer login Odoo al mesero)
  if (hasStaff) {
    log.info('openHome: staff gate', {
      instance: inst.url,
      profiles: staffLocal.publicList().length,
      defaultStaffId: store.getDefaultStaffId?.() || null,
    });
    w.setTitle(`${inst.name} — Acceso`);
    openStaffLogin(w);
    return;
  }

  const start = store.getStartUrl(PORTAL_URL);
  log.info('openHome', {
    start,
    instance: inst.url,
    companyId: inst.companyId || null,
    sessionRestored: false,
  });
  w.setTitle(`${inst.name} — RENACE`);
  w.loadURL(start).catch((e) => {
    log.error('openHome failed', e.message);
    openSetup(w);
  });
}

let secondSalesWin = null;

function createSecondSalesWindow(opts = {}) {
  if (secondSalesWin && !secondSalesWin.isDestroyed()) {
    secondSalesWin.focus();
    return secondSalesWin;
  }
  const inst = store.getInstance();
  const primary = screen.getPrimaryDisplay();
  const width = Math.min(1280, primary.workAreaSize.width);
  const height = Math.min(860, primary.workAreaSize.height);

  secondSalesWin = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    show: true,
    backgroundColor: '#0a0f1a',
    title: `${inst?.name || 'RENACE'} — Ventas 2 (Proceso Paralelo)`,
    icon: resolveAppIcon(),
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

  attachWindowChrome(secondSalesWin);
  attachWindowGuards(secondSalesWin);
  applyUserModeGuards(secondSalesWin);
  applyZoomFactor(secondSalesWin.webContents);

  const targetPath = opts.url || (inst?.url ? `${inst.url}/web#action=pos.ui` : PORTAL_URL);
  secondSalesWin.loadURL(targetPath).catch((e) => log.error('secondSalesWin load', e.message));
  secondSalesWin.on('closed', () => { secondSalesWin = null; });
  return secondSalesWin;
}

function createInstanceWindow({ url, title }) {
  if (!url) return null;
  const safeTitle = String(title || 'Empresa — RENACE').trim();
  const primary = screen.getPrimaryDisplay();
  const width = Math.min(1280, primary.workAreaSize.width);
  const height = Math.min(860, primary.workAreaSize.height);

  let hostPart = PARTITION;
  try {
    const uKey = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
    hostPart = `persist:renace-portal-${uKey}`;
  } catch (_) {}

  const win = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    show: true,
    backgroundColor: '#0a0f1a',
    title: safeTitle,
    icon: resolveAppIcon(),
    ...windowChromeOptions(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: hostPart,
      preload: PRELOAD,
      backgroundThrottling: false,
    },
  });

  attachWindowChrome(win);
  attachWindowGuards(win);
  applyUserModeGuards(win);
  applyZoomFactor(win.webContents);

  win.loadURL(url).catch((e) => log.error('instanceWindow load', e.message));
  return win;
}

/**
 * Actualiza la interfaz (caché HTTP) sin tocar instancia, cookies ni secretos.
 * En POS online: NO clearCache / reloadIgnoringCache — Odoo POS usa su propia
 * caché de assets/productos; un wipe agresivo rompe la sesión de caja.
 */
async function refreshUiSafe(win) {
  const w = win || currentWin();
  if (!w || w.isDestroyed()) return;
  const wc = w.webContents;
  const url = wc.getURL();
  const onPos = isPosLikeUrl(url);
  if (!onPos) {
    try {
      await portalSession().clearCache();
      log.info('ui refresh: cache cleared (instance preserved)');
    } catch (e) {
      log.warn('ui refresh cache', e.message);
    }
  } else {
    log.info('ui refresh: POS online — preserving browser/POS cache');
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
    if (url.startsWith('file://') && url.includes('staff-login.html')) {
      openStaffLogin(w);
      return;
    }
    if (onPos) {
      wc.reload();
    } else {
      wc.reloadIgnoringCache();
    }
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
  /** Guarda vínculo de empresa sin salir de setup (para poder añadir personal). */
  ipcMain.handle('renace:instance-save', (event, payload) => {
    if (!senderIsTrusted(event) && store.getAppMode() !== 'admin') {
      return { ok: false, error: 'No autorizado' };
    }
    const res = store.setInstance(payload || {});
    log.info('instance-save', {
      ok: res.ok,
      error: res.error || null,
      url: res.instance?.url || null,
      companyId: res.instance?.companyId || null,
    });
    if (!res.ok) return res;
    // Preferir modo usuario tras vincular; técnico puede reabrir con PIN
    const wantUser = payload?.mode !== 'admin';
    if (wantUser) {
      store.setAppMode('user');
      clearAdminExpireTimer();
    }
    buildMenu();
    BrowserWindow.getAllWindows().forEach((w) => {
      applyUserModeGuards(w);
      applyClosableState(w);
    });
    return { ...res, mode: store.getAppMode() };
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
  ipcMain.handle('renace:pos-status', async () => ({
    platform: process.platform,
    windowsAgent: process.platform === 'win32',
    proxy: posProxy.getSettings(),
    printers: process.platform === 'darwin' || process.platform === 'linux' ? await posProxy.listCupsPrinters() : [],
    brand: process.platform === 'win32' ? 'POS Agent PRO (bundled)' : 'RENACE POS',
  }));
  ipcMain.handle('renace:pos-list-printers', async () => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      return await posProxy.listCupsPrinters();
    }
    return [];
  });
  ipcMain.handle('renace:pos-set-settings', async (_event, partial) => {
    const newCfg = store.setPosSettings(partial || {});
    if (process.platform !== 'win32') {
      await posProxy.stop();
      await posProxy.start(newCfg);
    }
    return newCfg;
  });
  ipcMain.handle('renace:pos-test-print', async () => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      return await posProxy.sendTestPrint();
    }
    return { ok: false, reason: 'Windows usa POS Agent PRO' };
  });
  ipcMain.handle('renace:pos-test-cashbox', async () => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      return await posProxy.openCashDrawer();
    }
    return { ok: false, reason: 'Windows usa POS Agent PRO' };
  });
  ipcMain.handle('renace:open-second-sales-window', (_event, opts) => {
    createSecondSalesWindow(opts || {});
    return true;
  });
  ipcMain.handle('renace:open-instance-window', (_event, payload) => {
    if (!payload?.url) return false;
    createInstanceWindow(payload);
    return true;
  });
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
  ipcMain.handle('renace:tech-action', async (_e, action) => {
    if (store.getAppMode() !== 'admin') {
      return { ok: false, error: 'Modo técnico requerido' };
    }
    const act = String(action || '');
    try {
      if (act === 'instance') {
        await openHome(currentWin());
        return { ok: true };
      }
      if (act === 'personal' || act === 'setup') {
        openSetup(currentWin());
        return { ok: true };
      }
      if (act === 'updates') {
        runUpdateCheck(false);
        return { ok: true };
      }
      if (act === 'reload' || act === 'refresh') {
        const win = currentWin();
        if (win && !win.isDestroyed()) win.webContents.reloadIgnoringCache();
        return { ok: true };
      }
      if (act === 'user') {
        revertToUserMode('toolbar');
        return { ok: true };
      }
      if (act === 'quit') {
        await requestQuitFromTech();
        return { ok: true };
      }
      return { ok: false, error: 'Acción desconocida' };
    } catch (e) {
      log.warn('tech-action', act, e && e.message);
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
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

  // Personal ligado a este PC — listado público (solo nombres) para staff-login.html
  ipcMain.handle('renace:staff-public-list', (event) => {
    if (!senderIsTrusted(event) && store.getAppMode() !== 'admin') return [];
    return staffLocal.publicList();
  });
  ipcMain.handle('renace:staff-has', () => staffLocal.hasProfiles());
  ipcMain.handle('renace:staff-tech-list', (event) => {
    if (store.getAppMode() !== 'admin' && !senderIsTrusted(event)) return [];
    // setup.html es file:// trusted, pero mutaciones requieren admin salvo setup durante vínculo
    if (store.getAppMode() !== 'admin' && !String(event?.senderFrame?.url || '').includes('setup.html')) {
      return [];
    }
    return staffLocal.techList();
  });
  ipcMain.handle('renace:staff-upsert', (event, payload) => {
    if (store.getAppMode() !== 'admin' && !senderIsTrusted(event)) {
      return { ok: false, error: 'Requiere modo técnico' };
    }
    // En user mode solo setup local (técnico ya desbloqueó vía open-setup)
    if (store.getAppMode() !== 'admin') {
      const url = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
      if (!String(url).includes('setup.html')) {
        return { ok: false, error: 'Requiere modo técnico' };
      }
    }
    const res = staffLocal.upsert(payload || {});
    if (res.ok) log.info('staff upsert', { id: res.profile?.id, name: res.profile?.name });
    return res;
  });
  ipcMain.handle('renace:staff-remove', (event, id) => {
    if (store.getAppMode() !== 'admin' && !senderIsTrusted(event)) {
      return { ok: false, error: 'Requiere modo técnico' };
    }
    if (store.getAppMode() !== 'admin') {
      const url = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
      if (!String(url).includes('setup.html')) {
        return { ok: false, error: 'Requiere modo técnico' };
      }
    }
    const res = staffLocal.remove(id);
    if (res.ok) log.info('staff removed');
    return res;
  });
  ipcMain.handle('renace:staff-set-default', (event, id) => {
    // setup / staff-login (file://) o modo técnico
    if (store.getAppMode() !== 'admin' && !senderIsTrusted(event)) {
      return { ok: false, error: 'No autorizado' };
    }
    if (store.getAppMode() !== 'admin') {
      const url = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
      const u = String(url);
      if (!u.includes('setup.html') && !u.includes('staff-login.html')) {
        return { ok: false, error: 'No autorizado' };
      }
    }
    const res = staffLocal.setDefault(id);
    if (res.ok) log.info('staff default', { id: res.defaultStaffId || null });
    return res;
  });
  ipcMain.handle('renace:staff-get-default', (event) => {
    if (!senderIsTrusted(event) && store.getAppMode() !== 'admin') return null;
    return staffLocal.getDefault();
  });
  ipcMain.handle('renace:staff-open', () => {
    openStaffLogin(currentWin());
    return true;
  });
  ipcMain.handle('renace:staff-login', async (event, id, pin, opts) => {
    // Solo desde staff-login local (file://) — nunca desde Odoo XSS
    const url = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
    if (!String(url).startsWith('file://') || !String(url).includes('staff-login.html')) {
      return { ok: false, error: 'Origen no permitido' };
    }
    const inst = store.getInstance();
    if (!inst?.url) return { ok: false, error: 'Sin instancia vinculada' };
    const unlocked = staffLocal.unlockWithPin(id, pin);
    if (!unlocked.ok) {
      log.warn('staff login denied');
      return { ok: false, error: unlocked.error || 'PIN incorrecto' };
    }
    try {
      if (opts && opts.setDefault === true) {
        staffLocal.setDefault(id);
      } else if (opts && opts.setDefault === false) {
        const cur = staffLocal.getDefault();
        if (cur?.id === id) staffLocal.setDefault(null);
      }
      // Quitar cookie previa para que el login use sí o sí las credenciales del perfil
      await clearInstanceSessionCookie({ clearActive: false });
      await odooLocalWebLogin(inst.url, unlocked.odooLogin, unlocked.odooPassword);
      store.setActiveStaffId?.(id);
      log.info('staff login ok', {
        name: unlocked.name,
        host: new URL(inst.url).host,
        staffId: id,
        isDefault: store.getDefaultStaffId?.() === id,
      });
      const dest = `${inst.url}/web`;
      store.recordVisit(dest);
      const win = BrowserWindow.fromWebContents(event.sender) || currentWin();
      if (win && !win.isDestroyed()) {
        win.setTitle(`${inst.name} — RENACE`);
        await win.loadURL(dest);
      }
      return { ok: true };
    } catch (e) {
      store.setActiveStaffId?.(null);
      log.error('staff login odoo failed', e.message);
      return { ok: false, error: 'No se pudo abrir Odoo con ese perfil' };
    }
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
  ipcMain.on('renace:win-reload', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.webContents.reloadIgnoringCache();
  });

  ipcMain.handle('renace:zoom-get', () => store.getZoomFactor());
  ipcMain.handle('renace:zoom-set', (_e, factor) => setAppZoom(factor));
  ipcMain.handle('renace:zoom-in', () => adjustAppZoom(ZOOM_STEP));
  ipcMain.handle('renace:zoom-out', () => adjustAppZoom(-ZOOM_STEP));
  ipcMain.handle('renace:zoom-reset', () => setAppZoom(1));
  ipcMain.handle('renace:ensure-pos-zoom', (e) => ensurePosZoom(e.sender));
  ipcMain.handle('renace:leave-pos-zoom', (e) => {
    const wc = e.sender;
    if (wc && !wc.isDestroyed()) wc.__renacePosUi = false;
    applyZoomFactor(wc);
    return store.getZoomFactor();
  });
  ipcMain.handle('renace:notify', (_e, payload) => showNativeNotification(payload || {}));
  ipcMain.handle('renace:check-updates', (_e, silent) => runUpdateCheck(silent));
  ipcMain.handle('renace:install-update', () => runInstallPendingUpdate());
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

async function clearInstanceSessionCookie(opts = {}) {
  // Solo session_id de la instancia vinculada (cambio de personal) — no toca portal ni otras hosts
  const clearActive = opts.clearActive !== false;
  const inst = store.getInstance();
  if (!inst?.url) {
    if (clearActive) store.setActiveStaffId?.(null);
    return false;
  }
  try {
    if (clearActive) store.setActiveStaffId?.(null);
    const ses = portalSession();
    const cookies = await ses.cookies.get({ url: inst.url });
    await Promise.all(
      cookies
        .filter((c) => c.name === 'session_id')
        .map((c) => {
          const domain = (c.domain || '').replace(/^\./, '');
          const pathPart = c.path || '/';
          const url = domain
            ? `https://${domain}${pathPart}`
            : `${inst.url}${pathPart === '/' ? '' : pathPart}`;
          return ses.cookies.remove(url, c.name);
        })
    );
    log.info('instance session cleared for staff switch', { host: new URL(inst.url).host });
    return true;
  } catch (e) {
    log.warn('clear instance session', e.message);
    return false;
  }
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
  log.info('odoo session cookie set', { host: new URL(base).host });
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

function injectPushBridge(wc) {
  if (!PUSH_BRIDGE || !wc || wc.isDestroyed()) return;
  wc.executeJavaScript(PUSH_BRIDGE, true).catch(() => {});
}

function showNativeNotification(payload) {
  try {
    if (!Notification.isSupported()) return false;
    const n = new Notification({
      title: String(payload?.title || 'RENACE').slice(0, 120),
      body: String(payload?.body || '').slice(0, 500),
      silent: !!payload?.silent,
    });
    n.on('click', () => {
      const w = currentWin();
      if (w && !w.isDestroyed()) {
        if (w.isMinimized()) w.restore();
        w.focus();
      }
    });
    return true;
  } catch (e) {
    log.warn('native notification', e.message);
    return false;
  }
}

function injectCompanyFocus(wc) {
  if (!wc || wc.isDestroyed()) return;
  const inst = store.getInstance();
  if (!inst) return;
  // En /pos no inyectamos forzado de empresa — el script también no-opea en POS
  try {
    if (isPosLikeUrl(wc.getURL())) return;
  } catch (_) {}
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

/** Windows: menú nativo solo existe si la ventana tiene frame (no frameless). */
function winWantsNativeFrame() {
  return process.platform === 'win32' && store.getAppMode() === 'admin';
}

/** Evita que destroy/recreate dispare bloqueo de cierre o quit. */
let chromeSwapInProgress = false;

function isMainPortalWindow(win) {
  if (!win || win.isDestroyed()) return false;
  try {
    if (win.getParentWindow()) return false;
  } catch (_) {
    return false;
  }
  return true;
}

function applyMenuBarVisibility(win) {
  if (!win || win.isDestroyed() || process.platform !== 'win32') return;
  try {
    if (store.getAppMode() === 'user') {
      win.setAutoHideMenuBar(true);
      win.setMenuBarVisibility(false);
    } else {
      // Técnico: menú siempre visible; Alt también puede enfocarlo
      win.setAutoHideMenuBar(false);
      win.setMenuBarVisibility(true);
    }
  } catch (_) {}
}

/**
 * En Windows frameless el menú nativo NUNCA se pinta (setMenuBarVisibility no-op).
 * Al pasar a modo técnico recreamos con frame:true; al volver a usuario, frameless.
 *
 * Bug 3.0.24: tras recreate se re-aplicaba coverTaskbar (display.bounds) en el show
 * handler → ventana framed a pantalla completa, menú Archivo fuera de vista / inútil.
 * Técnico: workArea + sin cover. Usuario: cover a display.bounds como createWindow.
 */
function displayForBounds(bounds) {
  try {
    if (bounds && typeof bounds.x === 'number') {
      return screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
    }
  } catch (_) {}
  return screen.getPrimaryDisplay();
}

function recreatePortalWindow(oldWin, wantFrame) {
  if (!oldWin || oldWin.isDestroyed()) return null;
  let url = '';
  try {
    url = oldWin.webContents.getURL() || '';
  } catch (_) {}
  let oldBounds;
  try {
    oldBounds = oldWin.getBounds();
  } catch (_) {
    oldBounds = { x: 0, y: 0, width: 1280, height: 860 };
  }
  const display = displayForBounds(oldBounds);
  const prevBounds = oldWin.__renacePrevBounds;
  // Framed (técnico): workArea para que title+menú queden on-screen. Nunca cover.
  // Frameless (usuario): display.bounds + cover como arranque normal.
  let bounds;
  let coverAfter = false;
  if (wantFrame) {
    const wa = display.workArea || display.bounds;
    bounds = { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
  } else {
    bounds = {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    };
    coverAfter = true;
  }

  chromeSwapInProgress = true;
  let win;
  try {
    win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      minWidth: 960,
      minHeight: 640,
      show: true,
      backgroundColor: '#0a0f1a',
      title: 'RENACE Portal',
      icon: resolveAppIcon(),
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
    win.__renaceNativeFrame = !!wantFrame;
    if (prevBounds) win.__renacePrevBounds = prevBounds;
    win.__renaceCovered = false;

    attachWindowChrome(win);
    attachWindowGuards(win);
    applyUserModeGuards(win);
    applyZoomFactor(win.webContents);

    // Menú nativo en la ventana nueva (setApplicationMenu solo no basta tras swap)
    try {
      const appMenu = Menu.getApplicationMenu();
      if (wantFrame && appMenu) {
        win.setMenu(appMenu);
        win.setAutoHideMenuBar(false);
        win.setMenuBarVisibility(true);
      } else if (!wantFrame) {
        win.setMenu(null);
        win.setAutoHideMenuBar(true);
        win.setMenuBarVisibility(false);
      }
    } catch (e) {
      log.warn('chrome swap setMenu', e.message);
    }

    if (process.platform === 'win32') {
      if (coverAfter) {
        // Solo usuario frameless: mantener pantalla completa sobre taskbar
        win.on('show', () => {
          if (!win.isDestroyed() && !win.__renaceNativeFrame && !win.__renaceCovered) {
            coverTaskbar(win);
          }
        });
        try {
          coverTaskbar(win);
        } catch (_) {}
      }
      // Técnico framed: NUNCA coverTaskbar — deja menú Archivo usable
    }

    if (url && url !== 'about:blank') {
      win.loadURL(url).catch((e) => {
        log.warn('chrome swap loadURL', e.message);
        openHome(win);
      });
    } else if (store.getInstance()) {
      openHome(win);
    } else {
      openSetup(win);
    }

    try {
      oldWin.removeAllListeners('close');
    } catch (_) {}
    try {
      if (!oldWin.isDestroyed()) oldWin.destroy();
    } catch (_) {}

    try {
      win.focus();
    } catch (_) {}
    log.info('chrome swap', {
      nativeFrame: !!wantFrame,
      covered: !!win.__renaceCovered,
      url: String(url).slice(0, 120),
    });
    return win;
  } catch (e) {
    log.warn('chrome swap failed', e.message);
    return null;
  } finally {
    chromeSwapInProgress = false;
  }
}

function syncWindowsChromeForMode() {
  if (process.platform !== 'win32') return;
  const wantFrame = winWantsNativeFrame();
  const mains = BrowserWindow.getAllWindows().filter(isMainPortalWindow);
  for (const old of mains) {
    const hasFrame = !!old.__renaceNativeFrame;
    if (hasFrame === wantFrame) {
      applyMenuBarVisibility(old);
      try {
        const appMenu = Menu.getApplicationMenu();
        if (wantFrame && appMenu) {
          old.setMenu(appMenu);
        }
      } catch (_) {}
      continue;
    }
    const created = recreatePortalWindow(old, wantFrame);
    if (!created) {
      log.warn('chrome swap skipped — keeping previous window', { wantFrame });
    }
  }
  BrowserWindow.getAllWindows().filter(isMainPortalWindow).forEach(applyMenuBarVisibility);
}

function applyUserModeGuards(win) {
  if (!win || win.isDestroyed()) return;
  applyMenuBarVisibility(win);
  const wc = win.webContents;
  wc.removeAllListeners('before-input-event');
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    // Modo técnico: no depende del menú (oculto en usuario / frameless Windows)
    if (isTechUnlockChord(input)) {
      event.preventDefault();
      requestTechUnlockFromShortcut();
      return;
    }
    // Zoom siempre (también en modo usuario con menú oculto en Windows)
    if ((input.meta || input.control) && !input.alt) {
      const key = String(input.key || '');
      if (key === '=' || key === '+' || key === 'Add') {
        event.preventDefault();
        adjustAppZoom(ZOOM_STEP);
        return;
      }
      if (key === '-' || key === '_' || key === 'Subtract') {
        event.preventDefault();
        adjustAppZoom(-ZOOM_STEP);
        return;
      }
      if (key === '0' || key === 'Digit0') {
        event.preventDefault();
        setAppZoom(1);
        return;
      }
    }
    if (store.getAppMode() !== 'user') return;
    const key = String(input.key || '');
    const blocked =
      (input.meta || input.control) &&
      ['r', 'R', 'l', 'L', '[', ']', 'ArrowLeft', 'ArrowRight'].includes(key);
    if (key === 'F5') {
      event.preventDefault();
      refreshUiSafe(win).catch(() => {});
      return;
    }
    const blockedNav =
      (input.alt && (key === 'ArrowLeft' || key === 'ArrowRight')) ||
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

/** Barra técnica in-app — funciona con o sin menú nativo / frame. */
function injectTechToolbar(wc) {
  if (!wc || wc.isDestroyed()) return;
  if (store.getAppMode() !== 'admin') {
    removeTechToolbar(wc);
    return;
  }
  wc.executeJavaScript(techToolbarScript(), true).catch((e) => log.warn('injectTechToolbar', e.message));
}

function removeTechToolbar(wc) {
  if (!wc || wc.isDestroyed()) return;
  wc.executeJavaScript(techToolbarRemoveScript(), true).catch(() => {});
}

function refreshTechChrome(win) {
  if (!win || win.isDestroyed()) return;
  applyUserModeGuards(win);
  applyClosableState(win);
  injectUserShell(win.webContents);
  injectWinFrame(win.webContents);
  injectTechToolbar(win.webContents);
}

function windowChromeOptions() {
  if (process.platform === 'win32') {
    // Usuario: frameless + win-frame. Técnico: frame nativo para menú Archivo/etc.
    if (winWantsNativeFrame()) {
      return {
        frame: true,
        autoHideMenuBar: false,
      };
    }
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
  if (win.__renaceNativeFrame == null) {
    win.__renaceNativeFrame = winWantsNativeFrame();
  }
  applyMenuBarVisibility(win);

  applyClosableState(win);

  win.on('close', (e) => {
    if (chromeSwapInProgress) return;
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

/**
 * POS / point_of_sale SPA: HTML inicial corto y title "Odoo" son normales.
 * No tratar como pantalla en blanco (evita falso positivo + DevTools).
 */
function isPosLikeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const raw = url.toLowerCase();
  if (
    raw.includes('point_of_sale') ||
    raw.includes('/pos/') ||
    raw.includes('/pos?') ||
    raw.includes('/pos#') ||
    /\/pos$/i.test(raw.split(/[?#]/)[0]) ||
    /[?&#]action=pos\b/.test(raw) ||
    /[?&#]model=pos\./.test(raw) ||
    /\.pos\b/.test(raw) ||
    /pos\.(ui|config|session|payment)/.test(raw)
  ) {
    return true;
  }
  try {
    const u = new URL(url);
    const hay = `${u.pathname}${u.search}${u.hash}`.toLowerCase();
    return (
      /\/pos(\/|$)/.test(u.pathname.toLowerCase()) ||
      hay.includes('point_of_sale') ||
      /[?&#]action=pos\b/.test(hay) ||
      /[?&#]model=pos\./.test(hay)
    );
  } catch (_) {
    return false;
  }
}

/** Shell Odoo web (SPA) — title "Odoo" + body corto al montar no implica blank */
function isOdooShellUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const p = new URL(url).pathname.toLowerCase();
    return /\/(web|odoo)(\/|$)/.test(p) || p.includes('/web/login');
  } catch (_) {
    return /\/(web|odoo)(\/|$|\?|#)/i.test(url);
  }
}

/** Solo metadatos seguros para logs / banner (nunca body sample ni secretos de sesión) */
function sanitizeBlankMeta(info) {
  return {
    url: info && info.url ? String(info.url).slice(0, 500) : '',
    title: info && info.title ? String(info.title).slice(0, 120) : '',
    bodyLen: Number(info && info.bodyLen) || 0,
    hasOdoo: !!(info && info.hasOdoo),
    hasPos: !!(info && info.hasPos),
  };
}

/** Sin banner visual: solo log silencioso al archivo + servidor */
async function checkBlankPage(win) {
  if (!win || win.isDestroyed()) return;
  const wc = win.webContents;
  const current = wc.getURL();
  if (current.startsWith('file://')) return;
  if (isPosLikeUrl(current)) return;

  let info = { url: current, title: '', bodyLen: 0, hasOdoo: false, hasPos: false };
  try {
    info = await wc.executeJavaScript(`({
      url: location.href,
      title: document.title || '',
      bodyLen: (document.body && document.body.innerText || '').trim().length,
      hasOdoo: !!document.querySelector('.o_web_client, .o_main_navbar, .o_home_menu, .oe_login_form, .o_login_form, .o_action_manager'),
      hasPos: !!document.querySelector('.o_pos, .pos, .pos-content, .pos-topheader, #pos, .o_pos_kanban'),
    })`);
  } catch (e) {
    log.warn('checkBlankPage eval failed', e.message);
    return;
  }

  const safe = sanitizeBlankMeta(info);
  if (isPosLikeUrl(safe.url) || safe.hasPos) return;

  const shellLoading = isOdooShellUrl(safe.url) || /^odoo$/i.test(safe.title);
  const looksBlank =
    !safe.hasOdoo &&
    !safe.hasPos &&
    (safe.bodyLen < 8 ||
      (!shellLoading && safe.bodyLen < 20) ||
      (/^odoo$/i.test(safe.title) && !isOdooShellUrl(safe.url) && safe.bodyLen < 40));

  if (!looksBlank) return;
  log.warn('BLANK PAGE DETECTED', safe);
}

function hardenSession(ses) {
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    // Permitir notificaciones del SO / Odoo; denegar el resto sensible por defecto
    if (permission === 'notifications') return callback(true);
    // POS / IoT a veces pide dispositivos; no bloquear de más
    if (permission === 'media' || permission === 'geolocation') return callback(false);
    callback(true);
  });
  // No registrar handlers que bloqueen Service Workers ni caché HTTP de la instancia:
  // Odoo POS online depende de su propia caché de assets en esta partición persistente.
  ses.webRequest.onErrorOccurred({ urls: ['*://*.renace.tech/*', '*://renace.tech/*'] }, (details) => {
    if (details.resourceType === 'mainFrame' || details.resourceType === 'xhr' || details.resourceType === 'script') {
      log.warn('request error', {
        url: String(details.url || '').slice(0, 200),
        type: details.resourceType,
        error: details.error,
      });
    }
  });
}

/**
 * Menú contextual Editar (ES): Copiar / Pegar / Cortar / Seleccionar todo.
 * Sustituye el menú Chromium (Atrás/Recargar) sin romper modo técnico ni POS.
 */
function attachEditContextMenu(wc) {
  if (!wc || wc.isDestroyed() || wc.__renaceEditContextMenu) return;
  wc.__renaceEditContextMenu = true;
  wc.on('context-menu', (_event, params) => {
    const flags = params.editFlags || {};
    const editable = Boolean(params.isEditable);
    const canCopy = Boolean(flags.canCopy);
    if (!editable && !canCopy) return;

    const items = [];
    if (editable) {
      items.push({ label: 'Cortar', role: 'cut', enabled: Boolean(flags.canCut) });
    }
    items.push({ label: 'Copiar', role: 'copy', enabled: canCopy });
    if (editable) {
      items.push({ label: 'Pegar', role: 'paste', enabled: Boolean(flags.canPaste) });
    }
    items.push({ type: 'separator' });
    items.push({
      label: 'Seleccionar todo',
      role: 'selectAll',
      enabled: Boolean(flags.canSelectAll),
    });

    const menu = Menu.buildFromTemplate(items);
    const owner = BrowserWindow.fromWebContents(wc);
    menu.popup(owner && !owner.isDestroyed() ? { window: owner } : undefined);
  });
}

function attachWindowGuards(win) {
  const wc = win.webContents;
  attachEditContextMenu(wc);

  wc.setWindowOpenHandler(({ url }) => {
    log.info('window open', url);
    if (isAllowed(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  wc.on('will-navigate', async (event, url) => {
    if (!isAllowed(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    if (/\/api\/sso\/enter(\?|$)/i.test(url)) {
      event.preventDefault();
      const ok = await completeSsoEnter(win, url);
      if (!ok) log.warn('sso enter failed — stay on current page');
    }
  });

  wc.on('will-redirect', async (event, url) => {
    if (/\/api\/sso\/enter(\?|$)/i.test(url)) {
      event.preventDefault();
      const ok = await completeSsoEnter(win, url);
      if (!ok) log.warn('sso redirect failed');
    }
  });

  wc.on('did-navigate', (_e, url) => {
    store.recordVisit(url);
    win.setTitle(windowTitleFor(url));
    try {
      const host = new URL(url).host;
      if (host) log.setInstanceHost(host);
    } catch (_) {}
    if (isPosLikeUrl(url)) {
      ensurePosZoom(wc);
    } else if (wc.__renacePosUi) {
      wc.__renacePosUi = false;
      applyZoomFactor(wc);
    }
  });
  wc.on('did-navigate-in-page', () => {});
  wc.on('page-title-updated', () => {});

  wc.on('console-message', (_e, level, message) => {
    if (level >= 2) log.warn('renderer console', { message: String(message).slice(0, 200) });
  });

  wc.on('dom-ready', () => {
    log.info('dom-ready', wc.getURL());
    applyZoomFactor(wc);
    injectWinFrame(wc);
    injectTechToolbar(wc);
    const u = wc.getURL();
    if (u.startsWith('file://')) return;
    injectPushBridge(wc);
    injectCompanyFocus(wc);
    injectUserShell(wc);
    injectDrag(wc);
  });

  wc.on('did-finish-load', () => {
    applyZoomFactor(wc);
    injectWinFrame(wc);
    injectTechToolbar(wc);
    const u = wc.getURL();
    if (u.startsWith('file://')) return;
    injectPushBridge(wc);
    injectCompanyFocus(wc);
    injectUserShell(wc);
    injectDrag(wc);
    // Chequeo silencioso (solo log remoto; sin UI)
    if (isPosLikeUrl(u)) return;
    const delay = isOdooShellUrl(u) ? 8000 : 2500;
    setTimeout(() => checkBlankPage(win), delay);
  });

  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || code === -27 || code === 0) return;
    log.error('did-fail-load', { code, desc, url: String(url || '').slice(0, 200) });
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
      alwaysOnTop: true,
      show: false,
      backgroundColor: '#0a0f1a',
      autoHideMenuBar: true,
      icon: resolveAppIcon(),
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
    const onSubmit = (e, password) => {
      if (!box || box.isDestroyed() || e.sender !== box.webContents) return;
      finish(String(password || ''));
    };
    const onCancel = (e) => {
      if (e && box && !box.isDestroyed() && e.sender !== box.webContents) return;
      finish(null);
    };

    ipcMain.on('renace:tech-password', onSubmit);
    ipcMain.on('renace:tech-password-cancel', onCancel);
    box.on('closed', () => finish(null));
    box.loadFile(TECH_UNLOCK_HTML).catch((e) => {
      log.warn('tech unlock load', e.message);
      techPromptOpen = false;
      dialog
        .showMessageBox(parent || undefined, {
          type: 'error',
          title: 'Modo técnico',
          message: 'No se pudo abrir el diálogo de contraseña.',
          detail: String(e && e.message ? e.message : e || ''),
          buttons: ['OK'],
        })
        .catch(() => {});
      finish(null);
    });
    box.once('ready-to-show', () => {
      try {
        box.show();
        box.focus();
        box.webContents.focus();
      } catch (_) {}
    });
  });
}

function focusExistingPortalWindow() {
  const wins = BrowserWindow.getAllWindows().filter((w) => w && !w.isDestroyed());
  const win = wins[0] || null;
  if (!win) return;
  try {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  } catch (_) {}
}

async function applyOpenAtLogin(enabled) {
  const on = !!enabled;
  store.setOpenAtLogin(on);
  if (process.platform === 'win32') {
    // Un solo path: HKCU Run "RENACE Portal" (igual que installer.nsh).
    // setLoginItemSettings registra otra clave (p.ej. "renace-tech") → 2 instancias al login.
    try {
      app.setLoginItemSettings({
        openAtLogin: false,
        openAsHidden: false,
        path: process.execPath,
        args: [],
      });
    } catch (e) {
      log.warn('clear Electron login item', e.message);
    }
    try {
      await setPortalOpenAtLogin(on, process.execPath);
    } catch (e) {
      log.warn('portal Run registry', e.message);
    }
    try {
      await ensurePosAgent({ openAtLogin: on });
    } catch (e) {
      log.warn('posagent autostart sync', e.message);
    }
  } else {
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
  const cur =
    store.getOpenAtLogin() ??
    (process.platform === 'win32' ? false : app.getLoginItemSettings?.().openAtLogin) ??
    false;
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
  if (store.getAppMode() === 'admin') {
    scheduleAdminExpiry();
    return true;
  }
  if (techPromptOpen || techUnlockInFlight) return false;
  techUnlockInFlight = true;
  try {
    const password = await promptTechPassword();
    if (password == null) return false;
    if (String(password) !== TECH_PIN) {
      await dialog
        .showMessageBox(currentWin() || undefined, {
          type: 'error',
          title: 'Modo técnico',
          message: 'Contraseña incorrecta.',
          buttons: ['OK'],
        })
        .catch(() => {});
      return false;
    }
    store.setAppMode('admin');
    scheduleAdminExpiry();
    buildMenu();
    // Windows: recrear con frame nativo → menú Archivo (sin coverTaskbar)
    syncWindowsChromeForMode();
    BrowserWindow.getAllWindows().forEach((w) => {
      if (w.getParentWindow()) return;
      refreshTechChrome(w);
    });
    log.info('tech mode unlocked', { ttlMin: ADMIN_TTL_MS / 60000 });
    dialog
      .showMessageBox(currentWin() || undefined, {
        type: 'info',
        title: 'Modo técnico',
        message: 'Modo técnico activo.',
        detail:
          'Barra técnica arriba (Instancia / Personal / Updates / Salir).\n' +
          'En Windows también menú Archivo si la ventana tiene marco.\n' +
          'Salir: Ctrl+Shift+Q. Vuelve a modo usuario a los 20 minutos.',
        buttons: ['OK'],
      })
      .catch(() => {});
    return true;
  } finally {
    techUnlockInFlight = false;
  }
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
                  label: 'Cambiar de personal…',
                  click: async () => {
                    if (!staffLocal.hasProfiles()) return;
                    await clearInstanceSessionCookie();
                    openStaffLogin(currentWin());
                  },
                },
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
                  acceleratorWorksWhenHidden: true,
                  click: () => unlockAdmin(),
                },
              ],
            }]
          : []),
        {
          label: 'Archivo',
          submenu: [
            {
              label: 'Nueva 2ª Venta (Proceso en Paralelo)',
              accelerator: 'CmdOrCtrl+Shift+N',
              click: () => createSecondSalesWindow(),
            },
            {
              label: 'Abrir Otra Empresa / Instancia…',
              click: async () => {
                const inst = store.getInstance();
                if (inst?.url) {
                  createInstanceWindow({ url: `${inst.url}/web/login`, title: `${inst.name} — Otra Sesión` });
                } else {
                  currentWin()?.loadURL(PORTAL_URL);
                }
              },
            },
            { type: 'separator' },
            {
              label: 'Cambiar de personal…',
              click: async () => {
                if (!staffLocal.hasProfiles()) {
                  dialog.showMessageBox(currentWin() || undefined, {
                    type: 'info',
                    title: 'Personal',
                    message: 'No hay perfiles locales en este PC.',
                    detail: 'El técnico puede añadirlos en Configurar instancia de empresa.',
                  });
                  return;
                }
                await clearInstanceSessionCookie();
                openStaffLogin(currentWin());
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
              label: 'Modo técnico…',
              accelerator: 'CmdOrCtrl+Shift+Alt+T',
              acceleratorWorksWhenHidden: true,
              click: () => unlockAdmin(),
            },
          ],
        },
        { label: 'Editar', submenu: [{ role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
        {
          label: 'Ver',
          submenu: [...zoomMenuTemplate()],
        },
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
            label: 'Personal de este PC…',
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
              const on =
                store.getOpenAtLogin() ??
                (process.platform === 'win32' ? false : app.getLoginItemSettings?.().openAtLogin);
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
                  accelerator: 'CmdOrCtrl+Shift+Q',
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
            label: 'Enviar logs al servidor',
            accelerator: 'CmdOrCtrl+Shift+L',
            click: () => {
              log.flush().then(() => {
                dialog.showMessageBox(currentWin() || undefined, {
                  type: 'info',
                  title: 'Logs',
                  message: 'Logs enviados al servidor (silencioso).',
                  buttons: ['OK'],
                }).catch(() => {});
              }).catch(() => {});
            },
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
          ...zoomMenuTemplate(),
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
    icon: resolveAppIcon(),
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
  win.__renaceNativeFrame = winWantsNativeFrame();

  attachWindowChrome(win);
  attachWindowGuards(win);
  applyUserModeGuards(win);
  applyZoomFactor(win.webContents);
  if (process.platform === 'win32') {
    // Pantalla completa al inicio (incluye barra de tareas) — solo frameless usuario
    if (!win.__renaceNativeFrame) {
      coverTaskbar(win);
      win.once('ready-to-show', () => {
        if (!win.isDestroyed() && !win.__renaceNativeFrame) coverTaskbar(win);
      });
      win.on('show', () => {
        if (!win.isDestroyed() && !win.__renaceNativeFrame && !win.__renaceCovered) {
          coverTaskbar(win);
        }
      });
    }
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
  if (!gotSingleInstanceLock) return;
  log.configure({
    version: app.getVersion(),
    platform: process.platform,
    deviceId: crypto
      .createHash('sha256')
      .update(`${os.hostname()}-${app.getPath('userData')}`)
      .digest('hex')
      .slice(0, 16),
    instanceHost: (() => {
      try {
        return store.getInstance()?.url ? new URL(store.getInstance().url).host : '';
      } catch {
        return '';
      }
    })(),
  });
  log.info('app ready', { version: app.getVersion(), platform: process.platform });

  try {
    const appIcon = resolveAppIcon();
    if (appIcon && process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(appIcon);
    }
  } catch (_) {}

  // Siempre arrancar en modo usuario (técnico solo con clave, máx. 20 min)
  store.setAppMode('user');
  clearAdminExpireTimer();
  updater.loadPendingFromDisk();

  if (process.platform === 'win32') {
    let winAgentOk = false;
    try {
      // Limpia claves Run / Startup duplicadas de builds anteriores (Electron login item)
      await clearDuplicatePortalAutostart([app.getName()]);
      await syncOpenAtLoginFromInstaller();
      const pos = await ensurePosAgent({ openAtLogin: store.getOpenAtLogin() !== false });
      log.info('posagent ensure', pos);
      winAgentOk = !!(pos && pos.ok && pos.running);
    } catch (e) {
      log.warn('posagent ensure failed', e.message);
    }

    // Hub integrado nativo para Windows si posagent.exe no está presente o en ejecución
    if (!winAgentOk) {
      try {
        const posCfg = store.getPosSettings();
        const started = await posProxy.start(posCfg);
        log.info('renace pos proxy (win embedded)', started);
      } catch (e) {
        log.warn('win pos proxy fallback failed', e.message);
      }
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
    applyZoomFactor(wc);
    attachEditContextMenu(wc);
    wc.on('dom-ready', () => {
      applyZoomFactor(wc);
      injectWinFrame(wc);
      injectTechToolbar(wc);
      const u = wc.getURL();
      if (u.startsWith('file://')) return;
      injectPushBridge(wc);
      injectCompanyFocus(wc);
    });
  });
  registerIpc();
  buildMenu();
  registerTechUnlockGlobalShortcut();
  createWindow();
  updater.startAutoUpdateLoop(updaterOpts());
  app.on('browser-window-focus', () => {
    registerTechUnlockGlobalShortcut();
  });
  app.on('browser-window-blur', () => {
    // Mantener atajo solo mientras alguna ventana de la app tiene foco
    setTimeout(() => {
      if (!BrowserWindow.getFocusedWindow()) unregisterTechUnlockGlobalShortcut();
    }, 50);
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', (e) => {
  unregisterTechUnlockGlobalShortcut();
  log.flush().catch(() => {});
  // No bloquear antes-quit del sistema (instalador, shutdown). Solo el evento close de ventana bloquea el X del usuario.
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
  if (chromeSwapInProgress) return;
  if (isWorkInstanceLocked()) {
    // No salir: recrear ventana si alguien logró cerrarla
    setTimeout(() => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    }, 200);
    return;
  }
  app.quit();
});
