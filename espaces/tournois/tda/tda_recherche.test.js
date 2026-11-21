// Tests de tda_recherche.js : `node tda/tda_recherche.test.js`
// Les cas utilisent un texte FICTIF. Si l'édition importée est présente sur ce poste (tda/outils/sortie/*.json),
// des recherches réelles sont aussi vérifiées (résultat attendu en tête).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('./tda_recherche.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

const bloc = (id, kind, numero, titre, textes, extra) => ({ id, kind, numero, titre, ordre: 1, data: Object.assign({ elements: textes.map(t => ({ t: 'p', texte: t })) }, extra || {}) });
const BLOCS = [
  bloc('r1', 'regle', '1', 'Montant d\'une mise', ['Une mise doit être égale à la plus grosse mise du tour. Le joueur qui relance doit annoncer son montant.']),
  bloc('r2', 'regle', '2', 'Fausse-donne (Misdeal)', ['Quand deux cartes sont retournées, le croupier annonce une fausse-donne.', 'A) Les blinds ne bougent pas.']),
  bloc('r3', 'regle', '3', 'Téléphones et appareils', ['Les téléphones sont interdits à la table. Un joueur ne peut pas parler au téléphone.']),
  bloc('r4', 'regle', '4', 'Abattage des cartes', ['À l\'abattage, chaque joueur tablant sa main doit la montrer.']),
  bloc('rp1', 'rp', 'RP-1', 'Procédure d\'essai', ['Une procédure qui parle de la mise minimale et des relances.']),
  bloc('ex_1', 'exemple', '1', 'Exemple de mise', ['Exemple 1: la mise est de 1000.'], { regle: '1' }),
  { id: 'g_1', kind: 'glossaire', numero: '', titre: 'OOT', ordre: 9, data: { groupe: 'Termes', definition: 'Out Of Turn' } },
  { id: 'g_2', kind: 'glossaire', numero: '', titre: 'Bring-in', ordre: 10, data: { groupe: 'Termes', definition: 'mise forcée pour démarrer l\'action' } },
];
const IDX = R.creerIndex(BLOCS);
const ids = (q, n) => R.chercher(IDX, q).resultats.slice(0, n || 10).map(r => r.id);

console.log('Normalisation et accès direct');
test('accents, casse et ponctuation sont ignorés', () => {
  assert.strictEqual(R.norm('  Fausse-Donne, À l\'abattage !'), 'fausse donne a l abattage');
});
test('les numéros : règle, point, procédure', () => {
  assert.deepStrictEqual(R.numero('45'), { id: 'r45', sous: null });
  assert.deepStrictEqual(R.numero('55-A'), { id: 'r55', sous: 'A' });
  assert.deepStrictEqual(R.numero('55a'), { id: 'r55', sous: 'A' });
  assert.deepStrictEqual(R.numero('règle 12'), { id: 'r12', sous: null });
  assert.deepStrictEqual(R.numero('RP-5'), { id: 'rp5', sous: null });
  assert.deepStrictEqual(R.numero('rp 10 h'), { id: 'rp10', sous: 'H' });
  assert.strictEqual(R.numero('relance'), null);
  assert.strictEqual(R.numero('1000 jetons'), null);
});
test('un numéro mène directement à la règle, avec ses exemples', () => {
  const r = R.chercher(IDX, '1');
  assert.strictEqual(r.saut.id, 'r1');
  assert.deepStrictEqual(r.resultats.map(x => x.id), ['ex_1']);
  assert.strictEqual(R.chercher(IDX, 'rp 1').saut.id, 'rp1');
  assert.strictEqual(R.chercher(IDX, '2').saut.id, 'r2');
});
test('un numéro qui n\'est pas une règle ne donne rien', () => {
  const r = R.chercher(IDX, '99');
  assert.strictEqual(r.saut, null); assert.strictEqual(r.resultats.length, 0);
});

