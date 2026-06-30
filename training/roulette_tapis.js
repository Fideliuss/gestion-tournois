// ══════════════════════════════════════════════════════
//  ROULETTE TAPIS — composant partagé
//  Utilisé par : roulette_couleur, roulette_pointage,
//                roulette_paiement
// ══════════════════════════════════════════════════════

// ── Couleurs des numéros ─────────────────────────────
const R_COLORS = {
  0:  'green',
  1:  'red',   2:  'black', 3:  'red',   4:  'black',
  5:  'red',   6:  'black', 7:  'red',   8:  'black',
  9:  'red',   10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red',   15: 'black', 16: 'red',
  17: 'black', 18: 'red',   19: 'red',   20: 'black',
  21: 'red',   22: 'black', 23: 'red',   24: 'black',
  25: 'red',   26: 'black', 27: 'red',   28: 'black',
  29: 'black', 30: 'red',   31: 'black', 32: 'red',
  33: 'black', 34: 'red',   35: 'black', 36: 'red',
};

// ── Position dans la grille ──────────────────────────
// row : 1=haut (3,6,9...), 2=milieu (2,5,8...), 3=bas (1,4,7...)
function rRow(n) {
  const r = n % 3;
  return r === 0 ? 1 : r === 2 ? 2 : 3;
}
// col : 1 à 12 (groupe de 3 numéros)
function rCol(n) { return Math.ceil(n / 3); }

// ── Types de mise (module 1 — calcul paiement) ───────
const BET_TYPES = [
  { id: 'plein',        label: 'Plein',        ratio: 35, covered: 1 },
  { id: 'cheval',       label: 'Cheval',        ratio: 17, covered: 2 },
  { id: 'transversale', label: 'Transversale',  ratio: 11, covered: 3 },
  { id: 'carre',        label: 'Carré',         ratio: 8,  covered: 4 },
  { id: 'sixain',       label: 'Sixain',        ratio: 5,  covered: 6 },
];

const STACK_SIZE = 20; // fixe, non modifiable

// ── Rendu de la grille tapis ─────────────────────────
// container : élément DOM cible
// opts : { maxNum, clickable, onClickNum, highlight, hideNumbers, mirror }
function renderTapis(container, opts) {
  opts = opts || {};
  const maxNum      = opts.maxNum      || 36;
  const clickable    = opts.clickable    || false;
  const highlight    = opts.highlight    || [];
  const onClick      = opts.onClickNum   || null;
  const hideNumbers  = opts.hideNumbers  || false;
  const mirror       = opts.mirror       || false;

  const numCols = Math.ceil(maxNum / 3); // 4 pour 1ère douzaine, 12 pour tout

  // En mode miroir, le 0 passe à droite et l'ordre des colonnes s'inverse
  const gridCols = mirror
    ? 'repeat(' + numCols + ', 1fr) 1.3fr'
    : '1.3fr repeat(' + numCols + ', 1fr)';

  let html = '<div class="rt-grid" style="grid-template-columns: ' + gridCols + '">';

  // Cellule 0 — placement explicite (col 1 normal, col numCols+1 en miroir)
  const zeroCol = mirror ? (numCols + 1) : 1;
  html += '<div class="rt-cell rt-zero' + (clickable ? ' rt-clickable' : '') + '"'
        + ' style="grid-column:' + zeroCol + ';grid-row:1 / span 3"'
        + (onClick ? ' onclick="' + opts.clickFn + '(0)"' : '') + '>'
        + (hideNumbers ? '' : '<span class="rt-num">0</span>') + '</div>';

  // Numéros 1 à maxNum, par rangée (top=3,6,... mid=2,5,... bot=1,4,...)
  for (var row = 1; row <= 3; row++) {
    for (var col = 1; col <= numCols; col++) {
      var n = (col - 1) * 3 + (row === 1 ? 3 : row === 2 ? 2 : 1);
      // Symétrie centrale 180° : colonnes ET rangées inversées (le 0 pivote, lui occupe déjà les 3 rangées)
      var gridCol = mirror ? (numCols - col + 1) : (col + 1);
      var gridRow = mirror ? (4 - row) : row;
      var cellStyle = 'grid-column:' + gridCol + ';grid-row:' + gridRow;
      if (n > maxNum) {
        html += '<div class="rt-cell rt-empty" style="' + cellStyle + '"></div>';
        continue;
      }
      var color = R_COLORS[n];
      var isHighlight = highlight.indexOf(n) >= 0;
      // Séparateur de douzaine (tapis complet uniquement) — suit le sens du miroir
      var dozenBorder = '';
      if (numCols === 12 && (col === 4 || col === 8)) {
        dozenBorder = mirror ? ' rt-dozen-l' : ' rt-dozen-r';
      }
      html += '<div class="rt-cell rt-' + color + dozenBorder
            + (isHighlight ? ' rt-highlight' : '')
            + (clickable ? ' rt-clickable' : '') + '"'
            + ' style="' + cellStyle + '"'
            + (onClick ? ' onclick="' + opts.clickFn + '(' + n + ')"' : '')
            + ' data-num="' + n + '">'
            + (hideNumbers ? '' : '<span class="rt-num">' + n + '</span>') + '</div>';
    }
  }

  html += '</div>';
  container.innerHTML = html;
}

