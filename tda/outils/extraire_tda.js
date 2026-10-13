// ══════════════════════════════════════════════════════
//  Outil de développement : analyse d'un PDF du TDA en ligne de commande (même module que l'application)
//
//  L'administrateur n'en a PAS besoin : la page « Éditions du règlement TDA » lit directement le PDF dans le navigateur.
//  Cet outil sert à comparer, relire le rapport d'une édition ou refaire un import manuel.
//
//  Usage (depuis la racine du site) :
//    node tda/outils/extraire_tda.js "<chemin du PDF>" [identifiant_edition]
//  Prérequis : Node et `pdftotext` (poppler, fourni avec Git for Windows).
//  Sortie    : tda/outils/sortie/tda_<edition>.json et rapport_<edition>.txt (dossier IGNORÉ par git : le texte du TDA
//              ne doit jamais être commité, le dépôt est public).
//  Option    : si tda/outils/renvois_a_verifier_<edition>.json existe, ses renvois sont signalés « à vérifier » en plus de
//              ceux que l'analyse détecte seule (liste établie à la main pour l'édition 2026 : numéros seulement).
// ══════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const A = require('../tda_analyse.js');

const PDF = process.argv[2];
if (!PDF) { console.error('Usage : node tda/outils/extraire_tda.js "<chemin du PDF>" [identifiant_edition]'); process.exit(1); }

const brut = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', PDF, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const pages = brut.split('\f').map(function (p) { return p.split('\n'); });
if (!pages[pages.length - 1].some(function (l) { return l.trim(); })) pages.pop();

const r = A.analyser(pages);
const rapport = r.controles.map(function (c) { return (c.niveau === 'ok' ? 'OK      ' : c.niveau === 'avert' ? 'ATTENTION ' : 'ERREUR  ') + c.texte; });
if (!r.fichier) { console.log(rapport.join('\n')); process.exit(2); }

const f = r.fichier;
const EDITION = process.argv[3] || f.edition.id || 'edition';
f.edition.id = EDITION;

// Renvois signalés à la main pour cette édition
const fichierVerif = path.join(__dirname, 'renvois_a_verifier_' + EDITION + '.json');
if (fs.existsSync(fichierVerif)) {
  const parId = {}; f.blocs.forEach(function (b) { parId[b.id] = b; });
  let n = 0;
  JSON.parse(fs.readFileSync(fichierVerif, 'utf8')).forEach(function (v) {
    let trouve = 0;
    ((parId[v.bloc] && parId[v.bloc].data.elements) || []).forEach(function (e) {
      (e.renvois || []).forEach(function (x) { if (x.cible === v.cible) { x.verifier = { attendu: v.attendu || null, note: v.note }; trouve++; n++; } });
    });
    if (!trouve) rapport.push('ATTENTION renvoi à vérifier introuvable (' + v.bloc + ' vers ' + v.cible + ') : le fichier ne correspond plus au PDF.');
  });
  rapport.push('OK      ' + n + ' renvois signalés « à vérifier » à la main (' + path.basename(fichierVerif) + ')');
}

const sortie = path.resolve(__dirname, 'sortie');
fs.mkdirSync(sortie, { recursive: true });
fs.writeFileSync(path.join(sortie, 'tda_' + EDITION + '.json'), JSON.stringify(f, null, 1), 'utf8');
fs.writeFileSync(path.join(sortie, 'rapport_' + EDITION + '.txt'), rapport.join('\n'), 'utf8');
console.log(rapport.join('\n'));
console.log('\nFichiers écrits dans ' + sortie);
if (r.controles.some(function (c) { return c.niveau === 'erreur'; })) process.exit(3);
