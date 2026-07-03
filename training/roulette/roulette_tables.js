// ══════════════════════════════════════════════════════
//  ROULETTE TABLES — module 6
//  Flashcard pur : tables de multiplication des ratios de paiement
//  (35 / 17 / 11 / 8 / 5) jusqu'à ×20
// ══════════════════════════════════════════════════════

const TB_RATIOS = [35, 17, 11, 8, 5];
const TB_MAX_MULT = 20;
const QUESTIONS_PER_SESSION = 15;
const DEFAULT_TIMERS_TB = { facile: 8, medium: 5, expert: 3 };

let _tbConfig    = { levels: DEFAULT_TIMERS_TB };
let _tbSessionId = null;
let _tbUserId    = null;
let _tbLevel     = null;
let _tbTimer     = 8;
let _tbQIndex    = 0;
let _tbCorrect   = 0;
let _tbAnswered  = false;
let _tbRatio     = 35;
let _tbMult      = 1;
let _tbHandle    = null;
let _tbTimeLeft  = 8;

// ── Init ─────────────────────────────────────────────
async function initTables() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _tbUserId = session.user.id;
    const cfg = await SB.getTrainingConfig('roulette');
    if (cfg && cfg.tables) {
      _tbConfig = cfg;
      const lvl = cfg.tables.levels || DEFAULT_TIMERS_TB;
      ['facile','medium','expert'].forEach(function(k) {
        var el = document.getElementById('tb-timer-' + k);
        if (el && lvl[k]) el.textContent = lvl[k];
      });
    }
  } catch(e) {}
}

// ── Sélection de niveau ───────────────────────────────
async function startTablesLevel(level) {
  _tbLevel   = level;
  _tbTimer   = ((_tbConfig.tables && _tbConfig.tables.levels) || DEFAULT_TIMERS_TB)[level];
  _tbQIndex  = 0;
  _tbCorrect = 0;
  _tbAnswered = false;

  document.getElementById('tb-level-screen').style.display    = 'none';
  document.getElementById('tb-training-screen').style.display = '';

  try {
    const s = await SB.startTrainingSession('roulette-tables');
    _tbSessionId = s.id;
  } catch(e) {}

  nextTables();
}

// ── Question ──────────────────────────────────────────
function nextTables() {
  if (_tbQIndex >= QUESTIONS_PER_SESSION) { showTablesSummary(); return; }

  _tbAnswered = false;
  _tbRatio = TB_RATIOS[Math.floor(Math.random() * TB_RATIOS.length)];
  _tbMult  = 1 + Math.floor(Math.random() * TB_MAX_MULT);

  document.getElementById('tb-question').textContent = _tbRatio + ' × ' + _tbMult;

  const inp = document.getElementById('tb-answer-input');
  inp.value = ''; inp.disabled = false;

  document.getElementById('tb-feedback').className   = 'feedback-bar empty';
  document.getElementById('tb-feedback').textContent  = '';
  document.getElementById('tb-submit-btn').disabled   = false;

  updateTablesProgress();
  startTablesTimer();
  setTimeout(function() { inp.focus(); }, 50);
}

function updateTablesProgress() {
  document.getElementById('tb-progress').textContent = 'Question ' + (_tbQIndex + 1) + ' / ' + QUESTIONS_PER_SESSION;
  document.getElementById('tb-score').textContent    = 'Score : ' + _tbCorrect + ' / ' + _tbQIndex;
  document.getElementById('tb-progress-fill').style.width = ((_tbQIndex / QUESTIONS_PER_SESSION) * 100) + '%';
}

// ── Timer ─────────────────────────────────────────────
function startTablesTimer() {
  _tbTimeLeft = _tbTimer;
  updateTablesTimerDisplay();
  _tbHandle = setInterval(function() {
    _tbTimeLeft--;
    updateTablesTimerDisplay();
    if (_tbTimeLeft <= 0) { clearInterval(_tbHandle); if (!_tbAnswered) tablesTimeout(); }
  }, 1000);
}

function stopTablesTimer() { clearInterval(_tbHandle); }

