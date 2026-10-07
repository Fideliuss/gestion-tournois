// ══════════════════════════════════════════════════════
//  BREAK LIST - cœur de calcul (sans accès au DOM ni à la base)
//  · lecture du planning mensuel (CSV) et de l'extraction Octime (texte collé, CSV ou lignes d'un classeur)
//  · rapprochement des noms entre le planning et Octime
//  · répartition du soir (stackers, compteurs, cartes, salle, départs)
//  Chargé par les pages de l'espace ; testable sous Node (module.exports en bas de fichier).
// ══════════════════════════════════════════════════════

const BL_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const BL_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Réglages par défaut : tout se modifie dans la page « Réglages » et s'enregistre dans la base (clé 'config')
const BL_DEFAULT_CONFIG = {
  // Grades du planning, du plus haut au plus bas (l'ordre sert au tri de la break list) ; `chef` : peut être le chef des stackers ou de la salle
  grades: [
    { code: 'CT',  label: 'Chef de table',        color: '#FF9900', chef: true  },
    { code: 'SCT', label: 'Sous-chef de table',   color: '#00FF00', chef: true  },
    { code: '1E',  label: 'Croupier 1er échelon', color: '#CC99FF', chef: false },
    { code: '2E',  label: 'Croupier 2e échelon',  color: '#FFFF00', chef: false },
    { code: '3E',  label: 'Croupier 3e échelon',  color: '#00FFFF', chef: false },
    { code: 'DEB', label: 'Croupier débutant',    color: '#EA4335', chef: false },
  ],
  // Codes du planning qui signifient « présent ce soir » ; tout autre code (R, CP, M, ABS, case vide...) = absent
  //   groupe : '20h' (arrivé à 19h55), '21h' (arrivé à 20h55), 'depart' (part en premier, sans poste)
  //   floor  : le salarié est le floor du soir (repéré « T » sur la break list)
  codes: [
    { code: '19:55', groupe: '20h',    floor: false },
    { code: '20:55', groupe: '21h',    floor: false },
    { code: '20:30', groupe: '21h',    floor: true  },
    { code: '16:30', groupe: 'depart', floor: true  },
  ],
  // Répartition : nombre de personnes par poste proposé à l'ouverture
  postes: { stackers: 5, cartes: 2, compteurs: 1, salle: false },
  // Break list imprimable
  breaklist: {
    colonnes: 24,          // colonnes libres du recto (un « instant T » efface le précédent)
    blocs: 2,              // nombre de fois que la liste des présents est répétée sur le recto
    floorMarque: 'T',
    colonnesVerso: 3,      // colonnes du tableau de situation des tables
    // Verso : une ligne par table ou total ; une ligne qui commence par « TOTAL » devient une ligne de total
    tables: ['201', '202', '203', '204', 'TOTAL RA',
             '301', '302', '303', '305', 'TOTAL BJ',
             '1501', '1502', 'TOTAL UTH', 'TOTAL JDT',
             'RAE 800', 'RAE 801', 'TOTAL RAE',
             'BJE 1600', 'BJE 1800', 'TOTAL BJE', 'TOTAL GEN'],
  },
  affichage: 'PRENOM_N',   // « Prénom N. (+16h50) » ou « N. Prénom (+16h50) » (N_PRENOM)
  bascule: 6,              // avant cette heure, « aujourd'hui » est encore la soirée de la veille
  aliases: {},             // rapprochement manuel planning → Octime : { 'NOM PRENOM du planning': 'NOM PRENOM Octime' }
};

// ── Texte ────────────────────────────────────────────

/** Majuscules sans accent ni ponctuation, espaces simples : sert à comparer des noms */
function blNorm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ').trim();
}

