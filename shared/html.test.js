// Tests de html.js : `node shared/html.test.js` (instantané)
const assert = require('assert');
const { escapeHtml } = require('./html.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

test('les cinq caractères dangereux sont échappés', () => {
  assert.strictEqual(escapeHtml(`& < > " '`), '&amp; &lt; &gt; &quot; &#39;');
});
test('le texte ordinaire (accents compris) n\'est pas modifié', () => {
  assert.strictEqual(escapeHtml('Éloïse O’Brien-Müller'), 'Éloïse O’Brien-Müller');
});
test('null, undefined et les nombres sont acceptés', () => {
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
  assert.strictEqual(escapeHtml(0), '0');
  assert.strictEqual(escapeHtml(12.5), '12.5');
});
test('une balise active devient du texte inerte', () => {
  const h = escapeHtml('<img src=x onerror=alert(1)>');
  assert.ok(!/[<>]/.test(h), h);
});
test('on ne peut pas sortir d\'un attribut entre guillemets', () => {
  const v = escapeHtml('" onfocus="alert(1)" x="');
  // Aucun guillemet brut ne subsiste : la valeur reste enfermée dans value="…"
  assert.ok(!v.includes('"') && !v.includes("'"), v);
});
test('l\'échappement n\'est pas appliqué deux fois par erreur : &amp; reste visible comme texte', () => {
  assert.strictEqual(escapeHtml('&amp;'), '&amp;amp;');
});
test('une entité numérique en majuscules (contournement des mises en majuscules) est neutralisée', () => {
  assert.strictEqual(escapeHtml('&#X61;LERT'), '&amp;#X61;LERT');
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
