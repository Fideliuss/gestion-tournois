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

// ── Espace Training : croupiers fictifs et leurs sessions d'entraînement (80 jours avant le 14 octobre 2026) ──

const T_CROUPIERS = ['emma.delmas', 'hugo.jacquot', 'lina.maurin', 'noah.pelletier', 'jade.roussel', 'theo.simonet', 'lou.thibaut', 'axel.vidal'];
// module : [game, nombre de questions, niveaux ?, part de réussite habituelle (0-1), poids (fréquence de jeu)]
const T_MODULES = [
  ['blackjack', 10, false, 0.86, 6], ['blackjack-score', 10, true, 0.72, 8], ['roulette-paiement', 10, true, 0.68, 8], ['roulette-conversion', 10, true, 0.7, 5],
  ['roulette-couleur', 15, true, 0.88, 4], ['roulette-pointage', 10, true, 0.74, 5], ['roulette-tables', 20, false, 0.9, 6],
  ['uth-main', 10, false, 0.8, 4], ['uth-gagnant', 10, false, 0.78, 3], ['uth-gains', 10, false, 0.62, 3],
];

/** { croupiers: [{ id, label }], sessions: [...] } ; id au format uuid (le premier est l'utilisateur de démonstration) */
function entrainement() {
  const rnd = prng(31), now = new Date(2026, 9, 14, 20, 0, 0).getTime();
  const croupiers = T_CROUPIERS.map(function (l, i) { return { id: 'a0000000-0000-4000-8000-00000000000' + (i + 1), label: l, niveau: 0.62 + rnd() * 0.5, actif: i < 6 ? 1 : 0.15 }; });
  const sessions = [];
  let id = 1;
  croupiers.forEach(function (c, ci) {
    const n = Math.round((c.actif === 1 ? 45 : 5) * (0.6 + rnd() * 0.8));
    for (let k = 0; k < n; k++) {
      const m = (function () { const tot = T_MODULES.reduce(function (a, x) { return a + x[4]; }, 0); let r = rnd() * tot; for (let j = 0; j < T_MODULES.length; j++) { r -= T_MODULES[j][4]; if (r <= 0) return T_MODULES[j]; } return T_MODULES[0]; })();
      const age = Math.floor(Math.pow(rnd(), 1.4) * (c.actif === 1 ? 80 : 60)) + (c.actif === 1 ? 0 : 20);
      const when = new Date(now - age * 86400000); when.setHours(19 + Math.floor(rnd() * 4), Math.floor(rnd() * 60), 0, 0);
      const progres = Math.max(0.6, 1 - age / 200);                          // on s'améliore avec le temps
      const level = m[2] ? ['facile', 'medium', 'expert'][Math.floor(rnd() * 3)] : null;
      const part = Math.max(0.2, Math.min(1, m[3] * (0.45 + 0.6 * c.niveau * progres) - (level === 'expert' ? 0.12 : level === 'medium' ? 0.05 : 0) + (rnd() - 0.5) * 0.2));
      const total = m[1], correct = Math.min(total, Math.max(0, Math.round(total * part)));
      const meta = {};
      if (level) meta.level = level;
      if (m[0] === 'roulette-tables') { meta.ratio = [35, 17, 11, 8, 5][Math.floor(rnd() * 5)]; meta.elapsedMs = Math.round((55 + rnd() * 90) * 1000); }
      if (m[0] === 'roulette-conversion') meta.chipValue = [2.5, 5, 10, 20][Math.floor(rnd() * 4)];
      sessions.push({ id: id++, user_id: c.id, user_label: c.label, game: m[0], started_at: when.toISOString(), ended_at: new Date(when.getTime() + 180000).toISOString(), total: total, correct: correct, meta: meta });
    }
  });
  sessions.sort(function (a, b) { return a.started_at < b.started_at ? 1 : -1; });
  return { croupiers: croupiers.map(function (c) { return { id: c.id, label: c.label }; }), sessions: sessions };
}

/** Règlement TDA fictif pour les captures : AUCUN texte du vrai règlement (le dépôt est public). Format de la table tda_blocs.
 *  Dans un texte, {r3/B|règle 3-B} devient un renvoi (cible r3, point B) dont le libellé est « règle 3-B ». */
