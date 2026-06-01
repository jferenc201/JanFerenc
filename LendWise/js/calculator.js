/* calculator.js — core mortgage calculation engine */

let currentCalc = null;
let donutChart   = null;
let mortgageType = 'repayment';

function setType(type) {
  mortgageType = type;
  document.getElementById('btn-repayment').classList.toggle('active', type === 'repayment');
  document.getElementById('btn-interest').classList.toggle('active', type === 'interest');
  if (currentCalc) calculate();
}

/* ── CORE CALCULATION ─────────────────────────── */
function calcMortgage(principal, annualRate, termYears, type) {
  const monthlyRate = annualRate / 100 / 12;
  const n = termYears * 12;

  let monthlyPayment;
  if (type === 'interest') {
    monthlyPayment = principal * monthlyRate;
  } else {
    if (monthlyRate === 0) {
      monthlyPayment = principal / n;
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
                       (Math.pow(1 + monthlyRate, n) - 1);
    }
  }

  const totalRepayable = type === 'interest'
    ? monthlyPayment * n + principal
    : monthlyPayment * n;

  const totalInterest = totalRepayable - principal;

  return { monthlyPayment, totalRepayable, totalInterest, n, monthlyRate };
}

/* ── UI CALCULATION ───────────────────────────── */
function calculate() {
  const propertyValue = parseFloat(document.getElementById('propertyValue').value) || 0;
  const deposit       = parseFloat(document.getElementById('deposit').value) || 0;
  const interestRate  = parseFloat(document.getElementById('interestRate').value) || 0;
  const termYears     = parseInt(document.getElementById('term').value) || 25;
  const principal     = propertyValue - deposit;

  if (principal <= 0) { showToast('Deposit cannot exceed property value', 'error'); return; }
  if (interestRate <= 0) { showToast('Please enter a valid interest rate', 'error'); return; }

  const result = calcMortgage(principal, interestRate, termYears, mortgageType);
  const ltv    = (principal / propertyValue) * 100;

  currentCalc = {
    propertyValue, deposit, interestRate, termYears, principal,
    mortgageType, ltv, ...result,
    timestamp: new Date().toISOString()
  };

  // Update results
  document.getElementById('monthlyPayment').textContent  = fmtCurrencyDecimal(result.monthlyPayment);
  document.getElementById('monthlyBreakdown').textContent =
    mortgageType === 'interest'
      ? 'Interest only — principal outstanding'
      : `Over ${termYears} years`;
  document.getElementById('totalRepayable').textContent = fmtCurrency(result.totalRepayable);
  document.getElementById('totalSub').textContent       = `Loan: ${fmtCurrency(principal)}`;
  document.getElementById('totalInterest').textContent  = fmtCurrency(result.totalInterest);
  document.getElementById('interestPct').textContent    =
    fmtPct((result.totalInterest / result.totalRepayable) * 100) + ' of total';
  document.getElementById('ltvValue').textContent       = fmtPct(ltv);
  document.getElementById('ltvBand').textContent        = ltvBand(ltv);

  updateDonut(principal, deposit, result.totalInterest);
  updateRateTable(principal, termYears, interestRate);
}

/* ── LTV BAND ─────────────────────────────────── */
function ltvBand(ltv) {
  if (ltv <= 60) return '✓ Excellent — best rates available';
  if (ltv <= 75) return '✓ Good — competitive rates';
  if (ltv <= 85) return '◎ Moderate — standard rates';
  if (ltv <= 90) return '△ High — limited lenders';
  return '✗ Very high — specialist required';
}

/* ── DONUT CHART ──────────────────────────────── */
function updateDonut(principal, deposit, interest) {
  const ctx = document.getElementById('donutChart').getContext('2d');
  const data = [principal, interest, deposit];
  const labels = ['Loan', 'Interest', 'Deposit'];
  const colors = ['#c9a84c', '#e74c3c', '#27ae60'];
  const total  = principal + interest + deposit;

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmtCurrency(ctx.raw)} (${fmtPct(ctx.raw / total * 100)})`
          }
        }
      }
    }
  });

  const legend = document.getElementById('chartLegend');
  legend.innerHTML = labels.map((l, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span class="legend-label">${l}</span>
      <span class="legend-value">${fmtCurrency(data[i])}</span>
      <span class="legend-pct">${fmtPct(data[i] / total * 100)}</span>
    </div>
  `).join('');
}

