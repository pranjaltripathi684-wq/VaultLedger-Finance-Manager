<div align="center">

# 💰 Personal Finance Tracker & Intelligence Hub

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=0b1020)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

An intelligent, self-hosted personal finance management web application built with a **React + Vite frontend**, a **Flask JSON API**, and **SQLite3**. Designed with actionable spending analytics, visual category budgets, and executive-level reporting.

[Explore Features](#-key-features) • [Architecture](#-architecture--data-flow) • [Quick Start](#-quick-start) • [Security & Design](#-security--design-principles)

</div>

---

## 🌟 Key Features

### 📊 1. Executive Analytics & Trend Reporting (Dedicated View)
* **Monthly Expense Trajectory**: Smooth Bezier line chart tracking spending trends over time with area fills.
* **Monthly Cash Flow Comparison**: Grouped dual-bar charts comparing earnings against spending per calendar month.
* **Category Spending Ranking**: Horizontal ranked bar chart organizing expenditures from highest to lowest impact.

### 🎯 2. Active Category Budgeting & Visual Progress
* Set monthly spending thresholds per category (`Food & Dining`, `Rent`, `Utilities`, etc.).
* Dynamic color-coded progress bars:
  * 🟢 **On Track** (< 75% utilized)
  * 🟡 **Near Limit** (75% – 99% utilized)
  * 🔴 **Over Budget** (100%+ utilized with dynamic overflow calculations)
* Built using atomic SQLite `INSERT ... ON CONFLICT DO UPDATE` upserts.

### 🧠 3. Smart Financial Metrics & Runway Intelligence
* **Financial Health Score (0–100)**: Evaluates monthly savings rate based on standard financial benchmarks (50/30/20 rule).
* **Daily Burn Rate**: Computes real daily expense velocity for the current month.
* **Safe Daily Spend**: Calculates the sustainable daily allowance for the remaining days of the month.
* **Runway Projection**: Real-time estimate of how many days current reserves will last.
* **Month-over-Month Badges**: Dynamic percentage changes vs. the previous month (green for reduced spending, red for increased).

### ⚡ 4. Modern UX & Privacy
* **Discreet / Privacy Mode (👁️)**: Instant client-side masking of all currency figures (`$****`) with `localStorage` persistence for public-space use.
* **Smart Category Badges**: Automatic recognition and emoji prefixing (🍔 *Food*, 💼 *Salary*, 🚗 *Transport*, 🏠 *Housing*, 💡 *Utilities*).
* **Zero-Latency Instant Search**: Real-time table filtering across titles, categories, and notes without page reload.
* **In-Memory CSV Export**: One-click download of transactions streamed directly via Python’s `io.StringIO` (Excel / Google Sheets ready).
* **Flash Message Banners**: Contextual alerts for creation, updates, and deletions.

---

## 🏗️ Architecture & Data Flow

The project strictly follows the **Model-View-Controller (MVC)** architectural pattern:

```text
       ┌────────────────────────────────────────────────────────┐
       │                   Browser / Client                     │
       │  (React client, Vite build, responsive design system)  │
       └──────────────┬──────────────────────────▲──────────────┘
                      │ JSON API requests        │ React application /
                      │                          │ Streamed CSV
                      ▼                          │
       ┌─────────────────────────────────────────┴──────────────┐
       │                   Flask Controllers                    │
       │     (app.py - Routing, Validation, PRG Pattern)        │
       └──────────────┬──────────────────────────▲──────────────┘
                      │ Parameterized SQL        │ sqlite3.Row
                      │ Queries                  │ Records
                      ▼                          │
       ┌─────────────────────────────────────────┴──────────────┐
       │                   SQLite Data Layer                    │
       │    (db.py, schema.sql, finance.db with Constraints)    │
       └────────────────────────────────────────────────────────┘

🚀 Quick Start
1. Prerequisites
Python 3.9 or newer installed on your machine.
Git installed.

# Clone the repository
git clone https://github.com/pranjaltripathi684-wq/Finance-Manager.git
cd Finance-Manager

# (Optional) Create and activate a virtual environment
# Windows:
python -m venv venv
venv\Scripts\activate

# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

Run the database setup script to generate finance.db and the database schema:
python db.py
 Run the Application:
python app.py

In a second terminal, start the React client for development:

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. The Vite dev server forwards `/api` requests to Flask.

For production, build the frontend once and Flask will serve it at `http://127.0.0.1:5000`:

```bash
cd frontend
npm run build
```

🛡️ Security & Design Principles
SQL Injection Immunization: All database interactions use parameterized queries (? syntax). User inputs are never interpolated directly into SQL statements.
Strict Storage Constraints: The database enforces integrity at the schema level using SQLite CHECK constraints (positive amounts, ISO-8601 formatted dates, and validated transaction types).
Safe State Mutation: Deletions and updates are strictly bound to HTTP POST methods with confirmation dialogs, preventing accidental execution via GET prefetching or crawlers.
Post/Redirect/Get (PRG): All forms redirect after submission to eliminate duplicate transaction submissions on page refresh.
Zero Memory Leaks: In-memory file streaming with io.StringIO for CSV exports prevents orphaned files on the server disk.