function updateTablesTimerDisplay() {
  const el  = document.getElementById('tb-timer-display');
  const bar = document.getElementById('tb-timer-bar');
  const cls = _tbTimeLeft <= 1 ? ' danger' : _tbTimeLeft <= 2 ? ' warning' : '';
  el.textContent  = _tbTimeLeft;
  el.className    = 'timer-display' + cls;
  bar.style.width = ((_tbTimeLeft / _tbTimer) * 100) + '%';
  bar.className   = 'timer-bar-fill' + cls;
}

function tablesTimeout() {
  _tbAnswered = true;
  document.getElementById('tb-answer-input').disabled = true;
  document.getElementById('tb-submit-btn').disabled   = true;
  const fb = document.getElementById('tb-feedback');
  fb.className   = 'feedback-bar wrong';
  fb.textContent = '⏱ Temps écoulé — ' + _tbRatio + ' × ' + _tbMult + ' = ' + (_tbRatio * _tbMult);
  _tbQIndex++;
  updateTablesProgress();
  if (_tbQIndex >= QUESTIONS_PER_SESSION) setTimeout(showTablesSummary, 1800);
  else setTimeout(nextTables, 1800);
}

// ── Validation ────────────────────────────────────────
async function submitTables() {
  if (_tbAnswered) return;
  const inp = document.getElementById('tb-answer-input');
  const val = parseInt(inp.value);
  if (isNaN(val)) { inp.focus(); return; }

  stopTablesTimer();
  _tbAnswered = true;
  inp.disabled = true;
  document.getElementById('tb-submit-btn').disabled = true;

  const correctAnswer = _tbRatio * _tbMult;
  const isCorrect = val === correctAnswer;
  if (isCorrect) _tbCorrect++;

  const fb = document.getElementById('tb-feedback');
  if (isCorrect) {
    fb.className   = 'feedback-bar correct';
    fb.textContent = '✓ ' + correctAnswer + ' — Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — ' + _tbRatio + ' × ' + _tbMult + ' = ' + correctAnswer;
  }

  try {
    if (_tbSessionId && _tbUserId) {
      await SB.addTrainingResult(
        _tbSessionId, _tbUserId, 'roulette-tables',
        { ratio: _tbRatio, mult: _tbMult, level: _tbLevel },
        correctAnswer, val, isCorrect
      );
    }
  } catch(e) {}

  _tbQIndex++;
  updateTablesProgress();

  if (_tbQIndex >= QUESTIONS_PER_SESSION) setTimeout(showTablesSummary, isCorrect ? 700 : 1600);
  else setTimeout(nextTables, isCorrect ? 700 : 1600);
}

// ── Résumé ────────────────────────────────────────────
async function showTablesSummary() {
  stopTablesTimer();
  try { if (_tbSessionId) await SB.endTrainingSession(_tbSessionId, QUESTIONS_PER_SESSION, _tbCorrect); } catch(e) {}

  document.getElementById('tb-training-screen').style.display = 'none';
  document.getElementById('tb-summary-screen').style.display  = '';

  const pct = Math.round((_tbCorrect / QUESTIONS_PER_SESSION) * 100);
  const lvlLabels = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
  document.getElementById('tb-summary-level').textContent   = lvlLabels[_tbLevel] + ' · ' + _tbTimer + 's';
  document.getElementById('tb-summary-score').textContent   = _tbCorrect + '/' + QUESTIONS_PER_SESSION;
  document.getElementById('tb-summary-pct').textContent     = pct + '%';
  document.getElementById('tb-summary-verdict').textContent = tablesVerdict(_tbCorrect);
}

function tablesVerdict(n) {
  if (n === QUESTIONS_PER_SESSION) return '🏆 Parfait !';
  if (n >= 13) return 'Excellent !';
  if (n >= 10) return 'Bien';
  if (n >= 7)  return 'À améliorer';
  return 'À reprendre';
}

function restartTables() {
  stopTablesTimer();
  _tbSessionId = null; _tbQIndex = 0; _tbCorrect = 0;
  _tbAnswered = false; _tbLevel = null;
  document.getElementById('tb-summary-screen').style.display  = 'none';
  document.getElementById('tb-level-screen').style.display    = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('tb-training-screen').style.display !== 'none') {
    submitTables();
  }
});
