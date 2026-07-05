// ══════════════════════════════════════════════════════
//  ROULETTE PAIEMENT MIXTE — module 7
//  Répartition d'un paiement entre pièces (jeu) et plaques (valeur ronde)
//  3 types : montant rond demandé / le client garde des pièces / mix libre
// ══════════════════════════════════════════════════════

const MIX_QUESTIONS = 10;
const MIX_DEFAULT_TIMERS = { facile: 30, medium: 20, expert: 12 };
const MIX_PIECE_VALUES  = [2.5, 5, 10, 20, 50];           // valeur de la pièce de jeu
const MIX_DENOMINATIONS = [1000, 500, 100, 50, 20, 10, 5, 2.5]; // plaques disponibles, décroissant
const MIX_N_RANGES = { facile: [20, 80], medium: [50, 200], expert: [100, 500] };

let _mxConfig    = { levels: MIX_DEFAULT_TIMERS };
let _mxSessionId = null;
let _mxUserId    = null;
let _mxType      = null; // 'rond' | 'garde' | 'libre'
let _mxLevel     = null;
let _mxTimer     = 30;
let _mxQIndex    = 0;
let _mxCorrect   = 0;
let _mxAnswered  = false;
let _mxHandle    = null;
let _mxTimeLeft  = 30;

let _mxV      = 0; // valeur de la pièce pour la question en cours
let _mxN      = 0; // nombre de pièces à payer
let _mxExtra  = 0; // P (montant demandé, type rond) ou K (pièces gardées, type garde)
let _mxTarget = 0; // réponse de référence : pièces restantes (rond) / montant à décomposer (garde) / total (libre)

// ── Init ─────────────────────────────────────────────
async function initMixte() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _mxUserId = session.user.id;
    const cfg = await SB.getTrainingConfig('roulette');
    if (cfg && cfg.mixte) _mxConfig = cfg.mixte;
  } catch(e) {}
}

// ── Étape 1 : choix du type d'exercice ────────────────
function selectMixType(type) {
  _mxType = type;
  document.getElementById('mx-type-screen').style.display  = 'none';
  document.getElementById('mx-level-screen').style.display = '';

  const lvl = (_mxConfig && _mxConfig.levels) || MIX_DEFAULT_TIMERS;
  ['facile','medium','expert'].forEach(function(k) {
    var el = document.getElementById('mx-timer-' + k);
    if (el && lvl[k]) el.textContent = lvl[k];
  });
}

// ── Étape 2 : sélection de niveau ─────────────────────
async function startMixLevel(level) {
  _mxLevel   = level;
  _mxTimer   = ((_mxConfig && _mxConfig.levels) || MIX_DEFAULT_TIMERS)[level];
  _mxQIndex  = 0;
  _mxCorrect = 0;
  _mxAnswered = false;

  document.getElementById('mx-level-screen').style.display    = 'none';
  document.getElementById('mx-training-screen').style.display = '';

  document.getElementById('mx-answer-rond').style.display  = _mxType === 'rond'  ? '' : 'none';
  document.getElementById('mx-answer-garde').style.display = _mxType === 'garde' ? '' : 'none';
  document.getElementById('mx-answer-libre').style.display = _mxType === 'libre' ? '' : 'none';

  if (_mxType === 'garde') buildDenomGrid();

  try {
    const s = await SB.startTrainingSession('roulette-mixte');
    _mxSessionId = s.id;
  } catch(e) {}

  nextMixte();
}

function denomId(d) { return String(d).replace('.', '-'); }

function buildDenomGrid() {
  const grid = document.getElementById('mx-denom-grid');
  grid.innerHTML = MIX_DENOMINATIONS.map(function(d) {
    return '<div class="cfg-timer-cell">'
      + '<div class="cfg-timer-label">' + formatVal(d) + ' €</div>'
      + '<input type="number" class="cfg-timer-input" id="mx-denom-' + denomId(d) + '" min="0" step="1" />'
      + '</div>';
  }).join('');
}

// ── Génération ─────────────────────────────────────────
function pickPieceValue() {
  return MIX_PIECE_VALUES[Math.floor(Math.random() * MIX_PIECE_VALUES.length)];
}