/** Découpe un texte délimité (guillemets gérés) en tableau de lignes */
function blParseDelimited(text, delim) {
  const rows = [];
  let row = [], cell = '', q = false;
  const s = String(text).replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Octets d'un fichier en texte : UTF-8, ou Windows-1252 si des caractères ne passent pas (CSV d'Octime et d'Excel français) */
function blDecodeText(buf) {
  let t = new TextDecoder('utf-8').decode(buf);
  if (t.indexOf('�') >= 0) t = new TextDecoder('windows-1252').decode(buf);
  return t;
}

function blDetectDelim(text) {
  const first = String(text).split(/\r?\n/).find(function (l) { return l.trim(); }) || '';
  const n = function (c) { return first.split(c).length - 1; };
  if (n('\t') >= 2) return '\t';
  return n(';') > n(',') ? ';' : ',';
}

// ── Planning mensuel (CSV) ───────────────────────────

/**
 * Lit le CSV du planning. Format attendu : une ligne « octobre 2026 » (mois et année), une ligne des numéros de jour,
 * puis une ligne par salarié : grade, nom, prénom, un code par jour. Les lignes de totaux (Effectif...) sont ignorées.
 * @returns {{year:number, month:number, days:number, rows:{grade:string, nom:string, prenom:string, codes:string[]}[]}}
 */
function blParsePlanning(text) {
  const rows = blParseDelimited(String(text).replace(/^﻿/, ''), blDetectDelim(text));
  let month = null, year = null, dayRow = -1, firstCol = 0;
  for (let i = 0; i < Math.min(rows.length, 12) && dayRow < 0; i++) {
    rows[i].forEach(function (c) {
      const m = /^\s*([A-Za-zÀ-ÿ]+)\s+(\d{4})\s*$/.exec(c || '');
      if (m && month == null) {
        const k = BL_MOIS.indexOf(m[1].toLowerCase());
        if (k >= 0) { month = k + 1; year = Number(m[2]); }
      }
    });
    // ligne des jours : des entiers 1, 2, 3... consécutifs
    const c0 = rows[i].findIndex(function (c) { return String(c).trim() === '1'; });
    if (c0 >= 0 && String(rows[i][c0 + 1] || '').trim() === '2') { dayRow = i; firstCol = c0; }
  }
  if (month == null) throw new Error('Mois introuvable : le fichier doit contenir une cellule du type « octobre 2026 ».');
  if (dayRow < 0) throw new Error('Ligne des jours introuvable (1, 2, 3...).');
  let days = 0;
  while (/^\d+$/.test(String(rows[dayRow][firstCol + days] || '').trim())) days++;
  const out = [];
  for (let i = dayRow + 1; i < rows.length; i++) {
    const r = rows[i], grade = String(r[0] || '').trim().toUpperCase(), nom = String(r[1] || '').trim();
    if (!grade && !nom) { if (out.length) break; else continue; }
    if (!grade || !nom) continue;                       // ligne de total (« Effectif 20h »...) : pas de grade
    const codes = [];
    for (let d = 0; d < days; d++) codes.push(String(r[firstCol + d] || '').trim());
    out.push({ grade: grade, nom: nom, prenom: String(r[2] || '').trim(), codes: codes });
  }
  if (!out.length) throw new Error('Aucun salarié trouvé dans le planning.');
  return { year: year, month: month, days: days, rows: out };
}

function blMonthKey(year, month) { return year + '-' + String(month).padStart(2, '0'); }

/** Cases qui diffèrent entre deux plannings du même mois : liste de { nom, prenom, jour, avant, apres } */
function blDiffPlanning(oldP, newP) {
  const out = [], key = function (r) { return blNorm(r.nom + ' ' + r.prenom); };
  const old = {};
  (oldP ? oldP.rows : []).forEach(function (r) { old[key(r)] = r; });
  const seen = {};
  newP.rows.forEach(function (r) {
    seen[key(r)] = true;
    const o = old[key(r)];
    if (!o) { out.push({ nom: r.nom, prenom: r.prenom, jour: null, avant: null, apres: 'nouveau' }); return; }
    if (o.grade !== r.grade) out.push({ nom: r.nom, prenom: r.prenom, jour: null, avant: o.grade, apres: r.grade });
    for (let d = 0; d < Math.max(o.codes.length, r.codes.length); d++) {
      if ((o.codes[d] || '') !== (r.codes[d] || '')) out.push({ nom: r.nom, prenom: r.prenom, jour: d + 1, avant: o.codes[d] || '', apres: r.codes[d] || '' });
    }
  });
  Object.keys(old).forEach(function (k) { if (!seen[k]) out.push({ nom: old[k].nom, prenom: old[k].prenom, jour: null, avant: 'présent', apres: 'retiré' }); });
  return out;
}

// ── Présents d'un jour ───────────────────────────────

/** Statut d'un code du planning : { groupe: '20h' | '21h' | 'depart' | null, floor } ; null = absent */
function blStatut(code, config) {
  const c = String(code || '').trim();
  const k = config.codes.find(function (x) { return x.code === c; });
  return k ? { groupe: k.groupe, floor: !!k.floor } : { groupe: null, floor: false };
}

/** Codes qui ressemblent à une heure (« 21:15 ») sans être dans les réglages : sûrement un oubli à déclarer */
function blCodesInconnus(planning, config) {
  const known = {}, out = {};
  config.codes.forEach(function (k) { known[k.code] = true; });
  planning.rows.forEach(function (r) {
    r.codes.forEach(function (c) { if (/^\d{1,2}[:h]\d{2}$/.test(c) && !known[c]) out[c] = (out[c] || 0) + 1; });
  });
  return Object.keys(out).sort().map(function (c) { return { code: c, nb: out[c] }; });
}

/**
 * Présents du jour (1 à N), dans l'ordre du planning.
 * @returns {{id:string, nom:string, prenom:string, grade:string, code:string, groupe:string, floor:boolean, chef:boolean, color:string, rang:number}[]}
 */
function blPresents(planning, day, config) {
  const out = [];
  planning.rows.forEach(function (r, i) {
    const code = r.codes[day - 1] || '', st = blStatut(code, config);
    if (!st.groupe) return;
    const gi = config.grades.findIndex(function (g) { return g.code === r.grade; });
    const g = gi >= 0 ? config.grades[gi] : null;
    out.push({
      id: blNorm(r.nom + ' ' + r.prenom), nom: r.nom, prenom: r.prenom, grade: r.grade, code: code,
      groupe: st.groupe, floor: st.floor, chef: !!(g && g.chef), color: g ? g.color : '#cccccc',
      rang: gi >= 0 ? gi : 999, ordre: i,
    });
  });
  return out;
}

// ── Extraction Octime ────────────────────────────────

/** Durée en minutes : « 27:10 », « -27:10 », « 27:10:00 », « 27h10 », « 1 day, 7:05:00 », ou nombre de jours (classeur) */
function blDureeMinutes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? Math.round(v * 1440) : null;
  const s = String(v).trim().replace(/−|–/g, '-');
  let m = /^([+-])?\s*(?:(\d+)\s*(?:days?|jours?|j)\s*,?\s*)?(\d+):(\d{2})(?::(\d{2}))?$/i.exec(s);
  if (m) {
    const neg = m[1] === '-', j = m[2] ? Number(m[2]) : 0, base = Number(m[3]) * 60 + Number(m[4]);
    if (m[2]) return neg ? -(j * 1440) + base : j * 1440 + base;     // « -1 day, 14:20:00 » (jour négatif + heures positives)
    return neg ? -base : base;
  }
  m = /^([+-])?\s*(\d+)\s*h\s*(\d{2})?$/i.exec(s);
  if (m) { const t = Number(m[2]) * 60 + Number(m[3] || 0); return m[1] === '-' ? -t : t; }
  return null;
}

