// Tests du moteur Ultimate Texas Hold'em — `node training/uth/uth_engine.test.js`
// Pas de dépendance : assert natif de Node. À relancer après toute modification de uth_engine.js ou des tables de paiement.

const assert = require('assert');
const UTH = require('./uth_engine.js');
const { CAT } = UTH;

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error('✗ ' + name + '\n  ' + e.message); process.exitCode = 1; }
}

// « AS KH 10D 3C » → cartes (lettres anglaises, S♠ H♥ D♦ C♣)
const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RK = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
function cards(str) {
  return str.trim().split(/\s+/).map(function (t) {
    const s = SUIT[t.slice(-1)], r = t.slice(0, -1);
    return { rank: RK[r] || Number(r), suit: s };
  });
}
const best = function (s) { return UTH.bestHand(cards(s)); };

// ══ 1. Combinaisons : cas connus ══════════════════════
test('catégories de base', function () {
  assert.strictEqual(best('AS KS QS JS TS').category, CAT.ROYAL_FLUSH);
  assert.strictEqual(best('9H 8H 7H 6H 5H').category, CAT.STRAIGHT_FLUSH);
  assert.strictEqual(best('9H 9S 9D 9C 2H').category, CAT.QUADS);
  assert.strictEqual(best('KH KS KD 4C 4H').category, CAT.FULL_HOUSE);
  assert.strictEqual(best('AH JH 8H 4H 2H').category, CAT.FLUSH);
  assert.strictEqual(best('9H 8S 7D 6C 5H').category, CAT.STRAIGHT);
  assert.strictEqual(best('7H 7S 7D KC 2H').category, CAT.TRIPS);
  assert.strictEqual(best('QH QS 5D 5C 2H').category, CAT.TWO_PAIR);
  assert.strictEqual(best('JH JS 8D 5C 2H').category, CAT.PAIR);
  assert.strictEqual(best('AH JS 8D 5C 2H').category, CAT.HIGH_CARD);
});

test('la roue A-2-3-4-5 est une quinte de hauteur 5, plus faible que 2-3-4-5-6', function () {
  const roue = best('AH 2S 3D 4C 5H'), six = best('2H 3S 4D 5C 6H');
  assert.strictEqual(roue.category, CAT.STRAIGHT);
  assert.deepStrictEqual(roue.tiebreak, [5]);
  assert.strictEqual(UTH.compare(six, roue), 1);
});

test('quinte flush à la roue ≠ quinte flush royale', function () {
  const sf = best('AH 2H 3H 4H 5H');
  assert.strictEqual(sf.category, CAT.STRAIGHT_FLUSH);
});

test('pas de quinte « qui tourne » : Q-K-A-2-3 n\'est pas une quinte', function () {
  assert.strictEqual(best('QH KS AD 2C 3H').category, CAT.HIGH_CARD);
});

test('départage : kickers, double paire, full', function () {
  assert.strictEqual(UTH.compare(best('AH AS KD 5C 2H'), best('AD AC QD 5H 2S')), 1);          // paire d'As, kicker R > D
  assert.strictEqual(UTH.compare(best('KH KS 4D 4C 2H'), best('KD KC 4H 4S 9S')), -1);         // même double paire, kicker 9 > 2
  assert.strictEqual(UTH.compare(best('KH KS KD 2C 2H'), best('QH QS QD AC AH')), 1);          // full aux Rois > full aux Dames
  assert.strictEqual(UTH.compare(best('KH KS KD 2C 2H'), best('KC KS KD 3C 3H')), -1);         // même brelan, paire 3 > 2
  assert.strictEqual(UTH.compare(best('AH KS QD JC 9H'), best('AD KC QH JS 9S')), 0);          // égalité parfaite (enseignes ignorées)
});

