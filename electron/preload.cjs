'use strict';

const { contextBridge, ipcRenderer, webFrame } = require('electron');

// No stub push en file:// (setup) — evita interferir con la pantalla local
try {
  if (!location.href.startsWith('file:')) {
    webFrame.executeJavaScript(`(() => {
    if (window.__renacePushStub) return;
    window.__renacePushStub = true;
    const noop = () => {};
    const fakePermissionStatus = (state, name) => ({
      state: state || 'denied',
      name: name || 'notifications',
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    });
    const fakeReg = {
      scope: '/', active: null, installing: null, waiting: null,
      pushManager: {
        getSubscription: () => Promise.resolve(null),
        permissionState: () => Promise.resolve('denied'),
        subscribe: () => Promise.reject(new DOMException('Push disabled', 'NotAllowedError')),
      },
      unregister: () => Promise.resolve(true),
      update: () => Promise.resolve(undefined),
      addEventListener: noop, removeEventListener: noop,
    };
    const fakeSW = {
      controller: null,
      ready: Promise.resolve(fakeReg),
      register: () => Promise.resolve(fakeReg),
      getRegistration: () => Promise.resolve(undefined),
      getRegistrations: () => Promise.resolve([]),
      addEventListener: noop, removeEventListener: noop, startMessages: noop,
    };
    try {
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: () => fakeSW });
    } catch (_) {}
    try {
      if (window.Notification) {
        try {
          Object.defineProperty(window.Notification, 'permission', { configurable: true, get: () => 'denied' });
        } catch (_) {}
        window.Notification.requestPermission = () => Promise.resolve('denied');
      }
    } catch (_) {}
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const orig = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (desc) => {
          const name = desc && desc.name;
          if (name === 'notifications' || name === 'push' || name === 'push-messaging') {
            return Promise.resolve(fakePermissionStatus('denied', name));
          }
          return orig(desc).catch(() => fakePermissionStatus('prompt', name));
        };
      }
    } catch (_) {}
  })();`, true).catch(() => {});
  }
} catch (_) {}

try {
  contextBridge.exposeInMainWorld('renaceDesktop', {
    isDesktop: true,
    keychainAvailable: () => ipcRenderer.invoke('renace:keychain-available'),
    saveSecret: (key, value) => ipcRenderer.invoke('renace:secret-set', key, value),
    getSecret: (key) => ipcRenderer.invoke('renace:secret-get', key),
    clearSecrets: () => ipcRenderer.invoke('renace:secret-clear'),
    recordVisit: (url) => ipcRenderer.invoke('renace:usage-record', url || location.href),
    topDestinations: (limit) => ipcRenderer.invoke('renace:usage-top', limit || 3),
    openDevTools: () => ipcRenderer.send('renace:open-devtools'),
    getInstance: () => ipcRenderer.invoke('renace:instance-get'),
    setInstance: (payload) => ipcRenderer.invoke('renace:instance-set', payload),
    clearInstance: () => ipcRenderer.invoke('renace:instance-clear'),
    openInstance: () => ipcRenderer.invoke('renace:instance-open'),
    saveAndOpenInstance: (payload) => ipcRenderer.invoke('renace:instance-save-open', payload),
    openPortal: () => ipcRenderer.invoke('renace:open-portal'),
    openSetup: () => ipcRenderer.invoke('renace:open-setup'),
    getPosStatus: () => ipcRenderer.invoke('renace:pos-status'),
    getMode: () => ipcRenderer.invoke('renace:mode-get'),
    setMode: (mode) => ipcRenderer.invoke('renace:mode-set', mode),
    getKeymap: () => ipcRenderer.invoke('renace:keymap-get'),
    setKeymap: (partial) => ipcRenderer.invoke('renace:keymap-set', partial),
  });
} catch (_) {
  // reload: ya expuesto
}
