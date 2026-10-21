// Tests de reglages.js : `node shared/reglages.test.js` (instantané). L'affichage du bandeau et l'enchaînement avec les pages
// se vérifient dans le navigateur : voir la PR.
const assert = require('assert');
const { creerReglages } = require('./reglages.js');

let ok = 0;
async function test(nom, f) { try { await f(); ok++; console.log('  OK   ' + nom); } catch (e) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; } }

// Faux stockage local et fausse base
function faux(opts) {
  opts = opts || {};
  const base = Object.assign({}, opts.base || {});
  const local = Object.assign({}, opts.local || {});
  const journal = [], messages = [];
  const stockage = { get length() { return Object.keys(local).length; }, key: i => Object.keys(local)[i] || null, getItem: k => (k in local ? local[k] : null) };
  const deps = {
    lire: async p => { if (opts.lectureEchoue) throw new Error('réseau coupé'); return Object.keys(base).filter(c => c.indexOf(p) === 0).map(c => ({ cle: c, valeur: base[c] })); },
    ecrire: async (c, v) => { journal.push(['ecrire', c, JSON.stringify(v)]); if (opts.ecritureEchoue) throw new Error('refusé'); await new Promise(r => setTimeout(r, opts.delai ? opts.delai(c, journal.length) : 0)); base[c] = v; },
    local: stockage,
    signaler: m => messages.push(m),
  };
  return { R: creerReglages(deps), base, local, journal, messages };
}

