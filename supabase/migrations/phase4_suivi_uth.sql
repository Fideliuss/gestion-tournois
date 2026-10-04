-- ══════════════════════════════════════════════════════
--  PHASE 4 — Suivi résultats : points faibles des modules Ultimate Texas Hold'em
--  Remplace training_weak_points (CREATE OR REPLACE, idempotent) : les 5 facettes de la Phase 3 sont reprises
--  à l'identique, trois modules UTH s'ajoutent. Reste SECURITY INVOKER : la RLS s'applique à l'appelant.
--
--  uth-main    : « Combinaison » (correct_answer = 0 carte haute … 9 quinte flush royale)
--                « Piège » (scenario.trap, seulement quand la donne en était un)
--  uth-gagnant : « Situation » (scenario.kind : category · kicker · unqualified · tie)
--  uth-gains   : « Situation » (scenario.kind : win · blind · unqualified · tie · lose · fold · jackpot)
--                « Mise » : une ligne par mise corrigée (ante · blind · play · trips · jp1). Une mise est fausse si
--                l'action (payer / laisser / ramasser) ou, pour « je paie », le montant diffère de scenario.expected.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.training_weak_points(p_game text, p_user uuid DEFAULT NULL)
RETURNS TABLE (facet text, value text, attempts bigint, errors bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH r AS (
    SELECT is_correct, scenario, correct_answer
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
  FROM r WHERE p_game = 'blackjack' AND scenario ? 'bet' GROUP BY 2
  -- ── Ultimate Texas Hold'em ──
  UNION ALL
  SELECT 'Combinaison', correct_answer::int::text, count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game = 'uth-main' GROUP BY 2
  UNION ALL
  SELECT 'Piège', scenario ->> 'trap', count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game = 'uth-main' AND nullif(scenario ->> 'trap', '') IS NOT NULL GROUP BY 2
  UNION ALL
  SELECT 'Situation', scenario ->> 'kind', count(*), count(*) FILTER (WHERE NOT is_correct)
  FROM r WHERE p_game IN ('uth-gagnant', 'uth-gains') AND scenario ? 'kind' GROUP BY 2
  UNION ALL
  SELECT 'Mise', e.key,
         count(*),
         count(*) FILTER (WHERE NOT (
           (r.scenario -> 'answers' -> e.key ->> 'action') IS NOT DISTINCT FROM (e.value ->> 'action')
           AND (e.value ->> 'action' <> 'pay'
                OR round((r.scenario -> 'answers' -> e.key ->> 'amount')::numeric, 2) = round((e.value ->> 'amount')::numeric, 2))
         ))
  FROM r,
       jsonb_each(CASE WHEN jsonb_typeof(r.scenario -> 'expected') = 'object'
                       THEN r.scenario -> 'expected' ELSE '{}'::jsonb END) e
  WHERE p_game = 'uth-gains'
  GROUP BY 2;
$$;
