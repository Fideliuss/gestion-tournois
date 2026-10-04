// ══════════════════════════════════════════════════════
//  UTH — QUI GAGNE ?
//  Le croupier désigne le gagnant entre le joueur et la banque (ou l'égalité). Pas de chronomètre.
//  La banque ne « joue » pas : c'est elle qui a une main, on ne dit jamais « le croupier gagne ».
//    Facile : combinaisons nettement différentes · Médium : même combinaison, départage au kicker
//    Expert : égalités (board), banque non qualifiée, départages — et il faut aussi dire si la banque est qualifiée
//  Dépend de uth_engine.js et uth_ui.js.
// ══════════════════════════════════════════════════════

const UG_QUESTIONS = 10;
const UG_LEVEL_LABELS = { facile: 'Facile', medium: 'Médium', expert: 'Expert' };
// Codes de résultat enregistrés en base : 1 = le joueur gagne, 0 = égalité, -1 = la banque gagne
const UG_WINNER_LABEL = { '1': 'Le joueur gagne', '0': 'Égalité', '-1': 'La banque gagne' };

let _ugSessionId = null;
let _ugUserId    = null;
let _ugLevel     = null;
let _ugQIndex    = 0;
let _ugCorrect   = 0;
let _ugAnswered  = false;
let _ugQuestion  = null;    // résultat de UTH.duelRound
let _ugWinner    = null;    // choix du gagnant (expert : en attente de validation)
let _ugQualified = null;    // choix « banque qualifiée ? » (expert uniquement)

// ── Init ─────────────────────────────────────────────
async function initUthGagnant() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _ugUserId = session.user.id;
  } catch (e) {}
}

// ── Niveau ───────────────────────────────────────────
async function startUthGagnant(level) {
  _ugLevel = level; _ugQIndex = 0; _ugCorrect = 0; _ugAnswered = false;
  document.getElementById('ug-level-screen').style.display    = 'none';
  document.getElementById('ug-training-screen').style.display = '';
  document.getElementById('ug-qualif-zone').style.display     = level === 'expert' ? '' : 'none';
  try {
    const s = await SB.startTrainingSession('uth-gagnant', { level: level });
    _ugSessionId = s.id;
  } catch (e) {}
  ugNext();
}

// ── Question ─────────────────────────────────────────
function ugNext() {
  if (_ugQIndex >= UG_QUESTIONS) { ugSummary(); return; }
  _ugAnswered = false; _ugWinner = null; _ugQualified = null;

  const q = UTH.duelRound(_ugLevel);
  _ugQuestion = q;

  // De haut en bas : le joueur (cartes en quinconce), le board (flop · turn · river), la banque (deux cartes côte à côte)
  document.getElementById('ug-table').innerHTML = uthPlayerZone(q.player) + uthBoardZone(q.board) + uthBankZone(q.dealer);
  document.getElementById('ug-result').innerHTML = '';

  document.querySelectorAll('#ug-winner-btns .uth-ans, #ug-qualif-btns .uth-ans').forEach(function (b) { b.disabled = false; b.className = 'uth-ans'; });
  const validate = document.getElementById('ug-validate-btn');
  validate.style.display = _ugLevel === 'expert' ? '' : 'none';
  validate.disabled = true;

  const fb = document.getElementById('ug-feedback');
  fb.className = 'feedback-bar empty'; fb.innerHTML = ''; fb.style.flexDirection = '';
  document.getElementById('ug-next-btn').style.display = 'none';
  document.getElementById('ug-question').textContent = 'Qui gagne ?';
  ugProgress();
}

function ugProgress() {
  document.getElementById('ug-progress').textContent = 'Question ' + (_ugQIndex + 1) + ' / ' + UG_QUESTIONS;
  document.getElementById('ug-score').textContent    = 'Score : ' + _ugCorrect + ' / ' + _ugQIndex;
  document.getElementById('ug-progress-fill').style.width = ((_ugQIndex / UG_QUESTIONS) * 100) + '%';
}

// ── Réponses ─────────────────────────────────────────
function ugPickWinner(code) {
  if (_ugAnswered) return;
  _ugWinner = code;
  if (_ugLevel !== 'expert') { ugSubmit(); return; }          // facile / médium : une seule réponse, validation immédiate
  markSelected('#ug-winner-btns', String(code));
  ugUpdateValidate();
}

