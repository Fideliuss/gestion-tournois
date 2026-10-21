-- ══════════════════════════════════════════════════════
--  Tests RLS : extras, results, sessions, tournaments (voir supabase/migrations/acces_donnees.sql)
--  Lancer : supabase db query --linked -f supabase/tests/acces_donnees.test.sql
--  Tout se passe dans une transaction annulée à la fin (ROLLBACK) : aucune donnée n'est conservée, qu'une assertion
--  échoue ou non. Une assertion qui échoue arrête le script avec « ... devait être ... ».
--  Rôles de test : ceux de app_roles en production (croupier, caisse, floor, mcd, admin) + un rôle inconnu et l'absence de rôle.
-- ══════════════════════════════════════════════════════
BEGIN;

-- Données de test (créées avec le rôle propriétaire, donc hors RLS)
INSERT INTO public.extras (id, nom, prenom) VALUES ('test_rls_extra', 'TESTRLS', 'Extra');
INSERT INTO public.results (date, tournament_id, place, player, points) VALUES ('2099-01-15', 'test_rls_t', 1, 'TESTRLS', 10);
INSERT INTO public.sessions (date, tournament_id, entries, cagnotte, nb_results) VALUES ('2099-01-15', 'test_rls_t', 1, 2, 1);
INSERT INTO public.tournaments (id, name, day, buyin) VALUES ('test_rls_t', 'TESTRLS', 'Lundi', 10);

-- ── Sans rôle, rôle inconnu, croupier, chef de table : aucun accès à ces quatre tables ──
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['', 'inconnu', 'croupier', 'chef-de-table'] LOOP
    PERFORM set_config('request.jwt.claims',
      CASE WHEN r = '' THEN '{"role":"authenticated"}'
           ELSE '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}' END, true);
    SET LOCAL ROLE authenticated;

    ASSERT (SELECT count(*) FROM public.extras)      = 0, r || ' ne devait pas lire extras';
    ASSERT (SELECT count(*) FROM public.results)     = 0, r || ' ne devait pas lire results';
    ASSERT (SELECT count(*) FROM public.sessions)    = 0, r || ' ne devait pas lire sessions';
    ASSERT (SELECT count(*) FROM public.tournaments) = 0, r || ' ne devait pas lire tournaments';

    UPDATE public.results SET points = 99;     GET DIAGNOSTICS n = ROW_COUNT; ASSERT n = 0, r || ' ne devait pas modifier results';
    DELETE FROM public.sessions;               GET DIAGNOSTICS n = ROW_COUNT; ASSERT n = 0, r || ' ne devait pas supprimer sessions';
    UPDATE public.tournaments SET name = 'x';  GET DIAGNOSTICS n = ROW_COUNT; ASSERT n = 0, r || ' ne devait pas modifier tournaments';
    DELETE FROM public.extras;                 GET DIAGNOSTICS n = ROW_COUNT; ASSERT n = 0, r || ' ne devait pas supprimer extras';

    BEGIN
      INSERT INTO public.extras (id, nom, prenom) VALUES ('test_rls_x', 'X', 'X');
      ASSERT false, r || ' ne devait pas insérer dans extras';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
      INSERT INTO public.results (date, tournament_id, place, player, points) VALUES ('2099-01-16', 'test_rls_t', 1, 'X', 1);
      ASSERT false, r || ' ne devait pas insérer dans results';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
      INSERT INTO public.tournaments (id, name, day) VALUES ('test_rls_x', 'X', 'Lundi');
      ASSERT false, r || ' ne devait pas insérer dans tournaments';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;

    RESET ROLE;
  END LOOP;
END $$;

-- ── Un rôle ne peut pas se donner des droits via user_metadata (seul app_metadata compte) ──
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","user_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*) FROM public.extras) = 0, 'user_metadata.role=admin ne devait rien ouvrir';
  RESET ROLE;
END $$;

-- ── Caisse : classement (lecture et saisie), tournois en lecture seule, pas d'extras ──
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"caisse"}}', true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*) FROM public.results)     >= 1, 'caisse devait lire results';
  ASSERT (SELECT count(*) FROM public.sessions)    >= 1, 'caisse devait lire sessions';
  ASSERT (SELECT count(*) FROM public.tournaments) >= 1, 'caisse devait lire tournaments';
  ASSERT (SELECT count(*) FROM public.extras)      = 0,  'caisse ne devait pas lire extras';
  INSERT INTO public.results (date, tournament_id, place, player, points) VALUES ('2099-01-16', 'test_rls_t', 2, 'CAISSE', 5);
  UPDATE public.sessions SET entries = 3 WHERE tournament_id = 'test_rls_t'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'caisse devait modifier sessions';
  UPDATE public.tournaments SET name = 'x'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'caisse ne devait pas modifier tournaments';
  BEGIN
    INSERT INTO public.tournaments (id, name, day) VALUES ('test_rls_x', 'X', 'Lundi');
    ASSERT false, 'caisse ne devait pas insérer dans tournaments';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Floor : tournois (lecture et pp / frais), pas de classement, pas d'extras ──
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"floor"}}', true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*) FROM public.tournaments) >= 1, 'floor devait lire tournaments';
  UPDATE public.tournaments SET pp = 1, frais = 1 WHERE id = 'test_rls_t'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'floor devait modifier tournaments (prize pool)';
  ASSERT (SELECT count(*) FROM public.results)  = 0, 'floor ne devait pas lire results';
  ASSERT (SELECT count(*) FROM public.sessions) = 0, 'floor ne devait pas lire sessions';
  ASSERT (SELECT count(*) FROM public.extras)   = 0, 'floor ne devait pas lire extras';
  RESET ROLE;
END $$;

-- ── MCD et admin : tout ──
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['mcd', 'admin'] LOOP
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}', true);
    SET LOCAL ROLE authenticated;
    ASSERT (SELECT count(*) FROM public.extras)      >= 1, r || ' devait lire extras';
    ASSERT (SELECT count(*) FROM public.results)     >= 1, r || ' devait lire results';
    ASSERT (SELECT count(*) FROM public.sessions)    >= 1, r || ' devait lire sessions';
    ASSERT (SELECT count(*) FROM public.tournaments) >= 1, r || ' devait lire tournaments';
    INSERT INTO public.extras (id, nom, prenom) VALUES ('test_rls_' || r, 'X', 'X');
    UPDATE public.extras SET nom = 'Y' WHERE id = 'test_rls_' || r; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1, r || ' devait modifier extras';
    DELETE FROM public.extras WHERE id = 'test_rls_' || r; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1, r || ' devait supprimer dans extras';
    UPDATE public.tournaments SET name = 'Y' WHERE id = 'test_rls_t'; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1, r || ' devait modifier tournaments';
    RESET ROLE;
  END LOOP;
END $$;

-- ── La fonction n'est pas appelable sans connexion (clé publique seule) ──
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.has_panel_access(text)', 'EXECUTE'), 'anon ne devait pas pouvoir appeler has_panel_access';
  ASSERT has_function_privilege('authenticated', 'public.has_panel_access(text)', 'EXECUTE'), 'authenticated devait pouvoir appeler has_panel_access';
END $$;

ROLLBACK;
SELECT 'acces_donnees : tous les tests passent' AS resultat;
