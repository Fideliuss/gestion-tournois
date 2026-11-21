// ══════════════════════════════════════════════════════
//  Extraction du PDF « Poker TDA » vers un fichier JSON structuré, prêt pour l'import dans l'application
//
//  Usage (depuis la racine du site) :
//    node tda/outils/extraire_tda.js "<chemin du PDF>" [identifiant_edition] [--date AAAA-MM-JJ]
//  Exemple :
//    node tda/outils/extraire_tda.js "C:/Telechargements/TDA 2026.pdf" 2026_v1_0 --date 2026-09-06
//
//  Prérequis : Node et `pdftotext` (poppler, fourni avec Git for Windows).
//  Sortie    : tda/outils/sortie/tda_<edition>.json et rapport_<edition>.txt (dossier ignoré par git : le texte du TDA
//              ne doit JAMAIS être commité, le dépôt est public). Le JSON est ensuite importé depuis la page
//              « Éditions TDA » de l'application (réservée aux administrateurs).
//
//  Le script ne contient aucun texte du règlement. Il s'appuie sur la mise en page du PDF officiel (titres « 12 - ... »,
//  points « A) », sous-points « 1) », puces « - », notes « § » et « v », exemples « Règle 45 : ... », glossaire) et vérifie
//  que RIEN n'est perdu : le texte reconstruit à partir des données doit être identique au texte du PDF, espaces mis à part.
//  À chaque nouvelle édition du TDA (environ tous les 2 ans), relire le rapport : tout écart de structure y est signalé.
// ══════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const iDate = args.indexOf('--date');
const DATE = iDate >= 0 ? args.splice(iDate, 2)[1] : null;
const PDF = args[0];
const EDITION = args[1] || 'edition';
if (!PDF) { console.error('Usage : node tda/outils/extraire_tda.js "<chemin du PDF>" [identifiant_edition] [--date AAAA-MM-JJ]'); process.exit(1); }

const SORTIE = path.resolve(__dirname, 'sortie');
const rapport = [];
const note = s => rapport.push(s);
const avert = s => rapport.push('ATTENTION : ' + s);

// ── 1. Texte du PDF, page par page, sans le bruit de mise en page ─────────────────────────
const brut = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', PDF, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const BRUIT = [
  /^©\s*Copyright/, /layout by www\.AlineNKarl\.net/, /^\d+\/\d+\s+Poker TDA \d{4}$/, /^Poker TDA \d{4}\s+\d+\/\d+$/,
  /^Poker TDA \d{4}$/, /^POKER TOURNAMENT DIRECTORS ASSN\.$/, /^Traduction française\b/, /^Règles \d{4} Version [\d.]+\./,
];
const lignes = [];                     // { t: texte sans marge, pb: première ligne après un saut de page }
let saut = false;
brut.split('\f').forEach(function (page, i) {
  if (i > 0) saut = true;
  page.split('\n').forEach(function (l) {
    const t = l.replace(/\s+$/, '').replace(/^\s+/, '');
    if (t && BRUIT.some(function (r) { return r.test(t); })) return;
    lignes.push({ t: t, pb: t ? saut : false });
    if (t) saut = false;
  });
});
// Les « \ » isolés après un chiffre (« 700\. ») sont un défaut de conversion du PDF
let nbAntislash = 0;
lignes.forEach(function (l) { l.t = l.t.replace(/(\d)\\/g, function (m, d) { nbAntislash++; return d; }); });
if (nbAntislash) note('Correction typographique automatique : ' + nbAntislash + ' antislash parasites supprimés après un chiffre (ex. « 700\\. » devient « 700. »).');

