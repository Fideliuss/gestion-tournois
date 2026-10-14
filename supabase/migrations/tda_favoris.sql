-- ══════════════════════════════════════════════════════
--  Règlement TDA : règles mises en favori
--  À exécuter dans Supabase Dashboard > SQL Editor (après tda.sql).
--
--  Une ligne par utilisateur et par règle / procédure / terme mis en favori. Chacun ne voit et ne modifie que les siens, et
--  seulement s'il a accès au règlement (panel 'tda' ou admin). bloc_id = identifiant du bloc ('r45', 'rp5', 'g_8'...) : il est
--  indépendant de l'édition, un favori suit donc la même règle d'une édition à l'autre (il disparaît de l'affichage si le numéro n'existe plus).
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tda_favoris (
  user_id  uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bloc_id  text        NOT NULL CHECK (bloc_id ~ '^[a-z0-9_]{1,40}$'),
  cree_le  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bloc_id)
);

ALTER TABLE public.tda_favoris ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tda_favoris_lecture" ON public.tda_favoris;
CREATE POLICY "tda_favoris_lecture" ON public.tda_favoris
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tda_favoris_ajout" ON public.tda_favoris;
CREATE POLICY "tda_favoris_ajout" ON public.tda_favoris
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_use_tda());

DROP POLICY IF EXISTS "tda_favoris_suppression" ON public.tda_favoris;
CREATE POLICY "tda_favoris_suppression" ON public.tda_favoris
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
