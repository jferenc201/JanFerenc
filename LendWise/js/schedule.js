/* schedule.js — Amortisation schedule with search, filter, sort */

let scheduleView   = 'monthly';
let scheduleData   = [];
let scheduleSort   = { col: 'month', dir: 1 };
let scheduleFilter = { year: 'all', search: '' };

function setView(view, el) {
  scheduleView = view;
  document.querySelectorAll('.ctrl-btn:not(.danger)').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSchedule();
}

function buildSchedule(principal, annualRate, termYears, type) {
  const monthlyRate = annualRate / 100 / 12;
  const n = termYears * 12;
  let balance = principal;
  const mp = type === 'interest'
    ? principal * monthlyRate
    : (monthlyRate === 0 ? principal / n
        : principal * (monthlyRate * Math.pow(1+monthlyRate,n)) / (Math.pow(1+monthlyRate,n)-1));
  const rows = [];
  for (let m = 1; m <= n; m++) {
    const ip = balance * monthlyRate;
    const pp = type === 'interest' ? 0 : mp - ip;
    balance  = Math.max(0, balance - pp);
    rows.push({ month:m, year:Math.ceil(m/12), date:fmtDate(m), payment:mp, principal:pp, interest:ip, balance, equity:principal-balance });
  }
  return rows;
}

function renderSchedule() {
  if (!currentCalc) {
    document.getElementById('amortBody').innerHTML='<tr><td colspan="7" class="empty-row">Run a calculation first.</td></tr>';
    return;
  }
  const { principal, interestRate, termYears, mortgageType, monthlyPayment, totalRepayable, totalInterest } = currentCalc;
  scheduleData = buildSchedule(principal, interestRate, termYears, mortgageType);

  document.getElementById('scheduleStats').innerHTML = `
    <div class="sstat"><div class="sstat-label">Total Payments</div><div class="sstat-val">${scheduleData.length}</div></div>
    <div class="sstat"><div class="sstat-label">Monthly Payment</div><div class="sstat-val">${fmtCurrencyDecimal(monthlyPayment)}</div></div>
    <div class="sstat"><div class="sstat-label">Total Interest</div><div class="sstat-val">${fmtCurrency(totalInterest)}</div></div>
    <div class="sstat"><div class="sstat-label">Total Repayable</div><div class="sstat-val">${fmtCurrency(totalRepayable)}</div></div>`;

  const yearSel = document.getElementById('yearFilter');
  if (yearSel) {
    yearSel.innerHTML = '<option value="all">All years</option>';
    for (let y=1;y<=termYears;y++) {
      const o=document.createElement('option'); o.value=y; o.textContent='Year '+y; yearSel.appendChild(o);
    }
  }
  applyAndRender();
}

function applyAndRender() {
  const tbody = document.getElementById('amortBody');
  if (!scheduleData.length) return;
  let rows = [...scheduleData];
  if (scheduleFilter.year !== 'all') rows = rows.filter(r=>r.year===parseInt(scheduleFilter.year));
  if (scheduleFilter.search) {
    const q = scheduleFilter.search.toLowerCase();
    rows = rows.filter(r=>String(r.month).includes(q)||r.date.toLowerCase().includes(q));
  }
  rows.sort((a,b)=>(a[scheduleSort.col]-b[scheduleSort.col])*scheduleSort.dir);

  document.querySelectorAll('.amort-table th[data-sort]').forEach(th=>{
    th.classList.remove('sort-asc','sort-desc');
    if(th.dataset.sort===scheduleSort.col) th.classList.add(scheduleSort.dir===1?'sort-asc':'sort-desc');
  });

  const countEl = document.getElementById('scheduleCount');

  if (scheduleView === 'yearly') {
    const { termYears } = currentCalc;
    const byYear = [];
    for (let y=1;y<=termYears;y++) {
      const sl = scheduleData.filter(r=>r.year===y); if(!sl.length) continue;
      byYear.push({ label:'Year '+y, yearNum:new Date().getFullYear()+y-1,
        payment:sl.reduce((a,r)=>a+r.payment,0), principal:sl.reduce((a,r)=>a+r.principal,0),
        interest:sl.reduce((a,r)=>a+r.interest,0), balance:sl[sl.length-1].balance, equity:sl[sl.length-1].equity });
    }
    tbody.innerHTML = byYear.map(r=>`<tr class="year-row">
      <td>${r.label}</td><td>${r.yearNum}</td>
      <td>${fmtCurrencyDecimal(r.payment)}</td><td>${fmtCurrencyDecimal(r.principal)}</td>
      <td>${fmtCurrencyDecimal(r.interest)}</td><td>${fmtCurrency(r.balance)}</td><td>${fmtCurrency(r.equity)}</td>
    </tr>`).join('');
    if(countEl) countEl.textContent=byYear.length+' years';
    return;
  }

  if (!rows.length) {
    tbody.innerHTML='<tr><td colspan="7" class="empty-row">No results match your filter.</td></tr>';
    if(countEl) countEl.textContent='0 results'; return;
  }
  if(countEl) countEl.textContent=rows.length.toLocaleString()+' payments';
  tbody.innerHTML = rows.map(r=>`<tr>
    <td>${r.month}</td><td>${r.date}</td>
    <td>${fmtCurrencyDecimal(r.payment)}</td><td>${fmtCurrencyDecimal(r.principal)}</td>
    <td>${fmtCurrencyDecimal(r.interest)}</td><td>${fmtCurrency(r.balance)}</td><td>${fmtCurrency(r.equity)}</td>
  </tr>`).join('');
}

function filterByYear(val) { scheduleFilter.year=val; applyAndRender(); }
function searchSchedule(val) { scheduleFilter.search=val.trim(); applyAndRender(); }

function jumpToPayment() {
  const val=parseInt(document.getElementById('jumpInput').value);
  if(!val||val<1) return;
  const row=scheduleData.find(r=>r.month===val);
  if(!row){showToast('Payment #'+val+' not found','error');return;}
  scheduleFilter={year:'all',search:String(val)};
  document.getElementById('yearFilter').value='all';
  document.getElementById('scheduleSearch').value=String(val);
  setView('monthly',null);
  setTimeout(()=>{const rs=document.querySelectorAll('#amortBody tr');if(rs[0])rs[0].scrollIntoView({behavior:'smooth',block:'center'});},100);
}

function sortSchedule(col) {
  if(scheduleSort.col===col) scheduleSort.dir*=-1; else{scheduleSort.col=col;scheduleSort.dir=1;}
  applyAndRender();
}

function clearScheduleFilters() {
  scheduleFilter={year:'all',search:''};
  const ys=document.getElementById('yearFilter'),ss=document.getElementById('scheduleSearch'),ji=document.getElementById('jumpInput');
  if(ys)ys.value='all';if(ss)ss.value='';if(ji)ji.value='';
  applyAndRender();
}

function exportCSV() {
  if(!scheduleData.length){showToast('Run a calculation first','error');return;}
  const headers=['Month','Date','Payment','Principal','Interest','Balance','Equity'];
  const rows=scheduleData.map(r=>[r.month,r.date,r.payment.toFixed(2),r.principal.toFixed(2),r.interest.toFixed(2),r.balance.toFixed(2),r.equity.toFixed(2)].join(','));
  const csv=[headers.join(','),...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='amortisation-schedule.csv';a.click();URL.revokeObjectURL(url);
  showToast('CSV exported ✓','success');
}
