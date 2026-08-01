'use strict';

const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Puente de notificaciones en páginas remotas (Odoo) — sin denegar push/toast
try {
  if (!location.href.startsWith('file:')) {
    webFrame.executeJavaScript(`(() => {
    if (window.__renaceNotifyBridge) return;
    window.__renaceNotifyBridge = true;
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
    saveInstance: (payload) => ipcRenderer.invoke('renace:instance-save', payload),
    saveAndOpenInstance: (payload) => ipcRenderer.invoke('renace:instance-save-open', payload),
    openPortal: () => ipcRenderer.invoke('renace:open-portal'),
    openSetup: () => ipcRenderer.invoke('renace:open-setup'),
    getPosStatus: () => ipcRenderer.invoke('renace:pos-status'),
    getMode: () => ipcRenderer.invoke('renace:mode-get'),
    setMode: (mode) => ipcRenderer.invoke('renace:mode-set', mode),
    getKeymap: () => ipcRenderer.invoke('renace:keymap-get'),
    setKeymap: (partial) => ipcRenderer.invoke('renace:keymap-set', partial),
    submitTechUnlock: (password) => ipcRenderer.send('renace:tech-password', String(password || '')),
    cancelTechUnlock: () => ipcRenderer.send('renace:tech-password-cancel'),
    winClose: () => ipcRenderer.send('renace:win-close'),
    winMin: () => ipcRenderer.send('renace:win-min'),
    winMax: () => ipcRenderer.send('renace:win-max'),
    zoomGet: () => ipcRenderer.invoke('renace:zoom-get'),
    zoomSet: (f) => ipcRenderer.invoke('renace:zoom-set', f),
    zoomIn: () => ipcRenderer.invoke('renace:zoom-in'),
    zoomOut: () => ipcRenderer.invoke('renace:zoom-out'),
    zoomReset: () => ipcRenderer.invoke('renace:zoom-reset'),
    ensurePosZoom: () => ipcRenderer.invoke('renace:ensure-pos-zoom'),
    leavePosZoom: () => ipcRenderer.invoke('renace:leave-pos-zoom'),
    listStaff: () => ipcRenderer.invoke('renace:staff-public-list'),
    staffPublicList: () => ipcRenderer.invoke('renace:staff-public-list'),
    staffTechList: () => ipcRenderer.invoke('renace:staff-tech-list'),
    staffHas: () => ipcRenderer.invoke('renace:staff-has'),
    staffUpsert: (payload) => ipcRenderer.invoke('renace:staff-upsert', payload),
    upsertStaff: (payload) => ipcRenderer.invoke('renace:staff-upsert', payload),
    staffRemove: (id) => ipcRenderer.invoke('renace:staff-remove', id),
    removeStaff: (id) => ipcRenderer.invoke('renace:staff-remove', id),
    staffSetDefault: (id) => ipcRenderer.invoke('renace:staff-set-default', id),
    staffGetDefault: () => ipcRenderer.invoke('renace:staff-get-default'),
    staffLogin: (id, pin, opts) => ipcRenderer.invoke('renace:staff-login', id, pin, opts || {}),
    openStaffLogin: () => ipcRenderer.invoke('renace:staff-open'),
    notify: (payload) => ipcRenderer.invoke('renace:notify', payload || {}),
    techAction: (action) => ipcRenderer.invoke('renace:tech-action', String(action || '')),
  });
} catch (_) {
  // reload: ya expuesto
}
