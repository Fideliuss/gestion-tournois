// ══════════════════════════════════════════════════════
//  UTH — MEILLEURE MAIN
//  Le croupier identifie la meilleure combinaison. Pas de chronomètre.
//    Facile : 5 cartes · Médium : 2 cartes du joueur + board de 5 · Expert : même chose avec des pièges
//  Dépend de uth_engine.js et uth_ui.js.
// ══════════════════════════════════════════════════════

const UM_QUESTIONS = 10;
const UM_LEVEL_LABELS = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
// Poids de tirage par combinaison (de la carte haute à la quinte flush royale) :
// les combinaisons rares apparaissent plus souvent qu'au hasard, pour qu'on les rencontre vraiment
const UM_WEIGHTS = [6, 12, 11, 11, 11, 11, 11, 8, 5, 3];

let _umSessionId = null;
let _umUserId    = null;
let _umLevel     = null;
let _umQIndex    = 0;
let _umCorrect   = 0;
let _umAnswered  = false;
let _umQuestion  = null;   // { cards, cat, best, trap }

// ── Init ─────────────────────────────────────────────
async function initUthMain() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _umUserId = session.user.id;
  } catch (e) {}
  buildAnswerGrid();
}

function buildAnswerGrid() {
  document.getElementById('um-answers').innerHTML = UTH.CAT_NAMES.map(function (name, cat) {
    return '<button class="uth-ans" data-cat="' + cat + '" onclick="umAnswer(' + cat + ')">' + name + '</button>';
  }).join('');
}

// ── Niveau ───────────────────────────────────────────
async function startUthMain(level) {
  _umLevel = level; _umQIndex = 0; _umCorrect = 0; _umAnswered = false;
  document.getElementById('um-level-screen').style.display    = 'none';
  document.getElementById('um-training-screen').style.display = '';
  try {
    const s = await SB.startTrainingSession('uth-main', { level: level });
    _umSessionId = s.id;
  } catch (e) {}
  umNext();
}

// ── Génération ───────────────────────────────────────
function umPickCategory() {
  const total = UM_WEIGHTS.reduce(function (a, b) { return a + b; }, 0);
  let r = Math.random() * total;
  for (let c = 0; c < UM_WEIGHTS.length; c++) { r -= UM_WEIGHTS[c]; if (r < 0) return c; }
  return 0;
}

function umGenerate(level) {
  if (level === 'facile') {
    const cat = umPickCategory();
    return { cards: UTH.shuffle(UTH.makeHand5(cat)), cat: cat, trap: null, trapId: null };
  }
  if (level === 'medium') {
    const cat = umPickCategory();
    return { cards: UTH.sevenWithBest(cat), cat: cat, trap: null, trapId: null };
  }
  const t = UTH.expertTrap();
  return { cards: t.cards, cat: t.expected, trap: t.text, trapId: t.id };
}

// ── Question ─────────────────────────────────────────
function umNext() {
  if (_umQIndex >= UM_QUESTIONS) { umSummary(); return; }
  _umAnswered = false;

  const q = umGenerate(_umLevel);
  q.best = UTH.bestHand(q.cards);
  _umQuestion = q;

  const table = document.getElementById('um-table');
  table.innerHTML = _umLevel === 'facile'
    ? uthLabeledRow('Votre main', q.cards)
    : uthLabeledRow('Vos cartes', q.cards.slice(0, 2)) + uthLabeledRow('Board', q.cards.slice(2));

  document.querySelectorAll('#um-answers .uth-ans').forEach(function (b) { b.disabled = false; b.className = 'uth-ans'; });
  const fb = document.getElementById('um-feedback');
  fb.className = 'feedback-bar empty'; fb.innerHTML = '';
  document.getElementById('um-next-btn').style.display = 'none';
  document.getElementById('um-question').textContent = _umLevel === 'facile'
    ? 'Quelle est cette combinaison ?'
    : 'Quelle est la meilleure combinaison de 5 cartes ?';
  umProgress();
}

