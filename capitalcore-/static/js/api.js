/* api.js — all HTTP calls to the Flask backend */

const API = {
  async get(url) {
    const r = await fetch(url, { credentials: 'include' });
    return r.json();
  },
  async post(url, data) {
    const r = await fetch(url, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: 'DELETE', credentials: 'include' });
    return r.json();
  }
};

/* ── AUTH ───────────────────────────── */
async function apiRegister(d)  { return API.post('/api/auth/register', d); }
async function apiLogin(d)     { return API.post('/api/auth/login', d); }
async function apiLogout()     { return API.post('/api/auth/logout', {}); }
async function apiMe()         { return API.get('/api/auth/me'); }

/* ── INCOME ─────────────────────────── */
async function apiGetIncome()        { return API.get('/api/income'); }
async function apiAddIncome(d)       { return API.post('/api/income', d); }
async function apiDeleteIncome(id)   { return API.del(`/api/income/${id}`); }

/* ── TRANSACTIONS ────────────────────── */
async function apiGetTx()            { return API.get('/api/transactions'); }
async function apiAddTx(d)           { return API.post('/api/transactions', d); }
async function apiDeleteTx(id)       { return API.del(`/api/transactions/${id}`); }

/* ── BUDGETS ─────────────────────────── */
async function apiGetBudgets()       { return API.get('/api/budgets'); }

/* ── GOALS ───────────────────────────── */
async function apiGetGoals()         { return API.get('/api/goals'); }
async function apiAddGoal(d)         { return API.post('/api/goals', d); }
async function apiDeleteGoal(id)     { return API.del(`/api/goals/${id}`); }

/* ── DEBTS ───────────────────────────── */
async function apiGetDebts()         { return API.get('/api/debts'); }
async function apiAddDebt(d)         { return API.post('/api/debts', d); }
async function apiDeleteDebt(id)     { return API.del(`/api/debts/${id}`); }

/* ── INVESTMENTS ─────────────────────── */
async function apiGetInvestments()   { return API.get('/api/investments'); }
async function apiAddInvestment(d)   { return API.post('/api/investments', d); }
async function apiDeleteInvestment(id) { return API.del(`/api/investments/${id}`); }

/* ── SUMMARY ─────────────────────────── */
async function apiSummary()          { return API.get('/api/summary'); }

/* ── SEED ────────────────────────────── */
async function apiSeed()             { return API.post('/api/seed', {}); }
