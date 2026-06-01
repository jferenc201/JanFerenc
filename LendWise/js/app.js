/* app.js — boot */
document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  initSliders();
  calculate();
  checkAffordability();
  renderHistory();
  renderComparison();
});
