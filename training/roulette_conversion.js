// ══════════════════════════════════════════════════════
//  ROULETTE CONVERSION — module 2
//  N pièces payées de valeur X€ (fixée pour la session) → conversion en euros
// ══════════════════════════════════════════════════════

const CV_QUESTIONS = 10;
const CV_DEFAULT_TIMERS = { facile: 12, medium: 8, expert: 4 };
const CV_DEFAULT_CHIP_VALUES = [2.5, 5, 10, 20, 50];

let _cvConfig    = { levels: CV_DEFAULT_TIMERS, chip_values: CV_DEFAULT_CHIP_VALUES };
let _cvSessionId = null;
let _cvUserId    = null;
let _cvLevel     = null;
let _cvTimer     = 12;
let _cvChipValue = 5;
let _cvQIndex    = 0;
let _cvCorrect   = 0;
let _cvAnswered  = false;
let _cvChips     = 0;
let _cvHandle    = null;
let _cvTimeLeft  = 12;

// ── Init ─────────────────────────────────────────────
async function initConversion() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _cvUserId = session.user.id;
    const cfg = await SB.getTrainingConfig('roulette');
    if (cfg && cfg.conversion) {
      _cvConfig = cfg.conversion;
      const lvl = _cvConfig.levels || CV_DEFAULT_TIMERS;
      ['facile','medium','expert'].forEach(function(k) {
        var el = document.getElementById('cv-timer-' + k);
        if (el && lvl[k]) el.textContent = lvl[k];
      });
    }
  } catch(e) {}

  renderChipValueScreen();
}

// ── Étape 1 : choix de la valeur de pièce ─────────────
function renderChipValueScreen() {
  const values = (_cvConfig && _cvConfig.chip_values && _cvConfig.chip_values.length)
    ? _cvConfig.chip_values : CV_DEFAULT_CHIP_VALUES;
  const grid = document.getElementById('cv-chipval-grid');
  grid.innerHTML = values.map(function(v) {
    return '<div class="chipval-card" onclick="selectChipValue(' + v + ')">'
      + '<div class="chipval-amount">' + formatVal(v) + '</div>'
      + '<div class="chipval-unit">€</div>'
      + '</div>';
  }).join('');
}

function selectChipValue(v) {
  _cvChipValue = v;
  document.getElementById('cv-chipval-screen').style.display = 'none';
  document.getElementById('cv-level-screen').style.display   = '';
}

// ── Étape 2 : sélection de niveau ─────────────────────
async function startConversionLevel(level) {
  _cvLevel   = level;
  _cvTimer   = ((_cvConfig && _cvConfig.levels) || CV_DEFAULT_TIMERS)[level];
  _cvQIndex  = 0;
  _cvCorrect = 0;
  _cvAnswered = false;

  document.getElementById('cv-level-screen').style.display    = 'none';
  document.getElementById('cv-training-screen').style.display = '';

  try {
    const s = await SB.startTrainingSession('roulette-conversion');
    _cvSessionId = s.id;
  } catch(e) {}

  nextConversion();
}

// ── Question ──────────────────────────────────────────
function nextConversion() {
  if (_cvQIndex >= CV_QUESTIONS) { showConversionSummary(); return; }

  _cvAnswered = false;
  _cvChips = Math.floor(Math.random() * 50) + 1; // 1 à 50 pièces

  document.getElementById('cv-chips').textContent       = _cvChips;
  document.getElementById('cv-value-badge').textContent = '× ' + formatVal(_cvChipValue) + ' €';

  const inp = document.getElementById('cv-answer-input');
  inp.value = ''; inp.disabled = false;

  document.getElementById('cv-feedback').className  = 'feedback-bar empty';
  document.getElementById('cv-feedback').textContent = '';
  document.getElementById('cv-submit-btn').disabled  = false;
  document.getElementById('cv-next-btn').style.display = 'none';

  updateConversionProgress();
  startCvTimer();
  setTimeout(function() { inp.focus(); }, 50);
}

function updateConversionProgress() {
  document.getElementById('cv-progress').textContent = 'Question ' + (_cvQIndex + 1) + ' / ' + CV_QUESTIONS;
  document.getElementById('cv-score').textContent    = 'Score : ' + _cvCorrect + ' / ' + _cvQIndex;
  document.getElementById('cv-progress-fill').style.width = ((_cvQIndex / CV_QUESTIONS) * 100) + '%';
}

// ── Timer ─────────────────────────────────────────────
function startCvTimer() {
  _cvTimeLeft = _cvTimer;
  updateCvTimerDisplay();
  _cvHandle = setInterval(function() {
    _cvTimeLeft--;
    updateCvTimerDisplay();
    if (_cvTimeLeft <= 0) { clearInterval(_cvHandle); if (!_cvAnswered) cvTimeout(); }
  }, 1000);
}

