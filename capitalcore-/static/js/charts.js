/* charts.js — Chart.js visualisations */

let _donut = null, _trend = null, _income = null, _debt = null, _invest = null;

const GRID  = { color: 'rgba(0,0,0,0.05)' };
const TICKS = { color: '#94a3b8', font: { family: 'Inter', size: 11 } };
const BASE  = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

const CAT_COLORS = {
  Housing:'#3b82f6', Food:'#10b981', Transport:'#f59e0b',
  Entertainment:'#ef4444', Subscriptions:'#a855f7', Other:'#94a3b8', Savings:'#2563eb', Investments:'#7c3aed'
};

function buildDonut(budgets) {
  const ctx = document.getElementById('donutChart'); if (!ctx) return;
  const labels = budgets.map(b => b.category);
  const values = budgets.map(b => b.spent);
  const colors = labels.map(l => CAT_COLORS[l] || '#94a3b8');
  const total  = values.reduce((a,b) => a+b, 0);
  if (_donut) _donut.destroy();
  _donut = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }] },
    options: { ...BASE, cutout: '68%', plugins: { legend: { display:false },
      tooltip: { callbacks: { label: c => ` ${c.label}: £${c.raw.toLocaleString('en-GB')} (${Math.round(c.raw/total*100)}%)` } } } }
  });
  const el = document.getElementById('donutLegend'); if (!el) return;
  el.innerHTML = labels.map((l,i) =>
    `<span class="leg-item"><span class="leg-sq" style="background:${colors[i]}"></span>${l} £${values[i].toLocaleString('en-GB')}</span>`
  ).join('');
}

function buildTrend() {
  const ctx = document.getElementById('trendChart'); if (!ctx) return;
  if (_trend) _trend.destroy();
  _trend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun'],
      datasets: [
        { label:'Income',   data:[4200,4200,4650,4650,4650,4850], backgroundColor:'rgba(16,185,129,0.75)',  borderRadius:4, borderSkipped:false },
        { label:'Spending', data:[3100,2800,3200,2950,2700,2940], backgroundColor:'rgba(248,113,113,0.75)', borderRadius:4, borderSkipped:false }
      ]
    },
    options: { ...BASE, scales: { x:{ grid:{display:false}, ticks:TICKS }, y:{ grid:GRID, ticks:{...TICKS, callback:v=>'£'+(v/1000).toFixed(0)+'k'} } } }
  });
}

function buildIncomeChart(income) {
  const ctx = document.getElementById('incomeChart'); if (!ctx) return;
  if (_income) _income.destroy();
  const total = income.reduce((a,i) => a + i.amount, 0);
  const labels = income.map(i => i.name.length > 14 ? i.name.slice(0,14)+'…' : i.name);
  const values = income.map(i => i.amount);
  _income = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun'],
            datasets: [{ data: values.length ? values : [4200,4200,4650,4650,4650,4850],
                         backgroundColor:'rgba(37,99,235,0.7)', borderRadius:5, borderSkipped:false }] },
    options: { ...BASE, scales: { x:{grid:{display:false},ticks:TICKS}, y:{grid:GRID, ticks:{...TICKS, callback:v=>'£'+(v/1000).toFixed(1)+'k'}} } }
  });
}

function buildDebtChart(debts) {
  const ctx = document.getElementById('debtChart'); if (!ctx) return;
  if (_debt) _debt.destroy();
  const total  = debts.reduce((a,d) => a + d.balance, 0);
  const tPay   = debts.reduce((a,d) => a + d.monthly, 0);
  const labels = ['Now']; const values = [Math.round(total)];
  let rem = total;
  for (let m=1; m<=60 && rem>0; m++) {
    rem = Math.max(0, rem - tPay);
    labels.push('M'+m); values.push(Math.round(rem));
    if (rem === 0) break;
  }
  _debt = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{ data:values, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.07)', borderWidth:2, fill:true, tension:0.3, pointRadius:0, pointHoverRadius:5 }] },
    options:{ ...BASE, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>' Balance: £'+c.raw.toLocaleString('en-GB')}}},
      scales:{ x:{grid:{display:false},ticks:{...TICKS,maxTicksLimit:8}}, y:{grid:GRID,ticks:{...TICKS,callback:v=>'£'+(v/1000).toFixed(0)+'k'}} } }
  });
}

function buildInvestChart(investments) {
  const ctx = document.getElementById('investChart'); if (!ctx) return;
  if (_invest) _invest.destroy();
  const total = investments.reduce((a,i) => a+i.value, 0) || 8240;
  const cost  = investments.reduce((a,i) => a+i.cost,  0) || 7740;
  const start = Math.round(cost * 0.4);
  const vals  = Array.from({length:12}, (_,i) => Math.round(start + (total-start)*(i/11)));
  _invest = new Chart(ctx, {
    type:'line',
    data:{ labels:['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],
           datasets:[{ data:vals, borderColor:'#7c3aed', backgroundColor:'rgba(124,58,237,0.07)', borderWidth:2, fill:true, tension:0.4, pointRadius:0, pointHoverRadius:5 }] },
    options:{ ...BASE, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>' Value: £'+c.raw.toLocaleString('en-GB')}}},
      scales:{ x:{grid:{display:false},ticks:TICKS}, y:{grid:GRID,ticks:{...TICKS,callback:v=>'£'+(v/1000).toFixed(0)+'k'}} } }
  });
}
