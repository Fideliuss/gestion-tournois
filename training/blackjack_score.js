// ══════════════════════════════════════════════════════
//  BLACKJACK SCORE — lecture de points avec timer + niveaux
// ══════════════════════════════════════════════════════

const RANKS   = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUITS   = ['♠','♥','♦','♣'];
const RED     = ['♥','♦'];
const TEN_VAL = ['10','J','Q','K'];

const QUESTIONS_PER_SESSION = 10;

const LEVEL_LABELS = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
const DEFAULT_TIMERS = { facile: 15, medium: 10, expert: 5 };

let _config      = { levels: DEFAULT_TIMERS };
let _sessionId   = null;
let _userId      = null;
let _level       = null;
let _timerSecs   = 10;
let _qIndex      = 0;
let _correct     = 0;
let _answered    = false;
let _hand        = [];
let _validTotals = [];
let _timerHandle = null;
let _timeLeft    = 10;

// ── Init ─────────────────────────────────────────────
async function initScore() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _userId = session.user.id;
    const cfg = await SB.getTrainingConfig('blackjack');
    if (cfg) {
      _config = cfg;
      // Mettre à jour les timers affichés sur l'écran de sélection
      const levels = cfg.levels || DEFAULT_TIMERS;
      ['facile','medium','expert'].forEach(function(k) {
        const el = document.getElementById('timer-' + k);
        if (el && levels[k]) el.textContent = levels[k];
      });
    }
  } catch(e) {}
}

// ── Sélection de niveau ───────────────────────────────
async function startWithLevel(level) {
  _level     = level;
  _timerSecs = ((_config.levels || DEFAULT_TIMERS)[level]) || DEFAULT_TIMERS[level];
  _qIndex    = 0;
  _correct   = 0;
  _answered  = false;

  document.getElementById('level-screen').style.display   = 'none';
  document.getElementById('training-screen').style.display = '';

  try {
    const s = await SB.startTrainingSession('blackjack-score');
    _sessionId = s.id;
  } catch(e) {}

  nextQuestion();
}

// ── Génération main (règles banque : tire ≤16, laisse ≥17) ──
function randomCard() {
  return {
    rank: RANKS[Math.floor(Math.random() * RANKS.length)],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
  };
}

function isBJ(hand) {
  if (hand.length !== 2) return false;
  const hasAce = hand.some(function(c) { return c.rank === 'A'; });
  const hasTen = hand.some(function(c) { return TEN_VAL.includes(c.rank); });
  return hasAce && hasTen;
}

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (TEN_VAL.includes(rank)) return 10;
  return parseInt(rank);
}

