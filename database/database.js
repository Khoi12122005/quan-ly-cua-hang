// database.js - SQLite Database Layer (better-sqlite3)
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

let db;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'shop-manager.db');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'retailpro_salt_2024').digest('hex');
}

// ─── Init ──────────────────────────────────────────────────────────────────
function init() {
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cost_price REAL DEFAULT 0,
      price REAL NOT NULL,
      category TEXT DEFAULT 'Khác',
      image TEXT DEFAULT '',
      quantity REAL DEFAULT 0,
      unit TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT DEFAULT (datetime('now', 'localtime')),
      total REAL NOT NULL,
      note TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      unit TEXT DEFAULT '',
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );
  `);

  try { db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"'); } catch (e) {}
  try { db.exec('ALTER TABLE products ADD COLUMN unit TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE sale_items ADD COLUMN unit TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE sale_items ADD COLUMN cost_price REAL DEFAULT 0'); } catch (e) {}

  // Seed default admin if no users
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
      'admin', hashPassword('admin123'), 'admin'
    );
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────
function createUser(username, password) {
  try {
    if (!username || !password) return { success: false, message: 'Vui lòng nhập đầy đủ thông tin' };
    if (username.length < 3) return { success: false, message: 'Tên đăng nhập tối thiểu 3 ký tự' };
    if (password.length < 6) return { success: false, message: 'Mật khẩu tối thiểu 6 ký tự' };
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashPassword(password));
    return { success: true, message: 'Đăng ký thành công!' };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { success: false, message: 'Tên đăng nhập đã tồn tại' };
    return { success: false, message: e.message };
  }
}

function loginUser(username, password) {
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
      .get(username, hashPassword(password));
    if (!user) return { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' };
    return { success: true, username: user.username, id: user.id, role: user.role };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function changePassword(username, oldPassword, newPassword) {
  try {
    if (!newPassword || newPassword.length < 6) return { success: false, message: 'Mật khẩu mới tối thiểu 6 ký tự' };
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
      .get(username, hashPassword(oldPassword));
    if (!user) return { success: false, message: 'Mật khẩu hiện tại không đúng' };
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hashPassword(newPassword), username);
    return { success: true, message: 'Đổi mật khẩu thành công!' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ─── Products ──────────────────────────────────────────────────────────────
function getProducts() {
  return db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
}

function addProduct({ name, cost_price, price, category, image, quantity, unit }) {
  try {
    if (!name || !name.trim()) return { success: false, message: 'Tên sản phẩm không được trống' };
    if (isNaN(price) || price < 0) return { success: false, message: 'Giá bán không hợp lệ' };
    if (isNaN(cost_price) || cost_price < 0) cost_price = 0;
    if (Number(cost_price) > Number(price)) return { success: false, message: 'Giá vốn không thể lớn hơn giá bán' };
    
    let qty = Number(quantity);
    if (isNaN(qty) || qty < 0) return { success: false, message: 'Số lượng không hợp lệ' };
    
    // Validate Decimal constraints
    const qtyStr = qty.toString();
    if (qtyStr.includes('.') && qtyStr.split('.')[1].length > 2) {
      return { success: false, message: 'Số lượng tối đa 2 chữ số thập phân' };
    }
    if (category !== 'Gạo' && !Number.isInteger(qty)) {
      return { success: false, message: 'Danh mục này không hỗ trợ số lẻ' };
    }

    if (!unit || !unit.trim()) return { success: false, message: 'Đơn vị không được trống' };
    
    if (category === 'Gạo') unit = 'kg';

    const result = db.prepare(
      'INSERT INTO products (name, cost_price, price, category, image, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name.trim(), Number(cost_price), Number(price), category || 'Khác', image || '', qty, unit.trim());
    return { success: true, id: result.lastInsertRowid, message: 'Thêm sản phẩm thành công!' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function updateProduct({ id, name, cost_price, price, category, image, quantity, unit }) {
  try {
    if (!name || !name.trim()) return { success: false, message: 'Tên sản phẩm không được trống' };
    if (isNaN(price) || price < 0) return { success: false, message: 'Giá bán không hợp lệ' };
    if (isNaN(cost_price) || cost_price < 0) cost_price = 0;
    if (Number(cost_price) > Number(price)) return { success: false, message: 'Giá vốn không thể lớn hơn giá bán' };
    
    let qty = Number(quantity);
    if (isNaN(qty) || qty < 0) return { success: false, message: 'Số lượng không hợp lệ' };
    
    // Validate Decimal constraints
    const qtyStr = qty.toString();
    if (qtyStr.includes('.') && qtyStr.split('.')[1].length > 2) {
      return { success: false, message: 'Số lượng tối đa 2 chữ số thập phân' };
    }
    if (category !== 'Gạo' && !Number.isInteger(qty)) {
      return { success: false, message: 'Danh mục này không hỗ trợ số lẻ' };
    }

    if (!unit || !unit.trim()) return { success: false, message: 'Đơn vị không được trống' };
    
    if (category === 'Gạo') unit = 'kg';

    db.prepare(
      'UPDATE products SET name=?, cost_price=?, price=?, category=?, image=?, quantity=?, unit=? WHERE id=?'
    ).run(name.trim(), Number(cost_price), Number(price), category || 'Khác', image || '', qty, unit.trim(), id);
    return { success: true, message: 'Cập nhật thành công!' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function deleteProduct(id) {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return { success: true, message: 'Đã xóa sản phẩm!' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ─── Sales ─────────────────────────────────────────────────────────────────
function createSale(items, total) {
  try {
    if (!items || items.length === 0) return { success: false, message: 'Không có sản phẩm' };

    // Check stock
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
      if (!product) return { success: false, message: `Sản phẩm không tồn tại` };
      if (product.quantity < item.quantity) {
        return { success: false, message: `"${product.name}" không đủ tồn kho (còn ${product.quantity})` };
      }
    }

    const insertSale = db.transaction(() => {
      const saleResult = db.prepare('INSERT INTO sales (total) VALUES (?)').run(total);
      const saleId = saleResult.lastInsertRowid;

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        db.prepare(
          'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(saleId, item.productId, product.name, item.quantity, item.price, product.cost_price, product.unit || '');
        db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(item.quantity, item.productId);
      }
      return saleId;
    });

    const saleId = insertSale();
    return { success: true, saleId, message: 'Tạo đơn hàng thành công!' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getSales() {
  return db.prepare('SELECT * FROM sales ORDER BY date DESC').all().map(sale => {
    const cost = db.prepare('SELECT COALESCE(SUM(quantity * cost_price), 0) as c FROM sale_items WHERE sale_id=?').get(sale.id).c;
    return { ...sale, cost, profit: sale.total - cost };
  });
}

function getSaleDetail(saleId) {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
  if (!sale) return null;
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
  return { ...sale, items };
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function getDashboardStats() {
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales').get().total;
  
  const totalCostObj = db.prepare('SELECT COALESCE(SUM(quantity * cost_price), 0) as cost FROM sale_items').get();
  const totalCost = totalCostObj.cost;
  const totalProfit = totalRevenue - totalCost;

  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity > 0 AND quantity < 5').get().count;
  const outOfStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity = 0').get().count;
  
  const recentSales = db.prepare('SELECT * FROM sales ORDER BY date DESC LIMIT 10').all().map(sale => {
    const cost = db.prepare('SELECT COALESCE(SUM(quantity * cost_price), 0) as c FROM sale_items WHERE sale_id=?').get(sale.id).c;
    return { ...sale, cost, profit: sale.total - cost };
  });

  const todayRevenue = db.prepare(
    "SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date(date) = date('now', 'localtime')"
  ).get().total;
  
  const todayCost = db.prepare(
    "SELECT COALESCE(SUM(i.quantity * i.cost_price), 0) as cost FROM sale_items i JOIN sales s ON i.sale_id = s.id WHERE date(s.date) = date('now', 'localtime')"
  ).get().cost;
  const todayProfit = todayRevenue - todayCost;

  // Revenue by day (last 7 days)
  const revenueByDay = db.prepare(`
    SELECT 
      date(s.date) as day, 
      SUM(s.total) as revenue,
      SUM(i.quantity * i.cost_price) as cost
    FROM sales s
    LEFT JOIN sale_items i ON s.id = i.sale_id
    WHERE date(s.date) >= date('now', '-6 days', 'localtime')
    GROUP BY day ORDER BY day ASC
  `).all().map(r => ({ ...r, profit: r.revenue - r.cost }));

  return { totalRevenue, totalCost, totalProfit, totalProducts, lowStock, outOfStock, recentSales, todayRevenue, todayCost, todayProfit, revenueByDay };
}

// ─── Backup & Restore ──────────────────────────────────────────────────────
function exportBackup() {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    products: db.prepare('SELECT * FROM products').all(),
    sales: db.prepare('SELECT * FROM sales').all(),
    sale_items: db.prepare('SELECT * FROM sale_items').all(),
  };
}

function importBackup(data) {
  if (!data.version || !data.products || !data.sales || !data.sale_items) {
    throw new Error('File backup không hợp lệ hoặc bị hỏng');
  }

  const restore = db.transaction(() => {
    db.prepare('DELETE FROM sale_items').run();
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM products').run();

    for (const p of data.products) {
      db.prepare('INSERT INTO products (id, name, cost_price, price, category, image, quantity, unit, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(p.id, p.name, p.cost_price || 0, p.price, p.category, p.image, p.quantity, p.unit || '', p.created_at);
    }
    for (const s of data.sales) {
      db.prepare('INSERT INTO sales (id, date, total, note) VALUES (?,?,?,?)').run(s.id, s.date, s.total, s.note || '');
    }
    for (const si of data.sale_items) {
      db.prepare('INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, price, cost_price, unit) VALUES (?,?,?,?,?,?,?,?)')
        .run(si.id, si.sale_id, si.product_id, si.product_name, si.quantity, si.price, si.cost_price || 0, si.unit || '');
    }
  });

  restore();
}

module.exports = {
  init,
  createUser, loginUser, changePassword,
  getProducts, addProduct, updateProduct, deleteProduct,
  createSale, getSales, getSaleDetail,
  getDashboardStats,
  exportBackup, importBackup,
};
