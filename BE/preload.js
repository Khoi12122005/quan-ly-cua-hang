const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  navigateToApp: () => ipcRenderer.send('navigate-to-app'),
  navigateToLogin: () => ipcRenderer.send('navigate-to-login'),

  register: (data) => ipcRenderer.invoke('auth-register', data),
  login: (data) => ipcRenderer.invoke('auth-login', data),
  changePassword: (data) => ipcRenderer.invoke('auth-change-password', data),

  getProducts: () => ipcRenderer.invoke('products-get-all'),
  addProduct: (p) => ipcRenderer.invoke('products-add', p),
  updateProduct: (p) => ipcRenderer.invoke('products-update', p),
  deleteProduct: (id) => ipcRenderer.invoke('products-delete', id),

  createSale: (data) => ipcRenderer.invoke('sales-create', data),
  getSales: () => ipcRenderer.invoke('sales-get-all'),
  getSaleDetail: (id) => ipcRenderer.invoke('sales-get-detail', id),

  getDashboardStats: () => ipcRenderer.invoke('dashboard-stats'),

  exportBackup: () => ipcRenderer.invoke('backup-export'),
  importBackup: () => ipcRenderer.invoke('backup-import'),

  exportExcel: (data) => ipcRenderer.invoke('export-excel', data),

  pickImage: () => ipcRenderer.invoke('pick-image'),
});
