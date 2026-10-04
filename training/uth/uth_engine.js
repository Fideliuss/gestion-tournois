// ══════════════════════════════════════════════════════
//  ULTIMATE TEXAS HOLD'EM — moteur de cartes et de paiements
//  Fonctions pures : aucun accès au DOM ni à Supabase. Testable avec `node uth_engine.test.js`.
//  Règles : réglementation des jeux (Ultimate Texas Hold'em, option Trips, jackpot progressif JP1)
//  — barème « X pour 1 » lu comme X fois la mise en gain (mise rendue en plus), comme à la roulette.
// ══════════════════════════════════════════════════════

const UTH = (function () {

  // ── Cartes ─────────────────────────────────────────
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RED   = ['♥', '♦'];
  const RANK_LABELS = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

  // Carte = { rank: 2..14 (14 = As), suit: '♠' | '♥' | '♦' | '♣' }
  function newDeck() {
    const deck = [];
    SUITS.forEach(function (suit) { for (let rank = 2; rank <= 14; rank++) deck.push({ rank: rank, suit: suit }); });
    return deck;
  }

  function shuffle(deck, rng) {
    rng = rng || Math.random;
    const d = deck.slice();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  // ── Combinaisons ───────────────────────────────────
  const CAT = {
    HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4,
    FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8, ROYAL_FLUSH: 9,
  };
  // Clés utilisées dans les tables de paiement (config)
  const CAT_KEYS  = ['high_card', 'pair', 'two_pair', 'trips', 'straight', 'flush', 'full_house', 'quads', 'straight_flush', 'royal_flush'];
  const CAT_NAMES = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush', 'Quinte flush royale'];

  function evaluate5(cards) {
    const ranks = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return b - a; });
    const flush = cards.every(function (c) { return c.suit === cards[0].suit; });

    // Quinte (l'As compte haut ou bas : A-2-3-4-5 = « roue », de hauteur 5)
    let straightHigh = 0;
    if (new Set(ranks).size === 5) {
      if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
      else if (ranks[0] === 14 && ranks[1] === 5 && ranks[4] === 2) straightHigh = 5;
    }

    // Groupes de rangs égaux, triés par effectif décroissant puis rang décroissant :
    // l'ordre obtenu est exactement l'ordre de départage (paire, puis kickers…)
    const counts = {};
    ranks.forEach(function (r) { counts[r] = (counts[r] || 0) + 1; });
    const groups = Object.keys(counts).map(Number).sort(function (a, b) { return counts[b] - counts[a] || b - a; });
    const shape = groups.map(function (r) { return counts[r]; }).join('');

    let category, tiebreak;
    if (straightHigh && flush)  { category = straightHigh === 14 ? CAT.ROYAL_FLUSH : CAT.STRAIGHT_FLUSH; tiebreak = [straightHigh]; }
    else if (shape === '41')    { category = CAT.QUADS;      tiebreak = groups; }
    else if (shape === '32')    { category = CAT.FULL_HOUSE; tiebreak = groups; }
    else if (flush)             { category = CAT.FLUSH;      tiebreak = ranks; }
    else if (straightHigh)      { category = CAT.STRAIGHT;   tiebreak = [straightHigh]; }
    else if (shape === '311')   { category = CAT.TRIPS;      tiebreak = groups; }
    else if (shape === '221')   { category = CAT.TWO_PAIR;   tiebreak = groups; }
    else if (shape === '2111')  { category = CAT.PAIR;       tiebreak = groups; }
    else                        { category = CAT.HIGH_CARD;  tiebreak = ranks; }

    return { category: category, key: CAT_KEYS[category], name: CAT_NAMES[category], tiebreak: tiebreak, cards: cards.slice() };
  }

  function combinations(arr, k) {
    const out = [];
    (function rec(start, picked) {
      if (picked.length === k) { out.push(picked.slice()); return; }
      for (let i = start; i < arr.length; i++) { picked.push(arr[i]); rec(i + 1, picked); picked.pop(); }
    })(0, []);
    return out;
  }

  function compare(a, b) {
    if (a.category !== b.category) return a.category > b.category ? 1 : -1;
    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
      const x = a.tiebreak[i] || 0, y = b.tiebreak[i] || 0;
      if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
  }

  // Meilleure main de 5 cartes parmi 5, 6 ou 7 cartes
  function bestHand(cards) {
    let best = null;
    combinations(cards, 5).forEach(function (combo) {
      const ev = evaluate5(combo);
      if (!best || compare(ev, best) > 0) best = ev;
    });
    return best;
  }

  // Le croupier est qualifié à partir d'une paire
  function dealerQualifies(ev) { return ev.category >= CAT.PAIR; }

  // ── Libellés français ──────────────────────────────
  const RANK_SING = { 14: 'As', 13: 'Roi', 12: 'Dame', 11: 'Valet' };
  const RANK_PLUR = { 14: 'As', 13: 'Rois', 12: 'Dames', 11: 'Valets' };
  const rankName   = function (r) { return RANK_SING[r] || String(r); };
  const rankPlural = function (r) { return RANK_PLUR[r] || String(r); };
  // « à l'As », « au Roi », « à la Dame », « au Valet », « au 9 »
  // « de Rois », « de 7 », mais « d'As » (élision)
  const rankDe = function (r) { return r === 14 ? "d'As" : 'de ' + rankPlural(r); };
  const rankAu = function (r) { return r === 14 ? 'à l\'As' : r === 12 ? 'à la Dame' : 'au ' + rankName(r); };

  function describe(ev) {
    const t = ev.tiebreak;
    switch (ev.category) {
      case CAT.HIGH_CARD:      return 'Carte haute ' + rankName(t[0]);
      case CAT.PAIR:           return 'Paire ' + rankDe(t[0]);
      case CAT.TWO_PAIR:       return 'Double paire ' + rankPlural(t[0]) + ' et ' + rankPlural(t[1]);
      case CAT.TRIPS:          return 'Brelan ' + rankDe(t[0]);
      case CAT.STRAIGHT:       return 'Quinte ' + rankAu(t[0]);
      case CAT.FLUSH:          return 'Couleur ' + rankAu(t[0]);
      case CAT.FULL_HOUSE:     return 'Full aux ' + rankPlural(t[0]) + ' par les ' + rankPlural(t[1]);
      case CAT.QUADS:          return 'Carré ' + rankDe(t[0]);
      case CAT.STRAIGHT_FLUSH: return 'Quinte flush ' + rankAu(t[0]);
      default:                 return 'Quinte flush royale';
    }
  }

  // ── Tables de paiement (réglementation) — modifiables par un admin via training_config 'uth' ──
  const DEFAULT_CONFIG = {
    blind: { royal_flush: 500, straight_flush: 50, quads: 10, full_house: 3, flush: 1.5, straight: 1 },
    trips: { royal_flush: 50, straight_flush: 40, quads: 30, full_house: 8, flush: 7, straight: 4, trips: 3 },
    // JP1 : full / carré / quinte flush sur les 7 cartes ; quinte flush royale « communautaire » (le board seul) ;
    // la quinte flush royale du joueur paie 100 % du jackpot (montant variable, hors barème) ; consolation versée
    // à tous les joueurs JP1 quand un autre joueur de la table reçoit la quinte flush royale
    jp1:   { full_house: 10, quads: 100, straight_flush: 300, community_royal: 1000, consolation: 100 },
  };

  function mergeConfig(cfg) {
    cfg = cfg || {};
    return {
      blind: Object.assign({}, DEFAULT_CONFIG.blind, cfg.blind),
      trips: Object.assign({}, DEFAULT_CONFIG.trips, cfg.trips),
      jp1:   Object.assign({}, DEFAULT_CONFIG.jp1,   cfg.jp1),
    };
  }

  // Multiples de l'Ante pour la mise Play, selon le moment où le joueur joue
  const PLAY_MULTIPLIERS = { pre4: 4, pre3: 3, flop: 2, river: 1, fold: 0 };
  const PLAY_LABELS = {
    pre4: 'avant le flop (4×)', pre3: 'avant le flop (3×)', flop: 'au flop (2×)', river: 'à la river (1×)', fold: 'couché',
  };

  function round2(n) { return Math.round(n * 100) / 100; }

  // « 3 pour 2 », « 500 pour 1 »
  function formatRate(r) {
    if (Number.isInteger(r)) return r + ' pour 1';
    if (Number.isInteger(r * 2)) return (r * 2) + ' pour 2';
    return r + ' pour 1';
  }

  // ── JP1 : gain bonus du joueur (indépendant du résultat contre le croupier) ──
  // Renvoie { type, rate } ; rate = null pour la quinte flush royale (100 % du jackpot, via le superviseur)
  function evaluateJp1(playerHole, board, cfg) {
    cfg = mergeConfig(cfg);
    if (evaluate5(board).category === CAT.ROYAL_FLUSH) return { type: 'community_royal', rate: cfg.jp1.community_royal };
    const best = bestHand(playerHole.concat(board));
    switch (best.category) {
      case CAT.ROYAL_FLUSH:    return { type: 'royal_flush', rate: null };
      case CAT.STRAIGHT_FLUSH: return { type: 'straight_flush', rate: cfg.jp1.straight_flush };
      case CAT.QUADS:          return { type: 'quads', rate: cfg.jp1.quads };
      case CAT.FULL_HOUSE:     return { type: 'full_house', rate: cfg.jp1.full_house };
      default:                 return null;
    }
  }

  // ── Règlement d'une donne ───────────────────────────
  // round : { ante, blind, trips (0 = pas de mise), jp1 (0 = pas de mise), street ('pre4'|'pre3'|'flop'|'river'|'fold'),
  //           player: [2 cartes], dealer: [2 cartes], board: [5 cartes], jp1Consolation?: true }
  // Renvoie le détail par mise ({ bet, stake, result, net, why }) et le net total du joueur (gain > 0, perte < 0).
  function settle(round, cfg) {
    cfg = mergeConfig(cfg);
    if (!(round.street in PLAY_MULTIPLIERS)) throw new Error('street invalide : ' + round.street);
    const ante = round.ante, blind = round.blind != null ? round.blind : round.ante;
    const folded = round.street === 'fold';
    const play = round2(ante * PLAY_MULTIPLIERS[round.street]);

    const pEv = bestHand(round.player.concat(round.board));
    const dEv = bestHand(round.dealer.concat(round.board));
    const cmp = compare(pEv, dEv);
    const qualified = dealerQualifies(dEv);
    const lines = [];
    const add = function (bet, stake, result, net, why) {
      lines.push({ bet: bet, stake: stake, result: result, net: round2(net), why: why });
    };

    if (folded) {
      add('ante',  ante,  'lose', -ante,  'Le joueur se couche : il perd l\'Ante.');
      add('blind', blind, 'lose', -blind, 'Le joueur se couche : il perd le Blind.');
    } else {
      // Ante : rendu si le croupier n'est pas qualifié, sinon suit le résultat
      if (!qualified)      add('ante', ante, 'push', 0, 'Croupier non qualifié (' + describe(dEv) + ') : l\'Ante est rendu.');
      else if (cmp > 0)    add('ante', ante, 'win',  ante,  'Le joueur bat le croupier : Ante payé 1 pour 1.');
      else if (cmp < 0)    add('ante', ante, 'lose', -ante, 'Le croupier gagne : l\'Ante est perdu.');
      else                 add('ante', ante, 'push', 0, 'Égalité : l\'Ante est rendu.');

      // Play
      if (cmp > 0)         add('play', play, 'win',  play,  'Le joueur bat le croupier : Play payé 1 pour 1.');
      else if (cmp < 0)    add('play', play, 'lose', -play, 'Le croupier gagne : le Play est perdu.');
      else                 add('play', play, 'push', 0, 'Égalité : le Play est rendu.');

      // Blind : ne paie qu'à partir de la quinte, sinon rendu
      if (cmp > 0) {
        const rate = pEv.category >= CAT.STRAIGHT ? cfg.blind[pEv.key] : 0;
        if (rate) add('blind', blind, 'win', blind * rate, 'Le joueur gagne avec ' + describe(pEv) + ' : Blind payé ' + formatRate(rate) + '.');
        else      add('blind', blind, 'push', 0, 'Le joueur gagne avec moins qu\'une quinte (' + describe(pEv) + ') : le Blind est rendu.');
      } else if (cmp < 0)  add('blind', blind, 'lose', -blind, 'Le croupier gagne : le Blind est perdu.');
      else                 add('blind', blind, 'push', 0, 'Égalité : le Blind est rendu.');
    }

    // Trips : sur la main du joueur seule (7 cartes), quel que soit le résultat contre le croupier
    if (round.trips) {
      const rate = pEv.category >= CAT.TRIPS ? cfg.trips[pEv.key] : 0;
      if (rate) add('trips', round.trips, 'win', round.trips * rate, 'Trips : ' + describe(pEv) + ' payé ' + formatRate(rate) + '.');
      else      add('trips', round.trips, 'lose', -round.trips, 'Trips : ' + describe(pEv) + ', moins qu\'un brelan : mise perdue.');
    }

    // JP1 : gains fixes ; quinte flush royale = jackpot (superviseur), donc pas de montant calculable ici
    let jackpot = null;
    if (round.jp1) {
      const j = evaluateJp1(round.player, round.board, cfg);
      if (j && j.rate === null) {
        jackpot = { type: j.type };
        add('jp1', round.jp1, 'jackpot', 0, 'Quinte flush royale : 100 % du jackpot, à faire valider par le superviseur (vidéo).');
      } else if (j) {
        add('jp1', round.jp1, 'win', round.jp1 * j.rate, 'JP1 : ' + (j.type === 'community_royal' ? 'quinte flush royale communautaire' : describe(bestHand(round.player.concat(round.board)))) + ' payé ' + formatRate(j.rate) + '.');
      } else if (round.jp1Consolation) {
        add('jp1', round.jp1, 'win', round.jp1 * cfg.jp1.consolation, 'Lot de consolation : un autre joueur a reçu la quinte flush royale (' + formatRate(cfg.jp1.consolation) + ').');
      } else {
        add('jp1', round.jp1, 'lose', -round.jp1, 'JP1 : pas de full ou mieux, mise perdue (ajoutée à la cagnotte).');
      }
    }

    return {
      player: pEv, dealer: dEv, cmp: cmp, dealerQualified: qualified,
      lines: lines, jackpot: jackpot,
      net: round2(lines.reduce(function (a, l) { return a + l.net; }, 0)),
      play: play,
    };
  }

  // ── Génération de donnes ───────────────────────────
  function dealRound(rng) {
    const d = shuffle(newDeck(), rng);
    return { player: d.slice(0, 2), dealer: d.slice(2, 4), board: d.slice(4, 9) };
  }

  // Tire des donnes jusqu'à ce que predicate(round) soit vraie (utile pour cibler un cas pédagogique)
  function sampleRound(predicate, maxTries, rng) {
    for (let i = 0; i < (maxTries || 5000); i++) {
      const r = dealRound(rng);
      if (!predicate || predicate(r)) return r;
    }
    return null;
  }

  // Construit 5 cartes formant exactement la combinaison demandée (pour cibler les combinaisons rares)
  function makeHand5(cat, rng) {
    rng = rng || Math.random;
    const pick = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
    const suit = function () { return pick(SUITS); };
    const ranksOf = function (exclude, n) {
      const pool = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter(function (r) { return exclude.indexOf(r) < 0; }), rng);
      return pool.slice(0, n);
    };
    const straightRanks = function (high) { return high === 5 ? [14, 5, 4, 3, 2] : [high, high - 1, high - 2, high - 3, high - 4]; };
    const isStraight = function (rs) { return evaluate5(rs.map(function (r, i) { return { rank: r, suit: SUITS[i % 4] }; })).category === CAT.STRAIGHT; };
    const distinctSuits = function (n, rankList) {   // n cartes de rangs donnés, enseignes variées mais jamais toutes égales
      let out;
      do { out = rankList.map(function (r) { return { rank: r, suit: suit() }; }); }
      while (out.length === 5 && out.every(function (c) { return c.suit === out[0].suit; }));
      return out;
    };
    const withSuits = function (rankList, suits) { return rankList.map(function (r, i) { return { rank: r, suit: suits[i] }; }); };
    const shuffled4 = function () { return shuffle(SUITS.slice(), rng); };

    switch (cat) {
      case CAT.ROYAL_FLUSH: { const s = suit(); return [10, 11, 12, 13, 14].map(function (r) { return { rank: r, suit: s }; }); }
      case CAT.STRAIGHT_FLUSH: { const s = suit(), high = 5 + Math.floor(rng() * 9); return straightRanks(high).map(function (r) { return { rank: r, suit: s }; }); }
      case CAT.QUADS: { const [a, k] = ranksOf([], 2); return SUITS.map(function (s) { return { rank: a, suit: s }; }).concat([{ rank: k, suit: suit() }]); }
      case CAT.FULL_HOUSE: { const [a, b] = ranksOf([], 2); const sa = shuffled4(), sb = shuffled4(); return withSuits([a, a, a, b, b], [sa[0], sa[1], sa[2], sb[0], sb[1]]); }
      case CAT.FLUSH: { const s = suit(); let rs; do { rs = ranksOf([], 5); } while (isStraight(rs) || evaluate5(rs.map(function (r) { return { rank: r, suit: s }; })).category !== CAT.FLUSH); return rs.map(function (r) { return { rank: r, suit: s }; }); }
      case CAT.STRAIGHT: { const high = 5 + Math.floor(rng() * 10); return distinctSuits(5, straightRanks(high)); }
      case CAT.TRIPS: { const [a, x, y] = ranksOf([], 3); const sa = shuffled4(); return withSuits([a, a, a, x, y], [sa[0], sa[1], sa[2], suit(), suit()]); }
      case CAT.TWO_PAIR: { const [a, b, k] = ranksOf([], 3); const sa = shuffled4(), sb = shuffled4(); return withSuits([a, a, b, b, k], [sa[0], sa[1], sb[0], sb[1], suit()]); }
      case CAT.PAIR: { const [a, x, y, z] = ranksOf([], 4); const sa = shuffled4(); return withSuits([a, a, x, y, z], [sa[0], sa[1], suit(), suit(), suit()]); }
      default: { let rs; do { rs = ranksOf([], 5); } while (isStraight(rs)); return distinctSuits(5, rs); }
    }
  }

  // 7 cartes (2 du joueur + 5 du board) dont la meilleure main est exactement la combinaison demandée
  function sevenWithBest(cat, rng) {
    rng = rng || Math.random;
    for (let i = 0; i < 400; i++) {
      const five = makeHand5(cat, rng);
      const used = function (c) { return five.some(function (f) { return f.rank === c.rank && f.suit === c.suit; }); };
      const extra = shuffle(newDeck().filter(function (c) { return !used(c); }), rng).slice(0, 2);
      const seven = shuffle(five.concat(extra), rng);
      if (bestHand(seven).category === cat) return seven;
    }
    return null;
  }

  // ── Pièges du niveau expert (« Meilleure main ») ────
  // Chaque piège construit 7 cartes dont la meilleure combinaison est connue d'avance, avec l'explication
  // du piège. Les cartes de base sont complétées au hasard puis la catégorie est revérifiée : un tirage
  // qui donnerait une autre combinaison (ex. un 4e As) est écarté.
  const rankCounts = function (cs) { const m = {}; cs.forEach(function (c) { m[c.rank] = (m[c.rank] || 0) + 1; }); return Object.keys(m).map(function (k) { return m[k]; }); };
  const hasCategory = function (cs, cat) { return combinations(cs, 5).some(function (c) { return evaluate5(c).category === cat; }); };

  const TRAPS = [
    {
      id: 'roue', expected: CAT.STRAIGHT,
      valid: function (seven) { return bestHand(seven).tiebreak[0] === 5; },
      text: 'La « roue » A-2-3-4-5 est une quinte (de hauteur 5) : l\'As compte aussi comme la plus petite carte.',
      base: function (pick, rng) {
        return [14, 2, 3, 4, 5].map(function (r) { return { rank: r, suit: SUITS[Math.floor(rng() * 4)] }; });
      },
    },
    {
      id: 'couleur_et_quinte', expected: CAT.FLUSH,
      valid: function (seven) { return hasCategory(seven, CAT.STRAIGHT) && hasCategory(seven, CAT.FLUSH); },
      text: 'Le joueur a une quinte ET une couleur : la couleur est plus forte que la quinte.',
      base: function (pick, rng) {
        const high = 6 + Math.floor(rng() * 8), s = pick(SUITS);
        const ranks = [high, high - 1, high - 2, high - 3, high - 4];
        const others = SUITS.filter(function (x) { return x !== s; });
        const cards = ranks.map(function (r, i) { return { rank: r, suit: i < 3 ? s : pick(others) }; });
        // deux cartes de la couleur en plus, de rangs hors de la quinte : 5 cartes de la couleur, mais pas consécutives
        shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter(function (r) { return ranks.indexOf(r) < 0; }), rng)
          .slice(0, 2).forEach(function (r) { cards.push({ rank: r, suit: s }); });
        return cards;
      },
    },
    {
      id: 'deux_brelans', expected: CAT.FULL_HOUSE,
      valid: function (seven) { return rankCounts(seven).filter(function (n) { return n === 3; }).length === 2; },
      text: 'Deux brelans : le plus haut reste un brelan, et trois cartes du second brelan servent de paire pour faire le Full.',
      base: function (pick, rng) {
        const rs = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], rng).slice(0, 2);
        const s1 = shuffle(SUITS.slice(), rng), s2 = shuffle(SUITS.slice(), rng);
        return [0, 1, 2].map(function (i) { return { rank: rs[0], suit: s1[i] }; }).concat([0, 1, 2].map(function (i) { return { rank: rs[1], suit: s2[i] }; }));
      },
    },
    {
      id: 'trois_paires', expected: CAT.TWO_PAIR,
      valid: function (seven) { return rankCounts(seven).filter(function (n) { return n === 2; }).length === 3; },
      text: 'Trois paires : seules les deux plus hautes comptent, et la 5e carte est la plus haute des cartes restantes.',
      base: function (pick, rng) {
        const rs = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], rng).slice(0, 3);
        const out = [];
        rs.forEach(function (r) { const s = shuffle(SUITS.slice(), rng); out.push({ rank: r, suit: s[0] }, { rank: r, suit: s[1] }); });
        return out;
      },
    },
    {
      id: 'carre_brelan', expected: CAT.QUADS,
      valid: function (seven) { const c = rankCounts(seven); return c.indexOf(4) >= 0 && c.indexOf(3) >= 0; },
      text: 'Un carré et un brelan : le carré l\'emporte sur le Full, on ne garde pas le brelan.',
      base: function (pick, rng) {
        const rs = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], rng).slice(0, 2), s = shuffle(SUITS.slice(), rng);
        return SUITS.map(function (x) { return { rank: rs[0], suit: x }; }).concat([0, 1, 2].map(function (i) { return { rank: rs[1], suit: s[i] }; }));
      },
    },
    {
      id: 'full_deux_paires', expected: CAT.FULL_HOUSE,
      valid: function (seven) { const c = rankCounts(seven); return c.indexOf(3) >= 0 && c.filter(function (n) { return n === 2; }).length === 2; },
      text: 'Un brelan et deux paires : on forme un Full avec le brelan et la plus haute des deux paires.',
      base: function (pick, rng) {
        const rs = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], rng).slice(0, 3), out = [];
        const s0 = shuffle(SUITS.slice(), rng);
        [0, 1, 2].forEach(function (i) { out.push({ rank: rs[0], suit: s0[i] }); });
        [1, 2].forEach(function (k) { const s = shuffle(SUITS.slice(), rng); out.push({ rank: rs[k], suit: s[0] }, { rank: rs[k], suit: s[1] }); });
        return out;
      },
    },
    {
      id: 'quinte_et_paire', expected: CAT.STRAIGHT,
      valid: function (seven) { const c = rankCounts(seven); return c.indexOf(2) >= 0 && Math.max.apply(null, c) === 2; },
      text: 'Une quinte avec une paire dans les 7 cartes : la quinte est plus forte que la paire.',
      base: function (pick, rng) {
        const high = 6 + Math.floor(rng() * 9);
        const ranks = [high, high - 1, high - 2, high - 3, high - 4];
        const cards = ranks.map(function (r) { return { rank: r, suit: SUITS[Math.floor(rng() * 4)] }; });
        cards.push({ rank: pick(ranks), suit: SUITS[Math.floor(rng() * 4)] });
        return cards;
      },
    },
    {
      id: 'couleur_et_paire', expected: CAT.FLUSH,
      valid: function (seven) { const c = rankCounts(seven); return c.indexOf(2) >= 0 && Math.max.apply(null, c) === 2; },
      text: 'Une couleur avec une paire dans les 7 cartes : la couleur est plus forte que la paire (ou la double paire).',
      base: function (pick, rng) {
        const s = pick(SUITS), cards = [];
        let rs;
        do { rs = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], rng).slice(0, 5); } while (evaluate5(rs.map(function (r) { return { rank: r, suit: s }; })).category !== CAT.FLUSH);
        rs.forEach(function (r) { cards.push({ rank: r, suit: s }); });
        const others = SUITS.filter(function (x) { return x !== s; });
        cards.push({ rank: rs[0], suit: pick(others) });   // même rang qu'une carte de la couleur : fait une paire
        return cards;
      },
    },
  ];

  function expertTrap(rng, only) {
    rng = rng || Math.random;
    const pick = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
    const pool = only ? TRAPS.filter(function (t) { return t.id === only; }) : TRAPS;
    for (let tries = 0; tries < 600; tries++) {
      const trap = pick(pool);
      const base = trap.base(pick, rng);
      const used = function (c) { return base.some(function (b) { return b.rank === c.rank && b.suit === c.suit; }); };
      // les cartes de base doivent être distinctes (un tirage de suits peut en dupliquer une)
      if (new Set(base.map(function (c) { return c.rank + c.suit; })).size !== base.length) continue;
      const extra = shuffle(newDeck().filter(function (c) { return !used(c); }), rng).slice(0, 7 - base.length);
      const seven = shuffle(base.concat(extra), rng);
      if (bestHand(seven).category === trap.expected && (!trap.valid || trap.valid(seven))) return { cards: seven, expected: trap.expected, id: trap.id, text: trap.text };
    }
    return null;
  }

  // ── Duel « Qui gagne ? » ────────────────────────────
  // Explique en français pourquoi le joueur ou le croupier gagne (ou l'égalité). p = main du joueur, d = main du croupier.
  function explainCompare(p, d) {
    const c = compare(p, d);
    if (c === 0) return 'Égalité : les deux joueurs ont la même combinaison de 5 cartes (' + describe(p) + ').';
    const w = c > 0 ? p : d, l = c > 0 ? d : p, who = c > 0 ? 'Le joueur' : 'Le croupier';
    if (p.category !== d.category) return who + ' gagne : ' + describe(w) + ' bat ' + describe(l) + '.';

    let i = 0;
    while (p.tiebreak[i] === d.tiebreak[i]) i++;
    const ordinal = ['1re', '2e', '3e', '4e', '5e'];
    let what;
    switch (p.category) {
      case CAT.PAIR:       what = i === 0 ? 'la paire' : 'le kicker'; break;
      case CAT.TWO_PAIR:   what = ['la plus haute paire', 'la seconde paire', 'le kicker'][i]; break;
      case CAT.TRIPS:      what = i === 0 ? 'le brelan' : 'le kicker'; break;
      case CAT.FULL_HOUSE: what = i === 0 ? 'le brelan' : 'la paire'; break;
      case CAT.QUADS:      what = i === 0 ? 'le carré' : 'le kicker'; break;
      case CAT.STRAIGHT:
      case CAT.STRAIGHT_FLUSH: what = 'la hauteur de la quinte'; break;
      default:             what = 'la ' + ordinal[i] + ' carte';    // couleur, carte haute : carte par carte
    }
    return who + ' gagne : même combinaison (' + CAT_NAMES[p.category] + '), ' + what + ' décide — '
      + rankName(w.tiebreak[i]) + ' contre ' + rankName(l.tiebreak[i]) + '.';
  }

  // Vrai si les 5 cartes de la meilleure main sont exactement celles du board (le joueur « joue le board »)
  function playsBoard(ev, board) {
    return ev.cards.every(function (c) { return board.some(function (b) { return b.rank === c.rank && b.suit === c.suit; }); });
  }

  // Donne ciblée selon le niveau. Renvoie { player, dealer, board, pEv, dEv, cmp, qualified, kind }
  //   kind : 'category' (combinaisons différentes) · 'kicker' (même combinaison, départage) · 'tie' (égalité) · 'unqualified'
  // Facile : combinaisons nettement différentes, croupier qualifié. Médium : même combinaison, départage au kicker.
  // Expert : mélange d'égalités, de croupiers non qualifiés, de départages et de cas nets.
  const DUEL_EXPERT_WEIGHTS = [['tie', 25], ['unqualified', 35], ['kicker', 25], ['category', 15]];

  function duelRound(level, rng) {
    rng = rng || Math.random;
    let kind = level === 'facile' ? 'category' : level === 'medium' ? 'kicker' : null;
    if (!kind) {
      let r = rng() * DUEL_EXPERT_WEIGHTS.reduce(function (a, w) { return a + w[1]; }, 0);
      kind = DUEL_EXPERT_WEIGHTS[0][0];
      for (let i = 0; i < DUEL_EXPERT_WEIGHTS.length; i++) { r -= DUEL_EXPERT_WEIGHTS[i][1]; if (r < 0) { kind = DUEL_EXPERT_WEIGHTS[i][0]; break; } }
    }
    const accept = function (pEv, dEv, cmp) {
      const gap = Math.abs(pEv.category - dEv.category);
      if (level === 'facile') return cmp !== 0 && dEv.category >= CAT.PAIR && gap >= 2;
      if (kind === 'tie')         return cmp === 0;
      if (kind === 'unqualified') return cmp !== 0 && dEv.category === CAT.HIGH_CARD;
      if (kind === 'kicker')      return cmp !== 0 && gap === 0 && pEv.category >= CAT.PAIR;
      return cmp !== 0 && dEv.category >= CAT.PAIR && gap >= 1;               // category
    };
    for (let i = 0; i < 20000; i++) {
      const r = dealRound(rng);
      const pEv = bestHand(r.player.concat(r.board)), dEv = bestHand(r.dealer.concat(r.board));
      const cmp = compare(pEv, dEv);
      if (accept(pEv, dEv, cmp)) {
        return { player: r.player, dealer: r.dealer, board: r.board, pEv: pEv, dEv: dEv, cmp: cmp, qualified: dealerQualifies(dEv), kind: kind };
      }
    }
    return null;
  }

  return {
    explainCompare: explainCompare, playsBoard: playsBoard, duelRound: duelRound,
    TRAPS: TRAPS, expertTrap: expertTrap,
    SUITS: SUITS, RED: RED, RANK_LABELS: RANK_LABELS, CAT: CAT, CAT_KEYS: CAT_KEYS, CAT_NAMES: CAT_NAMES,
    PLAY_MULTIPLIERS: PLAY_MULTIPLIERS, PLAY_LABELS: PLAY_LABELS, DEFAULT_CONFIG: DEFAULT_CONFIG,
    newDeck: newDeck, shuffle: shuffle, evaluate5: evaluate5, bestHand: bestHand, compare: compare,
    dealerQualifies: dealerQualifies, describe: describe, evaluateJp1: evaluateJp1, settle: settle,
    mergeConfig: mergeConfig, formatRate: formatRate, dealRound: dealRound, sampleRound: sampleRound,
    makeHand5: makeHand5, sevenWithBest: sevenWithBest, combinations: combinations,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = UTH;
