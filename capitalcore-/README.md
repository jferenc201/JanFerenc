# CapitalCore — Personal Finance Dashboard

Built with: **Python Flask · SQLite · Bootstrap 5 · JavaScript · Chart.js**

## Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | HTML5, CSS3, Bootstrap 5, JavaScript ES6 |
| Charts    | Chart.js 4              |
| Backend   | Python Flask            |
| Database  | SQLite (dev) / PostgreSQL (prod) |
| Auth      | Flask sessions + SHA-256 |

## Project structure

```
capitalcore/
├── app.py                  ← Flask app, all API routes
├── requirements.txt        ← Python dependencies
├── capitalcore.db          ← SQLite database (auto-created)
├── templates/
│   └── index.html          ← Bootstrap 5 SPA template
└── static/
    ├── css/
    │   └── style.css       ← Custom styles on top of Bootstrap
    └── js/
        ├── api.js          ← All fetch() calls to Flask backend
        ├── charts.js       ← Chart.js chart builders
        ├── ui.js           ← DOM render functions for each page
        └── app.js          ← Auth, navigation, CRUD handlers, boot
```

## Setup & run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py

# 3. Open your browser
http://localhost:5000
```

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET  | `/api/auth/me` | Check session |
| GET  | `/api/summary` | Dashboard summary stats |
| GET/POST | `/api/income` | List / add income |
| DELETE | `/api/income/<id>` | Delete income source |
| GET/POST | `/api/transactions` | List / add transactions |
| DELETE | `/api/transactions/<id>` | Delete transaction |
| GET  | `/api/budgets` | Get budget vs actual |
| GET/POST | `/api/goals` | List / add savings goals |
| DELETE | `/api/goals/<id>` | Delete goal |
| GET/POST | `/api/debts` | List / add debts |
| DELETE | `/api/debts/<id>` | Delete debt |
| GET/POST | `/api/investments` | List / add investments |
| DELETE | `/api/investments/<id>` | Delete investment |
| POST | `/api/seed` | Load demo data |

## Features

- **User accounts** — register, login, logout with session management
- **Overview** — 5 metric cards, spending donut chart, 6-month trend chart, transaction feed
- **Income** — add/delete income streams, monthly bar chart
- **Spending** — budget vs actual progress bars, log transactions, category tracking
- **Savings goals** — set targets, track progress, estimate completion date
- **Debt planner** — avalanche method (highest rate first), payoff timeline chart
- **Investments** — holdings table with return %, portfolio growth chart
- **Mobile** — fully responsive, Bootstrap grid, sticky bottom navigation bar

## Switch to PostgreSQL

Replace the SQLite connection in `app.py`:

```python
# pip install psycopg2-binary
import psycopg2
DATABASE_URL = "postgresql://user:password@localhost/capitalcore"

def get_db():
    return psycopg2.connect(DATABASE_URL)
```
