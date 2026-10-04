-- ══════════════════════════════════════════════════════
--  PHASE 3 (étape 1) — Suivi résultats : meta + accès manager
--  Appliquer AVANT de déployer le code front qui écrit ces colonnes
--  (sinon les insertions de session échouent silencieusement).
--  Idempotent : peut être rejoué sans effet de bord.
-- ══════════════════════════════════════════════════════

-- 1. Colonnes ───────────────────────────────────────────
-- meta       : contexte de la session { level, ratio, chipValue, elapsedMs }
-- user_label : préfixe e-mail du croupier, dénormalisé (le navigateur ne peut pas lire auth.users)
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS user_label text;

-- 2. Backfill de l'historique existant ──────────────────
UPDATE training_sessions s
SET user_label = split_part(u.email, '@', 1)
FROM auth.users u
WHERE u.id = s.user_id AND s.user_label IS NULL;

-- Niveau retrouvé depuis la 1re question de chaque session (absent pour BJ Paiement et Tables : normal)
UPDATE training_sessions s
SET meta = s.meta || jsonb_build_object('level', r.lvl)
FROM (
  SELECT DISTINCT ON (session_id) session_id, scenario ->> 'level' AS lvl
  FROM training_results
  WHERE scenario ? 'level'
  ORDER BY session_id, created_at
) r
WHERE r.session_id = s.id AND NOT (s.meta ? 'level');

-- Table jouée (Tables de multiplication) ; le chrono précis n'est pas récupérable, on ne l'invente pas
UPDATE training_sessions s
SET meta = s.meta || jsonb_build_object('ratio', r.ratio)
FROM (
  SELECT DISTINCT ON (session_id) session_id, (scenario ->> 'ratio')::int AS ratio
  FROM training_results
  WHERE scenario ? 'ratio'
  ORDER BY session_id, created_at
) r
WHERE r.session_id = s.id AND s.game = 'roulette-tables' AND NOT (s.meta ? 'ratio');

-- 3. Qui peut voir les résultats de toute l'équipe ──────
-- admin, ou rôle disposant du panel 'training-suivi' (configurable dans Gestion Comptes)
CREATE OR REPLACE FUNCTION public.can_view_training_stats()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      OR EXISTS (
           SELECT 1 FROM public.app_roles r
           WHERE r.slug = (auth.jwt() -> 'app_metadata' ->> 'role')
             AND r.panels ? 'training-suivi'
         );
$$;

-- 4. Lecture globale pour les managers (les policies *_own existantes restent inchangées) ──
DROP POLICY IF EXISTS "sessions_manager_read" ON training_sessions;
CREATE POLICY "sessions_manager_read" ON training_sessions
  FOR SELECT TO authenticated
  USING (public.can_view_training_stats());

DROP POLICY IF EXISTS "results_manager_read" ON training_results;
CREATE POLICY "results_manager_read" ON training_results
  FOR SELECT TO authenticated
  USING (public.can_view_training_stats());
