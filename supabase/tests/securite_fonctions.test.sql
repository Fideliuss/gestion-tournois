-- ══════════════════════════════════════════════════════
--  Tests : droits d'exécution et search_path des fonctions (voir supabase/migrations/securite_fonctions.sql)
--  Lancer : supabase db query --linked -f supabase/tests/securite_fonctions.test.sql
--  Transaction annulée à la fin (ROLLBACK) : rien n'est conservé.
-- ══════════════════════════════════════════════════════
BEGIN;

-- ── Droits d'exécution ──
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.can_use_break_list()', 'public.can_use_tda()', 'public.can_view_training_stats()'] LOOP
    ASSERT NOT has_function_privilege('anon', f, 'EXECUTE'),        f || ' ne devait pas être appelable par anon';
    ASSERT has_function_privilege('authenticated', f, 'EXECUTE'),   f || ' devait rester appelable par authenticated';
  END LOOP;
END $$;

-- ── search_path fixé ──
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['saison_de', 'tda_est_admin', 'can_use_break_list', 'can_use_tda', 'can_view_training_stats', 'has_panel_access'] LOOP
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = f
                     AND proconfig @> ARRAY['search_path=public']), f || ' devait avoir search_path=public';
  END LOOP;
END $$;

-- ── Sans connexion : appel refusé ──
DO $$
DECLARE f text;
BEGIN
  SET LOCAL ROLE anon;
  FOREACH f IN ARRAY ARRAY['can_use_break_list', 'can_use_tda', 'can_view_training_stats'] LOOP
    BEGIN
      EXECUTE format('SELECT public.%I()', f);
      ASSERT false, f || ' devait être refusée à anon';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
  RESET ROLE;
END $$;

-- ── Connecté : les fonctions donnent toujours le bon résultat, par rôle ──
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['croupier', 'chef-de-table', 'floor', 'caisse', 'mcd', 'admin'] LOOP
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}', true);
    SET LOCAL ROLE authenticated;
    ASSERT public.can_use_break_list()      = (r IN ('mcd', 'admin')),                               r || ' : can_use_break_list';
    ASSERT public.can_view_training_stats() = (r IN ('mcd', 'admin')),                               r || ' : can_view_training_stats';
    ASSERT public.can_use_tda()             = (r IN ('floor', 'caisse', 'mcd', 'admin')),            r || ' : can_use_tda';
    ASSERT public.tda_est_admin()           = (r = 'admin'),                                         r || ' : tda_est_admin';
    RESET ROLE;
  END LOOP;
END $$;

-- ── Calcul de saison : entrée invalide (le calcul des saisons est testé dans saisons_fin_variable.test.sql) ──
DO $$
BEGIN
  ASSERT public.saison_de('pas une date') IS NULL, 'saison_de entrée invalide';
END $$;

ROLLBACK;
SELECT 'securite_fonctions : tous les tests passent' AS resultat;
