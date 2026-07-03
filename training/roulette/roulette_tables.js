// ══════════════════════════════════════════════════════
//  ROULETTE TABLES — module 6
//  Flashcard pur : les 20 multiplications d'une table de paiement
//  (35 / 17 / 11 / 8 / 5), mélangées, chronométrées — objectif : aller vite
// ══════════════════════════════════════════════════════

const TB_RATIOS   = [35, 17, 11, 8, 5];
const TB_DECK_SIZE = 20; // ×1 à ×20

let _tbSessionId = null;
let _tbUserId    = null;
let _tbRatio     = null;
let _tbDeck      = [];    // multiplicandes mélangés (1..20, chacun une fois)
let _tbIndex     = 0;
let _tbCorrect   = 0;
let _tbAnswered  = false;
let _tbStartTime = 0;
let _tbElapsedMs = 0;
let _tbWatchHandle = null;

// ── Init ─────────────────────────────────────────────
async function initTables() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _tbUserId = session.user.id;
  } catch(e) {}

  renderTableChoiceScreen();
}

// ── Étape 1 : choix de la table ───────────────────────
function renderTableChoiceScreen() {
  const grid = document.getElementById('tb-choice-grid');
  grid.innerHTML = TB_RATIOS.map(function(r) {
    return '<div class="chipval-card" onclick="selectTable(' + r + ')">'
      + '<div class="chipval-amount">× ' + r + '</div>'
      + '<div class="chipval-unit">table</div>'
      + '</div>';
  }).join('');
}

function shuffledDeck() {
  const deck = [];
  for (let i = 1; i <= TB_DECK_SIZE; i++) deck.push(i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}

// ── Étape 2 : session ──────────────────────────────────
async function selectTable(ratio) {
  _tbRatio   = ratio;
  _tbDeck    = shuffledDeck();
  _tbIndex   = 0;
  _tbCorrect = 0;
  _tbAnswered = false;

  document.getElementById('tb-choice-screen').style.display   = 'none';
  document.getElementById('tb-training-screen').style.display = '';
  document.getElementById('tb-table-badge').textContent = '× ' + ratio;

  try {
    const s = await SB.startTrainingSession('roulette-tables');
    _tbSessionId = s.id;
  } catch(e) {}

  _tbStartTime = Date.now();
  startStopwatch();
  nextCard();
}

// ── Chronomètre (compte le temps écoulé) ──────────────
function startStopwatch() {
  updateStopwatchDisplay();
  _tbWatchHandle = setInterval(updateStopwatchDisplay, 100);
}

function stopStopwatch() {
  clearInterval(_tbWatchHandle);
}

function updateStopwatchDisplay() {
  _tbElapsedMs = Date.now() - _tbStartTime;
  document.getElementById('tb-stopwatch').textContent = formatElapsed(_tbElapsedMs);
}

function formatElapsed(ms) {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths  = totalTenths % 10;
  return minutes + ':' + String(seconds).padStart(2, '0') + '.' + tenths;
}

// ── Carte ──────────────────────────────────────────────
function nextCard() {
  if (_tbIndex >= TB_DECK_SIZE) { finishTables(); return; }

  _tbAnswered = false;
  const mult = _tbDeck[_tbIndex];

  document.getElementById('tb-card').classList.remove('flipped', 'correct', 'wrong');
  document.getElementById('tb-question').textContent = _tbRatio + ' × ' + mult;

  const inp = document.getElementById('tb-answer-input');
  inp.value = ''; inp.disabled = false;
  document.getElementById('tb-submit-btn').disabled = false;

  updateTablesProgress();
  setTimeout(function() { inp.focus(); }, 260);
}

function updateTablesProgress() {
  document.getElementById('tb-progress').textContent = 'Carte ' + (_tbIndex + 1) + ' / ' + TB_DECK_SIZE;
  document.getElementById('tb-score').textContent    = 'Score : ' + _tbCorrect + ' / ' + _tbIndex;
  document.getElementById('tb-progress-fill').style.width = ((_tbIndex / TB_DECK_SIZE) * 100) + '%';
}

// ── Validation — retourne la carte pour révéler la réponse ──
async function submitTables() {
  if (_tbAnswered) return;
  const inp = document.getElementById('tb-answer-input');
  const val = parseInt(inp.value);
  if (isNaN(val)) { inp.focus(); return; }

  _tbAnswered = true;
  inp.disabled = true;
  document.getElementById('tb-submit-btn').disabled = true;

  const mult = _tbDeck[_tbIndex];
  const correctAnswer = _tbRatio * mult;
  const isCorrect = val === correctAnswer;
  if (isCorrect) _tbCorrect++;

  const card = document.getElementById('tb-card');
  card.classList.add('flipped', isCorrect ? 'correct' : 'wrong');
  document.getElementById('tb-back-answer').textContent = correctAnswer;
  document.getElementById('tb-back-detail').textContent = isCorrect
    ? '✓ Correct'
    : '✕ Ta réponse : ' + val;

  try {
    if (_tbSessionId && _tbUserId) {
      await SB.addTrainingResult(
        _tbSessionId, _tbUserId, 'roulette-tables',
        { ratio: _tbRatio, mult: mult },
        correctAnswer, val, isCorrect
      );
    }
  } catch(e) {}

  _tbIndex++;
  updateTablesProgress();

  setTimeout(function() {
    if (_tbIndex >= TB_DECK_SIZE) finishTables();
    else nextCard();
  }, isCorrect ? 1000 : 1700);
}

// ── Résumé ────────────────────────────────────────────
async function finishTables() {
  stopStopwatch();
  updateStopwatchDisplay();
  try { if (_tbSessionId) await SB.endTrainingSession(_tbSessionId, TB_DECK_SIZE, _tbCorrect); } catch(e) {}

  document.getElementById('tb-training-screen').style.display = 'none';
  document.getElementById('tb-summary-screen').style.display  = '';

  document.getElementById('tb-summary-time').textContent  = formatElapsed(_tbElapsedMs);
  document.getElementById('tb-summary-table').textContent = '× ' + _tbRatio;
  document.getElementById('tb-summary-score').textContent = _tbCorrect + '/' + TB_DECK_SIZE;
  document.getElementById('tb-summary-verdict').textContent = tablesVerdict(_tbCorrect);
}

function tablesVerdict(n) {
  if (n === TB_DECK_SIZE) return '🏆 Parfait !';
  if (n >= 17) return 'Excellent !';
  if (n >= 13) return 'Bien';
  if (n >= 9)  return 'À améliorer';
  return 'À reprendre';
}

function restartTables() {
  stopStopwatch();
  _tbSessionId = null; _tbIndex = 0; _tbCorrect = 0;
  _tbAnswered = false; _tbRatio = null;
  document.getElementById('tb-summary-screen').style.display = 'none';
  document.getElementById('tb-choice-screen').style.display  = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('tb-training-screen').style.display !== 'none') {
    submitTables();
  }
});
