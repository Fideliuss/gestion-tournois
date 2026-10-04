// ══════════════════════════════════════════════════════
//  ULTIMATE TEXAS HOLD'EM — affichage des cartes (partagé par les modules)
//  Réutilise le composant .playing-card du Blackjack (training.css).
//  Dépend de uth_engine.js (chargé avant).
// ══════════════════════════════════════════════════════

function uthCardHtml(card, extraClass) {
  const label = UTH.RANK_LABELS[card.rank];
  const red = UTH.RED.indexOf(card.suit) >= 0;
  return '<div class="playing-card' + (red ? ' red' : '') + (extraClass ? ' ' + extraClass : '') + '">'
    + '<div class="card-tl"><div class="card-rank">' + label + '</div><div class="card-suit">' + card.suit + '</div></div>'
    + '<div class="card-center">' + card.suit + '</div>'
    + '<div class="card-br"><div class="card-rank">' + label + '</div><div class="card-suit">' + card.suit + '</div></div>'
    + '</div>';
}

function uthSameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }

// Rangée de cartes ; si `best` (les 5 cartes de la meilleure main) est fourni, les autres sont atténuées
function uthCardsRow(cards, best) {
  return '<div class="uth-cards">' + cards.map(function (c) {
    const cls = best ? (best.some(function (b) { return uthSameCard(b, c); }) ? 'uth-best' : 'uth-dim') : '';
    return uthCardHtml(c, cls);
  }).join('') + '</div>';
}

// ── Table du module « Qui gagne ? » : trois encadrés, de haut en bas ──
// Encadré avec son libellé (Joueur, Board, Banque)
function uthFrame(label, inner) {
  return '<div class="uth-frame"><div class="uth-frame-label">' + label + '</div>' + inner + '</div>';
}

// Joueur : deux cartes en quinconce (décalées en hauteur, légèrement superposées)
// `best` (optionnel) : les 5 cartes de la meilleure main — les autres cartes sont alors atténuées
function uthMark(card, best) {
  if (!best) return '';
  return best.some(function (b) { return uthSameCard(b, card); }) ? 'uth-best' : 'uth-dim';
}

function uthPlayerZone(cards, best) {
  return uthFrame('Joueur', '<div class="uth-fan">' + cards.map(function (c) { return uthCardHtml(c, uthMark(c, best)); }).join('') + '</div>');
}

// Board : une case par carte, séparées discrètement en flop (3) · turn (1) · river (1)
function uthBoardZone(board, best) {
  const slot = function (c) { return '<div class="uth-slot">' + uthCardHtml(c, uthMark(c, best)) + '</div>'; };
  const street = function (name, cs) {
    return '<div class="uth-street"><div class="uth-street-label">' + name + '</div>'
      + '<div class="uth-street-cards">' + cs.map(slot).join('') + '</div></div>';
  };
  return uthFrame('Board', '<div class="uth-board">'
    + street('Flop', board.slice(0, 3)) + '<div class="uth-sep"></div>'
    + street('Turn', board.slice(3, 4)) + '<div class="uth-sep"></div>'
    + street('River', board.slice(4, 5)) + '</div>');
}

// Banque : ses deux cartes côte à côte
function uthBankZone(cards) {
  return uthFrame('Banque', uthCardsRow(cards));
}
