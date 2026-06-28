// Edge Function — Gestion des comptes utilisateurs
// Requiert : secret SERVICE_ROLE_KEY (supabase secrets set)
// Appelée uniquement par les admins (JWT vérifié côté serveur)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Vérification du JWT de l'appelant
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Non authentifié' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: 'Non authentifié' }, 401);

  // Vérification admin via app_metadata (non modifiable côté client)
  // Fallback sur user_metadata pour la période de migration
  const callerRole = user.app_metadata?.role || user.user_metadata?.role;
  if (callerRole !== 'admin') return json({ error: 'Accès réservé aux admins' }, 403);

  // Client admin (service role)
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // ── GET — liste des utilisateurs ──────────────────
    if (req.method === 'GET') {
      const { data, error } = await admin.auth.admin.listUsers();
      if (error) throw error;
      const users = data.users.map((u) => ({
        id:         u.id,
        email:      u.email,
        role:       u.app_metadata?.role || u.user_metadata?.role || 'floor',
        createdAt:  u.created_at,
        lastSignIn: u.last_sign_in_at,
      }));
      return json({ users });
    }

    // ── POST — créer un utilisateur ───────────────────
    if (req.method === 'POST') {
      const { email, password, role } = await req.json();
      if (!email || !password || !role) {
        return json({ error: 'email, password et role sont requis' }, 400);
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        user_metadata: { role },
        app_metadata:  { role },
        email_confirm: true,
      });
      if (error) throw error;
      return json({ user: { id: data.user.id, email: data.user.email, role } }, 201);
    }

    // ── PATCH — modifier rôle et/ou mot de passe ──────
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, role, password } = body;
      if (!id) return json({ error: 'id est requis' }, 400);

      const updates: Record<string, unknown> = {};
      if (role !== undefined) {
        updates.user_metadata = { role };
        updates.app_metadata  = { role };
      }
      if (password) updates.password = password;

      const { error } = await admin.auth.admin.updateUserById(id, updates);
      if (error) throw error;
      return json({ ok: true });
    }

    // ── DELETE — supprimer un utilisateur ─────────────
    if (req.method === 'DELETE') {
      const { id } = await req.json();
      if (!id) return json({ error: 'id est requis' }, 400);
      if (id === user.id) return json({ error: 'Impossible de supprimer votre propre compte' }, 400);

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: 'Méthode non autorisée' }, 405);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur';
    return json({ error: msg }, 500);
  }
});
