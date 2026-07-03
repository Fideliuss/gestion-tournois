-- ══════════════════════════════════════════════════════
--  MIGRATION — RLS : user_metadata → app_metadata
--  À exécuter dans Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Migrer le rôle des utilisateurs existants vers app_metadata
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  raw_user_meta_data -> 'role'
)
WHERE raw_user_meta_data -> 'role' IS NOT NULL;

-- 2. Corriger la policy app_roles (écriture admin)
DROP POLICY IF EXISTS "écriture admin" ON public.app_roles;
CREATE POLICY "écriture admin" ON public.app_roles
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 3. Corriger la policy training_config (écriture admin)
DROP POLICY IF EXISTS "training_config_admin_write" ON public.training_config;
CREATE POLICY "training_config_admin_write" ON public.training_config
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
