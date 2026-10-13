// ══════════════════════════════════════════════════════
//  Données entièrement fictives pour les captures de la page Aide (aucune donnée réelle, aucun vrai nom)
//  Un planning d'octobre 2026 et une extraction Octime au format du vrai fichier
// ══════════════════════════════════════════════════════

const NOMS = ['MARTEL', 'DUPIN', 'CARREL', 'VASSEUR', 'LENOIR', 'FABRE', 'GIRAUD', 'PERROT', 'BONNET', 'RIVET', 'COLIN', 'MARCHAL',
  'LAMBERT', 'AUBRY', 'TESSIER', 'GILBERT', 'NAVARRO', 'PONS', 'BARBIER', 'LEMAIRE', 'MASSON', 'JOLY', 'WEBER'];
const PRENOMS = ['Alex', 'Basile', 'Camille', 'Dorian', 'Eliot', 'Farah', 'Gaëlle', 'Hugo', 'Inès', 'Jules', 'Karim', 'Léa',
  'Malo', 'Nora', 'Oscar', 'Paula', 'Quentin', 'Rosa', 'Samir', 'Tess', 'Ugo', 'Vera', 'Yann'];
// grade de chaque personne, dans l'ordre du planning
const GRADES = ['CT', 'CT', 'SCT', 'SCT', '1E', '1E', '1E', '1E', '2E', '2E', '2E', '3E', '3E', '3E', '3E', '3E', '3E', '3E', '3E', 'DEB', 'DEB', 'DEB', 'DEB'];

function prng(seed) {                                   // générateur pseudo-aléatoire reproductible
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Planning d'octobre 2026 (31 jours). La séance de référence des captures est le mercredi 14 octobre. */
function planning() {
  const rnd = prng(2026), days = 31, rows = [];
  NOMS.forEach(function (nom, i) {
    const off = Math.floor(rnd() * 7), codes = [];
    for (let d = 1; d <= days; d++) {
      const dow = new Date(2026, 9, d).getDay();        // 0 = dimanche
      const rest = ((d + off) % 7) < 2;                 // deux jours de repos par semaine
      let c = rest ? 'R' : (rnd() < 0.5 ? '19:55' : '20:55');
      if (i === 4 && !rest) c = dow === 0 ? '16:30' : '20:30';          // le floor
      codes.push(c);
    }
    rows.push({ grade: GRADES[i], nom: nom, prenom: PRENOMS[i], codes: codes });
  });
  // le mercredi 14 : des présents des deux horaires, un floor, et des absences de plusieurs types
  const j14 = { 5: 'CP', 9: 'M', 12: 'RJF', 15: '', 18: 'R', 20: 'R', 21: 'ABS', 0: '19:55', 1: '20:55', 2: '20:55', 3: '19:55', 4: '20:30', 6: '19:55', 7: '20:55',
    8: '20:55', 10: '19:55', 11: '20:55', 13: '19:55', 14: '20:55', 16: '19:55', 17: '19:55', 19: '20:55', 22: '20:55' };
  Object.keys(j14).forEach(function (k) { rows[k].codes[13] = j14[k]; });
  return { year: 2026, month: 10, days: days, rows: rows };
}

/** Extraction Octime fictive, au format du fichier réel (séparateur tabulation, comme un collage depuis un tableur), arrêtée au dimanche 18/10/2026 */
function octimeTsv() {
  const rnd = prng(7);
  const head = ['Matricule', 'Nom Prénom', 'Du', 'Au', 'Changement(s) de période', 'Delta Quota intermédiaire', 'Quota réalisé', '- Dépassements', '- Quota Dû',
    '+ Régularisations (dont HS payées)', '+ Delta Quota précédent', '= Delta Quota', 'HS TxN (RCR)', 'Etablissement (code + nom)', 'Département', 'Sce/Eq./Sect.'];
  const fmt = function (min) { const s = min < 0 ? '-' : '', a = Math.abs(min); return s + Math.floor(a / 60) + ':' + String(a % 60).padStart(2, '0') + ':00'; };
  const lignes = NOMS.map(function (nom, i) {
    const min = Math.round((rnd() * 40 - 3) * 12) * 5;          // de -3 h à +37 h, par pas de 5 minutes
    return ['5099' + String(1000 + i * 7), nom + ' ' + PRENOMS[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(), '01/11/2025', '18/10/2026', '', '0:00:00',
      '1500:00:00', '0:00:00', '1480:00:00', '0:00:00', '0:00:00', fmt(min), '0:00:00', 'ECA - BORDEAUX', 'Jeux de table', 'A définir'];
  });
  ['REYNAUD LOUIS', 'GARNIER ELSA', 'HUET MAYA', 'ROCHER THEO', 'CLEMENT ZOE'].forEach(function (n, k) {     // d'autres salariés, absents du planning
    lignes.push(['5098' + (100 + k), n, '01/11/2025', '18/10/2026', '', '0:00:00', '1400:00:00', '0:00:00', '1400:00:00', '0:00:00', '0:00:00', fmt(Math.round(rnd() * 600)), '0:00:00', 'ECA - BORDEAUX', 'Jeux de table', 'A définir']);
  });
  return [head].concat(lignes).map(function (l) { return l.join('\t'); }).join('\n');
}

module.exports = { planning: planning, octimeTsv: octimeTsv };
