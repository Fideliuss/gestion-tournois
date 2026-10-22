-- ══════════════════════════════════════════════════════
--  Matériel de jeu : suivi quotidien des sixains (cartes), des billes et, plus tard, des mélangeurs et des cylindres
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/materiel.sql).
--  À appliquer APRÈS acces_donnees.sql (has_panel_access) et journal_audit.sql (déclencheur d'audit).
--  Idempotent : peut être rejoué sans effet de bord. Ne contient AUCUNE donnée de matériel : l'import des numéros se fait à part
--  (SQL non versionné), le dépôt étant public.
--
--  Ce n'est PAS un registre réglementaire : les entrées et sorties officielles se tiennent dans les registres papier. Cet outil suit
--  l'USAGE au quotidien (ouverture d'un sixain, mise hors service...) et prépare les sessions de destruction.
--
--  Règles imposées par la base (donc aussi par un appel direct à l'API) :
--   · accès : panel 'materiel' (et admin) pour tout, sauf les référentiels (jeux, statuts, transitions) modifiables par un admin seul
--   · un sixain est fixé à un jeu et à une finition : ils ne changent pas (un admin peut corriger une erreur de saisie, journalisée)
--   · un numéro est unique par famille (sans tenir compte des majuscules) ; une fiche ne naît qu'« A intégrer » ou « Neuf »
--   · le statut suit une séquence : A intégrer, Neuf, En service, Hors d'usage, A détruire, Détruit. Pas de saut. Un RETOUR EN ARRIÈRE
--     (une étape) est possible avec un MOTIF obligatoire. Passer à « Détruit » demande une session de destruction ; en sortir la retire
--   · chaque changement est écrit dans l'historique (qui, quand, de quoi à quoi, motif), que personne ne peut modifier ni effacer
--   · une fiche qui a servi (autre statut que « A intégrer » ou « Neuf », ou changée de statut) ne se supprime pas (sauf un admin)
--   · les billes ne se modifient que par des mouvements (+ ou -) : le stock ne peut pas devenir négatif
--  Journal d'audit : déclencheurs en fin de fichier. Tests : supabase/tests/materiel.test.sql
-- ══════════════════════════════════════════════════════

-- ── Référentiels ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.materiel_jeux (
  nom   text    PRIMARY KEY CHECK (char_length(btrim(nom)) BETWEEN 1 AND 40),
  ordre integer NOT NULL DEFAULT 0
);
INSERT INTO public.materiel_jeux (nom, ordre) VALUES ('Blackjack', 1), ('Ultimate', 2), ('Cash Game', 3), ('Tournois', 4)
ON CONFLICT (nom) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.materiel_marques (
  id  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom text    NOT NULL CHECK (char_length(btrim(nom)) BETWEEN 1 AND 60)
);
CREATE UNIQUE INDEX IF NOT EXISTS materiel_marques_nom ON public.materiel_marques (lower(btrim(nom)));

-- Statuts de chaque famille de matériel, dans l'ordre. `creation` : statut possible à la création d'une fiche par un utilisateur.
-- `exige_session` : on n'y passe qu'avec une session de destruction.
CREATE TABLE IF NOT EXISTS public.materiel_statuts (
  famille       text    NOT NULL,
  statut        text    NOT NULL,
  ordre         integer NOT NULL,
  creation      boolean NOT NULL DEFAULT false,
  exige_session boolean NOT NULL DEFAULT false,
  PRIMARY KEY (famille, statut)
);

-- Passages autorisés. `retour` : retour en arrière, qui demande un motif.
CREATE TABLE IF NOT EXISTS public.materiel_transitions (
  famille text    NOT NULL,
  de      text    NOT NULL,
  vers    text    NOT NULL,
  retour  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (famille, de, vers),
  FOREIGN KEY (famille, de)   REFERENCES public.materiel_statuts (famille, statut) ON UPDATE CASCADE,
  FOREIGN KEY (famille, vers) REFERENCES public.materiel_statuts (famille, statut) ON UPDATE CASCADE
);

INSERT INTO public.materiel_statuts (famille, statut, ordre, creation, exige_session) VALUES
  ('sixain', 'A intégrer',   1, true,  false),
  ('sixain', 'Neuf',         2, true,  false),
  ('sixain', 'En service',   3, false, false),
  ('sixain', 'Hors d''usage', 4, false, false),
  ('sixain', 'A détruire',   5, false, false),
  ('sixain', 'Détruit',      6, false, true)
ON CONFLICT (famille, statut) DO NOTHING;

INSERT INTO public.materiel_transitions (famille, de, vers, retour) VALUES
  ('sixain', 'A intégrer',   'Neuf',         false),
  ('sixain', 'Neuf',         'En service',   false),
  ('sixain', 'En service',   'Hors d''usage', false),
  ('sixain', 'Hors d''usage', 'A détruire',   false),
  ('sixain', 'A détruire',   'Détruit',      false),
  ('sixain', 'Neuf',         'A intégrer',   true),
  ('sixain', 'En service',   'Neuf',         true),
  ('sixain', 'Hors d''usage', 'En service',   true),
  ('sixain', 'A détruire',   'Hors d''usage', true),
  ('sixain', 'Détruit',      'A détruire',   true)
ON CONFLICT (famille, de, vers) DO NOTHING;

-- ── Sessions de destruction (en général une douzaine de sixains à la fois) ──
-- date_destruction vide : destructions antérieures à l'outil (import)
CREATE TABLE IF NOT EXISTS public.materiel_destructions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date_destruction date,
  reference        text        CHECK (reference IS NULL OR char_length(reference) <= 80),
  note             text        CHECK (note IS NULL OR char_length(note) <= 500),
  cree_le          timestamptz NOT NULL DEFAULT now(),
  cree_par         uuid        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ── Fiches de matériel (une par pièce identifiée : sixain, plus tard mélangeur et cylindre) ──
CREATE TABLE IF NOT EXISTS public.materiel_pieces (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  famille                text        NOT NULL,
  identifiant            text        NOT NULL CHECK (char_length(btrim(identifiant)) BETWEEN 1 AND 40),   -- numéro du sixain, numéro de série...
  jeu                    text        REFERENCES public.materiel_jeux(nom) ON UPDATE CASCADE,
  finition               text        CHECK (finition IS NULL OR finition IN ('Plastifié', 'Cartonné')),
  marque_id              integer     REFERENCES public.materiel_marques(id) ON DELETE RESTRICT,
  statut                 text        NOT NULL,
  session_destruction_id uuid        REFERENCES public.materiel_destructions(id) ON DELETE RESTRICT,
  note                   text        CHECK (note IS NULL OR char_length(note) <= 500),
  motif_changement       text        CHECK (motif_changement IS NULL OR char_length(motif_changement) <= 300),   -- champ de passage : lu puis vidé par le déclencheur
  cree_le                timestamptz NOT NULL DEFAULT now(),
  cree_par               uuid        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  modifie_le             timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (famille, statut) REFERENCES public.materiel_statuts (famille, statut) ON UPDATE CASCADE,
  CONSTRAINT materiel_sixain_complet CHECK (famille <> 'sixain' OR (jeu IS NOT NULL AND finition IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS materiel_pieces_identifiant ON public.materiel_pieces (famille, upper(btrim(identifiant)));
CREATE INDEX IF NOT EXISTS materiel_pieces_statut ON public.materiel_pieces (famille, jeu, statut);
CREATE INDEX IF NOT EXISTS materiel_pieces_session ON public.materiel_pieces (session_destruction_id);

-- ── Historique : chaque changement de statut, en ajout seul (écrit par les déclencheurs uniquement) ──
CREATE TABLE IF NOT EXISTS public.materiel_historique (
  id                     bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  piece_id               uuid        NOT NULL REFERENCES public.materiel_pieces(id) ON DELETE CASCADE,
  at                     timestamptz NOT NULL DEFAULT now(),
  de_statut              text,                                 -- vide à la création de la fiche
  vers_statut            text        NOT NULL,
  retour                 boolean     NOT NULL DEFAULT false,
  motif                  text,
  session_destruction_id uuid        REFERENCES public.materiel_destructions(id) ON DELETE SET NULL,
  par                    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  par_nom                text
);
CREATE INDEX IF NOT EXISTS materiel_historique_piece ON public.materiel_historique (piece_id, at);

-- ── Billes : un compteur par type, modifié seulement par des mouvements ──
CREATE TABLE IF NOT EXISTS public.materiel_billes (
  type     text    PRIMARY KEY CHECK (type ~ '^[a-z0-9_]+$'),
  libelle  text    NOT NULL,
  quantite integer NOT NULL DEFAULT 0 CHECK (quantite >= 0),
  ordre    integer NOT NULL DEFAULT 0
);
INSERT INTO public.materiel_billes (type, libelle, quantite, ordre) VALUES ('grosse', 'Grosses billes', 0, 1), ('petite', 'Petites billes', 0, 2)
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.materiel_billes_mouvements (
  id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type           text        NOT NULL REFERENCES public.materiel_billes(type) ON UPDATE CASCADE,
  delta          integer     NOT NULL CHECK (delta <> 0 AND delta BETWEEN -10000 AND 10000),
  quantite_apres integer,
  motif          text        CHECK (motif IS NULL OR char_length(motif) <= 200),
  at             timestamptz NOT NULL DEFAULT now(),
  par            uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  par_nom        text
);
CREATE INDEX IF NOT EXISTS materiel_billes_mouvements_type ON public.materiel_billes_mouvements (type, at DESC);

-- ── Fonctions internes (réservées aux déclencheurs) ──
-- Nom affiché de la personne connectée (prénom et nom du compte, sinon début de l'e-mail). user_metadata ne sert qu'à l'affichage.
CREATE OR REPLACE FUNCTION public.materiel_nom_acteur()
RETURNS text
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(btrim(COALESCE(auth.jwt() -> 'user_metadata' ->> 'first_name', '') || ' ' || COALESCE(auth.jwt() -> 'user_metadata' ->> 'last_name', '')), ''),
    NULLIF(split_part(COALESCE(auth.jwt() ->> 'email', ''), '@', 1), '')
  );
$$;
REVOKE ALL ON FUNCTION public.materiel_nom_acteur() FROM PUBLIC, anon, authenticated;

-- Garde des fiches. Les règles ne s'appliquent qu'aux appels de l'API (une personne connectée) : l'import SQL et la clé de service,
-- sans identité, passent (c'est ainsi qu'on charge l'inventaire de départ).
CREATE OR REPLACE FUNCTION public.materiel_pieces_garde()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api   boolean := auth.uid() IS NOT NULL;
  admin boolean := COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
  tr    public.materiel_transitions;
  st    public.materiel_statuts;
  depart text;
BEGIN
  NEW.identifiant := btrim(NEW.identifiant);

  IF TG_OP = 'INSERT' THEN
    NEW.cree_le := now(); NEW.modifie_le := now();
    IF api THEN
      NEW.cree_par := auth.uid(); NEW.session_destruction_id := NULL; NEW.motif_changement := NULL;
      SELECT * INTO st FROM public.materiel_statuts WHERE famille = NEW.famille AND statut = NEW.statut;
      IF NOT FOUND OR NOT st.creation THEN
        SELECT string_agg('« ' || statut || ' »', ' ou ' ORDER BY ordre) INTO depart FROM public.materiel_statuts WHERE famille = NEW.famille AND creation;
        RAISE EXCEPTION 'Une nouvelle fiche commence par %', COALESCE(depart, 'un statut de départ') USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Mise à jour
  NEW.cree_le := OLD.cree_le; NEW.cree_par := OLD.cree_par; NEW.modifie_le := now();
  IF api AND NOT admin AND (NEW.famille, NEW.identifiant, NEW.jeu, NEW.finition) IS DISTINCT FROM (OLD.famille, OLD.identifiant, OLD.jeu, OLD.finition) THEN
    RAISE EXCEPTION 'Le numéro, le jeu et la finition d''une fiche ne se modifient pas' USING ERRCODE = '23514';
  END IF;

  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    IF api THEN
      SELECT * INTO tr FROM public.materiel_transitions WHERE famille = OLD.famille AND de = OLD.statut AND vers = NEW.statut;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Changement de statut interdit : de « % » à « % »', OLD.statut, NEW.statut USING ERRCODE = '23514';
      END IF;
      IF tr.retour AND char_length(btrim(COALESCE(NEW.motif_changement, ''))) < 3 THEN
        RAISE EXCEPTION 'Un retour en arrière demande un motif' USING ERRCODE = '23514';
      END IF;
    ELSE
      tr.retour := false;
    END IF;
    SELECT * INTO st FROM public.materiel_statuts WHERE famille = NEW.famille AND statut = NEW.statut;
    IF st.exige_session THEN
      IF NEW.session_destruction_id IS NULL AND api THEN
        RAISE EXCEPTION 'Choisissez une session de destruction' USING ERRCODE = '23514';
      END IF;
    ELSE
      NEW.session_destruction_id := NULL;
    END IF;
    INSERT INTO public.materiel_historique (piece_id, de_statut, vers_statut, retour, motif, session_destruction_id, par, par_nom)
    VALUES (NEW.id, OLD.statut, NEW.statut, COALESCE(tr.retour, false), NULLIF(btrim(COALESCE(NEW.motif_changement, '')), ''),
            NEW.session_destruction_id, auth.uid(), public.materiel_nom_acteur());
  ELSE
    NEW.session_destruction_id := OLD.session_destruction_id;      -- hors changement de statut, la session ne bouge pas
  END IF;
  NEW.motif_changement := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.materiel_pieces_garde() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS materiel_pieces_garde ON public.materiel_pieces;
CREATE TRIGGER materiel_pieces_garde BEFORE INSERT OR UPDATE ON public.materiel_pieces
  FOR EACH ROW EXECUTE FUNCTION public.materiel_pieces_garde();

-- Première ligne de l'historique : la création de la fiche
CREATE OR REPLACE FUNCTION public.materiel_pieces_creation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.materiel_historique (piece_id, de_statut, vers_statut, motif, session_destruction_id, par, par_nom)
  VALUES (NEW.id, NULL, NEW.statut, 'Création', NEW.session_destruction_id, auth.uid(), public.materiel_nom_acteur());
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.materiel_pieces_creation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS materiel_pieces_creation ON public.materiel_pieces;
CREATE TRIGGER materiel_pieces_creation AFTER INSERT ON public.materiel_pieces
  FOR EACH ROW EXECUTE FUNCTION public.materiel_pieces_creation();

-- Suppression : seulement une fiche qui n'a pas servi (statut de départ, aucun changement). Un admin peut corriger une erreur.
CREATE OR REPLACE FUNCTION public.materiel_pieces_suppression()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    IF NOT EXISTS (SELECT 1 FROM public.materiel_statuts WHERE famille = OLD.famille AND statut = OLD.statut AND creation)
       OR (SELECT count(*) FROM public.materiel_historique WHERE piece_id = OLD.id) > 1 THEN
      RAISE EXCEPTION 'Une fiche qui a servi ne se supprime pas' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.materiel_pieces_suppression() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS materiel_pieces_suppression ON public.materiel_pieces;
CREATE TRIGGER materiel_pieces_suppression BEFORE DELETE ON public.materiel_pieces
  FOR EACH ROW EXECUTE FUNCTION public.materiel_pieces_suppression();

-- Billes : un mouvement met à jour le compteur et garde le résultat ; le stock ne peut pas devenir négatif
CREATE OR REPLACE FUNCTION public.materiel_billes_mouvement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q integer;
BEGIN
  SELECT quantite INTO q FROM public.materiel_billes WHERE type = NEW.type FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Type de bille inconnu' USING ERRCODE = '23503';
  END IF;
  IF q + NEW.delta < 0 THEN
    RAISE EXCEPTION 'Il n''y a que % bille(s) en stock : impossible d''en retirer %', q, -NEW.delta USING ERRCODE = '23514';
  END IF;
  UPDATE public.materiel_billes SET quantite = q + NEW.delta WHERE type = NEW.type;
  NEW.quantite_apres := q + NEW.delta;
  NEW.at := now();
  NEW.par := auth.uid();
  NEW.par_nom := public.materiel_nom_acteur();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.materiel_billes_mouvement() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS materiel_billes_mouvement ON public.materiel_billes_mouvements;
CREATE TRIGGER materiel_billes_mouvement BEFORE INSERT ON public.materiel_billes_mouvements
  FOR EACH ROW EXECUTE FUNCTION public.materiel_billes_mouvement();

-- ── Accès : panel 'materiel' (et admin) ──
ALTER TABLE public.materiel_jeux              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_marques           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_statuts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_transitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_destructions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_pieces            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_historique        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_billes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiel_billes_mouvements ENABLE ROW LEVEL SECURITY;

-- Référentiels : lecture par le panel, modification par un admin seul
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['materiel_jeux', 'materiel_statuts', 'materiel_transitions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_lecture" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_lecture" ON public.%1$s FOR SELECT TO authenticated USING (public.has_panel_access(''materiel''))', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_admin" ON public.%1$s', t);
    EXECUTE format($f$CREATE POLICY "%1$s_admin" ON public.%1$s FOR ALL TO authenticated
      USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
      WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')$f$, t);
  END LOOP;
END $$;

-- Marques, sessions de destruction, fiches : lecture et écriture par le panel
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['materiel_marques', 'materiel_destructions', 'materiel_pieces'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_panel" ON public.%1$s', t);
    EXECUTE format($f$CREATE POLICY "%1$s_panel" ON public.%1$s FOR ALL TO authenticated
      USING (public.has_panel_access('materiel')) WITH CHECK (public.has_panel_access('materiel'))$f$, t);
  END LOOP;
END $$;

-- Historique et compteurs : lecture seule (écrits par les déclencheurs) ; mouvements de billes : lecture et ajout
DROP POLICY IF EXISTS "materiel_historique_lecture" ON public.materiel_historique;
CREATE POLICY "materiel_historique_lecture" ON public.materiel_historique FOR SELECT TO authenticated USING (public.has_panel_access('materiel'));
DROP POLICY IF EXISTS "materiel_billes_lecture" ON public.materiel_billes;
CREATE POLICY "materiel_billes_lecture" ON public.materiel_billes FOR SELECT TO authenticated USING (public.has_panel_access('materiel'));
DROP POLICY IF EXISTS "materiel_billes_mouvements_lecture" ON public.materiel_billes_mouvements;
CREATE POLICY "materiel_billes_mouvements_lecture" ON public.materiel_billes_mouvements FOR SELECT TO authenticated USING (public.has_panel_access('materiel'));
DROP POLICY IF EXISTS "materiel_billes_mouvements_ajout" ON public.materiel_billes_mouvements;
CREATE POLICY "materiel_billes_mouvements_ajout" ON public.materiel_billes_mouvements FOR INSERT TO authenticated WITH CHECK (public.has_panel_access('materiel'));

-- Privilèges : rien pour la clé publique (anon) ; pour un compte connecté, le strict nécessaire (la RLS fait le reste)
REVOKE ALL ON public.materiel_jeux, public.materiel_marques, public.materiel_statuts, public.materiel_transitions, public.materiel_destructions,
              public.materiel_pieces, public.materiel_historique, public.materiel_billes, public.materiel_billes_mouvements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiel_jeux, public.materiel_statuts, public.materiel_transitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiel_marques, public.materiel_destructions, public.materiel_pieces TO authenticated;
GRANT SELECT ON public.materiel_historique, public.materiel_billes TO authenticated;
GRANT SELECT, INSERT ON public.materiel_billes_mouvements TO authenticated;

-- ── Journal d'audit (qui a fait quoi) : aucune donnée personnelle, les numéros de matériel n'en sont pas ──
DO $$
BEGIN
  IF to_regprocedure('public.audit_ligne()') IS NULL THEN
    RAISE NOTICE 'journal_audit.sql n''est pas appliqué : les déclencheurs d''audit du matériel ne sont pas créés';
    RETURN;
  END IF;
  DROP TRIGGER IF EXISTS audit ON public.materiel_pieces;
  CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.materiel_pieces FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('id', 'champs');
  DROP TRIGGER IF EXISTS audit ON public.materiel_destructions;
  CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.materiel_destructions FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('id', 'valeurs');
  DROP TRIGGER IF EXISTS audit ON public.materiel_marques;
  CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON public.materiel_marques FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('id', 'valeurs');
  DROP TRIGGER IF EXISTS audit ON public.materiel_billes_mouvements;
  CREATE TRIGGER audit AFTER INSERT ON public.materiel_billes_mouvements FOR EACH ROW EXECUTE FUNCTION public.audit_ligne('id', 'champs');   -- sans valeurs : la ligne porte le nom de la personne
END $$;