function trouver(re, depuis, dernier) {
  let r = -1;
  for (let i = depuis || 0; i < lignes.length; i++) if (re.test(lignes[i].t)) { r = i; if (!dernier) return i; }
  return r;
}
const iCorps = trouver(/^CONCEPTS GÉNÉRAUX$/);
const iRP = trouver(/^2026 Procédures recommend/, iCorps);
const iEx = trouver(/^Exemples d'illustration$/, iRP);
const iGlo = trouver(/^GLOSSAIRE$/, iEx, true);
if ([iCorps, iRP, iEx, iGlo].some(function (i) { return i < 0; })) { console.error('Structure du PDF non reconnue (CONCEPTS GÉNÉRAUX / Procédures recommendées / Exemples / GLOSSAIRE introuvables).'); process.exit(2); }

// ── 2. Conversion de lignes en éléments (paragraphes, points A), sous-points 1), puces, notes) ─────────────
const MARQUEURS = [
  { k: 'pt',    re: /^([A-Z])\)\s+(.*)$/ },
  { k: 'sub',   re: /^(\d{1,2})\)\s+(.*)$/ },
  { k: 'li',    re: /^-\s+(.*)$/ },
  { k: 'note',  re: /^§\s+(.*)$/ },
  { k: 'note2', re: /^v\s+(.*)$/ },
];
const FIN = /[.!?:;]$/;
function elements(ls, seuil, debut) {
  const out = [];
  let cur = null, vide = true, pb = false;
  ls.forEach(function (l) {
    if (!l.t) { vide = true; return; }
    if (l.pb) pb = true;
    let m = null;
    for (let i = 0; i < MARQUEURS.length && !m; i++) { const r = MARQUEURS[i].re.exec(l.t); if (r) m = { k: MARQUEURS[i].k, r: r }; }
    if (m) {
      const e = { t: m.k };
      if (m.k === 'pt' || m.k === 'sub') { e.n = m.r[1]; e.texte = m.r[2]; } else e.texte = m.r[1];
      e.derniere = e.texte;
      out.push(e); cur = e; vide = false; pb = false; return;
    }
    // Suite d'un élément : ligne coupée, ou phrase reprise après une coupure (saut de page, ligne blanche)
    const minuscule = /^[a-zàâçéèêëîïôûùüÿœ]/.test(l.t);
    const coupure = vide || pb;
    const courte = cur && cur.derniere !== undefined && cur.derniere.length < seuil && FIN.test(cur.derniere);
    if (cur && !(debut && debut.test(l.t)) && ((!coupure && !courte) || (coupure && minuscule && !FIN.test(cur.derniere || cur.texte)))) {
      cur.texte += ' ' + l.t; cur.derniere = l.t;
    } else {
      cur = { t: 'p', texte: l.t, derniere: l.t }; out.push(cur);
    }
    vide = false; pb = false;
  });
  out.forEach(function (e) { delete e.derniere; });
  return out;
}

// ── 3. Règles 1 à 74 ────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { motif: 'CONCEPTS GÉNÉRAUX',                                         id: 's1', titre: 'Concepts généraux' },
  { motif: 'ATTRIBUTION DE SIÈGE, FERMETURE ET ÉQUILIBRAGE DES TABLES', id: 's2', titre: 'Attribution de siège, fermeture et équilibrage des tables' },
  { motif: 'POTS / SHOWDOWN',                                           id: 's3', titre: 'Pots / Showdown' },
  { motif: 'PROCÉDURES GÉNÉRALES',                                      id: 's4', titre: 'Procédures générales' },
  { motif: 'JOUEUR PRÉSENT / ÉLIGIBLE POUR UNE MAIN',                   id: 's5', titre: 'Joueur présent / éligible pour une main' },
  { motif: 'BOUTON / BLINDS',                                           id: 's6', titre: 'Bouton / blinds' },
  { motif: 'RÈGLES DE DISTRIBUTION',                                    id: 's7', titre: 'Règles de distribution' },
  { motif: 'LE JEU : BETS ET RAISES',                                   id: 's8', titre: 'Le jeu : bets et raises' },
  { motif: 'LE JEU : AUTRES',                                           id: 's9', titre: 'Le jeu : autres' },
  { motif: 'ÉTIQUETTE ET PÉNALITÉS',                                    id: 's10', titre: 'Étiquette et pénalités' },
];
const blocs = [];
const flux = [];                         // texte reconstruit, dans l'ordre du document (contrôle de non-perte)
let ordre = 0;