/**
 * Lit les lignes de l'extraction Octime (tableau de lignes de cellules) : repère l'en-tête (« Nom Prénom », « = Delta Quota »).
 * @returns {{nom:string, matricule:string, minutes:number|null}[]}
 */
function blOctimeRows(rows) {
  let h = -1, cN = -1, cD = -1, cM = -1, cA = -1;
  for (let i = 0; i < Math.min(rows.length, 10) && h < 0; i++) {
    const cells = rows[i].map(function (c) { return blNorm(c); });
    const n = cells.findIndex(function (c) { return c === 'NOM PRENOM'; });
    let d = cells.findIndex(function (c) { return c === 'DELTA QUOTA'; });      // « = Delta Quota » : les autres colonnes ont un mot de plus
    if (d < 0) {                                                                 // l'en-tête commence par « = » : un tableur peut l'avoir pris pour une formule (#ERROR!)
      const prec = cells.findIndex(function (c) { return /DELTA QUOTA PRECEDENT$/.test(c); });
      if (prec >= 0) d = prec + 1;
    }
    if (n >= 0 && d >= 0) {
      h = i; cN = n; cD = d;
      cM = cells.findIndex(function (c) { return c === 'MATRICULE'; });
      cA = cells.findIndex(function (c) { return c === 'AU'; });         // fin de période : date d'arrêté de l'extraction
    }
  }
  if (h < 0) throw new Error('En-têtes introuvables : l\'extraction doit contenir les colonnes « Nom Prénom » et « = Delta Quota ».');
  const byName = {}, out = [];
  for (let i = h + 1; i < rows.length; i++) {
    const nom = String(rows[i][cN] == null ? '' : rows[i][cN]).trim();
    if (!nom) continue;
    const row = {
      nom: nom, minutes: blDureeMinutes(rows[i][cD]),
      matricule: cM >= 0 ? String(rows[i][cM] == null ? '' : rows[i][cM]).trim().replace(/\.0$/, '') : '',
      au: cA >= 0 ? blDateFr(rows[i][cA]) : null,
    };
    // Un salarié peut figurer sur plusieurs lignes (changement de période) : on garde la période qui finit le plus tard
    const k = blNorm(nom), prev = byName[k];
    if (prev == null) { byName[k] = out.length; out.push(row); }
    else if ((row.au || 0) >= (out[prev].au || 0)) out[prev] = row;
  }
  if (!out.length) throw new Error('Aucune ligne de salarié dans l\'extraction.');
  return out;
}

