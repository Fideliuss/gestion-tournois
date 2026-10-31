// Tests de saisons.js : `node shared/saisons.test.js` (instantané). Les mêmes cas sont rejoués côté base :
// supabase/tests/saisons_fin_variable.test.sql
const assert = require('assert');
const { saisonDe, finDeSaison } = require('./saisons.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

test('sans fin enregistrée : du 1er novembre au 31 octobre', () => {
  assert.strictEqual(saisonDe('2090-11-01', {}), 2090);
  assert.strictEqual(saisonDe('2091-10-31', {}), 2090);
  assert.strictEqual(saisonDe('2091-11-01', {}), 2091);
  assert.strictEqual(saisonDe('2092-02-15', {}), 2091);
});

test('fin anticipée (29 octobre) : les 30 et 31 octobre passent dans la saison suivante', () => {
  const fins = { 2090: '2091-10-29' };
  assert.strictEqual(saisonDe('2091-10-29', fins), 2090);
  assert.strictEqual(saisonDe('2091-10-30', fins), 2091);
  assert.strictEqual(saisonDe('2091-10-31', fins), 2091);
  assert.strictEqual(saisonDe('2091-11-01', fins), 2091);
  assert.strictEqual(saisonDe('2090-11-01', fins), 2090);
});

test('fin tardive (3 novembre) : les premiers jours de novembre restent dans la saison qui se termine', () => {
  const fins = { 2090: '2091-11-03' };
  assert.strictEqual(saisonDe('2091-10-31', fins), 2090);
  assert.strictEqual(saisonDe('2091-11-03', fins), 2090);
  assert.strictEqual(saisonDe('2091-11-04', fins), 2091);
});

test('la fin d\'une saison ne touche pas les autres années', () => {
  const fins = { 2090: '2091-10-29' };
  assert.strictEqual(saisonDe('2090-10-30', fins), 2089);
  assert.strictEqual(saisonDe('2092-10-30', fins), 2091);
});

test('finDeSaison : la fin fixée, sinon le 31 octobre', () => {
  assert.strictEqual(finDeSaison(2090, { 2090: '2091-10-29' }), '2091-10-29');
  assert.strictEqual(finDeSaison(2091, { 2090: '2091-10-29' }), '2092-10-31');
});

console.log(ok + ' test(s) passé(s)');
