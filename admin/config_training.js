// ══════════════════════════════════════════════════════
//  CONFIG TRAINING (admin)
//  Réglages des modules d'entraînement, regroupés dans une seule page (un onglet par jeu). Chaque jeu enregistre
//  sa propre ligne de `training_config` ('blackjack', 'roulette', 'uth'). Onglet courant dans le hash de l'URL.
//  Absence de ligne / erreur de lecture : les champs gardent leurs valeurs par défaut.
// ══════════════════════════════════════════════════════

const CT_GAMES = ['blackjack', 'roulette', 'uth'];
const CT_LEVELS = ['facile', 'medium', 'expert'];
const CT_CHIPS = ['2', '2.5', '5', '10', '20', '50'];
let _ctUth = {};          // valeur 'uth' complète : on ne touche qu'à gains.max_bet (tables de paiement éventuelles préservées)

async function initConfigTraining() {
  window.addEventListener('hashchange', function () { ctShow(ctFromHash(), true); });
  ctShow(ctFromHash(), true);
  CT_GAMES.forEach(function (g) { ctLoad(g); });
}

function ctFromHash() {
  const h = location.hash.replace('#', '');
  return CT_GAMES.indexOf(h) >= 0 ? h : 'blackjack';
}

function ctShow(game, fromHash) {
  document.querySelectorAll('.ct-tab-btn').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === game)); });
  CT_GAMES.forEach(function (g) { document.getElementById('tab-' + g).hidden = g !== game; });
  if (!fromHash && location.hash !== '#' + game) history.replaceState(null, '', '#' + game);
}

const $ = function (id) { return document.getElementById(id); };
const intOf = function (id, fallback) { const n = parseInt($(id).value); return Number.isFinite(n) ? n : fallback; };

function ctMsg(game, text, kind) {
  const m = $('msg-' + game);
  m.textContent = text; m.className = 'ct-msg' + (kind ? ' ' + kind : '');
  if (kind === 'ok') setTimeout(function () { m.textContent = ''; m.className = 'ct-msg'; }, 2500);
}

// ── Lecture ──────────────────────────────────────────
async function ctLoad(game) {
  try {
    const cfg = await SB.getTrainingConfig(game);
    if (cfg) ({ blackjack: ctLoadBlackjack, roulette: ctLoadRoulette, uth: ctLoadUth })[game](cfg);
  } catch (e) {}
}

function ctLoadBlackjack(cfg) {
  ['min', 'max', 'step', 'weight'].forEach(function (k) {
    [1, 2].forEach(function (n) { const r = cfg.ranges && cfg.ranges[n - 1]; if (r) $('r' + n + '-' + k).value = r[k] || ''; });
  });
  CT_LEVELS.forEach(function (lvl) {
    if (cfg.levels && cfg.levels[lvl]) $('lvl-' + lvl).value = cfg.levels[lvl];
    const c = cfg.cards && cfg.cards[lvl];
    if (!c) return;
    if (c.min != null)       $('cards-' + lvl + '-min').value  = c.min;
    if (c.max != null)       $('cards-' + lvl + '-max').value  = c.max;
    if (c.stopTotal != null) $('cards-' + lvl + '-stop').value = c.stopTotal;
  });
}

function ctLoadRoulette(cfg) {
  [['couleur', 'col'], ['pointage', 'pt'], ['conversion', 'cv']].forEach(function (m) {
    const l = cfg[m[0]] && cfg[m[0]].levels;
    if (!l) return;
    CT_LEVELS.forEach(function (lvl) { if (l[lvl]) $(m[1] + '-' + lvl).value = l[lvl]; });
  });
  if (cfg.conversion && cfg.conversion.chip_values) {
    CT_CHIPS.forEach(function (v) { $('cv-val-' + v).checked = cfg.conversion.chip_values.indexOf(parseFloat(v)) >= 0; });
  }
}

function ctLoadUth(cfg) {
  _ctUth = cfg || {};
  if (_ctUth.gains && _ctUth.gains.max_bet) $('gains-max').value = _ctUth.gains.max_bet;
}

// ── Enregistrement ───────────────────────────────────
async function ctSave(game) {
  ctMsg(game, '');
  let value;
  try {
    value = ({ blackjack: ctReadBlackjack, roulette: ctReadRoulette, uth: ctReadUth })[game]();
  } catch (e) {            // erreur de saisie : message clair, rien n'est envoyé
    ctMsg(game, e.message, 'err'); return;
  }
  const btn = document.querySelector('#tab-' + game + ' .ct-save');
  btn.disabled = true;
  try {
    await SB.updateTrainingConfig(game, value);
    if (game === 'uth') _ctUth = value;
    ctMsg(game, 'Enregistré', 'ok');
  } catch (e) {
    ctMsg(game, 'Erreur : ' + (e.message || 'réessaie dans quelques instants'), 'err');
  }
  btn.disabled = false;
}

function ctReadBlackjack() {
  const row = function (n) {
    return ['min', 'max', 'step', 'weight'].reduce(function (o, k) { o[k] = intOf('r' + n + '-' + k, 0); return o; }, {});
  };
  const r1 = row(1), r2 = row(2);
  if (r1.min <= 0 || r1.max <= r1.min || r1.step <= 0 || r1.weight <= 0) throw new Error('Plage 1 invalide : le maximum doit dépasser le minimum, le pas et le poids doivent être positifs.');
  const ranges = [r1];
  if (r2.weight > 0) {
    if (r2.min <= 0 || r2.max <= r2.min || r2.step <= 0) throw new Error('Plage 2 invalide : le maximum doit dépasser le minimum, et le pas être positif.');
    ranges.push(r2);
  }
  const levels = {}, cards = {};
  const defaults = { facile: 15, medium: 10, expert: 5 };
  CT_LEVELS.forEach(function (lvl) {
    levels[lvl] = Math.max(3, intOf('lvl-' + lvl, defaults[lvl]));
    const min = Math.max(2, intOf('cards-' + lvl + '-min', 2)), max = Math.max(0, intOf('cards-' + lvl + '-max', 0));
    const stop = Math.min(21, Math.max(12, intOf('cards-' + lvl + '-stop', 17)));
    if (max > 0 && max < min) throw new Error('Cartes ' + lvl + ' : le maximum doit être au moins égal au minimum (ou 0 pour illimité).');
    cards[lvl] = { min: min, max: max, stopTotal: stop };
  });
  return { ranges: ranges, levels: levels, cards: cards };
}

function ctReadRoulette() {
  const lv = function (p) {
    return { levels: CT_LEVELS.reduce(function (o, lvl) { o[lvl] = Math.max(2, intOf(p + '-' + lvl, 2)); return o; }, {}) };
  };
  const chips = CT_CHIPS.filter(function (v) { return $('cv-val-' + v).checked; }).map(parseFloat);
  if (!chips.length) throw new Error('Sélectionne au moins une valeur de pièce.');
  const conv = lv('cv'); conv.chip_values = chips;
  return { couleur: lv('col'), pointage: lv('pt'), conversion: conv };
}

function ctReadUth() {
  const raw = intOf('gains-max', NaN);
  if (!(raw >= 5 && raw <= 200)) throw new Error('Le montant maximum doit être compris entre 5 et 200 €.');
  const max = Math.round(raw / 5) * 5;           // multiples de 5 €
  $('gains-max').value = max;
  return Object.assign({}, _ctUth, { gains: Object.assign({}, _ctUth.gains, { max_bet: max }) });
}
