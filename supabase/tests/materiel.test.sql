-- ══════════════════════════════════════════════════════
--  Tests : matériel de jeu (voir supabase/migrations/materiel.sql)
--  Lancer : supabase db query --linked -f supabase/tests/materiel.test.sql
--  Transaction annulée à la fin (ROLLBACK) : rien n'est conservé (fiches, sessions, mouvements, rôles de test, lignes de journal).
--  Les identités jouées sont celles d'un compte existant (auth.users) avec un rôle de test : l'un a le panel 'materiel', l'autre non.
-- ══════════════════════════════════════════════════════
BEGIN;

INSERT INTO public.app_roles (slug, label, panels, color) VALUES
  ('test_materiel', 'Test matériel',     '["materiel"]'::jsonb, '#888888'),
  ('test_sans',     'Test sans matériel', '["tournois"]'::jsonb, '#888888')
ON CONFLICT (slug) DO UPDATE SET panels = EXCLUDED.panels;

-- Données posées par le propriétaire (import) : l'import n'est soumis à aucune règle de séquence
INSERT INTO public.materiel_destructions (id, date_destruction, reference) VALUES ('00000000-0000-0000-0000-0000000000d1', NULL, 'Avant l''outil');
INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut, session_destruction_id) VALUES
  ('sixain', 'SEED-NEUF',   'Blackjack', 'Plastifié', 'Neuf',   NULL),
  ('sixain', 'SEED-DETRUIT', 'Ultimate',  'Cartonné',  'Détruit', '00000000-0000-0000-0000-0000000000d1');

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.materiel_historique h JOIN public.materiel_pieces p ON p.id = h.piece_id WHERE p.identifiant LIKE 'SEED-%') = 2,
    'l''import devait écrire la création de chaque fiche dans l''historique';
  ASSERT (SELECT session_destruction_id FROM public.materiel_pieces WHERE identifiant = 'SEED-DETRUIT') IS NOT NULL, 'l''import devait garder la session de destruction';
END $$;

-- ── Sans le panel (rôle inconnu, sans rôle, autre panel) : aucun accès ──
DO $$
DECLARE r text; u uuid := (SELECT id FROM auth.users LIMIT 1); n int;
BEGIN
  FOREACH r IN ARRAY ARRAY['', 'inconnu', 'test_sans'] LOOP
    PERFORM set_config('request.jwt.claims',
      CASE WHEN r = '' THEN '{"role":"authenticated","sub":"' || u || '"}'
           ELSE '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"' || r || '"}}' END, true);
    SET LOCAL ROLE authenticated;

    ASSERT (SELECT count(*) FROM public.materiel_pieces) = 0, r || ' ne devait lire aucune fiche';
    ASSERT (SELECT count(*) FROM public.materiel_historique) = 0, r || ' ne devait lire aucun historique';
    ASSERT (SELECT count(*) FROM public.materiel_destructions) = 0, r || ' ne devait lire aucune session';
    ASSERT (SELECT count(*) FROM public.materiel_billes) = 0, r || ' ne devait lire aucun compteur';
    ASSERT (SELECT count(*) FROM public.materiel_statuts) = 0, r || ' ne devait pas lire les statuts';
    UPDATE public.materiel_pieces SET note = 'x'; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0, r || ' ne devait modifier aucune fiche';
    DELETE FROM public.materiel_pieces; GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0, r || ' ne devait supprimer aucune fiche';
    BEGIN
      INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('sixain', 'X-' || r, 'Blackjack', 'Plastifié', 'Neuf');
      ASSERT false, r || ' ne devait pas créer de fiche';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
      INSERT INTO public.materiel_billes_mouvements (type, delta) VALUES ('grosse', 1);
      ASSERT false, r || ' ne devait pas ajouter de mouvement de billes';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    RESET ROLE;
  END LOOP;
END $$;

-- ── user_metadata ne donne aucun droit (seul app_metadata compte) ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1);
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","user_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*) FROM public.materiel_pieces) = 0, 'user_metadata.role=admin ne devait rien ouvrir';
  RESET ROLE;
END $$;

