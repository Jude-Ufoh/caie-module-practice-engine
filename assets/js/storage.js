// ============================================================
// Storage layer — accounts, sessions and test history.
// Everything lives in localStorage on the current device/browser.
// Passwords are never stored in plaintext (SHA-256 via WebCrypto),
// but this is client-side-only auth, not a secure credential store.
// ============================================================

const DB_USERS = 'caie_users_v1';
const DB_SESSION = 'caie_session_v1';
const DB_HISTORY_PREFIX = 'caie_history_v1_';

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const Store = {
  getUsers() {
    try { return JSON.parse(localStorage.getItem(DB_USERS) || '{}'); }
    catch (e) { return {}; }
  },

  saveUsers(users) {
    localStorage.setItem(DB_USERS, JSON.stringify(users));
  },

  async signup(username, password, displayName) {
    username = (username || '').trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
      throw new Error('Username must be 3-24 characters: letters, numbers, . _ - only.');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }
    const users = this.getUsers();
    if (users[username]) {
      throw new Error('That username is already taken. Try logging in instead.');
    }
    const passwordHash = await sha256(password);
    users[username] = {
      displayName: (displayName || '').trim() || username,
      passwordHash,
      createdAt: Date.now(),
    };
    this.saveUsers(users);
    this.setSession(username);
    return { username, ...users[username] };
  },

  async login(username, password) {
    username = (username || '').trim().toLowerCase();
    const users = this.getUsers();
    const u = users[username];
    if (!u) throw new Error('No account found with that username on this device.');
    const passwordHash = await sha256(password || '');
    if (passwordHash !== u.passwordHash) throw new Error('Incorrect password.');
    this.setSession(username);
    return { username, ...u };
  },

  setSession(username) { localStorage.setItem(DB_SESSION, username); },
  getSessionUsername() { return localStorage.getItem(DB_SESSION); },
  logout() { localStorage.removeItem(DB_SESSION); },

  currentUser() {
    const username = this.getSessionUsername();
    if (!username) return null;
    const users = this.getUsers();
    const u = users[username];
    if (!u) return null;
    return { username, ...u };
  },

  getHistory(username) {
    try { return JSON.parse(localStorage.getItem(DB_HISTORY_PREFIX + username) || '[]'); }
    catch (e) { return []; }
  },

  addHistoryRecord(username, record) {
    const history = this.getHistory(username);
    history.unshift(record);
    localStorage.setItem(DB_HISTORY_PREFIX + username, JSON.stringify(history));
  },
};
