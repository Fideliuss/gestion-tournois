-- ══════════════════════════════════════════════════════
--  PHASE 4 — Ultimate Texas Hold'em : configuration initiale (training_config, clé 'uth')
--  Calcul des gains : montant maximum des mises Ante / Blind / Trips (multiples de 5 €, minimum 5 €).
--  Modifiable par un admin depuis le hub UTH (« ⚙ Config UTH »). Les tables de paiement (blind / trips / jp1)
--  peuvent être ajoutées plus tard dans la même valeur ; absentes, la réglementation s'applique.
--  Sans effet si la clé existe déjà.
-- ══════════════════════════════════════════════════════
INSERT INTO training_config (key, value)
VALUES ('uth', '{ "gains": { "max_bet": 50 } }'::jsonb)
ON CONFLICT (key) DO NOTHING;
