// ══════════════════════════════════════════════════════
//  UTH — CALCUL DES GAINS
//  Pas de niveaux, pas de chronomètre. À chaque donne, le croupier voit un tapis : la banque, le board, les cases de
//  mises du joueur avec leurs jetons (de haut en bas : Bonus en losange et voyant du Prog, Blind = Ante, Play, puis les cartes du joueur).
//  (En France : « Bonus » = option Trips, « Prog » = jackpot progressif JP1.) Il répond MISE PAR MISE : un clic sur une mise ouvre, à côté des jetons, une fenêtre « Je paie » (avec le montant
//  du gain) / « Je laisse » (la mise est rendue) / « Je ramasse » (la mise est perdue). Les situations sont tirées au
//  hasard : banque qualifiée ou non, égalité, joueur couché, Blind qui paie ou rendu, Trips et JP1 parfois absents.
//  Le jackpot (quinte flush royale JP1) est seulement indiqué : pas de question, pas de calcul.
//  Le règlement vient de UTH.settle (uth_engine.js), la correction de UTH.gradeGains. Dépend de uth_engine.js et uth_ui.js.
// ══════════════════════════════════════════════════════

const UC_QUESTIONS = 10;
const UC_BET_NAMES = { ante: 'Ante', blind: 'Blind', play: 'Play', trips: 'Bonus', jp1: 'Prog' };
const UC_ACTIONS = [['pay', 'Je paie'], ['push', 'Je laisse'], ['take', 'Je ramasse']];
const UC_ACTION_TAG = { pay: 'Paie', push: 'Laisse', take: 'Ramasse' };
// Valeurs des jetons du tapis, de la plus grosse à la plus petite (le 2,50 € sert au Blind payé 3 pour 2)
const UC_CHIPS = [100, 50, 20, 10, 5, 2.5];

let _ucSessionId = null;
let _ucUserId    = null;
let _ucQIndex    = 0;
let _ucCorrect   = 0;
let _ucAnswered  = false;
let _ucRound     = null;   // résultat de UTH.gainsRound (donne + règlement)
let _ucAnswers   = {};     // { ante: { action, amount }, … }
let _ucGraded    = null;   // résultat de UTH.gradeGains après validation
let _ucOpenBet   = null;   // mise dont la fenêtre de réponse est ouverte
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

// ── Jetons ───────────────────────────────────────────
function ucEuro(n) {
  return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €';
}

// Décompose un montant en jetons (glouton) : [[valeur, nombre], …]
function ucChipBreakdown(amount) {
  let left = Math.round(amount * 100);
  const out = [];
  UC_CHIPS.forEach(function (v) {
    const n = Math.floor(left / Math.round(v * 100));
    if (n > 0) { out.push([v, n]); left -= n * Math.round(v * 100); }
  });
  return out;
}

function ucChipsHtml(amount) {
  return '<div class="uc-chips">' + ucChipBreakdown(amount).map(function (b) {
    const label = b[0] === 2.5 ? '2,5' : b[0];
    let stack = '';
    for (let i = 0; i < b[1]; i++) stack += '<span class="uc-chip v' + String(b[0]).replace('.', '_') + '">' + label + '</span>';
    return '<div class="uc-stack">' + stack + '</div>';
  }).join('') + '</div>';
}

// ── Tapis ────────────────────────────────────────────
// Montant posé sur chaque case (0 = case vide : Trips/JP1 absents, Play si le joueur se couche)
function ucAmountOf(bet, q) {
  if (bet === 'play') return q.street === 'fold' ? 0 : q.res.play;
  return bet === 'ante' ? q.ante : bet === 'blind' ? q.blind : q[bet];
}

// shape : 'round' (Play, Blind, Ante), 'diamond' (Bonus = Trips, carré posé sur la pointe), 'led' (Prog = JP1 : voyant rouge allumé si misé)
function ucSpotHtml(bet, shape, q) {
  const amount = ucAmountOf(bet, q);
  const jackpot = bet === 'jp1' && q.res.jackpot;
  const cls = 'uc-spot ' + shape + (amount ? '' : ' empty') + (jackpot ? ' jackpot' : '');
  const inner = amount ? (shape === 'led' ? '<span class="uc-led-dot"></span>' : ucChipsHtml(amount)) : (shape === 'led' ? '<span class="uc-led-dot"></span>' : '');
  return '<div class="uc-cell uc-c-' + bet + '">'
    + '<div class="uc-spot-label">' + UC_BET_NAMES[bet] + '</div>'
    + '<button class="' + cls + '" id="uc-spot-' + bet + '"' + (amount ? ' onclick="ucOpen(\'' + bet + '\')"' : ' disabled') + '>'
    + (shape === 'diamond' ? '<span class="uc-unrotate">' + inner + '</span>' : inner) + '</button>'
    + '<div class="uc-spot-amount">' + (amount ? ucEuro(amount) : '') + '</div>'
    + '<div class="uc-tag" id="uc-tag-' + bet + '">' + (jackpot ? 'Jackpot' : '') + '</div>'
    + '</div>';
}

