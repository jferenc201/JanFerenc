/* utils.js — formatting and helper functions */

function fmtCurrency(n) {
  if (isNaN(n) || n === null) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}
function fmtCurrencyDecimal(n) {
  if (isNaN(n) || n === null) return '£0.00';
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtPct(n) { if (isNaN(n)) return '0%'; return n.toFixed(1) + '%'; }
function fmtDate(monthsFromNow) {
  const d = new Date(); d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type==='success' ? '#16a34a' : type==='error' ? '#dc2626' : '#1a1a2e';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.getAttribute('onclick') && l.getAttribute('onclick').includes(name)) l.classList.add('active');
  });
  if (name === 'schedule')   renderSchedule();
  if (name === 'history')    renderHistory();
  if (name === 'comparison') renderComparison();
  if (name === 'charts')     renderCharts();
}

/* ── MOBILE NAV ─────────────────────────────── */
function toggleMobileNav() {
  document.getElementById('mobile-nav').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobile-nav').classList.remove('open');
}

/* ── OVERRIDE showPage FOR MOBILE ───────────── */
const _showPage = showPage;
window.showPage = function(name) {
  _showPage(name);
  // Update mobile bottom bar
  document.querySelectorAll('.mbb-btn').forEach(b => b.classList.remove('active'));
  const mbb = document.getElementById('mbb-' + name);
  if (mbb) mbb.classList.add('active');
  // Update mobile nav links
  document.querySelectorAll('.mobile-nav-link').forEach(b => b.classList.remove('active'));
  const mnl = document.getElementById('mnl-' + name);
  if (mnl) mnl.classList.add('active');
  // Scroll to top on mobile
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