// ── Génération d'une mise aléatoire (module 1) ───────
// level : 'facile' | 'medium' | 'expert'
function generateBet(level) {
  // Choisit un type aléatoire
  const type = BET_TYPES[Math.floor(Math.random() * BET_TYPES.length)];

  // Nombre de pièces selon le niveau
  const maxChips = type.covered * STACK_SIZE;
  var chips;
  if (level === 'facile') chips = randInt(1, Math.min(3, maxChips));
  else if (level === 'medium') chips = randInt(1, Math.min(10, maxChips));
  else chips = randInt(1, maxChips);

  // Numéros concernés selon le type (dans la 1ère douzaine + 0)
  const numbers = pickNumbers(type.id);

  return {
    type:    type,
    chips:   chips,
    numbers: numbers,
    payout:  chips * type.ratio,
  };
}

function pickNumbers(typeId) {
  // Génère un ensemble de numéros valide pour ce type de mise
  // dans la plage 0-12 (première douzaine + 0)
  switch (typeId) {
    case 'plein': {
      const n = randInt(0, 12);
      return [n];
    }
    case 'cheval': {
      // Cheval vertical (même colonne) ou horizontal (colonnes adjacentes)
      const variant = Math.random() < 0.5 ? 'v' : 'h';
      if (variant === 'v') {
        // ex: 1-2, 2-3, 4-5, 5-6... ou 0-1/0-2/0-3
        const zeroCheval = Math.random() < 0.15;
        if (zeroCheval) {
          const n = randInt(1, 3);
          return [0, n];
        }
        const col = randInt(1, 4);
        const base = (col - 1) * 3 + 1;
        const row = randInt(1, 2);
        return [base + row - 1, base + row];
      } else {
        // ex: 1-4, 2-5, 3-6... horizontal entre colonnes adjacentes
        const col = randInt(1, 3);
        const row = randInt(0, 2);
        const n1 = (col - 1) * 3 + row + 1;
        const n2 = col * 3 + row + 1;
        if (n2 > 12) return pickNumbers('cheval'); // retry
        return [n1, n2];
      }
    }
    case 'transversale': {
      // ex: 0-1-2, 0-2-3, 1-2-3, 4-5-6...
      if (Math.random() < 0.2) {
        // transversale avec 0
        return Math.random() < 0.5 ? [0, 1, 2] : [0, 2, 3];
      }
      const col = randInt(1, 4);
      const base = (col - 1) * 3 + 1;
      return [base, base + 1, base + 2];
    }
    case 'carre': {
      // Carré : 4 numéros en 2x2 — ex: 1-2-4-5, 2-3-5-6...
      // Ou carré avec 0 : 0-1-2-3
      if (Math.random() < 0.15) return [0, 1, 2, 3];
      const col = randInt(1, 3);
      const row = randInt(1, 2);
      const n1 = (col - 1) * 3 + row;
      return [n1, n1 + 1, n1 + 3, n1 + 4];
    }
    case 'sixain': {
      // Sixain : 2 colonnes adjacentes de 3 — ex: 1-2-3-4-5-6
      const col = randInt(1, 3);
      const base = (col - 1) * 3 + 1;
      return [base, base+1, base+2, base+3, base+4, base+5];
    }
    default: return [1];
  }
}

// ── Utilitaires ───────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