(function regles() {
  const zone = lignes.slice(iCorps, iRP);
  let section = null;
  // On repère les sections puis on découpe les règles
  const marq = [];                       // position des en-têtes de section dans la zone
  zone.forEach(function (l, i) { SECTIONS.forEach(function (s) { if (l.t === s.motif) marq.push({ i: i, s: s }); }); });
  if (marq.length !== SECTIONS.length) avert(marq.length + ' sections trouvées sur ' + SECTIONS.length + ' attendues.');
  const sectionDe = function (i) { let s = null; marq.forEach(function (m) { if (m.i <= i) s = m.s; }); return s; };
  let attendu = 1, courant = null, corps = [];
  const fermer = function () {
    if (!courant) return;
    const s = courant.section;
    blocs.push({ id: 'r' + courant.n, kind: 'regle', numero: String(courant.n), section: s.id, titre: courant.titre, ordre: ++ordre,
                 data: { elements: elements(corps, 75) } });
    courant = null; corps = [];
  };
  zone.forEach(function (l, i) {
    const sec = marq.find(function (m) { return m.i === i; });
    if (sec) { fermer(); flux.push(sec.s.motif); return; }
    const m = l.t && /^(\d{1,2}) - (.+)$/.exec(l.t);
    if (m && parseInt(m[1], 10) === attendu) {
      fermer(); courant = { n: attendu, titre: m[2], section: sectionDe(i) }; attendu++; flux.push(l.t);
    } else if (courant) { corps.push(l); }
  });
  fermer();
  note('Règles trouvées : ' + (attendu - 1) + ' (74 attendues pour le TDA 2026).');
  if (attendu - 1 !== 74) avert('le nombre de règles diffère de 74 : vérifier le rapport et le PDF.');
})();

// ── 4. Procédures recommandées (RP) ──────────────────────────────────────────────────────
(function procedures() {
  const zone = lignes.slice(iRP, iEx);
  // En-tête de la partie (titre) puis introduction, puis RP1 à RPnn
  let i = 0;
  const intro = [];
  while (i < zone.length && !/^RP-?1 - /.test(zone[i].t)) { if (i > 0) intro.push(zone[i]); i++; }
  const introEl = elements(intro, 75);
  blocs.push({ id: 'rp_intro', kind: 'rp_intro', numero: '', section: 'rp', titre: zone[0].t, ordre: ++ordre, data: { elements: introEl } });
  flux.push(zone[0].t);
  introEl.forEach(function (e) { flux.push(e.texte); });
  let attendu = 1, courant = null, corps = [];
  const fermer = function () {
    if (!courant) return;
    blocs.push({ id: 'rp' + courant.n, kind: 'rp', numero: 'RP-' + courant.n, section: 'rp', titre: courant.titre, ordre: ++ordre,
                 data: { elements: elements(corps, 75) } });
    courant = null; corps = [];
  };
  zone.slice(i).forEach(function (l) {
    const m = l.t && /^RP-?(\d{1,2}) - (.+)$/.exec(l.t);
    if (m && parseInt(m[1], 10) === attendu) { fermer(); courant = { n: attendu, titre: m[2] }; attendu++; flux.push(l.t); }
    else if (courant) corps.push(l);
  });
  fermer();
  note('Procédures recommandées trouvées : ' + (attendu - 1) + ' (29 attendues pour le TDA 2026).');
  if (attendu - 1 !== 29) avert('le nombre de procédures recommandées diffère de 29.');
})();

