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

// Une rangée avec son libellé
function uthLabeledRow(label, cards, best) {
  return '<div class="uth-group"><div class="uth-row-label">' + label + '</div>' + uthCardsRow(cards, best) + '</div>';
}
