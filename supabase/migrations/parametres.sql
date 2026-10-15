-- ══════════════════════════════════════════════════════
--  Paramètres de l'application partagés entre les postes (clé / valeur JSON)
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/parametres.sql).
--  Idempotent : peut être rejoué sans effet de bord.
--
--  Remplace peu à peu le stockage dans le navigateur (localStorage), propre à un poste. Premier usage :
--    'declaration_encadrement'  =  {"directeurs": ["Prénom NOM", ...], "arbitres": ["Prénom NOM", ...]}
--  Les noms du personnel ne sont plus dans le code (le dépôt est public) : ils sont enregistrés ici, depuis la page
--  Déclarations > Réglages. CE FICHIER NE CONTIENT AUCUNE DONNÉE, ne jamais y ajouter d'INSERT avec des noms.
--
--  Accès : admins et rôles qui ont le panel 'admin-tournois' (Gestion des comptes), en lecture comme en écriture.
--  Un paramètre d'un autre espace aura sa propre politique (par préfixe de clé) : ne pas élargir celle-ci.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_use_admin_tournois()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      OR EXISTS (
           SELECT 1 FROM public.app_roles r
           WHERE r.slug = (auth.jwt() -> 'app_metadata' ->> 'role')
             AND r.panels ? 'admin-tournois'
         );
$$;

-- Appelable seulement par un utilisateur connecté (pas par la clé publique seule)
REVOKE ALL ON FUNCTION public.can_use_admin_tournois() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_use_admin_tournois() TO authenticated;

CREATE TABLE IF NOT EXISTS public.parametres (
  cle         text        PRIMARY KEY CHECK (cle ~ '^[a-z0-9_]{2,60}$'),
  valeur      jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        DEFAULT auth.uid()
);

ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parametres_admin_tournois" ON public.parametres;
CREATE POLICY "parametres_admin_tournois" ON public.parametres
  FOR ALL TO authenticated
  USING (public.can_use_admin_tournois())
  WITH CHECK (public.can_use_admin_tournois());
