// ══════════════════════════════════════════════════════
//  BLACKJACK TRAINING — logique
// ══════════════════════════════════════════════════════

const SITUATIONS = [
  {
    id:         'blackjack',
    label:      'BLACKJACK',
    badgeClass: 'blackjack',
    ratio:      1.5,
    hint:       '3 pour 2',
    question:   'Combien payez-vous le blackjack ?',
  },
];

const QUESTIONS_PER_SESSION = 10;

let _config    = { ranges: [{ min: 10, max: 100, step: 10, weight: 80 }, { min: 200, max: 1000, step: 100, weight: 20 }] };
let _sessionId = null;
let _userId    = null;
let _current   = null;
let _qIndex    = 0;
let _correct   = 0;
let _answered  = false;

// ── Init ─────────────────────────────────────────────
async function initBlackjack() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _userId = session.user.id;

    const cfg = await SB.getTrainingConfig('blackjack');
    if (cfg) _config = cfg;
  } catch(e) {
    // Graceful degradation — use defaults
  }

  try {
    const s = await SB.startTrainingSession('blackjack');
    _sessionId = s.id;
  } catch(e) {}

  nextQuestion();
}

// ── Génération scénario ───────────────────────────────
function pickBet() {
  const ranges  = (_config.ranges && _config.ranges.length)
    ? _config.ranges
    : [{ min: 10, max: 100, step: 10, weight: 100 }];
  const total   = ranges.reduce(function(s, r) { return s + (r.weight || 1); }, 0);
  let   rand    = Math.random() * total;
  let   chosen  = ranges[ranges.length - 1];
  for (var i = 0; i < ranges.length; i++) {
    rand -= (ranges[i].weight || 1);
    if (rand <= 0) { chosen = ranges[i]; break; }
  }
  const steps = Math.floor((chosen.max - chosen.min) / chosen.step);
  return chosen.min + Math.floor(Math.random() * (steps + 1)) * chosen.step;
}

function generateScenario() {
  const bet = pickBet();

  const sit = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)];

  let displayBet, correctAnswer;
  if (sit.id === 'insurance') {
    displayBet    = bet / 2;
    correctAnswer = displayBet * sit.ratio;
  } else {
    displayBet    = bet;
    correctAnswer = bet * sit.ratio;
  }

  return { situation: sit, bet, displayBet, correctAnswer };
}

// ── Rendu question ────────────────────────────────────
function nextQuestion() {
  if (_qIndex >= QUESTIONS_PER_SESSION) {
    showSummary();
    return;
  }

  _answered = false;
  _current  = generateScenario();
  renderQuestion();
  updateProgress();

  const inp = document.getElementById('answer-input');
  inp.value = '';
  inp.disabled = false;
  inp.focus();

  document.getElementById('feedback-bar').className = 'feedback-bar empty';
  document.getElementById('feedback-bar').textContent = '';
  document.getElementById('submit-btn').disabled = false;
}

function renderQuestion() {
  const { situation, displayBet } = _current;

  document.getElementById('situation-badge').textContent  = situation.label;
  document.getElementById('situation-badge').className    = 'bj-situation-badge ' + situation.badgeClass;
  document.getElementById('ratio-hint').textContent       = situation.hint;
  document.getElementById('bet-amount').textContent       = formatAmount(displayBet);
  document.getElementById('answer-question').textContent  = situation.question;

  const label = situation.id === 'insurance' ? 'Mise assurance' : 'Mise';
  document.getElementById('bet-label').textContent = label;
}

function updateProgress() {
  document.getElementById('progress-text').textContent = 'Question ' + (_qIndex + 1) + ' / ' + QUESTIONS_PER_SESSION;
  document.getElementById('score-text').textContent    = 'Score : ' + _correct + ' / ' + _qIndex;
  const pct = (_qIndex / QUESTIONS_PER_SESSION) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
}

// ── Validation réponse ────────────────────────────────
async function submitAnswer() {
  if (_answered) return;

  const inp = document.getElementById('answer-input');
  const raw = inp.value.trim().replace(',', '.');
  const val = parseFloat(raw);

  if (raw === '' || isNaN(val)) {
    inp.focus();
    return;
  }

  _answered = true;
  inp.disabled = true;
  document.getElementById('submit-btn').disabled = true;

  const correct   = _current.correctAnswer;
  const isCorrect = val === correct;

  if (isCorrect) _correct++;

  const fb = document.getElementById('feedback-bar');
  if (isCorrect) {
    fb.className    = 'feedback-bar correct';
    fb.textContent  = '✓ ' + formatAmount(correct) + ' € — Correct !';
  } else {
    fb.className   = 'feedback-bar wrong';
    fb.textContent = '✕ Incorrect — La bonne réponse était ' + formatAmount(correct) + ' €';
  }

  try {
    if (_sessionId && _userId) {
      await SB.addTrainingResult(
        _sessionId, _userId, 'blackjack',
        { situation: _current.situation.id, bet: _current.bet, display_bet: _current.displayBet },
        correct, val, isCorrect
      );
    }
  } catch(e) {}

  _qIndex++;
  updateProgress();

  setTimeout(function() {
    if (_qIndex >= QUESTIONS_PER_SESSION) {
      showSummary();
    } else {
      nextQuestion();
    }
  }, isCorrect ? 900 : 1800);
}

// ── Résumé ────────────────────────────────────────────
async function showSummary() {
  try {
    if (_sessionId) await SB.endTrainingSession(_sessionId, QUESTIONS_PER_SESSION, _correct);
  } catch(e) {}

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
  _sessionId = null;
  _qIndex    = 0;
  _correct   = 0;
  _answered  = false;

  document.getElementById('summary-screen').style.display  = 'none';
  document.getElementById('training-screen').style.display = '';

  SB.startTrainingSession('blackjack').then(function(s) {
    _sessionId = s.id;
  }).catch(function() {});

  nextQuestion();
}

// ── Utils ─────────────────────────────────────────────
function formatAmount(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// ── Entrée clavier ────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') submitAnswer();
});
