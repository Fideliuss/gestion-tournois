-- ══════════════════════════════════════════════════════
--  Tests : fin de saison variable (voir supabase/migrations/saisons_fin_variable.sql)
--  Lancer : supabase db query --linked -f supabase/tests/saisons_fin_variable.test.sql
--  Transaction annulée à la fin (ROLLBACK) : rien n'est conservé.
--  Les tests utilisent la saison fictive 2090 / 2091 : ils ne dépendent pas des saisons réelles.
-- ══════════════════════════════════════════════════════
BEGIN;

-- ── Sans fin enregistrée : calendrier du 1er novembre au 31 octobre ──
DO $$
BEGIN
  ASSERT public.saison_de('2090-11-01') = 2090, 'calendrier 2090-11-01';
  ASSERT public.saison_de('2091-10-31') = 2090, 'calendrier 2091-10-31';
  ASSERT public.saison_de('2091-11-01') = 2091, 'calendrier 2091-11-01';
  ASSERT public.saison_de('2092-02-15') = 2091, 'calendrier 2092-02-15';
  ASSERT public.saison_de('pas une date') IS NULL, 'entrée invalide';
END $$;

-- ── Fin anticipée (29 octobre) : les 30 et 31 octobre passent dans la saison suivante ──
INSERT INTO public.saisons_fins (saison, fin) VALUES (2090, '2091-10-29');
DO $$
BEGIN
  ASSERT public.saison_de('2091-10-29') = 2090, 'fin anticipée : le 29 reste dans 2090';
  ASSERT public.saison_de('2091-10-30') = 2091, 'fin anticipée : le 30 passe dans 2091';
  ASSERT public.saison_de('2091-10-31') = 2091, 'fin anticipée : le 31 passe dans 2091';
  ASSERT public.saison_de('2091-11-01') = 2091, 'fin anticipée : le 1er nov. reste dans 2091';
  ASSERT public.saison_de('2090-11-01') = 2090, 'fin anticipée : le début de saison ne bouge pas';
END $$;

-- ── Fin tardive (3 novembre) : les 1er au 3 novembre restent dans la saison qui se termine ──
UPDATE public.saisons_fins SET fin = '2091-11-03' WHERE saison = 2090;
DO $$
BEGIN
  ASSERT public.saison_de('2091-10-31') = 2090, 'fin tardive : le 31 oct. reste dans 2090';
  ASSERT public.saison_de('2091-11-03') = 2090, 'fin tardive : le 3 nov. reste dans 2090';
  ASSERT public.saison_de('2091-11-04') = 2091, 'fin tardive : le 4 nov. passe dans 2091';
END $$;

-- ── Une fin reste dans le mois qui encadre le 31 octobre ──
DO $$
BEGIN
  BEGIN
    INSERT INTO public.saisons_fins (saison, fin) VALUES (2089, '2090-12-15');
    ASSERT false, 'une fin en décembre devait être refusée';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.saisons_fins (saison, fin) VALUES (2089, '2090-09-30');
    ASSERT false, 'une fin en septembre devait être refusée';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- ── Le verrou suit la fin : le 30 octobre n'est pas bloqué par la saison 2090 clôturée ──
UPDATE public.saisons_fins SET fin = '2091-10-29' WHERE saison = 2090;
INSERT INTO public.saisons_cloturees (saison) VALUES (2090);
DO $$
BEGIN
  INSERT INTO public.sessions (date, tournament_id) VALUES ('2091-10-30', 'test');   -- saison 2091, ouverte
  BEGIN
    INSERT INTO public.sessions (date, tournament_id) VALUES ('2091-10-29', 'test');
    ASSERT false, 'le 29 octobre (saison 2090 clôturée) devait être refusé';
  EXCEPTION WHEN raise_exception THEN NULL; END;
END $$;

-- ── Rouvrir garde la fin : le tournoi du 30 octobre ne repasse pas dans la saison 2090 ──
DELETE FROM public.saisons_cloturees WHERE saison = 2090;
DO $$
BEGIN
  ASSERT public.saison_de('2091-10-30') = 2091, 'après réouverture : le 30 reste dans 2091';
END $$;

-- ── Une fin ne bouge pas si un tournoi change de saison ──
DO $$
BEGIN
  BEGIN
    UPDATE public.saisons_fins SET fin = '2091-10-31' WHERE saison = 2090;   -- le tournoi du 30 repasserait dans 2090
    ASSERT false, 'déplacer la fin sur un tournoi saisi devait être refusé';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    DELETE FROM public.saisons_fins WHERE saison = 2090;
    ASSERT false, 'supprimer la fin sur un tournoi saisi devait être refusé';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  UPDATE public.saisons_fins SET fin = '2091-10-28' WHERE saison = 2090;     -- aucun tournoi entre le 28 et le 29 : accepté
  ASSERT public.saison_de('2091-10-29') = 2091, 'fin reculée : le 29 passe dans 2091';
END $$;

-- ── cloturer_saison : fixe la fin et verrouille ; refuse une seconde clôture ──
DO $$
BEGIN
  PERFORM public.cloturer_saison(2085, '2086-10-30');
  ASSERT EXISTS (SELECT 1 FROM public.saisons_cloturees WHERE saison = 2085), 'cloturer_saison : verrou posé';
  ASSERT (SELECT fin FROM public.saisons_fins WHERE saison = 2085) = '2086-10-30', 'cloturer_saison : fin enregistrée';
  BEGIN
    PERFORM public.cloturer_saison(2085, '2086-10-31');
    ASSERT false, 'une saison déjà clôturée devait être refusée';
  EXCEPTION WHEN raise_exception THEN NULL; END;
END $$;

-- ── Droits : cloturer_saison n'est pas appelable sans connexion ──
DO $$
DECLARE f text;
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.cloturer_saison(integer, date)', 'EXECUTE'), 'cloturer_saison ne devait pas être appelable par anon';
  ASSERT has_function_privilege('authenticated', 'public.cloturer_saison(integer, date)', 'EXECUTE'), 'cloturer_saison devait être appelable par authenticated';
  FOREACH f IN ARRAY ARRAY['saison_de', 'cloturer_saison', 'proteger_fin_de_saison', 'bloquer_saison_cloturee'] LOOP
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = f
                     AND proconfig @> ARRAY['search_path=public']), f || ' devait avoir search_path=public';
  END LOOP;
END $$;

ROLLBACK;
SELECT 'saisons_fin_variable : tous les tests passent' AS resultat;
