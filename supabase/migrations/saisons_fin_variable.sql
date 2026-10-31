-- ══════════════════════════════════════════════════════
--  Challenge saisonnier : la fin d'une saison est une donnée (saisons_fin_variable)
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/saisons_fin_variable.sql).
--  Idempotent : peut être rejoué sans effet de bord. Ne contient aucune donnée.
--  Suite de saisons_cloturees.sql ; à appliquer après lui et après journal_audit.sql (déclencheur d'audit en fin de fichier).
--
--  Par défaut une saison court du 1er novembre au 31 octobre. Quand la direction arrête une saison à une autre date
--  (ex. clôture le 29 octobre), saisons_fins garde ce dernier jour : les dates suivantes comptent pour la saison suivante,
--  et saison_de() (donc le verrouillage de saisons_cloturees) en tient compte.
--    - Une fin n'est écrite qu'à la clôture (cloturer_saison). Rouvrir une saison supprime son verrou mais garde sa fin :
--      les tournois déjà saisis dans la saison suivante ne repassent pas dans l'ancienne.
--    - Une fin ne peut se déplacer (ni disparaître) que si aucun tournoi n'est daté entre l'ancienne et la nouvelle date.
--    - Une fin tient dans le mois qui encadre le 31 octobre (1er octobre au 30 novembre).
--  Tests : supabase/tests/saisons_fin_variable.test.sql
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.saisons_fins (
  saison integer PRIMARY KEY,                                     -- année de début : 2025 = saison 2025 / 2026
  fin    date    NOT NULL,                                        -- dernier jour de la saison (inclus)
  CONSTRAINT saisons_fins_plausible CHECK (fin BETWEEN make_date(saison + 1, 10, 1) AND make_date(saison + 1, 11, 30))
);

ALTER TABLE public.saisons_fins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saisons_fins_read" ON public.saisons_fins;
CREATE POLICY "saisons_fins_read" ON public.saisons_fins
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "saisons_fins_admin_write" ON public.saisons_fins;
CREATE POLICY "saisons_fins_admin_write" ON public.saisons_fins
  FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Saison d'une date texte 'AAAA-MM-JJ' (null si le format n'est pas reconnu) : la saison du calendrier (1er nov. au 31 oct.),
-- décalée si la fin de cette saison, ou de la précédente, a été fixée à une autre date (mêmes règles que saisonDe, shared/saisons.js)
CREATE OR REPLACE FUNCTION public.saison_de(d text) RETURNS integer
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE c integer;
BEGIN
  IF d !~ '^\d{4}-\d{2}-\d{2}' THEN RETURN NULL; END IF;
  c := CASE WHEN substr(d, 6, 2)::int >= 11 THEN substr(d, 1, 4)::int ELSE substr(d, 1, 4)::int - 1 END;
  IF EXISTS (SELECT 1 FROM saisons_fins WHERE saison = c     AND substr(d, 1, 10) >  fin::text) THEN RETURN c + 1; END IF;
  IF EXISTS (SELECT 1 FROM saisons_fins WHERE saison = c - 1 AND substr(d, 1, 10) <= fin::text) THEN RETURN c - 1; END IF;
  RETURN c;
END $$;

-- Une fin de saison ne bouge pas si cela change la saison d'un tournoi déjà saisi (le verrou de bloquer_saison_cloturee
-- s'appuie sur saison_de : il suit la fin sans modification)
CREATE OR REPLACE FUNCTION public.proteger_fin_de_saison() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  ancienne text := OLD.fin::text;
  nouvelle text := CASE WHEN TG_OP = 'DELETE' THEN make_date(OLD.saison + 1, 10, 31)::text ELSE NEW.fin::text END;
  du       text := least(ancienne, nouvelle);
  au       text := greatest(ancienne, nouvelle);
BEGIN
  IF du <> au AND (EXISTS (SELECT 1 FROM results  WHERE date > du AND date <= au)
                OR EXISTS (SELECT 1 FROM sessions WHERE date > du AND date <= au)) THEN
    RAISE EXCEPTION 'Des tournois sont datés entre le % et le % : modifier la fin de la saison % / % les ferait changer de saison.',
      du, au, OLD.saison, OLD.saison + 1;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_saisons_fins_protegee ON public.saisons_fins;
CREATE TRIGGER trg_saisons_fins_protegee
  BEFORE UPDATE OR DELETE ON public.saisons_fins
  FOR EACH ROW EXECUTE FUNCTION public.proteger_fin_de_saison();

-- Clôture d'une saison : fixe son dernier jour et la verrouille, en une seule opération
-- (droits de l'appelant : seul un administrateur passe les politiques RLS des deux tables)
CREATE OR REPLACE FUNCTION public.cloturer_saison(p_saison integer, p_fin date) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM saisons_cloturees WHERE saison = p_saison) THEN
    RAISE EXCEPTION 'La saison % / % est déjà clôturée.', p_saison, p_saison + 1;
  END IF;
  INSERT INTO saisons_fins (saison, fin) VALUES (p_saison, p_fin)
    ON CONFLICT (saison) DO UPDATE SET fin = EXCLUDED.fin;
  INSERT INTO saisons_cloturees (saison) VALUES (p_saison);
END $$;

REVOKE ALL ON FUNCTION public.cloturer_saison(integer, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cloturer_saison(integer, date) TO authenticated;

-- Journal d'audit : une fin de saison fixée ou modifiée est une configuration (valeurs avant / après)
DROP TRIGGER IF EXISTS audit ON public.saisons_fins;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.saisons_fins
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('saison', 'valeurs');
