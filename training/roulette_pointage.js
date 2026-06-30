// ══════════════════════════════════════════════════════
//  ROULETTE POINTAGE — module 4
//  Le cylindre annonce un numéro → cliquer sur le tapis
// ══════════════════════════════════════════════════════

const PT_QUESTIONS = 10;
const PT_DEFAULT_TIMERS = { facile: 10, medium: 6, expert: 3 };

let _ptConfig    = { levels: PT_DEFAULT_TIMERS };
let _ptSessionId = null;
let _ptUserId    = null;
let _ptLevel     = null;
let _ptTimer     = 10;
let _ptQIndex    = 0;
let _ptCorrect   = 0;
let _ptAnswered  = false;
let _ptNumber    = 0;
let _ptHandle    = null;
let _ptTimeLeft  = 10;
let _ptMirror    = false;

// ── Init ─────────────────────────────────────────────
async function initPointage() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _ptUserId = session.user.id;
    const cfg = await SB.getTrainingConfig('roulette');
    if (cfg && cfg.pointage) {
      _ptConfig = cfg;
      const lvl = cfg.pointage.levels || PT_DEFAULT_TIMERS;
      ['facile','medium','expert'].forEach(function(k) {
        var el = document.getElementById('pt-timer-' + k);
        if (el && lvl[k]) el.textContent = lvl[k];
      });
    }
  } catch(e) {}

  // Pré-rendu du tapis (non cliquable au départ)
  renderTapis(document.getElementById('pt-tapis'), { maxNum: 36 });
}

// ── Sélection de niveau ───────────────────────────────
async function startPointageLevel(level) {
  _ptLevel   = level;
  _ptTimer   = ((_ptConfig.pointage && _ptConfig.pointage.levels) || PT_DEFAULT_TIMERS)[level];
  _ptQIndex  = 0;
  _ptCorrect = 0;
  _ptAnswered = false;

  document.getElementById('pt-level-screen').style.display    = 'none';
  document.getElementById('pt-training-screen').style.display = '';

  try {
    const s = await SB.startTrainingSession('roulette-pointage');
    _ptSessionId = s.id;
  } catch(e) {}

  nextPointage();
}

// ── Question ──────────────────────────────────────────
function nextPointage() {
  if (_ptQIndex >= PT_QUESTIONS) { showPointageSummary(); return; }

  _ptAnswered = false;
  _ptNumber   = Math.floor(Math.random() * 37); // 0-36
  _ptMirror   = Math.random() < 0.5; // sens de table aléatoire (le 0 détermine le sens)

  // Affiche le numéro dans le cylindre
  const numEl = document.getElementById('pt-announced');
  numEl.textContent = _ptNumber;
  numEl.className   = 'pt-ball ' + R_COLORS[_ptNumber];

  // Tapis cliquable — numéros masqués (test de mémoire), sens aléatoire
  renderTapis(document.getElementById('pt-tapis'), {
    maxNum:      36,
    clickable:   true,
    onClickNum:  true,
    clickFn:     'clickPointage',
    hideNumbers: true,
    mirror:      _ptMirror,
  });

  // Feedback vide + bouton caché
  const fb = document.getElementById('pt-feedback');
  fb.className   = 'feedback-bar empty';
  fb.textContent = '';
  document.getElementById('pt-next-btn').style.display = 'none';

  updatePointageProgress();
  startPtTimer();
}

function updatePointageProgress() {
  document.getElementById('pt-progress').textContent  = 'Question ' + (_ptQIndex + 1) + ' / ' + PT_QUESTIONS;
  document.getElementById('pt-score').textContent     = 'Score : ' + _ptCorrect + ' / ' + _ptQIndex;
  document.getElementById('pt-progress-fill').style.width = ((_ptQIndex / PT_QUESTIONS) * 100) + '%';
}

// ── Timer ─────────────────────────────────────────────
function startPtTimer() {
  _ptTimeLeft = _ptTimer;
  updatePtTimerDisplay();
  _ptHandle = setInterval(function() {
    _ptTimeLeft--;
    updatePtTimerDisplay();
    if (_ptTimeLeft <= 0) { clearInterval(_ptHandle); if (!_ptAnswered) ptTimeout(); }
  }, 1000);
}

function stopPtTimer() { clearInterval(_ptHandle); }

