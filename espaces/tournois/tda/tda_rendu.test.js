// Tests de tda_rendu.js : `node tda/tda_rendu.test.js` (quelques secondes)
// Les cas ci-dessous utilisent un texte FICTIF. Si l'édition importée est présente sur le poste
// (tda/outils/sortie/*.json), les mêmes propriétés sont aussi vérifiées sur tout son contenu.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('./tda_rendu.js');

let ok = 0;
function test(nom, f) { try { f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }
const brut = html => html.replace(/<button class="td-verif"[^>]*>\?<\/button>/g, '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const glo = [
  { id: 'g1', titre: 'UTG' }, { id: 'g2', titre: 'PLO' }, { id: 'g3', titre: 'PLO/8' }, { id: 'g4', titre: 'Bring-in' },
  { id: 'g5', titre: 'TD' }, { id: 'g6', titre: 'The Bubble' }, { id: 'g7', titre: 'SA' }, { id: 'g8', titre: 'BB' },
  { id: 'g9', titre: 'BBA' }, { id: 'g10', titre: 'Reentry ou RE' }, { id: 'g11', titre: 'M' },
];
const parId = { r1: { id: 'r1' }, r45: { id: 'r45' }, rp5: { id: 'rp5' } };
const ctx = { parId, glossaire: R.creerGlossaire(glo), exemplesVers: 'r45' };

console.log('Glossaire');
test('un sigle est repéré, avec sa casse', () => {
  const h = R.texteHtml('Le joueur UTG parle, utg non.', [], ctx);
  assert.strictEqual((h.match(/data-g="g1"/g) || []).length, 1);
});
test('TD, TDA et M ne sont jamais soulignés', () => {
  const h = R.texteHtml('Le TD décide. M-ratio du TDA. M', [], ctx);
  assert.ok(!/td-terme/.test(h), h);
});
test('le terme le plus long l\'emporte (PLO/8 avant PLO)', () => {
  const h = R.texteHtml('Une main de PLO/8 puis de PLO.', [], ctx);
  assert.ok(/data-g="g3">PLO\/8</.test(h) && /data-g="g2">PLO</.test(h), h);
});
test('BB ne se trouve pas dans BBA, ni dans un mot plus long', () => {
  const h = R.texteHtml('BBA et BB mais pas BBAB ni Ante-BB.', [], ctx);
  assert.deepStrictEqual((h.match(/data-g="(g\d+)"/g) || []), ['data-g="g9"', 'data-g="g8"']);
});
test('un mot est repéré quelle que soit sa casse, tiret ou espace compris', () => {
  const h = R.texteHtml('Le bring-in puis le Bring in, et la bubble.', [], ctx);
  assert.strictEqual((h.match(/data-g="g4"/g) || []).length, 2);
  assert.strictEqual((h.match(/data-g="g6"/g) || []).length, 1);
});
test('les variantes « Reentry ou RE » : Reentry seul est repéré, RE (2 lettres) non', () => {
  const h = R.texteHtml('Un reentry, pas un RE.', [], ctx);
  assert.strictEqual((h.match(/data-g="g10"/g) || []).length, 1);
});

console.log('Renvois');
test('un renvoi devient un lien vers la règle, sous-point compris', () => {
  const t = 'Voir la règle 45-B et RP-5.';
  const h = R.texteHtml(t, [{ a: 14, b: 18, cible: 'r45', sous: 'B' }, { a: 22, b: 26, cible: 'rp5', sous: null }], Object.assign({}, ctx, { exemplesVers: null }));
  assert.ok(/<a class="td-ref" href="#r45\/B">45-B<\/a>/.test(h) && /<a class="td-ref" href="#rp5">RP-5<\/a>/.test(h), h);
  assert.strictEqual(brut(h), t);
});
test('un renvoi vers un bloc inconnu reste du texte simple', () => {
  const h = R.texteHtml('règle 99', [{ a: 6, b: 8, cible: 'r99', sous: null }], ctx);
  assert.ok(!/<a /.test(h), h);
});
test('un renvoi à vérifier ajoute un bouton portant la note et la règle attendue', () => {
  const h = R.texteHtml('règle 49', [{ a: 6, b: 8, cible: 'r1', sous: null, verifier: { attendu: 'r45', note: 'Note "x" <b>' } }], ctx);
  assert.ok(/td-ref-verif/.test(h) && /class="td-verif"/.test(h) && /data-attendu="r45"/.test(h), h);
  assert.ok(!/<b>/.test(h) && /&lt;b&gt;/.test(h), 'la note doit être échappée : ' + h);
});
test('« voir exemples » renvoie vers les exemples de la règle, seulement s\'il y en a', () => {
  assert.ok(/href="#r45\/exemples">Voir exemples</.test(R.texteHtml('Voir exemples.', [], ctx)));
  assert.ok(!/<a /.test(R.texteHtml('Voir exemples.', [], Object.assign({}, ctx, { exemplesVers: null }))));
});

console.log('Sécurité et structure');
test('le texte est échappé', () => {
  const h = R.elementsHtml([{ t: 'p', texte: '<img src=x onerror=alert(1)> & "guillemets"' }], ctx, 'r1');
  assert.ok(!/<img/.test(h) && /&lt;img/.test(h) && /&amp;/.test(h), h);
});
test('points, sous-points, puces et notes sont rendus dans leur forme', () => {
  const h = R.elementsHtml([
    { t: 'p', texte: 'Intro' }, { t: 'pt', n: 'A', texte: 'Point' }, { t: 'sub', n: '1', texte: 'Sous-point' },
    { t: 'li', texte: 'Puce 1' }, { t: 'li', texte: 'Puce 2' }, { t: 'note', texte: 'Note' }, { t: 'note2', texte: 'Précision' },
  ], ctx, 'r1');
  assert.ok(/id="pt-r1-A"/.test(h) && /class="td-sub"/.test(h) && (h.match(/<ul class="td-ul">/g) || []).length === 1 && (h.match(/<li>/g) || []).length === 2, h);
  assert.ok(/td-note"/.test(h) && /td-note td-note-v/.test(h), h);
});
test('les exemples sont repliables et sans « voir exemples »', () => {
  const h = R.exemplesHtml([{ id: 'ex_45', numero: '45', titre: 'Montant', data: { elements: [{ t: 'p', texte: 'Voir exemples.' }] } }], ctx);
  assert.ok(/<details class="td-ex" id="ex_45">/.test(h) && !/<a /.test(h), h);
  assert.strictEqual(R.exemplesHtml([], ctx), '');
});

// ── Édition réelle (si présente sur ce poste) : le texte affiché doit être EXACTEMENT le texte importé ──
const dossier = path.join(__dirname, 'outils', 'sortie');
const fichiers = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter(f => /^tda_.*\.json$/.test(f)) : [];
fichiers.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
  const pId = {}; d.blocs.forEach(b => { pId[b.id] = b; });
  const c = { parId: pId, glossaire: R.creerGlossaire(d.blocs.filter(b => b.kind === 'glossaire')), exemplesVers: 'r1' };
  let n = 0, liens = 0, verifs = 0, termes = 0;
  console.log('Édition ' + f);
  test('tous les textes (règles, procédures, exemples) s\'affichent à l\'identique', () => {
    d.blocs.forEach(b => (b.data.elements || []).forEach(e => {
      const h = R.texteHtml(e.texte, e.renvois, c);
      assert.strictEqual(brut(h), e.texte, b.id);
      n++; liens += (h.match(/<a class="td-ref/g) || []).length; verifs += (h.match(/class="td-verif"/g) || []).length; termes += (h.match(/class="td-terme"/g) || []).length;
    }));
  });
  test('chaque renvoi existant devient un lien', () => {
    let attendus = 0, exemples = 0;
    d.blocs.forEach(b => (b.data.elements || []).forEach(e => { attendus += (e.renvois || []).filter(r => pId[r.cible]).length; exemples += (R.texteHtml(e.texte, [], c).match(/href="#r1\/exemples"/g) || []).length; }));
    assert.strictEqual(liens, attendus + exemples, liens + ' liens pour ' + attendus + ' renvois et ' + exemples + ' « voir exemples »');
  });
  test('les 7 renvois jugés erronés sont signalés', () => assert.strictEqual(verifs, d.blocs.reduce((s, b) => s + (b.data.elements || []).reduce((t, e) => t + (e.renvois || []).filter(r => r.verifier).length, 0), 0)));
  console.log('        ' + n + ' textes, ' + liens + ' liens, ' + verifs + ' renvois à vérifier, ' + termes + ' termes du glossaire repérés');
});

console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
