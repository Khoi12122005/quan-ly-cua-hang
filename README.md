# RetailPro Desktop

RetailPro is a desktop point-of-sale (POS) and inventory management application designed for small businesses.

## Features

- **Role-based Access Control**: Admin and Employee roles with specific permissions.
- **Inventory Management**: Real-time stock tracking with low-stock alerts.
- **Decimal Quantities**: Support for products requiring decimal units (e.g., kg).
- **Sales & Checkout**: Fast checkout process with direct invoice printing.
- **Financial Reporting**: Automatic calculation of cost and profit (Admin only).
- **Data Export**: Export sales history and product inventory to Excel.
- **Data Security**: Local SQLite database with easy JSON backup and restore capabilities.

## Tech Stack

- **Framework**: Electron.js
- **Backend**: Node.js
- **Frontend**: HTML5, CSS3, Vanilla JS
- **Database**: better-sqlite3 (SQLite)
- **Utilities**: xlsx

## Development

```bash
git clone https://github.com/Khoi12122005/quan-ly-cua-hang.git
cd quan-ly-cua-hang
npm install
npm start
```

## Build

```bash
npm run build
```
