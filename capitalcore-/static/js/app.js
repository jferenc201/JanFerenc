/* app.js — auth, navigation, CRUD, boot */

const PAGES = ['overview','income','spending','savings','debt','investment'];
let isLoggedIn = false;

/* ── NAVIGATION ──────────────────────── */
function nav(page) {
  PAGES.forEach(p => {
    document.getElementById('page-'+p)?.classList.remove('active');
    document.getElementById('nb-'+p)?.classList.remove('active');
    document.getElementById('bb-'+p)?.classList.remove('active');
  });
  document.getElementById('page-'+page)?.classList.add('active');
  document.getElementById('nb-'+page)?.classList.add('active');
  document.getElementById('bb-'+page)?.classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  const collapse = document.getElementById('navbarNav');
  if (collapse?.classList.contains('show')) bootstrap.Collapse.getInstance(collapse)?.hide();
}

/* ── AUTH UI ─────────────────────────── */
function openAuth(tab) {
  const modal = new bootstrap.Modal(document.getElementById('authModal'));
  switchAuth(tab || 'login');
  modal.show();
}

function switchAuth(tab) {
  document.getElementById('panel-login').style.display    = tab==='login'    ? 'block' : 'none';
  document.getElementById('panel-register').style.display = tab==='register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active',    tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  clearAuthErrors();
}

function setAuthError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.style.display = 'block';
  el.previousElementSibling?.classList.add('is-invalid');
}

function clearAuthErrors() {
  ['le-err','lp-err','rn-err','re-err','rp-err','rp2-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent=''; el.style.display='none'; }
  });
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function updateAuthUI(loggedIn, name) {
  isLoggedIn = loggedIn;
  const out = document.getElementById('auth-out');
  const inp = document.getElementById('auth-in');
  const av  = document.getElementById('auth-avatar');
  const nm  = document.getElementById('auth-name');
  if (loggedIn) {
    if (out) { out.style.setProperty('display', 'none', 'important'); }
    if (inp) { inp.style.setProperty('display', 'flex', 'important'); }
    if (av)  av.textContent = (name||'U').charAt(0).toUpperCase();
    if (nm)  nm.textContent = name;
    const hr = new Date().getHours();
    const greet = hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
    const el = document.getElementById('greeting');
    if (el) el.textContent = greet+', '+(name||'').split(' ')[0];
  } else {
    if (out) { out.style.setProperty('display', 'flex', 'important'); }
    if (inp) { inp.style.setProperty('display', 'none', 'important'); }
    const el = document.getElementById('greeting');
    if (el) el.textContent = 'Welcome to CapitalCore';
  }
}

/* ── AUTH ACTIONS ────────────────────── */
async function register() {
  clearAuthErrors();
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  let ok = true;
  if (!name)                { setAuthError('rn-err','Name is required'); ok=false; }
  if (!email.includes('@')) { setAuthError('re-err','Valid email required'); ok=false; }
  if (pass.length < 6)      { setAuthError('rp-err','Min 6 characters'); ok=false; }
  if (pass !== pass2)       { setAuthError('rp2-err','Passwords do not match'); ok=false; }
  if (!ok) return;
  const res = await apiRegister({ name, email, password: pass });
  if (res.error) { setAuthError('re-err', res.error); return; }
  bootstrap.Modal.getInstance(document.getElementById('authModal'))?.hide();
  // Force hide both states then set correct one
  document.getElementById('auth-out').style.display = 'none';
  document.getElementById('auth-in').style.display  = 'none';
  updateAuthUI(true, res.name);
  showToast('Welcome to CapitalCore, '+res.name+'!', 'success');
  // Auto seed demo data on register
  await apiSeed();
  await refreshAll();
}

