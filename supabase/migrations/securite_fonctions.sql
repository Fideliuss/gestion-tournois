-- ══════════════════════════════════════════════════════
--  Fonctions du schéma public : conseiller de sécurité Supabase (database linter)
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/securite_fonctions.sql).
--  Idempotent : peut être rejoué sans effet de bord. Ne contient aucune donnée.
--
--  1. can_use_break_list, can_use_tda, can_view_training_stats (SECURITY DEFINER) étaient appelables sans connexion
--     (/rest/v1/rpc/...) : EXECUTE retiré à PUBLIC et anon. Elles ne servent que dans des politiques RLS « TO authenticated »,
--     un utilisateur connecté garde donc l'accès.
--  2. saison_de et tda_est_admin n'avaient pas de search_path fixé : fixé sur public, comme les autres fonctions.
--  Les fonctions SECURITY DEFINER restent appelables par authenticated : les politiques RLS les évaluent avec ses droits.
--  Tests : supabase/tests/securite_fonctions.test.sql
-- ══════════════════════════════════════════════════════

ALTER FUNCTION public.saison_de(text)    SET search_path = public;
ALTER FUNCTION public.tda_est_admin()    SET search_path = public;

REVOKE ALL ON FUNCTION public.can_use_break_list()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_use_tda()             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_training_stats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_use_break_list()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_tda()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_training_stats() TO authenticated;
