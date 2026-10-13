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

// ── Espace Tournois : joueurs, saison, extras, encadrement et courriers fictifs ──

const J_NOMS = ['ARNAUD', 'BERTRAND', 'CHEVALIER', 'DELMAS', 'ESTEVE', 'FOURNIER', 'GALLAND', 'HERVIEUX', 'IMBERT', 'JACQUOT', 'KELLER', 'LACROIX', 'MAURIN', 'NOEL',
  'OLIVIER', 'PELLETIER', 'QUERE', 'ROUSSEL', 'SIMONET', 'THIBAUT', 'URBAIN', 'VIDAL', 'WALTER', 'YVON', 'ZANETTI', 'BOUCHER', 'CARON', 'DUVAL', 'FAURE', 'GAUDIN',
  'HUBERT', 'JULLIEN', 'LEGRAND', 'MOREAU', 'NICOLAS', 'OLLIVIER', 'PERRIN', 'RENARD', 'SAUVAGE', 'TRAN'];
const J_PRENOMS = ['ADRIEN', 'BENOIT', 'CLEMENT', 'DAMIEN', 'EMILIE', 'FABIEN', 'GREGORY', 'HELENE', 'IVAN', 'JEROME', 'KEVIN', 'LAURA', 'MATHIEU', 'NADIA', 'OLIVIA',
  'PATRICK', 'QUENTIN', 'ROMAIN', 'SABINE', 'THOMAS', 'VALENTIN', 'WILLIAM', 'XAVIER', 'YOHAN', 'ZELIE'];

/** Joueurs (NOM PRENOM en majuscules, comme dans les résultats saisis) */
function joueurs() {
  const rnd = prng(404), liste = [], vus = {};
  while (liste.length < 70) {
    const n = J_NOMS[Math.floor(rnd() * J_NOMS.length)] + ' ' + J_PRENOMS[Math.floor(rnd() * J_PRENOMS.length)];
    if (!vus[n]) { vus[n] = 1; liste.push(n); }
  }
  return liste;
}

/**
 * Saison 2025 / 2026 : un tournoi les mercredis, vendredis et dimanches du 1er novembre 2025 au 13 octobre 2026.
 * `tournois` = barèmes de shared/tournaments.js ; renvoie { sessions, results } au format de la base.
 */
function saison(tournois) {
  const rnd = prng(2025), pool = joueurs(), sessions = [], results = [];
  const parJour = {};
  tournois.forEach(function (t) { (parJour[t.day] = parJour[t.day] || []).push(t); });
  const fin = new Date(2026, 9, 13);
  let semaine = 0, idS = 1, idR = 1;
  for (let d = new Date(2025, 10, 1); d <= fin; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 1) semaine++;
    if (dow !== 3 && dow !== 5 && dow !== 0) continue;
    const jour = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dow], choix = parJour[jour];
    const t = choix[semaine % choix.length];
    const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const entries = 38 + Math.floor(rnd() * 70), pris = {};
    let nb = 0;
    t.points.forEach(function (pts, i) {
      let nom;
      do { nom = pool[Math.floor(Math.pow(rnd(), 1.6) * pool.length)]; } while (pris[nom]);
      pris[nom] = 1; nb++;
      results.push({ id: idR++, date: date, tournamentId: t.id, place: i + 1, player: nom, points: pts, extra: false });
    });
    sessions.push({ id: idS++, date: date, tournamentId: t.id, entries: entries, cagnotte: entries * 2, nbResults: nb });
  }
  return { sessions: sessions, results: results };
}

const E_NOMS = ['ABADIE', 'BLANCHARD', 'COSTE', 'DUMAS', 'ETCHEVERRY', 'FARGES', 'GIRARD', 'HAMON', 'LABORDE', 'MERCIER', 'NAUDIN', 'PAGES', 'RIBEIRO', 'SALLES'];
const E_PRENOMS = ['Alexis', 'Bastien', 'Chloé', 'Dylan', 'Élodie', 'Florian', 'Gaëtan', 'Hugo', 'Inès', 'Julien', 'Karine', 'Loïc', 'Manon', 'Nicolas'];
const E_RUES = ['rue des Lilas', 'cours de la Marne', 'rue du Moulin', 'avenue des Pins', 'impasse des Acacias', 'rue Victor Hugo', 'allée des Tilleuls'];
const E_VILLES = [['33000', 'BORDEAUX'], ['33700', 'MERIGNAC'], ['33600', 'PESSAC'], ['33400', 'TALENCE'], ['33150', 'CENON']];

/** Croupiers extras fictifs (adresses inventées) */
function extras() {
  const rnd = prng(88);
  return E_NOMS.map(function (nom, i) {
    const v = E_VILLES[i % E_VILLES.length];
    return { id: 'x' + (i + 1), nom: nom, prenom: E_PRENOMS[i], dateNaissance: String(1 + Math.floor(rnd() * 27)).padStart(2, '0') + '/' + String(1 + Math.floor(rnd() * 12)).padStart(2, '0') + '/' + (1985 + Math.floor(rnd() * 20)),
      lieuNaissance: 'BORDEAUX', adresse: (3 + Math.floor(rnd() * 90)) + ' ' + E_RUES[i % E_RUES.length], codePostal: v[0], ville: v[1] };
  });
}

/** Encadrement fictif de la déclaration (prénom NOM) */
function encadrement() {
  return {
    directeurs: ['Marc ALLARD', 'Sophie BRUNET', 'Paul COUTURIER', 'Anne DELORME'],
    arbitres: ['Luc FAVRE', 'Nina GROS', 'Remi HENRY', 'Ada JOUBERT', 'Theo KLEIN', 'Lina MARTIN', 'Eric NAVET', 'Rose OUDIN'],
  };
}

/** Destinataires et signataires fictifs des courriers (à la place des vrais, par défaut dans l'application) */
function courriersGabarits() {
  const sig = 'Camille EXEMPLE';
  const base = function (recipient, salutation, formule) { return { recipient: recipient, salutation: salutation, closingFormula: formule, sigName: sig, autresItems: ['Premier destinataire en copie', 'Second destinataire en copie'] }; };
  return {
    ministre: base(['Destinataire numéro 1', 'Service des jeux', '1, rue de l\'Exemple', '75000 PARIS'], 'Madame, Monsieur,', 'Vous en souhaitant bonne réception, je vous prie de croire à l\'assurance de ma haute considération.'),
    sipj: base(['Destinataire numéro 2', 'Section des jeux', '2, rue de l\'Exemple', '33000 BORDEAUX'], null, 'Vous en souhaitant bonne réception, je vous prie de croire à l\'assurance de ma haute considération.'),
    prefecture: base(['Destinataire numéro 3', 'À l\'attention du service concerné', '3, rue de l\'Exemple', '33000 BORDEAUX'], null, 'Vous en souhaitant bonne réception, je vous prie de croire à l\'assurance de ma haute considération.'),
  };
}

module.exports = { planning: planning, octimeTsv: octimeTsv, joueurs: joueurs, saison: saison, extras: extras, encadrement: encadrement, courriersGabarits: courriersGabarits };