test('7 cartes : choisit la meilleure combinaison de 5', function () {
  assert.strictEqual(best('AH AS AD KC KH 2S 3D').category, CAT.FULL_HOUSE);
  assert.strictEqual(best('9H 9S 9D 5C 5H 5S 2D').category, CAT.FULL_HOUSE);                   // deux brelans → full 9 par 5
  assert.deepStrictEqual(best('9H 9S 9D 5C 5H 5S 2D').tiebreak, [9, 5]);
  assert.strictEqual(best('KH KS KD KC 2H 2S 2D').category, CAT.QUADS);                        // carré plutôt que full
  assert.strictEqual(best('AH KH QH JH 2H TS 9D').category, CAT.FLUSH);                        // couleur (aucune quinte possible avec ces rangs)
  assert.strictEqual(best('AH KH QH JH TH 2S 2D').category, CAT.ROYAL_FLUSH);
  assert.strictEqual(best('9H 8H 7H 6H 5S 4S 3S').category, CAT.STRAIGHT);                     // deux quintes possibles (9-5 et 7-3) : la plus haute
  assert.deepStrictEqual(best('9H 8H 7H 6H 5S 4S 3S').tiebreak, [9]);
  assert.strictEqual(best('2H 3H 4H 5H 9H AS KD').category, CAT.FLUSH);                        // couleur ≠ quinte flush quand il manque la roue
  assert.strictEqual(best('KH QH JH TH 9H 8H 2S').category, CAT.STRAIGHT_FLUSH);               // 6 cœurs : la quinte flush la plus haute
  assert.deepStrictEqual(best('KH QH JH TH 9H 8H 2S').tiebreak, [13]);
  assert.strictEqual(best('AH 2S 3D 4C 5H KH QH').category, CAT.STRAIGHT);                     // roue avec 7 cartes
  assert.strictEqual(best('AH AS 2D 2C 3H 3S 9D').category, CAT.TWO_PAIR);                     // 3 paires → les 2 plus hautes
  assert.deepStrictEqual(best('AH AS 2D 2C 3H 3S 9D').tiebreak, [14, 3, 9]);                   // kicker = 9 et non le 2 restant
});

test('descriptions françaises', function () {
  assert.strictEqual(UTH.describe(best('KH KS 4D 5C 2H')), 'Paire de Rois');
  assert.strictEqual(UTH.describe(best('QH QS JD JC 2H')), 'Double paire Dames et Valets');
  assert.strictEqual(UTH.describe(best('AH 2S 3D 4C 5H')), 'Quinte au 5');
  assert.strictEqual(UTH.describe(best('AH KS QD JC TH')), 'Quinte à l\'As');
  assert.strictEqual(UTH.describe(best('QH 9H 8H 4H 2H')), 'Couleur à la Dame');
  assert.strictEqual(UTH.describe(best('KH KS KD 7C 7H')), 'Full aux Rois par les 7');
  assert.strictEqual(UTH.describe(best('8H 8S 8D 8C 2H')), 'Carré de 8');
  // élision : « d'As », jamais « de As »
  assert.strictEqual(UTH.describe(best('AH AS 4D 5C 2H')), 'Paire d\'As');
  assert.strictEqual(UTH.describe(best('AH AS AD 5C 2H')), 'Brelan d\'As');
  assert.strictEqual(UTH.describe(best('AH AS AD AC 2H')), 'Carré d\'As');
  assert.strictEqual(UTH.describe(best('AH AS KD KC 2H')), 'Double paire As et Rois');
  assert.strictEqual(UTH.describe(best('AH AS AD KC KH')), 'Full aux As par les Rois');
  assert.strictEqual(UTH.describe(best('AS KS QS JS TS')), 'Quinte flush royale');
});

