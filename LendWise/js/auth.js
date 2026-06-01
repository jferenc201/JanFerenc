/* auth.js — User accounts (localStorage + PHP API backend)
 *
 * Uses localStorage for demo/local use.
 * When deployed with PHP backend, calls api/auth.php instead.
 * Switch USE_API = true to use real backend.
 */

const USE_API = false; // set true when deployed with PHP
const AUTH_KEY = 'mortgageiq_user';
const USERS_KEY = 'mortgageiq_users';

let currentUser = null;

/* ── STATE ───────────────────────────────────── */
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch(e) { return {}; }
}
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function loadSession() {
  try { currentUser = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch(e) { currentUser = null; }
  updateAuthUI();
}
function saveSession(user) {
  currentUser = user;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  updateAuthUI();
}
function clearSession() {
  currentUser = null;
  localStorage.removeItem(AUTH_KEY);
  updateAuthUI();
}

/* ── REGISTER ────────────────────────────────── */
function register() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  clearAuthErrors();
  let ok = true;
  if (!name)               { setAuthError('reg-name-err', 'Name is required'); ok = false; }
  if (!email || !email.includes('@')) { setAuthError('reg-email-err', 'Valid email required'); ok = false; }
  if (pass.length < 6)     { setAuthError('reg-pass-err', 'Min 6 characters'); ok = false; }
  if (pass !== pass2)      { setAuthError('reg-pass2-err', 'Passwords do not match'); ok = false; }
  if (!ok) return;

  const users = getUsers();
  if (users[email]) { setAuthError('reg-email-err', 'Account already exists'); return; }

  // Simple hash (demo only — real app uses bcrypt on server)
  const hash = btoa(pass + 'mortgageiq_salt');
  users[email] = { name, email, hash, createdAt: new Date().toISOString(), calculations: [] };
  saveUsers(users);
  saveSession({ name, email });
  closeAuthModal();
  showToast(`Welcome, ${name}! Account created.`, 'success');
  renderHistory();
}

/* ── LOGIN ───────────────────────────────────── */
function login() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-pass').value;

  clearAuthErrors();
  if (!email) { setAuthError('login-email-err', 'Email required'); return; }
  if (!pass)  { setAuthError('login-pass-err', 'Password required'); return; }

  const users = getUsers();
  const user  = users[email];
  if (!user) { setAuthError('login-email-err', 'No account found'); return; }

  const hash = btoa(pass + 'mortgageiq_salt');
  if (hash !== user.hash) { setAuthError('login-pass-err', 'Incorrect password'); return; }

  saveSession({ name: user.name, email });
  closeAuthModal();
  showToast(`Welcome back, ${user.name}!`, 'success');
  renderHistory();
}

/* ── LOGOUT ──────────────────────────────────── */
function logout() {
  clearSession();
  showToast('Logged out successfully', 'info');
  renderHistory();
}

/* ── UI HELPERS ──────────────────────────────── */
function updateAuthUI() {
  const loggedOut = document.getElementById('auth-logged-out');
  const loggedIn  = document.getElementById('auth-logged-in');
  const userName  = document.getElementById('auth-user-name');
  // Mobile nav auth
  const mnlOut = document.getElementById('mnl-logged-out');
  const mnlIn  = document.getElementById('mnl-logged-in');

  if (!loggedOut) return;
  if (currentUser) {
    loggedOut.style.display = 'none';
    loggedIn.style.display  = 'flex';
    if (userName) userName.textContent = currentUser.name.charAt(0).toUpperCase();
    if (mnlOut) mnlOut.style.display = 'none';
    if (mnlIn)  mnlIn.style.display  = 'block';
  } else {
    loggedOut.style.display = 'flex';
    loggedIn.style.display  = 'none';
    if (mnlOut) mnlOut.style.display = 'block';
    if (mnlIn)  mnlIn.style.display  = 'none';
  }
}

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.add('open');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('open');
  clearAuthErrors();
  ['reg-name','reg-email','reg-pass','reg-pass2','login-email','login-pass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function switchAuthTab(tab) {
  document.getElementById('auth-login-panel').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('auth-reg-panel').style.display    = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('active');
}

function setAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearAuthErrors() {
  document.querySelectorAll('.auth-error').forEach(e => {
    e.textContent = ''; e.style.display = 'none';
  });
}

/* ── CLOUD SAVE / LOAD ───────────────────────── */
function cloudSave(record) {
  if (!currentUser) return false;
  const users = getUsers();
  if (!users[currentUser.email]) return false;
  if (!users[currentUser.email].calculations) users[currentUser.email].calculations = [];
  users[currentUser.email].calculations.unshift(record);
  if (users[currentUser.email].calculations.length > 100) {
    users[currentUser.email].calculations.pop();
  }
  saveUsers(users);
  return true;
}

function cloudLoad() {
  if (!currentUser) return [];
  const users = getUsers();
  return users[currentUser.email]?.calculations || [];
}

function cloudDelete(id) {
  if (!currentUser) return;
  const users = getUsers();
  if (!users[currentUser.email]) return;
  users[currentUser.email].calculations = users[currentUser.email].calculations.filter(c => c.id !== id);
  saveUsers(users);
}

function cloudClear() {
  if (!currentUser) return;
  const users = getUsers();
  if (users[currentUser.email]) users[currentUser.email].calculations = [];
  saveUsers(users);
}
