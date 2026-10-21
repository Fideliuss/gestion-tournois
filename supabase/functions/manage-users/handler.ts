// Gestion des comptes utilisateurs : logique de la fonction, avec ses dépendances injectées
// (index.ts fournit Deno.env et createClient ; handler.test.ts fournit des faux clients).
// Requiert : secret SERVICE_ROLE_KEY (supabase secrets set). Appelée uniquement par les admins.

import { emailValide, erreurMotDePasse, estAdmin, estDesactive, nettoyerNom, roleDe } from './regles.ts';

// Un compte désactivé est bloqué (ban_duration) : plus de connexion ni de renouvellement de session. Ses données sont conservées.
const DUREE_DESACTIVATION = '87600h';   // 10 ans, « jusqu'à réactivation »

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export interface Dependances {
  env: (nom: string) => string | undefined;
  creerClient: (url: string, cle: string, options?: unknown) => any;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Un rôle n'est accepté que s'il existe dans app_roles (le client admin contourne la RLS)
async function roleExiste(admin: any, slug: unknown): Promise<boolean> {
  if (typeof slug !== 'string' || !slug) return false;
  const { data, error } = await admin.from('app_roles').select('slug').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return !!data;
}

// Journal d'audit (table journal_audit, voir supabase/migrations/journal_audit.sql). Jamais de mot de passe ni de donnée
// inutile. Un échec d'écriture ne bloque pas l'opération déjà faite : il est tracé dans les journaux de la fonction.
async function journaliser(admin: any, acteur: any, action: string, ligne: string, detail: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await admin.from('journal_audit').insert({
      acteur: acteur.id, role_acteur: roleDe(acteur) || 'système', action, objet: 'compte', ligne, detail,
    });
    if (error) console.error('journal_audit : ' + error.message);
  } catch (e) {
    console.error('journal_audit : ' + (e instanceof Error ? e.message : String(e)));
  }
}

async function lireCorps(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const corps = await req.json();
    return corps && typeof corps === 'object' ? corps : null;
  } catch {
    return null;
  }
}