// ══ 2. Évaluateur : vérification croisée avec une implémentation indépendante ═══
// Autre méthode (score numérique, sans groupes triés) sur 200 000 mains de 7 cartes.
function referenceScore(seven) {
  let bestScore = -1;
  UTH.combinations(seven, 5).forEach(function (c) {
    const r = c.map(function (x) { return x.rank; }).sort(function (a, b) { return b - a; });
    const suits = new Set(c.map(function (x) { return x.suit; }));
    const cnt = {}; r.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
    const byCount = function (n) { return Object.keys(cnt).map(Number).filter(function (k) { return cnt[k] === n; }).sort(function (a, b) { return b - a; }); };
    const q = byCount(4), t = byCount(3), p = byCount(2), s = byCount(1);
    const uniq = Array.from(new Set(r));
    let sh = 0;
    if (uniq.length === 5) { if (r[0] - r[4] === 4) sh = r[0]; else if (r.join() === '14,5,4,3,2') sh = 5; }
    const flush = suits.size === 1;
    const pack = function (arr) { let v = 0; arr.forEach(function (x) { v = v * 15 + x; }); for (let i = arr.length; i < 5; i++) v *= 15; return v; };
    let cat, ranks;
    if (sh && flush) { cat = sh === 14 ? 9 : 8; ranks = [sh]; }
    else if (q.length) { cat = 7; ranks = q.concat(s); }
    else if (t.length && p.length) { cat = 6; ranks = t.concat(p); }
    else if (flush) { cat = 5; ranks = r; }
    else if (sh) { cat = 4; ranks = [sh]; }
    else if (t.length) { cat = 3; ranks = t.concat(s); }
    else if (p.length === 2) { cat = 2; ranks = p.concat(s); }
    else if (p.length === 1) { cat = 1; ranks = p.concat(s); }
    else { cat = 0; ranks = r; }
    bestScore = Math.max(bestScore, cat * Math.pow(15, 5) * 15 + pack(ranks));
  });
  return bestScore;
}

test('évaluateur = implémentation de référence sur 200 000 mains (catégorie ET départage)', function () {
  // Les scores de la référence sont comparés entre eux ; ceux du moteur via compare() : l'ordre doit être identique
  const hands = [];
  for (let i = 0; i < 200000; i++) hands.push(UTH.shuffle(UTH.newDeck()).slice(0, 7));
  let prev = null;
  hands.forEach(function (h) {
    const ev = UTH.bestHand(h), ref = referenceScore(h);
    if (prev) {
      const a = Math.sign(UTH.compare(ev, prev.ev)), b = Math.sign(ref - prev.ref);
      assert.strictEqual(a, b, 'ordre différent entre ' + JSON.stringify(h) + ' et ' + JSON.stringify(prev.h));
    }
    prev = { ev: ev, ref: ref, h: h };
  });
});

test('fréquences observées ≈ probabilités théoriques du poker à 7 cartes (300 000 mains)', function () {
  const N = 300000, freq = new Array(10).fill(0);
  for (let i = 0; i < N; i++) freq[UTH.bestHand(UTH.shuffle(UTH.newDeck()).slice(0, 7)).category]++;
  // Probabilités exactes (meilleure main de 5 parmi 7) — tolérance large pour le tirage aléatoire
  const expected = [0.17412, 0.43823, 0.23496, 0.04830, 0.04619, 0.03025, 0.02597, 0.00168, 0.000279, 0.0000323];
  [0, 1, 2, 3, 4, 5, 6].forEach(function (c) {
    const p = freq[c] / N, tol = Math.max(0.002, expected[c] * 0.08);
    assert.ok(Math.abs(p - expected[c]) < tol, 'catégorie ' + c + ' : observé ' + p.toFixed(5) + ', attendu ' + expected[c]);
  });
  assert.ok(freq[7] / N < 0.0035 && freq[7] / N > 0.0008, 'carré hors plage : ' + freq[7] / N);
});

