// ══════════════════════════════════════════════════════
//  UTH — CALCUL DES GAINS
//  Pas de niveaux, pas de chronomètre. À chaque donne, le croupier voit les 3 mains (joueur, board, banque) et les mises
//  du joueur, puis répond MISE PAR MISE : « Je paie » (avec le montant du gain), « Je laisse » (la mise est rendue)
//  ou « Je ramasse » (la mise est perdue). Les situations sont tirées au hasard : banque qualifiée ou non, égalité,
//  joueur couché, Blind qui paie ou rendu, Trips et JP1 parfois absents, parfois gagnants.
//  Le jackpot (quinte flush royale JP1) est seulement indiqué : pas de question, pas de calcul.
//  Le règlement vient de UTH.settle (uth_engine.js), la correction de UTH.gradeGains. Dépend de uth_engine.js et uth_ui.js.
// ══════════════════════════════════════════════════════

const UC_QUESTIONS = 10;
const UC_BET_NAMES = { ante: 'Ante', blind: 'Blind', play: 'Play', trips: 'Trips', jp1: 'JP1' };
const UC_BET_ORDER = ['ante', 'blind', 'play', 'trips', 'jp1'];
const UC_ACTIONS = [['pay', 'Je paie'], ['push', 'Je laisse'], ['take', 'Je ramasse']];

let _ucSessionId = null;
let _ucUserId    = null;
let _ucQIndex    = 0;
let _ucCorrect   = 0;
let _ucAnswered  = false;
let _ucRound     = null;   // résultat de UTH.gainsRound (donne + règlement)
let _ucAnswers   = {};     // { ante: { action, amount }, … }
let _ucMaxBet    = UTH.DEFAULT_MAX_BET;
let _ucConfig    = null;   // training_config 'uth' (tables de paiement modifiables ; montant max des mises)

// ── Démarrage : la session commence dès l'ouverture de la page ──
async function initUthGains() {
  try {
    const session = await SB.getSession();
    if (!session) return;
    _ucUserId = session.user.id;
  } catch (e) {}
  try {
    const cfg = await SB.getTrainingConfig('uth');
    if (cfg) {
      _ucConfig = cfg;
      if (cfg.gains && cfg.gains.max_bet) _ucMaxBet = UTH.clampMaxBet(cfg.gains.max_bet);
    }
  } catch (e) {}      // pas de config enregistrée : règlement et montant maximum par défaut
  ucStartSession();
}

async function ucStartSession() {
  _ucQIndex = 0; _ucCorrect = 0; _ucAnswered = false;
  document.getElementById('uc-summary-screen').style.display  = 'none';
  document.getElementById('uc-training-screen').style.display = '';
  try {
    const s = await SB.startTrainingSession('uth-gains', { max_bet: _ucMaxBet });
    _ucSessionId = s.id;
  } catch (e) {}
  ucNext();
}

// ── Mises ────────────────────────────────────────────
function ucEuro(n) {
  return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €';
}

// « 40 € (4×, avant le flop) » pour le Play, simplement le montant pour les autres
function ucStakeText(l, round) {
  if (l.bet !== 'play') return ucEuro(l.stake);
  const mult = UTH.PLAY_MULTIPLIERS[round.street];
  return ucEuro(l.stake) + ' <span class="uc-stake-note">(' + UTH.PLAY_LABELS[round.street].replace(/ \(\d×\)$/, '') + ', ' + mult + '×)</span>';
}

function ucBetRow(l, round) {
  const buttons = UC_ACTIONS.map(function (a) {
    return '<button class="uth-ans" data-a="' + a[0] + '" onclick="ucChoose(\'' + l.bet + '\',\'' + a[0] + '\')">' + a[1] + '</button>';
  }).join('');
  return '<div class="uc-bet" id="uc-bet-' + l.bet + '">'
    + '<div class="uc-bet-head"><span class="uc-bet-name">' + UC_BET_NAMES[l.bet] + '</span><span class="uc-bet-stake">' + ucStakeText(l, round) + '</span></div>'
    + '<div class="uth-answers uth-answers-3 uc-bet-btns">' + buttons + '</div>'
    + '<div class="uc-amount" style="display:none"><label>Gain à payer (hors mise rendue) :</label>'
    + '<input type="text" inputmode="decimal" autocomplete="off" placeholder="0" oninput="ucAmount(\'' + l.bet + '\', this.value)" onkeydown="ucAmountKey(event)" /><span>€</span></div>'
    + '<div class="uc-bet-fb"></div>'
    + '</div>';
}