// ── 5. Exemples d'illustration ───────────────────────────────────────────────────────────
(function exemples() {
  const zone = lignes.slice(iEx + 1, iGlo);
  const REEX = /^Règle (\d{1,2})((?:-[A-Z0-9]+)*)\s*:\s*(.+)$/;
  let courant = null, corps = [];
  const fermer = function () {
    if (!courant) return;
    const ref = courant.n + courant.suffixe;
    // Un exemple commence par « Exemple … : » / « Situation … : » ; sinon la ligne prolonge le paragraphe en cours
    blocs.push({ id: 'ex_' + ref.toLowerCase().replace(/-/g, '_'), kind: 'exemple', numero: ref, section: 'ex', titre: courant.titre, ordre: ++ordre,
                 data: { regle: String(courant.n), elements: elements(corps, 90, /^(Exemple|Example|Situation)\b[^:]{0,28}:/) } });
    courant = null; corps = [];
  };
  zone.forEach(function (l) {
    const m = l.t && REEX.exec(l.t);
    if (m) { fermer(); courant = { n: parseInt(m[1], 10), suffixe: m[2], titre: m[3] }; flux.push(l.t); }
    else if (courant) corps.push(l);
  });
  fermer();
  note('Exemples d\'illustration trouvés : ' + blocs.filter(function (b) { return b.kind === 'exemple'; }).length + ' (15 attendus pour le TDA 2026).');
})();

// ── 6. Glossaire ─────────────────────────────────────────────────────────────────────────
(function glossaire() {
  const zone = lignes.slice(iGlo + 1);
  const GROUPES = ['Types de jeux', 'Positions à la table', 'Termes d\'action et styles de jeu', 'Environnement et types de tournoi'];
  let groupe = null;
  const entrees = [];
  zone.forEach(function (l) {
    if (!l.t) return;
    if (GROUPES.indexOf(l.t) >= 0) { groupe = l.t; entrees.push({ groupe: l.t, titre: true }); return; }
    const m = /^-\s+(.*)$/.exec(l.t);
    if (m) entrees.push({ groupe: groupe, texte: m[1] });
    else if (entrees.length && !entrees[entrees.length - 1].titre) entrees[entrees.length - 1].texte += ' ' + l.t;
  });
  let nb = 0;
  entrees.forEach(function (e) {
    if (e.titre) { flux.push(e.groupe); return; }
    const i = e.texte.indexOf(': ');
    const terme = i > 0 ? e.texte.slice(0, i) : e.texte, def = i > 0 ? e.texte.slice(i + 2) : '';
    nb++;
    blocs.push({ id: 'g_' + nb, kind: 'glossaire', numero: '', section: 'gl', titre: terme, ordre: ++ordre, data: { groupe: e.groupe, definition: def } });
    flux.push('- ' + e.texte);
  });
  note('Termes du glossaire : ' + nb + ' dans ' + GROUPES.length + ' groupes.');
})();

// ── 7. Renvois entre règles (positions dans le texte, résolues vers l'identifiant du bloc cible) ──────
const reRegle = /\b[Rr]ègles?\s+(\d{1,2})(?!\d)((?:-[A-Z0-9]+)*)/g;
const reSuite = /^(\s*(?:,|et|ou)\s*)(\d{1,2})(?!\d)((?:-[A-Z0-9]+)*)/;
const reRP = /\bRP-?\s?(\d{1,2})(?!\d)((?:-[A-Z0-9]+)*)/g;
function renvois(texte) {
  const r = [];
  let m;
  reRegle.lastIndex = 0;
  while ((m = reRegle.exec(texte))) {
    r.push({ a: m.index + m[0].length - (m[1].length + m[2].length), b: m.index + m[0].length, cible: 'r' + parseInt(m[1], 10), sous: m[2].replace(/^-/, '') || null });
    let fin = m.index + m[0].length, s;
    while ((s = reSuite.exec(texte.slice(fin)))) {
      const deb = fin + s[1].length;
      r.push({ a: deb, b: deb + s[2].length + s[3].length, cible: 'r' + parseInt(s[2], 10), sous: s[3].replace(/^-/, '') || null });
      fin = deb + s[2].length + s[3].length;
    }
    reRegle.lastIndex = fin;
  }
  reRP.lastIndex = 0;
  while ((m = reRP.exec(texte))) r.push({ a: m.index, b: m.index + m[0].length, cible: 'rp' + parseInt(m[1], 10), sous: m[2].replace(/^-/, '') || null });
  return r.sort(function (x, y) { return x.a - y.a; });
}

