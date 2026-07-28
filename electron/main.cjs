const { app, BrowserWindow, Menu, shell, session, dialog, clipboard } = require('electron');
const path = require('path');

const PORTAL_URL = process.env.RENACE_PORTAL_URL || 'https://renace.tech/portal';
const HOME_URL = process.env.RENACE_HOME_URL || 'https://renace.tech';
const ALLOWED = [
  /^https:\/\/renace\.tech(\/|$)/i,
  /^https:\/\/www\.renace\.tech(\/|$)/i,
  /^https:\/\/[a-z0-9.-]+\.renace\.tech(\/|$)/i,
];

function isAllowed(url) {
  return ALLOWED.some((re) => re.test(String(url || '')));
}

function currentWin() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

async function clearRenaceCookies() {
  const ses = session.defaultSession;
  const cookies = await ses.cookies.get({});
  await Promise.all(
    cookies
      .filter((c) => String(c.domain || '').includes('renace.tech'))
      .map((c) => {
        const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
        const url = `https://${domain}${c.path || '/'}`;
        return ses.cookies.remove(url, c.name);
      })
  );
}

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about', label: 'Acerca de RENACE Portal' },
            { type: 'separator' },
            {
              label: 'Ir al Portal',
              accelerator: 'CmdOrCtrl+Shift+H',
              click: () => currentWin()?.loadURL(PORTAL_URL),
            },
            {
              label: 'Cerrar sesión / limpiar cookies',
              click: async () => {
                await clearRenaceCookies();
                currentWin()?.loadURL(PORTAL_URL);
              },
            },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit', label: 'Salir de RENACE Portal' },
          ],
        }]
      : []),
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Portal de clientes',
          accelerator: 'CmdOrCtrl+1',
          click: () => currentWin()?.loadURL(PORTAL_URL),
        },
        {
          label: 'Sitio RENACE.TECH',
          accelerator: 'CmdOrCtrl+2',
          click: () => currentWin()?.loadURL(HOME_URL),
        },
        { type: 'separator' },
        {
          label: 'Abrir en el navegador',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            const win = currentWin();
            const url = win?.webContents?.getURL();
            if (url) shell.openExternal(url);
          },
        },
        {
          label: 'Copiar URL',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            const url = currentWin()?.webContents?.getURL();
            if (url) clipboard.writeText(url);
          },
        },
        { type: 'separator' },
        {
          label: 'Cerrar sesión',
          click: async () => {
            await clearRenaceCookies();
            currentWin()?.loadURL(PORTAL_URL);
          },
        },
        ...(isMac ? [] : [{ role: 'quit', label: 'Salir' }]),
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => currentWin()?.webContents.reload(),
        },
        {
          label: 'Forzar recarga',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => currentWin()?.webContents.reloadIgnoringCache(),
        },
        { type: 'separator' },
        {
          label: 'Atrás',
          accelerator: 'CmdOrCtrl+[',
          click: () => {
            const wc = currentWin()?.webContents;
            if (wc?.navigationHistory?.canGoBack()) wc.navigationHistory.goBack();
            else if (wc?.canGoBack()) wc.goBack();
          },
        },
        {
          label: 'Adelante',
          accelerator: 'CmdOrCtrl+]',
          click: () => {
            const wc = currentWin()?.webContents;
            if (wc?.navigationHistory?.canGoForward()) wc.navigationHistory.goForward();
            else if (wc?.canGoForward()) wc.goForward();
          },
        },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom real' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        {
          label: 'Herramientas de desarrollo',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => currentWin()?.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front', label: 'Traer todo al frente' }]
          : [{ role: 'close', label: 'Cerrar' }]),
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Abrir portal…',
          click: () => currentWin()?.loadURL(PORTAL_URL),
        },
        {
          label: 'Soporte RENACE',
          click: () => shell.openExternal('https://renace.tech/contacto'),
        },
        {
          label: 'Estado del servicio',
          click: () => shell.openExternal('https://renace.tech'),
        },
        { type: 'separator' },
        {
          label: 'Si ves pantalla negra / CSRF…',
          click: async () => {
            await clearRenaceCookies();
            currentWin()?.loadURL(PORTAL_URL);
            dialog.showMessageBox({
              type: 'info',
              title: 'Sesión reiniciada',
              message: 'Se limpiaron cookies de RENACE y se abrió el portal.',
              detail: 'Vuelve a iniciar sesión. Si el error CSRF vuelve, actualiza la app tras el próximo deploy.',
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function attachWindowGuards(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowed(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowed(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Recover from Odoo CSRF / blank error pages
  win.webContents.on('page-title-updated', (_e, title) => {
    const t = String(title || '');
    if (/400 Bad Request|Session expired|invalid CSRF/i.test(t)) {
      win.setTitle('RENACE Portal — error de sesión');
    }
  });

  win.webContents.on('did-finish-load', async () => {
    try {
      const bad = await win.webContents.executeJavaScript(`
        (() => {
          const t = document.title || '';
          const b = (document.body && document.body.innerText) || '';
          return /400 Bad Request|Session expired|invalid CSRF/i.test(t + ' ' + b);
        })()
      `);
      if (bad) {
        const { response } = await dialog.showMessageBox(win, {
          type: 'warning',
          title: 'Sesión Odoo inválida',
          message: 'Odoo rechazó la sesión (CSRF).',
          detail: 'Esto suele pasar tras un SSO fallido. ¿Volver al portal y limpiar cookies?',
          buttons: ['Volver al portal', 'Quedarme aquí'],
          defaultId: 0,
          cancelId: 1,
        });
        if (response === 0) {
          await clearRenaceCookies();
          win.loadURL(PORTAL_URL);
        }
      }
    } catch (_) {
      /* ignore */
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#060b14',
    title: 'RENACE Portal',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:renace-portal',
    },
  });

  attachWindowGuards(win);
  win.loadURL(PORTAL_URL);
  return win;
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