// ── Donne ────────────────────────────────────────────
function ucNext() {
  if (_ucQIndex >= UC_QUESTIONS) { ucSummary(); return; }
  _ucAnswered = false; _ucAnswers = {};

  _ucRound = UTH.gainsRound({ maxBet: _ucMaxBet, config: _ucConfig });
  const q = _ucRound;

  // De haut en bas : le joueur (cartes en quinconce), le board (flop · turn · river), la banque (deux cartes côte à côte)
  document.getElementById('uc-table').innerHTML = uthPlayerZone(q.player) + uthBoardZone(q.board) + uthBankZone(q.dealer);

  // Ce que fait le joueur, puis toutes les mises posées (JP1 compris, même s'il n'y a pas de question dessus en cas de jackpot)
  const folded = q.street === 'fold';
  const stakes = [];
  UC_BET_ORDER.forEach(function (bet) {
    if (bet === 'play') { if (!folded) stakes.push('Play ' + ucEuro(q.res.play)); return; }
    const amount = bet === 'ante' ? q.ante : bet === 'blind' ? q.blind : q[bet];
    if (amount) stakes.push(UC_BET_NAMES[bet] + ' ' + ucEuro(amount));
  });
  document.getElementById('uc-situation').innerHTML =
    '<div class="uc-action">' + (folded ? 'Le joueur <b>se couche</b>' : 'Le joueur <b>joue</b> ' + UTH.PLAY_LABELS[q.street]) + '</div>'
    + '<div class="uc-stakes">' + stakes.map(function (s) { return '<span class="uc-chip">' + s + '</span>'; }).join('') + '</div>';

  document.getElementById('uc-bets').innerHTML = UC_BET_ORDER.map(function (bet) {
    const l = q.res.lines.find(function (x) { return x.bet === bet && x.result !== 'jackpot'; });
    return l ? ucBetRow(l, q) : '';
  }).join('');

  const fb = document.getElementById('uc-feedback');
  fb.className = 'feedback-bar empty'; fb.innerHTML = ''; fb.style.flexDirection = '';
  const jp = document.getElementById('uc-jackpot'); jp.style.display = 'none'; jp.innerHTML = '';
  document.getElementById('uc-next-btn').style.display = 'none';
  const vb = document.getElementById('uc-validate-btn'); vb.style.display = ''; vb.disabled = true;
  ucProgress();
}

function ucProgress() {
  document.getElementById('uc-progress').textContent = 'Donne ' + (_ucQIndex + 1) + ' / ' + UC_QUESTIONS;
  document.getElementById('uc-score').textContent    = 'Score : ' + _ucCorrect + ' / ' + _ucQIndex;
  document.getElementById('uc-progress-fill').style.width = ((_ucQIndex / UC_QUESTIONS) * 100) + '%';
}

// ── Réponses ─────────────────────────────────────────
function ucChoose(bet, action) {
  if (_ucAnswered) return;
  const prev = _ucAnswers[bet];
  _ucAnswers[bet] = { action: action, amount: prev && action === 'pay' ? prev.amount : null };
  const row = document.getElementById('uc-bet-' + bet);
  row.querySelectorAll('.uth-ans').forEach(function (b) { b.classList.toggle('sel', b.dataset.a === action); });
  const box = row.querySelector('.uc-amount');
  box.style.display = action === 'pay' ? '' : 'none';
  if (action === 'pay') row.querySelector('input').focus();
  ucRefreshValidate();
}

// Accepte la virgule ou le point ; renvoie NaN si vide ou illisible
function ucParseAmount(text) {
  const t = String(text).trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(t) ? parseFloat(t) : NaN;
}

function ucAmount(bet, text) {
  if (_ucAnswered || !_ucAnswers[bet]) return;
  const amount = ucParseAmount(text);
  _ucAnswers[bet].amount = amount;
  // montant illisible (lettres, plus de 2 décimales…) : le champ le signale
  document.querySelector('#uc-bet-' + bet + ' input').classList.toggle('bad', text.trim() !== '' && !Number.isFinite(amount));
  ucRefreshValidate();
}

function ucReady() {
  const bets = _ucRound.res.lines.filter(function (l) { return l.result !== 'jackpot'; });
  return bets.every(function (l) {
    const a = _ucAnswers[l.bet];
    return a && (a.action !== 'pay' || (Number.isFinite(a.amount) && a.amount > 0));
  });
}

function ucRefreshValidate() { document.getElementById('uc-validate-btn').disabled = !ucReady(); }

function ucAmountKey(e) { if (e.key === 'Enter') { e.preventDefault(); ucValidate(); } }

// ── Validation et correction ─────────────────────────
function ucExpectedText(exp, stake) {
  if (exp.action === 'pay')  return 'Je paie ' + ucEuro(exp.amount);
  if (exp.action === 'push') return 'Je laisse la mise (' + ucEuro(stake) + ')';
  return 'Je ramasse ' + ucEuro(stake);
}