-- ── La clé publique seule (anon) n'a aucun accès ──
DO $$
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM count(*) FROM public.materiel_pieces;
    ASSERT false, 'anon ne devait pas lire les fiches';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Avec le panel : lecture, création, unicité, statut de départ ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1);
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"test_materiel"},"user_metadata":{"first_name":"Test","last_name":"Matériel"}}', true);
  SET LOCAL ROLE authenticated;

  ASSERT (SELECT count(*) FROM public.materiel_statuts WHERE famille = 'sixain') = 6, 'les 6 statuts du sixain devaient être lisibles';
  ASSERT (SELECT count(*) FROM public.materiel_jeux) >= 4, 'les jeux devaient être lisibles';
  ASSERT (SELECT count(*) FROM public.materiel_pieces WHERE identifiant LIKE 'SEED-%') = 2, 'les fiches importées devaient être lisibles';

  INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('sixain', 'T-001', 'Blackjack', 'Plastifié', 'Neuf');
  INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('sixain', '  T-002  ', 'Ultimate', 'Cartonné', 'A intégrer');
  ASSERT (SELECT identifiant FROM public.materiel_pieces WHERE identifiant = 'T-002') = 'T-002', 'les espaces autour du numéro devaient être retirés';
  ASSERT (SELECT cree_par FROM public.materiel_pieces WHERE identifiant = 'T-001') = u, 'le créateur devait être posé par la base';

  BEGIN
    INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('sixain', 't-001', 'Blackjack', 'Plastifié', 'Neuf');
    ASSERT false, 'un numéro en double (casse différente) devait être refusé';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('sixain', 'T-003', 'Blackjack', 'Plastifié', 'En service');
    ASSERT false, 'une fiche ne devait pas naître « En service »';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('sixain', 'T-004', 'Inconnu', 'Plastifié', 'Neuf');
    ASSERT false, 'un jeu inconnu devait être refusé';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_pieces (famille, identifiant, jeu, statut) VALUES ('sixain', 'T-005', 'Blackjack', 'Neuf');
    ASSERT false, 'un sixain sans finition devait être refusé';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_pieces (famille, identifiant, finition, statut) VALUES ('sixain', 'T-006', 'Plastifié', 'Neuf');
    ASSERT false, 'un sixain sans jeu devait être refusé';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('machin', 'T-007', 'Blackjack', 'Plastifié', 'Neuf');
    ASSERT false, 'une famille inconnue devait être refusée';
  EXCEPTION WHEN check_violation OR foreign_key_violation THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Séquence des statuts, retours avec motif, sessions de destruction, historique ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1); p uuid; s uuid; n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"test_materiel"},"user_metadata":{"first_name":"Test","last_name":"Matériel"}}', true);
  SET LOCAL ROLE authenticated;
  SELECT id INTO p FROM public.materiel_pieces WHERE identifiant = 'T-001';

  BEGIN
    UPDATE public.materiel_pieces SET statut = 'A détruire' WHERE id = p;
    ASSERT false, 'on ne saute pas d''étape (Neuf vers A détruire)';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.materiel_pieces SET statut = 'Détruit' WHERE id = p;
    ASSERT false, 'on ne saute pas d''étape (Neuf vers Détruit)';
  EXCEPTION WHEN check_violation THEN NULL; END;

  UPDATE public.materiel_pieces SET statut = 'En service' WHERE id = p;
  UPDATE public.materiel_pieces SET statut = 'Hors d''usage' WHERE id = p;
  UPDATE public.materiel_pieces SET statut = 'A détruire' WHERE id = p;
  ASSERT (SELECT statut FROM public.materiel_pieces WHERE id = p) = 'A détruire', 'la séquence normale devait passer';

  BEGIN
    UPDATE public.materiel_pieces SET statut = 'Détruit' WHERE id = p;
    ASSERT false, 'passer à Détruit sans session devait être refusé';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO public.materiel_destructions (id, date_destruction, reference) VALUES ('00000000-0000-0000-0000-0000000000d2', DATE '2026-11-05', 'Session de test');
  UPDATE public.materiel_pieces SET statut = 'Détruit', session_destruction_id = '00000000-0000-0000-0000-0000000000d2' WHERE id = p;
  ASSERT (SELECT session_destruction_id FROM public.materiel_pieces WHERE id = p) = '00000000-0000-0000-0000-0000000000d2', 'la session devait être enregistrée';

  -- retour en arrière : un motif est obligatoire
  BEGIN
    UPDATE public.materiel_pieces SET statut = 'A détruire' WHERE id = p;
    ASSERT false, 'un retour en arrière sans motif devait être refusé';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.materiel_pieces SET statut = 'A détruire', motif_changement = 'ab' WHERE id = p;
    ASSERT false, 'un motif trop court devait être refusé';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.materiel_pieces SET statut = 'A détruire', motif_changement = 'Saisi par erreur, le sixain est toujours à la salle' WHERE id = p;
  ASSERT (SELECT statut FROM public.materiel_pieces WHERE id = p) = 'A détruire', 'le retour avec motif devait passer';
  ASSERT (SELECT session_destruction_id FROM public.materiel_pieces WHERE id = p) IS NULL, 'sortir de Détruit devait retirer la session';
  ASSERT (SELECT motif_changement FROM public.materiel_pieces WHERE id = p) IS NULL, 'le motif de passage devait être vidé';
  BEGIN
    UPDATE public.materiel_pieces SET statut = 'Neuf' WHERE id = p;
    ASSERT false, 'on ne revient que d''une étape (A détruire vers Neuf)';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- historique : création, 3 avancées, détruit, retour = 6 lignes, chacune avec son auteur
  SELECT count(*) INTO n FROM public.materiel_historique WHERE piece_id = p;
  ASSERT n = 6, 'l''historique devait compter 6 lignes, trouvé ' || n;
  ASSERT (SELECT count(*) FROM public.materiel_historique WHERE piece_id = p AND retour AND motif LIKE 'Saisi par erreur%') = 1, 'le retour et son motif devaient figurer à l''historique';
  ASSERT (SELECT count(*) FROM public.materiel_historique WHERE piece_id = p AND par = u AND par_nom = 'Test Matériel') = 6, 'chaque ligne devait porter son auteur';
  ASSERT (SELECT vers_statut FROM public.materiel_historique WHERE piece_id = p AND session_destruction_id = '00000000-0000-0000-0000-0000000000d2' ORDER BY id LIMIT 1) = 'Détruit', 'la ligne « Détruit » devait citer la session';

  -- l'historique ne se modifie pas
  BEGIN
    INSERT INTO public.materiel_historique (piece_id, vers_statut) VALUES (p, 'Neuf');
    ASSERT false, 'l''historique ne devait pas accepter d''ajout direct';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.materiel_historique SET motif = 'réécrit' WHERE piece_id = p;
    ASSERT false, 'l''historique ne devait pas se modifier';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.materiel_historique WHERE piece_id = p;
    ASSERT false, 'l''historique ne devait pas s''effacer';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- une session qui contient des fiches ne se supprime pas
  BEGIN
    DELETE FROM public.materiel_destructions WHERE id = '00000000-0000-0000-0000-0000000000d1';
    ASSERT false, 'une session de destruction utilisée ne devait pas se supprimer';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Le jeu, la finition et le numéro ne changent pas ; la marque et la note, si ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1); p uuid; m int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"test_materiel"}}', true);
  SET LOCAL ROLE authenticated;
  SELECT id INTO p FROM public.materiel_pieces WHERE identifiant = 'T-002';

  BEGIN UPDATE public.materiel_pieces SET jeu = 'Tournois' WHERE id = p; ASSERT false, 'le jeu ne devait pas changer';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.materiel_pieces SET finition = 'Plastifié' WHERE id = p; ASSERT false, 'la finition ne devait pas changer';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.materiel_pieces SET identifiant = 'T-999' WHERE id = p; ASSERT false, 'le numéro ne devait pas changer';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO public.materiel_marques (nom) VALUES ('Marque de test') RETURNING id INTO m;
  BEGIN INSERT INTO public.materiel_marques (nom) VALUES (' marque DE test '); ASSERT false, 'une marque en double devait être refusée';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  UPDATE public.materiel_pieces SET marque_id = m, note = 'Boîte abîmée' WHERE id = p;
  ASSERT (SELECT marque_id FROM public.materiel_pieces WHERE id = p) = m, 'la marque devait pouvoir être renseignée';
  BEGIN DELETE FROM public.materiel_marques WHERE id = m; ASSERT false, 'une marque utilisée ne devait pas se supprimer';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Suppression : seulement une fiche qui n'a pas servi ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1); n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"test_materiel"}}', true);
  SET LOCAL ROLE authenticated;
  DELETE FROM public.materiel_pieces WHERE identifiant = 'T-002'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'une fiche neuve sans historique devait pouvoir se supprimer (erreur de saisie)';
  BEGIN DELETE FROM public.materiel_pieces WHERE identifiant = 'T-001'; ASSERT false, 'une fiche qui a servi ne devait pas se supprimer';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN DELETE FROM public.materiel_pieces WHERE identifiant = 'SEED-DETRUIT'; ASSERT false, 'une fiche détruite ne devait pas se supprimer';
  EXCEPTION WHEN check_violation THEN NULL; END;
  -- une fiche créée « Neuf » puis passée « En service » puis remise « Neuf » (retour) a un historique : elle ne se supprime pas
  INSERT INTO public.materiel_pieces (famille, identifiant, jeu, finition, statut) VALUES ('sixain', 'T-010', 'Blackjack', 'Plastifié', 'Neuf');
  UPDATE public.materiel_pieces SET statut = 'En service' WHERE identifiant = 'T-010';
  UPDATE public.materiel_pieces SET statut = 'Neuf', motif_changement = 'Rangé sans avoir été utilisé' WHERE identifiant = 'T-010';
  BEGIN DELETE FROM public.materiel_pieces WHERE identifiant = 'T-010'; ASSERT false, 'une fiche qui a changé de statut ne devait pas se supprimer';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Billes : mouvements seulement, jamais négatif ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1); q int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"test_materiel"},"user_metadata":{"first_name":"Test","last_name":"Matériel"}}', true);
  SET LOCAL ROLE authenticated;
  SELECT quantite INTO q FROM public.materiel_billes WHERE type = 'grosse';
  INSERT INTO public.materiel_billes_mouvements (type, delta, motif) VALUES ('grosse', 15, 'Stock initial de test');
  ASSERT (SELECT quantite FROM public.materiel_billes WHERE type = 'grosse') = q + 15, 'le compteur devait suivre le mouvement';
  ASSERT (SELECT quantite_apres FROM public.materiel_billes_mouvements ORDER BY id DESC LIMIT 1) = q + 15, 'le mouvement devait garder le résultat';
  ASSERT (SELECT par_nom FROM public.materiel_billes_mouvements ORDER BY id DESC LIMIT 1) = 'Test Matériel', 'le mouvement devait porter son auteur';
  INSERT INTO public.materiel_billes_mouvements (type, delta) VALUES ('grosse', -3);
  ASSERT (SELECT quantite FROM public.materiel_billes WHERE type = 'grosse') = q + 12, 'un retrait devait diminuer le compteur';
  BEGIN
    INSERT INTO public.materiel_billes_mouvements (type, delta) VALUES ('grosse', -100000);
    ASSERT false, 'un mouvement hors bornes devait être refusé';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_billes_mouvements (type, delta) VALUES ('grosse', -(q + 13));
    ASSERT false, 'le stock de billes ne devait pas devenir négatif';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_billes_mouvements (type, delta) VALUES ('grosse', 0);
    ASSERT false, 'un mouvement nul devait être refusé';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.materiel_billes_mouvements (type, delta) VALUES ('inconnue', 1);
    ASSERT false, 'un type de bille inconnu devait être refusé';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    UPDATE public.materiel_billes SET quantite = 999 WHERE type = 'grosse';
    ASSERT false, 'le compteur ne devait pas se modifier directement';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.materiel_billes_mouvements;
    ASSERT false, 'les mouvements ne devaient pas s''effacer';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.materiel_billes_mouvements SET delta = 99;
    ASSERT false, 'les mouvements ne devaient pas se modifier';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Référentiels : le panel lit, un admin seul modifie ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1); n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"test_materiel"}}', true);
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO public.materiel_jeux (nom) VALUES ('Poker de test'); ASSERT false, 'le panel ne devait pas ajouter un jeu';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.materiel_transitions SET retour = false WHERE de = 'Détruit'; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'le panel ne devait pas modifier une transition';
  DELETE FROM public.materiel_statuts; GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'le panel ne devait pas supprimer de statut';
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.materiel_jeux (nom, ordre) VALUES ('Poker de test', 9);
  ASSERT (SELECT count(*) FROM public.materiel_jeux WHERE nom = 'Poker de test') = 1, 'un admin devait pouvoir ajouter un jeu';
  RESET ROLE;
