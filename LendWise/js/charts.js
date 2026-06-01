/* charts.js — Simple, clear data visualisation */

let balanceChart = null;
let splitChart   = null;

function renderCharts() {
  if (!currentCalc) {
    document.getElementById('charts-empty').style.display = 'block';
    document.getElementById('charts-content').style.display = 'none';
    return;
  }
  document.getElementById('charts-empty').style.display = 'none';
  document.getElementById('charts-content').style.display = 'block';

  renderBalanceChart();
  renderSplitChart();
  renderChartSummary();
}

/* ── KEY NUMBERS SUMMARY ─────────────────────── */
function renderChartSummary() {
  const { principal, interestRate, termYears, mortgageType,
          monthlyPayment, totalRepayable, totalInterest, propertyValue, deposit } = currentCalc;

  const data = buildScheduleData(principal, interestRate, termYears, mortgageType);
  // Find crossover point (when equity > balance)
  const crossover = data.find(r => r.equity >= r.balance);
  const crossoverYear = crossover ? Math.ceil(crossover.month / 12) : null;
  // Find when 50% paid off
  const halfPaid = data.find(r => r.equity >= principal * 0.5);
  const halfYear = halfPaid ? Math.ceil(halfPaid.month / 12) : null;
  // First year interest
  const year1Interest = data.slice(0,12).reduce((a,r) => a + r.interest, 0);
  const year1Principal = data.slice(0,12).reduce((a,r) => a + r.principal, 0);

  document.getElementById('chart-stat-1').innerHTML =
    `<div class="cs-val">${fmtCurrency(totalInterest)}</div>
     <div class="cs-label">Total interest paid</div>
     <div class="cs-sub">On top of your £${Math.round(principal/1000)}k loan</div>`;

  document.getElementById('chart-stat-2').innerHTML =
    `<div class="cs-val">${crossoverYear ? 'Year ' + crossoverYear : '—'}</div>
     <div class="cs-label">You own more than you owe</div>
     <div class="cs-sub">When your equity overtakes the balance</div>`;

  document.getElementById('chart-stat-3').innerHTML =
    `<div class="cs-val">${halfYear ? 'Year ' + halfYear : '—'}</div>
     <div class="cs-label">Loan is 50% repaid</div>
     <div class="cs-sub">Halfway point of your mortgage</div>`;

  document.getElementById('chart-stat-4').innerHTML =
    `<div class="cs-val">${Math.round(year1Interest / (year1Interest + year1Principal) * 100)}%</div>
     <div class="cs-label">Year 1 goes to interest</div>
     <div class="cs-sub">Only ${Math.round(year1Principal/(year1Interest+year1Principal)*100)}% reduces your debt</div>`;
}

/* ── BALANCE OVER TIME ───────────────────────── */
function renderBalanceChart() {
  const { principal, interestRate, termYears, mortgageType, deposit } = currentCalc;
  const data = buildScheduleData(principal, interestRate, termYears, mortgageType);

  // Yearly points
  const pts = [{ year: 0, balance: principal, equity: deposit || 0, owe: principal }];
  for (let y = 1; y <= termYears; y++) {
    const row = data[Math.min(y * 12 - 1, data.length - 1)];
    pts.push({ year: y, balance: row.balance, equity: (deposit || 0) + row.equity });
  }

  const ctx = document.getElementById('balanceChart');
  if (!ctx) return;
  if (balanceChart) balanceChart.destroy();

  balanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: pts.map(p => p.year === 0 ? 'Start' : 'Yr ' + p.year),
      datasets: [
        {
          label: '💰 What you owe (mortgage balance)',
          data: pts.map(p => Math.round(p.balance)),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.06)',
          borderWidth: 2.5, fill: true, tension: 0.3,
          pointRadius: 0, pointHoverRadius: 6,
        },
        {
          label: '🏠 What you own (equity)',
          data: pts.map(p => Math.round(p.equity)),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.06)',
          borderWidth: 2.5, fill: true, tension: 0.3,
          pointRadius: 0, pointHoverRadius: 6,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Inter', size: 13 }, color: '#3d3d3d', boxWidth: 14, padding: 20 }
        },
        tooltip: {
          backgroundColor: '#1a1a2e', titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'JetBrains Mono', size: 12 }, padding: 12, cornerRadius: 8,
          callbacks: {
            title: items => 'Year ' + (items[0].dataIndex),
            label: ctx => `  ${ctx.dataset.label.split('(')[1].replace(')','')}: £${ctx.raw.toLocaleString('en-GB')}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#8a8a8a', maxTicksLimit: 14 }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { family: 'JetBrains Mono', size: 11 }, color: '#8a8a8a',
            callback: v => '£' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)
          }
        }
      }
    }
  });
}

/* ── INTEREST VS PRINCIPAL ───────────────────── */
function renderSplitChart() {
  const { principal, interestRate, termYears, mortgageType } = currentCalc;
  const data = buildScheduleData(principal, interestRate, termYears, mortgageType);

  const yearly = [];
  for (let y = 1; y <= termYears; y++) {
    const sl = data.slice((y-1)*12, y*12);
    if (!sl.length) break;
    yearly.push({
      year: y,
      toBank:  sl.reduce((a,r) => a + r.interest,  0),
      toLoan:  sl.reduce((a,r) => a + r.principal, 0),
    });
  }

  const ctx = document.getElementById('splitChart');
  if (!ctx) return;
  if (splitChart) splitChart.destroy();

  splitChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: yearly.map(r => 'Yr ' + r.year),
      datasets: [
        {
          label: '🔴 Goes to the bank (interest)',
          data: yearly.map(r => Math.round(r.toBank)),
          backgroundColor: 'rgba(220,38,38,0.7)',
          borderRadius: 3, borderSkipped: false,
        },
        {
          label: '🟢 Reduces your debt (principal)',
          data: yearly.map(r => Math.round(r.toLoan)),
          backgroundColor: 'rgba(26,26,46,0.8)',
          borderRadius: 3, borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index' },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Inter', size: 13 }, color: '#3d3d3d', boxWidth: 14, padding: 20 }
        },
        tooltip: {
          backgroundColor: '#1a1a2e', titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'JetBrains Mono', size: 12 }, padding: 12, cornerRadius: 8,
          callbacks: {
            title: items => 'Year ' + items[0].label.replace('Yr ',''),
            label: ctx => `  ${ctx.dataset.label.split('(')[1].replace(')','')}: £${ctx.raw.toLocaleString('en-GB')}`
          }
        }
      },
      scales: {
        x: {
          stacked: true, grid: { display: false },
          ticks: { font: { family: 'Inter', size: 10 }, color: '#8a8a8a' }
        },
        y: {
          stacked: true, grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { family: 'JetBrains Mono', size: 11 }, color: '#8a8a8a',
            callback: v => '£' + (v/1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
}

function buildScheduleData(principal, annualRate, termYears, type) {
  const mr = annualRate / 100 / 12;
  const n  = termYears * 12;
  const mp = type === 'interest' ? principal * mr
    : principal * (mr * Math.pow(1+mr,n)) / (Math.pow(1+mr,n)-1);
  let balance = principal;
  const rows = [];
  for (let m = 1; m <= n; m++) {
    const ip = balance * mr;
    const pp = type === 'interest' ? 0 : mp - ip;
    balance  = Math.max(0, balance - pp);
    rows.push({ month:m, principal:pp, interest:ip, balance, equity:principal-balance });
  }
  return rows;
}