(async () => {
  await test('lecture : la valeur de la base, sinon le défaut ; chaque lecture est une copie', async () => {
    const { R } = faux({ base: { extras_reglages: { weekdayTime: '19:00' } } });
    assert.strictEqual(await R.charger('extras_'), true);
    const a = R.lire('extras_reglages', {});
    assert.deepStrictEqual(a, { weekdayTime: '19:00' });
    a.weekdayTime = 'modifié sans enregistrer';
    assert.strictEqual(R.lire('extras_reglages', {}).weekdayTime, '19:00');
    assert.deepStrictEqual(R.lire('extras_absente', { par: 'défaut' }), { par: 'défaut' });
    const d = R.lire('extras_absente', { liste: [1] }); d.liste.push(2);
    assert.deepStrictEqual(R.lire('extras_absente', { liste: [1] }).liste, [1]);
  });

  await test('seul le préfixe demandé est chargé', async () => {
    const { R } = faux({ base: { extras_a: 1, declaration_b: 2 } });
    await R.charger('extras_');
    assert.strictEqual(R.lire('extras_a'), 1);
    assert.strictEqual(R.lire('declaration_b'), undefined);
  });

  await test('écriture : mémoire immédiate, puis base ; renvoie true', async () => {
    const { R, base } = faux();
    await R.charger('extras_');
    const p = R.ecrire('extras_reglages', { a: 1 });
    assert.deepStrictEqual(R.lire('extras_reglages'), { a: 1 });   // lisible avant même la fin de l'envoi
    assert.strictEqual(R.enAttente(), 1);
    assert.strictEqual(await p, true);
    assert.strictEqual(R.enAttente(), 0);
    assert.deepStrictEqual(base.extras_reglages, { a: 1 });
  });

  await test('les écritures d\'une même clé arrivent dans l\'ordre, même si la première est lente', async () => {
    const { R, base, journal } = faux({ delai: (c, n) => (n === 1 ? 30 : 0) });
    await R.charger('extras_');
    const a = R.ecrire('extras_x', 'premier'), b = R.ecrire('extras_x', 'second');
    await Promise.all([a, b]);
    assert.deepStrictEqual(journal.map(j => j[2]), ['"premier"', '"second"']);
    assert.strictEqual(base.extras_x, 'second');
  });

  await test('la valeur enregistrée est un instantané : modifier l\'objet ensuite n\'en change rien', async () => {
    const { R, journal } = faux();
    await R.charger('extras_');
    const o = { n: 1 }; const p = R.ecrire('extras_o', o); o.n = 2; await p;
    assert.strictEqual(journal[0][2], '{"n":1}');
  });

  await test('échec d\'écriture : false, bandeau, pas d\'exception ; une écriture réussie efface le bandeau', async () => {
    const f = faux({ ecritureEchoue: true });
    await f.R.charger('extras_');
    assert.strictEqual(await f.R.ecrire('extras_x', 1), false);
    assert.ok(/Enregistrement impossible : refusé/.test(f.messages.at(-1)));
    assert.strictEqual(f.R.enAttente(), 0);
    const g = faux();
    await g.R.charger('extras_');
    g.R.ecrire('extras_x', 1); await g.R.ecrire('extras_x', 2);
    assert.strictEqual(g.messages.at(-1), null);
  });

  await test('chargement impossible : bandeau, et plus aucune écriture sous ce préfixe (la base n\'est pas écrasée)', async () => {
    const f = faux({ lectureEchoue: true, base: { extras_reglages: { precieux: true } } });
    assert.strictEqual(await f.R.charger('extras_'), false);
    assert.ok(/n'ont pas pu être chargés \(réseau coupé\)/.test(f.messages.at(-1)));
    assert.strictEqual(await f.R.ecrire('extras_reglages', { defaut: true }), false);
    assert.deepStrictEqual(f.journal, []);
    assert.deepStrictEqual(f.base.extras_reglages, { precieux: true });
    // un autre préfixe n'est pas concerné
    assert.strictEqual(await f.R.ecrire('declaration_x', 1), true);
  });

  await test('un chargement réussi après un échec rouvre les écritures', async () => {
    const opts = { lectureEchoue: true };
    const f = faux(opts);
    await f.R.charger('extras_');
    opts.lectureEchoue = false;
    assert.strictEqual(await f.R.charger('extras_'), true);
    assert.strictEqual(await f.R.ecrire('extras_x', 1), true);
  });

  await test('reprise : une clé locale est envoyée à la base si la base ne l\'a pas, la copie locale reste', async () => {
    const f = faux({ local: { extras_cfg: '{"weekdayTime":"21:00"}', autre: '1' } });
    await f.R.charger('extras_', [{ locale: 'extras_cfg', cle: 'extras_reglages' }]);
    assert.deepStrictEqual(f.base.extras_reglages, { weekdayTime: '21:00' });
    assert.deepStrictEqual(f.R.lire('extras_reglages'), { weekdayTime: '21:00' });
    assert.strictEqual(f.local.extras_cfg, '{"weekdayTime":"21:00"}');   // jamais supprimée ici
  });

  await test('reprise : la base fait foi, la copie locale d\'un autre poste n\'écrase rien', async () => {
    const f = faux({ base: { extras_reglages: { weekdayTime: '19:00' } }, local: { extras_cfg: '{"weekdayTime":"21:00"}' } });
    await f.R.charger('extras_', [{ locale: 'extras_cfg', cle: 'extras_reglages' }]);
    assert.deepStrictEqual(f.base.extras_reglages, { weekdayTime: '19:00' });
    assert.deepStrictEqual(f.journal, []);
  });

  await test('reprise par motif : une clé de base par clé locale, seulement celles qui manquent', async () => {
    const f = faux({
      base: { extras_emargement_2026_43: { deja: 1 } },
      local: { extras_emarg_2026_43: '{"local":1}', extras_emarg_2026_44: '{"e1":{"lundi":true}}', extras_emarg_2025_52: '{}', extras_cfg: '{}', hors_sujet: '{}' },
    });
    const n = await f.R.charger('extras_', [{ locale: /^extras_emarg_(\d{4})_(\d{2})$/, cle: m => 'extras_emargement_' + m[1] + '_' + m[2] }]);
    assert.strictEqual(n, true);
    assert.deepStrictEqual(f.base.extras_emargement_2026_43, { deja: 1 });
    assert.deepStrictEqual(f.base.extras_emargement_2026_44, { e1: { lundi: true } });
    assert.deepStrictEqual(f.base.extras_emargement_2025_52, {});
    assert.strictEqual(Object.keys(f.base).length, 3);
  });

  await test('reprise : une copie locale illisible ou vide est ignorée', async () => {
    const f = faux({ local: { extras_cfg: 'pas du json', extras_vide: 'null' } });
    await f.R.charger('extras_', [{ locale: 'extras_cfg', cle: 'extras_reglages' }, { locale: 'extras_vide', cle: 'extras_vide2' }, { locale: 'absente', cle: 'extras_z' }]);
    assert.deepStrictEqual(f.base, {});
  });

  await test('reprise : un échec d\'envoi est signalé, la copie locale reste, pas de plantage', async () => {
    const f = faux({ ecritureEchoue: true, local: { extras_cfg: '{"a":1}' } });
    await f.R.charger('extras_', [{ locale: 'extras_cfg', cle: 'extras_reglages' }]);
    assert.ok(/Enregistrement impossible/.test(f.messages.at(-1)));
    assert.strictEqual(f.local.extras_cfg, '{"a":1}');
  });

  console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
})();
