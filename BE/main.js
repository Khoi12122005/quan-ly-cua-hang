const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // BE/preload.js
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    show: false,
    backgroundColor: '#f8fafc',
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'FE', 'pages', 'login.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  const db = require('../database/database');
  db.init();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

ipcMain.on('navigate-to-app', () => {
  mainWindow.loadFile(path.join(__dirname, '..', 'FE', 'pages', 'app.html'));
});
ipcMain.on('navigate-to-login', () => {
  mainWindow.loadFile(path.join(__dirname, '..', 'FE', 'pages', 'login.html'));
});

const getDb = () => require('../database/database');

ipcMain.handle('auth-register', (event, { username, password }) => getDb().createUser(username, password));
ipcMain.handle('auth-login', (event, { username, password }) => getDb().loginUser(username, password));
ipcMain.handle('auth-change-password', (event, { username, oldPassword, newPassword }) => getDb().changePassword(username, oldPassword, newPassword));

ipcMain.handle('products-get-all', () => getDb().getProducts());
ipcMain.handle('products-add', (event, product) => getDb().addProduct(product));
ipcMain.handle('products-update', (event, product) => getDb().updateProduct(product));
ipcMain.handle('products-delete', (event, id) => getDb().deleteProduct(id));

ipcMain.handle('sales-create', (event, { items, total }) => getDb().createSale(items, total));
ipcMain.handle('sales-get-all', () => getDb().getSales());
ipcMain.handle('sales-get-detail', (event, saleId) => getDb().getSaleDetail(saleId));

ipcMain.handle('dashboard-stats', () => getDb().getDashboardStats());

ipcMain.handle('backup-export', async () => {
  const data = getDb().exportBackup();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Lưu file backup',
    defaultPath: `backup_${dateStr}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!filePath) return { success: false, message: 'Đã hủy' };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true, message: `Đã lưu: ${filePath}` };
});

ipcMain.handle('backup-import', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn file backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (!filePaths || filePaths.length === 0) return { success: false, message: 'Đã hủy' };
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(raw);
    getDb().importBackup(data);
    return { success: true, message: 'Khôi phục thành công!' };
  } catch (e) {
    return { success: false, message: 'File không hợp lệ: ' + e.message };
  }
});

ipcMain.handle('export-excel', async (event, { type, role }) => {
  const XLSX = require('xlsx');
  let data, filename;
  if (type === 'products') {
    data = getDb().getProducts().map(p => {
      const row = { 'Tên sản phẩm': p.name, 'Danh mục': p.category };
      if (role === 'admin') {
        row['Giá vốn (VNĐ)'] = p.cost_price || 0;
      }
      row['Giá bán (VNĐ)'] = p.price;
      row['Tồn kho'] = p.quantity;
      return row;
    });
    filename = 'san-pham.xlsx';
  } else {
    data = getDb().getSales().map(s => {
      const row = {
        'Mã GD': `GD${String(s.id).padStart(4, '0')}`,
        'Thời gian': s.date,
        'Doanh thu (VNĐ)': s.total,
      };
      if (role === 'admin') {
        row['Tổng chi phí (VNĐ)'] = s.cost || 0;
        row['Lợi nhuận (VNĐ)'] = s.profit || 0;
      }
      return row;
    });
    filename = 'doanh-thu.xlsx';
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Lưu file Excel', defaultPath: filename,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (!filePath) return { success: false, message: 'Đã hủy' };
  XLSX.writeFile(wb, filePath);
  return { success: true, message: `Đã xuất: ${filePath}` };
});

ipcMain.handle('pick-image', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn ảnh sản phẩm',
    filters: [{ name: 'Ảnh', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile'],
  });
  if (!filePaths || filePaths.length === 0) return null;
  const buf = fs.readFileSync(filePaths[0]);
  const ext = path.extname(filePaths[0]).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${buf.toString('base64')}`;
});
