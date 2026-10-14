-- ══════════════════════════════════════════════════════
--  Règlement TDA : jurisprudence interne (cas proposés par les floors, validés par les MCD)
--  À exécuter dans Supabase Dashboard > SQL Editor (après tda.sql).
--
--  Un cas = des faits, les règles applicables, la décision prise, la sanction. Circuit :
--    propose  ->  valide | a_preciser (renvoyé à l'auteur, commentaire obligatoire) | refuse (commentaire obligatoire)
--    a_preciser -> propose (l'auteur corrige et soumet de nouveau)
--    valide   ->  archive (motif obligatoire, ex. une règle a changé)   ;   archive -> valide
--
--  Qui voit quoi : les cas VALIDÉS sont lisibles par tous ceux qui ont le panel 'tda' ; chacun voit ses propres propositions
--  (quel que soit leur état) ; ceux qui ont le panel 'tda-validation' (et les admins) voient tout.
--  Qui fait quoi : tout compte avec le panel 'tda' propose ; l'auteur modifie ou retire sa proposition tant qu'elle est « propose »
--  ou « a_preciser » ; les validateurs traitent, peuvent reformuler et archiver ; seul un admin supprime un cas traité.
--  Le circuit est imposé par un déclencheur : il tient même si on appelle l'API directement.
--
--  Aucun nom de joueur dans les faits (consigne affichée dans le formulaire) : ce sont des données personnelles de clients.
-- ══════════════════════════════════════════════════════

-- Droit de valider : admin, ou rôle qui a le panel 'tda-validation' (Gestion des comptes)
CREATE OR REPLACE FUNCTION public.can_valider_tda()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.tda_est_admin()
      OR EXISTS (
           SELECT 1 FROM public.app_roles r
           WHERE r.slug = (auth.jwt() -> 'app_metadata' ->> 'role')
             AND r.panels ? 'tda-validation'
         );
$$;

-- Nom à afficher pour l'utilisateur connecté (prénom et nom si renseignés, sinon début de l'e-mail)
CREATE OR REPLACE FUNCTION public.tda_nom_affiche()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(btrim(COALESCE(auth.jwt() -> 'user_metadata' ->> 'first_name', '') || ' ' || COALESCE(auth.jwt() -> 'user_metadata' ->> 'last_name', '')), ''),
    NULLIF(split_part(COALESCE(auth.jwt() ->> 'email', ''), '@', 1), ''),
    'Utilisateur'
  );
$$;

CREATE TABLE IF NOT EXISTS public.tda_cas (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titre              text        NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 5 AND 140),
  faits              text        NOT NULL CHECK (char_length(btrim(faits)) BETWEEN 20 AND 4000),
  regles             text[]      NOT NULL CHECK (cardinality(regles) BETWEEN 1 AND 12 AND array_to_string(regles, ',') ~ '^[a-z0-9_]+(,[a-z0-9_]+)*$'),   -- identifiants de blocs : 'r45', 'rp5'
  decision           text        NOT NULL CHECK (char_length(btrim(decision)) BETWEEN 10 AND 4000),
  sanction_type      text        NOT NULL CHECK (sanction_type IN ('aucune', 'avertissement', 'main_penalite', 'tour_penalite', 'penalite_jetons', 'disqualification', 'autre')),
  sanction_precision text        CHECK (sanction_precision IS NULL OR char_length(sanction_precision) <= 500),
  date_cas           date,
  variante           text        CHECK (variante IS NULL OR char_length(variante) <= 40),
  edition_id         text        REFERENCES public.tda_editions(id) ON DELETE SET NULL,      -- édition du règlement en vigueur à la proposition (posée par le déclencheur)
  statut             text        NOT NULL DEFAULT 'propose' CHECK (statut IN ('propose', 'a_preciser', 'valide', 'refuse', 'archive')),
  auteur_id          uuid        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  auteur_nom         text        NOT NULL DEFAULT '',
  cree_le            timestamptz NOT NULL DEFAULT now(),
  soumis_le          timestamptz NOT NULL DEFAULT now(),
  modifie_le         timestamptz NOT NULL DEFAULT now(),
  traite_par         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  traite_par_nom     text,
  traite_le          timestamptz,
  valide_le          timestamptz,
  commentaire        text        CHECK (commentaire IS NULL OR char_length(commentaire) <= 1000),
  archive_motif      text        CHECK (archive_motif IS NULL OR char_length(archive_motif) <= 500)
);

CREATE INDEX IF NOT EXISTS tda_cas_statut ON public.tda_cas (statut, soumis_le);
CREATE INDEX IF NOT EXISTS tda_cas_regles ON public.tda_cas USING gin (regles);
CREATE INDEX IF NOT EXISTS tda_cas_auteur ON public.tda_cas (auteur_id);

