-- ══════════════════════════════════════════════════════
--  Purge automatique du journal d'audit (conservation : 12 mois, à valider avec le DPO)
--  À exécuter APRÈS journal_audit.sql. Idempotent.
--  Active l'extension pg_cron (incluse dans tous les plans Supabase) puis planifie la purge chaque dimanche à 03:30 UTC.
--  Pour changer la durée : modifier le « 12 » ci-dessous et rejouer ce fichier.
--  Pour voir les exécutions : SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- ══════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge_journal_audit';
SELECT cron.schedule('purge_journal_audit', '30 3 * * 0', 'SELECT public.purger_journal_audit(12)');
