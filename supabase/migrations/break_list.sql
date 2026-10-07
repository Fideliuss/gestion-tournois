-- ══════════════════════════════════════════════════════
--  Espace « Break list » : planning mensuel et réglages
--  Accès réservé aux admins et aux rôles qui ont le panel 'break-list' (Gestion des comptes).
--  · breaklist_plannings : un planning par mois (clé 'AAAA-MM'), remplacé en entier à chaque import
--  · breaklist_config    : réglages de l'espace (une ligne, clé 'config') : grades, codes du planning, postes, tables...
--  Les extractions Octime (deltas de quota) ne sont JAMAIS enregistrées : elles restent dans le navigateur.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_use_break_list()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      OR EXISTS (
           SELECT 1 FROM public.app_roles r
           WHERE r.slug = (auth.jwt() -> 'app_metadata' ->> 'role')
             AND r.panels ? 'break-list'
         );
$$;

CREATE TABLE IF NOT EXISTS public.breaklist_plannings (
  mois        text        PRIMARY KEY CHECK (mois ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  data        jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.breaklist_config (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        DEFAULT auth.uid()
);

ALTER TABLE public.breaklist_plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaklist_config    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "breaklist_plannings_all" ON public.breaklist_plannings;
CREATE POLICY "breaklist_plannings_all" ON public.breaklist_plannings
  FOR ALL TO authenticated
  USING (public.can_use_break_list())
  WITH CHECK (public.can_use_break_list());

DROP POLICY IF EXISTS "breaklist_config_all" ON public.breaklist_config;
CREATE POLICY "breaklist_config_all" ON public.breaklist_config
  FOR ALL TO authenticated
  USING (public.can_use_break_list())
  WITH CHECK (public.can_use_break_list());