async function ucValidate() {
  if (_ucAnswered || !ucReady()) return;
  _ucAnswered = true;
  const q = _ucRound;
  const graded = UTH.gradeGains(q.res, _ucAnswers);
  if (graded.allOk) _ucCorrect++;

  graded.rows.forEach(function (r) {
    const row = document.getElementById('uc-bet-' + r.bet);
    row.classList.add(r.ok ? 'ok' : 'ko');
    row.querySelectorAll('.uth-ans').forEach(function (b) {
      b.disabled = true;
      b.classList.toggle('ok', b.dataset.a === r.expected.action);
      b.classList.toggle('ko', !r.ok && b.dataset.a === r.given.action);
    });
    row.querySelector('input').disabled = true;
    row.querySelector('.uc-bet-fb').innerHTML = r.ok
      ? '✓ ' + r.line.why
      : '✕ Il fallait : <b>' + ucExpectedText(r.expected, r.line.stake) + '</b>. ' + r.line.why;
  });
  document.getElementById('uc-validate-btn').style.display = 'none';

  // describe() et les textes du règlement ne viennent que de constantes : sans risque dans innerHTML
  const wrong = graded.rows.filter(function (r) { return !r.ok; }).length;
  const net = q.res.net;
  const netText = net > 0 ? 'Le joueur gagne <b>' + ucEuro(net) + '</b>' : net < 0 ? 'Le joueur perd <b>' + ucEuro(-net) + '</b>' : 'Le joueur ne gagne ni ne perd rien';
  const fb = document.getElementById('uc-feedback');
  fb.className = 'feedback-bar ' + (graded.allOk ? 'correct' : 'wrong');
  fb.style.flexDirection = 'column';
  fb.innerHTML = '<div>' + (graded.allOk ? '✓ Toutes les mises sont justes' : '✕ ' + wrong + (wrong > 1 ? ' mises à revoir' : ' mise à revoir')) + '</div>'
    + '<div class="uth-trap">Joueur : <b>' + UTH.describe(q.res.player) + '</b> — Banque : <b>' + UTH.describe(q.res.dealer) + '</b> ('
    + (q.res.dealerQualified ? 'qualifiée' : 'non qualifiée') + '). ' + netText + (q.res.jackpot ? ' (hors jackpot)' : '') + '.</div>';

  // Jackpot : seulement indiqué, sans question
  if (q.res.jackpot) {
    const jp = document.getElementById('uc-jackpot');
    jp.innerHTML = '<b>Jackpot JP1</b> — quinte flush royale du joueur : 100 % du jackpot. Pas de calcul ici : à faire valider par le superviseur (vidéo).';
    jp.style.display = '';
  }

  try {
    if (_ucSessionId && _ucUserId) {
      const expected = {};
      graded.rows.forEach(function (r) { expected[r.bet] = r.expected; });
      await SB.addTrainingResult(_ucSessionId, _ucUserId, 'uth-gains',
        { kind: q.kind, street: q.street, ante: q.ante, blind: q.blind, play: q.res.play, trips: q.trips, jp1: q.jp1,
          player: q.player, dealer: q.dealer, board: q.board, answers: _ucAnswers, expected: expected, jackpot: !!q.res.jackpot },
        graded.correctNet, graded.userNet, graded.allOk);
    }
  } catch (e) {}

  _ucQIndex++;
  ucProgress();
  const btn = document.getElementById('uc-next-btn');
  btn.textContent = _ucQIndex >= UC_QUESTIONS ? 'Voir le résultat →' : 'Suivant →';
  btn.style.display = '';
}

// ── Résumé ───────────────────────────────────────────
async function ucSummary() {
  try { if (_ucSessionId) await SB.endTrainingSession(_ucSessionId, UC_QUESTIONS, _ucCorrect); } catch (e) {}
  document.getElementById('uc-training-screen').style.display = 'none';
  document.getElementById('uc-summary-screen').style.display  = '';
  const pct = Math.round((_ucCorrect / UC_QUESTIONS) * 100);
  document.getElementById('uc-summary-score').textContent   = _ucCorrect + '/' + UC_QUESTIONS;
  document.getElementById('uc-summary-pct').textContent     = pct + '%';
  document.getElementById('uc-summary-verdict').textContent = ucVerdict(_ucCorrect);
}

function ucVerdict(n) {
  if (n === UC_QUESTIONS) return '🏆 Parfait !';
  if (n >= 9) return 'Excellent !';
  if (n >= 7) return 'Bien';
  if (n >= 5) return 'À améliorer';
  return 'À reprendre';
}

function ucRestart() {
  _ucSessionId = null;
  ucStartSession();
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' || (e.target && e.target.tagName === 'INPUT')) return;
  const next = document.getElementById('uc-next-btn');
  if (next && next.style.display !== 'none') ucNext();
});
