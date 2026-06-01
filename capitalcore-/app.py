"""
CapitalCore — Flask Backend
Run: pip install flask flask-cors && python app.py
"""

from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import sqlite3, hashlib, os, json
from datetime import datetime, date
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'capitalcore-dev-secret-2026')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 30  # 30 days
CORS(app, supports_credentials=True, origins=['http://localhost:5000', 'http://127.0.0.1:5000'])

DB_PATH = os.path.join(os.path.dirname(__file__), 'capitalcore.db')

# ── DATABASE ──────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            email       TEXT    UNIQUE NOT NULL,
            password    TEXT    NOT NULL,
            created_at  TEXT    DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS income (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            amount      REAL    NOT NULL,
            category    TEXT    DEFAULT 'Other',
            created_at  TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            description TEXT    NOT NULL,
            amount      REAL    NOT NULL,
            type        TEXT    NOT NULL DEFAULT 'expense',
            category    TEXT    DEFAULT 'Other',
            date        TEXT    DEFAULT (date('now')),
            created_at  TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS budgets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            category    TEXT    NOT NULL,
            budget      REAL    NOT NULL DEFAULT 0,
            spent       REAL    NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS goals (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            description TEXT    DEFAULT '',
            target      REAL    NOT NULL,
            saved       REAL    NOT NULL DEFAULT 0,
            monthly     REAL    NOT NULL DEFAULT 0,
            created_at  TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS debts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            balance     REAL    NOT NULL,
            rate        REAL    NOT NULL,
            monthly     REAL    NOT NULL,
            created_at  TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS investments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            description TEXT    DEFAULT '',
            cost        REAL    NOT NULL,
            value       REAL    NOT NULL,
            type        TEXT    DEFAULT 'Other',
            created_at  TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ''')
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    return hashlib.sha256((password + 'capitalcore_salt').encode()).hexdigest()

def rows_to_list(rows) -> list:
    return [dict(row) for row in rows]

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated

# ── FRONTEND ──────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

# ── AUTH ROUTES ───────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if '@' not in email:
        return jsonify({'error': 'Invalid email address'}), 400

    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            (name, email, hash_password(password))
        )
        user_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        # Seed default budgets
        defaults = [
            ('Housing', 1100), ('Food', 600), ('Transport', 300),
            ('Entertainment', 400), ('Subscriptions', 100)
        ]
        for cat, bud in defaults:
            conn.execute('INSERT INTO budgets (user_id, category, budget, spent) VALUES (?, ?, ?, 0)',
                         (user_id, cat, bud))
        conn.commit()
        session.permanent = True
        session['user_id'] = user_id
        session['user_name'] = name
        return jsonify({'success': True, 'user_id': user_id, 'name': name})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already registered'}), 409
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data  = request.get_json()
    email = (data.get('email') or '').strip().lower()
    pwd   = data.get('password') or ''
    conn  = get_db()
    user  = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()
    if not user or user['password'] != hash_password(pwd):
        return jsonify({'error': 'Invalid email or password'}), 401
    session.permanent = True
    session['user_id']   = user['id']
    session['user_name'] = user['name']
    return jsonify({'success': True, 'user_id': user['id'], 'name': user['name']})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/me')
def me():
    if 'user_id' not in session:
        return jsonify({'logged_in': False})
    return jsonify({'logged_in': True, 'user_id': session['user_id'], 'name': session['user_name']})

# ── INCOME ────────────────────────────────────────────────────

@app.route('/api/income', methods=['GET'])
@require_auth
def get_income():
    conn = get_db()
    rows = conn.execute('SELECT * FROM income WHERE user_id=? ORDER BY id DESC', (session['user_id'],)).fetchall()
    conn.close()
    return jsonify({'data': rows_to_list(rows)})

@app.route('/api/income', methods=['POST'])
@require_auth
def add_income():
    data = request.get_json()
    if not data.get('name') or not data.get('amount'):
        return jsonify({'error': 'Name and amount required'}), 400
    conn = get_db()
    conn.execute('INSERT INTO income (user_id, name, amount, category) VALUES (?, ?, ?, ?)',
                 (session['user_id'], data['name'], float(data['amount']), data.get('category', 'Other')))
    conn.commit()
    new_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    return jsonify({'success': True, 'id': new_id})

@app.route('/api/income/<int:income_id>', methods=['DELETE'])
@require_auth
def delete_income(income_id):
    conn = get_db()
    conn.execute('DELETE FROM income WHERE id=? AND user_id=?', (income_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── TRANSACTIONS ──────────────────────────────────────────────

@app.route('/api/transactions', methods=['GET'])
@require_auth
def get_transactions():
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM transactions WHERE user_id=? ORDER BY date DESC, id DESC LIMIT 100',
        (session['user_id'],)
    ).fetchall()
    conn.close()
    return jsonify({'data': rows_to_list(rows)})

@app.route('/api/transactions', methods=['POST'])
@require_auth
def add_transaction():
    data = request.get_json()
    if not data.get('description') or not data.get('amount'):
        return jsonify({'error': 'Description and amount required'}), 400
    tx_date = data.get('date', str(date.today()))
    tx_type = data.get('type', 'expense')
    category = data.get('category', 'Other')
    conn = get_db()
    conn.execute(
        'INSERT INTO transactions (user_id, description, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?)',
        (session['user_id'], data['description'], float(data['amount']), tx_type, category, tx_date)
    )
    # Update budget spent if it's an expense
    if tx_type == 'expense':
        conn.execute('UPDATE budgets SET spent = spent + ? WHERE user_id=? AND category=?',
                     (float(data['amount']), session['user_id'], category))
    conn.commit()
    new_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    return jsonify({'success': True, 'id': new_id})

@app.route('/api/transactions/<int:tx_id>', methods=['DELETE'])
@require_auth
def delete_transaction(tx_id):
    conn = get_db()
    tx = conn.execute('SELECT * FROM transactions WHERE id=? AND user_id=?', (tx_id, session['user_id'])).fetchone()
    if tx and tx['type'] == 'expense':
        conn.execute('UPDATE budgets SET spent = MAX(0, spent - ?) WHERE user_id=? AND category=?',
                     (tx['amount'], session['user_id'], tx['category']))
    conn.execute('DELETE FROM transactions WHERE id=? AND user_id=?', (tx_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── BUDGETS ───────────────────────────────────────────────────

@app.route('/api/budgets', methods=['GET'])
@require_auth
def get_budgets():
    conn = get_db()
    rows = conn.execute('SELECT * FROM budgets WHERE user_id=? ORDER BY category', (session['user_id'],)).fetchall()
    conn.close()
    return jsonify({'data': rows_to_list(rows)})

@app.route('/api/budgets/<int:budget_id>', methods=['PUT'])
@require_auth
def update_budget(budget_id):
    data = request.get_json()
    conn = get_db()
    conn.execute('UPDATE budgets SET budget=? WHERE id=? AND user_id=?',
                 (float(data['budget']), budget_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── GOALS ─────────────────────────────────────────────────────

@app.route('/api/goals', methods=['GET'])
@require_auth
def get_goals():
    conn = get_db()
    rows = conn.execute('SELECT * FROM goals WHERE user_id=? ORDER BY id', (session['user_id'],)).fetchall()
    conn.close()
    return jsonify({'data': rows_to_list(rows)})

@app.route('/api/goals', methods=['POST'])
@require_auth
def add_goal():
    data = request.get_json()
    if not data.get('name') or not data.get('target'):
        return jsonify({'error': 'Name and target required'}), 400
    conn = get_db()
    conn.execute(
        'INSERT INTO goals (user_id, name, description, target, saved, monthly) VALUES (?, ?, ?, ?, ?, ?)',
        (session['user_id'], data['name'], data.get('description', ''),
         float(data['target']), float(data.get('saved', 0)), float(data.get('monthly', 0)))
    )
    conn.commit()
    new_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    return jsonify({'success': True, 'id': new_id})

@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
@require_auth
def delete_goal(goal_id):
    conn = get_db()
    conn.execute('DELETE FROM goals WHERE id=? AND user_id=?', (goal_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── DEBTS ─────────────────────────────────────────────────────

@app.route('/api/debts', methods=['GET'])
@require_auth
def get_debts():
    conn = get_db()
    rows = conn.execute('SELECT * FROM debts WHERE user_id=? ORDER BY rate DESC', (session['user_id'],)).fetchall()
    conn.close()
    return jsonify({'data': rows_to_list(rows)})

@app.route('/api/debts', methods=['POST'])
@require_auth
def add_debt():
    data = request.get_json()
    if not data.get('name') or not data.get('balance') or not data.get('rate') or not data.get('monthly'):
        return jsonify({'error': 'All debt fields required'}), 400
    conn = get_db()
    conn.execute(
        'INSERT INTO debts (user_id, name, balance, rate, monthly) VALUES (?, ?, ?, ?, ?)',
        (session['user_id'], data['name'], float(data['balance']), float(data['rate']), float(data['monthly']))
    )
    conn.commit()
    new_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    return jsonify({'success': True, 'id': new_id})

@app.route('/api/debts/<int:debt_id>', methods=['DELETE'])
@require_auth
def delete_debt(debt_id):
    conn = get_db()
    conn.execute('DELETE FROM debts WHERE id=? AND user_id=?', (debt_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── INVESTMENTS ───────────────────────────────────────────────

@app.route('/api/investments', methods=['GET'])
@require_auth
def get_investments():
    conn = get_db()
    rows = conn.execute('SELECT * FROM investments WHERE user_id=? ORDER BY value DESC', (session['user_id'],)).fetchall()
    conn.close()
    return jsonify({'data': rows_to_list(rows)})

@app.route('/api/investments', methods=['POST'])
@require_auth
def add_investment():
    data = request.get_json()
    if not data.get('name') or not data.get('cost'):
        return jsonify({'error': 'Name and cost required'}), 400
    conn = get_db()
    conn.execute(
        'INSERT INTO investments (user_id, name, description, cost, value, type) VALUES (?, ?, ?, ?, ?, ?)',
        (session['user_id'], data['name'], data.get('description', ''),
         float(data['cost']), float(data.get('value', data['cost'])), data.get('type', 'Other'))
    )
    conn.commit()
    new_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    return jsonify({'success': True, 'id': new_id})

@app.route('/api/investments/<int:inv_id>', methods=['DELETE'])
@require_auth
def delete_investment(inv_id):
    conn = get_db()
    conn.execute('DELETE FROM investments WHERE id=? AND user_id=?', (inv_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── DASHBOARD SUMMARY ─────────────────────────────────────────

@app.route('/api/summary')
@require_auth
def summary():
    uid  = session['user_id']
    conn = get_db()

    total_income  = conn.execute('SELECT COALESCE(SUM(amount),0) FROM income WHERE user_id=?', (uid,)).fetchone()[0]
    total_spent   = conn.execute('SELECT COALESCE(SUM(spent),0) FROM budgets WHERE user_id=?', (uid,)).fetchone()[0]
    total_debt    = conn.execute('SELECT COALESCE(SUM(balance),0) FROM debts WHERE user_id=?', (uid,)).fetchone()[0]
    portfolio_val = conn.execute('SELECT COALESCE(SUM(value),0) FROM investments WHERE user_id=?', (uid,)).fetchone()[0]
    portfolio_cost= conn.execute('SELECT COALESCE(SUM(cost),0) FROM investments WHERE user_id=?', (uid,)).fetchone()[0]
    goals_total   = conn.execute('SELECT COUNT(*) FROM goals WHERE user_id=?', (uid,)).fetchone()[0]
    goals_on_track= conn.execute("SELECT COUNT(*) FROM goals WHERE user_id=? AND saved >= target * 0.5", (uid,)).fetchone()[0]

    conn.close()
    return jsonify({
        'total_income':   round(total_income, 2),
        'total_spent':    round(total_spent, 2),
        'net_saved':      round(total_income - total_spent, 2),
        'total_debt':     round(total_debt, 2),
        'portfolio_value':round(portfolio_val, 2),
        'portfolio_cost': round(portfolio_cost, 2),
        'portfolio_gain': round(portfolio_val - portfolio_cost, 2),
        'goals_total':    goals_total,
        'goals_on_track': goals_on_track,
    })

# ── SEED DATA (demo) ──────────────────────────────────────────

@app.route('/api/seed', methods=['POST'])
@require_auth
def seed():
    """Populate account with demo data for portfolio showcase."""
    uid  = session['user_id']
    conn = get_db()

    conn.execute('DELETE FROM income WHERE user_id=?', (uid,))
    conn.execute('DELETE FROM transactions WHERE user_id=?', (uid,))
    conn.execute('DELETE FROM goals WHERE user_id=?', (uid,))
    conn.execute('DELETE FROM debts WHERE user_id=?', (uid,))
    conn.execute('DELETE FROM investments WHERE user_id=?', (uid,))

    income_data = [
        ('ACME Corp — Salary', 4200, 'Salary'),
        ('Freelance design',   450,  'Freelance'),
        ('ISA dividends',      200,  'Dividends'),
    ]
    for name, amt, cat in income_data:
        conn.execute('INSERT INTO income (user_id,name,amount,category) VALUES (?,?,?,?)', (uid,name,amt,cat))

    tx_data = [
        ('Salary — ACME Corp', 4200, 'income',  'Income',        '2026-06-01'),
        ('Rent payment',       1100, 'expense', 'Housing',       '2026-06-01'),
        ('Tesco grocery shop',   94, 'expense', 'Food',          '2026-05-31'),
        ('ISA contribution',    500, 'savings', 'Savings',       '2026-05-30'),
        ('Vanguard S&P 500',    300, 'invest',  'Investments',   '2026-05-28'),
        ('Spotify + Netflix',    23, 'expense', 'Subscriptions', '2026-05-27'),
        ('Oyster / TfL',        120, 'expense', 'Transport',     '2026-05-26'),
        ('Dining out',           85, 'expense', 'Entertainment', '2026-05-25'),
    ]
    for desc, amt, typ, cat, dt in tx_data:
        conn.execute('INSERT INTO transactions (user_id,description,amount,type,category,date) VALUES (?,?,?,?,?,?)',
                     (uid, desc, amt, typ, cat, dt))

    conn.execute('UPDATE budgets SET spent=1029 WHERE user_id=? AND category="Housing"', (uid,))
    conn.execute('UPDATE budgets SET spent=529  WHERE user_id=? AND category="Food"', (uid,))
    conn.execute('UPDATE budgets SET spent=353  WHERE user_id=? AND category="Transport"', (uid,))
    conn.execute('UPDATE budgets SET spent=294  WHERE user_id=? AND category="Entertainment"', (uid,))
    conn.execute('UPDATE budgets SET spent=83   WHERE user_id=? AND category="Subscriptions"', (uid,))

    goals_data = [
        ('Emergency fund',  '3 months of expenses', 8000,  6200, 200),
        ('House deposit',   'First home',           25000, 5000, 500),
        ('Holiday — Japan', 'Summer 2026',           2000,  1800, 100),
        ('New laptop',      'MacBook Pro M4',        1200,  1200,   0),
    ]
    for name, desc, target, saved, monthly in goals_data:
        conn.execute('INSERT INTO goals (user_id,name,description,target,saved,monthly) VALUES (?,?,?,?,?,?)',
                     (uid,name,desc,target,saved,monthly))

    debts_data = [
        ('Barclays credit card', 3200, 22.9, 400),
        ('Personal loan',        5800,  8.9, 320),
        ('Student loan',         3400,  4.5, 200),
    ]
    for name, bal, rate, monthly in debts_data:
        conn.execute('INSERT INTO debts (user_id,name,balance,rate,monthly) VALUES (?,?,?,?,?)',
                     (uid, name, bal, rate, monthly))

    inv_data = [
        ('S&P 500 ETF',    'Vanguard · Equity',   3790, 4100, 'ETF'),
        ('FTSE All-World', 'iShares · Global',    2300, 2400, 'ETF'),
        ('Gold ETC',       'iShares · Commodity',  880,  940, 'Other'),
        ('Cash ISA',       'Marcus · 5.1% AER',    770,  800, 'Cash ISA'),
    ]
    for name, desc, cost, val, typ in inv_data:
        conn.execute('INSERT INTO investments (user_id,name,description,cost,value,type) VALUES (?,?,?,?,?,?)',
                     (uid, name, desc, cost, val, typ))

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Demo data loaded'})


if __name__ == '__main__':
    init_db()
    print('CapitalCore running at http://localhost:5000')
    app.run(debug=True, port=5000)