function ucFeltHtml(q) {
  // De haut en bas : la banque, le board, Bonus (losange) et Prog (voyant), Blind = Ante, Play, puis les cartes du client.
  // Deux colonnes : Bonus, Blind et Play sont alignés sur la colonne de gauche ; Prog et Ante sur celle de droite.
  return uthBankZone(q.dealer) + uthBoardZone(q.board)
    + '<div class="uc-spots">'
    + ucSpotHtml('trips', 'diamond', q) + '<div></div>' + ucSpotHtml('jp1', 'led', q)
    + ucSpotHtml('blind', 'round mid', q) + '<div class="uc-eq" aria-label="égale">=</div>' + ucSpotHtml('ante', 'round mid', q)
    + ucSpotHtml('play', 'round mid', q) + '<div></div><div></div>'
    + '</div>'
    + uthPlayerZone(q.player)
    + '<div class="uc-pop-backdrop" id="uc-pop-backdrop" onclick="ucClose()" style="display:none"></div>'
    + '<div class="uc-pop" id="uc-pop" role="dialog" style="display:none"></div>';
}

// ── Donne ────────────────────────────────────────────
function ucNext() {
  if (_ucQIndex >= UC_QUESTIONS) { ucSummary(); return; }
  _ucAnswered = false; _ucAnswers = {}; _ucGraded = null; _ucOpenBet = null;

  _ucRound = UTH.gainsRound({ maxBet: _ucMaxBet, config: _ucConfig });
  const q = _ucRound;

  document.getElementById('uc-situation').innerHTML =
    q.street === 'fold' ? 'Le joueur <b>se couche</b>' : 'Le joueur <b>joue</b> ' + UTH.PLAY_LABELS[q.street];
  document.getElementById('uc-felt').innerHTML = ucFeltHtml(q);

  const fb = document.getElementById('uc-feedback');
  fb.className = 'feedback-bar empty'; fb.innerHTML = ''; fb.style.flexDirection = '';
  document.getElementById('uc-detail').innerHTML = '';
  const jp = document.getElementById('uc-jackpot');
  if (q.res.jackpot) {      // jackpot : seulement indiqué, sans question
    jp.innerHTML = '<b>Jackpot Prog</b> — quinte flush royale du joueur : 100 % du jackpot. Pas de calcul ici : à faire valider par le superviseur (vidéo).';
    jp.style.display = '';
  } else { jp.style.display = 'none'; jp.innerHTML = ''; }
  document.getElementById('uc-next-btn').style.display = 'none';
  const vb = document.getElementById('uc-validate-btn'); vb.style.display = ''; vb.disabled = true;
  ucRefresh();
  ucProgress();
}

function ucProgress() {
  document.getElementById('uc-progress').textContent = 'Donne ' + (_ucQIndex + 1) + ' / ' + UC_QUESTIONS;
  document.getElementById('uc-score').textContent    = 'Score : ' + _ucCorrect + ' / ' + _ucQIndex;
  document.getElementById('uc-progress-fill').style.width = ((_ucQIndex / UC_QUESTIONS) * 100) + '%';
}

// ── Réponses ─────────────────────────────────────────
// Mises à répondre : toutes sauf le jackpot
function ucBets() { return _ucRound.res.lines.filter(function (l) { return l.result !== 'jackpot'; }); }

function ucIsDone(a) { return !!a && (a.action !== 'pay' || (Number.isFinite(a.amount) && a.amount > 0)); }

function ucReady() { return ucBets().every(function (l) { return ucIsDone(_ucAnswers[l.bet]); }); }

function ucTagText(bet) {
  const a = _ucAnswers[bet];
  if (!a) return '';
  if (a.action === 'pay') return 'Paie ' + (Number.isFinite(a.amount) ? ucEuro(a.amount) : '?');
  return UC_ACTION_TAG[a.action];
}

