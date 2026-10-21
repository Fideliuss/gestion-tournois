// Tests de inactivite.js : `node shared/inactivite.test.js` (instantané). Le comportement dans le navigateur
// (avertissement, compte à rebours, déconnexion) se vérifie à la main : voir la PR.
const assert = require('assert');
const I = require('./inactivite.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }
const MIN = 60000;

test('délai : 30 minutes pour admin et mcd, 2 heures pour tous les autres rôles', () => {
  assert.strictEqual(I.delaiPour('admin'), 30 * MIN);
  assert.strictEqual(I.delaiPour('mcd'), 30 * MIN);
  ['floor', 'croupier', 'caisse', 'chef-de-table', 'rôle-créé-plus-tard', '', undefined].forEach(r => assert.strictEqual(I.delaiPour(r), 120 * MIN, String(r)));
});
test('temps restant : délai moins le temps écoulé depuis la dernière activité', () => {
  assert.strictEqual(I.reste(1000, 1000, 30 * MIN), 30 * MIN);
  assert.strictEqual(I.reste(1000, 1000 + 10 * MIN, 30 * MIN), 20 * MIN);
  assert.strictEqual(I.reste(1000, 1000 + 30 * MIN, 30 * MIN), 0);
});
test('état : actif, avertissement pendant la dernière minute, expiré à zéro et en dessous', () => {
  assert.strictEqual(I.etat(25 * MIN), 'actif');
  assert.strictEqual(I.etat(I.PREAVIS_MS + 1), 'actif');
  assert.strictEqual(I.etat(I.PREAVIS_MS), 'avertir');
  assert.strictEqual(I.etat(1), 'avertir');
  assert.strictEqual(I.etat(0), 'expire');
  assert.strictEqual(I.etat(-5 * MIN), 'expire');
});
test('une session restée inactive toute une nuit est expirée à l\'ouverture', () => {
  const dernier = Date.parse('2026-10-21T22:00:00Z'), matin = Date.parse('2026-10-22T08:00:00Z');
  assert.strictEqual(I.etat(I.reste(dernier, matin, I.delaiPour('croupier'))), 'expire');
  assert.strictEqual(I.etat(I.reste(dernier, matin, I.delaiPour('admin'))), 'expire');
});
test('nettoyage : vide la mémoire de l\'onglet et l\'horodatage, sans toucher aux autres clés', () => {
  const journal = [];
  const session = { clear: () => journal.push('session.clear') };
  const local = { removeItem: k => journal.push('local.remove:' + k) };
  I.nettoyer(session, local);
  assert.deepStrictEqual(journal, ['session.clear', 'local.remove:pm_activite']);
});
test('nettoyage : un stockage indisponible ne fait pas échouer la déconnexion', () => {
  const casse = { clear() { throw new Error('refusé'); }, removeItem() { throw new Error('refusé'); } };
  I.nettoyer(casse, casse);
  I.nettoyer(null, null);
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
