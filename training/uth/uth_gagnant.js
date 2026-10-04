// ══════════════════════════════════════════════════════
//  UTH — QUI GAGNE ?
//  Pas de niveaux : l'UTH est un jeu simple, il doit être maîtrisé en entier. Les donnes sont tirées au hasard,
//  de tous types (cas nets, départages au kicker, banque non qualifiée, égalités). Pas de chronomètre.
//  Pour chaque donne, le croupier annonce d'abord si la banque est qualifiée, puis qui gagne.
//  La banque ne « joue » pas : c'est elle qui a une main, on ne dit jamais « le croupier gagne ».
//  Dépend de uth_engine.js et uth_ui.js.
// ══════════════════════════════════════════════════════

const UG_QUESTIONS = 10;
// Codes de résultat enregistrés en base : 1 = le joueur gagne, 0 = égalité, -1 = la banque gagne
const UG_WINNER_LABEL = { '1': 'Le joueur gagne', '0': 'Égalité', '-1': 'La banque gagne' };

let _ugSessionId = null;
let _ugUserId    = null;
let _ugQIndex    = 0;
let _ugCorrect   = 0;
let _ugAnswered  = false;
let _ugQuestion  = null;    // résultat de UTH.duelRound
let _ugQualified = null;    // 1re réponse : la banque est-elle qualifiée ? (true / false)

// ── Démarrage : la session commence dès l'ouverture de la page ──
async function initUthGagnant() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _ugUserId = session.user.id;
  } catch (e) {}
  ugStartSession();
}

async function ugStartSession() {
  _ugQIndex = 0; _ugCorrect = 0; _ugAnswered = false;
  document.getElementById('ug-summary-screen').style.display  = 'none';
  document.getElementById('ug-training-screen').style.display = '';
  try {
    const s = await SB.startTrainingSession('uth-gagnant', {});
    _ugSessionId = s.id;
  } catch (e) {}
  ugNext();
}

// ── Question ─────────────────────────────────────────
function ugNext() {
  if (_ugQIndex >= UG_QUESTIONS) { ugSummary(); return; }
  _ugAnswered = false; _ugQualified = null;

  const q = UTH.duelRound();
  _ugQuestion = q;

  // De haut en bas : le joueur (cartes en quinconce), le board (flop · turn · river), la banque (deux cartes côte à côte)
  document.getElementById('ug-table').innerHTML = uthPlayerZone(q.player) + uthBoardZone(q.board) + uthBankZone(q.dealer);
  document.getElementById('ug-result').innerHTML = '';

  // Étape 1 (qualification) visible ; étape 2 (gagnant) masquée jusqu'à la 1re réponse
  document.querySelectorAll('#ug-qualif-btns .uth-ans, #ug-winner-btns .uth-ans').forEach(function (b) { b.disabled = false; b.className = 'uth-ans'; });
  document.getElementById('ug-stage-winner').style.display = 'none';

  const fb = document.getElementById('ug-feedback');
  fb.className = 'feedback-bar empty'; fb.innerHTML = ''; fb.style.flexDirection = '';
  document.getElementById('ug-next-btn').style.display = 'none';
  ugProgress();
}

function ugProgress() {
  document.getElementById('ug-progress').textContent = 'Question ' + (_ugQIndex + 1) + ' / ' + UG_QUESTIONS;
  document.getElementById('ug-score').textContent    = 'Score : ' + _ugCorrect + ' / ' + _ugQIndex;
  document.getElementById('ug-progress-fill').style.width = ((_ugQIndex / UG_QUESTIONS) * 100) + '%';
}

// ── Étape 1 : la banque est-elle qualifiée ? ──────────
function ugPickQualified(yes) {
  if (_ugAnswered || _ugQualified !== null) return;
  _ugQualified = yes;
  document.querySelectorAll('#ug-qualif-btns .uth-ans').forEach(function (b) {
    b.disabled = true;
    if (b.dataset.v === (yes ? '1' : '0')) b.classList.add('sel');
  });
  document.getElementById('ug-stage-winner').style.display = '';    // étape 2
}

