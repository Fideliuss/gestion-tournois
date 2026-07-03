// ══════════════════════════════════════════════════════
//  ROULETTE COULEUR — module 5
//  Affiche un numéro → le croupier identifie la couleur
// ══════════════════════════════════════════════════════

const QUESTIONS_PER_SESSION = 15;
const DEFAULT_TIMERS_COL = { facile: 5, medium: 3, expert: 2 };

let _colConfig    = { levels: DEFAULT_TIMERS_COL };
let _colSessionId = null;
let _colUserId    = null;
let _colLevel     = null;
let _colTimer     = 5;
let _colQIndex    = 0;
let _colCorrect   = 0;
let _colAnswered  = false;
let _colNumber    = 0;
let _colHandle    = null;
let _colTimeLeft  = 5;

// ── Init ─────────────────────────────────────────────
async function initCouleur() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _colUserId = session.user.id;
    const cfg = await SB.getTrainingConfig('roulette');
    if (cfg && cfg.couleur) {
      _colConfig = cfg;
      const lvl = cfg.couleur.levels || DEFAULT_TIMERS_COL;
      ['facile','medium','expert'].forEach(function(k) {
        var el = document.getElementById('col-timer-' + k);
        if (el && lvl[k]) el.textContent = lvl[k];
      });
    }
  } catch(e) {}
}

// ── Sélection de niveau ───────────────────────────────
async function startCouleurLevel(level) {
  _colLevel   = level;
  _colTimer   = ((_colConfig.couleur && _colConfig.couleur.levels) || DEFAULT_TIMERS_COL)[level];
  _colQIndex  = 0;
  _colCorrect = 0;
  _colAnswered = false;

  document.getElementById('col-level-screen').style.display   = 'none';
  document.getElementById('col-training-screen').style.display = '';

  try {
    const s = await SB.startTrainingSession('roulette-couleur');
    _colSessionId = s.id;
  } catch(e) {}

  nextCouleur();
}

// ── Question ──────────────────────────────────────────
function nextCouleur() {
  if (_colQIndex >= QUESTIONS_PER_SESSION) { showCouleurSummary(); return; }

  _colAnswered = false;
  _colNumber   = Math.floor(Math.random() * 37); // 0-36
  const color  = R_COLORS[_colNumber];

  // Affiche le numéro
  const el = document.getElementById('col-number');
  el.textContent = _colNumber;
  el.className   = 'couleur-number';

  // Feedback vide
  document.getElementById('col-feedback').className   = 'feedback-bar empty';
  document.getElementById('col-feedback').textContent = '';

  updateCouleurProgress();
  startCouleurTimer();
}

function updateCouleurProgress() {
  document.getElementById('col-progress').textContent = 'Question ' + (_colQIndex + 1) + ' / ' + QUESTIONS_PER_SESSION;
  document.getElementById('col-score').textContent    = 'Score : ' + _colCorrect + ' / ' + _colQIndex;
  document.getElementById('col-progress-fill').style.width = ((_colQIndex / QUESTIONS_PER_SESSION) * 100) + '%';
}

// ── Timer ─────────────────────────────────────────────
function startCouleurTimer() {
  _colTimeLeft = _colTimer;
  updateCouleurTimerDisplay();
  _colHandle = setInterval(function() {
    _colTimeLeft--;
    updateCouleurTimerDisplay();
    if (_colTimeLeft <= 0) {
      clearInterval(_colHandle);
      if (!_colAnswered) couleurTimeout();
    }
  }, 1000);
}

function stopCouleurTimer() { clearInterval(_colHandle); }

function updateCouleurTimerDisplay() {
  const el  = document.getElementById('col-timer-display');
  const bar = document.getElementById('col-timer-bar');
  const cls = _colTimeLeft <= 1 ? ' danger' : _colTimeLeft <= 2 ? ' warning' : '';
  el.textContent   = _colTimeLeft;
  el.className     = 'timer-display' + cls;
  bar.style.width  = ((_colTimeLeft / _colTimer) * 100) + '%';
  bar.className    = 'timer-bar-fill' + cls;
}

function couleurTimeout() {
  _colAnswered = true;
  const correct = R_COLORS[_colNumber];
  const fb = document.getElementById('col-feedback');
  fb.className   = 'feedback-bar wrong';
  fb.textContent = '⏱ Temps écoulé — ' + colorLabel(correct);
  _colQIndex++;
  updateCouleurProgress();
  setTimeout(function() {
    if (_colQIndex >= QUESTIONS_PER_SESSION) showCouleurSummary();
    else nextCouleur();
  }, 1200);
}

// ── Réponse ───────────────────────────────────────────
async function answerCouleur(answer) {
  if (_colAnswered) return;
  stopCouleurTimer();
  _colAnswered = true;

  const correct   = R_COLORS[_colNumber];
  const isCorrect = answer === correct;
  if (isCorrect) _colCorrect++;

  const fb = document.getElementById('col-feedback');
  if (isCorrect) {
    fb.className   = 'feedback-bar correct';
    fb.textContent = '✓ ' + colorLabel(correct) + ' — Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ ' + colorLabel(correct);
  }

  try {
    if (_colSessionId && _colUserId) {
      await SB.addTrainingResult(
        _colSessionId, _colUserId, 'roulette-couleur',
        { number: _colNumber, correct_color: correct, level: _colLevel },
        0, 0, isCorrect
      );
    }
  } catch(e) {}

  _colQIndex++;
  updateCouleurProgress();

  setTimeout(function() {
    if (_colQIndex >= QUESTIONS_PER_SESSION) showCouleurSummary();
    else nextCouleur();
  }, isCorrect ? 700 : 1400);
}

function colorLabel(c) {
  return c === 'red' ? 'Rouge' : c === 'black' ? 'Noir' : 'Zéro (Vert)';
}

// ── Résumé ────────────────────────────────────────────
async function showCouleurSummary() {
  stopCouleurTimer();
  try { if (_colSessionId) await SB.endTrainingSession(_colSessionId, QUESTIONS_PER_SESSION, _colCorrect); } catch(e) {}

  document.getElementById('col-training-screen').style.display = 'none';
  document.getElementById('col-summary-screen').style.display  = '';

  const pct = Math.round((_colCorrect / QUESTIONS_PER_SESSION) * 100);
  const lvlLabels = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
  document.getElementById('col-summary-level').textContent   = lvlLabels[_colLevel] + ' · ' + _colTimer + 's';
  document.getElementById('col-summary-score').textContent   = _colCorrect + '/' + QUESTIONS_PER_SESSION;
  document.getElementById('col-summary-pct').textContent     = pct + '%';
  document.getElementById('col-summary-verdict').textContent = couleurVerdict(_colCorrect);
}

function couleurVerdict(n) {
  if (n === QUESTIONS_PER_SESSION) return '🏆 Parfait !';
  if (n >= 13) return 'Excellent !';
  if (n >= 10) return 'Bien';
  if (n >= 7)  return 'À améliorer';
  return 'À reprendre';
}

function restartCouleur() {
  stopCouleurTimer();
  _colSessionId = null; _colQIndex = 0; _colCorrect = 0;
  _colAnswered = false; _colLevel = null;
  document.getElementById('col-summary-screen').style.display  = 'none';
  document.getElementById('col-level-screen').style.display    = '';
}