/** « 07/01/2026 » (ou un nombre de jours de classeur) vers un horodatage ; null si illisible */
function blDateFr(v) {
  if (typeof v === 'number') return isFinite(v) && v > 20000 ? Date.UTC(1899, 11, 30) + Math.round(v) * 86400000 : null;
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(String(v == null ? '' : v));
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

/** Date d'arrêté de l'extraction : la fin de période la plus tardive (horodatage ou null) */
function blOctimeArrete(rows) {
  const ds = rows.map(function (r) { return r.au; }).filter(function (x) { return x != null; });
  return ds.length ? Math.max.apply(null, ds) : null;
}

/** Texte collé (depuis un tableur) ou fichier CSV */
function blParseOctime(text) {
  return blOctimeRows(blParseDelimited(String(text).replace(/^﻿/, ''), blDetectDelim(text)));
}

// ── Rapprochement planning ↔ Octime ──────────────────

/** Jetons d'un prénom : « J.Baptiste » → ['J', 'BAPTISTE'] ; « Jean-Baptiste » → ['JEAN', 'BAPTISTE'] */
function blTokens(prenom) {
  return String(prenom).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
}

/**
 * Associe chaque présent à sa ligne Octime. Ordre : rapprochement manuel (aliases), nom complet identique,
 * puis « le nom d'Octime commence par le nom du planning et chaque jeton de prénom en est le début » (J.Baptiste → JEAN BAPTISTE).
 * @returns {{match: Object<string, {octime: object, exact: boolean}>, manquants: object[], ambigus: {p: object, candidats: object[]}[]}}
 */
function blRapprocher(personnes, octime, aliases) {
  const norm = octime.map(function (o) { return { o: o, n: blNorm(o.nom) }; });
  const match = {}, manquants = [], ambigus = [];
  personnes.forEach(function (p) {
    const nom = blNorm(p.nom), full = blNorm(p.nom + ' ' + p.prenom), rev = blNorm(p.prenom + ' ' + p.nom);
    const al = aliases && aliases[full];
    if (al) {
      const hit = norm.find(function (x) { return x.n === blNorm(al); });
      if (hit) { match[p.id] = { octime: hit.o, exact: true }; return; }
    }
    const ex = norm.filter(function (x) { return x.n === full || x.n === rev; });
    if (ex.length === 1) { match[p.id] = { octime: ex[0].o, exact: true }; return; }
    const tk = blTokens(p.prenom);
    const cand = norm.filter(function (x) {
      if (x.n !== nom && x.n.indexOf(nom + ' ') !== 0) return false;
      const rest = blTokens(x.n.slice(nom.length));
      if (!tk.length) return rest.length === 0;
      return tk.length <= rest.length && tk.every(function (t, i) { return rest[i].indexOf(t) === 0; });
    });
    if (cand.length === 1) match[p.id] = { octime: cand[0].o, exact: false };
    else if (cand.length > 1) ambigus.push({ p: p, candidats: cand.map(function (x) { return x.o; }) });
    else manquants.push(p);
  });
  return { match: match, manquants: manquants, ambigus: ambigus };
}

// ── Affichage ────────────────────────────────────────

/** « Téo L. » (PRENOM_N) ou « L. Téo » (N_PRENOM) ; prénom composé abrégé : Jean-Baptiste → J-B */
function blNomCourt(p, style) {
  const prenomBrut = String(p.prenom || '').trim(), nom = String(p.nom || '').trim();
  const initiale = nom ? nom.charAt(0).toUpperCase() : '';
  const cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); };
  let prenom = prenomBrut.split(/([-'. ])/).map(function (w, i) { return i % 2 ? w : (w ? cap(w) : w); }).join('');
  if (prenomBrut.indexOf('-') >= 0) prenom = prenomBrut.split('-').map(function (w) { return w.charAt(0).toUpperCase(); }).join('-');
  if (!initiale) return prenom || nom;
  if (!prenom) return cap(nom);
  return style === 'N_PRENOM' ? initiale + '. ' + prenom : prenom + ' ' + initiale + '.';
}

/** Delta : « +16h50 », « -2h », « +0h » */
function blDeltaH(minutes) {
  if (minutes == null || isNaN(minutes)) return '?';
  const abs = Math.abs(Math.round(minutes)), h = Math.floor(abs / 60), m = abs % 60;
  return (minutes < 0 ? '-' : '+') + h + 'h' + (m ? String(m).padStart(2, '0') : '');
}

// ── Répartition du soir ──────────────────────────────

/**
 * Répartit les présents. Reprend la logique du script Google Sheets (v3) :
 *   · tri par delta croissant ; les 21h remplissent les postes en priorité, les 20h complètent (sauf stackers) ;
 *   · stackers : les plus bas de la liste 21h, avec exactement 1 chef ;
 *   · compteurs puis cartes : croupiers d'abord, chefs en dernier recours ;
 *   · salle (facultatif) : 1 chef ; départs : ceux qui restent, delta le plus haut d'abord (21h puis 20h) ;
 *   · groupe 'depart' (ex. floor du dimanche) : en tête des départs, sans poste.
 * @param {{id:string, chef:boolean, groupe:string, delta:number}[]} personnes
 * @param {{stackers:number, cartes:number, compteurs:number, salle:boolean}} opts
 * @returns {{stackers:object[], compteurs:object[], cartes:object[], salle:object[], departs:object[], warnings:string[]}}
 */
function blRepartir(personnes, opts) {
  const o = Object.assign({ stackers: 5, cartes: 2, compteurs: 1, salle: false }, opts || {});
  const warnings = [];
  const sorted = personnes.map(function (p, i) { return Object.assign({ _i: i }, p); })
    .filter(function (p) { return p.groupe === '20h' || p.groupe === '21h' || p.groupe === 'depart'; })
    .sort(function (a, b) { return ((a.delta || 0) - (b.delta || 0)) || (a._i - b._i); });
  let pool21 = sorted.filter(function (p) { return p.groupe === '21h'; });
  let pool20 = sorted.filter(function (p) { return p.groupe === '20h'; });
  const premiers = sorted.filter(function (p) { return p.groupe === 'depart'; }).reverse();

  const remove = function (pool, picked) {
    const set = {}; picked.forEach(function (x) { set[x.id] = true; });
    return pool.filter(function (x) { return !set[x.id]; });
  };
  const uniq = function (arr) {
    const seen = {};
    return arr.filter(function (x) { if (!x || seen[x.id]) return false; seen[x.id] = true; return true; });
  };

  // Stackers : exactement 1 chef (mêmes règles que le script)
  const stackers = (function () {
    let picked = pool21.slice(0, o.stackers);
    if (picked.length && !picked.some(function (x) { return x.chef; })) {
      const dispo = pool21.filter(function (x) { return x.chef; }).find(function (x) { return !picked.some(function (p) { return p.id === x.id; }); });
      if (dispo) picked[picked.length - 1] = dispo;
      else warnings.push('Stackers Haut : aucun chef disponible.');
    } else if (!picked.length && o.stackers > 0) warnings.push('Stackers Haut : aucun chef disponible.');
    let chefs = picked.filter(function (x) { return x.chef; }).length;
    const names = {}; picked.forEach(function (x) { names[x.id] = true; });
    const nonChefs = pool21.filter(function (x) { return !x.chef && !names[x.id]; }).reverse();     // les 20h ne servent jamais aux stackers
    for (let i = 0; i < picked.length && chefs > 1; i++) {
      if (picked[i].chef) {
        const rem = nonChefs.shift();
        if (!rem) { warnings.push('Stackers : impossible de limiter à 1 chef.'); break; }
        picked[i] = rem; chefs--;
      }
    }
    picked = uniq(picked);
    if (picked.length < o.stackers) warnings.push('Stackers Haut : seulement ' + picked.length + '/' + o.stackers + ' disponible(s).');
    return picked;
  })();
  pool21 = remove(pool21, stackers);

  // Compteurs et cartes : croupiers 21h, chefs 21h, croupiers 20h, chefs 20h
  const pickPoste = function (n, label) {
    const cand = pool21.filter(function (x) { return !x.chef; }).concat(pool21.filter(function (x) { return x.chef; }),
      pool20.filter(function (x) { return !x.chef; }), pool20.filter(function (x) { return x.chef; }));
    const picked = uniq(cand).slice(0, n);
    if (picked.length < n) warnings.push(label + ' : seulement ' + picked.length + '/' + n + ' disponible(s).');
    pool21 = remove(pool21, picked); pool20 = remove(pool20, picked);
    return picked;
  };
  const compteurs = pickPoste(o.compteurs, 'Compteurs');
  const cartes = pickPoste(o.cartes, 'Cartes');

  let salle = [];
  if (o.salle) {
    const chef = pool21.find(function (x) { return x.chef; }) || pool20.find(function (x) { return x.chef; });
    if (chef) { salle = [chef]; pool21 = remove(pool21, salle); pool20 = remove(pool20, salle); }
    else warnings.push('Salle : aucun chef disponible.');
  }

  const departs = premiers.concat(pool21.slice().reverse(), pool20.slice().reverse());
  return { stackers: stackers, compteurs: compteurs, cartes: cartes, salle: salle, departs: departs, warnings: warnings };
}

// ── Break list imprimable ────────────────────────────

/** Présents classés par grade (ordre des réglages) puis par ordre du planning */
function blOrdreBreakList(presents) {
  return presents.slice().sort(function (a, b) { return (a.rang - b.rang) || (a.ordre - b.ordre); });
}

/** Lignes du verso : { label, total } */
function blLignesVerso(config) {
  return (config.breaklist.tables || []).map(function (l) { return String(l).trim(); }).filter(Boolean)
    .map(function (l) { return { label: l, total: /^TOTAL\b/i.test(l) }; });
}

/** Jour (1 à 31) et mois de « aujourd'hui », avant l'heure de bascule on est encore sur la soirée de la veille */
function blAujourdhui(now, config) {
  const d = new Date(now || Date.now());
  if (d.getHours() < (config && config.bascule != null ? config.bascule : 6)) d.setDate(d.getDate() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), date: d };
}

if (typeof module !== 'undefined') {
  module.exports = {
    BL_MOIS: BL_MOIS, BL_JOURS: BL_JOURS, BL_DEFAULT_CONFIG: BL_DEFAULT_CONFIG,
    blNorm: blNorm, blParseDelimited: blParseDelimited, blParsePlanning: blParsePlanning, blMonthKey: blMonthKey,
    blDiffPlanning: blDiffPlanning, blStatut: blStatut, blCodesInconnus: blCodesInconnus, blPresents: blPresents,
    blDureeMinutes: blDureeMinutes, blOctimeRows: blOctimeRows, blParseOctime: blParseOctime, blRapprocher: blRapprocher,
    blNomCourt: blNomCourt, blDeltaH: blDeltaH, blRepartir: blRepartir, blOrdreBreakList: blOrdreBreakList,
    blLignesVerso: blLignesVerso, blAujourdhui: blAujourdhui, blDecodeText: blDecodeText, blDateFr: blDateFr, blOctimeArrete: blOctimeArrete,
  };
}