// ══ 3. Générateurs de combinaisons ════════════════════
test('sevenWithBest produit exactement la combinaison demandée (toutes catégories, 300 tirages chacune)', function () {
  for (let cat = 0; cat <= 9; cat++) {
    for (let i = 0; i < 300; i++) {
      const seven = UTH.sevenWithBest(cat);
      assert.ok(seven, 'aucun tirage pour la catégorie ' + cat);
      assert.strictEqual(seven.length, 7);
      assert.strictEqual(new Set(seven.map(function (c) { return c.rank + c.suit; })).size, 7, 'cartes en double');
      assert.strictEqual(UTH.bestHand(seven).category, cat, 'catégorie ' + cat + ' non respectée');
    }
  }
});

test('makeHand5 produit exactement la combinaison demandée', function () {
  for (let cat = 0; cat <= 9; cat++) {
    for (let i = 0; i < 300; i++) assert.strictEqual(UTH.evaluate5(UTH.makeHand5(cat)).category, cat, 'catégorie ' + cat);
  }
});

test('pièges experts : combinaison attendue garantie, 7 cartes distinctes, explication fournie', function () {
  UTH.TRAPS.forEach(function (t) {
    for (let i = 0; i < 400; i++) {
      const r = UTH.expertTrap(Math.random, t.id);
      assert.ok(r && r.id === t.id, 'aucun tirage pour ' + t.id);
      assert.strictEqual(r.cards.length, 7);
      assert.strictEqual(new Set(r.cards.map(function (c) { return c.rank + c.suit; })).size, 7, t.id + ' : cartes en double');
      assert.strictEqual(UTH.bestHand(r.cards).category, t.expected, t.id + ' : mauvaise combinaison');
      assert.ok(r.text && r.text.length > 20);
    }
  });
});

test('pièges experts : la situation décrite est bien présente dans les cartes', function () {
  const countsOf = function (cs) { const m = {}; cs.forEach(function (c) { m[c.rank] = (m[c.rank] || 0) + 1; }); return Object.values(m); };
  const hasSubset = function (cs, cat) { return UTH.combinations(cs, 5).some(function (c) { return UTH.evaluate5(c).category === cat; }); };
  const checks = {
    roue:              function (cs) { return [14, 2, 3, 4, 5].every(function (r) { return cs.some(function (c) { return c.rank === r; }); }) && UTH.bestHand(cs).tiebreak[0] === 5; },   // et aucune quinte plus haute
    couleur_et_quinte: function (cs) { return hasSubset(cs, CAT.STRAIGHT) && hasSubset(cs, CAT.FLUSH); },
    deux_brelans:      function (cs) { return countsOf(cs).filter(function (n) { return n === 3; }).length === 2; },
    trois_paires:      function (cs) { return countsOf(cs).filter(function (n) { return n === 2; }).length === 3; },
    carre_brelan:      function (cs) { const c = countsOf(cs); return c.includes(4) && c.includes(3); },
    full_deux_paires:  function (cs) { const c = countsOf(cs); return c.includes(3) && c.filter(function (n) { return n === 2; }).length === 2; },
    quinte_et_paire:   function (cs) { return hasSubset(cs, CAT.STRAIGHT) && countsOf(cs).includes(2); },
    couleur_et_paire:  function (cs) { return hasSubset(cs, CAT.FLUSH) && countsOf(cs).includes(2); },
  };
  assert.deepStrictEqual(Object.keys(checks).sort(), UTH.TRAPS.map(function (t) { return t.id; }).sort(), 'un piège sans vérification');
  UTH.TRAPS.forEach(function (t) {
    for (let i = 0; i < 300; i++) assert.ok(checks[t.id](UTH.expertTrap(Math.random, t.id).cards), t.id + ' : situation absente');
  });
});

test('expertTrap sans filtre : tous les pièges sortent', function () {
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(UTH.expertTrap().id);
  assert.strictEqual(seen.size, UTH.TRAPS.length);
});

// ══ « Qui gagne ? » : explications et donnes par niveau ═════
const P = function (s) { return UTH.bestHand(cards(s)); };

