const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
let currentUser = null;
try { currentUser = JSON.parse(sessionStorage.getItem('user')); } catch {}
if (!currentUser) { api.navigateToLogin(); }
else {
  if (currentUser.username === 'admin' && !currentUser.role) {
    currentUser.role = 'admin'; // upgrade old session
    sessionStorage.setItem('user', JSON.stringify(currentUser));
  }
  document.getElementById('user-name-display').textContent = currentUser.username;
  document.getElementById('user-avatar').textContent = currentUser.username[0].toUpperCase();
  document.getElementById('settings-username') && (document.getElementById('settings-username').value = currentUser.username);
  if (currentUser.role === 'admin') {
    document.body.classList.add('role-admin');
  }
}
function doLogout() {
  if (confirm('Bạn có chắc muốn đăng xuất?')) {
    sessionStorage.removeItem('user');
    api.navigateToLogin();
  }
}
const pageTitles = { dashboard: 'Dashboard', products: 'Sản phẩm', inventory: 'Tồn kho', 'stock-import': 'Nhập hàng', sales: 'Bán hàng', history: 'Lịch sử', reports: 'Báo cáo', settings: 'Cài đặt' };
let currentView = 'dashboard';
function navigate(view, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + view);
  if (viewEl) viewEl.classList.add('active');
  if (btn) btn.classList.add('active');
  document.getElementById('page-title').textContent = pageTitles[view] || view;
  currentView = view;
  document.getElementById('global-search-box').style.display = view === 'products' ? 'flex' : 'none';
  if (view === 'dashboard') loadDashboard();
  else if (view === 'products') loadProducts();
  else if (view === 'inventory') loadInventory();
  else if (view === 'stock-import') loadStockImport();
  else if (view === 'sales') loadSalesView();
  else if (view === 'history') loadHistory();
  else if (view === 'reports') loadReports();
  else if (view === 'settings') loadSettings();
}
async function loadDashboard() {
  try {
    const s = await api.getDashboardStats();
    document.getElementById('stat-today').textContent = fmt(s.todayRevenue);
    document.getElementById('stat-total-sub').textContent = 'Tổng: ' + fmt(s.totalRevenue);
    document.getElementById('stat-cost-today').textContent = fmt(s.todayCost);
    document.getElementById('stat-cost-total-sub').textContent = 'Tổng: ' + fmt(s.totalCost);
    document.getElementById('stat-profit-today').textContent = fmt(s.todayProfit);
    document.getElementById('stat-profit-today').style.color = s.todayProfit < 0 ? '#ef4444' : (s.todayProfit > 0 ? '#22c55e' : '');
    document.getElementById('stat-profit-total-sub').textContent = 'Tổng: ' + fmt(s.totalProfit);
    document.getElementById('stat-products').textContent = s.totalProducts;
    document.getElementById('stat-lowstock').textContent = s.lowStock;
    document.getElementById('stat-outofstock-sub').textContent = s.outOfStock + ' hết hàng';
    renderChart(s.revenueByDay);
    renderRecentSales(s.recentSales);
  } catch (e) { toast('Lỗi tải dashboard', 'error'); }
}
function renderChart(data) {
  const el = document.getElementById('revenue-chart');
  if (!data || data.length === 0) { el.innerHTML = '<div class="empty-state" style="padding:8px;width:100%">Chưa có dữ liệu</div>'; return; }
  const max = Math.max(...data.map(d => d.revenue), 1);
  const days = ['CN','T2','T3','T4','T5','T6','T7'];
  el.innerHTML = data.map(d => {
    const pct = Math.max(4, Math.round((d.revenue / max) * 100));
    const day = new Date(d.day);
    const label = `${day.getDate()}/${day.getMonth()+1}`;
    return `<div class="chart-bar-col" title="${label}: ${fmt(d.revenue)}">
      <div class="chart-bar" style="height:${pct}%"></div>
      <span class="chart-bar-label">${label}</span>
    </div>`;
  }).join('');
}
function renderRecentSales(sales) {
  const tbody = document.getElementById('recent-sales-table');
  if (!sales || sales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray-400);padding:24px">Chưa có giao dịch</td></tr>'; return;
  }
  tbody.innerHTML = sales.map(s => `
    <tr>
      <td><span class="badge badge-primary">GD${String(s.id).padStart(4,'0')}</span></td>
      <td style="color:var(--gray-500);font-size:12px">${s.date}</td>
      <td><strong>${fmt(s.total)}</strong></td>
      <td><span class="badge badge-success">✓ Hoàn thành</span></td>
    </tr>`).join('');
}
let allProducts = [];
let currentCat = '';
async function loadProducts() {
  try {
    allProducts = await api.getProducts();
    renderProducts(allProducts);
  } catch (e) { toast('Lỗi tải sản phẩm', 'error'); }
}
function getStockBadge(qty) {
  if (qty === 0) return '<span class="badge badge-gray">⬜ Hết hàng</span>';
  if (qty < 5) return '<span class="badge badge-warning">⚠️ Sắp hết</span>';
  return '<span class="badge badge-success">✓ Còn hàng</span>';
}
function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!list || list.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📦</div><h3>Chưa có sản phẩm</h3><p>Nhấn "+ Thêm sản phẩm" để bắt đầu</p></div>'; return;
  }
  grid.innerHTML = list.map(p => {
    const imgHtml = p.image
      ? `<div class="product-img"><img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='<span style=font-size:40px>🏷️</span>'"/></div>`
      : `<div class="product-img"><span style="font-size:40px">🏷️</span></div>`;
    const stockColor = p.quantity === 0 ? 'var(--danger)' : p.quantity < 5 ? 'var(--warning)' : 'var(--success)';
    return `<div class="product-card">
      ${imgHtml}
      <div class="product-info">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span class="product-category">${p.category}</span>
          ${getStockBadge(p.quantity)}
        </div>
        <div class="product-name" title="${p.name}">${p.name}</div>
        <div class="product-price">${fmt(p.price)}/${p.unit || 'khác'}</div>
        <div class="product-cost admin-only" style="font-size:12px;color:var(--gray-500)">Giá vốn: ${fmt(p.cost_price || 0)}</div>
        <div class="product-stock ${p.quantity===0?'out':''}">Tồn: <strong style="color:${stockColor}">${p.quantity} ${p.unit || ''}</strong></div>
      </div>
      <div class="product-actions">
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="editProduct(${p.id})">✏️ Sửa</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}
function filterProducts() {
  const q = document.getElementById('product-search').value.toLowerCase();
  const filtered = allProducts.filter(p =>
    (!currentCat || p.category === currentCat) &&
    (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  );
  renderProducts(filtered);
}
function setCatFilter(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  filterProducts();
}
function handleCategoryChange() {
  const cat = document.getElementById('p-category').value;
  const unit = document.getElementById('p-unit');
  const qty = document.getElementById('p-quantity');
  if (cat === 'Gạo') {
    unit.value = 'kg';
    unit.disabled = true;
    qty.step = 'any';
  } else {
    unit.disabled = false;
    qty.step = '1';
  }
}
function openAddProduct() {
  document.getElementById('modal-product-title').textContent = 'Thêm sản phẩm mới';
  document.getElementById('edit-product-id').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('p-cost-price').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-category').value = 'Gạo';
  document.getElementById('p-quantity').value = '';
  document.getElementById('p-unit').value = 'kg';
  handleCategoryChange();
  calcExpectedProfit();
  clearImage();
  openModal('modal-product');
}
function editProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-product-title').textContent = 'Sửa sản phẩm';
  document.getElementById('edit-product-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-cost-price').value = p.cost_price || 0;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-category').value = p.category;
  document.getElementById('p-quantity').value = p.quantity;
  document.getElementById('p-unit').value = p.unit || 'khác';
  handleCategoryChange();
  calcExpectedProfit();
  if (p.image) setImage(p.image); else clearImage();
  openModal('modal-product');
}
function calcExpectedProfit() {
  const cost = parseFloat(document.getElementById('p-cost-price').value) || 0;
  const price = parseFloat(document.getElementById('p-price').value) || 0;
  const profit = price - cost;
  const el = document.getElementById('p-expected-profit');
  if(el) {
    el.textContent = fmt(profit);
    el.style.color = profit < 0 ? 'var(--danger)' : (profit > 0 ? 'var(--success)' : 'var(--gray-500)');
  }
}
async function saveProduct() {
  const id = document.getElementById('edit-product-id').value;
  const product = {
    name: document.getElementById('p-name').value.trim(),
    cost_price: parseFloat(document.getElementById('p-cost-price').value) || 0,
    price: parseFloat(document.getElementById('p-price').value),
    category: document.getElementById('p-category').value,
    quantity: parseFloat(document.getElementById('p-quantity').value),
    unit: document.getElementById('p-unit').value,
    image: document.getElementById('p-image').value || '',
  };
  if (!product.name) { toast('Vui lòng nhập tên sản phẩm', 'error'); return; }
  if (isNaN(product.price) || product.price < 0) { toast('Giá không hợp lệ', 'error'); return; }
  if (isNaN(product.quantity) || product.quantity < 0) { toast('Số lượng không hợp lệ', 'error'); return; }
  let res;
  if (id) res = await api.updateProduct({ ...product, id: parseInt(id) });
  else res = await api.addProduct(product);
  if (res.success) {
    toast(res.message, 'success');
    closeModal('modal-product');
    loadProducts();
  } else { toast(res.message, 'error'); }
}
async function deleteProduct(id, name) {
  if (!confirm(`Xóa sản phẩm "${name}"?\nThao tác này không thể hoàn tác.`)) return;
  const res = await api.deleteProduct(id);
  if (res.success) { toast(res.message, 'success'); loadProducts(); }
  else toast(res.message, 'error');
}
async function pickImage() {
  const dataUrl = await api.pickImage();
  if (dataUrl) setImage(dataUrl);
}
function setImage(dataUrl) {
  document.getElementById('p-image').value = dataUrl;
  document.getElementById('p-img-placeholder').style.display = 'none';
  const img = document.getElementById('p-img-el');
  img.src = dataUrl; img.style.display = 'block';
}
function clearImage() {
  document.getElementById('p-image').value = '';
  document.getElementById('p-img-placeholder').style.display = 'block';
  const img = document.getElementById('p-img-el');
  img.src = ''; img.style.display = 'none';
}
async function loadInventory() {
  try {
    const products = await api.getProducts();
    const tbody = document.getElementById('inventory-table');
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-400)">Chưa có sản phẩm</td></tr>'; return;
    }
    tbody.innerHTML = products.map(p => {
      let badge, rowStyle = '';
      if (p.quantity === 0) { badge = '<span class="badge badge-danger">Hết hàng</span>'; rowStyle = 'background:#fef2f2'; }
      else if (p.quantity < 5) { badge = '<span class="badge badge-warning">Sắp hết</span>'; rowStyle = 'background:#fffbeb'; }
      else badge = '<span class="badge badge-success">Còn hàng</span>';
      return `<tr style="${rowStyle}">
        <td><strong>${p.name}</strong></td>
        <td><span class="badge badge-gray">${p.category}</span></td>
        <td><strong style="font-size:16px;color:${p.quantity===0?'var(--danger)':p.quantity<5?'#d97706':'var(--success)'}">${p.quantity} ${p.unit || ''}</strong></td>
        <td class="admin-only" style="color:var(--gray-500)">${fmt(p.cost_price || 0)}</td>
        <td>${fmt(p.price)}/${p.unit || 'khác'}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  } catch (e) { toast('Lỗi tải tồn kho', 'error'); }
}
let cart = [];
let saleProducts = [];
async function loadSalesView() {
  try {
    saleProducts = await api.getProducts();
    renderSaleProducts(saleProducts);
    renderCart();
  } catch (e) { toast('Lỗi tải sản phẩm', 'error'); }
}
function filterSaleProducts() {
  const q = document.getElementById('sale-search').value.toLowerCase();
  renderSaleProducts(saleProducts.filter(p => p.name.toLowerCase().includes(q) && p.quantity > 0));
}
function renderSaleProducts(list) {
  const el = document.getElementById('sale-products-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state" style="padding:16px"><p>Không tìm thấy sản phẩm</p></div>'; return;
  }
  el.innerHTML = list.filter(p => p.quantity > 0).map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);background:#fff;cursor:pointer;transition:var(--transition)"
      onclick="addToCart(${p.id})"
      onmouseenter="this.style.borderColor='var(--primary)'"
      onmouseleave="this.style.borderColor='var(--gray-200)'">
      <div style="font-size:28px;width:36px;text-align:center">${p.image ? `<img src="${p.image}" style="width:36px;height:36px;object-fit:cover;border-radius:6px" onerror="this.outerHTML='🏷️'"/>` : '🏷️'}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${p.name}</div>
        <div style="font-size:12px;color:var(--gray-400)">${p.category} • Còn: ${p.quantity} ${p.unit || ''}</div>
      </div>
      <div style="font-weight:700;color:var(--primary);font-size:13px">${fmt(p.price)}/${p.unit || 'khác'}</div>
      <button class="btn btn-primary btn-sm">+ Thêm</button>
    </div>`).join('');
}
function addToCart(id) {
  const p = saleProducts.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(x => x.productId === id);
  if (existing) {
    if (existing.quantity >= p.quantity) { toast(`Chỉ còn ${p.quantity} sản phẩm`, 'warning'); return; }
    existing.quantity++;
  } else {
    cart.push({ productId: id, name: p.name, price: p.price, quantity: 1, maxQty: p.quantity, unit: p.unit, category: p.category });
  }
  renderCart();
}
function removeFromCart(id) { cart = cart.filter(x => x.productId !== id); renderCart(); }
function clearCart() { cart = []; renderCart(); }
function changeQty(id, delta) {
  const item = cart.find(x => x.productId === id);
  if (!item) return;
  let q = item.quantity + delta;
  q = Math.round(q * 100) / 100;
  item.quantity = Math.max(1, Math.min(item.maxQty, q));
  renderCart();
}
function setCartQty(id, val) {
  const item = cart.find(x => x.productId === id);
  if (!item) return;
  let q = parseFloat(val);
  if (isNaN(q) || q <= 0) q = 1;
  if (item.category !== 'Gạo' && !Number.isInteger(q)) {
    toast('Sản phẩm này không hỗ trợ số lẻ', 'error');
    q = Math.round(q);
  }
  const qStr = q.toString();
  if (qStr.includes('.') && qStr.split('.')[1].length > 2) {
    toast('Tối đa 2 chữ số thập phân', 'error');
    q = Number(q.toFixed(2));
  }
  if (q > item.maxQty) {
    toast(`Chỉ còn ${item.maxQty} ${item.unit || ''}`, 'warning');
    q = item.maxQty;
  }
  item.quantity = q;
  renderCart();
}
function renderCart() {
  const el = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (cart.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:24px"><div>🛒</div><p>Chưa có sản phẩm</p></div>';
    totalEl.textContent = '0 ₫'; return;
  }
  let total = 0;
  el.innerHTML = cart.map(item => {
    const sub = item.price * item.quantity; total += sub;
    return `<div class="cart-item">
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-qty" style="display:flex;align-items:center;gap:4px">
        <button class="qty-btn" onclick="changeQty(${item.productId},-1)">−</button>
        <input type="number" class="form-control" style="width:60px;padding:4px;text-align:center;height:26px" 
               value="${item.quantity}" step="${item.category==='Gạo'?'any':'1'}" min="0"
               onchange="setCartQty(${item.productId}, this.value)" />
        <span style="font-size:12px;color:var(--gray-500);width:24px">${item.unit || ''}</span>
        <button class="qty-btn" onclick="changeQty(${item.productId},1)">+</button>
      </div>
      <div class="cart-item-price">${fmt(sub)}</div>
      <button class="cart-remove" onclick="removeFromCart(${item.productId})">✕</button>
    </div>`;
  }).join('');
  totalEl.textContent = fmt(total);
}
async function checkout() {
  if (cart.length === 0) { toast('Giỏ hàng trống!', 'warning'); return; }
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const confirmed = confirm(`Xác nhận thanh toán:\nTổng tiền: ${fmt(total)}\nSố mặt hàng: ${cart.length}`);
  if (!confirmed) return;
  const btn = document.getElementById('btn-checkout');
  btn.disabled = true; btn.textContent = 'Đang xử lý...';
  const res = await api.createSale({ items: cart, total });
  btn.disabled = false; btn.innerHTML = '💳 Thanh toán';
  if (res.success) {
    const detail = await api.getSaleDetail(res.saleId);
    showCheckoutSuccess(detail);
    cart = [];
    renderCart();
    loadSalesView();
  } else toast(res.message, 'error');
}
let currentInvoiceDetail = null;
function showCheckoutSuccess(detail) {
  currentInvoiceDetail = detail;
  document.getElementById('success-tx-id').textContent = `#GD${String(detail.id).padStart(4,'0')}`;
  document.getElementById('success-time').textContent = detail.date;
  document.getElementById('success-total').textContent = fmt(detail.total);
  navigate('checkout-success');
}
function printCurrentInvoice() {
  if (currentInvoiceDetail) {
    showInvoice(currentInvoiceDetail);
    setTimeout(() => { window.print(); }, 100);
  }
}
let allSales = [];
async function loadHistory() {
  try {
    allSales = await api.getSales();
    renderHistory(allSales);
  } catch (e) { toast('Lỗi tải lịch sử', 'error'); }
}
function filterHistory() {
  const date = document.getElementById('filter-date').value;
  if (!date) { renderHistory(allSales); return; }
  renderHistory(allSales.filter(s => s.date && s.date.startsWith(date)));
}
function renderHistory(list) {
  const tbody = document.getElementById('history-table');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-400)">Không có giao dịch</td></tr>'; return;
  }
  tbody.innerHTML = list.map(s => `<tr>
    <td><span class="badge badge-primary">GD${String(s.id).padStart(4,'0')}</span></td>
    <td style="font-size:12px;color:var(--gray-500)">${s.date}</td>
    <td><strong>${fmt(s.total)}</strong></td>
    <td class="admin-only">${fmt(s.cost || 0)}</td>
    <td class="admin-only"><strong style="color:${(s.profit||0)<0?'#ef4444':(s.profit||0)>0?'#22c55e':''}">${fmt(s.profit || 0)}</strong></td>
    <td style="color:var(--gray-400);font-size:12px">${s.note || '—'}</td>
    <td><button class="btn btn-outline btn-sm" onclick="viewInvoice(${s.id})">🧾 Xem</button></td>
  </tr>`).join('');
}
async function viewInvoice(id) {
  try {
    const detail = await api.getSaleDetail(id);
    showInvoice(detail);
  } catch (e) { toast('Lỗi tải hóa đơn', 'error'); }
}
function showInvoice(detail) {
  if (!detail) return;
  const subtotal = detail.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const invoiceHtml = `
    <div style="font-family:Inter,sans-serif" id="invoice-print">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:24px;font-weight:800;color:var(--primary)">🏪 RetailPro</div>
        <div style="font-size:12px;color:var(--gray-400)">Hóa đơn bán hàng</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px">
        <div><span style="color:var(--gray-500)">Mã GD:</span> <strong>GD${String(detail.id).padStart(4,'0')}</strong></div>
        <div><span style="color:var(--gray-500)">Thời gian:</span> ${detail.date}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--gray-50)">
          <th style="padding:8px;text-align:left;border-bottom:1px solid var(--gray-200)">Sản phẩm</th>
          <th style="padding:8px;text-align:center;border-bottom:1px solid var(--gray-200)">SL</th>
          <th style="padding:8px;text-align:right;border-bottom:1px solid var(--gray-200)">Đơn giá</th>
          <th style="padding:8px;text-align:right;border-bottom:1px solid var(--gray-200)">Thành tiền</th>
        </tr></thead>
        <tbody>
          ${detail.items.map(i => `<tr>
            <td style="padding:8px;border-bottom:1px solid var(--gray-100)">${i.product_name}</td>
            <td style="padding:8px;text-align:center;border-bottom:1px solid var(--gray-100)">${i.quantity} ${i.unit || ''}</td>
            <td style="padding:8px;text-align:right;border-bottom:1px solid var(--gray-100)">${fmt(i.price)}/${i.unit || 'khác'}</td>
            <td style="padding:8px;text-align:right;border-bottom:1px solid var(--gray-100);font-weight:600">${fmt(i.price*i.quantity)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:16px;padding-top:16px;border-top:2px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:15px;font-weight:600">Tổng cộng</span>
        <span style="font-size:20px;font-weight:800;color:var(--primary)">${fmt(detail.total)}</span>
      </div>
      ${detail.note ? `<div style="margin-top:10px;font-size:12px;color:var(--gray-400)">Ghi chú: ${detail.note}</div>` : ''}
      <div style="text-align:center;margin-top:20px;font-size:11px;color:var(--gray-400)">Cảm ơn quý khách! — RetailPro</div>
    </div>`;
  document.getElementById('invoice-body').innerHTML = invoiceHtml;
  document.getElementById('invoice-print').innerHTML = invoiceHtml;
  openModal('modal-invoice');
}
function printInvoice() { window.print(); }
function loadSettings() {
  if (currentUser) document.getElementById('settings-username').value = currentUser.username;
}
async function doBackup() {
  const res = await api.exportBackup();
  if (res.success) toast(res.message, 'success');
  else if (res.message !== 'Đã hủy') toast(res.message, 'error');
}
async function doRestore() {
  const w1 = confirm('⚠️ CẢNH BÁO!\n\nKhôi phục sẽ XÓA TOÀN BỘ dữ liệu hiện tại.\n\nBạn có chắc chắn?');
  if (!w1) return;
  const w2 = confirm('⚠️ XÁC NHẬN LẦN 2\n\nDữ liệu cũ sẽ được tự động sao lưu.\nNhấn OK để tiếp tục.');
  if (!w2) return;
  const res = await api.importBackup();
  if (res.success) { toast(res.message, 'success'); navigate('dashboard', document.querySelector('[data-view=dashboard]')); }
  else if (res.message !== 'Đã hủy') toast(res.message, 'error');
}
async function exportExcel(type) {
  const role = currentUser ? currentUser.role : 'user';
  const res = await api.exportExcel({ type, role });
  if (res.success) toast(res.message, 'success');
  else if (res.message !== 'Đã hủy') toast(res.message, 'error');
}
async function doChangePassword() {
  const oldPw = document.getElementById('settings-old-pw').value;
  const newPw = document.getElementById('settings-new-pw').value;
  const newPw2 = document.getElementById('settings-new-pw2').value;
  if (!oldPw || !newPw) { toast('Vui lòng điền đầy đủ thông tin', 'warning'); return; }
  if (newPw !== newPw2) { toast('Mật khẩu mới không khớp', 'error'); return; }
  if (newPw.length < 6) { toast('Mật khẩu tối thiểu 6 ký tự', 'error'); return; }
  const res = await api.changePassword({ username: currentUser.username, oldPassword: oldPw, newPassword: newPw });
  if (res.success) {
    toast(res.message, 'success');
    document.getElementById('settings-old-pw').value = '';
    document.getElementById('settings-new-pw').value = '';
    document.getElementById('settings-new-pw2').value = '';
  } else toast(res.message, 'error');
}
function showNotifications() { toast('Không có thông báo mới', 'info'); }
document.getElementById('global-search').addEventListener('input', function() {
  if (currentView === 'products') { document.getElementById('product-search').value = this.value; filterProducts(); }
});
loadDashboard();

// ─── STOCK IMPORT ───
let siProducts = [];
async function loadStockImport() {
  try {
    siProducts = await api.getProducts();
    const sel = document.getElementById('si-product');
    sel.innerHTML = '<option value="">-- Chọn sản phẩm --</option>' + siProducts.map(function(p) {
      return '<option value="' + p.id + '">' + p.name + ' (' + p.category + ' — Tồn: ' + p.quantity + ' ' + (p.unit||'') + ')</option>';
    }).join('');
    document.getElementById('si-product-info').style.display = 'none';
    document.getElementById('si-quantity').value = '';
    document.getElementById('si-update-cost').checked = false;
    document.getElementById('si-cost').style.display = 'none';
    document.getElementById('si-cost').value = '';
    document.getElementById('si-note').value = '';
    const imports = await api.getStockImports();
    renderStockImports(imports);
  } catch(e) { toast('Lỗi tải nhập hàng','error'); }
}
function onStockImportProductChange() {
  const id = parseInt(document.getElementById('si-product').value);
  const info = document.getElementById('si-product-info');
  if (!id) { info.style.display = 'none'; return; }
  const p = siProducts.find(function(x) { return x.id === id; });
  if (!p) { info.style.display = 'none'; return; }
  info.style.display = 'block';
  document.getElementById('si-p-name').textContent = p.name;
  document.getElementById('si-p-stock').textContent = p.quantity + ' ' + (p.unit||'');
  document.getElementById('si-p-cost').textContent = fmt(p.cost_price||0);
  document.getElementById('si-quantity').step = p.category === 'Gạo' ? 'any' : '1';
}
function toggleCostInput() {
  document.getElementById('si-cost').style.display = document.getElementById('si-update-cost').checked ? 'block' : 'none';
}
async function submitStockImport() {
  var productId = parseInt(document.getElementById('si-product').value);
  if (!productId) { toast('Vui lòng chọn sản phẩm','error'); return; }
  var quantity = parseFloat(document.getElementById('si-quantity').value);
  if (isNaN(quantity) || quantity <= 0) { toast('Số lượng phải lớn hơn 0','error'); return; }
  if (quantity > 10000) { toast('Số lượng tối đa 10,000','error'); return; }
  var p = siProducts.find(function(x) { return x.id === productId; });
  if (p && p.category !== 'Gạo' && !Number.isInteger(quantity)) { toast('Sản phẩm này không hỗ trợ số lẻ','error'); return; }
  var newCostPrice = null;
  if (document.getElementById('si-update-cost').checked) {
    newCostPrice = parseFloat(document.getElementById('si-cost').value);
    if (isNaN(newCostPrice) || newCostPrice < 0) { toast('Giá vốn không hợp lệ','error'); return; }
  }
  var note = document.getElementById('si-note').value.trim();
  if (!confirm('Xác nhận nhập ' + quantity + ' ' + (p?p.unit:'') + ' "' + (p?p.name:'') + '"?')) return;
  var res = await api.stockImport({ productId: productId, quantity: quantity, newCostPrice: newCostPrice, note: note });
  if (res.success) { toast(res.message,'success'); loadStockImport(); }
  else toast(res.message,'error');
}
function renderStockImports(list) {
  var tbody = document.getElementById('stock-import-table');
  if (!list || !list.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray-400)">Chưa có lịch sử nhập</td></tr>'; return; }
  tbody.innerHTML = list.map(function(si) {
    var costText = si.old_cost_price !== si.new_cost_price ? fmt(si.old_cost_price) + ' → ' + fmt(si.new_cost_price) : fmt(si.new_cost_price);
    return '<tr><td style="font-size:12px;color:var(--gray-500)">' + si.date + '</td><td><strong>' + si.product_name + '</strong></td><td><strong style="color:var(--success)">+' + si.quantity + '</strong></td><td class="admin-only">' + costText + '</td><td style="color:var(--gray-400);font-size:12px">' + (si.note||'—') + '</td></tr>';
  }).join('');
}

// ─── REPORTS ───
let lastReportData = null;
async function loadReports() {
  var today = new Date().toISOString().slice(0,10);
  var from30 = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
  document.getElementById('report-from').value = from30;
  document.getElementById('report-to').value = today;
  filterReports();
}
function setReportRange(range) {
  var today = new Date().toISOString().slice(0,10);
  var from = today;
  if (range === '7days') from = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
  else if (range === '30days') from = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
  else if (range === 'month') { var d = new Date(); from = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-01'; }
  document.getElementById('report-from').value = from;
  document.getElementById('report-to').value = today;
  filterReports();
}
async function filterReports() {
  var fromDate = document.getElementById('report-from').value;
  var toDate = document.getElementById('report-to').value;
  if (!fromDate || !toDate) { toast('Vui lòng chọn khoảng thời gian','warning'); return; }
  try {
    var data = await api.getReportData({ fromDate: fromDate, toDate: toDate });
    lastReportData = data;
    document.getElementById('rpt-revenue').textContent = fmt(data.totalRevenue);
    document.getElementById('rpt-orders').textContent = data.totalOrders + ' đơn hàng';
    document.getElementById('rpt-cost').textContent = fmt(data.totalCost);
    var profitEl = document.getElementById('rpt-profit');
    profitEl.textContent = fmt(data.totalProfit);
    profitEl.style.color = data.totalProfit < 0 ? 'var(--danger)' : 'var(--success)';
    var tbody = document.getElementById('report-table');
    if (!data.daily.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray-400)">Không có dữ liệu</td></tr>'; return; }
    tbody.innerHTML = data.daily.map(function(d) {
      var pColor = d.profit < 0 ? 'var(--danger)' : 'var(--success)';
      return '<tr><td><strong>' + d.day + '</strong></td><td>' + d.count + '</td><td><strong>' + fmt(d.revenue) + '</strong></td><td class="admin-only">' + fmt(d.cost) + '</td><td class="admin-only"><strong style="color:' + pColor + '">' + fmt(d.profit) + '</strong></td></tr>';
    }).join('');
  } catch(e) { toast('Lỗi tải báo cáo','error'); }
}
async function exportReportExcel() {
  if (!lastReportData || !lastReportData.daily.length) { toast('Không có dữ liệu để xuất','warning'); return; }
  var role = currentUser ? currentUser.role : 'user';
  var res = await api.exportExcel({ type: 'report', role: role, reportData: lastReportData });
  if (res.success) toast(res.message,'success');
  else if (res.message !== 'Đã hủy') toast(res.message,'error');
}

// ─── AUTO UPDATE UI ───
try {
  api.onUpdateStatus(function(data) {
    var banner = document.getElementById('update-banner');
    var content = document.getElementById('update-content');
    if (!banner || !content) return;
    if (data.status === 'available') {
      banner.style.display = 'flex';
      content.innerHTML = '<span>🎉 Phiên bản mới (' + (data.version||'') + ')</span><div><button class="btn btn-primary btn-sm" onclick="api.updateDownload()">Cập nhật</button> <button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'update-banner\').style.display=\'none\'">Để sau</button></div>';
    } else if (data.status === 'downloading') {
      banner.style.display = 'flex';
      content.innerHTML = '<span>⏬ Đang tải... ' + (data.percent||0) + '%</span><div style="width:120px;height:8px;background:var(--gray-200);border-radius:4px;overflow:hidden"><div style="height:100%;background:var(--primary);width:' + (data.percent||0) + '%;transition:width .3s"></div></div>';
    } else if (data.status === 'ready') {
      banner.style.display = 'flex';
      content.innerHTML = '<span>✅ Cập nhật xong!</span><button class="btn btn-success btn-sm" onclick="api.updateInstall()">Khởi động lại</button>';
    } else if (data.status === 'error') {
      banner.style.display = 'flex';
      content.innerHTML = '<span>❌ Cập nhật thất bại</span><button class="btn btn-ghost btn-sm" onclick="api.updateCheck()">Thử lại</button>';
      setTimeout(function() { banner.style.display = 'none'; }, 8000);
    } else { banner.style.display = 'none'; }
  });
} catch(e) {}