function stopCvTimer() { clearInterval(_cvHandle); }

function updateCvTimerDisplay() {
  const el  = document.getElementById('cv-timer-display');
  const bar = document.getElementById('cv-timer-bar');
  const cls = _cvTimeLeft <= 2 ? ' danger' : _cvTimeLeft <= Math.ceil(_cvTimer * 0.3) ? ' warning' : '';
  el.textContent  = _cvTimeLeft;
  el.className    = 'timer-display' + cls;
  bar.style.width = ((_cvTimeLeft / _cvTimer) * 100) + '%';
  bar.className   = 'timer-bar-fill' + cls;
}

function cvTimeout() {
  _cvAnswered = true;
  document.getElementById('cv-answer-input').disabled = true;
  document.getElementById('cv-submit-btn').disabled   = true;
  const correct = roundVal(_cvChips * _cvChipValue);
  const fb = document.getElementById('cv-feedback');
  fb.className   = 'feedback-bar wrong';
  fb.textContent = '⏱ Temps écoulé — ' + formatVal(correct) + ' €';
  _cvQIndex++;
  updateConversionProgress();
  if (_cvQIndex >= CV_QUESTIONS) {
    setTimeout(showConversionSummary, 1800);
  } else {
    document.getElementById('cv-next-btn').style.display = '';
  }
}

// ── Validation ────────────────────────────────────────
async function submitConversion() {
  if (_cvAnswered) return;
  const inp = document.getElementById('cv-answer-input');
  const raw = inp.value.trim().replace(',', '.');
  const val = parseFloat(raw);
  if (raw === '' || isNaN(val)) { inp.focus(); return; }

  stopCvTimer();
  _cvAnswered = true;
  inp.disabled = true;
  document.getElementById('cv-submit-btn').disabled = true;

  const correct   = roundVal(_cvChips * _cvChipValue);
  const isCorrect = val === correct;
  if (isCorrect) _cvCorrect++;

  const fb = document.getElementById('cv-feedback');
  if (isCorrect) {
    fb.className   = 'feedback-bar correct';
    fb.textContent = '✓ ' + formatVal(correct) + ' € — Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — ' + formatVal(correct) + ' €';
  }

  try {
    if (_cvSessionId && _cvUserId) {
      await SB.addTrainingResult(
        _cvSessionId, _cvUserId, 'roulette-conversion',
        { chips: _cvChips, value: _cvChipValue, level: _cvLevel },
        correct, val, isCorrect
      );
    }
  } catch(e) {}

  _cvQIndex++;
  updateConversionProgress();

  if (isCorrect) {
    setTimeout(function() {
      if (_cvQIndex >= CV_QUESTIONS) showConversionSummary();
      else nextConversion();
    }, 800);
  } else {
    if (_cvQIndex >= CV_QUESTIONS) setTimeout(showConversionSummary, 1800);
    else document.getElementById('cv-next-btn').style.display = '';
  }
}

function manualNextConversion() {
  document.getElementById('cv-next-btn').style.display = 'none';
  if (_cvQIndex >= CV_QUESTIONS) showConversionSummary();
  else nextConversion();
}

function roundVal(n) { return Math.round(n * 100) / 100; }
function formatVal(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

// ── Résumé ────────────────────────────────────────────
async function showConversionSummary() {
  stopCvTimer();
  try { if (_cvSessionId) await SB.endTrainingSession(_cvSessionId, CV_QUESTIONS, _cvCorrect); } catch(e) {}

  document.getElementById('cv-training-screen').style.display = 'none';
  document.getElementById('cv-summary-screen').style.display  = '';

  const pct = Math.round((_cvCorrect / CV_QUESTIONS) * 100);
  const lbls = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
  document.getElementById('cv-summary-level').textContent   = lbls[_cvLevel] + ' · ' + formatVal(_cvChipValue) + '€ · ' + _cvTimer + 's';
  document.getElementById('cv-summary-score').textContent   = _cvCorrect + '/' + CV_QUESTIONS;
  document.getElementById('cv-summary-pct').textContent     = pct + '%';
  document.getElementById('cv-summary-verdict').textContent = cvVerdict(_cvCorrect);
}

function cvVerdict(n) {
  if (n === CV_QUESTIONS) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function restartConversion() {
  stopCvTimer();
  _cvSessionId = null; _cvQIndex = 0; _cvCorrect = 0;
  _cvAnswered = false; _cvLevel = null;
  document.getElementById('cv-summary-screen').style.display  = 'none';
  document.getElementById('cv-chipval-screen').style.display  = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('cv-training-screen').style.display !== 'none') {
    submitConversion();
  }
});
