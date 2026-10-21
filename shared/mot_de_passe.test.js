// Tests de mot_de_passe.js : `node shared/mot_de_passe.test.js` (instantané)
const assert = require('assert');
const { MOT_DE_PASSE: M } = require('./mot_de_passe.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

console.log('Règles');
test('un mot de passe qui respecte tout est accepté', () => assert.strictEqual(M.erreur('Abcdef123!xy'), null));
test('11 caractères : refusé, la longueur est citée', () => assert.match(M.erreur('Abcde123!xy'), /12 caractères/));
test('chaque sorte de caractère manquante est citée', () => {
  assert.match(M.erreur('abcdefghij1!'), /majuscule/);
  assert.match(M.erreur('ABCDEFGHIJ1!'), /minuscule/);
  assert.match(M.erreur('Abcdefghijk!'), /chiffre/);
  assert.match(M.erreur('Abcdefghijk1'), /symbole/);
});
test('plusieurs manques sont listés ensemble', () => {
  const e = M.erreur('abc');
  assert.ok(/12 caractères/.test(e) && /majuscule/.test(e) && /chiffre/.test(e) && /symbole/.test(e), e);
});
test('une lettre accentuée ou un espace n\'est pas un symbole (comme chez Supabase)', () => {
  assert.match(M.erreur('Abcdefghij1é'), /symbole/);
  assert.match(M.erreur('Abcdefghij1 '), /symbole/);
});
test('chacun des symboles de Supabase compte', () => {
  for (const s of M.SYMBOLES) assert.strictEqual(M.erreur('Abcdefghij1' + s), null, 'symbole ' + s);
});
test('trop long : refusé', () => assert.match(M.erreur('Aa1!' + 'x'.repeat(70)), /trop long/));
test('vide, null et undefined : refusés sans planter', () => { for (const v of ['', null, undefined]) assert.ok(M.erreur(v)); });
test('liste() sert à cocher les règles pendant la saisie', () => {
  const l = M.liste('Abc');
  assert.deepStrictEqual(l.map(r => r.id + ':' + r.ok), ['longueur:false', 'minuscule:true', 'majuscule:true', 'chiffre:false', 'symbole:false']);
});

console.log('\nMessages d\'erreur Supabase');
test('mot de passe compromis', () => assert.match(M.messageErreur({ code: 'weak_password', reasons: ['pwned'] }), /compromis/));
test('mot de passe trop faible (longueur ou caractères)', () => {
  assert.match(M.messageErreur({ code: 'weak_password', reasons: ['length'] }), /12 caractères/);
  assert.match(M.messageErreur({ message: 'Password should contain at least one character of each', reasons: ['characters'] }), /minuscules, majuscules/);
});
test('mot de passe identique à l\'ancien', () => assert.match(M.messageErreur({ code: 'same_password' }), /différent/));
test('mot de passe actuel incorrect', () => {
  assert.match(M.messageErreur({ code: 'invalid_credentials' }), /actuel est incorrect/);
  assert.match(M.messageErreur({ message: 'Current password is incorrect' }), /actuel est incorrect/);
});
test('ré-authentification demandée', () => assert.match(M.messageErreur({ code: 'reauthentication_needed' }), /reconnectez/));
test('trop de tentatives', () => assert.match(M.messageErreur({ status: 429, message: 'x' }), /Trop de tentatives/));
test('erreur inconnue : le message d\'origine est conservé', () => assert.strictEqual(M.messageErreur({ message: 'boum' }), 'Erreur : boum'));
test('aucune erreur fournie : message neutre', () => assert.ok(M.messageErreur(null)));

console.log('\nGénérateur');
test('500 mots de passe générés respectent tous les règles et sont différents', () => {
  const vus = new Set();
  for (let i = 0; i < 500; i++) { const p = M.generer(); assert.strictEqual(M.erreur(p), null, p); assert.strictEqual(p.length, 16); vus.add(p); }
  assert.strictEqual(vus.size, 500);
});
test('aucun caractère ambigu (0 O 1 l I)', () => {
  for (let i = 0; i < 300; i++) assert.ok(!/[0O1lI]/.test(M.generer()));
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