function pickPieceCount(level) {
  const range = MIX_N_RANGES[level] || MIX_N_RANGES.expert;
  return randInt(range[0], range[1]);
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function nextMixte() {
  if (_mxQIndex >= MIX_QUESTIONS) { showMixteSummary(); return; }
  _mxAnswered = false;

  _mxV = pickPieceValue();
  _mxN = pickPieceCount(_mxLevel);

  if (_mxType === 'rond') {
    const mult = randInt(1, _mxN - 1);
    _mxExtra  = mult * _mxV;
    _mxTarget = _mxN - mult;
  } else if (_mxType === 'garde') {
    _mxExtra  = randInt(0, _mxN - 1);
    _mxTarget = (_mxN - _mxExtra) * _mxV;
  } else {
    _mxExtra  = 0;
    _mxTarget = _mxN * _mxV;
  }

  renderMixQuestion();
  updateMixProgress();
  startMxTimer();
}

function renderMixQuestion() {
  document.getElementById('mx-piece-count').textContent = _mxN;
  document.getElementById('mx-piece-value').textContent = formatVal(_mxV);

  const extraEl = document.getElementById('mx-question-extra');
  if (_mxType === 'rond') {
    extraEl.textContent = 'Le client demande ' + formatVal(_mxExtra) + ' € en plaques. Combien de pièces reste-t-il à payer ?';
    document.getElementById('mx-rond-input').value = '';
  } else if (_mxType === 'garde') {
    extraEl.textContent = 'Le client garde ' + _mxExtra + ' pièce' + (_mxExtra > 1 ? 's' : '') + ' pour rejouer. Décomposez la valeur du reste en plaques.';
    MIX_DENOMINATIONS.forEach(function(d) {
      document.getElementById('mx-denom-' + denomId(d)).value = '';
    });
  } else {
    extraEl.textContent = 'Proposez une répartition plaques + pièces qui reconstitue le total.';
    document.getElementById('mx-libre-plaques').value = '';
    document.getElementById('mx-libre-pieces').value  = '';
  }

  document.getElementById('mx-feedback').className    = 'feedback-bar empty';
  document.getElementById('mx-feedback').textContent   = '';
  document.getElementById('mx-submit-btn').disabled    = false;
  document.getElementById('mx-next-btn').style.display = 'none';

  const firstInput = _mxType === 'rond' ? document.getElementById('mx-rond-input')
    : _mxType === 'garde' ? document.getElementById('mx-denom-1000')
    : document.getElementById('mx-libre-plaques');
  setTimeout(function() { firstInput.focus(); }, 50);
}

function updateMixProgress() {
  document.getElementById('mx-progress').textContent = 'Question ' + (_mxQIndex + 1) + ' / ' + MIX_QUESTIONS;
  document.getElementById('mx-score').textContent    = 'Score : ' + _mxCorrect + ' / ' + _mxQIndex;
  document.getElementById('mx-progress-fill').style.width = ((_mxQIndex / MIX_QUESTIONS) * 100) + '%';
}

// ── Timer ─────────────────────────────────────────────
function startMxTimer() {
  _mxTimeLeft = _mxTimer;
  updateMxTimerDisplay();
  _mxHandle = setInterval(function() {
    _mxTimeLeft--;
    updateMxTimerDisplay();
    if (_mxTimeLeft <= 0) { clearInterval(_mxHandle); if (!_mxAnswered) mxTimeout(); }
  }, 1000);
}

function stopMxTimer() { clearInterval(_mxHandle); }

function updateMxTimerDisplay() {
  const el  = document.getElementById('mx-timer-display');
  const bar = document.getElementById('mx-timer-bar');
  const cls = _mxTimeLeft <= 3 ? ' danger' : _mxTimeLeft <= Math.ceil(_mxTimer * 0.3) ? ' warning' : '';
  el.textContent  = _mxTimeLeft;
  el.className    = 'timer-display' + cls;
  bar.style.width = ((_mxTimeLeft / _mxTimer) * 100) + '%';
  bar.className   = 'timer-bar-fill' + cls;
}

function disableMixInputs() {
  if (_mxType === 'rond') {
    document.getElementById('mx-rond-input').disabled = true;
  } else if (_mxType === 'garde') {
    MIX_DENOMINATIONS.forEach(function(d) {
      document.getElementById('mx-denom-' + denomId(d)).disabled = true;
    });
  } else {
    document.getElementById('mx-libre-plaques').disabled = true;
    document.getElementById('mx-libre-pieces').disabled  = true;
  }
  document.getElementById('mx-submit-btn').disabled = true;
}

function mxTimeout() {
  _mxAnswered = true;
  disableMixInputs();
  const fb = document.getElementById('mx-feedback');
  fb.className   = 'feedback-bar wrong';
  fb.textContent = '⏱ Temps écoulé — ' + mxExpectedLabel();
  _mxQIndex++;
  updateMixProgress();
  if (_mxQIndex >= MIX_QUESTIONS) setTimeout(showMixteSummary, 2000);
  else document.getElementById('mx-next-btn').style.display = '';
}

function mxExpectedLabel() {
  if (_mxType === 'rond')  return _mxTarget + ' pièces';
  if (_mxType === 'garde') return 'une décomposition totalisant ' + formatVal(_mxTarget) + ' €';
  return 'une répartition totalisant ' + formatVal(_mxTarget) + ' €';
}

// ── Validation ────────────────────────────────────────
async function submitMixte() {
  if (_mxAnswered) return;

  let isCorrect = false;
  let userAnswerNum = 0;
  let detail = {};

  if (_mxType === 'rond') {
    const inp = document.getElementById('mx-rond-input');
    const val = parseInt(inp.value);
    if (isNaN(val)) { inp.focus(); return; }
    isCorrect = val === _mxTarget;
    userAnswerNum = val;
    detail = { piecesRestantes: val };

  } else if (_mxType === 'garde') {
    let sum = 0, anyFilled = false;
    for (const d of MIX_DENOMINATIONS) {
      const el = document.getElementById('mx-denom-' + denomId(d));
      if (el.value !== '') anyFilled = true;
      const n = parseInt(el.value) || 0;
      if (n < 0) { el.focus(); return; }
      sum += n * d;
      detail['d' + denomId(d)] = n;
    }
    if (!anyFilled) { document.getElementById('mx-denom-1000').focus(); return; }
    isCorrect = Math.abs(sum - _mxTarget) < 0.001;
    userAnswerNum = sum;

  } else {
    const plaquesInp = document.getElementById('mx-libre-plaques');
    const piecesInp  = document.getElementById('mx-libre-pieces');
    const plaques = parseFloat((plaquesInp.value || '').replace(',', '.'));
    const pieces  = parseInt(piecesInp.value);
    if (isNaN(plaques) || isNaN(pieces)) { (isNaN(plaques) ? plaquesInp : piecesInp).focus(); return; }
    const total = plaques + pieces * _mxV;
    isCorrect = pieces >= 0 && pieces <= _mxN && plaques >= 0 && Math.abs(total - _mxTarget) < 0.001;
    userAnswerNum = total;
    detail = { plaques: plaques, pieces: pieces };
  }

  stopMxTimer();
  _mxAnswered = true;
  if (isCorrect) _mxCorrect++;
  disableMixInputs();

  const fb = document.getElementById('mx-feedback');
  if (isCorrect) {
    fb.className   = 'feedback-bar correct';
    fb.textContent = '✓ Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — attendu ' + mxExpectedLabel();
  }

  try {
    if (_mxSessionId && _mxUserId) {
      await SB.addTrainingResult(
        _mxSessionId, _mxUserId, 'roulette-mixte',
        { type: _mxType, pieceValue: _mxV, pieceCount: _mxN, extra: _mxExtra, level: _mxLevel, detail: detail },
        _mxTarget, userAnswerNum, isCorrect
      );
    }
  } catch(e) {}

  _mxQIndex++;
  updateMixProgress();

  if (isCorrect) {
    setTimeout(function() {
      if (_mxQIndex >= MIX_QUESTIONS) showMixteSummary(); else nextMixte();
    }, 900);
  } else {
    if (_mxQIndex >= MIX_QUESTIONS) setTimeout(showMixteSummary, 2200);
    else document.getElementById('mx-next-btn').style.display = '';
  }
}

function manualNextMixte() {
  document.getElementById('mx-next-btn').style.display = 'none';
  if (_mxQIndex >= MIX_QUESTIONS) showMixteSummary();
  else nextMixte();
}

function formatVal(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

// ── Résumé ────────────────────────────────────────────
async function showMixteSummary() {
  stopMxTimer();
  try { if (_mxSessionId) await SB.endTrainingSession(_mxSessionId, MIX_QUESTIONS, _mxCorrect); } catch(e) {}

  document.getElementById('mx-training-screen').style.display = 'none';
  document.getElementById('mx-summary-screen').style.display  = '';

  const pct = Math.round((_mxCorrect / MIX_QUESTIONS) * 100);
  const lbls = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
  const typeLbls = { rond: 'Montant rond', garde: 'Garde des pièces', libre: 'Mix libre' };
  document.getElementById('mx-summary-level').textContent   = typeLbls[_mxType] + ' · ' + lbls[_mxLevel] + ' · ' + _mxTimer + 's';
  document.getElementById('mx-summary-score').textContent   = _mxCorrect + '/' + MIX_QUESTIONS;
  document.getElementById('mx-summary-pct').textContent     = pct + '%';
  document.getElementById('mx-summary-verdict').textContent = mxVerdict(_mxCorrect);
}

function mxVerdict(n) {
  if (n === MIX_QUESTIONS) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function restartMixte() {
  stopMxTimer();
  _mxSessionId = null; _mxQIndex = 0; _mxCorrect = 0;
  _mxAnswered = false; _mxType = null; _mxLevel = null;
  document.getElementById('mx-summary-screen').style.display = 'none';
  document.getElementById('mx-type-screen').style.display    = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('mx-training-screen').style.display !== 'none') {
    submitMixte();
  }
});
