-- ══════════════════════════════════════════════════════
--  MIGRATION — ajoute la config "mixte" (Paiement Mixte) au training_config existant
--  À exécuter dans Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════

UPDATE training_config
SET value = value || '{
  "mixte": { "levels": { "facile": 30, "medium": 20, "expert": 12 } }
}'::jsonb
WHERE key = 'roulette';
