-- ══════════════════════════════════════════════════════
--  Purge automatique de l'émargement des extras (conservation : 12 mois, à valider avec le DPO)
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/purge_emargement.sql).
--  Idempotent : peut être rejoué sans effet de bord. Ne contient aucune donnée.
--  Suppose pg_cron déjà activé (voir journal_audit_cron.sql).
--
--  L'émargement (qui est présent quel jour, avec les heures) est une donnée personnelle : une clé de la table parametres par semaine,
--  `extras_emargement_AAAA_SS` (AAAA = année ISO, SS = numéro de semaine ISO, voir admin/extras/extras.js). Une semaine est supprimée
--  quand son lundi a plus de p_mois mois. L'âge vient de la clé, pas de updated_at : corriger une vieille semaine ne la prolonge pas.
--  Les autres paramètres (déclarations, annexes, courriers, réglages) ne sont JAMAIS touchés : motif strict sur le nom de la clé.
--  Chaque suppression est inscrite au journal d'audit par le déclencheur de la table (acteur « système », sans valeur).
--  Pour changer la durée : modifier le « 12 » en bas de ce fichier et le rejouer.
--  Tests : supabase/tests/purge_emargement.test.sql
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.purger_emargement(p_mois integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF p_mois < 1 THEN RAISE EXCEPTION 'p_mois doit être au moins 1'; END IF;
  -- Lundi de la semaine ISO : le lundi de la semaine du 4 janvier, plus (semaine - 1) semaines (même calcul que extras.js)
  DELETE FROM public.parametres
  WHERE cle ~ '^extras_emargement_[0-9]{4}_[0-9]{2}$'
    AND (make_date(substr(cle, 19, 4)::int, 1, 4)
           - (extract(isodow FROM make_date(substr(cle, 19, 4)::int, 1, 4))::int - 1)
           + (substr(cle, 24, 2)::int - 1) * 7)
        < (now() - make_interval(months => p_mois))::date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Réservée au propriétaire et à pg_cron : ni anon ni un utilisateur connecté ne peut la lancer par l'API
REVOKE ALL ON FUNCTION public.purger_emargement(integer) FROM PUBLIC, anon, authenticated;

-- Chaque dimanche à 03:45 UTC (la purge du journal d'audit passe à 03:30)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge_emargement';
SELECT cron.schedule('purge_emargement', '45 3 * * 0', 'SELECT public.purger_emargement(12)');
