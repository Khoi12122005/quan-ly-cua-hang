# RetailPro - Ứng dụng Quản lý Bán Hàng

RetailPro là một ứng dụng quản lý cửa hàng nhỏ gọn, trực quan và bảo mật. Được xây dựng dựa trên Electron, ứng dụng có thể chạy mượt mà trực tiếp trên máy tính với cơ sở dữ liệu lưu cục bộ, giúp người kinh doanh dễ dàng quản lý hàng hoá và thống kê tài chính theo thời gian thực mà không cần kết nối internet.

## Tính năng nổi bật

### 🔐 Phân Quyền Thông Minh (Admin/User)
- Quản lý cửa hàng (**Admin**): Đầy đủ quyền quản trị (Thêm, sửa, xóa sản phẩm). Cấp quyền cấu hình giá vốn và theo dõi toàn bộ báo cáo thu chi, lợi nhuận thực tế.
- Nhân viên bán hàng (**User**): Giao diện được tối giản hoá tập trung hoàn toàn vào việc bán hàng. Các thông tin nhạy cảm (Giá Vốn, Báo Cáo Lợi Nhuận) hoàn toàn bị vô hiệu hoá trên trình duyệt để đảm bảo bảo mật nội bộ.

### 📦 Quản Lý Sản Phẩm & Tồn Kho (Hỗ trợ Số thập phân)
- Theo dõi tình trạng tồn kho theo số lượng và tự động cảnh báo mức "Sắp hết hàng" hoặc "Hết hàng".
- Khả năng bán hàng theo số lượng thập phân (phù hợp với các mặt hàng cân ký như Gạo, Cà phê...) và tự động vô hiệu hóa nhập thập phân đối với các mặt hàng đếm theo đơn vị (Chai, Thùng, Lốc...).

### 💸 Thống Kê & Giao Dịch
- Theo dõi toàn bộ lịch sử bán hàng từng giây, tự động sao kê các mã giao dịch tiện lợi.
- Tính toán Doanh thu, Chi phí và Lợi nhuận tức thời sau mỗi giao dịch (chỉ hiển thị cho Admin).
- Hỗ trợ xuất trực tiếp bảng kê dữ liệu Sản phẩm, Báo cáo Lợi nhuận dưới dạng file **Excel (.xlsx)**.

### 🖨️ In Hóa Đơn Trực Tiếp
- Màn hình thanh toán thành công chuyên nghiệp, trực quan đi kèm khả năng kết xuất hoá đơn gửi thẳng qua máy in chỉ với 1 thao tác click đơn giản.

### 💾 Backup & Restore (An toàn dữ liệu)
- Hệ thống hỗ trợ sao lưu toàn bộ thông tin chỉ với 1 click, người dùng dễ dàng chuyển đổi máy mà không lo sợ mất dữ liệu.

## Công Nghệ Sử Dụng
- **Core Framework**: [Electron.js](https://www.electronjs.org/) + Node.js
- **Giao diện (UI)**: HTML5, CSS3, Vanilla JS
- **Cơ sở dữ liệu**: better-sqlite3 (SQLite)
- **Thư viện tích hợp**: xlsx (Xuất/nhập file Excel)

## Hướng dẫn Cài Đặt (Development)

1. **Clone mã nguồn về máy**
   ```bash
   git clone https://github.com/Khoi12122005/quan-ly-cua-hang.git
   cd quan-ly-cua-hang
   ```

2. **Cài đặt thư viện**
   ```bash
   npm install
   ```

3. **Chạy ứng dụng (Chế độ Dev)**
   ```bash
   npm start
   ```

4. **Đóng gói ứng dụng (.exe)**
   ```bash
   npm run build
   ```

## Thông Tin Tài Khoản Mặc Định
- **Tài khoản Quản lý**: `admin` | Mật khẩu: `admin123`
- **Tài khoản Nhân viên**: `nhanvien` | Mật khẩu: `nhanvien123`

---
*Developed with ❤️*
