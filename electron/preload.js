const { contextBridge, ipcRenderer } = require('electron');

/**
 * Lekvanta Desktop Secure Bridge
 * Exposes isolated, audited APIs to renderer without exposing Node internals or secrets.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // App & System Info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getDatabaseInfo: () => ipcRenderer.invoke('db:info'),

  // Database Backup & Restore
  backupDatabase: (customDestPath) => ipcRenderer.invoke('db:backup', customDestPath),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),

  // Printer Management & Thermal POS
  getPrinters: () => ipcRenderer.invoke('printers:get'),
  printThermal: (options) => ipcRenderer.invoke('print:thermal', options),
  printDocument: (options) => ipcRenderer.invoke('print:document', options),

  // PDF Export
  savePDF: (options) => ipcRenderer.invoke('pdf:save', options),

  // Local Application Settings
  getAppSettings: () => ipcRenderer.invoke('settings:get'),
  saveAppSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // System Utilities
  openPath: (filePath) => ipcRenderer.invoke('system:open-path', filePath),
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  openLogFile: () => ipcRenderer.invoke('system:open-log-file'),
});

