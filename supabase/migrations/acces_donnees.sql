-- ══════════════════════════════════════════════════════
--  Accès aux données : une politique par table, fondée sur les panels du rôle (app_roles.panels)
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/acces_donnees.sql).
--  Idempotent : peut être rejoué sans effet de bord. Ne contient aucune donnée.
--
--  Avant : extras, results, sessions et tournaments avaient la politique « allow authenticated all » (true / true) :
--  n'importe quel compte connecté, croupier compris, pouvait tout lire et tout modifier par appel direct à l'API,
--  quelles que soient les pages auxquelles son rôle donne accès (les gardes de page sont côté navigateur).
--
--  Après :
--    extras                  panel 'admin-tournois' (lecture et écriture)
--    results, sessions       panel 'leaderboard' (lecture et écriture)
--    tournaments  lecture    panels 'leaderboard', 'prize-pool' ou 'admin-tournois'
--                 écriture   panels 'prize-pool' (pp / frais depuis le prize pool) ou 'admin-tournois' (configuration)
--  Le rôle 'admin' passe toujours. Le rôle est lu dans app_metadata uniquement (user_metadata est modifiable par l'utilisateur).
--  Tests : supabase/tests/acces_donnees.test.sql
-- ══════════════════════════════════════════════════════

-- Vrai si l'utilisateur connecté est admin ou si son rôle (app_metadata) a le panel demandé
CREATE OR REPLACE FUNCTION public.a_le_panel(panel text)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      OR EXISTS (
           SELECT 1 FROM public.app_roles r
           WHERE r.slug = (auth.jwt() -> 'app_metadata' ->> 'role')
             AND r.panels ? panel
         );
$$;

-- Supabase accorde EXECUTE à anon sur toute nouvelle fonction du schéma public : le retirer explicitement
REVOKE ALL ON FUNCTION public.a_le_panel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.a_le_panel(text) TO authenticated;

-- extras
DROP POLICY IF EXISTS "allow authenticated all" ON public.extras;
DROP POLICY IF EXISTS "extras_admin_tournois" ON public.extras;
CREATE POLICY "extras_admin_tournois" ON public.extras
  FOR ALL TO authenticated
  USING (public.a_le_panel('admin-tournois'))
  WITH CHECK (public.a_le_panel('admin-tournois'));

-- results
DROP POLICY IF EXISTS "allow authenticated all" ON public.results;
DROP POLICY IF EXISTS "results_leaderboard" ON public.results;
CREATE POLICY "results_leaderboard" ON public.results
  FOR ALL TO authenticated
  USING (public.a_le_panel('leaderboard'))
  WITH CHECK (public.a_le_panel('leaderboard'));

-- sessions
DROP POLICY IF EXISTS "allow authenticated all" ON public.sessions;
DROP POLICY IF EXISTS "sessions_leaderboard" ON public.sessions;
CREATE POLICY "sessions_leaderboard" ON public.sessions
  FOR ALL TO authenticated
  USING (public.a_le_panel('leaderboard'))
  WITH CHECK (public.a_le_panel('leaderboard'));

-- tournaments : lecture large (trois espaces s'en servent), écriture limitée
DROP POLICY IF EXISTS "allow authenticated all" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_lecture" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_ecriture" ON public.tournaments;
CREATE POLICY "tournaments_lecture" ON public.tournaments
  FOR SELECT TO authenticated
  USING (public.a_le_panel('leaderboard') OR public.a_le_panel('prize-pool') OR public.a_le_panel('admin-tournois'));
CREATE POLICY "tournaments_ecriture" ON public.tournaments
  FOR ALL TO authenticated
  USING (public.a_le_panel('prize-pool') OR public.a_le_panel('admin-tournois'))
  WITH CHECK (public.a_le_panel('prize-pool') OR public.a_le_panel('admin-tournois'));
