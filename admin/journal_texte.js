// ══════════════════════════════════════════════════════
//  JOURNAL D'AUDIT : texte lisible d'une ligne du journal (testé sous Node : voir journal_texte.test.js)
//  Une ligne de journal_audit = { id, at, acteur, role_acteur, action, objet, ligne, detail } (voir supabase/migrations/journal_audit.sql).
//  decrire(e, ctx) renvoie une phrase en texte brut (à échapper avant de l'insérer dans du HTML).
//  ctx : { nomCompte(id) : nom du compte ou null, libelleRole(slug) : libellé du rôle }
// ══════════════════════════════════════════════════════

const JOURNAL_TEXTE = (function () {
  // Domaines filtrables dans la page, dans l'ordre d'affichage
  const OBJETS = [
    ['compte', 'Comptes'], ['app_roles', 'Rôles et accès'], ['extras', 'Extras'], ['results', 'Résultats'], ['sessions', 'Sessions'],
    ['tournaments', 'Tournois'], ['saisons_cloturees', 'Saisons'], ['saisons_fins', 'Fins de saison'], ['parametres', 'Paramètres'],
    ['breaklist_plannings', 'Plannings break list'], ['breaklist_config', 'Réglages break list'], ['tda_editions', 'Règlement TDA'],
    ['materiel_pieces', 'Fiches de matériel'], ['materiel_destructions', 'Sessions de destruction'], ['materiel_marques', 'Marques de matériel'],
    ['materiel_billes_mouvements', 'Billes'],
  ];
  const LIBELLE_OBJET = Object.fromEntries(OBJETS);

  const CHAMPS = {
    nom: 'nom', prenom: 'prénom', date_naissance: 'date de naissance', lieu_naissance: 'lieu de naissance', adresse: 'adresse',
    code_postal: 'code postal', ville: 'ville',
    name: 'nom', day: 'jour', buyin: 'cave', pp: 'prize pool', frais: 'frais', points: 'barème',
    label: 'libellé', color: 'couleur', panels: 'accès',
    active: 'activation', libelle: 'libellé', valeur: 'valeur', value: 'valeur', data: 'contenu',
    statut: 'statut', marque_id: 'marque', session_destruction_id: 'session de destruction', note: 'note',
  };
  const VERBE = { INSERT: 'a ajouté', UPDATE: 'a modifié', DELETE: 'a supprimé' };

  const liste = a => (a || []).map(function (c) { return CHAMPS[c] || c; }).join(', ');
  const frDate = iso => (/^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : (iso || ''));
  const pluriel = (n, un, plusieurs) => n + ' ' + (n > 1 ? plusieurs : un);

  // results et sessions : une ligne de journal par requête (nombre de lignes, période, tournois), jamais les joueurs
  function lot(e, un, plusieurs) {
    const d = e.detail || {};
    const n = Number(d.lignes) || 0;
    const infos = [];
    if (d.tournois && d.tournois.length) infos.push((d.tournois.length > 1 ? 'tournois ' : 'tournoi ') + d.tournois.join(', '));
    if (d.du) infos.push(d.du === d.au ? 'le ' + frDate(d.du) : 'du ' + frDate(d.du) + ' au ' + frDate(d.au));
    return VERBE[e.action] + ' ' + pluriel(n, un, plusieurs) + (infos.length ? ' (' + infos.join(', ') + ')' : '');
  }

  function droitsRole(d) {
    const avant = (d.avant && d.avant.panels) || [], apres = (d.apres && d.apres.panels) || [];
    const plus = apres.filter(function (p) { return avant.indexOf(p) < 0; });
    const moins = avant.filter(function (p) { return apres.indexOf(p) < 0; });
    const parts = [];
    if (plus.length) parts.push('ajouté : ' + plus.join(', '));
    if (moins.length) parts.push('retiré : ' + moins.join(', '));
    return parts;
  }

  function decrire(e, ctx) {
    const d = e.detail || {};
    const c = ctx || {};
    const role = function (s) { return (c.libelleRole && c.libelleRole(s)) || s || '?'; };
    const compte = function () { return d.email || (c.nomCompte && c.nomCompte(e.ligne)) || '?'; };
    switch (e.action) {
      case 'compte_cree': return 'a créé le compte ' + (d.email || '?') + ' (rôle ' + role(d.role) + ')';
      case 'compte_supprime': return 'a supprimé le compte ' + (d.email || 'inconnu') + (d.role ? ' (rôle ' + role(d.role) + ')' : '');
      case 'compte_desactive': return 'a désactivé le compte ' + compte();
      case 'compte_reactive': return 'a réactivé le compte ' + compte();
      case 'compte_modifie': {
        const parts = [];
        (d.champs || []).forEach(function (ch) {
          if (ch === 'role') parts.push('rôle ' + role(d.role_avant) + ' → ' + role(d.role_apres));
          else if (ch === 'nom') parts.push('prénom ou nom');
          else if (ch === 'mot_de_passe') parts.push('mot de passe réinitialisé');
          else parts.push(ch);
        });
        return 'a modifié le compte ' + ((c.nomCompte && c.nomCompte(e.ligne)) || 'supprimé depuis') + (parts.length ? ' : ' + parts.join(', ') : '');
      }
    }
    const verbe = VERBE[e.action] || ('a effectué ' + e.action + ' sur');
    const champs = e.action === 'UPDATE' && d.champs ? ' (' + liste(d.champs) + ')' : '';
    switch (e.objet) {
      case 'results': return lot(e, 'résultat', 'résultats');
      case 'sessions': return lot(e, 'session', 'sessions');
      case 'extras': return verbe + ' un extra' + champs;
      case 'tournaments': {
        const nom = (d.valeurs && d.valeurs.name) || (d.apres && d.apres.name) || (d.avant && d.avant.name) || e.ligne;
        return verbe + ' le tournoi ' + nom + champs;
      }
      case 'app_roles': {
        const nom = role(e.ligne);
        if (e.action === 'INSERT') return 'a créé le rôle ' + nom;
        if (e.action === 'DELETE') return 'a supprimé le rôle ' + nom;
        const autres = (d.champs || []).filter(function (x) { return x !== 'panels'; });
        const parts = droitsRole(d).concat(autres.length ? [liste(autres)] : []);
        return 'a modifié le rôle ' + nom + (parts.length ? ' (' + parts.join(' ; ') + ')' : '');
      }
      case 'parametres': return verbe + ' le paramètre ' + e.ligne;
      case 'saisons_cloturees': {
        const s = Number(e.ligne);
        const saison = s ? s + ' / ' + (s + 1) : e.ligne;
        return e.action === 'DELETE' ? 'a rouvert la saison ' + saison : 'a clôturé la saison ' + saison;
      }
      case 'saisons_fins': {
        const s = Number(e.ligne);
        const saison = s ? s + ' / ' + (s + 1) : e.ligne;
        const fin = d.valeurs && d.valeurs.fin ? ' au ' + frDate(d.valeurs.fin) : (d.apres && d.apres.fin ? ' au ' + frDate(d.apres.fin) : '');
        return e.action === 'DELETE' ? 'a retiré la fin de la saison ' + saison : 'a fixé la fin de la saison ' + saison + fin;
      }
      case 'breaklist_plannings': return verbe + ' le planning de ' + e.ligne;
      case 'breaklist_config': return verbe + ' les réglages de la break list';
      case 'tda_editions': return verbe + ' l\'édition ' + e.ligne + ' du règlement TDA' + champs;
      case 'materiel_pieces': {
        const modifs = (d.champs || []).filter(function (x) { return x !== 'modifie_le'; });
        return verbe + ' une fiche de matériel' + (e.action === 'UPDATE' && modifs.length ? ' (' + liste(modifs) + ')' : '');
      }
      case 'materiel_destructions': return verbe + ' une session de destruction' + (d.valeurs && d.valeurs.date_destruction ? ' du ' + frDate(d.valeurs.date_destruction) : '');
      case 'materiel_marques': return verbe + ' la marque ' + ((d.valeurs && d.valeurs.nom) || '');
      case 'materiel_billes_mouvements': return 'a enregistré un mouvement de billes';
      default: return verbe + ' ' + (LIBELLE_OBJET[e.objet] || e.objet) + (e.ligne ? ' ' + e.ligne : '');
    }
  }

  return { decrire: decrire, OBJETS: OBJETS, libelleObjet: function (o) { return LIBELLE_OBJET[o] || o; } };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = JOURNAL_TEXTE;
