/**
 * RENACE Windows App - Preload Script
 * Expone APIs seguras al renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// APIs expuestas al frontend
contextBridge.exposeInMainWorld('renaceAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Dialogs
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // SSO
  onSSOReady: (callback) => {
    ipcRenderer.on('sso-ready', (event, data) => callback(data));
  }
});

// Marcar que estamos en la app nativa
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('renace-app');
});
