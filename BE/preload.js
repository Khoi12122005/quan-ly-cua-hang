// preload.js - Context Bridge (secure IPC bridge)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Navigation
  navigateToApp: () => ipcRenderer.send('navigate-to-app'),
  navigateToLogin: () => ipcRenderer.send('navigate-to-login'),

  // Auth
  register: (data) => ipcRenderer.invoke('auth-register', data),
  login: (data) => ipcRenderer.invoke('auth-login', data),
  changePassword: (data) => ipcRenderer.invoke('auth-change-password', data),

  // Products
  getProducts: () => ipcRenderer.invoke('products-get-all'),
  addProduct: (p) => ipcRenderer.invoke('products-add', p),
  updateProduct: (p) => ipcRenderer.invoke('products-update', p),
  deleteProduct: (id) => ipcRenderer.invoke('products-delete', id),

  // Sales
  createSale: (data) => ipcRenderer.invoke('sales-create', data),
  getSales: () => ipcRenderer.invoke('sales-get-all'),
  getSaleDetail: (id) => ipcRenderer.invoke('sales-get-detail', id),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard-stats'),

  // Backup
  exportBackup: () => ipcRenderer.invoke('backup-export'),
  importBackup: () => ipcRenderer.invoke('backup-import'),

  // Excel
  exportExcel: (data) => ipcRenderer.invoke('export-excel', data),

  // Image picker
  pickImage: () => ipcRenderer.invoke('pick-image'),
});
