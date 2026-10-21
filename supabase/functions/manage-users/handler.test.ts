// Tests de la fonction manage-users, avec de faux clients Supabase (aucun réseau, aucune base).
// Lancer : node --experimental-strip-types supabase/functions/manage-users/handler.test.ts
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { traiter } from './handler.ts';
import { emailValide, erreurMotDePasse, estDesactive, roleDe, nettoyerNom } from './regles.ts';

let ok = 0;
async function test(nom: string, f: () => Promise<void> | void) {
  try { await f(); ok++; console.log('  OK   ' + nom); } catch (e: any) { console.log('  ECHEC ' + nom + '\n        ' + e.message); process.exitCode = 1; }
}

// ── Faux Supabase ─────────────────────────────────────────────────────────────
const ADMIN   = { id: 'u-admin',  email: 'admin@x.fr',  app_metadata: { role: 'admin' },  user_metadata: { role: 'admin', first_name: 'Ad', last_name: 'Min' } };
const AUTRE   = { id: 'u-autre',  email: 'autre@x.fr',  app_metadata: { role: 'admin' },  user_metadata: { role: 'admin' } };
const FLOOR   = { id: 'u-floor',  email: 'floor@x.fr',  app_metadata: { role: 'floor' },  user_metadata: { role: 'floor', first_name: 'Fl', last_name: 'Oor' } };
// Cas d'attaque : l'utilisateur a modifié lui-même son user_metadata
const PIRATE  = { id: 'u-pirate', email: 'pirate@x.fr', app_metadata: { role: 'floor' },  user_metadata: { role: 'admin' } };
const SANS    = { id: 'u-sans',   email: 'sans@x.fr',   app_metadata: {},                 user_metadata: { role: 'admin' }, banned_until: '2999-01-01T00:00:00Z' };
// Blocage échu : le compte est de nouveau actif
const ECHU    = { id: 'u-echu',   email: 'echu@x.fr',   app_metadata: { role: 'floor' },  user_metadata: {}, banned_until: '2000-01-01T00:00:00Z' };
const JETONS: Record<string, any> = { adm: ADMIN, flo: FLOOR, pir: PIRATE, san: SANS };

function monde(echecAudit = false) {
  const journal: any[] = [];
  const comptes: any[] = [ADMIN, AUTRE, FLOOR, PIRATE, SANS, ECHU].map(u => ({ ...u }));
  const roles = ['admin', 'floor', 'croupier'];
  const creerClient = (_url: string, cle: string, opts?: any) => {
    if (cle === 'anon') {
      const jeton = String(opts.global.headers.Authorization).replace('Bearer ', '');
      return { auth: { getUser: async () => JETONS[jeton] ? { data: { user: JETONS[jeton] }, error: null } : { data: { user: null }, error: { message: 'jeton invalide' } } } };
    }
    return {
      from: (table: string) => ({
        select: () => ({ eq: (_c: string, v: string) => ({ maybeSingle: async () => ({ data: table === 'app_roles' && roles.includes(v) ? { slug: v } : null, error: null }) }) }),
        insert: async (ligne: any) => { journal.push(['audit', table, ligne]); return { error: echecAudit ? { message: 'refusé' } : null }; },
      }),
      auth: { admin: {
        listUsers: async () => ({ data: { users: comptes }, error: null }),
        getUserById: async (id: string) => { const u = comptes.find(c => c.id === id); return u ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: 'introuvable' } }; },
        createUser: async (a: any) => { journal.push(['createUser', a]); return { data: { user: { id: 'nouveau', email: a.email } }, error: null }; },
        updateUserById: async (id: string, a: any) => { journal.push(['updateUserById', id, a]); return { error: null }; },
        deleteUser: async (id: string) => { journal.push(['deleteUser', id]); return { error: null }; },
      } },
    };
  };
  const env = (n: string) => ({ SUPABASE_URL: 'http://x', SUPABASE_ANON_KEY: 'anon', SERVICE_ROLE_KEY: 'service' } as any)[n];
  return { journal, deps: { env, creerClient } };
}