// ── Étape 2 : qui gagne ? — valide la donne ──────────
async function ugPickWinner(code) {
  if (_ugAnswered || _ugQualified === null) return;
  _ugAnswered = true;

  const q = _ugQuestion;
  const qualOk = _ugQualified === q.qualified;
  const winnerOk = code === q.cmp;
  const isCorrect = qualOk && winnerOk;
  if (isCorrect) _ugCorrect++;

  // Bonne réponse en vert, mauvaise réponse choisie en rouge, pour chacune des deux questions
  document.querySelectorAll('#ug-qualif-btns .uth-ans').forEach(function (b) {
    b.disabled = true; b.classList.remove('sel');
    if (b.dataset.v === (q.qualified ? '1' : '0')) b.classList.add('ok');
    else if (b.dataset.v === (_ugQualified ? '1' : '0')) b.classList.add('ko');
  });
  document.querySelectorAll('#ug-winner-btns .uth-ans').forEach(function (b) {
    b.disabled = true;
    if (b.dataset.v === String(q.cmp)) b.classList.add('ok');
    else if (b.dataset.v === String(code)) b.classList.add('ko');
  });

  // Les deux meilleures mains de 5 cartes : on voit d'où vient chaque combinaison
  document.getElementById('ug-result').innerHTML =
    '<div class="uth-duel">'
    + uthFrame('Joueur — ' + UTH.describe(q.pEv), uthCardsRow(q.pEv.cards))
    + uthFrame('Banque — ' + UTH.describe(q.dEv), uthCardsRow(q.dEv.cards))
    + '</div>';

  // Explication : textes issus du moteur (constantes et rangs), sans saisie utilisateur
  let why = UTH.explainCompare(q.pEv, q.dEv);
  if (q.cmp === 0 && UTH.playsBoard(q.pEv, q.board) && UTH.playsBoard(q.dEv, q.board)) {
    why = 'Égalité : les deux joueurs jouent le board (' + UTH.describe(q.pEv) + ').';
  }
  why += q.qualified
    ? ' La banque est qualifiée (' + UTH.describe(q.dEv) + ').'
    : ' La banque n\'est pas qualifiée (' + UTH.describe(q.dEv) + ') : l\'Ante est rendu, le Play et le Blind suivent le résultat.';

  const fb = document.getElementById('ug-feedback');
  fb.className = 'feedback-bar ' + (isCorrect ? 'correct' : 'wrong');
  fb.style.flexDirection = 'column';
  fb.innerHTML = '<div>' + (isCorrect ? '✓ Correct !' : '✕ Incorrect') + '</div>'
    + '<div><b>' + (q.qualified ? 'Banque qualifiée' : 'Banque non qualifiée') + '</b> · <b>' + UG_WINNER_LABEL[q.cmp] + '</b></div>'
    + '<div class="uth-trap">' + why + '</div>';

  try {
    if (_ugSessionId && _ugUserId) {
      await SB.addTrainingResult(_ugSessionId, _ugUserId, 'uth-gagnant',
        { player: q.player, dealer: q.dealer, board: q.board, kind: q.kind,
          winner: q.cmp, dealer_qualified: q.qualified, user_qualified: _ugQualified },
        q.cmp, code, isCorrect);
    }
  } catch (e) {}

  _ugQIndex++;
  ugProgress();

  // Cas net bien traité : on enchaîne. Sinon (erreur, départage, égalité, banque non qualifiée) : le temps de lire.
  if (isCorrect && q.kind === 'category') {
    setTimeout(ugNext, 1500);
  } else {
    const btn = document.getElementById('ug-next-btn');
    btn.textContent = _ugQIndex >= UG_QUESTIONS ? 'Voir le résultat →' : 'Suivant →';
    btn.style.display = '';
    btn.focus();
  }
}

// ── Résumé ───────────────────────────────────────────
async function ugSummary() {
  try { if (_ugSessionId) await SB.endTrainingSession(_ugSessionId, UG_QUESTIONS, _ugCorrect); } catch (e) {}
  document.getElementById('ug-training-screen').style.display = 'none';
  document.getElementById('ug-summary-screen').style.display  = '';
  const pct = Math.round((_ugCorrect / UG_QUESTIONS) * 100);
  document.getElementById('ug-summary-score').textContent   = _ugCorrect + '/' + UG_QUESTIONS;
  document.getElementById('ug-summary-pct').textContent     = pct + '%';
  document.getElementById('ug-summary-verdict').textContent = ugVerdict(_ugCorrect);
}

function ugVerdict(n) {
  if (n === UG_QUESTIONS) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function ugRestart() {
  _ugSessionId = null;
  ugStartSession();
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const next = document.getElementById('ug-next-btn');
  if (next && next.style.display !== 'none') ugNext();
});
