-- ══════════════════════════════════════════════════════
--  Espace Tournois : règlement du Poker TDA consultable dans l'application
--  À exécuter dans Supabase Dashboard > SQL Editor.
--
--  Accès en LECTURE : admins et rôles qui ont le panel 'tda' (Gestion des comptes), sur l'édition active seulement.
--  Accès en ÉCRITURE : admins uniquement (page « Éditions du règlement »).
--  · tda_editions : une ligne par édition du règlement (le TDA publie environ tous les 2 ans) ; une seule est « active »
--  · tda_blocs    : le contenu d'une édition, un bloc par règle / procédure recommandée / exemple / terme du glossaire
--
--  Le texte du règlement n'est JAMAIS dans le dépôt (public) : l'administrateur l'importe depuis le PDF
--  (outil tda/outils/extraire_tda.js, puis page « Éditions du règlement »).
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.tda_est_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.can_use_tda()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.tda_est_admin()
      OR EXISTS (
           SELECT 1 FROM public.app_roles r
           WHERE r.slug = (auth.jwt() -> 'app_metadata' ->> 'role')
             AND r.panels ? 'tda'
         );
$$;

CREATE TABLE IF NOT EXISTS public.tda_editions (
  id               text        PRIMARY KEY CHECK (id ~ '^[a-z0-9_]{3,40}$'),
  libelle          text        NOT NULL,
  date_publication date,
  traduction       text,
  introduction     text,
  mention          text        NOT NULL,
  sections         jsonb       NOT NULL DEFAULT '[]',
  nb_blocs         integer     NOT NULL CHECK (nb_blocs > 0),   -- nombre de blocs attendus : l'édition n'est activable que si tous sont importés
  active           boolean     NOT NULL DEFAULT false,
  importe_le       timestamptz NOT NULL DEFAULT now(),
  importe_par      uuid        DEFAULT auth.uid()
);

-- Une seule édition active à la fois
CREATE UNIQUE INDEX IF NOT EXISTS tda_une_seule_active ON public.tda_editions (active) WHERE active;

CREATE TABLE IF NOT EXISTS public.tda_blocs (
  edition_id  text    NOT NULL REFERENCES public.tda_editions(id) ON DELETE CASCADE,
  id          text    NOT NULL,                                  -- 'r45', 'rp5', 'ex_55_a_1', 'g_12'...
  kind        text    NOT NULL CHECK (kind IN ('regle', 'rp_intro', 'rp', 'exemple', 'glossaire')),
  numero      text    NOT NULL DEFAULT '',
  section     text    NOT NULL,
  titre       text    NOT NULL,
  ordre       integer NOT NULL,
  data        jsonb   NOT NULL DEFAULT '{}',
  PRIMARY KEY (edition_id, id)
);

CREATE INDEX IF NOT EXISTS tda_blocs_ordre ON public.tda_blocs (edition_id, ordre);

ALTER TABLE public.tda_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tda_blocs    ENABLE ROW LEVEL SECURITY;

-- Lecture : un admin voit tout (brouillons compris), les autres seulement l'édition active
DROP POLICY IF EXISTS "tda_editions_lecture" ON public.tda_editions;
CREATE POLICY "tda_editions_lecture" ON public.tda_editions
  FOR SELECT TO authenticated
  USING (public.tda_est_admin() OR (active AND public.can_use_tda()));

DROP POLICY IF EXISTS "tda_editions_ajout" ON public.tda_editions;
CREATE POLICY "tda_editions_ajout" ON public.tda_editions
  FOR INSERT TO authenticated
  WITH CHECK (public.tda_est_admin() AND NOT active);       -- une édition naît en brouillon : on l'active via tda_activer_edition()

DROP POLICY IF EXISTS "tda_editions_modif" ON public.tda_editions;
CREATE POLICY "tda_editions_modif" ON public.tda_editions
  FOR UPDATE TO authenticated
  USING (public.tda_est_admin()) WITH CHECK (public.tda_est_admin());

DROP POLICY IF EXISTS "tda_editions_suppression" ON public.tda_editions;
CREATE POLICY "tda_editions_suppression" ON public.tda_editions
  FOR DELETE TO authenticated
  USING (public.tda_est_admin() AND NOT active);            -- l'édition active ne se supprime pas : en activer une autre d'abord

DROP POLICY IF EXISTS "tda_blocs_lecture" ON public.tda_blocs;
CREATE POLICY "tda_blocs_lecture" ON public.tda_blocs
  FOR SELECT TO authenticated
  USING (
    public.tda_est_admin()
    OR (public.can_use_tda() AND EXISTS (SELECT 1 FROM public.tda_editions e WHERE e.id = edition_id AND e.active))
  );

DROP POLICY IF EXISTS "tda_blocs_ecriture" ON public.tda_blocs;
CREATE POLICY "tda_blocs_ecriture" ON public.tda_blocs
  FOR ALL TO authenticated
  USING (public.tda_est_admin()) WITH CHECK (public.tda_est_admin());

-- Activation atomique d'une édition : l'ancienne est désactivée, la nouvelle devient la seule active.
-- Refusée si l'import est incomplet (nombre de blocs différent de celui annoncé).
CREATE OR REPLACE FUNCTION public.tda_activer_edition(p_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendu integer;
  present integer;
BEGIN
  IF NOT public.tda_est_admin() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  SELECT nb_blocs INTO attendu FROM public.tda_editions WHERE id = p_id;
  IF attendu IS NULL THEN
    RAISE EXCEPTION 'Édition introuvable : %', p_id;
  END IF;
  SELECT count(*) INTO present FROM public.tda_blocs WHERE edition_id = p_id;
  IF present <> attendu THEN
    RAISE EXCEPTION 'Import incomplet : % blocs sur % attendus', present, attendu;
  END IF;
  UPDATE public.tda_editions SET active = false WHERE active AND id <> p_id;
  UPDATE public.tda_editions SET active = true  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tda_activer_edition(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tda_activer_edition(text) TO authenticated;
