-- ══════════════════════════════════════════════════════
--  Journal d'audit : qui a créé, modifié ou supprimé quoi (audit S-12)
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/journal_audit.sql).
--  Idempotent : peut être rejoué sans effet de bord. Ne contient aucune donnée.
--
--  Table journal_audit en AJOUT SEUL : personne ne peut la modifier ni y écrire par l'API. Seuls les administrateurs la lisent
--  (admin dans app_metadata). Elle est alimentée par des déclencheurs (ci-dessous) et par l'Edge Function manage-users
--  (comptes : création, modification, suppression, avec la clé de service).
--
--  Minimisation : on journalise qui, quand, quoi et sur quelle ligne, pas les données personnelles.
--    extras, parametres, breaklist_*, tda_editions   noms des champs modifiés, jamais leurs valeurs
--    results, sessions                                une ligne par opération (nombre de lignes, période, tournois), jamais les joueurs
--    tournaments, app_roles, saisons_cloturees        valeurs avant / après (configuration, sans donnée personnelle)
--  Pas journalisés : connexions (voir auth.users.last_sign_in_at), changement de son propre mot de passe, données de training.
--  Conservation : 12 mois (purger_journal_audit), à valider avec le DPO. Planification : journal_audit_cron.sql.
--  Tests : supabase/tests/journal_audit.test.sql
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.journal_audit (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  acteur       uuid,                                -- auth.users.id de la personne connectée (null : opération système)
  role_acteur  text,
  action       text        NOT NULL,                -- INSERT / UPDATE / DELETE, ou compte_cree / compte_modifie / compte_supprime
  objet        text        NOT NULL,                -- table, ou 'compte'
  ligne        text,                                -- identifiant de la ligne (null pour une opération en lot)
  detail       jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS journal_audit_at_idx ON public.journal_audit (at DESC);

ALTER TABLE public.journal_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_audit_lecture_admin" ON public.journal_audit;
CREATE POLICY "journal_audit_lecture_admin" ON public.journal_audit
  FOR SELECT TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

-- Lecture seule pour un administrateur connecté ; aucune écriture par l'API (la clé de service garde ses droits)
REVOKE ALL ON public.journal_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.journal_audit TO authenticated;

-- Écrit une ligne dans le journal avec l'identité de la personne connectée. Réservée aux déclencheurs ci-dessous.
CREATE OR REPLACE FUNCTION public.journaliser(p_action text, p_objet text, p_ligne text, p_detail jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.journal_audit (acteur, role_acteur, action, objet, ligne, detail)
  VALUES (auth.uid(), COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'système'), p_action, p_objet, p_ligne, COALESCE(p_detail, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.journaliser(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Déclencheur par ligne. Arguments : colonne qui identifie la ligne, puis 'valeurs' (avant / après) ou 'champs' (noms seulement)
CREATE OR REPLACE FUNCTION public.audit_ligne()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cle     text    := TG_ARGV[0];
  valeurs boolean := COALESCE(TG_ARGV[1], '') = 'valeurs';
  n       jsonb   := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  o       jsonb   := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  champs  text[];
  detail  jsonb   := '{}'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(array_agg(k ORDER BY k), '{}') INTO champs
    FROM jsonb_object_keys(n) k
    WHERE k NOT IN ('updated_at', 'updated_by') AND n -> k IS DISTINCT FROM o -> k;
    IF cardinality(champs) = 0 THEN RETURN NULL; END IF;   -- rien n'a réellement changé
    detail := jsonb_build_object('champs', to_jsonb(champs));
    IF valeurs THEN
      detail := detail || jsonb_build_object(
        'avant', (SELECT jsonb_object_agg(k, o -> k) FROM unnest(champs) k),
        'apres', (SELECT jsonb_object_agg(k, n -> k) FROM unnest(champs) k));
    END IF;
  ELSIF valeurs THEN
    detail := jsonb_build_object('valeurs', COALESCE(n, o));
  END IF;
  PERFORM public.journaliser(TG_OP, TG_TABLE_NAME, COALESCE(n, o) ->> cle, detail);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_ligne() FROM PUBLIC, anon, authenticated;

-- Déclencheurs par opération (results, sessions) : une ligne de journal par requête, pas une par résultat saisi
CREATE OR REPLACE FUNCTION public.audit_lot_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE d jsonb;
BEGIN
  SELECT jsonb_build_object('lignes', count(*), 'du', min(date), 'au', max(date), 'tournois', jsonb_agg(DISTINCT tournament_id))
    INTO d FROM new_rows;
  IF (d ->> 'lignes')::int > 0 THEN PERFORM public.journaliser('INSERT', TG_TABLE_NAME, NULL, d); END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_lot_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE d jsonb;
BEGIN
  SELECT jsonb_build_object('lignes', count(*), 'du', min(date), 'au', max(date), 'tournois', jsonb_agg(DISTINCT tournament_id))
    INTO d FROM new_rows;
  IF (d ->> 'lignes')::int > 0 THEN PERFORM public.journaliser('UPDATE', TG_TABLE_NAME, NULL, d); END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_lot_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE d jsonb;
BEGIN
  SELECT jsonb_build_object('lignes', count(*), 'du', min(date), 'au', max(date), 'tournois', jsonb_agg(DISTINCT tournament_id))
    INTO d FROM old_rows;
  IF (d ->> 'lignes')::int > 0 THEN PERFORM public.journaliser('DELETE', TG_TABLE_NAME, NULL, d); END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_lot_insert(), public.audit_lot_update(), public.audit_lot_delete() FROM PUBLIC, anon, authenticated;

-- results et sessions : par requête
DROP TRIGGER IF EXISTS audit_insert ON public.results;
CREATE TRIGGER audit_insert AFTER INSERT ON public.results
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.audit_lot_insert();
DROP TRIGGER IF EXISTS audit_update ON public.results;
CREATE TRIGGER audit_update AFTER UPDATE ON public.results
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.audit_lot_update();
DROP TRIGGER IF EXISTS audit_delete ON public.results;
CREATE TRIGGER audit_delete AFTER DELETE ON public.results
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.audit_lot_delete();

DROP TRIGGER IF EXISTS audit_insert ON public.sessions;
CREATE TRIGGER audit_insert AFTER INSERT ON public.sessions
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.audit_lot_insert();
DROP TRIGGER IF EXISTS audit_update ON public.sessions;
CREATE TRIGGER audit_update AFTER UPDATE ON public.sessions
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.audit_lot_update();
DROP TRIGGER IF EXISTS audit_delete ON public.sessions;
CREATE TRIGGER audit_delete AFTER DELETE ON public.sessions
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.audit_lot_delete();

-- Autres tables : par ligne
DROP TRIGGER IF EXISTS audit ON public.extras;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.extras
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('id', 'champs');

DROP TRIGGER IF EXISTS audit ON public.parametres;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.parametres
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('cle', 'champs');

DROP TRIGGER IF EXISTS audit ON public.breaklist_plannings;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.breaklist_plannings
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('mois', 'champs');

DROP TRIGGER IF EXISTS audit ON public.breaklist_config;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.breaklist_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('key', 'champs');

DROP TRIGGER IF EXISTS audit ON public.tda_editions;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.tda_editions
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('id', 'champs');

DROP TRIGGER IF EXISTS audit ON public.tournaments;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('id', 'valeurs');

DROP TRIGGER IF EXISTS audit ON public.app_roles;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.app_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('slug', 'valeurs');

DROP TRIGGER IF EXISTS audit ON public.saisons_cloturees;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.saisons_cloturees
  FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('saison', 'valeurs');

-- Purge : supprime les lignes plus anciennes que p_mois mois, renvoie leur nombre. Réservée au propriétaire (pg_cron).
CREATE OR REPLACE FUNCTION public.purger_journal_audit(p_mois integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.journal_audit WHERE at < now() - make_interval(months => p_mois);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.purger_journal_audit(integer) FROM PUBLIC, anon, authenticated;
