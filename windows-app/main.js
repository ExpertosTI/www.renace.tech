/**
 * RENACE Windows App - Main Process
 * Electron app that wraps the RENACE portal with SSO support
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Configuración
const CONFIG = {
  portalUrl: 'https://renace.tech/portal',
  userAgent: 'RENACE-App/1.0.0 (Windows; Electron)',
  minWidth: 1024,
  minHeight: 768
};

let mainWindow = null;
let splashWindow = null;

// Verificar si es primera ejecución
function isFirstRun() {
  const flagPath = path.join(app.getPath('userData'), '.first-run');
  if (!fs.existsSync(flagPath)) {
    fs.writeFileSync(flagPath, new Date().toISOString());
    return true;
  }
  return false;
}

// Crear ventana de splash
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'));
  
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// Crear ventana principal
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: CONFIG.minWidth,
    minHeight: CONFIG.minHeight,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'RENACE App',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      userAgent: CONFIG.userAgent
    }
  });

  // Cargar el portal
  mainWindow.loadURL(CONFIG.portalUrl, {
    userAgent: CONFIG.userAgent
  });

  // Manejar eventos de navegación
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Permitir navegación dentro de renace.tech y subdominios
    if (url.includes('renace.tech') || url.includes('localhost')) {
      return;
    }
    
    // Para URLs externas, abrir en navegador por defecto
    event.preventDefault();
    shell.openExternal(url);
  });

  // Manejar nuevas ventanas
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    // Cerrar splash
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    
    mainWindow.show();
    
    // Mostrar bienvenida en primera ejecución
    if (isFirstRun()) {
      mainWindow.webContents.executeJavaScript(`
        if (window.showFirstRunDialog) window.showFirstRunDialog();
      `).catch(() => {});
    }
  });

  // Manejar cierre
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Atajos de teclado para desarrollo
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'f12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
      event.preventDefault();
    }
  });
}

// Inicialización de la app
app.whenReady().then(() => {
  createSplashWindow();
  
  // Pequeña demora para mostrar el splash
  setTimeout(() => {
    createMainWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Cerrar cuando todas las ventanas estén cerradas (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('check-for-updates', async () => {
  // TODO: Implementar verificación de actualizaciones
  return { hasUpdate: false, version: app.getVersion() };
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Manejar protocolo renace://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('renace', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('renace');
}

// Manejar URLs del protocolo
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.focus();
    // Parsear token SSO de la URL
    const tokenMatch = url.match(/token=([^&]+)/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      mainWindow.webContents.executeJavaScript(`
        if (window.handleSSOToken) window.handleSSOToken('${token}');
      `).catch(() => {});
    }
  }
});
