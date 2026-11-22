-- ══════════════════════════════════════════════════════
--  Paramètres du générateur de courrier : droit 'courrier'
--  À exécuter dans Supabase Dashboard > SQL Editor (ou : supabase db query --linked -f supabase/migrations/parametres_courrier.sql),
--  après parametres.sql et acces_donnees.sql (fonction has_panel_access). Idempotent : peut être rejoué sans effet de bord.
--
--  Le générateur de courrier sert deux services (Jeux traditionnels et Machines à sous). Ses réglages (destinataires,
--  signataires, horaires) sont dans la table parametres, sous des clés qui commencent par 'courrier' (courriers_modeles,
--  courrier_*). Jusqu'ici, seul le panel 'admin-tournois' y accédait, et ce panel ouvre aussi les extras (données
--  personnelles) : un compte Machines à sous ne doit pas l'avoir.
--
--  Cette politique ajoute le panel 'courrier' : lecture et écriture des seules clés 'courrier*'. Elle s'ajoute à la
--  politique 'parametres_admin_tournois' (les politiques permissives se cumulent), qui reste inchangée : le panel
--  'admin-tournois' et les admins gardent tout. Aucune donnée : ce fichier ne contient jamais d'INSERT.
-- ══════════════════════════════════════════════════════

DROP POLICY IF EXISTS "parametres_courrier" ON public.parametres;
CREATE POLICY "parametres_courrier" ON public.parametres
  FOR ALL TO authenticated
  USING      (left(cle, 8) = 'courrier' AND public.has_panel_access('courrier'))
  WITH CHECK (left(cle, 8) = 'courrier' AND public.has_panel_access('courrier'));
