// ══════════════════════════════════════════════════════
//  BLACKJACK SCORE — lecture de points avec timer
// ══════════════════════════════════════════════════════

const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUITS = ['♠','♥','♦','♣'];
const RED   = ['♥','♦'];

const TIMER_SECONDS      = 10;
const QUESTIONS_PER_SESSION = 10;

let _sessionId  = null;
let _userId     = null;
let _qIndex     = 0;
let _correct    = 0;
let _answered   = false;
let _hand       = [];
let _validTotals = [];
let _timerHandle = null;
let _timeLeft   = TIMER_SECONDS;

// ── Init ─────────────────────────────────────────────
async function initScore() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _userId = session.user.id;
    const s = await SB.startTrainingSession('blackjack-score');
    _sessionId = s.id;
  } catch(e) {}
  nextQuestion();
}

// ── Génération main ───────────────────────────────────
function generateHand() {
  const n = Math.floor(Math.random() * 4) + 2; // 2 à 5 cartes
  const hand = [];
  for (let i = 0; i < n; i++) {
    hand.push({
      rank: RANKS[Math.floor(Math.random() * RANKS.length)],
      suit: SUITS[Math.floor(Math.random() * SUITS.length)],
    });
  }
  return hand;
}

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['J','Q','K'].includes(rank)) return 10;
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

// ── Affichage ─────────────────────────────────────────
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
  _timeLeft = TIMER_SECONDS;
  updateTimerDisplay();
  _timerHandle = setInterval(function() {
    _timeLeft--;
    updateTimerDisplay();
    if (_timeLeft <= 0) {
      clearInterval(_timerHandle);
      if (!_answered) timeOut();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(_timerHandle);
}

function updateTimerDisplay() {
  const el  = document.getElementById('timer-display');
  const bar = document.getElementById('timer-bar');
  const cls = _timeLeft <= 3 ? ' danger' : _timeLeft <= 5 ? ' warning' : '';
  el.textContent = _timeLeft;
  el.className   = 'timer-display' + cls;
  const pct = (_timeLeft / TIMER_SECONDS) * 100;
  bar.style.width     = pct + '%';
  bar.className       = 'timer-bar-fill' + cls;
}

function timeOut() {
  _answered = true;
  document.getElementById('answer-input').disabled = true;
  document.getElementById('submit-btn').disabled = true;

  const fb = document.getElementById('feedback-bar');
  fb.className = 'feedback-bar wrong';
  fb.textContent = '⏱ Temps écoulé — La bonne réponse était ' + _validTotals.join(' ou ') + ' point' + (_validTotals[0] > 1 ? 's' : '');

  _qIndex++;
  updateProgress();
  scheduleNext();
}

// ── Question ──────────────────────────────────────────
function nextQuestion() {
  if (_qIndex >= QUESTIONS_PER_SESSION) { showSummary(); return; }

  _answered   = false;
  _hand       = generateHand();
  _validTotals = getValidTotals(_hand);

  renderCards(_hand);
  updateProgress();

  const inp = document.getElementById('answer-input');
  inp.value = ''; inp.disabled = false;

  document.getElementById('feedback-bar').className = 'feedback-bar empty';
  document.getElementById('feedback-bar').textContent = '';
  document.getElementById('submit-btn').disabled = false;

  startTimer();
  setTimeout(function() { inp.focus(); }, 50);
}

function updateProgress() {
  document.getElementById('progress-text').textContent = 'Question ' + (_qIndex + 1) + ' / ' + QUESTIONS_PER_SESSION;
  document.getElementById('score-text').textContent    = 'Score : ' + _correct + ' / ' + _qIndex;
  const pct = (_qIndex / QUESTIONS_PER_SESSION) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
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
    fb.textContent = '✓ ' + val + ' point' + (val > 1 ? 's' : '') + ' — Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — La bonne réponse était ' + _validTotals.join(' ou ') + ' point' + (_validTotals[0] > 1 ? 's' : '');
  }

  try {
    if (_sessionId && _userId) {
      await SB.addTrainingResult(
        _sessionId, _userId, 'blackjack-score',
        { hand: _hand, valid_totals: _validTotals },
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
  document.getElementById('summary-score').textContent  = _correct + '/' + QUESTIONS_PER_SESSION;
  document.getElementById('summary-pct').textContent    = pct + '%';
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
  _sessionId = null; _qIndex = 0; _correct = 0; _answered = false;

  document.getElementById('summary-screen').style.display  = 'none';
  document.getElementById('training-screen').style.display = '';

  SB.startTrainingSession('blackjack-score').then(function(s) { _sessionId = s.id; }).catch(function() {});
  nextQuestion();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') submitAnswer();
});
