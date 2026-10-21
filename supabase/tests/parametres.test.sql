-- ══════════════════════════════════════════════════════
--  Tests RLS : table parametres (voir supabase/migrations/parametres.sql)
--  Lancer : supabase db query --linked -f supabase/tests/parametres.test.sql
--  Transaction annulée à la fin (ROLLBACK) : rien n'est conservé.
--  Les réglages (déclarations, extras, émargement) ne sont lisibles et modifiables que par le panel 'admin-tournois' et les admins.
--  L'émargement des extras (présence de personnes nommées) est une donnée personnelle : il ne doit jamais être lisible par un
--  croupier, un floor ou la caisse.
-- ══════════════════════════════════════════════════════
BEGIN;

INSERT INTO public.parametres (cle, valeur) VALUES
  ('extras_emargement_2099_01', '{"e1": {"lundi": true}}'::jsonb),
  ('extras_reglages',           '{"weekdayTime": "20:55"}'::jsonb)
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- ── Sans rôle, rôle inconnu, croupier, chef de table, floor, caisse : aucun accès ──
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['', 'inconnu', 'croupier', 'chef-de-table', 'floor', 'caisse'] LOOP
    PERFORM set_config('request.jwt.claims',
      CASE WHEN r = '' THEN '{"role":"authenticated"}'
           ELSE '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}' END, true);
    SET LOCAL ROLE authenticated;

    ASSERT (SELECT count(*) FROM public.parametres) = 0, r || ' ne devait lire aucun paramètre';
    ASSERT (SELECT count(*) FROM public.parametres WHERE cle LIKE 'extras\_%') = 0, r || ' ne devait pas lire l''émargement';

    UPDATE public.parametres SET valeur = '{}'::jsonb WHERE cle = 'extras_emargement_2099_01'; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0, r || ' ne devait pas modifier l''émargement';
    DELETE FROM public.parametres WHERE cle LIKE 'extras\_%'; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0, r || ' ne devait pas supprimer de réglage';
    BEGIN
      INSERT INTO public.parametres (cle, valeur) VALUES ('extras_emargement_2099_02', '{}'::jsonb);
      ASSERT false, r || ' ne devait pas écrire un paramètre';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;

    RESET ROLE;
  END LOOP;
END $$;

-- ── user_metadata ne donne aucun droit (seul app_metadata compte) ──
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","user_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*) FROM public.parametres) = 0, 'user_metadata.role=admin ne devait rien ouvrir';
  RESET ROLE;
END $$;

-- ── MCD (panel admin-tournois) et admin : lecture, écriture, suppression ──
DO $$
DECLARE r text; n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['mcd', 'admin'] LOOP
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}', true);
    SET LOCAL ROLE authenticated;
    ASSERT (SELECT count(*) FROM public.parametres WHERE cle LIKE 'extras\_%') >= 2, r || ' devait lire les réglages des extras';
    INSERT INTO public.parametres (cle, valeur) VALUES ('extras_emargement_2099_' || r, '{"e2": {"mardi": true}}'::jsonb);
    UPDATE public.parametres SET valeur = '{"e2": {}}'::jsonb WHERE cle = 'extras_emargement_2099_' || r; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1, r || ' devait modifier un paramètre';
    DELETE FROM public.parametres WHERE cle = 'extras_emargement_2099_' || r; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1, r || ' devait supprimer un paramètre';
    BEGIN
      INSERT INTO public.parametres (cle, valeur) VALUES ('Clé Invalide', '{}'::jsonb);
      ASSERT false, r || ' ne devait pas créer une clé invalide';
    EXCEPTION WHEN check_violation THEN NULL; END;
    RESET ROLE;
  END LOOP;
END $$;

-- ── La clé publique seule (anon) n'a aucun accès ──
DO $$
BEGIN
  SET LOCAL ROLE anon;
  ASSERT (SELECT count(*) FROM public.parametres) = 0, 'anon ne devait lire aucun paramètre';
  BEGIN
    INSERT INTO public.parametres (cle, valeur) VALUES ('extras_anon', '{}'::jsonb);
    ASSERT false, 'anon ne devait pas écrire un paramètre';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;

ROLLBACK;
SELECT 'parametres : tous les tests passent' AS resultat;