/* ── RATE COMPARISON TABLE ────────────────────── */
function updateRateTable(principal, termYears, currentRate) {
  const rates = [];
  const base  = Math.max(0.5, Math.floor((currentRate - 1) * 2) / 2);
  for (let i = 0; i <= 8; i++) {
    rates.push(parseFloat((base + i * 0.5).toFixed(1)));
  }

  const baseMonthly = calcMortgage(principal, currentRate, termYears, mortgageType).monthlyPayment;
  const maxMonthly  = Math.max(...rates.map(r => calcMortgage(principal, r, termYears, mortgageType).monthlyPayment));
  const minMonthly  = Math.min(...rates.map(r => calcMortgage(principal, r, termYears, mortgageType).monthlyPayment));
  const table = document.getElementById('rateTable');

  const header = `<div class="rate-header">
    <span>Rate</span>
    <span>Monthly payment</span>
    <span></span>
    <span style="text-align:right">vs your rate</span>
  </div>`;

  const rows = rates.map(r => {
    const m         = calcMortgage(principal, r, termYears, mortgageType).monthlyPayment;
    const diff      = m - baseMonthly;
    const isCurrent = Math.abs(r - currentRate) < 0.05;
    const barPct    = ((m - minMonthly) / (maxMonthly - minMonthly) * 100) || 0;
    const diffStr   = diff === 0 ? '— your rate'
      : (diff > 0 ? '+' : '') + fmtCurrencyDecimal(diff) + '/mo';
    const diffCls   = diff === 0 ? 'rate-diff-neutral' : diff > 0 ? 'positive' : 'negative';
    return `<div class="rate-row${isCurrent ? ' current' : ''}">
      <span class="rate-num">${r.toFixed(1)}%</span>
      <span class="rate-monthly">${fmtCurrencyDecimal(m)}</span>
      <span class="rate-bar-cell"><span class="rate-bar-fill" style="width:${barPct.toFixed(1)}%"></span></span>
      <span class="rate-diff ${diffCls}">${diffStr}</span>
    </div>`;
  }).join('');

  table.innerHTML = header + rows;
}

/* ── SLIDER SYNC ──────────────────────────────── */
function initSliders() {
  const propertyVal  = document.getElementById('propertyValue');
  const propertySld  = document.getElementById('propertySlider');
  const depositVal   = document.getElementById('deposit');
  const depositPct   = document.getElementById('depositPct');
  const depositSld   = document.getElementById('depositSlider');
  const rateVal      = document.getElementById('interestRate');
  const rateSld      = document.getElementById('rateSlider');
  const termVal      = document.getElementById('term');
  const termSld      = document.getElementById('termSlider');

  propertySld.addEventListener('input', () => {
    propertyVal.value = propertySld.value;
    syncDeposit();
  });
  propertyVal.addEventListener('input', () => {
    propertySld.value = propertyVal.value;
    syncDeposit();
  });

  depositSld.addEventListener('input', () => {
    const pct = parseFloat(depositSld.value);
    depositPct.value = pct;
    depositVal.value = Math.round(parseFloat(propertyVal.value) * pct / 100);
  });
  depositPct.addEventListener('input', () => {
    const pct = parseFloat(depositPct.value);
    depositSld.value = pct;
    depositVal.value = Math.round(parseFloat(propertyVal.value) * pct / 100);
  });
  depositVal.addEventListener('input', () => {
    const pct = (parseFloat(depositVal.value) / parseFloat(propertyVal.value)) * 100;
    depositPct.value = pct.toFixed(1);
    depositSld.value = pct;
  });

  rateSld.addEventListener('input', () => { rateVal.value = rateSld.value; });
  rateVal.addEventListener('input', () => { rateSld.value = rateVal.value; });

  termSld.addEventListener('input', () => { termVal.value = termSld.value; });
  termVal.addEventListener('input', () => { termSld.value = termVal.value; });
}

function syncDeposit() {
  const pct = parseFloat(document.getElementById('depositPct').value) || 20;
  const val = parseFloat(document.getElementById('propertyValue').value) || 0;
  document.getElementById('deposit').value = Math.round(val * pct / 100);
}