function calcTotal(hand) {
  let total = 0, aces = 0;
  hand.forEach(function(c) {
    total += cardValue(c.rank);
    if (c.rank === 'A') aces++;
  });
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function getValidTotals(hand) {
  const best = calcTotal(hand);
  const totals = [best];
  const hasAce = hand.some(function(c) { return c.rank === 'A'; });
  if (hasAce && best <= 21) {
    const alt = best - 10;
    if (alt > 0 && alt !== best) totals.push(alt);
  }
  return totals;
}

function generateHand() {
  const hand = [randomCard(), randomCard()];
  if (isBJ(hand)) return hand;
  while (calcTotal(hand) < 17) hand.push(randomCard());
  return hand;
}

function handLabel(hand) {
  const total = calcTotal(hand);
  if (isBJ(hand)) return 'Blackjack';
  if (total > 21)  return 'Bust — ' + total;
  return String(total);
}

// ── Affichage cartes ──────────────────────────────────
function renderCards(hand) {
  const zone = document.getElementById('cards-zone');
  zone.innerHTML = hand.map(function(c) {
    const isRed = RED.includes(c.suit);
    return '<div class="playing-card' + (isRed ? ' red' : '') + '">'
      + '<div class="card-tl"><div class="card-rank">' + c.rank + '</div><div class="card-suit">' + c.suit + '</div></div>'
      + '<div class="card-center">' + c.suit + '</div>'
      + '<div class="card-br"><div class="card-rank">' + c.rank + '</div><div class="card-suit">' + c.suit + '</div></div>'
      + '</div>';
  }).join('');
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  _timeLeft = _timerSecs;
  updateTimerDisplay();
  _timerHandle = setInterval(function() {
    _timeLeft--;
    updateTimerDisplay();
    if (_timeLeft <= 0) { clearInterval(_timerHandle); if (!_answered) timeOut(); }
  }, 1000);
}

function stopTimer() { clearInterval(_timerHandle); }

function updateTimerDisplay() {
  const el  = document.getElementById('timer-display');
  const bar = document.getElementById('timer-bar');
  const cls = _timeLeft <= 3 ? ' danger' : _timeLeft <= Math.ceil(_timerSecs * 0.3) ? ' warning' : '';
  el.textContent   = _timeLeft;
  el.className     = 'timer-display' + cls;
  bar.style.width  = ((_timeLeft / _timerSecs) * 100) + '%';
  bar.className    = 'timer-bar-fill' + cls;
}

function timeOut() {
  _answered = true;
  document.getElementById('answer-input').disabled = true;
  document.getElementById('submit-btn').disabled   = true;
  const fb = document.getElementById('feedback-bar');
  fb.className   = 'feedback-bar wrong';
  fb.textContent = '⏱ Temps écoulé — ' + handLabel(_hand) + ' (' + _validTotals.join(' ou ') + ')';
  _qIndex++;
  updateProgress();
  scheduleNext();
}

// ── Question ──────────────────────────────────────────
function nextQuestion() {
  if (_qIndex >= QUESTIONS_PER_SESSION) { showSummary(); return; }
  _answered    = false;
  _hand        = generateHand();
  _validTotals = getValidTotals(_hand);

  renderCards(_hand);
  updateProgress();

  const inp = document.getElementById('answer-input');
  inp.value = ''; inp.disabled = false;
  document.getElementById('feedback-bar').className   = 'feedback-bar empty';
  document.getElementById('feedback-bar').textContent = '';
  document.getElementById('submit-btn').disabled      = false;

  startTimer();
  setTimeout(function() { inp.focus(); }, 50);
}

function updateProgress() {
  document.getElementById('progress-text').textContent = 'Question ' + (_qIndex + 1) + ' / ' + QUESTIONS_PER_SESSION;
  document.getElementById('score-text').textContent    = 'Score : ' + _correct + ' / ' + _qIndex;
  document.getElementById('progress-fill').style.width = ((_qIndex / QUESTIONS_PER_SESSION) * 100) + '%';
}

// ── Validation ────────────────────────────────────────
async function submitAnswer() {
  if (_answered) return;
  const inp = document.getElementById('answer-input');
  const val = parseInt(inp.value);
  if (isNaN(val)) { inp.focus(); return; }

  stopTimer();
  _answered = true;
  inp.disabled = true;
  document.getElementById('submit-btn').disabled = true;

  const isCorrect = _validTotals.includes(val);
  if (isCorrect) _correct++;

  const fb = document.getElementById('feedback-bar');
  if (isCorrect) {
    fb.className   = 'feedback-bar correct';
    fb.textContent = '✓ ' + handLabel(_hand) + ' — Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — ' + handLabel(_hand) + ' (' + _validTotals.join(' ou ') + ')';
  }

  try {
    if (_sessionId && _userId) {
      await SB.addTrainingResult(
        _sessionId, _userId, 'blackjack-score',
        { hand: _hand, valid_totals: _validTotals, level: _level },
        _validTotals[0], val, isCorrect
      );
    }
  } catch(e) {}

  _qIndex++;
  updateProgress();
  scheduleNext();
}

function scheduleNext() {
  const delay = document.getElementById('feedback-bar').classList.contains('correct') ? 900 : 1800;
  setTimeout(function() {
    if (_qIndex >= QUESTIONS_PER_SESSION) showSummary();
    else nextQuestion();
  }, delay);
}

// ── Résumé ────────────────────────────────────────────
async function showSummary() {
  stopTimer();
  try { if (_sessionId) await SB.endTrainingSession(_sessionId, QUESTIONS_PER_SESSION, _correct); } catch(e) {}

  document.getElementById('training-screen').style.display = 'none';
  document.getElementById('summary-screen').style.display  = '';

  const pct = Math.round((_correct / QUESTIONS_PER_SESSION) * 100);
  document.getElementById('summary-level').textContent   = LEVEL_LABELS[_level] + ' · ' + _timerSecs + 's';
  document.getElementById('summary-score').textContent   = _correct + '/' + QUESTIONS_PER_SESSION;
  document.getElementById('summary-pct').textContent     = pct + '%';
  document.getElementById('summary-verdict').textContent = verdict(_correct);
}

function verdict(n) {
  if (n === QUESTIONS_PER_SESSION) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function restartSession() {
  stopTimer();
  _sessionId = null; _qIndex = 0; _correct = 0; _answered = false; _level = null;
  document.getElementById('summary-screen').style.display  = 'none';
  document.getElementById('level-screen').style.display    = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('training-screen').style.display !== 'none') {
    submitAnswer();
  }
});
