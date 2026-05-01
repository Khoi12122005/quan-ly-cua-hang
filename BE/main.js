const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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
      preload: path.join(__dirname, 'preload.js'),
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
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── WINDOW CONTROLS ───

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

// ─── AUTH ───

ipcMain.handle('auth-register', (event, { username, password }) => getDb().createUser(username, password));
ipcMain.handle('auth-login', (event, { username, password }) => getDb().loginUser(username, password));
ipcMain.handle('auth-change-password', (event, { username, oldPassword, newPassword }) => getDb().changePassword(username, oldPassword, newPassword));

// ─── PRODUCTS ───

ipcMain.handle('products-get-all', () => getDb().getProducts());
ipcMain.handle('products-add', (event, product) => getDb().addProduct(product));
ipcMain.handle('products-update', (event, product) => getDb().updateProduct(product));
ipcMain.handle('products-delete', (event, id) => getDb().deleteProduct(id));

// ─── STOCK IMPORT ───

ipcMain.handle('stock-import', (event, data) => getDb().stockImport(data));
ipcMain.handle('stock-imports-get-all', () => getDb().getStockImports());

// ─── SALES ───

ipcMain.handle('sales-create', (event, { items, total }) => getDb().createSale(items, total));
ipcMain.handle('sales-get-all', () => getDb().getSales());
ipcMain.handle('sales-get-detail', (event, saleId) => getDb().getSaleDetail(saleId));

// ─── DASHBOARD ───

ipcMain.handle('dashboard-stats', () => getDb().getDashboardStats());

// ─── REPORTS ───

ipcMain.handle('report-data', (event, { fromDate, toDate }) => getDb().getReportData(fromDate, toDate));

// ─── BACKUP / RESTORE (SAFE) ───

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
  return { success: true, message: `Đã lưu backup tại:\n${filePath}` };
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
    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      return { success: false, message: 'File không phải JSON hợp lệ. Vui lòng chọn đúng file backup.' };
    }

    const validateError = getDb().validateBackupData(data);
    if (validateError) {
      return { success: false, message: validateError };
    }

    // Auto-backup before restore
    const autoBackupData = getDb().exportBackup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userDataPath = app.getPath('userData');
    const autoBackupDir = path.join(userDataPath, 'auto-backups');
    if (!fs.existsSync(autoBackupDir)) fs.mkdirSync(autoBackupDir, { recursive: true });
    const autoBackupPath = path.join(autoBackupDir, `backup_before_restore_${timestamp}.json`);
    fs.writeFileSync(autoBackupPath, JSON.stringify(autoBackupData, null, 2), 'utf-8');

    getDb().importBackup(data);
    return { success: true, message: 'Khôi phục dữ liệu thành công!\n\nDữ liệu cũ đã được tự động sao lưu.' };
  } catch (e) {
    return { success: false, message: 'Lỗi khôi phục: ' + e.message };
  }
});

// ─── EXCEL EXPORT ───

ipcMain.handle('export-excel', async (event, { type, role, reportData }) => {
  const XLSX = require('xlsx');
  let data, filename;

  if (type === 'products') {
    data = getDb().getProducts().map(p => {
      const row = { 'Tên sản phẩm': p.name, 'Danh mục': p.category };
      if (role === 'admin') row['Giá vốn (VNĐ)'] = p.cost_price || 0;
      row['Giá bán (VNĐ)'] = p.price;
      row['Tồn kho'] = p.quantity;
      row['Đơn vị'] = p.unit || '';
      return row;
    });
    filename = 'san-pham.xlsx';
  } else if (type === 'report' && reportData) {
    data = reportData.daily.map(d => {
      const row = { 'Ngày': d.day, 'Số đơn': d.count, 'Doanh thu (VNĐ)': d.revenue };
      if (role === 'admin') {
        row['Chi phí (VNĐ)'] = d.cost;
        row['Lợi nhuận (VNĐ)'] = d.profit;
      }
      return row;
    });
    data.push({}); // Empty row
    const totalRow = { 'Ngày': 'TỔNG CỘNG', 'Số đơn': reportData.totalOrders, 'Doanh thu (VNĐ)': reportData.totalRevenue };
    if (role === 'admin') {
      totalRow['Chi phí (VNĐ)'] = reportData.totalCost;
      totalRow['Lợi nhuận (VNĐ)'] = reportData.totalProfit;
    }
    data.push(totalRow);
    filename = 'bao-cao.xlsx';
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
    const totalRevenue = getDb().getSales().reduce((sum, s) => sum + s.total, 0);
    const totalCost = getDb().getSales().reduce((sum, s) => sum + (s.cost || 0), 0);
    const totalProfit = getDb().getSales().reduce((sum, s) => sum + (s.profit || 0), 0);
    data.push({}); // Empty row
    const totalRow = { 'Mã GD': 'TỔNG CỘNG', 'Doanh thu (VNĐ)': totalRevenue };
    if (role === 'admin') {
      totalRow['Tổng chi phí (VNĐ)'] = totalCost;
      totalRow['Lợi nhuận (VNĐ)'] = totalProfit;
    }
    data.push(totalRow);
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
  return { success: true, message: `Đã xuất file tại:\n${filePath}` };
});

// ─── IMAGE PICKER ───

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

// ─── AUTO UPDATE ───

function initAutoUpdater() {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      sendUpdateStatus('checking');
    });

    autoUpdater.on('update-available', (info) => {
      sendUpdateStatus('available', { version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      sendUpdateStatus('not-available');
    });

    autoUpdater.on('download-progress', (progress) => {
      sendUpdateStatus('downloading', { percent: Math.round(progress.percent) });
    });

    autoUpdater.on('update-downloaded', () => {
      sendUpdateStatus('ready');
    });

    autoUpdater.on('error', (err) => {
      sendUpdateStatus('error', { message: err.message });
    });

    // Check after 3 seconds
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 3000);

    ipcMain.on('update-download', () => {
      autoUpdater.downloadUpdate().catch(() => {});
    });

    ipcMain.on('update-install', () => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.on('update-check', () => {
      autoUpdater.checkForUpdates().catch(() => {});
    });
  } catch (e) {
    // electron-updater not available in dev mode — silently skip
  }
}

function sendUpdateStatus(status, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, ...data });
  }
}