// Met à jour pastilles, états des cases, compteur et bouton Valider
function ucRefresh() {
  const bets = ucBets();
  bets.forEach(function (l) {
    const spot = document.getElementById('uc-spot-' + l.bet), tag = document.getElementById('uc-tag-' + l.bet);
    const done = ucIsDone(_ucAnswers[l.bet]);
    const row = _ucGraded && _ucGraded.rows.find(function (r) { return r.bet === l.bet; });
    spot.classList.toggle('answered', done && !row);
    spot.classList.toggle('ok', !!row && row.ok);
    spot.classList.toggle('ko', !!row && !row.ok);
    tag.textContent = ucTagText(l.bet);
    tag.className = 'uc-tag' + (_ucAnswers[l.bet] && !done ? ' pending' : '') + (row ? (row.ok ? ' ok' : ' ko') : '');
  });
  const n = bets.filter(function (l) { return ucIsDone(_ucAnswers[l.bet]); }).length;
  document.getElementById('uc-hint').textContent = _ucAnswered ? '' : 'Cliquez sur chaque mise pour répondre — ' + n + ' / ' + bets.length;
  if (!_ucAnswered) document.getElementById('uc-validate-btn').disabled = !ucReady();
}

// ── Fenêtre de réponse, à côté des jetons ───────────
function ucExpectedText(exp, stake) {
  if (exp.action === 'pay')  return 'Je paie ' + ucEuro(exp.amount);
  if (exp.action === 'push') return 'Je laisse la mise (' + ucEuro(stake) + ')';
  return 'Je ramasse ' + ucEuro(stake);
}

function ucPopHtml(bet) {
  const q = _ucRound, amount = ucAmountOf(bet, q);
  const title = '<div class="uc-pop-title"><span>' + UC_BET_NAMES[bet] + '</span><span>' + ucEuro(amount) + '</span></div>';
  if (bet === 'jp1' && q.res.jackpot) {
    return title + '<div class="uc-pop-info"><b>Jackpot</b> — quinte flush royale du joueur : 100 % du jackpot. Pas de question ni de calcul : à faire valider par le superviseur.</div>';
  }
  if (_ucAnswered) {      // après validation : lecture seule, avec la correction
    const r = _ucGraded.rows.find(function (x) { return x.bet === bet; });
    return title + '<div class="uc-pop-res ' + (r.ok ? 'ok' : 'ko') + '">'
      + (r.ok ? '✓ ' + r.line.why : '✕ Il fallait : <b>' + ucExpectedText(r.expected, r.line.stake) + '</b>.<br>' + r.line.why) + '</div>';
  }
  const a = _ucAnswers[bet];
  const buttons = UC_ACTIONS.map(function (x) {
    return '<button class="uth-ans' + (a && a.action === x[0] ? ' sel' : '') + '" onclick="ucPick(\'' + bet + '\',\'' + x[0] + '\')">' + x[1] + '</button>';
  }).join('');
  const amountBox = a && a.action === 'pay'
    ? '<div class="uc-amount"><label for="uc-amount-input">Gain à payer (hors mise rendue)</label>'
      + '<div class="uc-amount-row"><input id="uc-amount-input" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="'
      + (Number.isFinite(a.amount) ? String(a.amount).replace('.', ',') : '') + '" oninput="ucAmount(\'' + bet + '\', this.value)" onkeydown="ucAmountKey(event,\'' + bet + '\')" /><span>€</span>'
      + '<button class="btn btn-gold" onclick="ucConfirm(\'' + bet + '\')">OK</button></div></div>'
    : '';
  return title + '<div class="uc-pop-btns">' + buttons + '</div>' + amountBox;
}

function ucOpen(bet) {
  _ucOpenBet = bet;
  document.querySelectorAll('.uc-spot.open').forEach(function (s) { s.classList.remove('open'); });
  document.getElementById('uc-spot-' + bet).classList.add('open');
  ucRenderPop();
  const input = document.getElementById('uc-amount-input');
  if (input) input.focus();
}

function ucRenderPop() {
  const pop = document.getElementById('uc-pop'), bet = _ucOpenBet;
  pop.innerHTML = ucPopHtml(bet);
  pop.style.display = 'block';
  document.getElementById('uc-pop-backdrop').style.display = 'block';
  ucPlacePop(document.getElementById('uc-spot-' + bet));
}