END $$;

-- ── Un admin peut corriger une erreur de saisie (jeu, numéro), mais pas les règles de séquence ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1); p uuid;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
  SELECT id INTO p FROM public.materiel_pieces WHERE identifiant = 'SEED-NEUF';
  UPDATE public.materiel_pieces SET jeu = 'Tournois' WHERE id = p;
  ASSERT (SELECT jeu FROM public.materiel_pieces WHERE id = p) = 'Tournois', 'un admin devait pouvoir corriger le jeu';
  BEGIN
    UPDATE public.materiel_pieces SET statut = 'Détruit', session_destruction_id = '00000000-0000-0000-0000-0000000000d1' WHERE id = p;
    ASSERT false, 'un admin ne saute pas non plus d''étape';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RESET ROLE;
END $$;

-- ── Journal d'audit : ce qui est fait est tracé, sans nom de personne ──
DO $$
DECLARE u uuid := (SELECT id FROM auth.users LIMIT 1);
BEGIN
  IF to_regclass('public.journal_audit') IS NULL THEN RAISE NOTICE 'journal_audit absent : test d''audit ignoré'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || u || '","app_metadata":{"role":"admin"}}', true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*) FROM public.journal_audit WHERE objet = 'materiel_pieces') > 0, 'les changements de fiche devaient être journalisés';
  ASSERT (SELECT count(*) FROM public.journal_audit WHERE objet = 'materiel_billes_mouvements') > 0, 'les mouvements de billes devaient être journalisés';
  ASSERT (SELECT count(*) FROM public.journal_audit WHERE objet LIKE 'materiel%' AND detail::text LIKE '%Test Matériel%') = 0, 'le journal ne devait contenir aucun nom de personne';
  RESET ROLE;
END $$;

ROLLBACK;
SELECT 'materiel : tous les tests passent' AS resultat;
