-- ══════════════════════════════════════════════════════
--  TRAINING — tables + RLS
-- ══════════════════════════════════════════════════════

-- Config par jeu (min/max mise, etc.)
CREATE TABLE training_config (
  key   varchar PRIMARY KEY,
  value jsonb   NOT NULL
);
INSERT INTO training_config (key, value) VALUES
  ('roulette', '{
    "couleur":  { "levels": { "facile": 5,  "medium": 3, "expert": 2 } },
    "pointage": { "levels": { "facile": 10, "medium": 6, "expert": 3 } }
  }'),
  ('blackjack', '{
    "ranges": [
      { "min": 10,  "max": 100,  "step": 10,  "weight": 80 },
      { "min": 200, "max": 1000, "step": 100, "weight": 20 }
    ],
    "levels": { "facile": 15, "medium": 10, "expert": 5 }
  }');

ALTER TABLE training_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_config_read" ON training_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "training_config_admin_write" ON training_config
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Sessions d'entraînement
CREATE TABLE training_sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game       varchar     NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at   timestamptz,
  total      integer     DEFAULT 0,
  correct    integer     DEFAULT 0
);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON training_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Résultats par question
CREATE TABLE training_results (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game           varchar     NOT NULL,
  scenario       jsonb       NOT NULL,
  correct_answer numeric     NOT NULL,
  user_answer    numeric     NOT NULL,
  is_correct     boolean     NOT NULL,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE training_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_own" ON training_results
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