-- Le circuit, imposé côté base
CREATE OR REPLACE FUNCTION public.tda_cas_garde()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validateur boolean := public.can_valider_tda();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.auteur_id  := auth.uid();
    NEW.auteur_nom := public.tda_nom_affiche();
    NEW.edition_id := (SELECT id FROM public.tda_editions WHERE active LIMIT 1);
    NEW.cree_le := now(); NEW.soumis_le := now(); NEW.modifie_le := now();
    NEW.commentaire := NULL; NEW.archive_motif := NULL;
    IF validateur AND NEW.statut = 'valide' THEN                   -- un validateur peut saisir directement un cas de référence
      NEW.traite_par := auth.uid(); NEW.traite_par_nom := public.tda_nom_affiche(); NEW.traite_le := now(); NEW.valide_le := now();
    ELSE
      NEW.statut := 'propose';
      NEW.traite_par := NULL; NEW.traite_par_nom := NULL; NEW.traite_le := NULL; NEW.valide_le := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Mise à jour : ces champs ne se modifient jamais à la main
  NEW.id := OLD.id; NEW.auteur_id := OLD.auteur_id; NEW.auteur_nom := OLD.auteur_nom; NEW.edition_id := OLD.edition_id;
  NEW.cree_le := OLD.cree_le; NEW.modifie_le := now();

  IF validateur THEN
    NEW.soumis_le := OLD.soumis_le;
    IF NEW.statut IS DISTINCT FROM OLD.statut THEN
      IF NOT ((OLD.statut IN ('propose', 'a_preciser') AND NEW.statut IN ('valide', 'a_preciser', 'refuse'))
              OR (OLD.statut = 'valide' AND NEW.statut = 'archive')
              OR (OLD.statut = 'archive' AND NEW.statut = 'valide')) THEN
        RAISE EXCEPTION 'Changement d''état interdit : % vers %', OLD.statut, NEW.statut USING ERRCODE = '23514';
      END IF;
      IF NEW.statut IN ('a_preciser', 'refuse') AND btrim(COALESCE(NEW.commentaire, '')) = '' THEN
        RAISE EXCEPTION 'Un commentaire est obligatoire pour renvoyer ou refuser un cas' USING ERRCODE = '23514';
      END IF;
      IF NEW.statut = 'archive' AND btrim(COALESCE(NEW.archive_motif, '')) = '' THEN
        RAISE EXCEPTION 'Le motif est obligatoire pour archiver un cas' USING ERRCODE = '23514';
      END IF;
      NEW.traite_par := auth.uid(); NEW.traite_par_nom := public.tda_nom_affiche(); NEW.traite_le := now();
      IF NEW.statut = 'valide' THEN
        NEW.valide_le := now(); NEW.archive_motif := NULL;
        IF NEW.commentaire IS NOT DISTINCT FROM OLD.commentaire THEN NEW.commentaire := NULL; END IF;     -- le commentaire d'un renvoi ne suit pas le cas validé
      END IF;
    ELSE
      NEW.traite_par := OLD.traite_par; NEW.traite_par_nom := OLD.traite_par_nom; NEW.traite_le := OLD.traite_le; NEW.valide_le := OLD.valide_le;
    END IF;
  ELSE
    -- L'auteur corrige sa proposition ; rien d'autre
    IF OLD.auteur_id IS DISTINCT FROM auth.uid() OR OLD.statut NOT IN ('propose', 'a_preciser') THEN
      RAISE EXCEPTION 'Ce cas ne peut plus être modifié' USING ERRCODE = '42501';
    END IF;
    NEW.traite_par := OLD.traite_par; NEW.traite_par_nom := OLD.traite_par_nom; NEW.traite_le := OLD.traite_le;
    NEW.valide_le := OLD.valide_le; NEW.commentaire := OLD.commentaire; NEW.archive_motif := OLD.archive_motif;
    IF OLD.statut = 'a_preciser' THEN NEW.statut := 'propose'; NEW.soumis_le := now();       -- corrigé : de nouveau à traiter
    ELSE NEW.statut := OLD.statut; NEW.soumis_le := OLD.soumis_le; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tda_cas_garde ON public.tda_cas;
CREATE TRIGGER tda_cas_garde BEFORE INSERT OR UPDATE ON public.tda_cas
  FOR EACH ROW EXECUTE FUNCTION public.tda_cas_garde();

ALTER TABLE public.tda_cas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tda_cas_lecture" ON public.tda_cas;
CREATE POLICY "tda_cas_lecture" ON public.tda_cas
  FOR SELECT TO authenticated
  USING (
    public.can_valider_tda()
    OR auteur_id = auth.uid()
    OR (statut = 'valide' AND public.can_use_tda())
  );

DROP POLICY IF EXISTS "tda_cas_ajout" ON public.tda_cas;
CREATE POLICY "tda_cas_ajout" ON public.tda_cas
  FOR INSERT TO authenticated
  WITH CHECK (public.can_use_tda() AND auteur_id = auth.uid());

DROP POLICY IF EXISTS "tda_cas_modif" ON public.tda_cas;
CREATE POLICY "tda_cas_modif" ON public.tda_cas
  FOR UPDATE TO authenticated
  USING (public.can_valider_tda() OR (auteur_id = auth.uid() AND statut IN ('propose', 'a_preciser')))
  WITH CHECK (public.can_valider_tda() OR (auteur_id = auth.uid() AND statut IN ('propose', 'a_preciser')));

DROP POLICY IF EXISTS "tda_cas_suppression" ON public.tda_cas;
CREATE POLICY "tda_cas_suppression" ON public.tda_cas
  FOR DELETE TO authenticated
  USING (public.tda_est_admin() OR (auteur_id = auth.uid() AND statut IN ('propose', 'a_preciser')));
