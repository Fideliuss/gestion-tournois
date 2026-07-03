-- ══════════════════════════════════════════════════════
--  MIGRATION — ajoute la config "cards" (BJ Score) au training_config existant
--  À exécuter dans Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════

-- Fusionne la clé "cards" sans écraser "ranges"/"levels" déjà présents
UPDATE training_config
SET value = value || '{
  "cards": {
    "facile": { "min": 2, "max": 3, "stopTotal": 17 },
    "medium": { "min": 3, "max": 5, "stopTotal": 17 },
    "expert": { "min": 4, "max": 0, "stopTotal": 20 }
  }
}'::jsonb
WHERE key = 'blackjack';
