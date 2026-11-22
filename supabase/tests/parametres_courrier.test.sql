-- ══════════════════════════════════════════════════════
--  Tests RLS : droit 'courrier' sur la table parametres (voir supabase/migrations/parametres_courrier.sql)
--  Lancer : supabase db query --linked -f supabase/tests/parametres_courrier.test.sql
--  Transaction annulée à la fin (ROLLBACK) : rien n'est conservé, ni le rôle de test ni les réglages.
--  Un rôle qui n'a que le panel 'courrier' lit et écrit les clés 'courrier*', et rien d'autre (surtout pas les extras).
-- ══════════════════════════════════════════════════════
BEGIN;

INSERT INTO public.app_roles (slug, label, panels) VALUES ('test-courrier', 'Test courrier', '["courrier"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET panels = EXCLUDED.panels;

INSERT INTO public.parametres (cle, valeur) VALUES
  ('courriers_modeles',         '{"signataires": [{"nom": "", "titre": "Directeur Responsable"}]}'::jsonb),
  ('extras_emargement_2099_01', '{"e1": {"lundi": true}}'::jsonb),
  ('declaration_config',        '{}'::jsonb)
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- ── Panel 'courrier' seul : les clés courrier*, rien d'autre ──
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"test-courrier"}}', true);
  SET LOCAL ROLE authenticated;

  ASSERT (SELECT count(*) FROM public.parametres WHERE cle = 'courriers_modeles') = 1, 'courrier devait lire courriers_modeles';
  ASSERT (SELECT count(*) FROM public.parametres WHERE left(cle, 8) <> 'courrier') = 0, 'courrier ne devait lire que les clés courrier*';

  UPDATE public.parametres SET valeur = '{"signataires": []}'::jsonb WHERE cle = 'courriers_modeles'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'courrier devait modifier courriers_modeles';
  INSERT INTO public.parametres (cle, valeur) VALUES ('courrier_horaires', '{"lignes": []}'::jsonb);
  DELETE FROM public.parametres WHERE cle = 'courrier_horaires'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'courrier devait supprimer une clé courrier*';

  UPDATE public.parametres SET valeur = '{}'::jsonb WHERE cle = 'extras_emargement_2099_01'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'courrier ne devait pas modifier l''émargement';
  DELETE FROM public.parametres WHERE cle IN ('extras_emargement_2099_01', 'declaration_config'); GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'courrier ne devait pas supprimer un autre réglage';
  BEGIN
    INSERT INTO public.parametres (cle, valeur) VALUES ('extras_reglages_test', '{}'::jsonb);
    ASSERT false, 'courrier ne devait pas écrire hors des clés courrier*';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.parametres SET cle = 'extras_detourne' WHERE cle = 'courriers_modeles';
    ASSERT false, 'courrier ne devait pas renommer une clé courrier* hors de son périmètre';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  RESET ROLE;
END $$;

-- ── Sans le panel : aucune clé courrier* ──
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['', 'croupier', 'floor', 'caisse'] LOOP
    PERFORM set_config('request.jwt.claims',
      CASE WHEN r = '' THEN '{"role":"authenticated"}'
           ELSE '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}' END, true);
    SET LOCAL ROLE authenticated;
    ASSERT (SELECT count(*) FROM public.parametres WHERE left(cle, 8) = 'courrier') = 0, r || ' ne devait pas lire les réglages du courrier';
    UPDATE public.parametres SET valeur = '{}'::jsonb WHERE cle = 'courriers_modeles'; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0, r || ' ne devait pas modifier les réglages du courrier';
    RESET ROLE;
  END LOOP;
END $$;

-- ── user_metadata ne donne aucun droit ──
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","user_metadata":{"role":"test-courrier"}}', true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*) FROM public.parametres) = 0, 'user_metadata.role ne devait rien ouvrir';
  RESET ROLE;
END $$;

-- ── Le panel admin-tournois (MCD) et les admins gardent les réglages du courrier ──
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['mcd', 'admin'] LOOP
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}', true);
    SET LOCAL ROLE authenticated;
    ASSERT (SELECT count(*) FROM public.parametres WHERE cle = 'courriers_modeles') = 1, r || ' devait lire courriers_modeles';
    ASSERT (SELECT count(*) FROM public.parametres WHERE cle = 'extras_emargement_2099_01') = 1, r || ' devait garder l''émargement';
    RESET ROLE;
  END LOOP;
END $$;

-- ── anon : rien ──
DO $$
BEGIN
  SET LOCAL ROLE anon;
  ASSERT (SELECT count(*) FROM public.parametres) = 0, 'anon ne devait lire aucun paramètre';
  RESET ROLE;
END $$;

ROLLBACK;
SELECT 'parametres_courrier : tous les tests passent' AS resultat;