async function appel(methode: string, jeton: string | null, corps?: unknown, m = monde()) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jeton) headers.Authorization = 'Bearer ' + jeton;
  const rep = await traiter(new Request('http://f/manage-users', { method: methode, headers, body: corps === undefined ? undefined : JSON.stringify(corps) }), m.deps);
  return { status: rep.status, json: await rep.json().catch(() => null), journal: m.journal };
}

(async () => {
  console.log('Règles pures');
  await test('le rôle ne vient que de app_metadata', () => {
    assert.strictEqual(roleDe(PIRATE), 'floor');
    assert.strictEqual(roleDe(SANS), '');
    assert.strictEqual(roleDe(null), '');
  });
  await test('compte désactivé : banned_until dans le futur seulement', () => {
    assert.ok(estDesactive({ banned_until: '2999-01-01T00:00:00Z' }));
    assert.ok(!estDesactive({ banned_until: '2000-01-01T00:00:00Z' }));
    assert.ok(!estDesactive({ banned_until: null }) && !estDesactive({}) && !estDesactive(null));
  });
  await test('adresse e-mail et mot de passe', () => {
    assert.ok(emailValide('jean.dupont@groupebarriere.com'));
    assert.ok(!emailValide('pas un mail') && !emailValide('a@b') && !emailValide(undefined));
    assert.ok(erreurMotDePasse('court') !== null);
    assert.ok(erreurMotDePasse('Aa1!'.repeat(2) + 'Aa1') !== null);
    assert.strictEqual(erreurMotDePasse('Aa1!'.repeat(3)), null);
    assert.ok(erreurMotDePasse('Aa1!' + 'x'.repeat(70)) !== null);   // 74 caractères
    assert.ok(erreurMotDePasse(undefined) !== null);
  });
  await test('chaque sorte de caractère manquante est refusée', () => {
    assert.ok(erreurMotDePasse('abcdefghij1!')!.includes('majuscule'));
    assert.ok(erreurMotDePasse('ABCDEFGHIJ1!')!.includes('minuscule'));
    assert.ok(erreurMotDePasse('Abcdefghijk!')!.includes('chiffre'));
    assert.ok(erreurMotDePasse('Abcdefghijk1')!.includes('symbole'));
  });
  await test('les règles du serveur donnent le même verdict que celles du navigateur (shared/mot_de_passe.js)', () => {
    const ctx: any = { module: { exports: {} }, crypto: globalThis.crypto };
    vm.runInNewContext(readFileSync(new URL('../../../shared/mot_de_passe.js', import.meta.url), 'utf8').replace(/^const MOT_DE_PASSE/m, 'var MOT_DE_PASSE'), ctx);
    const navigateur = ctx.MOT_DE_PASSE;
    const echantillons = ['', 'a', 'court', 'Aa1!', 'Abcdefghij1!', 'abcdefghij1!', 'ABCDEFGHIJ1!', 'Abcdefghijk!', 'Abcdefghijk1', 'Abcdefghij1é',
      'Abcdefghij1 ', 'Aa1! Aa1! Aa1!', 'Aa1!'.repeat(18), 'Aa1!'.repeat(18) + 'x', 'MotDePasse2026', 'MotDePasse2026!', ...[...navigateur.SYMBOLES].map((s: string) => 'Abcdefghij1' + s)];
    for (const e of echantillons) {
      assert.strictEqual(erreurMotDePasse(e) === null, navigateur.erreur(e) === null, 'divergence sur « ' + e + ' »');
    }
    for (let i = 0; i < 200; i++) assert.strictEqual(erreurMotDePasse(navigateur.generer()), null);   // le générateur respecte aussi la règle du serveur
  });
  await test('nettoyage des noms', () => {
    assert.strictEqual(nettoyerNom('  Jean   Marc '), 'Jean Marc');
    assert.strictEqual(nettoyerNom(undefined), undefined);
    assert.strictEqual(nettoyerNom('x'.repeat(100))!.length, 60);
  });

  console.log('\nAccès');
  await test('sans jeton : 401', async () => assert.strictEqual((await appel('GET', null)).status, 401));
  await test('jeton invalide : 401', async () => assert.strictEqual((await appel('GET', 'zzz')).status, 401));
  await test('un floor : 403', async () => assert.strictEqual((await appel('GET', 'flo')).status, 403));
  await test('CAS D\'ATTAQUE : user_metadata.role = admin mais app_metadata = floor : 403', async () => assert.strictEqual((await appel('GET', 'pir')).status, 403));
  await test('CAS D\'ATTAQUE : compte sans app_metadata.role (ancien repli) : 403', async () => assert.strictEqual((await appel('GET', 'san')).status, 403));
  await test('CAS D\'ATTAQUE : le pirate ne peut ni créer ni supprimer', async () => {
    assert.strictEqual((await appel('POST', 'pir', { email: 'a@b.fr', password: 'x'.repeat(12), role: 'admin' })).status, 403);
    assert.strictEqual((await appel('DELETE', 'pir', { id: 'u-floor' })).status, 403);
  });
  await test('OPTIONS répond sans jeton (préparation CORS)', async () => assert.strictEqual((await appel('OPTIONS', null)).status, 200));

  console.log('\nListe');
  await test('un admin liste les comptes ; le rôle vient de app_metadata, sans rôle : floor', async () => {
    const r = await appel('GET', 'adm');
    assert.strictEqual(r.status, 200);
    const parId = Object.fromEntries(r.json.users.map((u: any) => [u.id, u.role]));
    assert.strictEqual(parId['u-pirate'], 'floor');   // son user_metadata dit admin : ignoré
    assert.strictEqual(parId['u-sans'], 'floor');
    assert.strictEqual(parId['u-admin'], 'admin');
  });
  await test('la liste indique les comptes désactivés (blocage en cours seulement)', async () => {
    const r = await appel('GET', 'adm');
    const off = Object.fromEntries(r.json.users.map((u: any) => [u.id, u.disabled]));
    assert.deepStrictEqual([off['u-sans'], off['u-echu'], off['u-floor']], [true, false, false]);
  });

  console.log('\nCréation');
  const bon = { email: 'Jean.Dupont@GroupeBarriere.com ', password: 'Aa1!'.repeat(3), role: 'croupier', firstName: 'Jean', lastName: 'Dupont' };
  await test('création valide : 201, rôle dans app_metadata, e-mail en minuscules', async () => {
    const r = await appel('POST', 'adm', bon);
    assert.strictEqual(r.status, 201, JSON.stringify(r.json));
    const [, a] = r.journal.find(j => j[0] === 'createUser');
    assert.strictEqual(a.email, 'jean.dupont@groupebarriere.com');
    assert.deepStrictEqual(a.app_metadata, { role: 'croupier' });
    assert.deepStrictEqual(a.user_metadata, { first_name: 'Jean', last_name: 'Dupont' });   // jamais le rôle dans user_metadata
    assert.strictEqual(a.email_confirm, true);
  });
  await test('champs manquants : 400', async () => assert.strictEqual((await appel('POST', 'adm', { email: 'a@b.fr' })).status, 400));
  await test('e-mail invalide : 400', async () => assert.strictEqual((await appel('POST', 'adm', { ...bon, email: 'nimporte' })).status, 400));
  await test('mot de passe de 11 caractères : 400, et rien n\'est créé', async () => {
    const r = await appel('POST', 'adm', { ...bon, password: 'Aa1!'.repeat(2) + 'Aa1' });
    assert.strictEqual(r.status, 400);
    assert.ok(!r.journal.some(j => j[0] === 'createUser'));
  });
  await test('rôle inexistant : 400, et rien n\'est créé', async () => {
    const r = await appel('POST', 'adm', { ...bon, role: 'super-admin' });
    assert.strictEqual(r.status, 400);
    assert.ok(!r.journal.some(j => j[0] === 'createUser'));
  });
  await test('corps non JSON : 400', async () => {
    const m = monde();
    const rep = await traiter(new Request('http://f', { method: 'POST', headers: { Authorization: 'Bearer adm' }, body: 'pas du json' }), m.deps);
    assert.strictEqual(rep.status, 400);
  });

  console.log('\nModification');
  await test('changer le rôle d\'un autre compte : app_metadata mis à jour', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-floor', role: 'croupier' });
    assert.strictEqual(r.status, 200);
    const [, id, a] = r.journal.find(j => j[0] === 'updateUserById');
    assert.strictEqual(id, 'u-floor');
    assert.deepStrictEqual(a.app_metadata, { role: 'croupier' });
    assert.strictEqual(a.user_metadata, undefined);                // changer le rôle ne touche pas user_metadata
  });
  await test('changer le prénom : le nom est conservé, l\'ancien rôle de user_metadata est nettoyé, app_metadata intact', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-floor', firstName: 'Nouveau' });
    assert.strictEqual(r.status, 200);
    const [, , a] = r.journal.find(j => j[0] === 'updateUserById');
    assert.strictEqual(a.user_metadata.first_name, 'Nouveau');
    assert.ok(a.user_metadata.last_name !== undefined);
    assert.strictEqual('role' in a.user_metadata, false);
    assert.strictEqual(a.app_metadata, undefined);
  });
  await test('rôle inexistant : 400', async () => assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-floor', role: 'dieu' })).status, 400));
  await test('un admin ne peut pas changer son propre rôle', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-admin', role: 'floor' });
    assert.strictEqual(r.status, 400);
    assert.ok(!r.journal.some(j => j[0] === 'updateUserById'));
  });
  await test('un admin peut modifier son propre prénom, et renvoyer son rôle actuel', async () => {
    assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-admin', firstName: 'Nouveau' })).status, 200);
    assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-admin', role: 'admin' })).status, 200);
  });
  await test('mot de passe trop court : 400', async () => assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-floor', password: 'court' })).status, 400));
  await test('mot de passe valide : transmis tel quel', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-floor', password: 'Bb2@'.repeat(4) });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.journal.find(j => j[0] === 'updateUserById')[2].password, 'Bb2@'.repeat(4));
  });
  await test('compte introuvable : 404', async () => assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-fantome', firstName: 'X' })).status, 404));
  await test('id manquant : 400', async () => assert.strictEqual((await appel('PATCH', 'adm', { role: 'floor' })).status, 400));

  console.log('\nSuppression');
  await test('supprimer un autre compte : 200', async () => {
    const r = await appel('DELETE', 'adm', { id: 'u-floor' });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.journal.find(j => j[0] === 'deleteUser'), ['deleteUser', 'u-floor']);
  });
  await test('supprimer son propre compte : 400', async () => assert.strictEqual((await appel('DELETE', 'adm', { id: 'u-admin' })).status, 400));
  await test('id manquant : 400', async () => assert.strictEqual((await appel('DELETE', 'adm', {})).status, 400));
  console.log('\nDésactivation');
  await test('désactiver un compte : blocage de 10 ans, journalisé', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-floor', disabled: true });
    assert.strictEqual(r.status, 200);
    const [, , a] = r.journal.find(j => j[0] === 'updateUserById');
    assert.deepStrictEqual(a, { ban_duration: '87600h' });
    const [l] = r.journal.filter(j => j[0] === 'audit').map(j => j[2]);
    assert.deepStrictEqual({ action: l.action, ligne: l.ligne, detail: l.detail }, { action: 'compte_desactive', ligne: 'u-floor', detail: { email: 'floor@x.fr' } });
  });
  await test('réactiver un compte désactivé : blocage levé, journalisé', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-sans', disabled: false });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.journal.find(j => j[0] === 'updateUserById')[2], { ban_duration: 'none' });
    assert.strictEqual(r.journal.find(j => j[0] === 'audit')[2].action, 'compte_reactive');
  });
  await test('déjà dans l\'état demandé : appliqué mais rien dans le journal', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-floor', disabled: false });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.journal.filter(j => j[0] === 'audit').length, 0);
  });
  await test('on ne peut pas désactiver son propre compte (mais on peut le « réactiver »)', async () => {
    const r = await appel('PATCH', 'adm', { id: 'u-admin', disabled: true });
    assert.strictEqual(r.status, 400);
    assert.ok(!r.journal.some(j => j[0] === 'updateUserById'));
    assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-admin', disabled: false })).status, 200);
  });
  await test('valeur non booléenne : 400 ; compte introuvable : 404 ; non admin : 403', async () => {
    assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-floor', disabled: 'oui' })).status, 400);
    assert.strictEqual((await appel('PATCH', 'adm', { id: 'u-fantome', disabled: true })).status, 404);
    assert.strictEqual((await appel('PATCH', 'flo', { id: 'u-autre', disabled: true })).status, 403);
  });

  console.log('\nJournal d\'audit');
  const audits = (r: { journal: any[] }) => r.journal.filter(j => j[0] === 'audit').map(j => j[2]);
  await test('création : compte_cree avec l\'acteur, l\'e-mail et le rôle, sans mot de passe', async () => {
    const r = await appel('POST', 'adm', bon);
    const [a] = audits(r);
    assert.strictEqual(audits(r).length, 1);
    assert.strictEqual(r.journal.find(j => j[0] === 'audit')[1], 'journal_audit');
    assert.deepStrictEqual({ ...a, detail: undefined }, { acteur: 'u-admin', role_acteur: 'admin', action: 'compte_cree', objet: 'compte', ligne: 'nouveau', detail: undefined });
    assert.deepStrictEqual(a.detail, { email: 'jean.dupont@groupebarriere.com', role: 'croupier' });
    assert.ok(!JSON.stringify(a).includes(bon.password));
  });
  await test('changement de rôle : compte_modifie avec l\'ancien et le nouveau rôle', async () => {
    const [a] = audits(await appel('PATCH', 'adm', { id: 'u-floor', role: 'croupier' }));
    assert.strictEqual(a.action, 'compte_modifie');
    assert.strictEqual(a.ligne, 'u-floor');
    assert.deepStrictEqual(a.detail, { champs: ['role'], role_avant: 'floor', role_apres: 'croupier' });
  });
  await test('rôle renvoyé inchangé : rien dans le journal', async () => assert.strictEqual(audits(await appel('PATCH', 'adm', { id: 'u-admin', role: 'admin' })).length, 0));
  await test('mot de passe et nom : champs journalisés, jamais le mot de passe ni le nom saisi', async () => {
    const mdp = 'Bb2@'.repeat(4);
    const r = await appel('PATCH', 'adm', { id: 'u-floor', password: mdp, firstName: 'Prenomsecret' });
    const [a] = audits(r);
    assert.deepStrictEqual(a.detail.champs, ['nom', 'mot_de_passe']);
    assert.ok(!JSON.stringify(a).includes(mdp) && !JSON.stringify(a).includes('Prenomsecret'));
  });
  await test('suppression : compte_supprime avec l\'e-mail du compte supprimé', async () => {
    const [a] = audits(await appel('DELETE', 'adm', { id: 'u-floor' }));
    assert.strictEqual(a.action, 'compte_supprime');
    assert.deepStrictEqual(a.detail, { email: 'floor@x.fr', role: 'floor' });
  });
  await test('demande refusée ou invalide : rien dans le journal', async () => {
    assert.strictEqual(audits(await appel('POST', 'pir', bon)).length, 0);
    assert.strictEqual(audits(await appel('POST', 'adm', { ...bon, role: 'dieu' })).length, 0);
    assert.strictEqual(audits(await appel('DELETE', 'adm', { id: 'u-admin' })).length, 0);
  });
  await test('si le journal échoue, l\'opération reste réussie', async () => {
    const r = await appel('POST', 'adm', bon, monde(true));
    assert.strictEqual(r.status, 201);
  });

  await test('méthode inconnue : 405', async () => assert.strictEqual((await appel('PUT', 'adm', {})).status, 405));

  console.log('\n' + ok + ' contrôles réussis' + (process.exitCode ? ', avec des échecs' : '') + '.');
})();
