-- ══════════════════════════════════════════════════════
--  Tests : purge de l'émargement des extras (voir supabase/migrations/purge_emargement.sql)
--  Lancer : supabase db query --linked -f supabase/tests/purge_emargement.test.sql
--  Transaction annulée à la fin (ROLLBACK) : rien n'est conservé. Les dates sont relatives à aujourd'hui.
-- ══════════════════════════════════════════════════════
BEGIN;

-- Clé de la semaine ISO d'une date : extras_emargement_AAAA_SS (même forme que admin/extras/extras.js)
CREATE FUNCTION pg_temp.cle_semaine(d date) RETURNS text LANGUAGE sql AS
  $$ SELECT 'extras_emargement_' || to_char(d, 'IYYY') || '_' || to_char(d, 'IW') $$;

INSERT INTO public.parametres (cle, valeur) VALUES
  (pg_temp.cle_semaine((now() - interval '14 months')::date), '{"e1": {"lundi": true}}'),   -- trop ancienne
  (pg_temp.cle_semaine((now() - interval '13 months')::date), '{"e1": {"mardi": true}}'),   -- trop ancienne
  (pg_temp.cle_semaine((now() - interval '11 months')::date), '{"e1": {"jeudi": true}}'),   -- à garder
  (pg_temp.cle_semaine((now() - interval '1 month')::date),   '{"e1": {"vendredi": true}}'),-- à garder
  (pg_temp.cle_semaine(now()::date),                          '{"e1": {"samedi": true}}'),  -- à garder
  (pg_temp.cle_semaine((now() + interval '2 months')::date),  '{}'),                         -- semaine à venir : à garder
  ('extras_emargement_2099_99', '{}'),                                                       -- semaine invalide : ni erreur ni suppression
  ('extras_emargement_2020_53', '{}'),                                                       -- semaine 53 d'une année qui en a une
  ('extras_reglages', '{"weekdayTime": "20:55"}'),                                           -- autres paramètres : jamais touchés
  ('extras_emargement_ancien_format', '{}'),
  ('declaration_adhoc_2020_01', '[]'),
  ('declaration_config', '{}'),
  ('courriers_modeles', '{}')
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- ── La purge supprime les semaines de plus de 12 mois, et seulement elles ──
DO $$
DECLARE n integer;
BEGIN
  n := public.purger_emargement(12);
  ASSERT n = 3, 'la purge devait supprimer 3 semaines (14 mois, 13 mois, 2020 semaine 53), trouvé ' || n;

  ASSERT NOT EXISTS (SELECT 1 FROM public.parametres WHERE cle = pg_temp.cle_semaine((now() - interval '14 months')::date)), 'semaine de 14 mois à supprimer';
  ASSERT NOT EXISTS (SELECT 1 FROM public.parametres WHERE cle = pg_temp.cle_semaine((now() - interval '13 months')::date)), 'semaine de 13 mois à supprimer';
  ASSERT NOT EXISTS (SELECT 1 FROM public.parametres WHERE cle = 'extras_emargement_2020_53'), 'semaine 53 de 2020 à supprimer';

  ASSERT EXISTS (SELECT 1 FROM public.parametres WHERE cle = pg_temp.cle_semaine((now() - interval '11 months')::date)), 'semaine de 11 mois à garder';
  ASSERT EXISTS (SELECT 1 FROM public.parametres WHERE cle = pg_temp.cle_semaine((now() - interval '1 month')::date)), 'semaine du mois dernier à garder';
  ASSERT EXISTS (SELECT 1 FROM public.parametres WHERE cle = pg_temp.cle_semaine(now()::date)), 'semaine en cours à garder';
  ASSERT EXISTS (SELECT 1 FROM public.parametres WHERE cle = pg_temp.cle_semaine((now() + interval '2 months')::date)), 'semaine à venir à garder';
  ASSERT EXISTS (SELECT 1 FROM public.parametres WHERE cle = 'extras_emargement_2099_99'), 'clé de semaine invalide : pas de suppression ni d''erreur';

  -- Jamais d'autre paramètre
  ASSERT (SELECT count(*) FROM public.parametres WHERE cle IN ('extras_reglages', 'extras_emargement_ancien_format', 'declaration_adhoc_2020_01', 'declaration_config', 'courriers_modeles')) = 5,
    'un paramètre autre que l''émargement a été supprimé';
END $$;

-- ── Rejouer la purge ne supprime plus rien ──
DO $$
BEGIN
  ASSERT public.purger_emargement(12) = 0, 'une seconde purge devait être sans effet';
END $$;

-- ── La durée est respectée : à 1 mois, la semaine de 11 mois part aussi ; une valeur invalide est refusée ──
DO $$
BEGIN
  ASSERT public.purger_emargement(6) = 1, 'à 6 mois, seule la semaine de 11 mois devait partir';
  ASSERT EXISTS (SELECT 1 FROM public.parametres WHERE cle = pg_temp.cle_semaine((now() - interval '1 month')::date)), 'la semaine du mois dernier reste à 6 mois';
  BEGIN
    PERFORM public.purger_emargement(0);
    ASSERT false, 'une durée de 0 mois devait être refusée';
  EXCEPTION WHEN raise_exception THEN NULL; END;
END $$;

-- ── Chaque suppression est inscrite au journal d'audit, sans valeur ──
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.journal_audit WHERE objet = 'parametres' AND action = 'DELETE' AND ligne LIKE 'extras_emargement_%' AND acteur IS NULL) >= 4,
    'les suppressions devaient figurer au journal d''audit (acteur système)';
  ASSERT NOT EXISTS (SELECT 1 FROM public.journal_audit WHERE objet = 'parametres' AND detail::text LIKE '%vendredi%'), 'une valeur d''émargement a été écrite dans le journal';
END $$;

-- ── Personne ne peut la lancer par l'API ──
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['croupier', 'mcd', 'admin'] LOOP
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"' || r || '"}}', true);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.purger_emargement(12);
      ASSERT false, r || ' ne devait pas pouvoir lancer la purge';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    RESET ROLE;
  END LOOP;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.purger_emargement(12);
    ASSERT false, 'anon ne devait pas pouvoir lancer la purge';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;

-- ── La purge est planifiée chaque semaine ──
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM cron.job WHERE jobname = 'purge_emargement' AND schedule = '45 3 * * 0' AND command = 'SELECT public.purger_emargement(12)' AND active) = 1,
    'la tâche purge_emargement devait être planifiée une fois, le dimanche à 03:45';
END $$;

ROLLBACK;
SELECT 'purge_emargement : tous les tests passent' AS resultat;