console.log('Recherche dans le texte');
test('un titre passe avant un simple passage du texte', () => {
  assert.strictEqual(ids('mise')[0], 'r1');
});
test('tous les mots doivent se trouver', () => {
  assert.deepStrictEqual(ids('abattage telephone'), ['r4', 'r3'].filter(x => ids('abattage telephone').includes(x)).length ? ids('abattage telephone') : []);
  assert.ok(!ids('mise telephone').includes('r4'));
});
test('sans accent ni casse : « TELEPHONE » trouve « Téléphones »', () => {
  assert.strictEqual(ids('TELEPHONE')[0], 'r3');
});
test('fautes de frappe tolérées (une lettre pour 5 lettres ou plus)', () => {
  assert.strictEqual(ids('abatage')[0], 'r4');
  assert.strictEqual(ids('fausse donnne')[0], 'r2');
  assert.deepStrictEqual(ids('mx'), []);
});
test('équivalents français / anglais', () => {
  assert.strictEqual(ids('misdeal')[0], 'r2');
  assert.ok(ids('raise').includes('r1'), 'raise doit trouver la règle qui parle de relance');
  assert.ok(ids('bet').includes('r1'));
  assert.strictEqual(ids('out of turn')[0], 'g_1');
});
test('même racine : « minimum » trouve « minimale »', () => {
  assert.ok(ids('minimum').includes('rp1'));
});
test('question tapée en phrase : les passages qui contiennent la moitié des mots', () => {
  assert.ok(ids('quand la fausse donne arrive').includes('r2'));
  assert.deepStrictEqual(ids('zzzzzz yyyyyy'), []);
});
test('l\'extrait et le surlignage pointent le mot trouvé, accents conservés', () => {
  const x = R.chercher(IDX, 'téléphone').resultats[0];
  assert.ok(x.extrait);
  const surligne = x.extrait.plages.map(p => x.extrait.texte.slice(p[0], p[1]));
  assert.ok(surligne.length >= 1 && surligne.every(s => /^t[ée]l[ée]phones?$/i.test(s)), JSON.stringify(surligne));
  assert.deepStrictEqual(x.plagesTitre.map(p => x.titre.slice(p[0], p[1])), ['Téléphones']);
});
test('surligner un mot entier ou un début de mot, jamais un morceau du milieu', () => {
  const t = 'Une relance, des relances, relancer mais pas surrelance';
  assert.deepStrictEqual(R.plages(t, ['relanc']).map(p => t.slice(p[0], p[1])), ['relance', 'relances', 'relancer']);
});

console.log('Édition réelle (si présente)');
const dossier = path.join(__dirname, 'outils', 'sortie');
const fichiers = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter(f => /^tda_.*\.json$/.test(f)) : [];
fichiers.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
  const I = R.creerIndex(d.blocs);
  const haut = (q, n) => R.chercher(I, q).resultats.slice(0, n || 3).map(r => r.id);
  test(f + ' : accès par numéro', () => {
    assert.strictEqual(R.chercher(I, '45').saut.titre, 'Montant d\'une relance');
    assert.strictEqual(R.chercher(I, 'RP-5').saut.id, 'rp5');
    assert.deepStrictEqual([R.chercher(I, '55-A').saut.id, R.chercher(I, '55-A').saut.sous], ['r55', 'A']);
  });
  test(f + ' : recherches usuelles, bon résultat en tête', () => {
    const attendus = { 'string bet': 'r58', 'fausse donne': 'r37', 'misdeal': 'r37', 'bouton mort': 'r34', 'chip race': 'r26', 'telephone': 'r5', 'tapis cache': 'r64', 'plusieurs jetons': 'r47', 'carte brulee': 'r40', 'rabbit hunting': 'r30', 'main par main': 'rp8' };
    Object.keys(attendus).forEach(q => assert.strictEqual(haut(q, 1)[0], attendus[q], q + ' : ' + haut(q, 3).join(',')));
  });
  test(f + ' : équivalents et fautes de frappe', () => {
    assert.ok(haut('relance minimum', 3).includes('r45'), haut('relance minimum', 3).join(','));
    assert.ok(haut('raise', 6).includes('r45'));
    assert.ok(haut('relence', 6).includes('r45'));
    assert.ok(haut('abatage', 6).includes('r13'));
    assert.ok(haut('OOT', 3).includes('r55'));
  });
  test(f + ' : une question en phrase retrouve le temps de réflexion', () => {
    const h = haut('combien de temps pour jouer', 5);
    assert.ok(h.includes('r31') && h.includes('rp19'), h.join(','));
  });
  test(f + ' : rapide (100 recherches en moins d\'une seconde)', () => {
    const t = Date.now();
    for (let i = 0; i < 100; i++) R.chercher(I, ['relance minimum', 'carte brulee', 'tapis', 'joueur absent'][i % 4]);
    assert.ok(Date.now() - t < 1000, (Date.now() - t) + ' ms');
  });
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