function ugPickQualified(yes) {
  if (_ugAnswered) return;
  _ugQualified = yes;
  markSelected('#ug-qualif-btns', yes ? '1' : '0');
  ugUpdateValidate();
}

function markSelected(containerSel, value) {
  document.querySelectorAll(containerSel + ' .uth-ans').forEach(function (b) {
    b.classList.toggle('sel', b.dataset.v === value);
  });
}

function ugUpdateValidate() {
  document.getElementById('ug-validate-btn').disabled = !(_ugWinner !== null && _ugQualified !== null);
}

// ── Validation ───────────────────────────────────────
async function ugSubmit() {
  if (_ugAnswered || _ugWinner === null) return;
  if (_ugLevel === 'expert' && _ugQualified === null) return;
  _ugAnswered = true;

  const q = _ugQuestion;
  const winnerOk = _ugWinner === q.cmp;
  const qualOk = _ugLevel !== 'expert' || _ugQualified === q.qualified;
  const isCorrect = winnerOk && qualOk;
  if (isCorrect) _ugCorrect++;

  // Boutons : bonne réponse en vert, mauvaise réponse choisie en rouge
  document.querySelectorAll('#ug-winner-btns .uth-ans').forEach(function (b) {
    b.disabled = true; b.classList.remove('sel');
    if (b.dataset.v === String(q.cmp)) b.classList.add('ok');
    else if (b.dataset.v === String(_ugWinner)) b.classList.add('ko');
  });
  if (_ugLevel === 'expert') {
    document.querySelectorAll('#ug-qualif-btns .uth-ans').forEach(function (b) {
      b.disabled = true; b.classList.remove('sel');
      if (b.dataset.v === (q.qualified ? '1' : '0')) b.classList.add('ok');
      else if (b.dataset.v === (_ugQualified ? '1' : '0')) b.classList.add('ko');
    });
    document.getElementById('ug-validate-btn').style.display = 'none';
  }

  // Les deux meilleures mains de 5 cartes, côte à côte : on voit d'où vient chaque combinaison
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
  if (!q.qualified) {
    why += ' La banque n\'est pas qualifiée (' + UTH.describe(q.dEv) + ') : l\'Ante est rendu, le Play et le Blind suivent le résultat.';
  } else if (_ugLevel === 'expert') {
    why += ' La banque est qualifiée (' + UTH.describe(q.dEv) + ').';
  }
  const fb = document.getElementById('ug-feedback');
  fb.className = 'feedback-bar ' + (isCorrect ? 'correct' : 'wrong');
  fb.style.flexDirection = 'column';
  fb.innerHTML = '<div>' + (isCorrect ? '✓ <b>' + UG_WINNER_LABEL[q.cmp] + '</b> — Correct !' : '✕ Incorrect — <b>' + UG_WINNER_LABEL[q.cmp] + '</b>') + '</div>'
    + '<div class="uth-trap">' + why + '</div>';

  try {
    if (_ugSessionId && _ugUserId) {
      await SB.addTrainingResult(_ugSessionId, _ugUserId, 'uth-gagnant',
        { player: q.player, dealer: q.dealer, board: q.board, level: _ugLevel, kind: q.kind,
          winner: q.cmp, dealer_qualified: q.qualified, user_qualified: _ugLevel === 'expert' ? _ugQualified : null },
        q.cmp, _ugWinner, isCorrect);
    }
  } catch (e) {}

  _ugQIndex++;
  ugProgress();

  // Cas simple bien traité : on enchaîne. Sinon (erreur, départage, égalité, banque non qualifiée) : le temps de lire.
  if (isCorrect && _ugLevel !== 'expert' && q.kind === 'category') {
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
  document.getElementById('ug-summary-level').textContent   = UG_LEVEL_LABELS[_ugLevel];
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
  _ugSessionId = null; _ugQIndex = 0; _ugCorrect = 0; _ugAnswered = false; _ugLevel = null;
  document.getElementById('ug-summary-screen').style.display = 'none';
  document.getElementById('ug-level-screen').style.display   = '';
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const next = document.getElementById('ug-next-btn');
  if (next && next.style.display !== 'none') { ugNext(); return; }
  const validate = document.getElementById('ug-validate-btn');
  if (validate && validate.style.display !== 'none' && !validate.disabled) ugSubmit();
});
