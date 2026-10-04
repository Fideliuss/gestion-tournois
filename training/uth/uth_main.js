// ══════════════════════════════════════════════════════
//  UTH — MEILLEURE MAIN
//  Pas de niveaux : l'UTH est un jeu simple, il doit être maîtrisé en entier. Comme à la table, le croupier
//  voit toujours 7 cartes (les 2 du joueur + le board de 5, affichés comme dans « Qui gagne ? ») et identifie la meilleure combinaison de 5 cartes.
//  Les donnes sont tirées au hasard, de la carte haute à la quinte flush royale ; une donne sur trois environ
//  est un « piège » (quinte à la roue, deux brelans, trois paires, couleur et quinte…) expliqué après la réponse.
//  Pas de chronomètre. Dépend de uth_engine.js et uth_ui.js.
// ══════════════════════════════════════════════════════

const UM_QUESTIONS = 10;
// Poids de tirage par combinaison (de la carte haute à la quinte flush royale) :
// les combinaisons rares apparaissent plus souvent qu'au hasard, pour qu'on les rencontre vraiment
const UM_WEIGHTS = [6, 12, 11, 11, 11, 11, 11, 8, 5, 3];
const UM_TRAP_SHARE = 0.35;   // part des donnes « pièges » (UTH.expertTrap)

let _umSessionId = null;
let _umUserId    = null;
let _umQIndex    = 0;
let _umCorrect   = 0;
let _umAnswered  = false;
let _umQuestion  = null;   // { cards, cat, best, trap, trapId }

// ── Démarrage : la session commence dès l'ouverture de la page ──
async function initUthMain() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _umUserId = session.user.id;
  } catch (e) {}
  buildAnswerGrid();
  umStartSession();
}

function buildAnswerGrid() {
  document.getElementById('um-answers').innerHTML = UTH.CAT_NAMES.map(function (name, cat) {
    return '<button class="uth-ans" data-cat="' + cat + '" onclick="umAnswer(' + cat + ')">' + name + '</button>';
  }).join('');
}

async function umStartSession() {
  _umQIndex = 0; _umCorrect = 0; _umAnswered = false;
  document.getElementById('um-summary-screen').style.display  = 'none';
  document.getElementById('um-training-screen').style.display = '';
  try {
    const s = await SB.startTrainingSession('uth-main', {});
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

function umGenerate() {
  if (Math.random() < UM_TRAP_SHARE) {
    const t = UTH.expertTrap();
    if (t) return { cards: t.cards, cat: t.expected, trap: t.text, trapId: t.id };
  }
  const cat = umPickCategory();
  return { cards: UTH.sevenWithBest(cat), cat: cat, trap: null, trapId: null };
}

// ── Question ─────────────────────────────────────────
function umNext() {
  if (_umQIndex >= UM_QUESTIONS) { umSummary(); return; }
  _umAnswered = false;

  const q = umGenerate();
  q.best = UTH.bestHand(q.cards);
  _umQuestion = q;

  // Les 2 premières cartes sont celles du joueur, les 5 suivantes le board — même table que « Qui gagne ? »
  document.getElementById('um-table').innerHTML = uthPlayerZone(q.cards.slice(0, 2)) + uthBoardZone(q.cards.slice(2));

  document.querySelectorAll('#um-answers .uth-ans').forEach(function (b) { b.disabled = false; b.className = 'uth-ans'; });
  const fb = document.getElementById('um-feedback');
  fb.className = 'feedback-bar empty'; fb.innerHTML = ''; fb.style.flexDirection = '';
  document.getElementById('um-next-btn').style.display = 'none';
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

  // Met en évidence les 5 cartes de la meilleure main et atténue les deux autres
  document.getElementById('um-table').innerHTML =
    uthPlayerZone(q.cards.slice(0, 2), q.best.cards) + uthBoardZone(q.cards.slice(2), q.best.cards);

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
        { cards: q.cards, best: q.best.key, trap: q.trapId },
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
  _umSessionId = null;
  umStartSession();
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const btn = document.getElementById('um-next-btn');
  if (btn && btn.style.display !== 'none') umNext();
});