async function login() {
  clearAuthErrors();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email) { setAuthError('le-err','Email required'); return; }
  if (!pass)  { setAuthError('lp-err','Password required'); return; }
  const res = await apiLogin({ email, password: pass });
  if (res.error) { setAuthError('lp-err', res.error); return; }
  bootstrap.Modal.getInstance(document.getElementById('authModal'))?.hide();
  // Force hide both states then set correct one
  document.getElementById('auth-out').style.display = 'none';
  document.getElementById('auth-in').style.display  = 'none';
  updateAuthUI(true, res.name);
  showToast('Welcome back, '+res.name+'!', 'success');
  await refreshAll();
}

async function logout() {
  await apiLogout();
  updateAuthUI(false, '');
  showToast('Logged out', 'info');
  renderDemoData();
}

/* ── SEED DATA ───────────────────────── */
async function seedData() {
  const res = await apiSeed();
  if (res.success) { showToast('Demo data loaded!', 'success'); await refreshAll(); }
}

/* ── INCOME CRUD ─────────────────────── */
async function addIncome() {
  if (!isLoggedIn) { openAuth('login'); showToast('Please log in first','info'); return; }
  const name   = document.getElementById('inc-name').value.trim();
  const amount = parseFloat(document.getElementById('inc-amount').value);
  const cat    = document.getElementById('inc-cat').value;
  if (!name || !amount) { showToast('Please fill in name and amount','error'); return; }
  const res = await apiAddIncome({ name, amount, category: cat });
  if (res.success) {
    document.getElementById('inc-name').value = '';
    document.getElementById('inc-amount').value = '';
    showToast('Income added', 'success');
    await renderIncome();
  }
}

async function deleteIncome(id) {
  await apiDeleteIncome(id); showToast('Removed','info'); await renderIncome();
}

/* ── TRANSACTION CRUD ────────────────── */
async function addTransaction() {
  if (!isLoggedIn) { openAuth('login'); return; }
  const desc   = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const cat    = document.getElementById('tx-cat').value;
  const date   = document.getElementById('tx-date').value || new Date().toISOString().split('T')[0];
  if (!desc || !amount) { showToast('Please fill in description and amount','error'); return; }
  const res = await apiAddTx({ description:desc, amount, type:'expense', category:cat, date });
  if (res.success) {
    document.getElementById('tx-desc').value = '';
    document.getElementById('tx-amount').value = '';
    showToast('Transaction logged','success');
    await renderSpending(); await renderOverview();
  }
}

async function deleteTx(id) {
  await apiDeleteTx(id); showToast('Removed','info');
  await renderSpending(); await renderOverview();
}

/* ── GOALS CRUD ──────────────────────── */
function toggleGoalForm() {
  const el = document.getElementById('goal-form');
  el.style.display = el.style.display==='none' ? 'block' : 'none';
}