export async function traiter(req: Request, deps: Dependances): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Vérification du JWT de l'appelant
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Non authentifié' }, 401);

  const userClient = deps.creerClient(
    deps.env('SUPABASE_URL')!,
    deps.env('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: 'Non authentifié' }, 401);

  // Admin : app_metadata uniquement (posé par cette fonction, non modifiable par l'utilisateur)
  if (!estAdmin(user)) return json({ error: 'Accès réservé aux admins' }, 403);

  // Client admin (service role)
  const admin = deps.creerClient(
    deps.env('SUPABASE_URL')!,
    deps.env('SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    // ── GET - liste des utilisateurs ──────────────────
    if (req.method === 'GET') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const users = data.users.map((u: any) => ({
        id:         u.id,
        email:      u.email,
        role:       roleDe(u) || 'floor',
        firstName:  u.user_metadata?.first_name || '',
        lastName:   u.user_metadata?.last_name  || '',
        createdAt:  u.created_at,
        lastSignIn: u.last_sign_in_at,
        disabled:   estDesactive(u),
      }));
      return json({ users });
    }

    // ── POST - créer un utilisateur ───────────────────
    if (req.method === 'POST') {
      const body = await lireCorps(req);
      if (!body) return json({ error: 'Corps de requête invalide' }, 400);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email;
      const { password, role } = body;
      if (!email || !password || !role) {
        return json({ error: 'email, password et role sont requis' }, 400);
      }
      if (!emailValide(email)) return json({ error: 'Adresse e-mail invalide' }, 400);
      const erreurMdp = erreurMotDePasse(password);
      if (erreurMdp) return json({ error: erreurMdp }, 400);
      if (!(await roleExiste(admin, role))) return json({ error: 'Rôle inconnu' }, 400);

      const firstName = nettoyerNom(body.firstName) || '';
      const lastName  = nettoyerNom(body.lastName)  || '';
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        // Le rôle n'est écrit que dans app_metadata (seul lu par les pages, la RLS et cette fonction). user_metadata est
        // modifiable par l'utilisateur lui-même : on n'y met que le prénom et le nom.
        user_metadata: { first_name: firstName, last_name: lastName },
        app_metadata:  { role },
        email_confirm: true,
      });
      if (error) throw error;
      await journaliser(admin, user, 'compte_cree', data.user.id, { email: data.user.email, role });
      return json({ user: { id: data.user.id, email: data.user.email, role, firstName, lastName } }, 201);
    }

    // ── PATCH - modifier rôle, prénom / nom et/ou mot de passe ──
    if (req.method === 'PATCH') {
      const body = await lireCorps(req);
      if (!body) return json({ error: 'Corps de requête invalide' }, 400);
      const { id, role, password, disabled } = body;
      if (!id || typeof id !== 'string') return json({ error: 'id est requis' }, 400);
      if (disabled !== undefined && typeof disabled !== 'boolean') return json({ error: 'disabled doit être vrai ou faux' }, 400);
      if (disabled === true && id === user.id) return json({ error: 'Vous ne pouvez pas désactiver votre propre compte' }, 400);

      if (role !== undefined) {
        if (!(await roleExiste(admin, role))) return json({ error: 'Rôle inconnu' }, 400);
        // Un admin ne change pas son propre rôle : il y aura toujours au moins un administrateur (l'appelant)
        if (id === user.id && role !== roleDe(user)) {
          return json({ error: 'Vous ne pouvez pas modifier votre propre rôle' }, 400);
        }
      }
      if (password) {
        const erreurMdp = erreurMotDePasse(password);
        if (erreurMdp) return json({ error: erreurMdp }, 400);
      }

      const firstName = nettoyerNom(body.firstName);
      const lastName  = nettoyerNom(body.lastName);

      const updates: Record<string, unknown> = {};
      let actuel: any = null;
      if (role !== undefined || firstName !== undefined || lastName !== undefined || disabled !== undefined) {
        const { data: current, error: curErr } = await admin.auth.admin.getUserById(id);
        if (curErr || !current?.user) return json({ error: 'Compte introuvable' }, 404);
        actuel = current.user;
      }
      if (firstName !== undefined || lastName !== undefined) {
        // On repart des métadonnées actuelles : modifier le prénom ne doit pas effacer les autres champs
        const current = { user: actuel };
        const meta: Record<string, unknown> = { ...(current.user.user_metadata || {}) };
        delete meta.role;   // ancien doublon du rôle, sans effet : nettoyé au passage
        if (firstName !== undefined) meta.first_name = firstName;
        if (lastName !== undefined)  meta.last_name  = lastName;
        updates.user_metadata = meta;
      }
      if (role !== undefined) updates.app_metadata = { role };
      if (password) updates.password = password;
      if (disabled !== undefined) updates.ban_duration = disabled ? DUREE_DESACTIVATION : 'none';

      const { error } = await admin.auth.admin.updateUserById(id, updates);
      if (error) throw error;

      const champs: string[] = [];
      const detail: Record<string, unknown> = {};
      if (role !== undefined && role !== roleDe(actuel)) { champs.push('role'); detail.role_avant = roleDe(actuel); detail.role_apres = role; }
      if (firstName !== undefined || lastName !== undefined) champs.push('nom');
      if (password) champs.push('mot_de_passe');
      if (champs.length) await journaliser(admin, user, 'compte_modifie', id, { champs, ...detail });
      if (disabled !== undefined && disabled !== estDesactive(actuel)) {
        await journaliser(admin, user, disabled ? 'compte_desactive' : 'compte_reactive', id, { email: actuel.email });
      }
      return json({ ok: true });
    }

    // ── DELETE - supprimer un utilisateur ─────────────
    if (req.method === 'DELETE') {
      const body = await lireCorps(req);
      const id = body && body.id;
      if (!id || typeof id !== 'string') return json({ error: 'id est requis' }, 400);
      if (id === user.id) return json({ error: 'Impossible de supprimer votre propre compte' }, 400);

      // Pour garder une trace de qui a été supprimé (le compte n'existera plus ensuite)
      const { data: cible } = await admin.auth.admin.getUserById(id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      await journaliser(admin, user, 'compte_supprime', id, { email: cible?.user?.email ?? null, role: cible?.user ? roleDe(cible.user) : null });
      return json({ ok: true });
    }

    return json({ error: 'Méthode non autorisée' }, 405);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur';
    return json({ error: msg }, 500);
  }
}