test('explainCompare : combinaisons différentes', function () {
  assert.strictEqual(UTH.explainCompare(P('AH AS KD 5C 2H'), P('KH QS JD 9C 2S')), 'Le joueur gagne : Paire d\'As bat Carte haute Roi.');
  assert.strictEqual(UTH.explainCompare(P('3H 5S 7D 9C JH'), P('KH KS 4D 5C 2H')), 'La banque gagne : Paire de Rois bat Carte haute Valet.');
});

test('explainCompare : même combinaison, ce qui décide (paire, kicker, double paire, full, couleur, quinte)', function () {
  assert.strictEqual(UTH.explainCompare(P('AH AS KD 5C 2H'), P('AD AC QD 5H 2S')), 'Le joueur gagne : même combinaison (Paire), le kicker décide — Roi contre Dame.');
  assert.strictEqual(UTH.explainCompare(P('KH KS 4D 4C 2H'), P('QH QS JD JC 2S')), 'Le joueur gagne : même combinaison (Double paire), la plus haute paire décide — Roi contre Dame.');
  assert.strictEqual(UTH.explainCompare(P('QH QS 4D 4C 2H'), P('QD QC 4H 4S 9S')), 'La banque gagne : même combinaison (Double paire), le kicker décide — 9 contre 2.');
  assert.strictEqual(UTH.explainCompare(P('KH KS KD 2C 2H'), P('KC KS KD 3C 3H')), 'La banque gagne : même combinaison (Full), la paire décide — 3 contre 2.');
  assert.strictEqual(UTH.explainCompare(P('AH JH 8H 4H 2H'), P('AD JD 8D 5D 2D')), 'La banque gagne : même combinaison (Couleur), la 4e carte décide — 5 contre 4.');
  assert.strictEqual(UTH.explainCompare(P('9H 8S 7D 6C 5H'), P('AH 2S 3D 4C 5H')), 'Le joueur gagne : même combinaison (Quinte), la hauteur de la quinte décide — 9 contre 5.');
});

test('explainCompare : égalité', function () {
  assert.ok(/^Égalité/.test(UTH.explainCompare(P('AH KS QD JC 9H'), P('AD KC QH JS 9S'))));
});

test('playsBoard : détecte le joueur qui joue le board', function () {
  const board = cards('5C 6D 7H 8S 9D');
  assert.strictEqual(UTH.playsBoard(UTH.bestHand(cards('2H 3S').concat(board)), board), true);
  assert.strictEqual(UTH.playsBoard(UTH.bestHand(cards('TH 3S').concat(board)), board), false);   // la quinte à 10 utilise le 10
});

test('duelRound facile : vainqueur net, croupier qualifié, combinaisons éloignées (500 tirages)', function () {
  for (let i = 0; i < 500; i++) {
    const d = UTH.duelRound('facile');
    assert.ok(d.cmp !== 0 && d.qualified && Math.abs(d.pEv.category - d.dEv.category) >= 2 && d.kind === 'category');
    assert.strictEqual(new Set(d.player.concat(d.dealer, d.board).map(function (c) { return c.rank + c.suit; })).size, 9, 'cartes en double');
  }
});

test('duelRound médium : même combinaison (paire ou mieux), jamais d\'égalité (500 tirages)', function () {
  for (let i = 0; i < 500; i++) {
    const d = UTH.duelRound('medium');
    assert.ok(d.pEv.category === d.dEv.category && d.pEv.category >= CAT.PAIR && d.cmp !== 0 && d.kind === 'kicker' && d.qualified);
  }
});