async function addGoal() {
  if (!isLoggedIn) { openAuth('login'); return; }
  const name    = document.getElementById('goal-name').value.trim();
  const desc    = document.getElementById('goal-desc').value.trim();
  const target  = parseFloat(document.getElementById('goal-target').value);
  const saved   = parseFloat(document.getElementById('goal-saved').value)||0;
  const monthly = parseFloat(document.getElementById('goal-monthly').value)||0;
  if (!name||!target) { showToast('Name and target required','error'); return; }
  const res = await apiAddGoal({ name, description:desc, target, saved, monthly });
  if (res.success) {
    ['goal-name','goal-desc','goal-target','goal-saved','goal-monthly'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('goal-form').style.display='none';
    showToast('Goal added','success'); await renderSavings();
  }
}

async function deleteGoal(id) {
  await apiDeleteGoal(id); showToast('Removed','info'); await renderSavings();
}

/* ── DEBT CRUD ───────────────────────── */
function toggleDebtForm() {
  const el = document.getElementById('debt-form');
  el.style.display = el.style.display==='none' ? 'block' : 'none';
}

async function addDebt() {
  if (!isLoggedIn) { openAuth('login'); return; }
  const name    = document.getElementById('debt-name').value.trim();
  const balance = parseFloat(document.getElementById('debt-balance').value);
  const rate    = parseFloat(document.getElementById('debt-rate').value);
  const monthly = parseFloat(document.getElementById('debt-pay').value);
  if (!name||!balance||!rate||!monthly) { showToast('All fields required','error'); return; }
  const res = await apiAddDebt({ name, balance, rate, monthly });
  if (res.success) {
    ['debt-name','debt-balance','debt-rate','debt-pay'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('debt-form').style.display='none';
    showToast('Debt added','success'); await renderDebt();
  }
}

async function deleteDebt(id) {
  await apiDeleteDebt(id); showToast('Removed','info'); await renderDebt();
}

/* ── INVESTMENT CRUD ─────────────────── */
function toggleInvForm() {
  const el = document.getElementById('inv-form');
  el.style.display = el.style.display==='none' ? 'block' : 'none';
}

async function addInvestment() {
  if (!isLoggedIn) { openAuth('login'); return; }
  const name = document.getElementById('inv-name').value.trim();
  const desc = document.getElementById('inv-desc').value.trim();
  const cost = parseFloat(document.getElementById('inv-cost-input').value);
  const val  = parseFloat(document.getElementById('inv-val-input').value)||cost;
  const type = document.getElementById('inv-type').value;
  if (!name||!cost) { showToast('Name and amount required','error'); return; }
  const res = await apiAddInvestment({ name, description:desc, cost, value:val, type });
  if (res.success) {
    ['inv-name','inv-desc','inv-cost-input','inv-val-input'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('inv-form').style.display='none';
    showToast('Position added','success');
    await renderInvestments(); await renderOverview();
  }
}

async function deleteInvestment(id) {
  await apiDeleteInvestment(id); showToast('Removed','info'); await renderInvestments();
}

/* ── DEMO DATA (shown when logged out) ── */
const DEMO = {
  summary: { total_income:4850, total_spent:2940, net_saved:1910, total_debt:12400, portfolio_value:8240, portfolio_cost:7740, portfolio_gain:500 },
  budgets: [
    {category:'Housing',budget:1100,spent:1029},{category:'Food',budget:600,spent:529},
    {category:'Transport',budget:300,spent:353},{category:'Entertainment',budget:400,spent:294},
    {category:'Subscriptions',budget:100,spent:83}
  ],
  transactions: [
    {id:1,description:'Salary — ACME Corp',amount:4200,type:'income',category:'Income',date:'2026-06-01'},
    {id:2,description:'Rent payment',amount:1100,type:'expense',category:'Housing',date:'2026-06-01'},
    {id:3,description:'Tesco grocery shop',amount:94,type:'expense',category:'Food',date:'2026-05-31'},
    {id:4,description:'ISA contribution',amount:500,type:'savings',category:'Savings',date:'2026-05-30'},
    {id:5,description:'Vanguard S&P 500',amount:300,type:'invest',category:'Investments',date:'2026-05-28'},
  ],
  income: [
    {id:1,name:'ACME Corp — Salary',amount:4200,category:'Salary'},
    {id:2,name:'Freelance design',amount:450,category:'Freelance'},
    {id:3,name:'ISA dividends',amount:200,category:'Dividends'},
  ],
  goals: [
    {id:1,name:'Emergency fund',description:'3 months of expenses',target:8000,saved:6200,monthly:200},
    {id:2,name:'House deposit',description:'First home',target:25000,saved:5000,monthly:500},
    {id:3,name:'Holiday — Japan',description:'Summer 2026',target:2000,saved:1800,monthly:100},
    {id:4,name:'New laptop',description:'MacBook Pro M4',target:1200,saved:1200,monthly:0},
  ],
  debts: [
    {id:1,name:'Barclays credit card',balance:3200,rate:22.9,monthly:400},
    {id:2,name:'Personal loan',balance:5800,rate:8.9,monthly:320},
    {id:3,name:'Student loan',balance:3400,rate:4.5,monthly:200},
  ],
  investments: [
    {id:1,name:'S&P 500 ETF',description:'Vanguard · Equity',cost:3790,value:4100,type:'ETF'},
    {id:2,name:'FTSE All-World',description:'iShares · Global',cost:2300,value:2400,type:'ETF'},
    {id:3,name:'Gold ETC',description:'iShares · Commodity',cost:880,value:940,type:'Other'},
    {id:4,name:'Cash ISA',description:'Marcus · 5.1% AER',cost:770,value:800,type:'Cash ISA'},
  ]
};

function renderDemoData() {
  // Overview metrics
  const s = DEMO.summary;
  const fmt = n => '£' + Math.round(n).toLocaleString('en-GB');
  document.getElementById('ov-income').textContent    = fmt(s.total_income);
  document.getElementById('ov-spent').textContent     = fmt(s.total_spent);
  document.getElementById('ov-spent-pct').textContent = Math.round(s.total_spent/s.total_income*100)+'% of income';
  document.getElementById('ov-saved').textContent     = fmt(s.net_saved);
  document.getElementById('ov-rate').textContent      = Math.round(s.net_saved/s.total_income*100)+'% savings rate';
  document.getElementById('ov-debt').textContent      = fmt(s.total_debt);
  document.getElementById('ov-portfolio').textContent = fmt(s.portfolio_value);
  document.getElementById('ov-gain').textContent      = '+6.4%';

  // Transaction feed
  const feed = document.getElementById('txFeed');
  if (feed) {
    feed.innerHTML = DEMO.transactions.map(t => {
      const isInc=t.type==='income', isSav=t.type==='savings', isInv=t.type==='invest';
      const amtCls=isInc?'g':isSav?'b':isInv?'p':'r';
      const sign=isInc?'+':'-';
      const bCls=isInc?'badge-income':isSav?'badge-savings':isInv?'badge-invest':'badge-expense';
      const dot=isInc?'#10b981':isSav?'#2563eb':isInv?'#7c3aed':'#ef4444';
      return `<div class="list-row">
        <div class="list-left">
          <div class="list-dot" style="background:${dot}"></div>
          <div><div class="list-name">${t.description}</div><div class="list-sub">${t.date}</div></div>
        </div>
        <div class="list-right">
          <span class="tx-badge ${bCls}">${t.category}</span>
          <span class="list-amount ${amtCls}">${sign}${fmt(t.amount)}</span>
        </div>
      </div>`;
    }).join('');
  }

  buildDonut(DEMO.budgets);
  buildTrend();

  // Income page
  const incList = document.getElementById('income-list');
  if (incList) {
    const colors=['#10b981','#2563eb','#7c3aed'];
    incList.innerHTML = DEMO.income.map((inc,i)=>`
      <div class="list-row">
        <div class="list-left">
          <div class="list-dot" style="background:${colors[i%colors.length]}"></div>
          <div><div class="list-name">${inc.name}</div><div class="list-sub">${inc.category}</div></div>
        </div>
        <span class="list-amount g">${fmt(inc.amount)}/mo</span>
      </div>`).join('');
    const total=DEMO.income.reduce((a,i)=>a+i.amount,0);
    document.getElementById('inc-total').textContent=fmt(total);
    document.getElementById('inc-annual').textContent=fmt(total*12);
    document.getElementById('inc-count').textContent=DEMO.income.length;
    document.getElementById('inc-avg').textContent=fmt(total/DEMO.income.length);
    buildIncomeChart(DEMO.income);
  }

  // Spending page
  const bars=document.getElementById('budget-bars');
  if (bars) {
    const total=DEMO.budgets.reduce((a,b)=>a+b.spent,0);
    const budTotal=DEMO.budgets.reduce((a,b)=>a+b.budget,0);
    const over=DEMO.budgets.filter(b=>b.spent>b.budget).length;
    document.getElementById('sp-total').textContent=fmt(total);
    document.getElementById('sp-budget').textContent=fmt(budTotal);
    document.getElementById('sp-remaining').textContent=fmt(Math.max(0,budTotal-total));
    document.getElementById('sp-over').textContent=over?over+' cat.':'None';
    bars.innerHTML=DEMO.budgets.map(b=>{
      const pct=Math.min(100,Math.round(b.spent/b.budget*100));
      const ov=b.spent>b.budget;
      const bsCls=ov?'bg-danger':pct>85?'bg-warning':'bg-success';
      const note=ov?`<span class="note-over">£${Math.round(b.spent-b.budget)} over budget</span>`
                   :`<span class="note-${pct>85?'warn':'ok'}">£${Math.round(b.budget-b.spent)} remaining</span>`;
      return `<div class="budget-row">
        <div class="budget-top"><span class="budget-name">${b.category}</span><span class="budget-vals"><strong>${fmt(b.spent)}</strong> / ${fmt(b.budget)}</span></div>
        <div class="progress"><div class="progress-bar ${bsCls}" style="width:${pct}%"></div></div>
        <div class="budget-note">${note}</div>
      </div>`;
    }).join('');
    const txList=document.getElementById('tx-list');
    if(txList) txList.innerHTML=DEMO.transactions.filter(t=>t.type==='expense').map(t=>`
      <div class="list-row">
        <div class="list-left"><div class="list-dot" style="background:#ef4444"></div>
          <div><div class="list-name">${t.description}</div><div class="list-sub">${t.date}</div></div>
        </div>
        <div class="list-right"><span class="tx-badge badge-expense">${t.category}</span><span class="list-amount r">-${fmt(t.amount)}</span></div>
      </div>`).join('');
  }

  // Savings
  const goalsList=document.getElementById('goals-list');
  if(goalsList){
    const totalSaved=DEMO.goals.reduce((a,g)=>a+g.saved,0);
    const onTrack=DEMO.goals.filter(g=>g.saved>=g.target*0.5||g.saved>=g.target).length;
    document.getElementById('sv-total').textContent=fmt(totalSaved);
    document.getElementById('sv-count').textContent=DEMO.goals.length;
    document.getElementById('sv-track').textContent=onTrack+'/'+DEMO.goals.length;
    document.getElementById('sv-done').textContent=DEMO.goals.filter(g=>g.saved>=g.target).length;
    goalsList.innerHTML=DEMO.goals.map(g=>{
      const pct=Math.min(100,Math.round(g.saved/g.target*100));
      const done=pct>=100;
      const bCls=done?'gb-complete':pct>=50?'gb-track':'gb-behind';
      const bTxt=done?'Complete':pct>=50?'On track':'Getting there';
      const bsCls=done?'bg-success':pct>=50?'bg-primary':'bg-warning';
      return `<div class="goal-row">
        <div class="d-flex align-items-start justify-content-between mb-2">
          <div><div class="goal-name">${g.name}</div><div class="goal-sub">${g.description}</div></div>
          <span class="goal-badge ${bCls}">${bTxt}</span>
        </div>
        <div class="progress mb-2"><div class="progress-bar ${bsCls}" style="width:${pct}%"></div></div>
        <div class="goal-meta"><span>${fmt(g.saved)} of ${fmt(g.target)} · ${pct}%</span>${done?'<span class="eta text-success">Goal reached!</span>':''}</div>
      </div>`;
    }).join('');
  }

  // Debt
  const debtList=document.getElementById('debt-list');
  if(debtList){
    const total=DEMO.debts.reduce((a,d)=>a+d.balance,0);
    const monthly=DEMO.debts.reduce((a,d)=>a+d.monthly,0);
    const months=Math.ceil(total/monthly);
    document.getElementById('dt-total').textContent=fmt(total);
    document.getElementById('dt-monthly').textContent=fmt(monthly)+'/mo';
    document.getElementById('dt-date').textContent=estDate(months);
    document.getElementById('dt-interest').textContent=fmt(1240);
    debtList.innerHTML=`<div class="debt-table-header"><span>Debt</span><span>Balance</span><span>Rate</span><span>Progress</span><span></span></div>`+
    DEMO.debts.map((d,i)=>{
      const pCls=['p-high','p-med','p-low'][i];
      const pTxt=['Pay first','Pay second','Pay last'][i];
      const bsCls=['bg-danger','bg-warning','bg-success'][i];
      const pct=Math.round(d.balance/DEMO.debts[0].balance*100);
      return `<div class="debt-table-row">
        <div><div class="debt-name">${d.name}</div><div class="debt-sub"><span class="priority-badge ${pCls}">${pTxt}</span></div></div>
        <span class="debt-val" style="color:${i===0?'#dc2626':'#0f172a'}">${fmt(d.balance)}</span>
        <span style="font-family:var(--mono);font-size:13px">${d.rate.toFixed(1)}%</span>
        <div><div class="progress mb-1"><div class="progress-bar ${bsCls}" style="width:${pct}%"></div></div><span style="font-size:11px;color:#94a3b8">${fmt(d.monthly)}/mo</span></div>
        <span></span>
      </div>`;
    }).join('');
    buildDebtChart(DEMO.debts);
  }

  // Investments
  const holdList=document.getElementById('holdings-list');
  if(holdList){
    const total=DEMO.investments.reduce((a,i)=>a+i.value,0);
    const cost=DEMO.investments.reduce((a,i)=>a+i.cost,0);
    const gain=total-cost;
    document.getElementById('inv-value').textContent=fmt(total);
    document.getElementById('inv-cost').textContent=fmt(cost);
    document.getElementById('inv-return').textContent='+'+fmt(gain);
    document.getElementById('inv-pct').textContent='+'+((gain/cost)*100).toFixed(1)+'%';
    document.getElementById('inv-count').textContent=DEMO.investments.length;
    const colors=['#3b82f6','#10b981','#f59e0b','#a855f7'];
    holdList.innerHTML=`<div class="holding-header"><span>Asset</span><span>Value</span><span>Return</span><span>Alloc.</span><span></span></div>`+
    DEMO.investments.map((inv,i)=>{
      const ret=((inv.value-inv.cost)/inv.cost*100).toFixed(1);
      const alloc=Math.round(inv.value/total*100);
      return `<div class="holding-row">
        <div class="d-flex align-items-center gap-2">
          <div class="list-dot" style="background:${colors[i]}"></div>
          <div><div class="holding-name">${inv.name}</div><div class="holding-sub">${inv.description}</div></div>
        </div>
        <span class="mono-right">${fmt(inv.value)}</span>
        <span class="mono-right g">+${ret}%</span>
        <span class="mono-right">${alloc}%</span>
        <span></span>
      </div>`;
    }).join('');
    buildInvestChart(DEMO.investments);
  }
}

function estDate(months) {
  const d=new Date(); d.setMonth(d.getMonth()+months);
  return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
}

/* ── REFRESH (when logged in) ────────── */
async function refreshAll() {
  await Promise.all([renderOverview(),renderIncome(),renderSpending(),renderSavings(),renderDebt(),renderInvestments()]);
}

/* ── BOOT ────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const txDate = document.getElementById('tx-date');
  if (txDate) txDate.value = new Date().toISOString().split('T')[0];
  const monthEl = document.getElementById('current-month');
  if (monthEl) monthEl.textContent = new Date().toLocaleDateString('en-GB',{month:'long',year:'numeric'});

  // Set logged-out state first (prevents flash of logged-in UI)
  updateAuthUI(false, '');

  // Always show demo data first so page is never empty
  renderDemoData();

  // Then check if logged in and replace with real data
  try {
    const me = await apiMe();
    if (me.logged_in) {
      updateAuthUI(true, me.name);
      await refreshAll();
    }
  } catch(e) {
    console.log('Running in demo mode');
  }
});
