/* storage.js — Save/load calculations (cloud if logged in, local if not) */

const DB_KEY = 'mortgageiq_history';

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch(e) { return []; }
}
function saveLocalHistory(records) { localStorage.setItem(DB_KEY, JSON.stringify(records)); }

function saveCalculation() {
  if (!currentCalc) { showToast('Run a calculation first', 'error'); return; }
  const record = {
    id: Date.now(),
    propertyValue:  currentCalc.propertyValue,
    deposit:        currentCalc.deposit,
    principal:      currentCalc.principal,
    interestRate:   currentCalc.interestRate,
    termYears:      currentCalc.termYears,
    mortgageType:   currentCalc.mortgageType,
    monthlyPayment: currentCalc.monthlyPayment,
    totalRepayable: currentCalc.totalRepayable,
    totalInterest:  currentCalc.totalInterest,
    ltv:            currentCalc.ltv,
    timestamp:      new Date().toISOString()
  };

  if (currentUser) {
    cloudSave(record);
    showToast('Saved to your account ✓', 'success');
  } else {
    const records = getLocalHistory();
    records.unshift(record);
    if (records.length > 50) records.pop();
    saveLocalHistory(records);
    showToast('Saved locally ✓ — log in to save to cloud', 'info');
  }
  renderHistory();
}

function deleteRecord(id) {
  if (currentUser) { cloudDelete(id); } else {
    saveLocalHistory(getLocalHistory().filter(r => r.id !== id));
  }
  renderHistory();
}

function loadRecord(id) {
  const all = currentUser ? cloudLoad() : getLocalHistory();
  const record = all.find(r => r.id === id);
  if (!record) return;

  document.getElementById('propertyValue').value = record.propertyValue;
  document.getElementById('deposit').value        = record.deposit;
  document.getElementById('depositPct').value     = ((record.deposit / record.propertyValue) * 100).toFixed(1);
  document.getElementById('interestRate').value   = record.interestRate;
  document.getElementById('term').value           = record.termYears;
  document.getElementById('propertySlider').value = record.propertyValue;
  document.getElementById('depositSlider').value  = ((record.deposit / record.propertyValue) * 100).toFixed(1);
  document.getElementById('rateSlider').value     = record.interestRate;
  document.getElementById('termSlider').value     = record.termYears;

  setType(record.mortgageType || 'repayment');
  calculate();
  showPage('calculator');
  showToast('Calculation loaded', 'success');
}

function clearHistory() {
  if (!confirm('Delete all saved calculations?')) return;
  if (currentUser) { cloudClear(); } else { saveLocalHistory([]); }
  renderHistory();
  showToast('History cleared', 'info');
}

function renderHistory() {
  const records = currentUser ? cloudLoad() : getLocalHistory();
  const el = document.getElementById('historyList');
  const isCloud = !!currentUser;

  let headerHtml = '';
  if (!currentUser) {
    headerHtml = `<div class="history-auth-prompt">
      <div class="hap-icon">☁</div>
      <div class="hap-text">
        <strong>Save to the cloud</strong>
        <span>Log in or create a free account to save calculations across devices</span>
      </div>
      <button class="hap-btn" onclick="openAuthModal('login')">Log in</button>
      <button class="hap-btn hap-btn-outline" onclick="openAuthModal('register')">Sign up</button>
    </div>`;
  } else {
    headerHtml = `<div class="history-cloud-banner">
      <span>☁ Saving to <strong>${currentUser.name}'s</strong> account</span>
      <span class="cloud-count">${records.length} calculation${records.length !== 1 ? 's' : ''} saved</span>
    </div>`;
  }

  if (!records.length) {
    el.innerHTML = headerHtml + '<div class="empty-state">No saved calculations yet.<br>Run a calculation and click "Save to History".</div>';
    return;
  }

  el.innerHTML = headerHtml + records.map(r => {
    const date = new Date(r.timestamp).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    return `<div class="history-item">
      <div>
        <div class="history-title">${fmtCurrency(r.propertyValue)} property — ${r.interestRate}% over ${r.termYears}yrs</div>
        <div class="history-meta">Loan: ${fmtCurrency(r.principal)} · LTV: ${fmtPct(r.ltv)} · ${r.mortgageType === 'interest' ? 'Interest only' : 'Repayment'}</div>
        <div class="history-actions">
          <button class="hist-btn" onclick="loadRecord(${r.id})">Load</button>
          <button class="hist-btn del" onclick="deleteRecord(${r.id})">Delete</button>
        </div>
      </div>
      <div>
        <div class="history-amount">${fmtCurrencyDecimal(r.monthlyPayment)}/mo</div>
        <div class="history-date">${isCloud ? '☁ ' : ''}${date}</div>
      </div>
    </div>`;
  }).join('');
}
