# 💰 Finance Manager & Multi-Currency Ledger

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0%2B-black?style=flat-square&logo=flask)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite)
![Security](https://img.shields.io/badge/Ledger-SHA--256%20Merkle-emerald?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A local-first, privacy-focused personal finance management platform and accounting engine built with Python (Flask), React 18, and SQLite. Features real-time multi-currency conversion, cryptographic SHA-256 ledger integrity verification, statistical fraud sentinel detection, and foreign exchange gain/loss tracking.

---

## ✨ Features

### 📊 1. Overview & Financial Health
- **Live Cash Flow Metrics**: Instant totals for income, expenses, net balance, and month-over-month comparisons.
- **Financial Health Score**: Dynamic algorithm scoring savings rates (0–100) with financial status indicators.
- **Runway & Burn Rate Pace**: Calculates daily burn rate, safe daily spend limits, and remaining cash runway in days.

### 🛡️ 2. SHA-256 Cryptographic Ledger
- **Merkle-Style Hash Verification**: Every transaction generates a SHA-256 hash incorporating the previous row's cryptographic signature.
- **Tamper Alert Drawer**: Detects direct database manipulation or unauthorized row modification with one-click integrity verification.

### 🚨 3. Statistical Fraud Sentinel
- **Outlier Detection**: Automated Z-score algorithm flagging unusual category spending spikes ($\ge +2.0\sigma$).
- **Duplicate Charge Detection**: Detects identical title and amount transactions occurring within a 48-hour window.
- **One-Click Dismissal**: Mark flagged charges as authorized to dismiss sentinel alerts.

### 💱 4. Multi-Currency & FX Gain/Loss Engine (ASC 830 / IAS 21)
- **Multi-Currency Support**: Native handling of `USD ($)`, `EUR (€)`, `GBP (£)`, `INR (₹)`, `CAD ($)`, and `JPY (¥)`.
- **Weighted Average Cost Basis**: Maintains inventory acquisition rates across inflows and crystallizes realized P&L on outflows.
- **Mark-to-Market Valuation**: Computes unrealized paper gains/losses based on real-time market exchange rates.
- **FX Rate Simulator**: Interactive what-if inputs to test exchange rate fluctuation impact on portfolio value.

### ⚡ 5. Financial Hub
- **Multi-Account Wallets**: Track balances across Checking, Savings, Credit Cards, and Crypto Wallets.
- **Subscription Sentinel**: Visual timeline tracking upcoming recurring subscriptions (e.g., Netflix, Spotify, Rent).
- **Visual Savings Goal Jars**: Target goal cards with progress rings, initial funds, and interactive deposit triggers.
- **Tax Liability Estimator**: Real-time estimated quarterly tax liability calculator for freelance and multi-currency income.

### 🎯 6. Category Budgets & Bulk Operations
- **Category Guardrails**: Set monthly spending limits with progress indicators (`On Track`, `Near Limit`, `Over Budget`).
- **Floating Bulk Toolbar**: Multi-select row checkboxes for **Bulk Delete** and **Bulk Recategorize**.
- **Instant Category Chips**: Filter transactions by `Income`, `Dining`, `Housing`, `Transport`, or `Sentinel Flagged`.

### ⌨️ 7. Hotkeys & Privacy Mode
- `Press A` → Open Quick Add Transaction modal.
- `Press /` → Focus instant transaction search bar.
- `Press P` → Toggle Privacy Mode (blur financial numbers).

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, Flask, SQLite3, hashlib, pyinstaller
- **Frontend**: React 18, Vite, CSS3 Glassmorphism (Dark / Light mode)
- **Architecture**: REST API endpoints with React Single Page Application frontend

---

## 📂 Project Structure

```text
Finance-Manager/
├── app.py                     # Flask REST API server & cryptographic ledger engine
├── db.py                      # SQLite database connection helper
├── schema.sql                 # Base database table schemas
├── Start-FinanceTracker.bat   # 1-Click Windows batch launcher
├── Start-FinanceTracker.vbs   # 1-Click silent Windows launcher (no CMD window)
├── CreateDesktopShortcut.bat  # Script to generate desktop shortcut icon
├── FinanceTracker.exe         # Standalone compiled Windows executable
├── static/
│   ├── css/                   # Modular CSS stylesheets (theme, components, dashboard)
│   └── styles.css             # CSS entrypoint
├── templates/                 # Jinja2 template fallbacks
├── frontend/                  # React 18 SPA frontend workspace
│   ├── src/
│   │   ├── App.jsx            # Main React SPA component
│   │   └── styles.css         # Component glassmorphism styles
│   ├── dist/                  # Production compiled React bundle
│   ├── package.json
│   └── vite.config.js
└── requirements.txt           # Python backend dependencies
```

---

## 🚀 Quick Start

### Option 1: 1-Click Launchers (Windows)
Double-click any of the following files in the project folder:
- **`FinanceTracker.exe`**: Standalone single-file executable (no setup required).
- **`Start-FinanceTracker.vbs`**: Silent 1-click launcher.
- **`Start-FinanceTracker.bat`**: Terminal launcher.

### Option 2: Run from Source

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/Finance-Manager.git
   cd Finance-Manager
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask Application**:
   ```bash
   python app.py
   ```

4. **Open in Browser**:
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000).

---

## 📡 REST API Documentation

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/dashboard` | `GET` | Fetches metrics, sparklines, ledger status, anomalies, and transactions |
| `POST /api/transactions` | `POST` | Creates a new transaction and updates ledger chain |
| `PUT /api/transactions/<id>` | `PUT` | Updates existing transaction and rebuilds cryptographic ledger |
| `DELETE /api/transactions/<id>` | `DELETE` | Deletes transaction and rebuilds cryptographic ledger |
| `POST /api/transactions/bulk` | `POST` | Executes bulk delete or bulk recategorization |
| `GET, POST /api/budgets` | `GET, POST` | Fetches or updates monthly category spending limits |
| `DELETE /api/budgets/<id>` | `DELETE` | Deletes category budget limit |
| `GET /api/analytics` | `GET` | Fetches cash flow trends, category totals, and Monte Carlo simulation |
| `GET /api/hub` | `GET` | Fetches accounts, upcoming subscriptions, savings goals, and tax estimate |
| `POST /api/accounts` | `POST` | Creates or updates multi-account wallet balance |
| `POST /api/subscriptions` | `POST` | Adds new recurring subscription |
| `POST /api/goals` | `POST` | Creates new target savings goal jar |
| `POST /api/goals/<id>/deposit` | `POST` | Deposits funds into a savings goal jar |
| `POST /api/anomalies/<id>/dismiss`| `POST` | Authorizes and dismisses sentinel fraud alert |
| `POST /api/audit/verify` | `POST` | Triggers SHA-256 cryptographic ledger integrity check |
| `GET, POST /api/fx` | `GET, POST` | Fetches FX holdings or simulates exchange rate gains/losses |
| `GET /export/csv` | `GET` | Downloads full multi-currency transaction history as CSV |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
