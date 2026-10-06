-- ══════════════════════════════════════════════════════
--  Challenge saisonnier — clôture des saisons
--  La saison se déduit de la date (1er nov → 31 oct) : aucune colonne ajoutée à results / sessions.
--  Une saison clôturée est verrouillée en base : plus d'ajout, de modification ni de suppression
--  de résultats ou de sessions dont la date tombe dans cette saison (même depuis l'API).
--  Rouvrir une saison = supprimer sa ligne de saisons_cloturees (admin).
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.saisons_cloturees (
  saison       integer     PRIMARY KEY,                       -- année de début : 2025 = saison 2025 / 2026
  cloturee_le  timestamptz NOT NULL DEFAULT now(),
  cloturee_par uuid        DEFAULT auth.uid()
);

ALTER TABLE public.saisons_cloturees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saisons_cloturees_read" ON public.saisons_cloturees;
CREATE POLICY "saisons_cloturees_read" ON public.saisons_cloturees
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "saisons_cloturees_admin_write" ON public.saisons_cloturees;
CREATE POLICY "saisons_cloturees_admin_write" ON public.saisons_cloturees
  FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Saison d'une date texte 'AAAA-MM-JJ' (null si le format n'est pas reconnu)
CREATE OR REPLACE FUNCTION public.saison_de(d text) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN d ~ '^\d{4}-\d{2}-\d{2}'
    THEN CASE WHEN substr(d, 6, 2)::int >= 11 THEN substr(d, 1, 4)::int ELSE substr(d, 1, 4)::int - 1 END
  END
$$;

CREATE OR REPLACE FUNCTION public.bloquer_saison_cloturee() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s integer;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    s := saison_de(OLD.date);
    IF s IS NOT NULL AND EXISTS (SELECT 1 FROM saisons_cloturees WHERE saison = s) THEN
      RAISE EXCEPTION 'La saison % / % est clôturée : modification impossible.', s, s + 1;
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    s := saison_de(NEW.date);
    IF s IS NOT NULL AND EXISTS (SELECT 1 FROM saisons_cloturees WHERE saison = s) THEN
      RAISE EXCEPTION 'La saison % / % est clôturée : modification impossible.', s, s + 1;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_results_saison_cloturee ON public.results;
CREATE TRIGGER trg_results_saison_cloturee
  BEFORE INSERT OR UPDATE OR DELETE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.bloquer_saison_cloturee();

DROP TRIGGER IF EXISTS trg_sessions_saison_cloturee ON public.sessions;
CREATE TRIGGER trg_sessions_saison_cloturee
  BEFORE INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.bloquer_saison_cloturee();