// ── 8. Contrôles : cibles existantes, sous-points existants, non-perte du texte ─────────────────────
const parId = {};
blocs.forEach(function (b) { parId[b.id] = b; });
let nbRenvois = 0, cassés = [];
const inventaire = [];
blocs.forEach(function (b) {
  const els = b.data.elements || [];
  els.forEach(function (e, idx) {
    e.renvois = renvois(e.texte);
    e.renvois.forEach(function (r) {
      nbRenvois++;
      const cible = parId[r.cible];
      let probleme = null;
      if (!cible) probleme = 'cible inexistante';
      else if (r.sous) {
        const lettre = r.sous.split('-')[0];
        if (/^[A-Z]$/.test(lettre) && !(cible.data.elements || []).some(function (x) { return x.t === 'pt' && x.n === lettre; })) probleme = 'point ' + lettre + ' absent de la règle citée';
      }
      inventaire.push({ de: b.numero || b.id, ref: texteRef(e.texte, r) , vers: cible ? (cible.numero + ' ' + cible.titre) : '?', probleme: probleme });
      if (probleme) cassés.push((b.numero || b.id) + ' : « ' + texteRef(e.texte, r) + ' » (' + probleme + ')');
    });
    if (!e.renvois.length) delete e.renvois;
  });
});
function texteRef(t, r) { return t.slice(Math.max(0, r.a - 14), Math.min(t.length, r.b + 18)).replace(/\s+/g, ' '); }
note('Renvois détectés : ' + nbRenvois + '.');

// Renvois jugés erronés dans la traduction : le texte reste fidèle, le renvoi est seulement signalé « à vérifier » (fichier à relire pour chaque édition)
const fichierVerif = path.join(__dirname, 'renvois_a_verifier_' + EDITION + '.json');
if (fs.existsSync(fichierVerif)) {
  const aVerifier = JSON.parse(fs.readFileSync(fichierVerif, 'utf8'));
  let marques = 0;
  aVerifier.forEach(function (v) {
    let trouve = 0;
    const b = parId[v.bloc];
    ((b && b.data.elements) || []).forEach(function (e) {
      (e.renvois || []).forEach(function (r) { if (r.cible === v.cible) { r.verifier = { attendu: v.attendu || null, note: v.note }; trouve++; marques++; } });
    });
    if (!trouve) avert('renvoi à vérifier introuvable (' + v.bloc + ' vers ' + v.cible + ') : le fichier ne correspond plus au PDF.');
  });
  note('Renvois signalés « à vérifier » : ' + marques + ' (fichier ' + path.basename(fichierVerif) + ').');
} else note('Aucun fichier de renvois à vérifier pour cette édition (' + path.basename(fichierVerif) + ').');
if (cassés.length) { note('Renvois à examiner (' + cassés.length + ') :'); cassés.forEach(function (c) { note('  - ' + c); }); }

// Non-perte : le texte des données, remis dans l'ordre, doit être celui du PDF (espaces ignorés)
function reconstruire() {
  const t = [];
  const secs = SECTIONS.slice();
  let derniereSection = null;
  blocs.forEach(function (b) {
    if (b.kind === 'regle') {
      if (b.section !== derniereSection) { derniereSection = b.section; t.push(secs.find(function (s) { return s.id === b.section; }).motif); }
      t.push(b.numero + ' - ' + b.titre);
    } else if (b.kind === 'rp') t.push(b.numero.replace('RP-', 'RP') + ' - ' + b.titre);
    else if (b.kind === 'exemple') t.push('Règle ' + b.numero + ' : ' + b.titre);
    // le glossaire et l'introduction sont ajoutés plus bas
    if (b.kind === 'regle' || b.kind === 'rp' || b.kind === 'exemple') (b.data.elements || []).forEach(function (e) { t.push(marque(e) + e.texte); });
  });
  return t;
}
function marque(e) { return e.t === 'pt' ? e.n + ') ' : e.t === 'sub' ? e.n + ') ' : e.t === 'li' ? '- ' : e.t === 'note' ? '§ ' : e.t === 'note2' ? 'v ' : ''; }
function sansEspace(s) { return s.replace(/\s+/g, ''); }