function umProgress() {
  document.getElementById('um-progress').textContent = 'Question ' + (_umQIndex + 1) + ' / ' + UM_QUESTIONS;
  document.getElementById('um-score').textContent    = 'Score : ' + _umCorrect + ' / ' + _umQIndex;
  document.getElementById('um-progress-fill').style.width = ((_umQIndex / UM_QUESTIONS) * 100) + '%';
}

// ── Réponse ──────────────────────────────────────────
async function umAnswer(chosen) {
  if (_umAnswered) return;
  _umAnswered = true;
  const q = _umQuestion;
  const isCorrect = chosen === q.cat;
  if (isCorrect) _umCorrect++;

  document.querySelectorAll('#um-answers .uth-ans').forEach(function (b) {
    const c = Number(b.dataset.cat);
    b.disabled = true;
    if (c === q.cat) b.classList.add('ok');
    else if (c === chosen) b.classList.add('ko');
  });

  // Met en évidence les 5 cartes de la meilleure main (et atténue les autres quand il y en a 7)
  if (_umLevel !== 'facile') {
    document.getElementById('um-table').innerHTML =
      uthLabeledRow('Vos cartes', q.cards.slice(0, 2), q.best.cards) + uthLabeledRow('Board', q.cards.slice(2), q.best.cards);
  }

  // describe() ne produit que du texte issu de constantes : sans risque dans innerHTML
  const fb = document.getElementById('um-feedback');
  const name = UTH.describe(q.best);
  fb.className = 'feedback-bar ' + (isCorrect ? 'correct' : 'wrong');
  fb.innerHTML = '<div>' + (isCorrect ? '✓ <b>' + name + '</b> — Correct !' : '✕ Incorrect — c\'est <b>' + name + '</b>') + '</div>'
    + (q.trap ? '<div class="uth-trap">' + q.trap + '</div>' : '');
  if (q.trap || !isCorrect) fb.style.flexDirection = 'column';

  try {
    if (_umSessionId && _umUserId) {
      await SB.addTrainingResult(_umSessionId, _umUserId, 'uth-main',
        { cards: q.cards, level: _umLevel, best: q.best.key, trap: q.trapId },
        q.cat, chosen, isCorrect);
    }
  } catch (e) {}

  _umQIndex++;
  umProgress();

  if (isCorrect && !q.trap) {
    setTimeout(umNext, 1100);                 // bonne réponse simple : on enchaîne
  } else {
    const btn = document.getElementById('um-next-btn');   // erreur ou piège : le temps de lire l'explication
    btn.textContent = _umQIndex >= UM_QUESTIONS ? 'Voir le résultat →' : 'Suivant →';
    btn.style.display = '';
    btn.focus();
  }
}

// ── Résumé ───────────────────────────────────────────
async function umSummary() {
  try { if (_umSessionId) await SB.endTrainingSession(_umSessionId, UM_QUESTIONS, _umCorrect); } catch (e) {}
  document.getElementById('um-training-screen').style.display = 'none';
  document.getElementById('um-summary-screen').style.display  = '';
  const pct = Math.round((_umCorrect / UM_QUESTIONS) * 100);
  document.getElementById('um-summary-level').textContent   = UM_LEVEL_LABELS[_umLevel];
  document.getElementById('um-summary-score').textContent   = _umCorrect + '/' + UM_QUESTIONS;
  document.getElementById('um-summary-pct').textContent     = pct + '%';
  document.getElementById('um-summary-verdict').textContent = umVerdict(_umCorrect);
}

function umVerdict(n) {
  if (n === UM_QUESTIONS) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function umRestart() {
  _umSessionId = null; _umQIndex = 0; _umCorrect = 0; _umAnswered = false; _umLevel = null;
  document.getElementById('um-summary-screen').style.display = 'none';
  document.getElementById('um-level-screen').style.display   = '';
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const btn = document.getElementById('um-next-btn');
  if (btn && btn.style.display !== 'none') umNext();
});
