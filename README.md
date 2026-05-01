# RetailPro v1.1.7 🚀

**RetailPro** là ứng dụng quản lý bán hàng (POS) & Tồn kho trên máy tính dành cho các cửa hàng nhỏ lẻ, tạp hóa gia đình. Được thiết kế đặc biệt với giao diện lớn, rõ ràng, dễ sử dụng cho **người lớn tuổi**, đảm bảo an toàn dữ liệu tuyệt đối và khả năng tự động cập nhật.

---

## ✨ Tính năng nổi bật

### 👵 Trải nghiệm người dùng (UX) tối ưu
- **Thiết kế cho người lớn tuổi:** Font chữ lớn (≥ 15px), nút bấm to, độ tương phản cao, thao tác rõ ràng từng bước.
- **Không gây nhầm lẫn:** Ẩn bớt các chức năng phức tạp, tập trung vào luồng bán hàng cốt lõi.

### 📦 Quản lý Sản phẩm & Tồn kho
- **Nhập hàng thông minh:** Theo dõi chi tiết lịch sử nhập hàng, tự động cộng dồn tồn kho và linh hoạt thay đổi giá vốn.
- **Soft Delete (Xóa an toàn):** Xóa sản phẩm không làm mất dữ liệu trong lịch sử bán hàng.
- **Hỗ trợ số thập phân:** Phù hợp bán các mặt hàng cân ký (như Gạo, Thịt) với độ chính xác cao.

### 💰 Bán hàng & Báo cáo
- **POS Nhanh chóng:** Tìm kiếm thông minh, tính tiền tự động, in hóa đơn trực tiếp chỉ với 1 click.
- **Báo cáo Doanh thu:** Xem tổng quan và chi tiết doanh thu, lợi nhuận, chi phí theo từng ngày/tuần/tháng.
- **Xuất Excel Thông minh:** Dễ dàng xuất báo cáo doanh thu và danh sách sản phẩm ra file `.xlsx` chuyên nghiệp, **tự động tính tổng cộng doanh thu và lợi nhuận ở cuối bảng**.

### 🛡️ An toàn Dữ liệu & Hệ thống
- **Sao lưu / Khôi phục 2 lớp:** Cảnh báo an toàn 2 bước trước khi ghi đè dữ liệu. Tự động tạo bản sao lưu dự phòng (auto-backup) trước mỗi lần restore để chống mất dữ liệu.
- **Tự động Cập nhật (Auto Update):** Tích hợp `electron-updater`, tự động tải và cài đặt phiên bản mới nhất từ GitHub Releases mà không cần thao tác phức tạp.

---

## 🛠️ Công nghệ sử dụng

- **Core:** Electron.js (Desktop Environment)
- **Frontend:** HTML5, CSS3, Vanilla JS
- **Backend:** Node.js (IPC Main Process)
- **Database:** better-sqlite3 (Local SQLite DB)
- **Package / Update:** electron-builder, electron-updater
- **Khác:** xlsx (Export Excel)

---

## 🚀 Hướng dẫn Cài đặt & Phát triển

### 1. Cài đặt môi trường
Đảm bảo máy tính của bạn đã cài đặt [Node.js](https://nodejs.org/).

```bash
# Clone repository
git clone https://github.com/Khoi12122005/quan-ly-cua-hang.git

# Di chuyển vào thư mục dự án
cd quan-ly-cua-hang

# Cài đặt thư viện
npm install
```

### 2. Chạy ứng dụng (Chế độ Dev)
```bash
npm start
```

### 3. Đóng gói ứng dụng (Build File .exe)
```bash
npm run build
```
*File bộ cài đặt sẽ được tạo ra tại thư mục `dist/`.*

---

## 🔄 Phát hành bản cập nhật (Auto Update)

Dự án được cấu hình sẵn để phát hành qua **GitHub Releases**. 
Để người dùng tự động nhận được bản cập nhật mới, hãy làm theo các bước sau:

1. Đổi version trong `package.json` (ví dụ: `"version": "1.1.1"`).
2. Chạy lệnh đóng gói kèm cờ publish:
   ```bash
   npm run build -- -p always
   ```
   *(Lưu ý: Bạn cần cấu hình `GH_TOKEN` trên máy tính để lệnh publish có quyền đẩy file lên GitHub).*
3. Người dùng cuối khi mở app sẽ tự động nhận được thông báo **"🎉 Có phiên bản mới"** ở dưới cùng màn hình và có thể bấm Cập nhật ngay lập tức.

---
*Phát triển bởi [Khoi12122005](https://github.com/Khoi12122005)*
