// Tests de materiel_core.js : `node materiel/materiel_core.test.js`  (numéros fictifs)
const assert = require('assert');
const M = require('./materiel_core.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

const ENCHAINEMENT = ['A intégrer', 'Neuf', 'En service', "Hors d'usage", 'A détruire', 'Détruit'];
const REF = {
  jeux: [{ nom: 'Tournois', ordre: 4 }, { nom: 'Blackjack', ordre: 1 }],
  statuts: ENCHAINEMENT.map(function (s, i) { return { famille: 'sixain', statut: s, ordre: i + 1 }; }).reverse(),
  transitions: ENCHAINEMENT.slice(0, -1).map(function (s, i) { return { famille: 'sixain', de: s, vers: ENCHAINEMENT[i + 1], retour: false }; })
    .concat(ENCHAINEMENT.slice(1).map(function (s, i) { return { famille: 'sixain', de: s, vers: ENCHAINEMENT[i], retour: true }; })),
};
const P = (id, jeu, statut, extra) => Object.assign({ id: 'u' + id, famille: 'sixain', identifiant: id, jeu: jeu, finition: 'Plastifié', statut: statut, marque_id: null }, extra || {});
const PIECES = [P('118510', 'Blackjack', 'Neuf'), P('85715', 'Blackjack', 'En service'), P('D25820', 'Ultimate', 'Neuf', { finition: 'Cartonné', marque_id: 3 }),
  P('DOUZ9.10', 'Tournois', "Hors d'usage"), P('DOUZ9.2', 'Tournois', 'Détruit'), P('PT1000', 'Cash Game', 'A détruire', { marque_id: 4 })];

console.log('Passages de statut');
test('depuis chaque statut : une étape en avant et une en arrière, sauf aux extrémités', () => {
  assert.deepStrictEqual(M.passages(REF, 'sixain', 'Neuf'), { avance: { vers: 'En service' }, retour: { vers: 'A intégrer' } });
  assert.deepStrictEqual(M.passages(REF, 'sixain', 'A intégrer'), { avance: { vers: 'Neuf' }, retour: null });
  assert.deepStrictEqual(M.passages(REF, 'sixain', 'Détruit'), { avance: null, retour: { vers: 'A détruire' } });
  assert.deepStrictEqual(M.passages(REF, 'inconnue', 'Neuf'), { avance: null, retour: null });
});
test('statuts d\'une famille triés par ordre', () => assert.deepStrictEqual(M.statuts(REF, 'sixain').map(s => s.statut), ENCHAINEMENT));
test('libellés d\'action et classes de couleur', () => {
  assert.strictEqual(M.actionVers('En service'), 'Mettre en service');
  assert.strictEqual(M.actionVers('Inconnu'), 'Passer à « Inconnu »');
  assert.strictEqual(M.classe('A détruire'), 'st-detruire');
  assert.strictEqual(M.classe('Inconnu'), 'st-autre');
});

console.log('Tri des numéros');
test('tri naturel : les nombres par valeur, puis les préfixes', () => {
  assert.deepStrictEqual(M.trier(PIECES).map(p => p.identifiant), ['85715', '118510', 'D25820', 'DOUZ9.2', 'DOUZ9.10', 'PT1000']);
});
test('le tri ne modifie pas la liste d\'origine', () => { const a = PIECES.map(p => p.id); M.trier(PIECES); assert.deepStrictEqual(PIECES.map(p => p.id), a); });

console.log('Filtres et compteurs');
test('filtre par statuts, jeu, finition, marque, recherche', () => {
  const f = (o) => M.filtrer(PIECES, Object.assign({ statuts: null, jeu: '', finition: '', marque: '', q: '' }, o)).map(p => p.identifiant);
  assert.strictEqual(f({}).length, 6);
  assert.deepStrictEqual(f({ statuts: ['Neuf'] }), ['118510', 'D25820']);
  assert.deepStrictEqual(f({ jeu: 'Tournois' }), ['DOUZ9.10', 'DOUZ9.2']);
  assert.deepStrictEqual(f({ finition: 'Cartonné' }), ['D25820']);
  assert.deepStrictEqual(f({ marque: 'sans' }), ['118510', '85715', 'DOUZ9.10', 'DOUZ9.2']);
  assert.deepStrictEqual(f({ marque: '4' }), ['PT1000']);
  assert.deepStrictEqual(f({ q: 'douz' }), ['DOUZ9.10', 'DOUZ9.2']);
  assert.deepStrictEqual(f({ q: ' 1185 ' }), ['118510']);
  assert.deepStrictEqual(f({ statuts: ['Neuf'], jeu: 'Blackjack' }), ['118510']);
});
test('les compteurs de statut ignorent le filtre de statut, ceux de jeu ignorent le filtre de jeu', () => {
  const c = M.compter(PIECES, { statuts: ['Neuf'], jeu: 'Blackjack', finition: '', marque: '', q: '' });
  assert.deepStrictEqual(c.parStatut, { 'Neuf': 1, 'En service': 1 });
  assert.deepStrictEqual(c.parJeu, { 'Blackjack': 1, 'Ultimate': 1 });
});

console.log('Saisie de numéros');
test('séparateurs variés, espaces, lignes vides', () => {
  const r = M.analyserSaisie('136012\n136013, 136014;  136015\t\n\n  D25820  ', []);
  assert.deepStrictEqual(r.ids, ['136012', '136013', '136014', '136015', 'D25820']);
});
test('doublons dans la saisie, numéros déjà présents, formes invalides', () => {
  const r = M.analyserSaisie('A1 a1 A2 118510 118510 bad# $x 85715', ['118510', '85715']);
  assert.deepStrictEqual(r.ids, ['A1', 'A2']);
  assert.deepStrictEqual(r.doublonsSaisie, ['a1', '118510']);
  assert.deepStrictEqual(r.existe, ['118510', '85715']);
  assert.deepStrictEqual(r.invalides, ['bad#', '$x']);
});
test('un numéro trop long est refusé, un numéro de 40 caractères passe', () => {
  assert.strictEqual(M.analyserSaisie('A'.repeat(41), []).invalides.length, 1);
  assert.strictEqual(M.analyserSaisie('A'.repeat(40), []).ids.length, 1);
});
test('la comparaison avec l\'existant ignore la casse', () => assert.deepStrictEqual(M.analyserSaisie('d25820', ['D25820']).existe, ['d25820']));

console.log('Série bornée');
test('une série : du premier au dernier numéro, bornes comprises', () => {
  const r = M.analyserSerie('136012', '136016', []);
  assert.deepStrictEqual(r.ids, ['136012', '136013', '136014', '136015', '136016']);
  assert.strictEqual(r.total, 5);
  assert.strictEqual(r.erreur, '');
});
test('un préfixe de lettres est conservé, la casse du premier numéro aussi', () => {
  assert.deepStrictEqual(M.analyserSerie('D25820', 'D25822', []).ids, ['D25820', 'D25821', 'D25822']);
  assert.deepStrictEqual(M.analyserSerie('d9', 'D11', []).ids, ['d9', 'd10', 'd11']);
});
test('dernier numéro vide : un seul sixain ; premier vide : rien et pas d\'erreur', () => {
  assert.deepStrictEqual(M.analyserSerie('136012', '', []).ids, ['136012']);
  assert.deepStrictEqual(M.analyserSerie('', '', []), { ids: [], existe: [], total: 0, erreur: '' });
});
test('les zéros de tête sont conservés', () => assert.deepStrictEqual(M.analyserSerie('0098', '0101', []).ids, ['0098', '0099', '0100', '0101']));
test('numéros déjà enregistrés dans la série : ignorés et signalés, casse ignorée', () => {
  const r = M.analyserSerie('D1', 'D4', ['d2', 'D4']);
  assert.deepStrictEqual(r.ids, ['D1', 'D3']);
  assert.deepStrictEqual(r.existe, ['D2', 'D4']);
  assert.strictEqual(r.total, 4);
});
test('refus : préfixes différents, ordre inversé, pas de chiffres à la fin, série trop longue, numéro trop long', () => {
  assert.ok(/commencer pareil/.test(M.analyserSerie('D100', 'E105', []).erreur));
  assert.ok(/commencer pareil/.test(M.analyserSerie('100', 'D105', []).erreur));
  assert.ok(/après le premier/.test(M.analyserSerie('105', '100', []).erreur));
  assert.ok(/finir par des chiffres/.test(M.analyserSerie('ABC', '', []).erreur));
  assert.ok(/finir par des chiffres/.test(M.analyserSerie('100', 'XYZ', []).erreur));
  assert.ok(/maximum/.test(M.analyserSerie('1', '1001', []).erreur));
  assert.strictEqual(M.analyserSerie('1', '1000', []).ids.length, 1000);
  assert.ok(/trop long/.test(M.analyserSerie('1234567890123456', '', []).erreur));
  assert.strictEqual(M.analyserSerie('100', 'XYZ', []).ids.length, 0);
});

console.log('Sélection groupée');
test('même statut : passages proposés ; statuts mélangés : refus avec raison', () => {
  const a = M.selectionCommune(PIECES, ['u118510', 'uD25820'], REF);
  assert.ok(a.ok); assert.strictEqual(a.statut, 'Neuf'); assert.strictEqual(a.passages.avance.vers, 'En service'); assert.strictEqual(a.fiches.length, 2);
  const b = M.selectionCommune(PIECES, ['u118510', 'u85715'], REF);
  assert.ok(!b.ok); assert.ok(/même statut/.test(b.raison));
  assert.ok(!M.selectionCommune(PIECES, [], REF).ok);
});

console.log('Messages d\'erreur');
test('doublon, droit manquant, message déjà lisible de la base', () => {
  assert.ok(/existe déjà/.test(M.traduireErreur({ code: '23505', message: 'duplicate key value violates unique constraint "materiel_pieces_identifiant"' })));
  assert.ok(/pas le droit/.test(M.traduireErreur({ code: '42501', message: 'new row violates row-level security policy' })));
  assert.strictEqual(M.traduireErreur({ code: '23514', message: 'Un retour en arrière demande un motif' }), 'Un retour en arrière demande un motif');
  assert.strictEqual(M.traduireErreur(null), 'Erreur inconnue.');
});

console.log('Bilan et destruction');
const STOCK = [P('1', 'Blackjack', 'Neuf'), P('2', 'Blackjack', 'En service'), P('3', 'Blackjack', "Hors d'usage"), P('4', 'Blackjack', 'A détruire'), P('5', 'Blackjack', 'A intégrer'),
  P('6', 'Blackjack', 'Détruit', { session_destruction_id: 's1' }), P('7', 'Ultimate', 'Neuf', { finition: 'Cartonné' }), P('8', 'Ultimate', 'A détruire'), P('9', 'Ultimate', 'A détruire', { finition: 'Cartonné' })];
test("bilan : stock initial + entrées - sorties = en dépôt, avec la répartition Neuf / En service / Hors d'usage", () => {
  const b = M.bilanJeux(STOCK, ['Blackjack', 'Ultimate', 'Cash Game']);
  assert.deepStrictEqual(b.lignes[0], { jeu: 'Blackjack', stock: 4, entrees: 1, sorties: 1, depot: 4, neuf: 1, enService: 1, horsUsage: 1, total: 3 });
  assert.deepStrictEqual(b.lignes[1], { jeu: 'Ultimate', stock: 3, entrees: 0, sorties: 2, depot: 1, neuf: 1, enService: 0, horsUsage: 0, total: 1 });
  assert.deepStrictEqual(b.lignes[2], { jeu: 'Cash Game', stock: 0, entrees: 0, sorties: 0, depot: 0, neuf: 0, enService: 0, horsUsage: 0, total: 0 });
  assert.deepStrictEqual(b.total, { jeu: 'Total', stock: 7, entrees: 1, sorties: 3, depot: 5, neuf: 2, enService: 1, horsUsage: 1, total: 4 });
});
test('bilan : un jeu inconnu du référentiel apparaît quand même', () => {
  assert.strictEqual(M.bilanJeux([P('1', 'Poker', 'Neuf')], ['Blackjack']).lignes.map(l => l.jeu).join(), 'Blackjack,Poker');
});
test('à détruire : groupé par jeu, trié par numéro', () => {
  const g = M.aDetruireParJeu(STOCK);
  assert.deepStrictEqual(Object.keys(g), ['Blackjack', 'Ultimate']);
  assert.deepStrictEqual(g['Ultimate'].map(p => p.identifiant), ['8', '9']);
});
test('sessions : la plus récente d\'abord, sans date en dernier, contenu par jeu', () => {
  const sessions = [{ id: 's0', date_destruction: null, reference: 'Avant l\'outil' }, { id: 's1', date_destruction: '2026-11-05', reference: 'R1', cree_le: '2026-11-05T10:00:00Z' },
    { id: 's2', date_destruction: '2026-12-01', cree_le: '2026-12-01T09:00:00Z' }, { id: 's3', date_destruction: '2026-12-01', cree_le: '2026-12-01T11:00:00Z' }];
  const r = M.sessionsResume(STOCK.concat([P('10', 'Ultimate', 'Détruit', { session_destruction_id: 's2' }), P('11', 'Ultimate', 'Détruit', { session_destruction_id: 's2' })]), sessions);
  assert.deepStrictEqual(r.map(s => s.id), ['s3', 's2', 's1', 's0']);
  assert.strictEqual(r.find(s => s.id === 's1').total, 1);
  assert.deepStrictEqual(r.find(s => s.id === 's2').parJeu, { Ultimate: ['10', '11'] });
  assert.strictEqual(r.find(s => s.id === 's3').total, 0);
});
test('liste à copier et dates', () => {
  assert.strictEqual(M.texteListe({ Blackjack: ['1', '2'], Ultimate: [P('9', 'Ultimate', 'A détruire')] }), 'Blackjack (2) : 1, 2\nUltimate (1) : 9');
  assert.strictEqual(M.dateFr('2026-11-05'), '05/11/2026');
  assert.strictEqual(M.dateFr(null), '');
  assert.strictEqual(M.aujourdhui(new Date(2026, 10, 5)), '2026-11-05');
});

console.log('Divers');
test('jeux dans l\'ordre, date lisible', () => {
  assert.deepStrictEqual(M.jeuxPourSelect(REF), ['Blackjack', 'Tournois']);
  assert.ok(/^\d\d\/\d\d\/\d{4} à \d\d:\d\d$/.test(M.dateHeure('2026-10-22T21:05:00Z')));
  assert.strictEqual(M.dateHeure('pas une date'), '');
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
