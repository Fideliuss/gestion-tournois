-- ══════════════════════════════════════════════════════
--  MIGRATION — ajoute la config "tables" (flashcard multiplication) au training_config existant
--  À exécuter dans Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════

-- Fusionne la clé "tables" sans écraser couleur/pointage/conversion déjà présents
UPDATE training_config
SET value = value || '{
  "tables": { "levels": { "facile": 8, "medium": 5, "expert": 3 } }
}'::jsonb
WHERE key = 'roulette';
