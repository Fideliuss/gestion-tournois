-- ══════════════════════════════════════════════════════
--  Tests : journal d'audit (voir supabase/migrations/journal_audit.sql)
--  Lancer : supabase db query --linked -f supabase/tests/journal_audit.test.sql
--  Transaction annulée à la fin (ROLLBACK) : rien n'est conservé, aucune ligne de journal de test ne reste.
--  Chaque bloc relève le dernier id du journal, joue une action sous l'identité d'un rôle, puis lit les lignes ajoutées.
-- ══════════════════════════════════════════════════════
BEGIN;

INSERT INTO public.tournaments (id, name, day, buyin) VALUES ('test_audit_t', 'TESTAUDIT', 'Lundi', 10);

-- ── extras : noms des champs seulement, jamais les valeurs ──
DO $$
DECLARE m bigint; n int; d jsonb; r record;
BEGIN
  SELECT COALESCE(max(id), 0) INTO m FROM public.journal_audit;
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"role":"mcd"}}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.extras (id, nom, prenom) VALUES ('test_audit_e', 'TESTAUDIT', 'Extra');
  UPDATE public.extras SET adresse = 'SECRET-ADRESSE-12', date_naissance = '1980-01-01' WHERE id = 'test_audit_e';
  UPDATE public.extras SET nom = nom WHERE id = 'test_audit_e';                 -- aucun changement réel : rien dans le journal
  DELETE FROM public.extras WHERE id = 'test_audit_e';
  RESET ROLE;

  SELECT count(*) INTO n FROM public.journal_audit WHERE id > m AND objet = 'extras' AND ligne = 'test_audit_e';
  ASSERT n = 3, 'extras : 3 lignes attendues (création, modification, suppression), trouvé ' || n;
  SELECT * INTO r FROM public.journal_audit WHERE id > m AND objet = 'extras' AND action = 'UPDATE';
  ASSERT r.acteur = '11111111-1111-1111-1111-111111111111'::uuid, 'extras : acteur attendu';
  ASSERT r.role_acteur = 'mcd', 'extras : rôle de l''acteur attendu';
  ASSERT r.detail -> 'champs' @> '["adresse", "date_naissance"]'::jsonb, 'extras : noms des champs modifiés attendus';
  ASSERT NOT EXISTS (SELECT 1 FROM public.journal_audit WHERE id > m AND (detail::text LIKE '%SECRET-ADRESSE%' OR detail::text LIKE '%1980%')),
    'extras : une valeur personnelle a été écrite dans le journal';
END $$;

-- ── results et sessions : une ligne par requête, sans les joueurs ──
DO $$
DECLARE m bigint; n int; r record;
BEGIN
  SELECT COALESCE(max(id), 0) INTO m FROM public.journal_audit;
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"role":"caisse"}}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.results (date, tournament_id, place, player, points)
    VALUES ('2099-01-15', 'test_audit_t', 1, 'JOUEURSECRET', 10), ('2099-01-15', 'test_audit_t', 2, 'AUTREJOUEUR', 5);
  INSERT INTO public.sessions (date, tournament_id, entries, cagnotte, nb_results) VALUES ('2099-01-15', 'test_audit_t', 2, 4, 2);
  UPDATE public.results SET points = 11 WHERE tournament_id = 'test_audit_t';
  DELETE FROM public.results WHERE tournament_id = 'test_audit_t';
  DELETE FROM public.results WHERE tournament_id = 'test_audit_t';             -- 0 ligne : rien dans le journal
  DELETE FROM public.sessions WHERE tournament_id = 'test_audit_t';
  RESET ROLE;

  SELECT count(*) INTO n FROM public.journal_audit WHERE id > m AND objet = 'results';
  ASSERT n = 3, 'results : 3 lignes attendues (une par requête, 0 ligne ignorée), trouvé ' || n;
  SELECT * INTO r FROM public.journal_audit WHERE id > m AND objet = 'results' AND action = 'INSERT';
  ASSERT (r.detail ->> 'lignes')::int = 2, 'results : 2 lignes dans la même requête';
  ASSERT r.detail ->> 'du' = '2099-01-15' AND r.detail -> 'tournois' = '["test_audit_t"]'::jsonb, 'results : période et tournois attendus';
  ASSERT r.acteur = '22222222-2222-2222-2222-222222222222'::uuid AND r.role_acteur = 'caisse', 'results : acteur et rôle attendus';
  SELECT count(*) INTO n FROM public.journal_audit WHERE id > m AND objet = 'sessions';
  ASSERT n = 2, 'sessions : création et suppression attendues, trouvé ' || n;
  ASSERT NOT EXISTS (SELECT 1 FROM public.journal_audit WHERE id > m AND detail::text LIKE '%JOUEUR%'), 'results : un nom de joueur a été écrit dans le journal';
END $$;