function updatePtTimerDisplay() {
  const el  = document.getElementById('pt-timer-display');
  const bar = document.getElementById('pt-timer-bar');
  const cls = _ptTimeLeft <= 2 ? ' danger' : _ptTimeLeft <= Math.ceil(_ptTimer * 0.3) ? ' warning' : '';
  el.textContent  = _ptTimeLeft;
  el.className    = 'timer-display' + cls;
  bar.style.width = ((_ptTimeLeft / _ptTimer) * 100) + '%';
  bar.className   = 'timer-bar-fill' + cls;
}

function ptTimeout() {
  _ptAnswered = true;
  highlightCorrect();
  const fb = document.getElementById('pt-feedback');
  fb.className   = 'feedback-bar wrong';
  fb.textContent = '⏱ Temps écoulé — le ' + _ptNumber + ' est ' + positionLabel(_ptNumber);
  _ptQIndex++;
  updatePointageProgress();
  if (_ptQIndex >= PT_QUESTIONS) {
    setTimeout(showPointageSummary, 1800);
  } else {
    document.getElementById('pt-next-btn').style.display = '';
  }
}

// ── Clic sur le tapis ─────────────────────────────────
async function clickPointage(n) {
  if (_ptAnswered) return;
  stopPtTimer();
  _ptAnswered = true;

  const isCorrect = n === _ptNumber;
  if (isCorrect) _ptCorrect++;

  const fb = document.getElementById('pt-feedback');
  highlightCorrect();

  if (isCorrect) {
    fb.className   = 'feedback-bar correct';
    fb.textContent = '✓ Correct — le ' + _ptNumber;
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — le ' + _ptNumber + ' est ' + positionLabel(_ptNumber);
  }

  try {
    if (_ptSessionId && _ptUserId) {
      await SB.addTrainingResult(
        _ptSessionId, _ptUserId, 'roulette-pointage',
        { number: _ptNumber, clicked: n, level: _ptLevel },
        _ptNumber, n, isCorrect
      );
    }
  } catch(e) {}

  _ptQIndex++;
  updatePointageProgress();

  if (isCorrect) {
    setTimeout(function() {
      if (_ptQIndex >= PT_QUESTIONS) showPointageSummary();
      else nextPointage();
    }, 800);
  } else {
    if (_ptQIndex >= PT_QUESTIONS) setTimeout(showPointageSummary, 1800);
    else document.getElementById('pt-next-btn').style.display = '';
  }
}

function highlightCorrect() {
  // Révélation : numéros visibles + surbrillance du bon numéro (même sens que la question)
  renderTapis(document.getElementById('pt-tapis'), {
    maxNum:    36,
    highlight: [_ptNumber],
    mirror:    _ptMirror,
  });
}


function manualNext() {
  document.getElementById('pt-next-btn').style.display = 'none';
  if (_ptQIndex >= PT_QUESTIONS) showPointageSummary();
  else nextPointage();
}

function positionLabel(n) {
  if (n === 0) return 'le zéro';
  const col = Math.ceil(n / 3);
  const row = n % 3 === 0 ? 'haut' : n % 3 === 2 ? 'milieu' : 'bas';
  return 'colonne ' + col + ', ' + row;
}

// ── Résumé ────────────────────────────────────────────
async function showPointageSummary() {
  stopPtTimer();
  try { if (_ptSessionId) await SB.endTrainingSession(_ptSessionId, PT_QUESTIONS, _ptCorrect); } catch(e) {}

  document.getElementById('pt-training-screen').style.display = 'none';
  document.getElementById('pt-summary-screen').style.display  = '';

  const pct = Math.round((_ptCorrect / PT_QUESTIONS) * 100);
  const lbls = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
  document.getElementById('pt-summary-level').textContent   = lbls[_ptLevel] + ' · ' + _ptTimer + 's';
  document.getElementById('pt-summary-score').textContent   = _ptCorrect + '/' + PT_QUESTIONS;
  document.getElementById('pt-summary-pct').textContent     = pct + '%';
  document.getElementById('pt-summary-verdict').textContent = ptVerdict(_ptCorrect);
}

function ptVerdict(n) {
  if (n === PT_QUESTIONS) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function restartPointage() {
  stopPtTimer();
  _ptSessionId = null; _ptQIndex = 0; _ptCorrect = 0;
  _ptAnswered = false; _ptLevel = null;
  document.getElementById('pt-summary-screen').style.display  = 'none';
  document.getElementById('pt-level-screen').style.display    = '';
}
