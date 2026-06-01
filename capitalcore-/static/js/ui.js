/* ui.js — render functions for every page */

const fmt  = n => '£' + Math.round(n).toLocaleString('en-GB');
const fmtD = n => '£' + n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});

function estDate(months) {
  const d = new Date(); d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
}

function showToast(msg, type='info') {
  const el = document.getElementById('mainToast');
  const mb = document.getElementById('toastMsg');
  if (!el || !mb) return;
  mb.textContent = msg;
  el.className = 'toast align-items-center text-white border-0 ' +
    (type==='success'?'bg-success':type==='error'?'bg-danger':'bg-dark');
  const t = bootstrap.Toast.getOrCreateInstance(el, {delay:2600});
  t.show();
}

/* ── OVERVIEW ────────────────────────── */
async function renderOverview() {
  try {
    const [sum, tx, bud] = await Promise.all([apiSummary(), apiGetTx(), apiGetBudgets()]);

    document.getElementById('ov-income').textContent    = fmt(sum.total_income);
    document.getElementById('ov-spent').textContent     = fmt(sum.total_spent);
    document.getElementById('ov-spent-pct').textContent = Math.round(sum.total_spent/sum.total_income*100||0)+'% of income';
    document.getElementById('ov-saved').textContent     = fmt(sum.net_saved);
    document.getElementById('ov-rate').textContent      = Math.round(sum.net_saved/sum.total_income*100||0)+'% savings rate';
    document.getElementById('ov-debt').textContent      = fmt(sum.total_debt);
    document.getElementById('ov-portfolio').textContent = fmt(sum.portfolio_value);
    const gainPct = sum.portfolio_cost > 0 ? ((sum.portfolio_gain/sum.portfolio_cost)*100).toFixed(1) : 0;
    document.getElementById('ov-gain').textContent = (sum.portfolio_gain>=0?'+':'')+gainPct+'%';

    // Transaction feed
    const feed = document.getElementById('txFeed'); if (!feed) return;
    const recent = (tx.data||[]).slice(0,6);
    if (!recent.length) { feed.innerHTML='<div class="empty-msg">No transactions yet.</div>'; return; }
    feed.innerHTML = recent.map(t => {
      const isInc  = t.type==='income', isSav=t.type==='savings', isInv=t.type==='invest';
      const amtCls = isInc?'g':isSav?'b':isInv?'p':'r';
      const sign   = isInc?'+':'-';
      const bCls   = isInc?'badge-income':isSav?'badge-savings':isInv?'badge-invest':'badge-expense';
      const dot    = isInc?'#10b981':isSav?'#2563eb':isInv?'#7c3aed':'#ef4444';
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

    buildDonut(bud.data||[]); buildTrend();
  } catch(e) { console.error('renderOverview:', e); }
}

/* ── INCOME ──────────────────────────── */
async function renderIncome() {
  try {
    const res = await apiGetIncome();
    const data = res.data || [];
    const total = data.reduce((a,i)=>a+i.amount, 0);
    document.getElementById('inc-total').textContent = fmt(total);
    document.getElementById('inc-annual').textContent = fmt(total*12);
    document.getElementById('inc-count').textContent = data.length;
    document.getElementById('inc-avg').textContent = data.length ? fmt(total/data.length) : '£0';

    const colors = ['#10b981','#2563eb','#7c3aed','#f59e0b','#ef4444','#94a3b8'];
    const list = document.getElementById('income-list');
    list.innerHTML = data.length ? data.map((inc,i) => `
      <div class="list-row">
        <div class="list-left">
          <div class="list-dot" style="background:${colors[i%colors.length]}"></div>
          <div><div class="list-name">${inc.name}</div><div class="list-sub">${inc.category}</div></div>
        </div>
        <div class="list-right">
          <span class="list-amount g">${fmt(inc.amount)}/mo</span>
          <button class="del-btn" onclick="deleteIncome(${inc.id})"><i class="bi bi-x"></i></button>
        </div>
      </div>`).join('') : '<div class="empty-msg">No income sources yet. Add one below.</div>';

    buildIncomeChart(data);
  } catch(e) { console.error('renderIncome:', e); }
}

/* ── SPENDING ────────────────────────── */
async function renderSpending() {
  try {
    const [bud, tx] = await Promise.all([apiGetBudgets(), apiGetTx()]);
    const budgets = bud.data || [];
    const total   = budgets.reduce((a,b)=>a+b.spent, 0);
    const budTotal= budgets.reduce((a,b)=>a+b.budget, 0);
    const over    = budgets.filter(b=>b.spent>b.budget).length;

    document.getElementById('sp-total').textContent     = fmt(total);
    document.getElementById('sp-budget').textContent    = fmt(budTotal);
    document.getElementById('sp-remaining').textContent = fmt(Math.max(0, budTotal-total));
    document.getElementById('sp-over').textContent      = over ? over+' cat.' : 'None';

    const bars = document.getElementById('budget-bars');
    bars.innerHTML = budgets.map(b => {
      const pct  = Math.min(100, Math.round(b.spent/b.budget*100||0));
      const over = b.spent > b.budget;
      const cls  = over?'bg-danger':pct>85?'bg-warning':'bg-success';
      const note = over?`<span class="note-over">£${Math.round(b.spent-b.budget)} over budget</span>`
                      :`<span class="note-${pct>85?'warn':'ok'}">£${Math.round(b.budget-b.spent)} remaining</span>`;
      return `<div class="budget-row">
        <div class="budget-top">
          <span class="budget-name">${b.category}</span>
          <span class="budget-vals"><strong>${fmt(b.spent)}</strong> / ${fmt(b.budget)}</span>
        </div>
        <div class="progress"><div class="progress-bar ${cls}" style="width:${pct}%"></div></div>
        <div class="budget-note">${note}</div>
      </div>`;
    }).join('');

    const expenses = (tx.data||[]).filter(t=>t.type==='expense');
    const txList = document.getElementById('tx-list');
    txList.innerHTML = expenses.length ? expenses.map(t => `
      <div class="list-row">
        <div class="list-left">
          <div class="list-dot" style="background:#ef4444"></div>
          <div><div class="list-name">${t.description}</div><div class="list-sub">${t.date}</div></div>
        </div>
        <div class="list-right">
          <span class="tx-badge badge-expense">${t.category}</span>
          <span class="list-amount r">-${fmt(t.amount)}</span>
          <button class="del-btn" onclick="deleteTx(${t.id})"><i class="bi bi-x"></i></button>
        </div>
      </div>`).join('') : '<div class="empty-msg">No transactions yet.</div>';
  } catch(e) { console.error('renderSpending:', e); }
}

/* ── SAVINGS ─────────────────────────── */
async function renderSavings() {
  try {
    const res = await apiGetGoals();
    const goals = res.data || [];
    const totalSaved = goals.reduce((a,g)=>a+g.saved, 0);
    const onTrack    = goals.filter(g=>g.saved>=g.target*0.5||g.saved>=g.target).length;
    const done       = goals.filter(g=>g.saved>=g.target).length;

    document.getElementById('sv-total').textContent = fmt(totalSaved);
    document.getElementById('sv-count').textContent = goals.length;
    document.getElementById('sv-track').textContent = onTrack+'/'+goals.length;
    document.getElementById('sv-done').textContent  = done;

    const list = document.getElementById('goals-list');
    list.innerHTML = goals.length ? goals.map(g => {
      const pct  = Math.min(100, Math.round(g.saved/g.target*100||0));
      const isDone = pct >= 100;
      const monthsLeft = g.monthly>0 ? Math.ceil((g.target-g.saved)/g.monthly) : null;
      const eta  = isDone ? null : monthsLeft ? estDate(monthsLeft) : null;
      const bCls = isDone?'gb-complete':pct>=50?'gb-track':'gb-behind';
      const bTxt = isDone?'Complete':pct>=50?'On track':'Getting there';
      const color= isDone?'#10b981':pct>=50?'#2563eb':'#f59e0b';
      const bsCls= isDone?'bg-success':pct>=50?'bg-primary':'bg-warning';
      return `<div class="goal-row">
        <div class="d-flex align-items-start justify-content-between mb-2">
          <div>
            <div class="goal-name">${g.name}</div>
            ${g.description?`<div class="goal-sub">${g.description}</div>`:''}
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="goal-badge ${bCls}">${bTxt}</span>
            <button class="del-btn" onclick="deleteGoal(${g.id})"><i class="bi bi-x"></i></button>
          </div>
        </div>
        <div class="progress mb-2"><div class="progress-bar ${bsCls}" style="width:${pct}%"></div></div>
        <div class="goal-meta">
          <span>${fmt(g.saved)} of ${fmt(g.target)} · ${pct}%</span>
          ${isDone?'<span class="eta text-success">Goal reached!</span>':eta?`<span class="eta">Est. ${eta}</span>`:''}
        </div>
      </div>`;
    }).join('') : '<div class="empty-msg">No goals yet. Add your first savings goal.</div>';
  } catch(e) { console.error('renderSavings:', e); }
}

/* ── DEBT ────────────────────────────── */
async function renderDebt() {
  try {
    const res   = await apiGetDebts();
    const debts = (res.data||[]).sort((a,b)=>b.rate-a.rate);
    const total  = debts.reduce((a,d)=>a+d.balance, 0);
    const monthly= debts.reduce((a,d)=>a+d.monthly, 0);
    const months = total>0&&monthly>0 ? Math.ceil(total/monthly) : 0;
    const estInt = debts.reduce((a,d)=>a+d.balance*(d.rate/100), 0)/12 * months;

    document.getElementById('dt-total').textContent    = fmt(total);
    document.getElementById('dt-monthly').textContent  = fmt(monthly)+'/mo';
    document.getElementById('dt-date').textContent     = months>0 ? estDate(months) : 'Debt free!';
    document.getElementById('dt-interest').textContent = fmt(Math.round(estInt));

    const list = document.getElementById('debt-list');
    list.innerHTML = debts.length ? `
      <div class="debt-table-header">
        <span>Debt</span><span>Balance</span><span>Rate</span><span>Progress</span><span></span>
      </div>` + debts.map((d,i) => {
      const pri  = i===0?'p-high':i===1?'p-med':'p-low';
      const pTxt = i===0?'Pay first':i===1?'Pay second':'Pay last';
      const pct  = Math.round(d.balance/debts[0].balance*100);
      const col  = i===0?'#ef4444':i===1?'#f59e0b':'#10b981';
      const bsCls= i===0?'bg-danger':i===1?'bg-warning':'bg-success';
      return `<div class="debt-table-row">
        <div>
          <div class="debt-name">${d.name}</div>
          <div class="debt-sub"><span class="priority-badge ${pri}">${pTxt}</span></div>
        </div>
        <span class="debt-val" style="color:${i===0?'#dc2626':'#0f172a'}">${fmt(d.balance)}</span>
        <span style="font-family:var(--mono);font-size:13px">${d.rate.toFixed(1)}%</span>
        <div>
          <div class="progress mb-1"><div class="progress-bar ${bsCls}" style="width:${pct}%"></div></div>
          <span style="font-size:11px;color:#94a3b8">${fmt(d.monthly)}/mo</span>
        </div>
        <button class="del-btn" onclick="deleteDebt(${d.id})"><i class="bi bi-x"></i></button>
      </div>`;
    }).join('') : '<div class="empty-msg">No debts added. Use the form below to add one.</div>';

    buildDebtChart(debts);
  } catch(e) { console.error('renderDebt:', e); }
}

/* ── INVESTMENTS ─────────────────────── */
async function renderInvestments() {
  try {
    const res  = await apiGetInvestments();
    const invs = res.data || [];
    const total = invs.reduce((a,i)=>a+i.value, 0);
    const cost  = invs.reduce((a,i)=>a+i.cost,  0);
    const gain  = total - cost;
    const pct   = cost>0 ? ((gain/cost)*100).toFixed(1) : 0;

    document.getElementById('inv-value').textContent  = fmt(total);
    document.getElementById('inv-cost').textContent   = fmt(cost);
    document.getElementById('inv-return').textContent = (gain>=0?'+':'')+fmt(gain);
    document.getElementById('inv-pct').textContent    = (gain>=0?'+':'')+pct+'%';
    document.getElementById('inv-count').textContent  = invs.length;

    const colors = ['#3b82f6','#10b981','#f59e0b','#a855f7','#ef4444','#94a3b8'];
    const list = document.getElementById('holdings-list');
    list.innerHTML = invs.length ? `
      <div class="holding-header">
        <span>Asset</span><span>Value</span><span>Return</span><span>Alloc.</span><span></span>
      </div>` + invs.map((inv,i) => {
      const ret   = ((inv.value-inv.cost)/inv.cost*100).toFixed(1);
      const alloc = Math.round(inv.value/total*100);
      const rCls  = parseFloat(ret)>=0?'g':'r';
      return `<div class="holding-row">
        <div class="d-flex align-items-center gap-2">
          <div class="list-dot" style="background:${colors[i%colors.length]}"></div>
          <div><div class="holding-name">${inv.name}</div><div class="holding-sub">${inv.description||inv.type}</div></div>
        </div>
        <span class="mono-right">${fmt(inv.value)}</span>
        <span class="mono-right ${rCls}">${parseFloat(ret)>=0?'+':''}${ret}%</span>
        <span class="mono-right">${alloc}%</span>
        <button class="del-btn" onclick="deleteInvestment(${inv.id})"><i class="bi bi-x"></i></button>
      </div>`;
    }).join('') : '<div class="empty-msg">No positions yet. Add one below.</div>';

    buildInvestChart(invs);
  } catch(e) { console.error('renderInvestments:', e); }
}