test('duelRound expert : égalités, croupiers non qualifiés, départages et cas nets, tous cohérents (2 000 tirages)', function () {
  const seen = { tie: 0, unqualified: 0, kicker: 0, category: 0 };
  for (let i = 0; i < 2000; i++) {
    const d = UTH.duelRound('expert');
    seen[d.kind]++;
    assert.strictEqual(d.cmp, UTH.compare(UTH.bestHand(d.player.concat(d.board)), UTH.bestHand(d.dealer.concat(d.board))));
    assert.strictEqual(d.qualified, UTH.bestHand(d.dealer.concat(d.board)).category >= CAT.PAIR);
    if (d.kind === 'tie') assert.strictEqual(d.cmp, 0);
    if (d.kind === 'unqualified') assert.ok(d.cmp !== 0 && !d.qualified);
    if (d.kind === 'kicker') assert.ok(d.cmp !== 0 && d.pEv.category === d.dEv.category);
    if (d.kind === 'category') assert.ok(d.cmp !== 0 && d.qualified && d.pEv.category !== d.dEv.category);
  }
  Object.keys(seen).forEach(function (k) { assert.ok(seen[k] > 100, 'type « ' + k + ' » trop rare : ' + seen[k]); });
});

// ══ 4. Règlement d'une donne (réglementation) ═════════
function round(over) {
  return Object.assign({ ante: 10, blind: 10, trips: 0, jp1: 0, street: 'river' }, over);
}
const lineOf = function (res, bet) { return res.lines.find(function (l) { return l.bet === bet; }); };

// Board neutre : aucune combinaison ne se forme avec lui seul
const BOARD_NEUTRE = cards('2C 7D 9H JS 4D');

test('joueur gagne, croupier qualifié (paire de 7) : Ante +10, Play +40, Blind rendu', function () {
  const res = UTH.settle(round({ street: 'pre4', player: cards('AH AS'), dealer: cards('7H 3S'), board: BOARD_NEUTRE }));
  assert.strictEqual(res.dealerQualified, true);
  assert.deepStrictEqual([lineOf(res, 'ante').net, lineOf(res, 'play').net, lineOf(res, 'blind').net], [10, 40, 0]);
  assert.strictEqual(lineOf(res, 'blind').result, 'push');
  assert.strictEqual(res.net, 50);
});

test('croupier non qualifié : Ante rendu ; Play et Blind jouent', function () {
  const res = UTH.settle(round({ street: 'flop', player: cards('AH AS'), dealer: cards('KH 3S'), board: BOARD_NEUTRE }));
  assert.strictEqual(res.dealerQualified, false);
  assert.strictEqual(lineOf(res, 'ante').result, 'push');
  assert.strictEqual(lineOf(res, 'play').net, 20);             // Play 2× l'Ante, payé 1 pour 1
  assert.strictEqual(lineOf(res, 'blind').net, 0);             // moins qu'une quinte : rendu
  assert.strictEqual(res.net, 20);
});

test('croupier non qualifié ET gagnant : Ante rendu, Play et Blind perdus', function () {
  const res = UTH.settle(round({ street: 'river', player: cards('3H 5S'), dealer: cards('AH KS'), board: BOARD_NEUTRE }));
  assert.strictEqual(res.dealerQualified, false);
  assert.ok(res.cmp < 0);
  assert.deepStrictEqual([lineOf(res, 'ante').net, lineOf(res, 'play').net, lineOf(res, 'blind').net], [0, -10, -10]);
});

test('le croupier gagne, qualifié : Ante, Play et Blind perdus', function () {
  const res = UTH.settle(round({ street: 'pre3', player: cards('3H 5S'), dealer: cards('9S 9D'), board: BOARD_NEUTRE }));
  assert.deepStrictEqual([lineOf(res, 'ante').net, lineOf(res, 'play').net, lineOf(res, 'blind').net], [-10, -30, -10]);
  assert.strictEqual(res.net, -50);
});

test('égalité : toutes les mises sont rendues', function () {
  // le board fait la quinte 5-9 pour les deux joueurs
  const res = UTH.settle(round({ street: 'river', player: cards('2H 3S'), dealer: cards('2D 3C'), board: cards('5C 6D 7H 8S 9D') }));
  assert.strictEqual(res.cmp, 0);
  assert.deepStrictEqual(res.lines.map(function (l) { return l.net; }), [0, 0, 0]);
  assert.strictEqual(res.net, 0);
});