// À droite des jetons si la place suffit, sinon à gauche ; sur un écran trop étroit, juste sous la case (ou au-dessus
// s'il n'y a plus de place en bas), pour que les jetons restent visibles
function ucPlacePop(spot) {
  const felt = document.getElementById('uc-felt'), pop = document.getElementById('uc-pop');
  const f = felt.getBoundingClientRect(), s = spot.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 12;
  const clampY = function (y) { return Math.min(Math.max(y, 6), Math.max(6, f.height - ph - 6)); };
  let left = s.right - f.left + gap, top;
  if (left + pw > f.width - 6) left = s.left - f.left - pw - gap;
  if (left >= 6) {
    top = clampY(s.top - f.top + s.height / 2 - ph / 2);
  } else {
    left = Math.min(Math.max(s.left - f.left + s.width / 2 - pw / 2, 6), f.width - pw - 6);
    top = s.bottom - f.top + 40;                            // sous le montant et la pastille
    if (top + ph > f.height - 6) top = s.top - f.top - ph - 22;   // sinon au-dessus du nom de la mise
    top = clampY(top);
  }
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
}

function ucClose() {
  _ucOpenBet = null;
  document.getElementById('uc-pop').style.display = 'none';
  document.getElementById('uc-pop-backdrop').style.display = 'none';
  document.querySelectorAll('.uc-spot.open').forEach(function (s) { s.classList.remove('open'); });
}

function ucPick(bet, action) {
  if (_ucAnswered) return;
  const prev = _ucAnswers[bet];
  _ucAnswers[bet] = { action: action, amount: prev && action === 'pay' ? prev.amount : null };
  ucRefresh();
  if (action === 'pay') {           // le montant se saisit dans la fenêtre
    ucRenderPop();
    document.getElementById('uc-amount-input').focus();
  } else {
    ucClose();
  }
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
  document.getElementById('uc-amount-input').classList.toggle('bad', text.trim() !== '' && !Number.isFinite(amount));
  ucRefresh();
}

function ucConfirm(bet) { if (ucIsDone(_ucAnswers[bet])) ucClose(); }

function ucAmountKey(e, bet) { if (e.key === 'Enter') { e.preventDefault(); ucConfirm(bet); } }

// ── Validation et correction ─────────────────────────
async function ucValidate() {
  if (_ucAnswered || !ucReady()) return;
  ucClose();
  _ucAnswered = true;
  const q = _ucRound;
  const graded = UTH.gradeGains(q.res, _ucAnswers);
  _ucGraded = graded;
  if (graded.allOk) _ucCorrect++;
  ucRefresh();
  document.getElementById('uc-validate-btn').style.display = 'none';

  // Détail de chaque mise (les textes du règlement ne viennent que de constantes : sans risque dans innerHTML)
  document.getElementById('uc-detail').innerHTML = graded.rows.map(function (r) {
    return '<div class="uc-d ' + (r.ok ? 'ok' : 'ko') + '"><b>' + UC_BET_NAMES[r.bet] + ' ' + ucEuro(r.line.stake) + '</b> — '
      + (r.ok ? '✓ ' + r.line.why : '✕ Il fallait : <b>' + ucExpectedText(r.expected, r.line.stake) + '</b>. ' + r.line.why) + '</div>';
  }).join('');

  const wrong = graded.rows.filter(function (r) { return !r.ok; }).length;
  const net = q.res.net;
  const netText = net > 0 ? 'Le joueur gagne <b>' + ucEuro(net) + '</b>' : net < 0 ? 'Le joueur perd <b>' + ucEuro(-net) + '</b>' : 'Le joueur ne gagne ni ne perd rien';
  const fb = document.getElementById('uc-feedback');
  fb.className = 'feedback-bar ' + (graded.allOk ? 'correct' : 'wrong');
  fb.style.flexDirection = 'column';
  fb.innerHTML = '<div>' + (graded.allOk ? '✓ Toutes les mises sont justes' : '✕ ' + wrong + (wrong > 1 ? ' mises à revoir' : ' mise à revoir')) + '</div>'
    + '<div class="uth-trap">Joueur : <b>' + UTH.describe(q.res.player) + '</b> — Banque : <b>' + UTH.describe(q.res.dealer) + '</b> ('
    + (q.res.dealerQualified ? 'qualifiée' : 'non qualifiée') + '). ' + netText + (q.res.jackpot ? ' (hors jackpot)' : '') + '.</div>';

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
  if (e.key === 'Escape') { ucClose(); return; }
  if (e.key !== 'Enter' || (e.target && e.target.tagName === 'INPUT')) return;
  const next = document.getElementById('uc-next-btn');
  if (next && next.style.display !== 'none') ucNext();
});
window.addEventListener('resize', function () {
  if (_ucOpenBet) ucPlacePop(document.getElementById('uc-spot-' + _ucOpenBet));
});
