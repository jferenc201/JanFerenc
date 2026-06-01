/* affordability.js — affordability checker */

function checkAffordability() {
  const salary1      = parseFloat(document.getElementById('salary1').value) || 0;
  const salary2      = parseFloat(document.getElementById('salary2').value) || 0;
  const monthlyDebt  = parseFloat(document.getElementById('monthlyDebt').value) || 0;
  const livingCosts  = parseFloat(document.getElementById('livingCosts').value) || 0;
  const rate         = parseFloat(document.getElementById('affordRate').value) || 4.5;
  const term         = parseInt(document.getElementById('affordTerm').value) || 25;

  const totalSalary  = salary1 + salary2;
  const netMonthly   = (totalSalary * 0.72) / 12; // approx take-home after tax/NI
  const disposable   = netMonthly - monthlyDebt - livingCosts;

  // Standard multiples
  const borrow45     = totalSalary * 4.5;
  const borrow5      = totalSalary * 5.0;
  const borrow55     = totalSalary * 5.5;

  // Stress test at rate + 3%
  const stressRate   = rate + 3;
  const stressResult = calcMortgage(borrow45, stressRate, term, 'repayment');

  // Max affordable based on disposable income (40% of take-home rule)
  const maxMonthly   = disposable * 0.4;
  const r = rate / 100 / 12;
  const n = term * 12;
  const maxBorrowAffordable = maxMonthly * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));

  const maxBorrow = Math.min(borrow45, maxBorrowAffordable);
  const mainResult = calcMortgage(maxBorrow, rate, term, 'repayment');

  // Affordability score (0-100)
  const ratio = mainResult.monthlyPayment / netMonthly;
  const score = Math.max(0, Math.min(100, (1 - ratio) * 130));

  // Update UI
  document.getElementById('maxBorrow').textContent    = fmtCurrency(maxBorrow);
  document.getElementById('maxProperty').textContent  = fmtCurrency(maxBorrow / 0.9); // assume 10% deposit
  document.getElementById('maxPropSub').textContent   = 'with 10% deposit';
  document.getElementById('affordMonthly').textContent = fmtCurrencyDecimal(mainResult.monthlyPayment);
  document.getElementById('affordMonthlySub').textContent = fmtPct(ratio * 100) + ' of take-home';
  document.getElementById('stressRate').textContent   = fmtPct(stressRate);
  document.getElementById('stressSub').textContent    = fmtCurrencyDecimal(stressResult.monthlyPayment) + '/mo at stress rate';

  // Scenarios
  const scenarios = [
    { label: '4.5× salary', borrow: borrow45 },
    { label: '5× salary',   borrow: borrow5  },
    { label: '5.5× salary', borrow: borrow55 },
    { label: 'By income',   borrow: maxBorrowAffordable }
  ];

  const sTable = document.getElementById('scenariosTable');
  sTable.innerHTML = `
    <div class="scenario-row header">
      <span>Basis</span><span>Max Borrow</span><span>Max Property</span><span>Monthly</span>
    </div>` +
    scenarios.map(s => {
      const r2  = calcMortgage(s.borrow, rate, term, 'repayment');
      return `<div class="scenario-row">
        <span style="color:var(--tx2)">${s.label}</span>
        <span class="highlight">${fmtCurrency(s.borrow)}</span>
        <span style="color:var(--tx)">${fmtCurrency(s.borrow / 0.9)}</span>
        <span style="color:var(--tx2);font-family:var(--mo)">${fmtCurrencyDecimal(r2.monthlyPayment)}</span>
      </div>`;
    }).join('');

  // Meter
  document.getElementById('meterFill').style.width = score + '%';

  let verdict, color;
  if (score >= 70) {
    verdict = `✓ <strong>Comfortable</strong> — your mortgage payments would be well within budget. Monthly payment of ${fmtCurrencyDecimal(mainResult.monthlyPayment)} represents ${fmtPct(ratio*100)} of your take-home pay. Most lenders would consider this affordable.`;
    color = 'var(--green)';
  } else if (score >= 40) {
    verdict = `◎ <strong>Manageable</strong> — mortgage payments are feasible but will stretch your budget. Monthly payment of ${fmtCurrencyDecimal(mainResult.monthlyPayment)} is ${fmtPct(ratio*100)} of take-home. Consider whether rising rates could be an issue.`;
    color = 'var(--gold)';
  } else {
    verdict = `△ <strong>Stretched</strong> — monthly payment of ${fmtCurrencyDecimal(mainResult.monthlyPayment)} (${fmtPct(ratio*100)} of take-home) is high. You may struggle to pass lender stress tests. Consider a longer term, larger deposit, or smaller loan.`;
    color = 'var(--red)';
  }

  document.getElementById('meterFill').style.background = `linear-gradient(90deg, var(--red), var(--gold), ${color})`;
  document.getElementById('meterVerdict').innerHTML = verdict;
}