function tda() {
  const el = function (t, n, texte, extra) {
    let out = '', renvois = [], pos = 0, m;
    const re = /\{([a-z0-9_]+)(?:\/([A-Z]))?\|([^}]+)\}/g;
    while ((m = re.exec(texte))) {
      out += texte.slice(pos, m.index); const a = out.length; out += m[3];
      const r = { a: a, b: out.length, cible: m[1], sous: m[2] || null };
      if (extra && extra.verifier) r.verifier = extra.verifier;
      renvois.push(r); pos = m.index + m[0].length;
    }
    out += texte.slice(pos);
    const e = { t: t, texte: out }; if (n) e.n = n; if (renvois.length) e.renvois = renvois;
    return e;
  };
  const regle = function (num, section, titre, elements) { return { id: 'r' + num, kind: 'regle', numero: String(num), section: section, titre: titre, ordre: num, data: { elements: elements } }; };
  const blocs = [
    regle(1, 's1', 'Exemple de règle simple', [el('p', null, "Texte d'exemple pour illustrer une règle courte. Il n'a aucune valeur : seul le règlement officiel fait foi.")]),
    regle(2, 's1', 'Exemple de règle avec renvoi', [
      el('pt', 'A', "Texte d'exemple : une phrase peut renvoyer à une autre règle, comme ici la {r3/B|règle 3-B}. Un clic sur le renvoi ouvre la règle et surligne le point."),
      el('pt', 'B', "Un mot du glossaire, comme blind ou tapis, est souligné : un clic affiche sa définition."),
    ]),
    regle(3, 's2', 'Exemple de règle en plusieurs points', [
      el('pt', 'A', "Premier point d'exemple, à lire avec la {r2/A|règle 2-A}. Voir exemples."),
      el('pt', 'B', "Deuxième point d'exemple : le joueur annonce son action avant le flop. Les points sont repérés par une lettre."),
      el('note', null, "Note d'exemple : les remarques du règlement sont présentées sur un fond distinct."),
      el('pt', 'C', "Troisième point d'exemple, avec un showdown fictif."),
    ]),
    regle(4, 's2', 'Exemple de règle avec renvoi à vérifier', [
      el('p', null, "Texte d'exemple : ce renvoi vers la {r1|règle 1}", { verifier: { note: "Le numéro cité dans la traduction semble erroné : ce renvoi est signalé pour vérification.", attendu: 'r3' } }),
    ]),
    { id: 'ex_3_1', kind: 'exemple', numero: '3', section: 'ex', titre: "Exemple d'illustration de la règle 3", ordre: 20, data: { regle: '3', elements: [el('p', null, "Exemple fictif : joueur-A annonce son action, joueur-B répond. Les exemples se replient et se déplient.")] } },
    { id: 'rp_intro', kind: 'rp_intro', numero: '', section: 'rp', titre: 'Procédures recommandées (exemple)', ordre: 30, data: { elements: [el('p', null, "Texte d'introduction fictif des procédures recommandées. Voir la {r1|règle 1}.")] } },
    { id: 'rp1', kind: 'rp', numero: 'RP-1', section: 'rp', titre: 'Exemple de procédure', ordre: 31, data: { elements: [el('p', null, "Texte d'exemple d'une procédure recommandée."), el('pt', 'A', "Premier point d'exemple de la procédure."), el('pt', 'B', "Second point d'exemple de la procédure.")] } },
    { id: 'rp2', kind: 'rp', numero: 'RP-2', section: 'rp', titre: "Autre exemple de procédure", ordre: 32, data: { elements: [el('p', null, "Autre texte d'exemple, à la suite de la première procédure.")] } },
  ];
  const termes = [['Blind', 'Mise forcée posée avant la distribution.'], ['Flop', 'Les trois premières cartes communes.'], ['Showdown', 'Abattage des mains en fin de partie.'], ['Tapis', 'Mise de tous ses jetons (all-in).']];
  termes.forEach(function (t, i) { blocs.push({ id: 'g_' + (i + 1), kind: 'glossaire', numero: '', section: 'gl', titre: t[0], ordre: 40 + i, data: { groupe: 'Termes de jeu', definition: t[1] } }); });
  return {
    edition: { id: 'exemple', libelle: "Règles d'exemple", date_publication: '2026-01-01', traduction: 'Traducteur fictif', active: true,
      introduction: "Édition fictive : ces textes illustrent l'aide, ils ne sont pas ceux du règlement.",
      mention: 'TDA rules used by permission of the Poker TDA, Copyright 2026, http://www.pokertda.com, All rights reserved.',
      sections: [{ id: 's1', titre: 'Concepts généraux', ordre: 1 }, { id: 's2', titre: 'Mises et relances', ordre: 2 }] },
    blocs: blocs,
  };
}

module.exports = { tda: tda, planning: planning, octimeTsv: octimeTsv, entrainement: entrainement, joueurs: joueurs, saison: saison, extras: extras, encadrement: encadrement, courriersGabarits: courriersGabarits };
