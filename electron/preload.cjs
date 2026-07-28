'use strict';

const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Stub push/notifications before page scripts (silencia toast de Odoo en Electron)
try {
  webFrame.executeJavaScript(`(() => {
    try {
      if (window.Notification) {
        window.Notification.requestPermission = async () => 'denied';
        Object.defineProperty(window.Notification, 'permission', { get: () => 'denied' });
      }
    } catch (_) {}
    try {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        get() { return undefined; },
      });
    } catch (_) {}
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const orig = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (desc) => {
          if (desc && (desc.name === 'notifications' || desc.name === 'push')) {
            return Promise.resolve({ state: 'denied', onchange: null });
          }
          return orig(desc);
        };
      }
    } catch (_) {}
  })();`, true).catch(() => {});
} catch (_) {}

contextBridge.exposeInMainWorld('renaceDesktop', {
  isDesktop: true,
  keychainAvailable: () => ipcRenderer.invoke('renace:keychain-available'),
  saveSecret: (key, value) => ipcRenderer.invoke('renace:secret-set', key, value),
  getSecret: (key) => ipcRenderer.invoke('renace:secret-get', key),
  clearSecrets: () => ipcRenderer.invoke('renace:secret-clear'),
  recordVisit: (url) => ipcRenderer.invoke('renace:usage-record', url || location.href),
  topDestinations: (limit) => ipcRenderer.invoke('renace:usage-top', limit || 3),
});
