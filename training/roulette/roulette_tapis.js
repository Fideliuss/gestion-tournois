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
const ZERO_W = 1.3; // largeur de la colonne 0 — doit correspondre au 1.3fr dans renderTapis

// Pondération des types de mise par niveau (probabilité relative)
const BET_TYPE_WEIGHTS = {
  facile: { plein: 35, cheval: 35, transversale: 15, carre: 10, sixain: 5  },
  medium: { plein: 25, cheval: 25, transversale: 20, carre: 15, sixain: 15 },
  expert: { plein: 20, cheval: 20, transversale: 20, carre: 20, sixain: 20 },
};

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
  const isZeroHighlight = highlight.indexOf(0) >= 0;
  html += '<div class="rt-cell rt-zero' + (isZeroHighlight ? ' rt-highlight' : '') + (clickable ? ' rt-clickable' : '') + '"'
        + ' style="grid-column:' + zeroCol + ';grid-row:1 / span 3"'
        + ' data-num="0"'
        + (onClick ? ' onclick="' + opts.clickFn + '(0)"' : '') + '>'
        + (hideNumbers ? '' : '<span class="rt-num">0</span>') + '</div>';

  // Numéros 1 à maxNum, par rangée (top=3,6,... mid=2,5,... bot=1,4,...)
  for (var row = 1; row <= 3; row++) {
    for (var col = 1; col <= numCols; col++) {
      var n = (col - 1) * 3 + (row === 1 ? 3 : row === 2 ? 2 : 1);
      // Symétrie centrale à 180° (confirmé par photos de la vraie table) : colonnes ET
      // rangées inversées — la rangée proche du bord/labels devient la rangée proche du 0.
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
  // Choisit un type pondéré selon le niveau (facile = surtout plein/cheval, expert = équilibré)
  const type = pickBetType(level);

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

function pickBetType(level) {
  const weights = BET_TYPE_WEIGHTS[level] || BET_TYPE_WEIGHTS.expert;
  const total = BET_TYPES.reduce(function(s, t) { return s + (weights[t.id] || 1); }, 0);
  var rand = Math.random() * total;
  for (var i = 0; i < BET_TYPES.length; i++) {
    rand -= (weights[BET_TYPES[i].id] || 1);
    if (rand <= 0) return BET_TYPES[i];
  }
  return BET_TYPES[BET_TYPES.length - 1];
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

// ── Position du chip selon le type de mise ───────────
// numbers : numéros couverts par la mise (peut inclure 0)
// numCols : nombre de colonnes du tapis affiché (4 pour 1ère douzaine)
// Retourne { x, y } en % du conteneur
function getChipPosition(numbers, numCols) {
  const totalW = ZERO_W + numCols;

  if (numbers.indexOf(0) >= 0) {
    const others = numbers.filter(function(n) { return n !== 0; });
    const rows = others.map(rRow);
    const minRow = Math.min.apply(null, rows), maxRow = Math.max.apply(null, rows);
    const x = ZERO_W / totalW * 100; // bord zéro / colonne 1
    var y;
    if (others.length === 1)      y = (minRow - 1 + 0.5) / 3 * 100;       // cheval 0-N
    else if (others.length === 3) y = 50;                                  // carré 0-1-2-3
    else                            y = ((minRow - 1) + maxRow) / 2 / 3 * 100; // transversale 0-1-2 / 0-2-3
    return { x: x, y: y };
  }

  const cols = numbers.map(rCol);
  const rows = numbers.map(rRow);
  const minCol = Math.min.apply(null, cols), maxCol = Math.max.apply(null, cols);
  const minRow = Math.min.apply(null, rows), maxRow = Math.max.apply(null, rows);

  if (numbers.length === 1) {
    return { x: (ZERO_W + (minCol - 1) + 0.5) / totalW * 100, y: (minRow - 1 + 0.5) / 3 * 100 };
  }
  if (numbers.length === 2 && minCol === maxCol) {
    // Cheval vertical : bord horizontal partagé
    return { x: (ZERO_W + (minCol - 1) + 0.5) / totalW * 100, y: minRow / 3 * 100 };
  }
  if (numbers.length === 2) {
    // Cheval horizontal : bord vertical partagé
    return { x: (ZERO_W + minCol) / totalW * 100, y: (minRow - 1 + 0.5) / 3 * 100 };
  }
  if (numbers.length === 3) {
    // Transversale : bord supérieur, centré sur la colonne (côté cylindre)
    return { x: (ZERO_W + (minCol - 1) + 0.5) / totalW * 100, y: 0 };
  }
  if (numbers.length === 4) {
    // Carré : intersection des 4 cellules
    return { x: (ZERO_W + minCol) / totalW * 100, y: minRow / 3 * 100 };
  }
  if (numbers.length === 6) {
    // Sixain : bord supérieur, à la jonction des 2 colonnes
    return { x: (ZERO_W + minCol) / totalW * 100, y: 0 };
  }
  return { x: 50, y: 50 };
}

// ── Rendu du chip sur le tapis ────────────────────────
function renderChip(container, numbers, chips, numCols) {
  const pos = getChipPosition(numbers, numCols);
  container.innerHTML = '<div class="rt-chip" style="left:' + pos.x + '%;top:' + pos.y + '%">'
    + chips + '</div>';
}

// ── Pool de toutes les mises possibles couvrant winN ──
// Retourne TOUTES les positions valides (même type autorisé à plusieurs positions)
function buildBetPool(winN, numCols) {
  var pool = [];
  function numAt(c, r) { return (c-1)*3 + (r===1?3:r===2?2:1); }
  function t(id) { for(var i=0;i<BET_TYPES.length;i++){if(BET_TYPES[i].id===id)return BET_TYPES[i];} }

  // ── Cas spécial : numéro gagnant = 0 ────────────────
  if (winN === 0) {
    pool.push({ type: t('plein'),        numbers: [0] });
    pool.push({ type: t('cheval'),       numbers: [0, 1] });
    pool.push({ type: t('cheval'),       numbers: [0, 2] });
    pool.push({ type: t('cheval'),       numbers: [0, 3] });
    pool.push({ type: t('transversale'), numbers: [0, 1, 2] });
    pool.push({ type: t('transversale'), numbers: [0, 2, 3] });
    pool.push({ type: t('carre'),        numbers: [0, 1, 2, 3] });
    return pool;
  }

  var col = rCol(winN), row = rRow(winN);

  // Plein (1 position)
  pool.push({ type: t('plein'), numbers: [winN] });

  // Chevaux standard (jusqu'à 4 positions)
  if (row > 1)       pool.push({ type: t('cheval'), numbers: [numAt(col,row-1), winN].sort(function(a,b){return a-b;}) });
  if (row < 3)       pool.push({ type: t('cheval'), numbers: [winN, numAt(col,row+1)].sort(function(a,b){return a-b;}) });
  if (col > 1)       pool.push({ type: t('cheval'), numbers: [numAt(col-1,row), winN].sort(function(a,b){return a-b;}) });
  if (col < numCols) pool.push({ type: t('cheval'), numbers: [winN, numAt(col+1,row)].sort(function(a,b){return a-b;}) });

  // Transversale (1 position)
  var base = (col-1)*3+1;
  pool.push({ type: t('transversale'), numbers: [base, base+1, base+2] });

  // Carrés standard (jusqu'à 4 positions)
  var dc, dr, c1, r1, c2, r2;
  for (dc = 0; dc <= 1; dc++) {
    for (dr = 0; dr <= 1; dr++) {
      c1 = col-dc; r1 = row-dr; c2 = c1+1; r2 = r1+1;
      if (c1>=1 && c2<=numCols && r1>=1 && r2<=3) {
        pool.push({ type: t('carre'), numbers: [numAt(c1,r1), numAt(c1,r2), numAt(c2,r1), numAt(c2,r2)].sort(function(a,b){return a-b;}) });
      }
    }
  }

  // Sixains (jusqu'à 2 positions)
  if (col > 1) {
    base = (col-2)*3+1;
    if (base+5 <= numCols*3) pool.push({ type: t('sixain'), numbers: [base,base+1,base+2,base+3,base+4,base+5] });
  }
  if (col < numCols) {
    base = (col-1)*3+1;
    if (base+5 <= numCols*3) pool.push({ type: t('sixain'), numbers: [base,base+1,base+2,base+3,base+4,base+5] });
  }

  // ── Mises avec le 0 (uniquement pour winN = 1, 2 ou 3) ─
  if (col === 1) {
    pool.push({ type: t('cheval'), numbers: [0, winN] });
    if (winN === 1 || winN === 2) pool.push({ type: t('transversale'), numbers: [0, 1, 2] });
    if (winN === 2 || winN === 3) pool.push({ type: t('transversale'), numbers: [0, 2, 3] });
    pool.push({ type: t('carre'), numbers: [0, 1, 2, 3] });
  }

  return pool;
}

// ── Sélection pondérée sans remise dans le pool ───────
// Permet le même type à plusieurs positions (ex : 2 chevaux sur [2,5] et [5,8])
function weightedPickPool(pool, level, n) {
  var remaining = pool.slice();
  var result = [];
  var w = BET_TYPE_WEIGHTS[level] || BET_TYPE_WEIGHTS.expert;
  while (result.length < n && remaining.length > 0) {
    var total = remaining.reduce(function(s,item){ return s + (w[item.type.id] || 1); }, 0);
    var rand = Math.random() * total;
    var chosen = remaining.length - 1;
    for (var i = 0; i < remaining.length; i++) {
      rand -= (w[remaining[i].type.id] || 1);
      if (rand <= 0) { chosen = i; break; }
    }
    result.push(remaining[chosen]);
    remaining.splice(chosen, 1);
  }
  return result;
}

// ── Génération d'une question multi-mise ──────────────
// Toutes les mises couvrent le même numéro gagnant
// Retourne { bets, totalPayout, winningNumber }
function generateQuestion(level) {
  var numBets;
  if (level === 'facile')      numBets = 2;
  else if (level === 'medium') numBets = randInt(3, 4);
  else                          numBets = randInt(4, 6);

  var winN  = randInt(0, 12);
  var pool  = buildBetPool(winN, 4);
  var picks = weightedPickPool(pool, level, Math.min(numBets, pool.length));

  var bets = picks.map(function(pick) {
    var maxChips = pick.type.covered * STACK_SIZE;
    var chips;
    if (level === 'facile')      chips = randInt(1, Math.min(3, maxChips));
    else if (level === 'medium') chips = randInt(1, Math.min(10, maxChips));
    else                          chips = randInt(1, maxChips);
    return { type: pick.type, chips: chips, numbers: pick.numbers, payout: chips * pick.type.ratio };
  });

  return { bets: bets, totalPayout: bets.reduce(function(s,b){ return s + b.payout; }, 0), winningNumber: winN };
}

// ── Position chip via getBoundingClientRect ───────────
function chipPosFromDOM(numbers, tapEl, overlayRect) {
  // ── Bets incluant le 0 : logique spécifique ──────────
  if (numbers.indexOf(0) >= 0) {
    var zeroEl = tapEl.querySelector('[data-num="0"]');
    if (!zeroEl) return { x: 50, y: 50 };
    var zeroRect = zeroEl.getBoundingClientRect();
    var nonZero  = numbers.filter(function(n){ return n !== 0; });
    var nzCells  = nonZero.map(function(n){
      var el = tapEl.querySelector('[data-num="' + n + '"]');
      return el ? el.getBoundingClientRect() : null;
    }).filter(Boolean);

    var px = zeroRect.right; // bord commun zéro / col1
    var py;
    if (numbers.length === 1) {
      // Plein [0] : centre de la cellule zéro
      return {
        x: ((zeroRect.left + zeroRect.right) / 2 - overlayRect.left) / overlayRect.width  * 100,
        y: ((zeroRect.top  + zeroRect.bottom) / 2 - overlayRect.top)  / overlayRect.height * 100
      };
    } else if (numbers.length === 2) {
      // Cheval [0,N] : centre vertical de la cellule N
      py = nzCells.length ? (nzCells[0].top + nzCells[0].bottom) / 2
                          : (zeroRect.top + zeroRect.bottom) / 2;
    } else if (numbers.length === 3) {
      // Transversale [0,1,2] ou [0,2,3] : bord entre les 2 numéros non-zéro
      py = nzCells.length === 2
        ? Math.min.apply(null, nzCells.map(function(c){ return c.bottom; }))
        : zeroRect.top;
    } else {
      // Carré [0,1,2,3] : coin supérieur, bord 0/col1 × bord supérieur du tapis
      py = zeroRect.top;
    }
    return {
      x: (px - overlayRect.left) / overlayRect.width  * 100,
      y: (py - overlayRect.top)  / overlayRect.height * 100
    };
  }

  // ── Bets standards (sans 0) ───────────────────────────
  var cells = [];
  numbers.forEach(function(n) {
    var el = tapEl.querySelector('[data-num="' + n + '"]');
    if (el) cells.push(el.getBoundingClientRect());
  });
  if (!cells.length) return { x: 50, y: 50 };

  var L = Math.min.apply(null, cells.map(function(c){ return c.left;   }));
  var R = Math.max.apply(null, cells.map(function(c){ return c.right;  }));
  var T = Math.min.apply(null, cells.map(function(c){ return c.top;    }));
  var B = Math.max.apply(null, cells.map(function(c){ return c.bottom; }));

  // Transversale (3 nums) et sixain (6 nums) → bord supérieur du groupe
  var py = (numbers.length === 3 || numbers.length === 6) ? T : (T + B) / 2;

  return {
    x: ((L + R) / 2 - overlayRect.left) / overlayRect.width  * 100,
    y: (py            - overlayRect.top)  / overlayRect.height * 100
  };
}

// ── Rendu des chips via le DOM ────────────────────────
// tapEl = élément DOM du tapis (contient les [data-num="N"])
function renderChips(overlayEl, bets, tapEl) {
  overlayEl.innerHTML = '';
  var overlayRect = overlayEl.getBoundingClientRect();
  bets.forEach(function(bet) {
    var pos  = chipPosFromDOM(bet.numbers, tapEl, overlayRect);
    var chip = document.createElement('div');
    chip.className   = 'rt-chip rt-chip-' + bet.type.id;
    chip.style.left  = pos.x + '%';
    chip.style.top   = pos.y + '%';
    chip.textContent = bet.chips;
    overlayEl.appendChild(chip);
  });
}

// ── Utilitaires ───────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
