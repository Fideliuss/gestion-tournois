// ══════════════════════════════════════════════════════
//  Jurisprudence TDA - logique sans DOM (testable sous Node, voir tda_cas_outils.test.js)
//  Libellés des sanctions et des états, vérification de la saisie d'un cas (mêmes bornes que la base, voir
//  supabase/migrations/tda_jurisprudence.sql : la base reste la vraie barrière), dates, transformation des cas en blocs
//  pour la recherche.
// ══════════════════════════════════════════════════════
(function (root) {
  'use strict';

  const SANCTIONS = [
    ['aucune', 'Aucune sanction'],
    ['avertissement', 'Avertissement verbal'],
    ['main_penalite', 'Main de pénalité'],
    ['tour_penalite', 'Tour de pénalité'],
    ['penalite_jetons', 'Pénalité en jetons'],
    ['disqualification', 'Disqualification'],
    ['autre', 'Autre'],
  ];
  const VARIANTES = ['NLHE', 'PLO', 'Stud', 'Mixte', 'Autre'];

  // classe : suffixe de la couleur du badge (on = en attente, ok = validé, warn = à préciser, ko = refusé, off = archivé)
  const STATUTS = {
    propose:    { libelle: 'En attente de validation', classe: 'on' },
    a_preciser: { libelle: 'À préciser', classe: 'warn' },
    valide:     { libelle: 'Validé', classe: 'ok' },
    refuse:     { libelle: 'Refusé', classe: 'ko' },
    archive:    { libelle: 'Archivé', classe: 'off' },
  };

  const BORNES = { titre: [5, 140], faits: [20, 4000], decision: [10, 4000], sanction_precision: [0, 500], variante: [0, 40], commentaire: [0, 1000], archive_motif: [0, 500] };

  function libelleSanction(type) {
    const s = SANCTIONS.find(function (x) { return x[0] === type; });
    return s ? s[1] : String(type || '');
  }

  function statut(s) { return STATUTS[s] || { libelle: String(s || ''), classe: 'off' }; }

  // « 2026_v1_0 » : « 2026 v1.0 »
  function libelleEdition(id) {
    const m = /^(\d{4})_v(\d+)_(\d+)$/.exec(id || '');
    return m ? m[1] + ' v' + m[2] + '.' + m[3] : (id || '');
  }

  function dateFr(iso) {
    const p = String(iso || '').slice(0, 10).split('-');
    return p.length === 3 && p[0] ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  // Vérifie la saisie d'un cas ; renvoie { erreurs: { champ: message }, ok: boolean }
  function verifier(c) {
    const e = {};
    const long = function (k) { return String(c[k] == null ? '' : c[k]).trim().length; };
    if (long('titre') < BORNES.titre[0]) e.titre = 'Donnez un titre d\'au moins ' + BORNES.titre[0] + ' caractères.';
    else if (long('titre') > BORNES.titre[1]) e.titre = 'Le titre est limité à ' + BORNES.titre[1] + ' caractères.';
    if (long('faits') < BORNES.faits[0]) e.faits = 'Décrivez les faits (au moins ' + BORNES.faits[0] + ' caractères).';
    else if (long('faits') > BORNES.faits[1]) e.faits = 'Les faits sont limités à ' + BORNES.faits[1] + ' caractères.';
    if (!Array.isArray(c.regles) || !c.regles.length) e.regles = 'Choisissez au moins une règle ou procédure applicable.';
    else if (c.regles.length > 12) e.regles = 'Douze règles au maximum.';
    if (long('decision') < BORNES.decision[0]) e.decision = 'Indiquez la décision prise (au moins ' + BORNES.decision[0] + ' caractères).';
    else if (long('decision') > BORNES.decision[1]) e.decision = 'La décision est limitée à ' + BORNES.decision[1] + ' caractères.';
    if (!SANCTIONS.some(function (s) { return s[0] === c.sanction_type; })) e.sanction_type = 'Choisissez une sanction.';
    if (long('sanction_precision') > BORNES.sanction_precision[1]) e.sanction_precision = 'La précision est limitée à ' + BORNES.sanction_precision[1] + ' caractères.';
    if (long('variante') > BORNES.variante[1]) e.variante = 'Variante trop longue.';
    if (c.date_cas && !/^\d{4}-\d{2}-\d{2}$/.test(c.date_cas)) e.date_cas = 'Date invalide.';
    return { erreurs: e, ok: Object.keys(e).length === 0 };
  }

  // Commentaire ou motif obligatoire selon la décision du validateur
  function verifierDecision(action, texte) {
    const t = String(texte || '').trim();
    if ((action === 'a_preciser' || action === 'refuse') && !t) return 'Un commentaire est obligatoire pour renvoyer ou refuser un cas.';
    if (action === 'archive' && !t) return 'Indiquez le motif de l\'archivage.';
    if (t.length > (action === 'archive' ? BORNES.archive_motif[1] : BORNES.commentaire[1])) return 'Texte trop long.';
    return null;
  }

  // Les cas validés rejoignent la recherche comme des blocs de type « cas » (id : cas/<uuid>, adresse #cas/<uuid>)
  function enBlocs(cas) {
    return (cas || []).map(function (c, i) {
      const el = [{ t: 'p', texte: c.faits }, { t: 'p', texte: c.decision }, { t: 'p', texte: libelleSanction(c.sanction_type) + (c.sanction_precision ? ' : ' + c.sanction_precision : '') }];
      return { id: 'cas/' + c.id, kind: 'cas', numero: '', section: 'cas', titre: c.titre, ordre: 100000 + i, data: { elements: el } };
    });
  }

  // Règles de formulaire : suggestions parmi les règles et procédures pour un texte tapé (numéro ou mots du titre)
  function suggestions(blocs, saisie, deja, limite) {
    const q = String(saisie || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const pris = deja || [];
    const num = q.replace(/\s+/g, '').replace(/^regle/, '').replace(/^rp-?/, 'rp');
    return blocs.filter(function (b) {
      if ((b.kind !== 'regle' && b.kind !== 'rp') || pris.indexOf(b.id) >= 0) return false;
      if (!q) return true;
      const n = String(b.numero).toLowerCase().replace('rp-', 'rp');
      const t = b.titre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return n === num || n.indexOf(num) === 0 || t.indexOf(q) >= 0;
    }).sort(function (a, b) {
      const exact = function (x) { return String(x.numero).toLowerCase().replace('rp-', 'rp') === num ? 0 : 1; };
      return exact(a) - exact(b) || a.ordre - b.ordre;
    }).slice(0, limite || 8);
  }

  const API = { SANCTIONS: SANCTIONS, VARIANTES: VARIANTES, STATUTS: STATUTS, libelleSanction: libelleSanction, statut: statut, libelleEdition: libelleEdition,
    dateFr: dateFr, verifier: verifier, verifierDecision: verifierDecision, enBlocs: enBlocs, suggestions: suggestions };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TDA_CAS = API;
})(typeof window !== 'undefined' ? window : this);
