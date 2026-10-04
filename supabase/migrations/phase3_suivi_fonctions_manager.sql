-- ══════════════════════════════════════════════════════
--  PHASE 3 (étape 3) — Suivi résultats : agrégats pour la vue manager
--  Dépend de phase3_suivi_meta_et_acces_manager.sql (colonnes meta/user_label, policies manager).
--  Idempotent : CREATE OR REPLACE, rejouable sans effet de bord.
--
--  Toutes les fonctions sont SECURITY INVOKER : la RLS s'applique à l'appelant.
--  Un manager (panel 'training-suivi') ou un admin voit toute l'équipe ; un croupier
--  qui appellerait ces fonctions ne verrait que ses propres lignes. Aucune fuite possible.
--  Les agrégats sont calculés en base car Supabase plafonne les SELECT à 1000 lignes.
-- ══════════════════════════════════════════════════════

-- 1. Classement d'un module (précision) ─────────────────
-- Métrique : moyenne des 5 dernières sessions (comme la vue croupier). Un croupier n'est
-- « classé » qu'à partir de p_min sessions ; les autres sont renvoyés avec ranked = false.
CREATE OR REPLACE FUNCTION public.training_ranking(
  p_game text, p_level text DEFAULT NULL, p_min int DEFAULT 3
)
RETURNS TABLE (user_id uuid, user_label text, sessions bigint, best_pct int,
               avg_recent int, last_at timestamptz, ranked boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH s AS (
    SELECT t.user_id, t.user_label, t.started_at,
           round(100.0 * t.correct / t.total) AS pct,
           row_number() OVER (PARTITION BY t.user_id ORDER BY t.started_at DESC) AS rn
    FROM training_sessions t
    WHERE t.game = p_game AND t.ended_at IS NOT NULL AND t.total > 0
      AND (p_level IS NULL OR t.meta ->> 'level' = p_level)
  )
  SELECT s.user_id,
         max(s.user_label),
         count(*),
         max(s.pct)::int,
         round(avg(s.pct) FILTER (WHERE s.rn <= 5))::int,
         max(s.started_at),
         count(*) >= p_min
  FROM s
  GROUP BY s.user_id
  ORDER BY (count(*) >= p_min) DESC,
           avg(s.pct) FILTER (WHERE s.rn <= 5) DESC NULLS LAST,
           max(s.pct) DESC;
$$;

-- 2. Classement Tables de multiplication (meilleur temps) ─
-- Uniquement les sessions sans erreur avec un chrono mesuré (meta.elapsedMs, posé depuis l'étape 1).
-- p_ratio NULL = toutes tables confondues (peu parlant : à utiliser avec une table précise).
CREATE OR REPLACE FUNCTION public.training_tables_best(p_ratio int DEFAULT NULL)
RETURNS TABLE (user_id uuid, user_label text, best_ms numeric, perfect_runs bigint,
               sessions bigint, last_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT t.user_id,
         max(t.user_label),
         min((t.meta ->> 'elapsedMs')::numeric)
           FILTER (WHERE t.correct = t.total AND t.meta ? 'elapsedMs'),
         count(*) FILTER (WHERE t.correct = t.total AND t.meta ? 'elapsedMs'),
         count(*),
         max(t.started_at)
  FROM training_sessions t
  WHERE t.game = 'roulette-tables' AND t.ended_at IS NOT NULL
    AND (p_ratio IS NULL OR (t.meta ->> 'ratio')::int = p_ratio)
  GROUP BY t.user_id
  ORDER BY 3 ASC NULLS LAST, 5 DESC;
$$;

-- 3. Points faibles : taux d'erreur par facette ─────────
-- p_user NULL = toute l'équipe. Le seuil minimal de tentatives est appliqué côté page.
-- Blackjack (BJ Paiement) n'a qu'une situation : on analyse la tranche de mise.
CREATE OR REPLACE FUNCTION public.training_weak_points(p_game text, p_user uuid DEFAULT NULL)
RETURNS TABLE (facet text, value text, attempts bigint, errors bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH r AS (
    SELECT is_correct, scenario
    FROM training_results
    WHERE game = p_game AND (p_user IS NULL OR user_id = p_user)
  )
  SELECT 'Type de mise', b ->> 'type', count(*), count(*) FILTER (WHERE NOT r.is_correct)
  FROM r,
       jsonb_array_elements(CASE WHEN jsonb_typeof(r.scenario -> 'bets') = 'array'
                                 THEN r.scenario -> 'bets' ELSE '[]'::jsonb END) b
  WHERE p_game = 'roulette-paiement'
  GROUP BY 2
  UNION ALL
  SELECT 'Valeur de pièce', scenario ->> 'value', count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game = 'roulette-conversion' AND scenario ? 'value' GROUP BY 2
  UNION ALL
  SELECT 'Table', scenario ->> 'ratio', count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game = 'roulette-tables' AND scenario ? 'ratio' GROUP BY 2
  UNION ALL
  SELECT 'Numéro', scenario ->> 'number', count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game IN ('roulette-couleur', 'roulette-pointage') AND scenario ? 'number' GROUP BY 2
  UNION ALL
  SELECT 'Nombre de cartes', jsonb_array_length(scenario -> 'hand')::text,
         count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game = 'blackjack-score' AND jsonb_typeof(scenario -> 'hand') = 'array' GROUP BY 2
  UNION ALL
  SELECT 'Montant de la mise',
         CASE WHEN (scenario ->> 'bet')::numeric <= 100 THEN '≤ 100 €' ELSE '> 100 €' END,
         count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game = 'blackjack' AND scenario ? 'bet' GROUP BY 2;
$$;

-- 4. Activité ───────────────────────────────────────────
-- Un croupier par ligne (sert aussi de liste de sélection pour la vue Progression).
CREATE OR REPLACE FUNCTION public.training_activity(p_days int DEFAULT 30)
RETURNS TABLE (user_id uuid, user_label text, sessions_period bigint, active_days bigint,
               sessions_total bigint, last_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT t.user_id,
         max(t.user_label),
         count(*) FILTER (WHERE t.started_at >= now() - make_interval(days => p_days)),
         count(DISTINCT (t.started_at AT TIME ZONE 'Europe/Paris')::date)
           FILTER (WHERE t.started_at >= now() - make_interval(days => p_days)),
         count(*),
         max(t.started_at)
  FROM training_sessions t
  WHERE t.ended_at IS NOT NULL
  GROUP BY t.user_id
  ORDER BY max(t.started_at) DESC;
$$;

-- Sessions par semaine pour toute l'équipe (la page complète les semaines vides)
CREATE OR REPLACE FUNCTION public.training_activity_weekly(p_weeks int DEFAULT 12)
RETURNS TABLE (week_start date, sessions bigint, users bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT date_trunc('week', t.started_at AT TIME ZONE 'Europe/Paris')::date,
         count(*),
         count(DISTINCT t.user_id)
  FROM training_sessions t
  WHERE t.ended_at IS NOT NULL
    AND t.started_at >= now() - make_interval(weeks => p_weeks)
  GROUP BY 1
  ORDER BY 1;
$$;