(function controleNonPerte() {
  const source = lignes.slice(iCorps, iEx).map(function (l) { return l.t; }).join('');
  // La partie « procédures » contient son titre ; les exemples sont comparés à part, avec leur propre en-tête
  const regles = blocs.filter(function (b) { return b.kind === 'regle'; });
  const rp = blocs.filter(function (b) { return b.kind === 'rp_intro' || b.kind === 'rp'; });
  let sortie = '';
  let derniere = null;
  regles.forEach(function (b) {
    if (b.section !== derniere) { derniere = b.section; sortie += SECTIONS.find(function (s) { return s.id === b.section; }).motif; }
    sortie += b.numero + ' - ' + b.titre + (b.data.elements || []).map(function (e) { return marque(e) + e.texte; }).join('');
  });
  rp.forEach(function (b) {
    if (b.kind === 'rp_intro') sortie += b.titre + (b.data.elements || []).map(function (e) { return e.texte; }).join('');
    else sortie += b.numero.replace('RP-', 'RP') + ' - ' + b.titre + (b.data.elements || []).map(function (e) { return marque(e) + e.texte; }).join('');
  });
  compare('Règles et procédures recommandées', source, sortie);

  const srcEx = lignes.slice(iEx + 1, iGlo).map(function (l) { return l.t; }).join('');
  const sortEx = blocs.filter(function (b) { return b.kind === 'exemple'; }).map(function (b) {
    return 'Règle ' + b.numero + ' : ' + b.titre + (b.data.elements || []).map(function (e) { return marque(e) + e.texte; }).join('');
  }).join('');
  compare('Exemples d\'illustration', srcEx, sortEx);

  const srcGl = lignes.slice(iGlo + 1).map(function (l) { return l.t; }).join('');
  const sortGl = flux.filter(function (f) { return /^- |^(Types de jeux|Positions à la table|Termes d'action|Environnement et types)/.test(f); }).join('');
  compare('Glossaire', srcGl, sortGl);
})();

function compare(nom, a, b) {
  const x = sansEspace(a), y = sansEspace(b);
  if (x === y) { note('Contrôle de non-perte « ' + nom + ' » : OK (' + x.length + ' caractères identiques au PDF).'); return; }
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++;
  avert('contrôle de non-perte « ' + nom + ' » : écart à la position ' + i + ' (PDF ' + x.length + ' caractères, données ' + y.length + ').');
  note('  PDF    : …' + x.slice(Math.max(0, i - 40), i + 60));
  note('  Données: …' + y.slice(Math.max(0, i - 40), i + 60));
}

// ── 9. Contrôle des titres avec la table des matières du PDF (titres tronqués par « ... ») ─────────────
(function tableDesMatieres() {
  const toc = lignes.slice(0, iCorps).map(function (l) { return l.t; }).join('\n');
  let ecarts = 0;
  blocs.filter(function (b) { return b.kind === 'regle' || b.kind === 'rp'; }).forEach(function (b) {
    // La table des matières écrit « RP-1 » puis « RP10 » : on essaie les deux graphies
    const cles = b.kind === 'regle' ? [b.numero] : [b.numero, b.numero.replace('RP-', 'RP')];
    let ligne = null;
    cles.forEach(function (c) { const m = new RegExp('(?:^|\\s)' + c + ' - (.{0,60})', 'm').exec(toc); if (m && ligne === null) ligne = m[1]; });
    const debut = b.titre.slice(0, 10);
    if (ligne === null) { ecarts++; avert(b.numero + ' absent de la table des matières.'); }
    else if (ligne.indexOf(debut) < 0) { ecarts++; avert('titre de ' + b.numero + ' différent de la table des matières : « ' + b.titre + ' »'); }
  });
  note('Titres comparés à la table des matières : ' + (ecarts ? ecarts + ' écart(s)' : 'aucun écart') + '.');
})();

// ── 10. Introduction de l'édition et sortie ─────────────────────────────────────────────────────────────
const iIntro = trouver(/^Le "Poker TDA" est une association/);
const introEdition = [];
for (let i = iIntro; i >= 0 && i < lignes.length && lignes[i].t; i++) introEdition.push(lignes[i].t);
const edition = {
  id: EDITION,
  libelle: 'Règles 2026 - Version 1.0',
  date_publication: DATE,
  traduction: 'Guy Rump',
  introduction: introEdition.join(' '),
  mention: 'TDA rules used by permission of the Poker TDA, Copyright 2026, http://www.pokertda.com, All rights reserved.',
};
// Les sections fournies pour l'affichage (ordre du document), plus les parties annexes
const sections = SECTIONS.map(function (s, i) { return { id: s.id, titre: s.titre, ordre: i + 1 }; })
  .concat([{ id: 'rp', titre: 'Procédures recommandées', ordre: 11 }, { id: 'ex', titre: 'Exemples d\'illustration', ordre: 12 }, { id: 'gl', titre: 'Glossaire', ordre: 13 }]);

const stats = {};
blocs.forEach(function (b) { stats[b.kind] = (stats[b.kind] || 0) + 1; });
note('Blocs produits : ' + JSON.stringify(stats) + '.');

fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, 'tda_' + EDITION + '.json'), JSON.stringify({ edition: edition, sections: sections, blocs: blocs }, null, 1), 'utf8');
rapport.push('', '── Inventaire des renvois (de → citation → vers) ──');
inventaire.forEach(function (r) { rapport.push((r.probleme ? '! ' : '  ') + r.de + '  « ' + r.ref + ' »  →  ' + r.vers + (r.probleme ? '   [' + r.probleme + ']' : '')); });
fs.writeFileSync(path.join(SORTIE, 'rapport_' + EDITION + '.txt'), rapport.join('\n'), 'utf8');
// Fichiers SQL d'import et d'activation (à passer à « supabase db query --linked -f ») : même effet que l'import fait pour 2026
(function ecrireSql() {
  const TAG = '$tdaimport9x$';
  const blocsJson = JSON.stringify(blocs), sectionsJson = JSON.stringify(sections);
  if (blocsJson.includes(TAG) || sectionsJson.includes(TAG)) { avert('un marqueur SQL est présent dans les données : fichiers SQL non écrits.'); return; }
  const q = function (v) { return v == null ? 'NULL' : TAG + v + TAG; };
  const e = edition;
  fs.writeFileSync(path.join(SORTIE, 'import_' + EDITION + '.sql'),
    'INSERT INTO public.tda_editions (id, libelle, date_publication, traduction, introduction, mention, sections, nb_blocs)\n' +
    'VALUES (' + q(e.id) + ', ' + q(e.libelle) + ', ' + (e.date_publication ? q(e.date_publication) + '::date' : 'NULL') + ', ' + q(e.traduction) + ', ' + q(e.introduction) + ', ' + q(e.mention) + ', ' + q(sectionsJson) + '::jsonb, ' + blocs.length + ');\n\n' +
    'INSERT INTO public.tda_blocs (edition_id, id, kind, numero, section, titre, ordre, data)\n' +
    'SELECT ' + q(e.id) + ", b.id, b.kind, COALESCE(b.numero, ''), b.section, b.titre, b.ordre, COALESCE(b.data, '{}'::jsonb)\n" +
    'FROM jsonb_to_recordset(' + q(blocsJson) + '::jsonb) AS b(id text, kind text, numero text, section text, titre text, ordre integer, data jsonb);\n', 'utf8');
  const complet = "(SELECT count(*) FROM public.tda_blocs WHERE edition_id = '" + EDITION + "') = " + blocs.length;
  fs.writeFileSync(path.join(SORTIE, 'activer_' + EDITION + '.sql'),
    "-- Active l'édition seulement si tous ses blocs sont présents ; l'ancienne devient un brouillon\n" +
    "UPDATE public.tda_editions SET active = false WHERE active AND id <> '" + EDITION + "' AND " + complet + ";\n" +
    "UPDATE public.tda_editions SET active = true WHERE id = '" + EDITION + "' AND " + complet + ";\n", 'utf8');
})();
console.log(rapport.filter(function (l) { return !/^[ !] /.test(l) && l.indexOf('──') < 0; }).join('\n'));
console.log('\nFichiers écrits dans ' + SORTIE);
