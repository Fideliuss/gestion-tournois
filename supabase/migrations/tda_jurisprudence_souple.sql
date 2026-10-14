-- ══════════════════════════════════════════════════════
--  Règlement TDA : jurisprudence, saisie assouplie (après tda_jurisprudence.sql)
--  À exécuter dans Supabase Dashboard > SQL Editor.
--
--  - La liste des sanctions devient une table modifiable (tda_sanctions) : les validateurs (panel 'tda-validation', admins)
--    ajoutent, renomment, désactivent, réordonnent. Une sanction peut demander un nombre (unité : main, tour, jeton...),
--    saisi dans le cas (sanction_quantite) : « Main de pénalité, 2 mains ».
--  - La décision devient facultative (la sanction suffit parfois), la date du cas et la variante disparaissent.
--  - Seuils de saisie réduits (titre 3 caractères, faits 10).
--  Rejouable sans dégât.
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tda_sanctions (
  id      text    PRIMARY KEY DEFAULT ('s_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) CHECK (id ~ '^[a-z0-9_]+$'),
  libelle text    NOT NULL CHECK (char_length(btrim(libelle)) BETWEEN 2 AND 60),
  unite   text    CHECK (unite IS NULL OR char_length(btrim(unite)) BETWEEN 1 AND 20),      -- « main », « tour » : si renseignée, un nombre est demandé
  ordre   integer NOT NULL DEFAULT 0,
  actif   boolean NOT NULL DEFAULT true                                                      -- une sanction désactivée n'est plus proposée mais reste lisible dans les cas existants
);

INSERT INTO public.tda_sanctions (id, libelle, unite, ordre) VALUES
  ('aucune',           'Aucune sanction',      NULL,    1),
  ('avertissement',    'Avertissement verbal', NULL,    2),
  ('main_penalite',    'Main de pénalité',     'main',  3),
  ('tour_penalite',    'Tour de pénalité',     'tour',  4),
  ('penalite_jetons',  'Pénalité en jetons',   'jeton', 5),
  ('disqualification', 'Disqualification',     NULL,    6),
  ('autre',            'Autre',                NULL,    7)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.tda_sanctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tda_sanctions_lecture" ON public.tda_sanctions;
CREATE POLICY "tda_sanctions_lecture" ON public.tda_sanctions
  FOR SELECT TO authenticated USING (public.can_use_tda() OR public.can_valider_tda());

DROP POLICY IF EXISTS "tda_sanctions_ajout" ON public.tda_sanctions;
CREATE POLICY "tda_sanctions_ajout" ON public.tda_sanctions
  FOR INSERT TO authenticated WITH CHECK (public.can_valider_tda());

DROP POLICY IF EXISTS "tda_sanctions_modif" ON public.tda_sanctions;
CREATE POLICY "tda_sanctions_modif" ON public.tda_sanctions
  FOR UPDATE TO authenticated USING (public.can_valider_tda()) WITH CHECK (public.can_valider_tda());

DROP POLICY IF EXISTS "tda_sanctions_suppression" ON public.tda_sanctions;
CREATE POLICY "tda_sanctions_suppression" ON public.tda_sanctions
  FOR DELETE TO authenticated USING (public.can_valider_tda());

-- Cas : nouvelles règles de saisie
ALTER TABLE public.tda_cas DROP COLUMN IF EXISTS date_cas;
ALTER TABLE public.tda_cas DROP COLUMN IF EXISTS variante;

ALTER TABLE public.tda_cas DROP CONSTRAINT IF EXISTS tda_cas_sanction_type_check;
ALTER TABLE public.tda_cas DROP CONSTRAINT IF EXISTS tda_cas_sanction_type_fkey;
ALTER TABLE public.tda_cas ADD CONSTRAINT tda_cas_sanction_type_fkey
  FOREIGN KEY (sanction_type) REFERENCES public.tda_sanctions(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.tda_cas ADD COLUMN IF NOT EXISTS sanction_quantite integer;
ALTER TABLE public.tda_cas DROP CONSTRAINT IF EXISTS tda_cas_sanction_quantite_check;
ALTER TABLE public.tda_cas ADD CONSTRAINT tda_cas_sanction_quantite_check CHECK (sanction_quantite IS NULL OR sanction_quantite BETWEEN 1 AND 10000);

ALTER TABLE public.tda_cas ALTER COLUMN decision DROP NOT NULL;
ALTER TABLE public.tda_cas DROP CONSTRAINT IF EXISTS tda_cas_decision_check;
ALTER TABLE public.tda_cas ADD CONSTRAINT tda_cas_decision_check CHECK (decision IS NULL OR char_length(btrim(decision)) BETWEEN 1 AND 4000);

ALTER TABLE public.tda_cas DROP CONSTRAINT IF EXISTS tda_cas_titre_check;
ALTER TABLE public.tda_cas ADD CONSTRAINT tda_cas_titre_check CHECK (char_length(btrim(titre)) BETWEEN 3 AND 140);

ALTER TABLE public.tda_cas DROP CONSTRAINT IF EXISTS tda_cas_faits_check;
ALTER TABLE public.tda_cas ADD CONSTRAINT tda_cas_faits_check CHECK (char_length(btrim(faits)) BETWEEN 10 AND 4000);

-- Le circuit (inchangé) + contrôle de la sanction : elle doit exister, être proposée, et porter un nombre si elle en demande un
CREATE OR REPLACE FUNCTION public.tda_cas_garde()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validateur boolean := public.can_valider_tda();
  s public.tda_sanctions;
  changement boolean;
  nouvelle boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN changement := true; nouvelle := true;
  ELSE
    nouvelle := NEW.sanction_type IS DISTINCT FROM OLD.sanction_type;
    changement := nouvelle OR NEW.sanction_quantite IS DISTINCT FROM OLD.sanction_quantite;
  END IF;
  IF changement THEN
    SELECT * INTO s FROM public.tda_sanctions WHERE id = NEW.sanction_type;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sanction inconnue' USING ERRCODE = '23503';
    END IF;
    IF nouvelle AND NOT s.actif THEN
      RAISE EXCEPTION 'Cette sanction n''est plus proposée' USING ERRCODE = '23514';
    END IF;
    IF s.unite IS NULL THEN
      NEW.sanction_quantite := NULL;
    ELSIF NEW.sanction_quantite IS NULL THEN
      RAISE EXCEPTION 'Indiquez le nombre (%) pour cette sanction', s.unite USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.decision := NULLIF(btrim(COALESCE(NEW.decision, '')), '');

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
