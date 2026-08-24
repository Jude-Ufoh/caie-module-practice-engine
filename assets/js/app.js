// ============================================================
// CAIE Practice Engine — SPA router + views + test engine.
// Vanilla JS, hash-based routing, no build step.
// ============================================================

const EXAM_QUESTION_COUNT = 60;
const EXAM_TIME_LIMIT_SEC = 100 * 60;
const PRACTICE_BENCHMARK = 0.70;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(n) {
  const pool = shuffle(QUESTION_BANK);
  const chosen = pool.slice(0, Math.min(n, pool.length));
  // Options are kept in their original A-D order (not shuffled).
  return chosen.map(q => ({ ...q, options: q.options.slice() }));
}

function fmtClock(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

const App = {
  state: {
    testState: null,
    lastResult: null,
    timerHandle: null,
    navExpanded: false,
  },

  init() {
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('beforeunload', (e) => {
      if (this.state.testState) { e.preventDefault(); e.returnValue = ''; }
    });
    this.route();
  },

  navigate(path) { window.location.hash = path; },

  mount(html) {
    document.getElementById('app').innerHTML = html;
    window.scrollTo(0, 0);
  },

  stopTimer() {
    if (this.state.timerHandle) { clearInterval(this.state.timerHandle); this.state.timerHandle = null; }
  },

  route() {
    if (window.location.hash.replace(/^#\/?/, '').split('?')[0] !== 'test') this.stopTimer();
    const hash = window.location.hash.replace(/^#\/?/, '') || 'welcome';
    const path = hash.split('?')[0];
    const user = Store.currentUser();

    const authRequired = ['dashboard', 'exam-setup', 'learning-setup', 'test', 'results'];
    if (authRequired.includes(path) && !user) { this.navigate('/login'); return; }
    if ((path === 'login' || path === 'signup') && user) { this.navigate('/dashboard'); return; }

    switch (path) {
      case 'welcome': return this.renderWelcome();
      case 'signup': return this.renderSignup();
      case 'login': return this.renderLogin();
      case 'dashboard': return this.renderDashboard();
      case 'exam-setup': return this.renderExamSetup();
      case 'learning-setup': return this.renderLearningSetup();
      case 'test':
        if (!this.state.testState) { this.navigate('/dashboard'); return; }
        return this.renderTest();
      case 'results':
        if (!this.state.lastResult) { this.navigate('/dashboard'); return; }
        return this.renderResults();
      default: return this.renderWelcome();
    }
  },

  // ---------- shared chrome ----------

  topbar() {
    const user = Store.currentUser();
    return `
      <div class="topbar">
        <div class="topbar-inner">
          <div class="brand" style="cursor:pointer" onclick="App.navigate('${user ? '/dashboard' : '/welcome'}')">
            <span class="brand-mark">AI</span>
            <span>CAIE Module Practice<br><small>USAII &middot; Module-Aligned Bank</small></span>
          </div>
          <div class="topbar-user">
            ${user ? `
              <span class="username-full">Signed in as <strong style="color:var(--text)">${escapeHtml(user.displayName)}</strong></span>
              <button class="btn btn-ghost" onclick="App.doLogout()">Log out</button>
            ` : `
              <button class="btn btn-ghost" onclick="App.navigate('/login')">Log in</button>
              <button class="btn btn-primary" onclick="App.navigate('/signup')">Sign up</button>
            `}
          </div>
        </div>
      </div>`;
  },

  footer() {
    return `<div class="footer-note">CAIE MODULE PRACTICE &middot; ${QUESTION_BANK.length} QUESTIONS &middot; RUNS ENTIRELY IN YOUR BROWSER</div>`;
  },

  // ---------- welcome ----------

  renderWelcome() {
    this.mount(`
      ${this.topbar()}
      <div class="page">
        <div class="container">
          <div class="hero">
            <span class="kicker">USAII &middot; Module-Aligned CAIE Practice Bank</span>
            <h1>Study the CAIE exam<br><span class="accent">module by module</span>.</h1>
            <p class="lead">${QUESTION_BANK.length} practice questions mapped to the official CAIE course modules, two ways to study: a timed ${EXAM_QUESTION_COUNT}-question exam simulation, or an untimed learning mode where you check answers as you go.</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" onclick="App.navigate('/signup')">Create free account</button>
              <button class="btn btn-outline btn-lg" onclick="App.navigate('/login')">I already have an account</button>
            </div>
          </div>

          <div class="feature-grid">
            <div class="feature">
              <div class="num">01</div>
              <h3>Exam Mode</h3>
              <p>${EXAM_QUESTION_COUNT} questions, ${EXAM_TIME_LIMIT_SEC / 60} minutes, answers revealed only after you submit &mdash; simulates real exam conditions.</p>
            </div>
            <div class="feature">
              <div class="num">02</div>
              <h3>Learning Mode</h3>
              <p>Pick any number of questions and any time limit (or none). Check each answer and explanation as you go.</p>
            </div>
            <div class="feature">
              <div class="num">03</div>
              <h3>Track progress</h3>
              <p>Every attempt is saved to your dashboard with score, date and time taken so you can watch yourself improve.</p>
            </div>
          </div>
        </div>
      </div>
      ${this.footer()}
    `);
  },

  // ---------- auth ----------

  renderSignup() {
    this.mount(`
      ${this.topbar()}
      <div class="page-center">
        <div class="container-narrow" style="width:100%">
          <div class="card">
            <span class="kicker">Get started</span>
            <h2>Create your account</h2>
            <p style="margin-bottom:24px">Stored on this device only &mdash; no email required.</p>
            <div id="signup-alert"></div>
            <form onsubmit="App.doSignup(event); return false;">
              <div class="field">
                <label>Display name</label>
                <input type="text" id="su-name" placeholder="e.g. Jude" autocomplete="name">
              </div>
              <div class="field">
                <label>Username</label>
                <input type="text" id="su-username" placeholder="e.g. jude01" autocomplete="username" required>
                <div class="field-hint">3-24 characters: letters, numbers, . _ -</div>
              </div>
              <div class="field">
                <label>Password</label>
                <input type="password" id="su-password" placeholder="At least 4 characters" autocomplete="new-password" required>
              </div>
              <button type="submit" class="btn btn-primary btn-block btn-lg">Create account</button>
            </form>
            <p class="center-text mt-24 mb-0" style="font-size:13px">Already have an account? <a href="#/login">Log in</a></p>
          </div>
        </div>
      </div>
      ${this.footer()}
    `);
  },

  async doSignup(e) {
    const name = document.getElementById('su-name').value;
    const username = document.getElementById('su-username').value;
    const password = document.getElementById('su-password').value;
    const alertBox = document.getElementById('signup-alert');
    try {
      await Store.signup(username, password, name);
      this.navigate('/dashboard');
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  renderLogin() {
    this.mount(`
      ${this.topbar()}
      <div class="page-center">
        <div class="container-narrow" style="width:100%">
          <div class="card">
            <span class="kicker">Welcome back</span>
            <h2>Log in</h2>
            <p style="margin-bottom:24px">Enter the account you created on this device.</p>
            <div id="login-alert"></div>
            <form onsubmit="App.doLogin(event); return false;">
              <div class="field">
                <label>Username</label>
                <input type="text" id="li-username" autocomplete="username" required>
              </div>
              <div class="field">
                <label>Password</label>
                <input type="password" id="li-password" autocomplete="current-password" required>
              </div>
              <button type="submit" class="btn btn-primary btn-block btn-lg">Log in</button>
            </form>
            <p class="center-text mt-24 mb-0" style="font-size:13px">New here? <a href="#/signup">Create an account</a></p>
          </div>
        </div>
      </div>
      ${this.footer()}
    `);
  },

  async doLogin(e) {
    const username = document.getElementById('li-username').value;
    const password = document.getElementById('li-password').value;
    const alertBox = document.getElementById('login-alert');
    try {
      await Store.login(username, password);
      this.navigate('/dashboard');
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  doLogout() {
    Store.logout();
    this.navigate('/welcome');
  },

  // ---------- dashboard ----------

  renderDashboard() {
    const user = Store.currentUser();
    const history = Store.getHistory(user.username);
    const testsTaken = history.length;
    const avgScore = testsTaken ? Math.round(history.reduce((s, h) => s + h.scorePct, 0) / testsTaken) : 0;
    const bestScore = testsTaken ? Math.max(...history.map(h => h.scorePct)) : 0;

    const rows = history.map(h => `
      <tr>
        <td>${fmtDate(h.date)}</td>
        <td><span class="mode-badge ${h.mode}">${h.mode}</span></td>
        <td>${h.correctCount}/${h.totalQuestions}</td>
        <td class="${h.mode === 'exam' ? (h.pass ? 'score-pass' : 'score-fail') : ''}">${h.scorePct}%</td>
        <td>${fmtClock(h.durationSec)}</td>
      </tr>
    `).join('');

    this.mount(`
      ${this.topbar()}
      <div class="page">
        <div class="container">
          <div class="dash-header">
            <div>
              <span class="kicker">Dashboard</span>
              <h1>Welcome back, ${escapeHtml(user.displayName)}</h1>
            </div>
          </div>

          <div class="stat-grid">
            <div class="stat"><div class="label">Tests taken</div><div class="value">${testsTaken}</div></div>
            <div class="stat"><div class="label">Average score</div><div class="value accent">${testsTaken ? avgScore + '%' : '—'}</div></div>
            <div class="stat"><div class="label">Best score</div><div class="value good">${testsTaken ? bestScore + '%' : '—'}</div></div>
            <div class="stat"><div class="label">Question bank</div><div class="value">${QUESTION_BANK.length}</div></div>
          </div>

          <div class="mode-grid">
            <div class="mode-card exam">
              <span class="tag">Exam mode</span>
              <h3>Full timed exam</h3>
              <p>Simulates the real thing. Answers and explanations are hidden until you submit.</p>
              <div class="meta">
                <span>${EXAM_QUESTION_COUNT} questions</span>
                <span>${EXAM_TIME_LIMIT_SEC / 60} min</span>
                <span>reveal at end</span>
              </div>
              <button class="btn btn-primary btn-block" onclick="App.navigate('/exam-setup')">Start exam</button>
            </div>
            <div class="mode-card learning">
              <span class="tag">Learning mode</span>
              <h3>Study at your pace</h3>
              <p>Choose how many questions and how much time. Check each answer and read the explanation as you go.</p>
              <div class="meta">
                <span>your count</span>
                <span>your time</span>
                <span>instant feedback</span>
              </div>
              <button class="btn btn-secondary btn-block" onclick="App.navigate('/learning-setup')">Start learning session</button>
            </div>
          </div>

          <div class="section-title">Test history</div>
          ${testsTaken ? `
            <div class="card" style="padding:0;overflow-x:auto">
              <table class="history-table">
                <thead><tr><th>Date</th><th>Mode</th><th>Score</th><th>Percent</th><th>Time</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          ` : `
            <div class="card empty-state">
              <div class="glyph">&mdash;</div>
              <p class="mb-0">No tests taken yet on this account. Start an exam or a learning session above.</p>
            </div>
          `}
        </div>
      </div>
      ${this.footer()}
    `);
  },

  // ---------- exam setup ----------

  renderExamSetup() {
    this.mount(`
      ${this.topbar()}
      <div class="page-center">
        <div class="container-narrow setup-card" style="width:100%">
          <div class="card">
            <span class="kicker">Exam mode</span>
            <h2>Ready for the full exam?</h2>
            <p>This mirrors real exam conditions. Once you start, the clock won't stop.</p>
            <div class="stat-grid" style="grid-template-columns:1fr 1fr">
              <div class="stat"><div class="label">Questions</div><div class="value accent">${EXAM_QUESTION_COUNT}</div></div>
              <div class="stat"><div class="label">Time limit</div><div class="value accent">${fmtClock(EXAM_TIME_LIMIT_SEC)}</div></div>
            </div>
            <p style="font-size:13px">Questions are drawn at random from the ${QUESTION_BANK.length}-question bank, with options shown in their original A-D order. Correct answers and explanations are only shown after you submit or time runs out.</p>
            <div style="display:flex;gap:10px;margin-top:8px">
              <button class="btn btn-outline" onclick="App.navigate('/dashboard')">Cancel</button>
              <button class="btn btn-primary btn-block" onclick="App.startExam()">Start ${EXAM_TIME_LIMIT_SEC / 60}-minute exam</button>
            </div>
          </div>
        </div>
      </div>
      ${this.footer()}
    `);
  },

  startExam() {
    this.state.testState = {
      mode: 'exam',
      questions: pickQuestions(EXAM_QUESTION_COUNT),
      index: 0,
      answers: {},
      checked: {},
      startedAt: Date.now(),
      timeLimitSec: EXAM_TIME_LIMIT_SEC,
      deadline: Date.now() + EXAM_TIME_LIMIT_SEC * 1000,
    };
    this.navigate('/test');
  },

  // ---------- learning setup ----------

  renderLearningSetup() {
    const maxN = QUESTION_BANK.length;
    this.mount(`
      ${this.topbar()}
      <div class="page-center">
        <div class="container-narrow setup-card" style="width:100%">
          <div class="card">
            <span class="kicker">Learning mode</span>
            <h2>Set up your session</h2>
            <p>Pick how many questions to study and whether to time yourself. You can check the answer to each question as you go.</p>

            <div class="field">
              <label>Number of questions</label>
              <div class="slider-row">
                <input type="range" id="lrn-count-range" min="1" max="${maxN}" value="20" oninput="App.syncCount(this.value)">
                <div class="slider-value" id="lrn-count-display">20</div>
              </div>
              <input type="number" id="lrn-count-number" min="1" max="${maxN}" value="20" style="margin-top:10px" oninput="App.syncCountFromNumber(this.value)">
              <div class="field-hint">Up to ${maxN} questions available.</div>
            </div>

            <div class="field">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer" id="lrn-untimed-label">
                <input type="checkbox" id="lrn-untimed" onchange="App.toggleUntimed(this.checked)">
                No time limit
              </label>
            </div>

            <div class="field" id="lrn-time-field">
              <label>Time limit (minutes)</label>
              <input type="number" id="lrn-minutes" min="1" max="600" value="30">
            </div>

            <div style="display:flex;gap:10px;margin-top:8px">
              <button class="btn btn-outline" onclick="App.navigate('/dashboard')">Cancel</button>
              <button class="btn btn-secondary btn-block" onclick="App.startLearning()">Start session</button>
            </div>
          </div>
        </div>
      </div>
      ${this.footer()}
    `);
  },

  syncCount(v) {
    document.getElementById('lrn-count-display').textContent = v;
    document.getElementById('lrn-count-number').value = v;
  },
  syncCountFromNumber(v) {
    const maxN = QUESTION_BANK.length;
    let n = Math.max(1, Math.min(maxN, parseInt(v || '1', 10)));
    document.getElementById('lrn-count-range').value = n;
    document.getElementById('lrn-count-display').textContent = n;
  },
  toggleUntimed(checked) {
    const field = document.getElementById('lrn-time-field');
    field.style.display = checked ? 'none' : 'block';
  },

  startLearning() {
    const maxN = QUESTION_BANK.length;
    const count = Math.max(1, Math.min(maxN, parseInt(document.getElementById('lrn-count-number').value || '20', 10)));
    const untimed = document.getElementById('lrn-untimed').checked;
    const minutes = Math.max(1, parseInt(document.getElementById('lrn-minutes').value || '30', 10));
    const timeLimitSec = untimed ? null : minutes * 60;

    this.state.testState = {
      mode: 'learning',
      questions: pickQuestions(count),
      index: 0,
      answers: {},
      checked: {},
      startedAt: Date.now(),
      timeLimitSec,
      deadline: timeLimitSec ? Date.now() + timeLimitSec * 1000 : null,
    };
    this.navigate('/test');
  },

  // ---------- test taking ----------

  renderTest() {
    const t = this.state.testState;
    const q = t.questions[t.index];
    const total = t.questions.length;
    const answeredCount = Object.keys(t.answers).length;
    const selected = t.answers[t.index];
    const isChecked = !!t.checked[t.index];
    const showFeedback = t.mode === 'learning' && isChecked;

    const optionsHtml = q.options.map(opt => {
      let cls = 'option';
      if (showFeedback) {
        if (opt.k === q.answer) cls += ' reveal-correct';
        else if (opt.k === selected) cls += ' reveal-wrong';
      } else if (selected === opt.k) {
        cls += ' selected';
      }
      return `
        <div class="${cls}" onclick="App.selectOption('${opt.k}')">
          <div class="opt-key">${opt.k}</div>
          <div class="opt-text">${escapeHtml(opt.t)}</div>
        </div>`;
    }).join('');

    const navGrid = t.questions.map((_, i) => {
      let cls = 'q-nav-btn';
      if (i === t.index) cls += ' current';
      else if (t.answers[i] !== undefined) cls += ' answered';
      return `<button class="${cls}" onclick="App.jumpTo(${i})">${i + 1}</button>`;
    }).join('');

    this.mount(`
      <div class="test-shell">
        <div class="test-header">
          <div class="test-header-inner">
            <span class="test-mode-pill ${t.mode}">${t.mode === 'exam' ? 'Exam mode' : 'Learning mode'}</span>
            <span class="mono" style="color:var(--text-dim);font-size:13px">${answeredCount}/${total} answered</span>
            <span class="spacer"></span>
            <span class="timer mono" id="test-timer">--:--</span>
            <button class="btn btn-danger" onclick="App.confirmSubmit()">Submit</button>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${((t.index + 1) / total * 100).toFixed(1)}%"></div></div>
        </div>

        <div class="test-body">
          <div class="q-index">QUESTION ${t.index + 1} OF ${total}</div>
          <div class="q-text">${escapeHtml(q.q)}</div>
          <div class="options">${optionsHtml}</div>

          ${t.mode === 'learning' ? `
            <div style="margin-top:8px">
              ${!isChecked ? `<button class="btn btn-secondary" ${selected ? '' : 'disabled'} onclick="App.checkAnswer()">Check answer</button>` : ''}
            </div>
            ${showFeedback ? `
              <div class="explain-box">
                <span class="explain-label">${selected === q.answer ? 'Correct' : (selected ? 'Not quite' : 'You skipped this one')} &middot; Correct answer: ${q.answer}</span>
                ${escapeHtml(q.explanation)}
              </div>
            ` : ''}
          ` : ''}

          <div class="q-nav-toggle" onclick="App.toggleNav()">${this.state.navExpanded ? 'Hide' : 'Show'} question map</div>
          ${this.state.navExpanded ? `<div class="q-nav-grid">${navGrid}</div>` : ''}
        </div>

        <div class="test-footer">
          <div class="test-footer-inner">
            <button class="btn btn-outline" ${t.index === 0 ? 'disabled' : ''} onclick="App.prevQuestion()">Previous</button>
            ${t.index === total - 1
              ? `<button class="btn btn-primary" onclick="App.confirmSubmit()">Finish &amp; submit</button>`
              : `<button class="btn btn-primary" onclick="App.nextQuestion()">Next</button>`}
          </div>
        </div>
      </div>
    `);

    this.startTimerTick();
  },

  toggleNav() {
    this.state.navExpanded = !this.state.navExpanded;
    this.renderTest();
  },

  selectOption(key) {
    const t = this.state.testState;
    if (t.mode === 'learning' && t.checked[t.index]) return; // locked after reveal
    t.answers[t.index] = key;
    this.renderTest();
  },

  checkAnswer() {
    const t = this.state.testState;
    t.checked[t.index] = true;
    this.renderTest();
  },

  jumpTo(i) {
    this.state.testState.index = i;
    this.renderTest();
  },

  nextQuestion() {
    const t = this.state.testState;
    if (t.index < t.questions.length - 1) { t.index++; this.renderTest(); }
  },

  prevQuestion() {
    const t = this.state.testState;
    if (t.index > 0) { t.index--; this.renderTest(); }
  },

  startTimerTick() {
    this.stopTimer();
    const t = this.state.testState;
    const el = document.getElementById('test-timer');
    if (!el) return;

    const tick = () => {
      const timerEl = document.getElementById('test-timer');
      if (!timerEl) { this.stopTimer(); return; }
      if (t.deadline === null) {
        const elapsed = (Date.now() - t.startedAt) / 1000;
        timerEl.textContent = fmtClock(elapsed);
        timerEl.classList.remove('warn', 'critical');
      } else {
        const remaining = (t.deadline - Date.now()) / 1000;
        timerEl.textContent = fmtClock(remaining);
        timerEl.classList.toggle('warn', remaining <= 300 && remaining > 60);
        timerEl.classList.toggle('critical', remaining <= 60);
        if (remaining <= 0) {
          this.stopTimer();
          this.submitTest(true);
        }
      }
    };
    tick();
    this.state.timerHandle = setInterval(tick, 1000);
  },

  confirmSubmit() {
    const t = this.state.testState;
    const answeredCount = Object.keys(t.answers).length;
    const unanswered = t.questions.length - answeredCount;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
      : `Submit your ${t.mode === 'exam' ? 'exam' : 'session'}?`;
    this.mount(document.getElementById('app').innerHTML + `
      <div class="modal-backdrop" onclick="if(event.target===this) App.closeModal()">
        <div class="modal">
          <h3>Submit test</h3>
          <p>${msg}</p>
          <div class="modal-actions">
            <button class="btn btn-outline btn-block" onclick="App.closeModal()">Keep working</button>
            <button class="btn btn-danger btn-block" onclick="App.submitTest(false)">Submit now</button>
          </div>
        </div>
      </div>
    `);
  },

  closeModal() { this.renderTest(); },

  submitTest(auto) {
    this.stopTimer();
    const t = this.state.testState;
    const user = Store.currentUser();
    const total = t.questions.length;
    let correctCount = 0;
    const review = t.questions.map((q, i) => {
      const selected = t.answers[i];
      const isCorrect = selected === q.answer;
      if (isCorrect) correctCount++;
      return { question: q.q, options: q.options, selected: selected || null, correct: q.answer, explanation: q.explanation, isCorrect };
    });
    const scorePct = Math.round((correctCount / total) * 100);
    const durationSec = (Date.now() - t.startedAt) / 1000;
    const pass = scorePct / 100 >= PRACTICE_BENCHMARK;

    const record = {
      id: Date.now(),
      date: new Date().toISOString(),
      mode: t.mode,
      totalQuestions: total,
      correctCount,
      scorePct,
      durationSec,
      timeLimitSec: t.timeLimitSec,
      autoSubmitted: !!auto,
      pass,
    };
    Store.addHistoryRecord(user.username, record);

    this.state.lastResult = { ...record, review };
    this.state.testState = null;
    this.navigate('/results');
  },

  // ---------- results ----------

  renderResults() {
    const r = this.state.lastResult;
    const isExam = r.mode === 'exam';

    const reviewHtml = r.review.map((item, i) => {
      const tag = item.selected === null ? 'skipped' : (item.isCorrect ? 'correct' : 'incorrect');
      const tagLabel = tag === 'skipped' ? 'Skipped' : (tag === 'correct' ? 'Correct' : 'Incorrect');
      const optsHtml = item.options.map(opt => {
        let cls = 'option';
        if (opt.k === item.correct) cls += ' reveal-correct';
        else if (opt.k === item.selected) cls += ' reveal-wrong';
        return `<div class="${cls}"><div class="opt-key">${opt.k}</div><div class="opt-text">${escapeHtml(opt.t)}</div></div>`;
      }).join('');
      return `
        <div class="review-item">
          <span class="review-tag ${tag}">${tagLabel}</span>
          <div class="q-index">QUESTION ${i + 1}</div>
          <div class="q-text">${escapeHtml(item.question)}</div>
          <div class="options">${optsHtml}</div>
          <div class="explain-box"><span class="explain-label">Explanation</span>${escapeHtml(item.explanation)}</div>
        </div>`;
    }).join('');

    this.mount(`
      ${this.topbar()}
      <div class="page">
        <div class="container" style="max-width:800px">
          <div class="result-hero">
            <span class="kicker" style="justify-content:center">${isExam ? 'Exam mode' : 'Learning mode'} &middot; ${r.autoSubmitted ? 'time expired' : 'submitted'}</span>
            <div class="result-score ${r.pass ? 'pass' : 'fail'}">${r.scorePct}%</div>
            <p style="margin-bottom:16px">${r.correctCount} of ${r.totalQuestions} correct</p>
            ${isExam ? `<span class="result-badge ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'Pass' : 'Below benchmark'} &middot; practice benchmark ${Math.round(PRACTICE_BENCHMARK * 100)}%</span>` : ''}
          </div>

          <div class="result-stats">
            <div class="stat"><div class="label">Correct</div><div class="value good">${r.correctCount}</div></div>
            <div class="stat"><div class="label">Incorrect</div><div class="value" style="color:var(--danger)">${r.totalQuestions - r.correctCount - r.review.filter(x=>x.selected===null).length}</div></div>
            <div class="stat"><div class="label">Skipped</div><div class="value">${r.review.filter(x=>x.selected===null).length}</div></div>
            <div class="stat"><div class="label">Time taken</div><div class="value">${fmtClock(r.durationSec)}</div></div>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:36px">
            <button class="btn btn-outline btn-block" onclick="App.navigate('/dashboard')">Back to dashboard</button>
            <button class="btn btn-primary btn-block" onclick="App.navigate('${isExam ? '/exam-setup' : '/learning-setup'}')">Take another</button>
          </div>

          <div class="section-title">Full review</div>
          ${reviewHtml}
        </div>
      </div>
      ${this.footer()}
    `);
  },
};

App.init();