test('Blind : paiement selon la table (quinte, couleur 3 pour 2, full, carré, quinte flush, royale)', function () {
  const croupier = cards('2H 3S');   // le croupier reste faible/non qualifié : peu importe, seul le Blind est contrôlé
  const cas = [
    ['5H 6S', '7C 8D 9H KS AC', 10],           // quinte 5-9 : 1 pour 1
    ['AH 4H', '7H 9H KH 2C 3D', 15],           // couleur : 3 pour 2
    ['KH KS', 'KD 4C 4H 9D 2S', 30],           // full : 3 pour 1
    ['9H 9S', '9D 9C 4H KD 2S', 100],          // carré : 10 pour 1
    ['9H 8H', '7H 6H 5H KD 2S', 500],          // quinte flush : 50 pour 1
    ['AH KH', 'QH JH TH 2C 3D', 5000],         // royale : 500 pour 1
  ];
  cas.forEach(function (c) {
    const res = UTH.settle(round({ street: 'river', player: cards(c[0]), dealer: croupier, board: cards(c[1]) }));
    assert.ok(res.cmp > 0, 'le joueur doit gagner : ' + c[0]);
    assert.strictEqual(lineOf(res, 'blind').net, c[2], 'Blind ' + c[0] + ' ' + c[1]);
  });
});

test('Blind avec une mise de 5 € : couleur = 7,50 €', function () {
  const res = UTH.settle(round({ ante: 5, blind: 5, street: 'river', player: cards('AH 4H'), dealer: cards('2H 3S'), board: cards('7H 9H KH 2C 3D') }));
  assert.strictEqual(lineOf(res, 'blind').net, 7.5);
});

test('le joueur se couche : perd Ante et Blind, pas de Play', function () {
  const res = UTH.settle(round({ street: 'fold', player: cards('3H 5S'), dealer: cards('KH KS'), board: BOARD_NEUTRE }));
  assert.strictEqual(res.play, 0);
  assert.strictEqual(res.lines.length, 2);
  assert.strictEqual(res.net, -20);
});

test('Trips : payé selon la main du joueur, indépendamment du croupier ; perdu sous le brelan', function () {
  const table = [['7H 7S', '7D 2C 9H JS 4D', 3], ['9H 8S', '7D 6C 5H KS 2D', 4], ['AH 4H', '7H 9H KH 2C 3D', 7],
                 ['KH KS', 'KD 4C 4H 9D 2S', 8], ['9H 9S', '9D 9C 4H KD 2S', 30], ['9H 8H', '7H 6H 5H KD 2S', 40], ['AH KH', 'QH JH TH 2C 3D', 50]];
  table.forEach(function (c) {
    // croupier gagnant : le Trips est payé quand même
    const res = UTH.settle(round({ trips: 5, street: 'river', player: cards(c[0]), dealer: cards('AS AC'), board: cards(c[1]) }));
    const want = c[2] * 5;
    assert.strictEqual(lineOf(res, 'trips').net, want, 'Trips ' + c[0]);
  });
  const perd = UTH.settle(round({ trips: 5, street: 'river', player: cards('AH KS'), dealer: cards('2H 3S'), board: BOARD_NEUTRE }));
  assert.strictEqual(lineOf(perd, 'trips').net, -5);
  const couche = UTH.settle(round({ trips: 5, street: 'fold', player: cards('7H 7S'), dealer: cards('AS AC'), board: cards('7D 2C 9H JS 4D') }));
  assert.strictEqual(lineOf(couche, 'trips').net, 15);   // couché mais brelan : Trips payé
});