-- ── tournaments et app_roles : valeurs avant / après ──
DO $$
DECLARE m bigint; r record;
BEGIN
  SELECT COALESCE(max(id), 0) INTO m FROM public.journal_audit;
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
  UPDATE public.tournaments SET name = 'RENOMME' WHERE id = 'test_audit_t';
  INSERT INTO public.app_roles (slug, label, panels) VALUES ('test_audit_role', 'Test', '[]'::jsonb);
  UPDATE public.app_roles SET panels = '["leaderboard"]'::jsonb WHERE slug = 'test_audit_role';
  RESET ROLE;

  SELECT * INTO r FROM public.journal_audit WHERE id > m AND objet = 'tournaments' AND action = 'UPDATE';
  ASSERT r.detail -> 'avant' ->> 'name' = 'TESTAUDIT' AND r.detail -> 'apres' ->> 'name' = 'RENOMME', 'tournaments : avant / après attendus';
  SELECT * INTO r FROM public.journal_audit WHERE id > m AND objet = 'app_roles' AND action = 'UPDATE';
  ASSERT r.ligne = 'test_audit_role' AND r.detail -> 'apres' -> 'panels' = '["leaderboard"]'::jsonb, 'app_roles : panels après attendus';
  ASSERT r.detail -> 'avant' -> 'panels' = '[]'::jsonb, 'app_roles : panels avant attendus';
END $$;

-- ── parametres : la clé est journalisée, jamais la valeur ──
DO $$
DECLARE m bigint; n int;
BEGIN
  SELECT COALESCE(max(id), 0) INTO m FROM public.journal_audit;
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"role":"mcd"}}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.parametres (cle, valeur) VALUES ('test_audit_p', '{"nom": "VALEURSECRETE"}'::jsonb);
  UPDATE public.parametres SET valeur = '{"nom": "AUTRESECRETE"}'::jsonb WHERE cle = 'test_audit_p';
  RESET ROLE;
  SELECT count(*) INTO n FROM public.journal_audit WHERE id > m AND objet = 'parametres' AND ligne = 'test_audit_p';
  ASSERT n = 2, 'parametres : 2 lignes attendues, trouvé ' || n;
  ASSERT NOT EXISTS (SELECT 1 FROM public.journal_audit WHERE id > m AND detail::text LIKE '%SECRETE%'), 'parametres : une valeur a été écrite dans le journal';
END $$;

-- ── Lecture réservée aux administrateurs, aucune écriture par l'API ──
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['croupier', 'floor', 'caisse', 'mcd', 'admin'] LOOP
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"44444444-4444-4444-4444-444444444444","app_metadata":{"role":"' || r || '"}}', true);
    SET LOCAL ROLE authenticated;
    IF r = 'admin' THEN
      ASSERT (SELECT count(*) FROM public.journal_audit) >= 1, 'admin devait lire le journal';
    ELSE
      ASSERT (SELECT count(*) FROM public.journal_audit) = 0, r || ' ne devait pas lire le journal';
    END IF;
    BEGIN
      INSERT INTO public.journal_audit (action, objet) VALUES ('x', 'x');
      ASSERT false, r || ' ne devait pas écrire dans le journal';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
      UPDATE public.journal_audit SET action = 'y';
      ASSERT false, r || ' ne devait pas modifier le journal';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
      DELETE FROM public.journal_audit;
      ASSERT false, r || ' ne devait pas supprimer dans le journal';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
      PERFORM public.purger_journal_audit(0);
      ASSERT false, r || ' ne devait pas pouvoir purger le journal';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
      PERFORM public.journaliser('x', 'x', 'x', '{}'::jsonb);
      ASSERT false, r || ' ne devait pas pouvoir appeler journaliser';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    RESET ROLE;
  END LOOP;

  SET LOCAL ROLE anon;
  BEGIN
    PERFORM count(*) FROM public.journal_audit;
    ASSERT false, 'anon ne devait pas lire le journal';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Purge : au-delà de 12 mois seulement ──
DO $$
DECLARE n integer;
BEGIN
  INSERT INTO public.journal_audit (at, action, objet, ligne) VALUES (now() - interval '13 months', 'TEST', 'test_purge', 'vieux');
  INSERT INTO public.journal_audit (at, action, objet, ligne) VALUES (now() - interval '11 months', 'TEST', 'test_purge', 'recent');
  n := public.purger_journal_audit(12);
  ASSERT n >= 1, 'la purge devait supprimer au moins une ligne';
  ASSERT NOT EXISTS (SELECT 1 FROM public.journal_audit WHERE ligne = 'vieux'), 'la ligne de 13 mois devait être purgée';
  ASSERT EXISTS (SELECT 1 FROM public.journal_audit WHERE ligne = 'recent'), 'la ligne de 11 mois devait rester';
END $$;

ROLLBACK;
SELECT 'journal_audit : tous les tests passent' AS resultat;
