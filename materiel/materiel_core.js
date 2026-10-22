// ══════════════════════════════════════════════════════
//  MATÉRIEL : calcul pur, sans DOM (testé sous Node : voir materiel_core.test.js)
//  Les règles qui comptent (séquence des statuts, retours avec motif, unicité, jeu fixé) sont imposées par la base
//  (supabase/migrations/materiel.sql) : ce fichier ne fait que préparer l'écran et prévenir les erreurs de saisie.
// ══════════════════════════════════════════════════════

const MATERIEL = (function () {
  'use strict';

  // Libellé du bouton qui fait passer une fiche AU statut indiqué (avance d'une étape)
  const ACTION = {
    'Neuf': 'Intégrer',
    'En service': 'Mettre en service',
    "Hors d'usage": "Mettre hors d'usage",
    'A détruire': 'Marquer à détruire',
    'Détruit': 'Détruire',
  };

  // Classe de couleur d'un statut (voir materiel.css)
  const CLASSE = {
    'A intégrer': 'st-integrer', 'Neuf': 'st-neuf', 'En service': 'st-service',
    "Hors d'usage": 'st-hors', 'A détruire': 'st-detruire', 'Détruit': 'st-detruit',
  };

  function classe(statut) { return CLASSE[statut] || 'st-autre'; }
  function actionVers(statut) { return ACTION[statut] || ('Passer à « ' + statut + ' »'); }

  // Passages possibles depuis un statut : { avance: { vers } | null, retour: { vers } | null }
  function passages(ref, famille, de) {
    const t = (ref && ref.transitions || []).filter(function (x) { return x.famille === famille && x.de === de; });
    const avance = t.filter(function (x) { return !x.retour; })[0] || null;
    const retour = t.filter(function (x) { return x.retour; })[0] || null;
    return { avance: avance ? { vers: avance.vers } : null, retour: retour ? { vers: retour.vers } : null };
  }

  // Statuts d'une famille, dans l'ordre
  function statuts(ref, famille) {
    return (ref && ref.statuts || []).filter(function (s) { return s.famille === famille; }).sort(function (a, b) { return a.ordre - b.ordre; });
  }

  // Tri « naturel » des numéros : 85715 avant 118505, D25820 après les numéros seuls, DOUZ9.2 avant DOUZ9.10
  function cleNaturelle(id) {
    return String(id || '').toUpperCase().replace(/\d+/g, function (n) { return n.length < 12 ? ('000000000000' + n).slice(-12) : n; });
  }
  function trier(pieces) {
    return pieces.slice().sort(function (a, b) {
      const x = cleNaturelle(a.identifiant), y = cleNaturelle(b.identifiant);
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }

  function sansAccent(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // Filtre : { statuts: ['Neuf', ...] | null, jeu: '', finition: '', marque: '' | 'sans' | id, q: '' }
  function filtrer(pieces, f, sauf) {
    const s = sauf || {};
    const q = sansAccent(f.q).trim();
    return pieces.filter(function (p) {
      if (!s.statuts && f.statuts && f.statuts.indexOf(p.statut) < 0) return false;
      if (!s.jeu && f.jeu && p.jeu !== f.jeu) return false;
      if (f.finition && p.finition !== f.finition) return false;
      if (f.marque === 'sans' && p.marque_id != null) return false;
      if (f.marque && f.marque !== 'sans' && String(p.marque_id) !== String(f.marque)) return false;
      if (q && sansAccent(p.identifiant).indexOf(q) < 0) return false;
      return true;
    });
  }

  // Nombre de fiches par statut (autres filtres appliqués) et par jeu (autres filtres appliqués)
  function compter(pieces, f) {
    const parStatut = {}, parJeu = {};
    filtrer(pieces, f, { statuts: true }).forEach(function (p) { parStatut[p.statut] = (parStatut[p.statut] || 0) + 1; });
    filtrer(pieces, f, { jeu: true }).forEach(function (p) { parJeu[p.jeu] = (parJeu[p.jeu] || 0) + 1; });
    return { parStatut: parStatut, parJeu: parJeu };
  }

  // Saisie de numéros (un par ligne, ou séparés par des espaces, virgules, points-virgules) : liste propre et problèmes détectés
  const FORME_ID = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,39}$/;
  function analyserSaisie(texte, existants) {
    const dejaLa = {};
    (existants || []).forEach(function (i) { dejaLa[String(i).toUpperCase()] = true; });
    const vus = {}, ids = [], doublonsSaisie = [], existe = [], invalides = [];
    String(texte || '').split(/[\s,;]+/).forEach(function (brut) {
      const id = brut.trim();
      if (!id) return;
      if (!FORME_ID.test(id)) { if (invalides.indexOf(id) < 0) invalides.push(id); return; }
      const cle = id.toUpperCase();
      if (vus[cle]) { if (doublonsSaisie.indexOf(id) < 0) doublonsSaisie.push(id); return; }
      vus[cle] = true;
      if (dejaLa[cle]) { existe.push(id); return; }
      ids.push(id);
    });
    return { ids: ids, doublonsSaisie: doublonsSaisie, existe: existe, invalides: invalides };
  }

  // Une sélection peut avancer ou revenir ensemble si toutes les fiches ont le même statut
  function selectionCommune(pieces, ids, ref) {
    const choisies = pieces.filter(function (p) { return ids.indexOf(p.id) >= 0; });
    if (!choisies.length) return { ok: false, raison: 'Aucune fiche choisie' };
    const statut = choisies[0].statut, famille = choisies[0].famille;
    if (choisies.some(function (p) { return p.statut !== statut || p.famille !== famille; })) {
      return { ok: false, raison: 'Les fiches choisies n\'ont pas le même statut', fiches: choisies };
    }
    return { ok: true, statut: statut, famille: famille, fiches: choisies, passages: passages(ref, famille, statut) };
  }

  // Message lisible pour une erreur renvoyée par la base (les règles de la base sont déjà rédigées en français)
  function traduireErreur(e) {
    const msg = String((e && e.message) || e || '');
    const code = e && e.code;
    if (code === '23505' || /duplicate key/i.test(msg)) return 'Ce numéro existe déjà pour cette famille de matériel.';
    if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Votre compte n\'a pas le droit de faire cette action.';
    if (code === '23503' && /materiel_pieces_jeu_fkey/.test(msg)) return 'Jeu inconnu.';
    if (code === '23503') return 'Cette ligne est liée à d\'autres données et ne peut pas être supprimée.';
    return msg || 'Erreur inconnue.';
  }

  function jeuxPourSelect(ref) { return (ref && ref.jeux || []).slice().sort(function (a, b) { return a.ordre - b.ordre; }).map(function (j) { return j.nom; }); }

  function dateHeure(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' à ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  const API = { actionVers: actionVers, classe: classe, passages: passages, statuts: statuts, cleNaturelle: cleNaturelle, trier: trier, filtrer: filtrer,
    compter: compter, analyserSaisie: analyserSaisie, selectionCommune: selectionCommune, traduireErreur: traduireErreur, jeuxPourSelect: jeuxPourSelect, dateHeure: dateHeure };
  return API;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MATERIEL;