test('JP1 : full 10, carré 100, quinte flush 300, royale communautaire 1000', function () {
  const cas = [
    ['KH KS', 'KD 4C 4H 9D 2S', 'full_house', 10],
    ['9H 9S', '9D 9C 4H KD 2S', 'quads', 100],
    ['9H 8H', '7H 6H 5H KD 2S', 'straight_flush', 300],
    ['2D 3C', 'AH KH QH JH TH', 'community_royal', 1000],
  ];
  cas.forEach(function (c) {
    const j = UTH.evaluateJp1(cards(c[0]), cards(c[1]));
    assert.strictEqual(j.type, c[2]);
    assert.strictEqual(j.rate, c[3]);
    const res = UTH.settle(round({ jp1: 2, street: 'river', player: cards(c[0]), dealer: cards('2H 3S'), board: cards(c[1]) }));
    assert.strictEqual(lineOf(res, 'jp1').net, 2 * c[3]);
  });
});

test('JP1 : quinte flush royale du joueur = jackpot (superviseur), pas de gain calculé', function () {
  const res = UTH.settle(round({ jp1: 2, street: 'river', player: cards('AH KH'), dealer: cards('2D 3C'), board: cards('QH JH TH 2S 4D') }));
  assert.strictEqual(res.jackpot.type, 'royal_flush');
  assert.strictEqual(lineOf(res, 'jp1').result, 'jackpot');
  assert.strictEqual(lineOf(res, 'jp1').net, 0);
});

test('JP1 : sous le full, mise perdue ; consolation si un autre joueur a la royale', function () {
  const perd = UTH.settle(round({ jp1: 2, street: 'river', player: cards('AH KS'), dealer: cards('2D 3C'), board: BOARD_NEUTRE }));
  assert.strictEqual(lineOf(perd, 'jp1').net, -2);
  const conso = UTH.settle(round({ jp1: 2, jp1Consolation: true, street: 'river', player: cards('AH KS'), dealer: cards('2D 3C'), board: BOARD_NEUTRE }));
  assert.strictEqual(lineOf(conso, 'jp1').net, 200);
});

test('tables de paiement modifiables par la config (mergeConfig)', function () {
  const cfg = { blind: { flush: 2 } };
  const res = UTH.settle(round({ street: 'river', player: cards('AH 4H'), dealer: cards('2H 3S'), board: cards('7H 9H KH 2C 3D') }), cfg);
  assert.strictEqual(lineOf(res, 'blind').net, 20);
  assert.strictEqual(UTH.mergeConfig({}).blind.royal_flush, 500);   // valeurs absentes = réglementation
});

test('street invalide : erreur explicite', function () {
  assert.throws(function () { UTH.settle(round({ street: 'turn', player: cards('AH AS'), dealer: cards('2H 3S'), board: BOARD_NEUTRE })); }, /street invalide/);
});

test('formatRate', function () {
  assert.strictEqual(UTH.formatRate(500), '500 pour 1');
  assert.strictEqual(UTH.formatRate(1.5), '3 pour 2');
});

// ══ 5. Donnes aléatoires : cohérence du règlement ═════
test('20 000 donnes aléatoires : aucune erreur, net total = somme des lignes, jamais NaN', function () {
  const streets = Object.keys(UTH.PLAY_MULTIPLIERS);
  for (let i = 0; i < 20000; i++) {
    const r = UTH.dealRound();
    const res = UTH.settle({ ante: 5, blind: 5, trips: i % 2 ? 5 : 0, jp1: i % 3 ? 2 : 0, street: streets[i % streets.length], player: r.player, dealer: r.dealer, board: r.board });
    assert.ok(Number.isFinite(res.net));
    assert.strictEqual(res.net, Math.round(res.lines.reduce(function (a, l) { return a + l.net; }, 0) * 100) / 100);
    res.lines.forEach(function (l) { assert.ok(['win', 'lose', 'push', 'jackpot'].includes(l.result)); });
  }
});

console.log(process.exitCode ? '\nÉCHEC' : '\n' + passed + ' tests réussis');
