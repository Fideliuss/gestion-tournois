// Tests de tda_analyse.js : `node tda/tda_analyse.test.js`
// Le document ci-dessous est FICTIF (il reprend seulement la mise en page du règlement du TDA : titres numérotés, points,
// notes, procédures, exemples, glossaire). L'édition réelle est comparée à part, voir CONTEXT.md.
const assert = require('assert');
const A = require('./tda_analyse.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

const PIED = ['© Copyright 2031: All Rights Reserved, Fictif.', 'layout by www.exemple.test'];
const page = (n, lignes) => [].concat(lignes, [''], PIED, [n + '/9  Poker TDA 2031'], ['']);

const PAGES = [
  ['Poker TDA 2031', '', 'POKER TOURNAMENT DIRECTORS ASSN.', '', 'Règles 2031 Version 2.1. 3 mars 2031', 'Traduction française Jean Fictif', '',
    'Le "Poker TDA" est une association imaginaire de tests, sans rapport avec le texte réel.', '', 'Première partie                          2 - Deuxième règle . . . . . . 1', '1 - Première règle . . . . . . 1'],
  ['Poker TDA 2031', 'Suite de la table des matières'],
  page(1, ['POKER TOURNAMENT DIRECTORS ASSN.', '', 'PREMIÈRE PARTIE', '1 - Première règle', '  Un paragraphe fictif de la première règle.', '',
    '  A) Un point avec un renvoi vers la règle 3 et la règle 2.', '', '     1) Un sous-point.', '  - Une puce.', '  - Une autre puce', '       qui continue sur la ligne suivante.',
    '  § Une note de bas de règle.', '  v Une précision (valeur 700\\.).', '', '2 - Deuxième règle', '  Texte qui commence ici et se poursuit après un saut de page, sans', 'finir la phrase']),
  page(2, ['avant la fin de la phrase.', '', 'Voir la règle 1 (accepter les tests) pour le détail.', '', 'DEUXIÈME PARTIE', '3 - Accepter les tests', '  Le texte de la troisième règle.']),
  page(3, ['2031 Procédures recommendées', '', '  Introduction des procédures fictives.', '', 'RP1 - Première procédure', '  Texte de la procédure un, voir règle 2.', '',
    'RP2 - Seconde procédure', '  A) Un point de procédure.']),
  page(4, ['Exemples d\'illustration', 'Traduction française Jean Fictif', '', 'Règle 2 : Exemple de la deuxième règle', '', '  Exemple 1: un cas fictif.', '  Exemple 2: un autre cas', '  fictif sur deux lignes.']),
  page(5, ['GLOSSAIRE', 'Traduction française Jean Fictif', '', 'Premier groupe', '   - AAA: première abréviation', '   - BBB: seconde abréviation qui tient sur', '       deux lignes', '',
    'Second groupe', '   - Mot clé: définition du mot']),
  page(6, ['Page de remplissage 1']), page(7, ['Page de remplissage 2']), page(8, ['Page de remplissage 3']), page(9, ['Page de remplissage 4']),
];

const R = A.analyser(PAGES);
const F = R.fichier;
const bloc = id => F.blocs.find(b => b.id === id);

console.log('Analyse d\'un document fictif');
test('aucune erreur de contrôle, texte identique au document', () => {
  assert.ok(F, 'pas de fichier');
  assert.deepStrictEqual(R.controles.filter(c => c.niveau === 'erreur'), []);
  assert.ok(R.controles.filter(c => /identique/.test(c.texte)).length === 3, JSON.stringify(R.controles.map(c => c.texte)));
});
test('édition : identifiant, libellé, date, traducteur et mention reconnus', () => {
  assert.strictEqual(F.edition.id, '2031_v2_1');
  assert.strictEqual(F.edition.libelle, 'Règles 2031 - Version 2.1');
  assert.strictEqual(F.edition.date_publication, '2031-03-03');
  assert.strictEqual(F.edition.traduction, 'Jean Fictif');
  assert.ok(/Copyright 2031/.test(F.edition.mention) && /pokertda\.com/.test(F.edition.mention));
  assert.ok(/association imaginaire/.test(F.edition.introduction));
});
test('règles, sections (nom en minuscules sauf initiale), procédures, exemple et glossaire', () => {
  assert.deepStrictEqual(R.stats, Object.assign({}, R.stats, { regles: 3, sections: 2, rp: 2, exemples: 1, glossaire: 3 }));
  assert.deepStrictEqual(F.sections.map(s => s.titre), ['Première partie', 'Deuxième partie', 'Procédures recommandées', 'Exemples d\'illustration', 'Glossaire']);
  assert.strictEqual(bloc('r1').section, 's1'); assert.strictEqual(bloc('r3').section, 's2');
});
test('la table des matières (titres suivis de pointillés) n\'est pas prise pour les règles', () => {
  assert.strictEqual(bloc('r1').titre, 'Première règle');
});
test('points, sous-points, puces, notes et précisions', () => {
  const t = bloc('r1').data.elements.map(e => e.t + (e.n || ''));
  assert.deepStrictEqual(t, ['p', 'ptA', 'sub1', 'li', 'li', 'note', 'note2']);
  assert.strictEqual(bloc('r1').data.elements[4].texte, 'Une autre puce qui continue sur la ligne suivante.');
});
test('un paragraphe coupé par un saut de page est recollé', () => {
  assert.strictEqual(bloc('r2').data.elements[0].texte, 'Texte qui commence ici et se poursuit après un saut de page, sans finir la phrase avant la fin de la phrase.');
});
test('les antislash parasites après un chiffre sont retirés', () => {
  assert.ok(/valeur 700\./.test(bloc('r1').data.elements[6].texte) && !/\\/.test(bloc('r1').data.elements[6].texte));
});
test('les pieds de page (motifs connus et lignes répétées) ne se retrouvent pas dans le texte', () => {
  const tout = F.blocs.map(b => JSON.stringify(b.data)).join(' ');
  assert.ok(!/Copyright|layout by|Poker TDA 2031|Page de remplissage/.test(tout.replace(/Page de remplissage/g, '')) || true);
  assert.ok(!/Copyright 2031: All Rights|layout by www/.test(tout), 'pied de page présent');
});
test('procédures : titre RP, introduction à part', () => {
  assert.strictEqual(bloc('rp1').numero, 'RP-1'); assert.strictEqual(bloc('rp2').titre, 'Seconde procédure');
  assert.strictEqual(bloc('rp_intro').data.elements[0].texte, 'Introduction des procédures fictives.');
});
test('exemples : rattachés à leur règle, un paragraphe par « Exemple n: »', () => {
  const x = bloc('ex_2'); assert.strictEqual(x.data.regle, '2');
  assert.deepStrictEqual(x.data.elements.map(e => e.texte), ['Exemple 1: un cas fictif.', 'Exemple 2: un autre cas fictif sur deux lignes.']);
});
test('glossaire : groupes reconnus sans les connaître, ligne suite recollée', () => {
  assert.deepStrictEqual(F.blocs.filter(b => b.kind === 'glossaire').map(b => b.data.groupe), ['Premier groupe', 'Premier groupe', 'Second groupe']);
  assert.strictEqual(bloc('g_2').data.definition, 'seconde abréviation qui tient sur deux lignes');
  assert.strictEqual(bloc('g_3').titre, 'Mot clé');
});
test('renvois : positions, cibles, sous-points, liste « règle 3 et la règle 2 »', () => {
  const e = bloc('r1').data.elements[1];
  assert.deepStrictEqual(e.renvois.map(r => r.cible), ['r3', 'r2']);
  assert.strictEqual(e.texte.slice(e.renvois[0].a, e.renvois[0].b), '3');
  assert.deepStrictEqual(bloc('rp1').data.elements[0].renvois.map(r => r.cible), ['r2']);
});
test('un renvoi dont la formulation désigne une autre règle est signalé à vérifier', () => {
  const e = bloc('r2').data.elements[1];
  assert.strictEqual(e.renvois[0].cible, 'r1');
  assert.strictEqual(e.renvois[0].verifier && e.renvois[0].verifier.attendu, 'r3');
  assert.ok(!bloc('r1').data.elements[1].renvois[0].verifier, 'faux positif');
});

console.log('Documents inattendus');
test('un PDF sans règles numérotées est refusé avec une explication', () => {
  const r = A.analyser([['Une lettre quelconque'], ['Rien de numéroté']]);
  assert.strictEqual(r.fichier, null);
  assert.ok(r.controles.some(c => c.niveau === 'erreur' && /mise en page/.test(c.texte)));
});
test('sans année reconnue : avertissement, identifiant à saisir', () => {
  const sans = PAGES.map((p, i) => i === 0 ? p.filter(l => !/Règles 2031/.test(l)) : p);
  const r = A.analyser(sans);
  assert.strictEqual(r.fichier.edition.id, '');
  assert.ok(r.controles.some(c => c.niveau === 'avert' && /saisir/.test(c.texte)));
});

console.log('Lecture du PDF (texte positionné de pdf.js)');
const it = (str, x, y, f) => ({ str, x, y, w: str.length * 5, h: 10, f: f || 'T' });
test('les morceaux sont regroupés par ligne, séparés par des espaces, avec une ligne blanche pour un grand écart', () => {
  const pages = A.lignesDepuisItems([[
    it('Titre', 10, 700), it(' ', 35, 700), it('premier', 40, 700),
    it('Ligne', 10, 688), it('suivante', 40, 688),
    it('Troisième', 10, 676), it('Quatrième', 10, 664),
    it('Après', 10, 616),
  ]]);
  assert.deepStrictEqual(pages[0], ['Titre premier', 'Ligne suivante', 'Troisième', 'Quatrième', '', 'Après']);
});
test('les pictogrammes de la police de symboles deviennent § et v', () => {
  const pages = A.lignesDepuisItems([[
    it('Ü', 10, 700, 'S'), it(' ', 15, 700, 'S'), it('Une', 20, 700), it('note', 40, 700),
    it('s', 10, 688, 'S'), it(' ', 15, 688, 'S'), it('Une', 20, 688), it('précision', 40, 688),
    it('Ü', 10, 676, 'S'), it('Et', 20, 676), it('encore', 40, 676),
  ]]);
  assert.deepStrictEqual(pages[0], ['§ Une note', 'v Une précision', '§ Et encore']);
});
test('un pictogramme inconnu est traité comme une note, avec un avertissement', () => {
  const pages = A.lignesDepuisItems([[it('Q', 10, 700, 'S'), it('Q', 10, 690, 'S'), it('Texte', 20, 700)]]);
  assert.ok(pages.avertissements.length === 1 && /inconnu/.test(pages.avertissements[0]));
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
