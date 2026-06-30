// ══════════════════════════════════════════════════════
//  ROULETTE PAIEMENT — module 1
//  Tapis 1ère douzaine + chip visuel → paiement en pièces
//  Pas de timer — difficulté = nombre de pièces par niveau
// ══════════════════════════════════════════════════════

const RP_QUESTIONS = 10;

let _rpSessionId = null;
let _rpUserId    = null;
let _rpLevel     = null;
let _rpQIndex    = 0;
let _rpCorrect   = 0;
let _rpAnswered  = false;
let _rpBet       = null;

// ── Init ─────────────────────────────────────────────
async function initPaiement() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _rpUserId = session.user.id;
  } catch(e) {}

  // Pré-rendu du tapis (vide, avant le début de session)
  renderTapis(document.getElementById('rp-tapis'), { maxNum: 12 });
}

// ── Sélection de niveau ───────────────────────────────
async function startPaiementLevel(level) {
  _rpLevel   = level;
  _rpQIndex  = 0;
  _rpCorrect = 0;
  _rpAnswered = false;

  document.getElementById('rp-level-screen').style.display    = 'none';
  document.getElementById('rp-training-screen').style.display = '';

  try {
    const s = await SB.startTrainingSession('roulette-paiement');
    _rpSessionId = s.id;
  } catch(e) {}

  nextPaiement();
}

// ── Question ──────────────────────────────────────────
function nextPaiement() {
  if (_rpQIndex >= RP_QUESTIONS) { showPaiementSummary(); return; }

  _rpAnswered = false;
  _rpBet = generateBet(_rpLevel);

  renderTapis(document.getElementById('rp-tapis'), { maxNum: 12 });
  renderChip(document.getElementById('rp-chip-overlay'), _rpBet.numbers, _rpBet.chips, 4);

  document.getElementById('rp-bet-label').textContent = _rpBet.type.label;

  const inp = document.getElementById('rp-answer-input');
  inp.value = ''; inp.disabled = false;

  document.getElementById('rp-feedback').className    = 'feedback-bar empty';
  document.getElementById('rp-feedback').textContent   = '';
  document.getElementById('rp-submit-btn').disabled    = false;
  document.getElementById('rp-next-btn').style.display = 'none';

  updatePaiementProgress();
  setTimeout(function() { inp.focus(); }, 50);
}

function updatePaiementProgress() {
  document.getElementById('rp-progress').textContent = 'Question ' + (_rpQIndex + 1) + ' / ' + RP_QUESTIONS;
  document.getElementById('rp-score').textContent    = 'Score : ' + _rpCorrect + ' / ' + _rpQIndex;
  document.getElementById('rp-progress-fill').style.width = ((_rpQIndex / RP_QUESTIONS) * 100) + '%';
}

// ── Validation ────────────────────────────────────────
async function submitPaiement() {
  if (_rpAnswered) return;
  const inp = document.getElementById('rp-answer-input');
  const val = parseInt(inp.value);
  if (isNaN(val)) { inp.focus(); return; }

  _rpAnswered = true;
  inp.disabled = true;
  document.getElementById('rp-submit-btn').disabled = true;

  const isCorrect = val === _rpBet.payout;
  if (isCorrect) _rpCorrect++;

  const fb = document.getElementById('rp-feedback');
  if (isCorrect) {
    fb.className   = 'feedback-bar correct';
    fb.textContent = '✓ ' + _rpBet.payout + ' pièces — Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — ' + _rpBet.payout + ' pièces';
  }

  try {
    if (_rpSessionId && _rpUserId) {
      await SB.addTrainingResult(
        _rpSessionId, _rpUserId, 'roulette-paiement',
        { type: _rpBet.type.id, numbers: _rpBet.numbers, chips: _rpBet.chips, level: _rpLevel },
        _rpBet.payout, val, isCorrect
      );
    }
  } catch(e) {}

  _rpQIndex++;
  updatePaiementProgress();

  if (isCorrect) {
    setTimeout(function() {
      if (_rpQIndex >= RP_QUESTIONS) showPaiementSummary();
      else nextPaiement();
    }, 800);
  } else {
    if (_rpQIndex >= RP_QUESTIONS) setTimeout(showPaiementSummary, 1800);
    else document.getElementById('rp-next-btn').style.display = '';
  }
}

function manualNextPaiement() {
  document.getElementById('rp-next-btn').style.display = 'none';
  if (_rpQIndex >= RP_QUESTIONS) showPaiementSummary();
  else nextPaiement();
}

// ── Résumé ────────────────────────────────────────────
async function showPaiementSummary() {
  try { if (_rpSessionId) await SB.endTrainingSession(_rpSessionId, RP_QUESTIONS, _rpCorrect); } catch(e) {}

  document.getElementById('rp-training-screen').style.display = 'none';
  document.getElementById('rp-summary-screen').style.display  = '';

  const pct = Math.round((_rpCorrect / RP_QUESTIONS) * 100);
  const lbls = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
  document.getElementById('rp-summary-level').textContent   = lbls[_rpLevel];
  document.getElementById('rp-summary-score').textContent   = _rpCorrect + '/' + RP_QUESTIONS;
  document.getElementById('rp-summary-pct').textContent     = pct + '%';
  document.getElementById('rp-summary-verdict').textContent = rpVerdict(_rpCorrect);
}

function rpVerdict(n) {
  if (n === RP_QUESTIONS) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function restartPaiement() {
  _rpSessionId = null; _rpQIndex = 0; _rpCorrect = 0;
  _rpAnswered = false; _rpLevel = null;
  document.getElementById('rp-summary-screen').style.display  = 'none';
  document.getElementById('rp-level-screen').style.display    = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('rp-training-screen').style.display !== 'none') {
    submitPaiement();
  }
});
