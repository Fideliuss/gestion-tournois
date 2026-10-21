// Tests de journal_texte.js : `node admin/journal_texte.test.js` (instantané)
const assert = require('assert');
const J = require('./journal_texte.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

const ctx = { nomCompte: id => ({ u1: 'Alice Admin' })[id] || null, libelleRole: s => ({ floor: 'Floor', croupier: 'Croupier' })[s] || s };
const d = (e) => J.decrire(Object.assign({ detail: {} }, e), ctx);

test('comptes : création, suppression, désactivation, réactivation', () => {
  assert.strictEqual(d({ action: 'compte_cree', detail: { email: 'a@b.fr', role: 'floor' } }), 'a créé le compte a@b.fr (rôle Floor)');
  assert.strictEqual(d({ action: 'compte_supprime', detail: { email: 'a@b.fr', role: 'croupier' } }), 'a supprimé le compte a@b.fr (rôle Croupier)');
  assert.strictEqual(d({ action: 'compte_desactive', ligne: 'u1', detail: { email: 'a@b.fr' } }), 'a désactivé le compte a@b.fr');
  assert.strictEqual(d({ action: 'compte_reactive', ligne: 'u1', detail: {} }), 'a réactivé le compte Alice Admin');
});
test('compte modifié : rôle avant et après, nom, mot de passe', () => {
  const t = d({ action: 'compte_modifie', ligne: 'u1', detail: { champs: ['role', 'nom', 'mot_de_passe'], role_avant: 'floor', role_apres: 'croupier' } });
  assert.strictEqual(t, 'a modifié le compte Alice Admin : rôle Floor → Croupier, prénom ou nom, mot de passe réinitialisé');
});
test('compte modifié dont le compte n\'existe plus', () => {
  assert.ok(d({ action: 'compte_modifie', ligne: 'inconnu', detail: { champs: ['nom'] } }).includes('supprimé depuis'));
});
test('résultats : un lot, au pluriel, avec tournoi et période', () => {
  assert.strictEqual(d({ action: 'INSERT', objet: 'results', detail: { lignes: 12, du: '2026-10-05', au: '2026-10-05', tournois: ['sunday-40k'] } }),
    'a ajouté 12 résultats (tournoi sunday-40k, le 05/10/2026)');
  assert.strictEqual(d({ action: 'DELETE', objet: 'results', detail: { lignes: 1, du: '2026-10-01', au: '2026-10-31', tournois: ['a', 'b'] } }),
    'a supprimé 1 résultat (tournois a, b, du 01/10/2026 au 31/10/2026)');
  assert.strictEqual(d({ action: 'UPDATE', objet: 'sessions', detail: { lignes: 1 } }), 'a modifié 1 session');
});
test('extras : champs modifiés en français, aucune valeur', () => {
  assert.strictEqual(d({ action: 'UPDATE', objet: 'extras', ligne: 'x', detail: { champs: ['adresse', 'date_naissance'] } }), 'a modifié un extra (adresse, date de naissance)');
  assert.strictEqual(d({ action: 'INSERT', objet: 'extras', ligne: 'x' }), 'a ajouté un extra');
  assert.strictEqual(d({ action: 'DELETE', objet: 'extras', ligne: 'x' }), 'a supprimé un extra');
});
test('tournois : le nom vient des valeurs ou, à défaut, de l\'identifiant', () => {
  assert.strictEqual(d({ action: 'INSERT', objet: 'tournaments', ligne: 't1', detail: { valeurs: { name: 'Sunday 40K' } } }), 'a ajouté le tournoi Sunday 40K');
  assert.strictEqual(d({ action: 'UPDATE', objet: 'tournaments', ligne: 't1', detail: { champs: ['pp', 'frais'], avant: { pp: 1, frais: 2 }, apres: { pp: 3, frais: 4 } } }), 'a modifié le tournoi t1 (prize pool, frais)');
});
test('rôles : accès ajoutés et retirés', () => {
  const t = d({ action: 'UPDATE', objet: 'app_roles', ligne: 'floor', detail: { champs: ['panels'], avant: { panels: ['tournois', 'tda'] }, apres: { panels: ['tournois', 'prize-pool'] } } });
  assert.strictEqual(t, 'a modifié le rôle Floor (ajouté : prize-pool ; retiré : tda)');
  assert.strictEqual(d({ action: 'INSERT', objet: 'app_roles', ligne: 'nouveau' }), 'a créé le rôle nouveau');
});
test('saisons, paramètres, plannings, règlement TDA', () => {
  assert.strictEqual(d({ action: 'INSERT', objet: 'saisons_cloturees', ligne: '2025' }), 'a clôturé la saison 2025 / 2026');
  assert.strictEqual(d({ action: 'DELETE', objet: 'saisons_cloturees', ligne: '2025' }), 'a rouvert la saison 2025 / 2026');
  assert.strictEqual(d({ action: 'UPDATE', objet: 'parametres', ligne: 'declaration_encadrement' }), 'a modifié le paramètre declaration_encadrement');
  assert.strictEqual(d({ action: 'UPDATE', objet: 'breaklist_plannings', ligne: '2026-10' }), 'a modifié le planning de 2026-10');
  assert.strictEqual(d({ action: 'UPDATE', objet: 'tda_editions', ligne: '2026-v1', detail: { champs: ['active'] } }), 'a modifié l\'édition 2026-v1 du règlement TDA (activation)');
});
test('objet inconnu : phrase de repli sans planter', () => {
  assert.strictEqual(d({ action: 'DELETE', objet: 'autre', ligne: '5' }), 'a supprimé autre 5');
  assert.ok(J.decrire({ action: 'INSERT', objet: 'results' }).length > 0);
});
test('aucun tiret cadratique dans les phrases ni dans les libellés', () => {
  const tout = JSON.stringify(J.OBJETS) + ['compte_cree', 'compte_modifie', 'INSERT'].map(a => d({ action: a, objet: 'results', detail: { champs: ['role'] } })).join('');
  assert.ok(!tout.includes(String.fromCharCode(0x2014)));
});
test('chaque domaine filtrable a un libellé', () => {
  assert.strictEqual(J.libelleObjet('compte'), 'Comptes');
  assert.strictEqual(J.libelleObjet('inconnu'), 'inconnu');
  assert.strictEqual(J.OBJETS.length, 11);
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
