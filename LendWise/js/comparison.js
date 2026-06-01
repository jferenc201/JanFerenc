/* comparison.js — Mortgage product comparison table */

// Representative UK lender rates (illustrative — update regularly)
const LENDER_PRODUCTS = [
  { lender: 'Halifax',      type: '2yr Fixed',  rate: 4.18, fee: 999,  ltv: 85, logo: 'H' },
  { lender: 'Nationwide',   type: '2yr Fixed',  rate: 4.24, fee: 999,  ltv: 85, logo: 'N' },
  { lender: 'Santander',    type: '2yr Fixed',  rate: 4.35, fee: 999,  ltv: 85, logo: 'S' },
  { lender: 'Barclays',     type: '2yr Fixed',  rate: 4.41, fee: 1499, ltv: 85, logo: 'B' },
  { lender: 'NatWest',      type: '2yr Fixed',  rate: 4.45, fee: 995,  ltv: 85, logo: 'N' },
  { lender: 'HSBC',         type: '2yr Fixed',  rate: 4.49, fee: 999,  ltv: 90, logo: 'H' },
  { lender: 'Virgin Money', type: '5yr Fixed',  rate: 4.02, fee: 995,  ltv: 80, logo: 'V' },
  { lender: 'Leeds BS',     type: '5yr Fixed',  rate: 4.08, fee: 0,    ltv: 80, logo: 'L' },
  { lender: 'Coventry BS',  type: '5yr Fixed',  rate: 4.11, fee: 999,  ltv: 85, logo: 'C' },
  { lender: 'Halifax',      type: '5yr Fixed',  rate: 4.15, fee: 999,  ltv: 85, logo: 'H' },
  { lender: 'Nationwide',   type: '5yr Fixed',  rate: 4.19, fee: 999,  ltv: 90, logo: 'N' },
  { lender: 'Platform',     type: 'Tracker',    rate: 4.65, fee: 0,    ltv: 80, logo: 'P' },
  { lender: 'First Direct', type: 'Tracker',    rate: 4.74, fee: 490,  ltv: 80, logo: 'F' },
];

let comparisonPrincipal = 280000;
let comparisonTerm      = 25;
let comparisonSortCol   = 'monthly';
let comparisonSortDir   = 1;
let comparisonFilter    = 'all';

function renderComparison() {
  const principal = currentCalc ? currentCalc.principal : comparisonPrincipal;
  const term      = currentCalc ? currentCalc.termYears  : comparisonTerm;

  // Filter
  let products = LENDER_PRODUCTS.filter(p => {
    if (comparisonFilter === '2yr') return p.type.includes('2yr');
    if (comparisonFilter === '5yr') return p.type.includes('5yr');
    if (comparisonFilter === 'tracker') return p.type === 'Tracker';
    return true;
  });

  // Calculate monthly for each
  products = products.map(p => {
    const monthly  = calcMortgage(principal, p.rate, term, 'repayment').monthlyPayment;
    const totalCost = monthly * term * 12 + p.fee;
    return { ...p, monthly, totalCost };
  });

  // Sort
  products.sort((a, b) => {
    const va = a[comparisonSortCol], vb = b[comparisonSortCol];
    return (va - vb) * comparisonSortDir;
  });

  const best = products[0];
  const userRate = currentCalc ? currentCalc.interestRate : null;

  // Update inputs display
  document.getElementById('comp-principal').textContent = fmtCurrency(principal);
  document.getElementById('comp-term').textContent = term + ' years';

  const tbody = document.getElementById('comp-tbody');
  tbody.innerHTML = products.map((p, i) => {
    const saving    = best.monthly - p.monthly;
    const isBest    = i === 0;
    const isUser    = userRate && Math.abs(p.rate - userRate) < 0.05;
    const feeAnnual = p.fee / (p.type.includes('5yr') ? 5 : 2);
    const trueCostNote = p.fee > 0 ? `+£${Math.round(feeAnnual)}/yr fee` : 'No fee';

    return `<tr class="comp-row${isBest ? ' best' : ''}${isUser ? ' user-rate' : ''}">
      <td class="comp-lender">
        <div class="lender-logo">${p.logo}</div>
        <div>
          <div class="lender-name">${p.lender}</div>
          <div class="lender-type">${p.type}</div>
        </div>
        ${isBest ? '<span class="best-badge">Best rate</span>' : ''}
        ${isUser ? '<span class="user-badge">Your rate</span>' : ''}
      </td>
      <td class="comp-rate">${p.rate.toFixed(2)}%</td>
      <td class="comp-monthly">${fmtCurrencyDecimal(p.monthly)}</td>
      <td class="comp-fee">${p.fee > 0 ? fmtCurrency(p.fee) : '<span class="no-fee">None</span>'}</td>
      <td class="comp-true" title="Total cost over deal period">
        ${fmtCurrency(p.totalCost)}
        <div class="true-note">${trueCostNote}</div>
      </td>
      <td class="comp-save ${saving > 0 ? 'saving' : saving < 0 ? 'cost' : ''}">
        ${saving === 0 ? '—' : (saving > 0 ? '-' : '+') + fmtCurrencyDecimal(Math.abs(saving)) + '/mo'}
      </td>
    </tr>`;
  }).join('');
}

function setCompFilter(filter, el) {
  comparisonFilter = filter;
  document.querySelectorAll('.comp-filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderComparison();
}

function sortComparison(col) {
  if (comparisonSortCol === col) {
    comparisonSortDir *= -1;
  } else {
    comparisonSortCol = col;
    comparisonSortDir = 1;
  }
  document.querySelectorAll('.comp-sort-btn').forEach(b => {
    b.classList.remove('asc', 'desc');
    if (b.dataset.col === col) b.classList.add(comparisonSortDir === 1 ? 'asc' : 'desc');
  });
  renderComparison();
}
