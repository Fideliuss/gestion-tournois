// Tests de tda_cas_outils.js : `node tda/tda_cas_outils.test.js`  (texte fictif)
const assert = require('assert');
const C = require('./tda_cas_outils.js');
const R = require('./tda_recherche.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

C.definirSanctions([
  { id: 'avertissement', libelle: 'Avertissement verbal', unite: null, ordre: 2, actif: true },
  { id: 'aucune', libelle: 'Aucune sanction', unite: null, ordre: 1, actif: true },
  { id: 'main_penalite', libelle: 'Main de pénalité', unite: 'main', ordre: 3, actif: true },
  { id: 'ancienne', libelle: 'Ancienne sanction', unite: null, ordre: 9, actif: false },
]);
const BON = { titre: 'Relance trop faible', faits: 'Un joueur avance un jeton inférieur à la relance minimale sans rien annoncer.', regles: ['r45'], decision: 'La mise est un call, les jetons en trop sont rendus.', sanction_type: 'aucune' };

console.log('Libellés');
test('sanctions, états, édition, date', () => {
  assert.strictEqual(C.libelleSanction('main_penalite'), 'Main de pénalité');
  assert.strictEqual(C.libelleSanction('inconnue'), 'inconnue');
  assert.strictEqual(C.statut('a_preciser').libelle, 'À préciser');
  assert.strictEqual(C.statut('inconnu').classe, 'off');
  assert.strictEqual(C.libelleEdition('2026_v1_0'), '2026 v1.0');
  assert.strictEqual(C.libelleEdition('autre'), 'autre');
  assert.strictEqual(C.dateFr('2026-10-14T20:00:00Z'), '14/10/2026');
  assert.strictEqual(C.dateFr(null), '');
});

console.log('Liste des sanctions modifiable');
test('la liste est triée, les sanctions désactivées ne sont plus proposées sauf celle du cas modifié', () => {
  assert.deepStrictEqual(C.toutesSanctions().map(s => s.id), ['aucune', 'avertissement', 'main_penalite', 'ancienne']);
  assert.deepStrictEqual(C.sanctionsProposees().map(s => s.id), ['aucune', 'avertissement', 'main_penalite']);
  assert.deepStrictEqual(C.sanctionsProposees('ancienne').map(s => s.id), ['aucune', 'avertissement', 'main_penalite', 'ancienne']);
});
test('texte de la sanction : le nombre s accorde', () => {
  assert.strictEqual(C.texteSanction({ sanction_type: 'main_penalite', sanction_quantite: 1 }), 'Main de pénalité (1 main)');
  assert.strictEqual(C.texteSanction({ sanction_type: 'main_penalite', sanction_quantite: 3 }), 'Main de pénalité (3 mains)');
  assert.strictEqual(C.texteSanction({ sanction_type: 'aucune', sanction_quantite: null }), 'Aucune sanction');
  assert.strictEqual(C.uniteAccordee('jetons', 5), 'jetons');
});

console.log('Vérification de la saisie');
test('un cas complet est accepté', () => assert.deepStrictEqual(C.verifier(BON), { erreurs: {}, ok: true }));
test('chaque champ obligatoire est signalé', () => {
  const r = C.verifier({ titre: 'ab', faits: 'court', regles: [], decision: '', sanction_type: 'prison' });
  assert.deepStrictEqual(Object.keys(r.erreurs).sort(), ['faits', 'regles', 'sanction_type', 'titre']);
});
test('la décision est facultative : la sanction suffit', () => {
  assert.ok(C.verifier(Object.assign({}, BON, { decision: '' })).ok);
  assert.ok(C.verifier(Object.assign({}, BON, { decision: null })).ok);
});
test('une sanction à nombre demande un nombre entier positif', () => {
  const mp = (q) => C.verifier(Object.assign({}, BON, { sanction_type: 'main_penalite', sanction_quantite: q }));
  assert.ok(mp(null).erreurs.sanction_quantite);
  assert.ok(mp('').erreurs.sanction_quantite);
  assert.ok(mp(0).erreurs.sanction_quantite);
  assert.ok(mp(1.5).erreurs.sanction_quantite);
  assert.ok(mp(2).ok);
  assert.ok(mp('3').ok);
  assert.ok(C.verifier(Object.assign({}, BON, { sanction_quantite: null })).ok);
});
test('les espaces seuls ne comptent pas', () => assert.ok(C.verifier(Object.assign({}, BON, { titre: '        ' })).erreurs.titre));
test('les bornes de la base sont respectées', () => {
  assert.ok(C.verifier(Object.assign({}, BON, { titre: 'x'.repeat(141) })).erreurs.titre);
  assert.ok(C.verifier(Object.assign({}, BON, { faits: 'x'.repeat(4001) })).erreurs.faits);
  assert.ok(C.verifier(Object.assign({}, BON, { regles: new Array(13).fill('r1') })).erreurs.regles);
  assert.ok(C.verifier(Object.assign({}, BON, { sanction_precision: 'x'.repeat(501) })).erreurs.sanction_precision);
});
test('commentaire ou motif obligatoire selon la décision', () => {
  assert.ok(C.verifierDecision('refuse', ''));
  assert.ok(C.verifierDecision('a_preciser', '   '));
  assert.ok(C.verifierDecision('archive', ''));
  assert.strictEqual(C.verifierDecision('valide', ''), null);
  assert.strictEqual(C.verifierDecision('refuse', 'Déjà couvert.'), null);
  assert.ok(C.verifierDecision('refuse', 'x'.repeat(1001)));
});

console.log('Recherche et choix des règles');
const BLOCS = [
  { id: 'r1', kind: 'regle', numero: '1', titre: 'Décisions des floors', ordre: 1, data: { elements: [] } },
  { id: 'r45', kind: 'regle', numero: '45', titre: 'Montant d\'une relance', ordre: 2, data: { elements: [] } },
  { id: 'r47', kind: 'regle', numero: '47', titre: 'Mise avec plusieurs jetons', ordre: 3, data: { elements: [] } },
  { id: 'rp5', kind: 'rp', numero: 'RP-5', titre: 'Cartes sorties prématurément', ordre: 4, data: { elements: [] } },
  { id: 'ex_45', kind: 'exemple', numero: '45', titre: 'Exemple', ordre: 5, data: { regle: '45', elements: [] } },
];
test('suggestions : par numéro, par mot, sans accent, sans doublon', () => {
  assert.deepStrictEqual(C.suggestions(BLOCS, '45').map(b => b.id), ['r45']);
  assert.deepStrictEqual(C.suggestions(BLOCS, 'rp 5').map(b => b.id), ['rp5']);
  assert.deepStrictEqual(C.suggestions(BLOCS, 'RP-5').map(b => b.id), ['rp5']);
  assert.deepStrictEqual(C.suggestions(BLOCS, 'premature').map(b => b.id), ['rp5']);
  assert.deepStrictEqual(C.suggestions(BLOCS, 'relance').map(b => b.id), ['r45']);
  assert.deepStrictEqual(C.suggestions(BLOCS, 'jetons', ['r47']).map(b => b.id), []);
  assert.deepStrictEqual(C.suggestions(BLOCS, '').map(b => b.id), ['r1', 'r45', 'r47', 'rp5']);
  assert.strictEqual(C.suggestions(BLOCS, '').length, 4);
});
test('les cas validés se retrouvent par la recherche : titre, faits, décision, sanction', () => {
  const cas = [{ id: 'aaaa-1', titre: 'Relance trop faible', faits: 'Un joueur avance un jeton inférieur au minimum sans annoncer.', decision: 'La mise est un call.', sanction_type: 'avertissement', sanction_precision: 'verbal, première fois' },
    { id: 'bbbb-2', titre: 'Carte exposée', faits: 'Le donneur expose une carte.', decision: null, sanction_type: 'main_penalite', sanction_quantite: 2 }];
  const idx = R.creerIndex(BLOCS.concat(C.enBlocs(cas)));
  const hit = (q) => R.chercher(idx, q).resultats.filter(r => r.kind === 'cas').map(r => r.id);
  assert.deepStrictEqual(hit('relance trop faible'), ['cas/aaaa-1']);
  assert.deepStrictEqual(hit('avertissement'), ['cas/aaaa-1']);
  assert.deepStrictEqual(hit('premiere fois'), ['cas/aaaa-1']);
  assert.deepStrictEqual(hit('call'), ['cas/aaaa-1']);
  assert.deepStrictEqual(hit('carte exposee'), ['cas/bbbb-2']);
  assert.deepStrictEqual(hit('2 mains'), ['cas/bbbb-2']);
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
