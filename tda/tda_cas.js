// ══════════════════════════════════════════════════════
//  JURISPRUDENCE TDA - écrans (chargé après tda.js, qui fournit $, esc, parId, regles, procedures...)
//  Un floor propose un cas (faits, règles applicables, décision, sanction), un MCD le valide, le renvoie ou le refuse ;
//  un cas validé devient la référence : onglet « Jurisprudence », section sous chaque règle, recherche.
//  Adresses :  #jurisprudence  ·  #jurisprudence/mes  ·  #jurisprudence/a-valider  ·  #cas/<id>  ·  #nouveau  ·  #nouveau/r45
//              (cas lié à une règle)  ·  #modifier/<id>
//  Les droits réels sont dans la base (tda_jurisprudence.sql) ; l'écran ne fait que montrer les boutons utiles à chacun.
// ══════════════════════════════════════════════════════

let casActifs = false;                 // la table répond : sinon l'onglet et les sections restent cachés
let casValides = [];                   // tous les cas validés (quelques dizaines), chargés au démarrage
let moi = { id: null, admin: false, validateur: false };
let compteursCas = { aValider: 0, aPreciser: 0 };
let messageCas = null;                 // { texte, genre } affiché une fois, après une action
let filtreCas = { sanction: '', regle: '', archives: false };
let formRegles = [];                   // règles choisies dans le formulaire

// ── Démarrage ────────────────────────────────────────
async function initCas(user) {
  const role = (user.user_metadata && user.user_metadata.role) || 'floor';
  moi.id = user.id; moi.admin = role === 'admin'; moi.validateur = moi.admin;
  if (!moi.admin) {
    try {
      const roles = await SB.getRoles();
      const r = roles.find(function (x) { return x.slug === role; });
      moi.validateur = !!(r && (r.panels || []).indexOf('tda-validation') >= 0);
    } catch (e) { moi.validateur = false; }
  }
  try { casValides = await SB.listTdaCas(['valide']); casActifs = true; } catch (e) { casActifs = false; casValides = []; }
  $('td-tab-cas').hidden = !casActifs;
  if (casActifs) await majCompteursCas();
}

async function majCompteursCas() {
  try {
    compteursCas.aValider = moi.validateur ? await SB.countTdaCas('propose') : 0;
    compteursCas.aPreciser = await SB.countTdaCas('a_preciser', true);
  } catch (e) { /* les compteurs sont un confort : pas d'erreur affichée */ }
  const n = compteursCas.aValider + compteursCas.aPreciser;
  $('td-nb-cas').textContent = n;
  $('td-nb-cas').hidden = !n;
}

// Les cas validés rejoignent la recherche
function reindexerCas() {
  indexRecherche = TDA_RECHERCHE.creerIndex(D.blocs.concat(TDA_CAS.enBlocs(casValides)));
}

// ── Petits morceaux ──────────────────────────────────
function libelleBloc(id) {
  const b = parId[id];
  return b ? b.numero.replace('RP-', 'RP ') : id;
}

function puces(c) {
  return (c.regles || []).map(function (id) { return '<span class="td-pill" title="' + esc(parId[id] ? parId[id].titre : '') + '">' + esc(libelleBloc(id)) + '</span>'; }).join('');
}

function badgeStatut(s) {
  const i = TDA_CAS.statut(s);
  return '<span class="td-st td-st-' + i.classe + '">' + esc(i.libelle) + '</span>';
}

function blocMessage() {
  if (!messageCas) return '';
  const m = messageCas; messageCas = null;
  return '<p class="te-msg ' + (m.genre || 'ok') + ' td-flash-msg" role="status">' + esc(m.texte) + '</p>';
}

function barreCas(vue) {
  const lien = function (id, hash, texte, n) {
    return '<a class="seg-btn' + (vue === id ? ' active' : '') + '" href="#jurisprudence' + hash + '"' + (vue === id ? ' aria-current="page"' : '') + '>' + texte + (n ? ' <span class="seg-n">' + n + '</span>' : '') + '</a>';
  };
  return '<div class="td-cas-barre"><div class="seg sm">' +
    lien('valides', '', 'Cas validés', 0) + lien('mes', '/mes', 'Mes propositions', compteursCas.aPreciser) +
    (moi.validateur ? lien('a-valider', '/a-valider', 'À valider', compteursCas.aValider) : '') +
    '</div><a class="btn btn-gold" href="#nouveau">Proposer un cas</a></div>';
}

function carteCas(c, options) {
  const o = options || {};
  const meta = [];
  if (o.auteur) meta.push('Proposé par ' + esc(c.auteur_nom || '') + ' le ' + TDA_CAS.dateFr(c.soumis_le));
  else if (c.statut === 'valide' && c.valide_le) meta.push('Validé le ' + TDA_CAS.dateFr(c.valide_le) + (c.traite_par_nom ? ' par ' + esc(c.traite_par_nom) : ''));
  if (c.date_cas) meta.push('Cas du ' + TDA_CAS.dateFr(c.date_cas));
  return '<a class="td-cas" href="#cas/' + esc(c.id) + '">' +
    '<span class="td-cas-t">' + esc(c.titre) + (o.statut ? ' ' + badgeStatut(c.statut) : '') + '</span>' +
    '<span class="td-cas-m">' + puces(c) + '<span class="td-sanc">' + esc(TDA_CAS.libelleSanction(c.sanction_type)) + '</span></span>' +
    '<span class="td-cas-x">' + esc(c.faits) + '</span>' +
    (o.commentaire && c.commentaire && (c.statut === 'a_preciser' || c.statut === 'refuse') ? '<span class="td-cas-c">' + esc(c.traite_par_nom || 'Validateur') + ' : ' + esc(c.commentaire) + '</span>' : '') +
    (meta.length ? '<span class="td-cas-p">' + meta.join(' · ') + '</span>' : '') + '</a>';
}

// ── Entrée du routage ────────────────────────────────
function afficherJurisprudence(h) {
  marquerOnglet('jurisprudence');
  $('td-wrap').className = 'td-wrap vue-jurisprudence';
  $('td-side').hidden = true;
  if (document.activeElement !== $('td-q')) $('td-q').value = '';
  document.title = 'Jurisprudence - Règlement TDA - Barrière Casino Bordeaux';
  window.scrollTo(0, 0);
  if (h.id === 'cas') return afficherCasVue(h.sous);
  if (h.id === 'nouveau') return afficherFormulaire(null, h.sous);
  if (h.id === 'modifier') return afficherFormulaire(h.sous, null);
  return afficherListeCas(h.sous);
}

// ── Listes ───────────────────────────────────────────
async function afficherListeCas(sous) {
  const vue = sous === 'mes' ? 'mes' : (sous === 'a-valider' && moi.validateur) ? 'a-valider' : 'valides';
  const entete = barreCas(vue) + blocMessage();
  $('td-main').innerHTML = '<div class="td-cas-page">' + entete + '<p class="td-etat" role="status">Chargement...</p></div>';
  let corps = '';
  try {
    if (vue === 'valides') {
      if (moi.validateur && filtreCas.archives) {
        const archives = await SB.listTdaCas(['archive']);
        corps = formulaireFiltres() + '<div id="td-cas-liste">' + listeFiltree(archives, true) + '</div>';
      } else corps = formulaireFiltres() + '<div id="td-cas-liste">' + listeFiltree(casValides, false) + '</div>';
    } else if (vue === 'mes') {
      const mes = await SB.listMesTdaCas();
      corps = mes.length ? mes.map(function (c) { return carteCas(c, { statut: true, commentaire: true }); }).join('') : '<p class="td-etat">Vous n\'avez encore proposé aucun cas.</p>';
    } else {
      const liste = await SB.listTdaCas(['propose', 'a_preciser']);
      const attente = liste.filter(function (c) { return c.statut === 'propose'; }), renvoyes = liste.filter(function (c) { return c.statut === 'a_preciser'; });
      corps = (attente.length ? attente.map(function (c) { return carteCas(c, { auteur: true }); }).join('') : '<p class="td-etat">Aucun cas à valider.</p>') +
        (renvoyes.length ? '<h2 class="td-sec">Renvoyés à leur auteur</h2>' + renvoyes.map(function (c) { return carteCas(c, { auteur: true, statut: true, commentaire: true }); }).join('') : '');
    }
  } catch (e) {
    corps = '<p class="te-msg err" role="status">Lecture impossible : ' + esc(e.message || e) + '</p>';
  }
  $('td-main').innerHTML = '<div class="td-cas-page">' + entete + corps + '</div>';
  branchementFiltres();
  majCompteursCas();
}

function formulaireFiltres() {
  const opt = TDA_CAS.SANCTIONS.map(function (s) { return '<option value="' + s[0] + '"' + (filtreCas.sanction === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('');
  return '<div class="td-cas-filtres"><select id="fc-sanction" aria-label="Sanction"><option value="">Toutes les sanctions</option>' + opt + '</select>' +
    '<input type="text" id="fc-regle" placeholder="Règle (45, RP-5)" aria-label="Règle" value="' + esc(filtreCas.regle) + '" autocomplete="off" />' +
    (moi.validateur ? '<label class="td-coche"><input type="checkbox" id="fc-archives"' + (filtreCas.archives ? ' checked' : '') + ' /> Archivés</label>' : '') + '</div>';
}

function listeFiltree(cas, archives) {
  let liste = cas.slice();
  if (filtreCas.sanction) liste = liste.filter(function (c) { return c.sanction_type === filtreCas.sanction; });
  const n = TDA_RECHERCHE.numero(filtreCas.regle);
  if (n) liste = liste.filter(function (c) { return (c.regles || []).indexOf(n.id) >= 0; });
  if (!liste.length) return '<p class="td-etat">' + (cas.length ? 'Aucun cas ne correspond.' : (archives ? 'Aucun cas archivé.' : 'Aucun cas validé pour le moment.')) + '</p>';
  return liste.map(function (c) { return carteCas(c, { statut: archives }); }).join('');
}

function branchementFiltres() {
  const rafraichir = function () {
    filtreCas.sanction = $('fc-sanction').value; filtreCas.regle = $('fc-regle').value.trim();
    const liste = $('td-cas-liste');
    if (liste && !filtreCas.archives) liste.innerHTML = listeFiltree(casValides, false);
  };
  if ($('fc-sanction')) {
    $('fc-sanction').addEventListener('change', function () { rafraichir(); if (filtreCas.archives) afficherListeCas(''); });
    $('fc-regle').addEventListener('input', function () { rafraichir(); if (filtreCas.archives) afficherListeCas(''); });
  }
  if ($('fc-archives')) $('fc-archives').addEventListener('change', function () { filtreCas.archives = $('fc-archives').checked; afficherListeCas(''); });
}

// ── Section sous une règle ou une procédure ──────────
function casPourBloc(b) {
  if (!casActifs || (b.kind !== 'regle' && b.kind !== 'rp')) return '';
  const liste = casValides.filter(function (c) { return (c.regles || []).indexOf(b.id) >= 0; });
  return '<section class="td-jur" id="td-jurisprudence" aria-label="Jurisprudence">' +
    (liste.length ? '<h3 class="td-h3">Jurisprudence</h3>' + liste.map(function (c) {
      return '<a class="td-cas td-cas-mini" href="#cas/' + esc(c.id) + '"><span class="td-cas-t">' + esc(c.titre) + '</span><span class="td-sanc">' + esc(TDA_CAS.libelleSanction(c.sanction_type)) + '</span></a>';
    }).join('') : '') +
    '<a class="btn btn-ghost btn-sm" href="#nouveau/' + esc(b.id) + '">Proposer un cas sur ' + (b.kind === 'rp' ? 'cette procédure' : 'cette règle') + '</a></section>';
}

// ── Un cas ───────────────────────────────────────────
async function afficherCasVue(id) {
  $('td-main').innerHTML = '<p class="td-etat" role="status">Chargement...</p>';
  let c = null;
  try { c = await SB.getTdaCas(id); } catch (e) { c = null; }
  if (!c) { $('td-main').innerHTML = '<div class="td-cas-page"><a class="td-back-l" href="#jurisprudence">&lsaquo; Jurisprudence</a><p class="td-etat">Ce cas n\'existe pas ou n\'est plus accessible.</p></div>'; return; }
  const auteur = c.auteur_id === moi.id;
  const retour = c.statut === 'valide' ? '' : auteur && !moi.validateur ? '/mes' : moi.validateur && (c.statut === 'propose' || c.statut === 'a_preciser') ? '/a-valider' : '/mes';
  const active = D && D.edition && D.edition.id;
  const autreEdition = c.edition_id && active && c.edition_id !== active;

  const regles = (c.regles || []).map(function (rid) {
    const b = parId[rid];
    return b ? '<a class="td-regle-l" href="#' + esc(rid) + '"><span class="td-num">' + esc(b.numero.replace('RP-', 'RP ')) + '</span><span>' + esc(b.titre) + '</span></a>'
             : '<span class="td-regle-l"><span class="td-num">' + esc(rid) + '</span><span>Introuvable dans l\'édition active</span></span>';
  }).join('');

  const meta = [];
  meta.push('Proposé par ' + esc(c.auteur_nom || '') + ' le ' + TDA_CAS.dateFr(c.soumis_le));
  if (c.statut === 'valide' && c.valide_le) meta.push('Validé par ' + esc(c.traite_par_nom || '') + ' le ' + TDA_CAS.dateFr(c.valide_le));
  if (c.date_cas) meta.push('Cas du ' + TDA_CAS.dateFr(c.date_cas));
  if (c.variante) meta.push(esc(c.variante));
  if (c.edition_id) meta.push('Règlement ' + esc(TDA_CAS.libelleEdition(c.edition_id)));

  let html = '<div class="td-cas-page"><article class="td-art td-casv"><a class="td-back-l" href="#jurisprudence' + retour + '">&lsaquo; Jurisprudence</a>' +
    '<div class="td-kicker">Cas ' + (c.statut === 'valide' ? '' : badgeStatut(c.statut)) + '</div>' +
    '<h2 class="td-titre">' + esc(c.titre) + '</h2>' + blocMessage() +
    (c.statut === 'a_preciser' || c.statut === 'refuse' ? '<div class="td-note"><span class="td-mq" aria-hidden="true">▪</span><span><strong>' + esc(c.traite_par_nom || 'Validateur') + '</strong> : ' + esc(c.commentaire || '') + '</span></div>' : '') +
    (c.statut === 'archive' ? '<div class="td-note"><span class="td-mq" aria-hidden="true">▪</span><span>Archivé : ' + esc(c.archive_motif || '') + '</span></div>' : '') +
    '<h3 class="td-h3">Faits</h3><p class="td-p td-multi">' + esc(c.faits) + '</p>' +
    '<h3 class="td-h3">Règles applicables</h3><div class="td-regles-l">' + regles + '</div>' +
    (autreEdition ? '<p class="td-p td-attention">Ce cas a été établi sous le règlement ' + esc(TDA_CAS.libelleEdition(c.edition_id)) + ' : vérifiez que les règles citées correspondent toujours.</p>' : '') +
    '<h3 class="td-h3">Décision</h3><p class="td-p td-multi">' + esc(c.decision) + '</p>' +
    '<h3 class="td-h3">Sanction</h3><p class="td-p"><span class="td-sanc">' + esc(TDA_CAS.libelleSanction(c.sanction_type)) + '</span>' + (c.sanction_precision ? ' ' + esc(c.sanction_precision) : '') + '</p>' +
    '<p class="td-cas-meta">' + meta.join(' · ') + '</p>' + actionsCas(c, auteur) + '</article></div>';
  $('td-main').innerHTML = html;
  if (surligner && surligner.length) surlignerDom($('td-main').querySelector('.td-art'), surligner);
  surligner = null;
  branchementActions(c);
}

function actionsCas(c, auteur) {
  const modifier = '<a class="btn btn-ghost btn-sm" href="#modifier/' + esc(c.id) + '">Modifier</a>';
  const confirm = function (act, texte, classe) { return '<button type="button" class="btn ' + classe + ' btn-sm" data-act="' + act + '">' + texte + '</button>'; };
  let h = '';
  if (moi.validateur && (c.statut === 'propose' || c.statut === 'a_preciser')) {
    h += '<div class="td-trait"><label class="fl" for="ac-commentaire">Commentaire</label><textarea id="ac-commentaire" rows="3" maxlength="1000">' + '' + '</textarea><div id="ac-erreur"></div>' +
      '<div class="td-actions">' + confirm('valide', 'Valider', 'btn-gold') + confirm('a_preciser', 'Renvoyer pour précisions', 'btn-ghost') + confirm('refuse', 'Refuser', 'btn-red') + modifier + '</div></div>';
  } else if (moi.validateur && c.statut === 'valide') {
    h += '<div class="td-trait"><div class="td-actions">' + modifier + '<button type="button" class="btn btn-ghost btn-sm" data-act="ouvrir-archive">Archiver</button></div>' +
      '<div id="ac-archive" hidden><label class="fl" for="ac-motif">Motif de l\'archivage</label><textarea id="ac-motif" rows="2" maxlength="500"></textarea><div id="ac-erreur"></div>' +
      '<div class="td-actions">' + confirm('archive', 'Archiver ce cas', 'btn-red') + '</div></div></div>';
  } else if (moi.validateur && c.statut === 'archive') {
    h += '<div class="td-trait"><div class="td-actions">' + confirm('retablir', 'Rétablir ce cas', 'btn-gold') + '</div></div>';
  } else if (auteur && (c.statut === 'propose' || c.statut === 'a_preciser')) {
    h += '<div class="td-trait"><div class="td-actions">' + modifier + '<button type="button" class="btn btn-red btn-sm" data-act="ouvrir-retrait">Retirer ce cas</button></div>' +
      '<div id="ac-retrait" hidden><p class="td-p">Retirer définitivement cette proposition ?</p><div class="td-actions">' + confirm('retirer', 'Oui, retirer', 'btn-red') + '</div></div></div>';
  }
  if (moi.admin && c.statut !== 'propose' && c.statut !== 'a_preciser') {
    h += '<div class="td-trait td-trait-admin"><button type="button" class="btn btn-red btn-sm" data-act="ouvrir-suppression">Supprimer définitivement</button>' +
      '<div id="ac-suppression" hidden><p class="td-p">Supprimer ce cas ? Il disparaîtra de la jurisprudence.</p><div class="td-actions">' + confirm('supprimer', 'Oui, supprimer', 'btn-red') + '</div></div></div>';
  }
  return h;
}

function branchementActions(c) {
  document.querySelectorAll('#td-main [data-act]').forEach(function (b) {
    b.addEventListener('click', function () { actionCas(b.dataset.act, c, b); });
  });
}

async function actionCas(act, c, bouton) {
  const ouvrir = { 'ouvrir-archive': 'ac-archive', 'ouvrir-retrait': 'ac-retrait', 'ouvrir-suppression': 'ac-suppression' };
  if (ouvrir[act]) { $(ouvrir[act]).hidden = !$(ouvrir[act]).hidden; return; }
  const erreur = function (t) { const e = $('ac-erreur'); if (e) e.innerHTML = t ? '<p class="te-msg err" role="status">' + esc(t) + '</p>' : ''; };
  bouton.disabled = true;
  try {
    if (act === 'valide' || act === 'a_preciser' || act === 'refuse') {
      const texte = $('ac-commentaire').value.trim();
      const pb = TDA_CAS.verifierDecision(act, texte);
      if (pb) { erreur(pb); bouton.disabled = false; return; }
      await SB.updateTdaCas(c.id, { statut: act, commentaire: texte || null });
      messageCas = { texte: act === 'valide' ? 'Cas validé : il fait désormais jurisprudence.' : act === 'a_preciser' ? 'Cas renvoyé à son auteur pour précisions.' : 'Cas refusé.', genre: 'ok' };
      await rechargerCasValides();
      location.hash = act === 'valide' ? '#cas/' + c.id : '#jurisprudence/a-valider';
      if (act === 'valide') route();
      return;
    }
    if (act === 'archive') {
      const motif = $('ac-motif').value.trim();
      const pb = TDA_CAS.verifierDecision('archive', motif);
      if (pb) { erreur(pb); bouton.disabled = false; return; }
      await SB.updateTdaCas(c.id, { statut: 'archive', archive_motif: motif });
      messageCas = { texte: 'Cas archivé : il n\'apparaît plus dans la jurisprudence.', genre: 'ok' };
      await rechargerCasValides(); route(); return;
    }
    if (act === 'retablir') {
      await SB.updateTdaCas(c.id, { statut: 'valide' });
      messageCas = { texte: 'Cas rétabli.', genre: 'ok' };
      await rechargerCasValides(); route(); return;
    }
    if (act === 'retirer' || act === 'supprimer') {
      await SB.deleteTdaCas(c.id);
      messageCas = { texte: act === 'retirer' ? 'Proposition retirée.' : 'Cas supprimé.', genre: 'ok' };
      await rechargerCasValides();
      location.hash = act === 'retirer' && !moi.validateur ? '#jurisprudence/mes' : '#jurisprudence'; return;
    }
  } catch (e) {
    bouton.disabled = false;
    erreur('Action impossible : ' + (e.message || e));
  }
}

async function rechargerCasValides() {
  try { casValides = await SB.listTdaCas(['valide']); reindexerCas(); } catch (e) { /* on garde la liste en mémoire */ }
  await majCompteursCas();
}

// ── Formulaire : proposer ou modifier un cas ─────────
async function afficherFormulaire(idCas, regleLiee) {
  let c = null;
  if (idCas) {
    $('td-main').innerHTML = '<p class="td-etat" role="status">Chargement...</p>';
    try { c = await SB.getTdaCas(idCas); } catch (e) { c = null; }
    const droit = c && (moi.validateur || (c.auteur_id === moi.id && (c.statut === 'propose' || c.statut === 'a_preciser')));
    if (!droit) { $('td-main').innerHTML = '<div class="td-cas-page"><a class="td-back-l" href="#jurisprudence">&lsaquo; Jurisprudence</a><p class="td-etat">Ce cas ne peut pas être modifié.</p></div>'; return; }
  }
  formRegles = c ? (c.regles || []).slice() : (regleLiee && parId[regleLiee] ? [regleLiee] : []);
  const v = c || { titre: '', faits: '', decision: '', sanction_type: '', sanction_precision: '', date_cas: '', variante: '' };
  const sanctions = '<option value="">Choisir...</option>' + TDA_CAS.SANCTIONS.map(function (s) { return '<option value="' + s[0] + '"' + (v.sanction_type === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('');
  const variantes = '<option value="">Variante (facultatif)</option>' + TDA_CAS.VARIANTES.map(function (x) { return '<option' + (v.variante === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  const champ = function (id, libelle, corps) { return '<div class="fg"><label class="fl" for="' + id + '">' + libelle + '</label>' + corps + '<div class="td-err" id="' + id + '-e"></div></div>'; };
  $('td-main').innerHTML = '<div class="td-cas-page"><article class="td-art td-form">' +
    '<a class="td-back-l" href="' + (c ? '#cas/' + esc(c.id) : '#jurisprudence') + '">&lsaquo; ' + (c ? 'Retour au cas' : 'Jurisprudence') + '</a>' +
    '<h2 class="td-titre">' + (c ? 'Modifier le cas' : 'Proposer un cas') + '</h2>' +
    (c && c.statut === 'a_preciser' ? '<div class="td-note"><span class="td-mq" aria-hidden="true">▪</span><span><strong>' + esc(c.traite_par_nom || 'Validateur') + '</strong> : ' + esc(c.commentaire || '') + '</span></div>' : '') +
    champ('fc-titre', 'Titre', '<input type="text" id="fc-titre" maxlength="140" value="' + esc(v.titre) + '" autocomplete="off" />') +
    champ('fc-faits', 'Faits', '<textarea id="fc-faits" rows="6" maxlength="4000" placeholder="Décrivez la situation sans nom de joueur : joueur A, joueur B...">' + esc(v.faits) + '</textarea>') +
    champ('fc-regles', 'Règles applicables', '<div id="fc-puces" class="td-puces"></div><input type="text" id="fc-regle-saisie" placeholder="Ajouter : numéro ou mot (45, RP-5, relance)" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="fc-sugg" /><ul id="fc-sugg" class="td-sugg" role="listbox" hidden></ul>') +
    champ('fc-decision', 'Décision', '<textarea id="fc-decision" rows="5" maxlength="4000">' + esc(v.decision) + '</textarea>') +
    '<div class="td-form-ligne">' +
      champ('fc-sanction', 'Sanction', '<select id="fc-sanction">' + sanctions + '</select>') +
      champ('fc-precision', 'Précision de la sanction', '<input type="text" id="fc-precision" maxlength="500" value="' + esc(v.sanction_precision || '') + '" autocomplete="off" />') +
    '</div><div class="td-form-ligne">' +
      champ('fc-date', 'Date du cas (facultatif)', '<input type="date" id="fc-date" value="' + esc(v.date_cas || '') + '" />') +
      champ('fc-variante', 'Variante', '<select id="fc-variante">' + variantes + '</select>') +
    '</div>' +
    (!c && moi.validateur ? '<label class="td-coche"><input type="checkbox" id="fc-direct" /> Enregistrer directement comme cas validé</label>' : '') +
    '<div id="fc-erreur"></div><div class="td-actions"><button type="button" class="btn btn-gold" id="fc-envoyer">' + (c ? 'Enregistrer' : 'Soumettre') + '</button>' +
    '<a class="btn btn-ghost" href="' + (c ? '#cas/' + esc(c.id) : '#jurisprudence') + '">Annuler</a></div></article></div>';
  majPuces();
  branchementFormulaire(c);
}

function majPuces() {
  $('fc-puces').innerHTML = formRegles.map(function (id, i) {
    const b = parId[id];
    return '<span class="td-puce"><span>' + esc(b ? b.numero.replace('RP-', 'RP ') + ' ' + b.titre : id) + '</span><button type="button" data-retire="' + i + '" aria-label="Retirer">&times;</button></span>';
  }).join('');
  $('fc-puces').querySelectorAll('[data-retire]').forEach(function (b) {
    b.addEventListener('click', function () { formRegles.splice(parseInt(b.dataset.retire, 10), 1); majPuces(); });
  });
}

function branchementFormulaire(c) {
  const saisie = $('fc-regle-saisie'), liste = $('fc-sugg');
  const montrer = function () {
    const s = TDA_CAS.suggestions(D.blocs, saisie.value, formRegles, 8);
    liste.innerHTML = s.map(function (b, i) { return '<li role="option" data-id="' + esc(b.id) + '" id="fc-opt-' + i + '"><span class="td-num">' + esc(b.numero.replace('RP-', 'RP ')) + '</span> ' + esc(b.titre) + '</li>'; }).join('');
    liste.hidden = !s.length || (!saisie.value && document.activeElement !== saisie);
    saisie.setAttribute('aria-expanded', String(!liste.hidden));
  };
  const ajouter = function (id) {
    if (id && formRegles.indexOf(id) < 0 && formRegles.length < 12) formRegles.push(id);
    saisie.value = ''; liste.hidden = true; majPuces(); saisie.focus();
  };
  saisie.addEventListener('input', montrer);
  saisie.addEventListener('focus', montrer);
  saisie.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); const p = liste.querySelector('li'); if (p) ajouter(p.dataset.id); }
    else if (e.key === 'Escape') { liste.hidden = true; }
  });
  liste.addEventListener('mousedown', function (e) { const li = e.target.closest('li'); if (li) { e.preventDefault(); ajouter(li.dataset.id); } });
  saisie.addEventListener('blur', function () { setTimeout(function () { liste.hidden = true; }, 120); });
  $('fc-envoyer').addEventListener('click', function () { envoyerFormulaire(c); });
}

async function envoyerFormulaire(c) {
  const val = function (id) { return $(id).value.trim(); };
  const cas = {
    titre: val('fc-titre'), faits: val('fc-faits'), regles: formRegles.slice(), decision: val('fc-decision'),
    sanction_type: $('fc-sanction').value, sanction_precision: val('fc-precision') || null, date_cas: $('fc-date').value || null, variante: $('fc-variante').value || null,
  };
  const r = TDA_CAS.verifier(cas);
  ['titre', 'faits', 'regles', 'decision', 'sanction', 'precision', 'date', 'variante'].forEach(function (k) { $('fc-' + k + '-e').textContent = ''; });
  const cle = { titre: 'titre', faits: 'faits', regles: 'regles', decision: 'decision', sanction_type: 'sanction', sanction_precision: 'precision', date_cas: 'date', variante: 'variante' };
  Object.keys(r.erreurs).forEach(function (k) { $('fc-' + cle[k] + '-e').textContent = r.erreurs[k]; });
  if (!r.ok) { const premier = document.querySelector('.td-err:not(:empty)'); if (premier) premier.scrollIntoView({ block: 'center' }); return; }
  const b = $('fc-envoyer');
  b.disabled = true;
  try {
    let id;
    if (c) { await SB.updateTdaCas(c.id, cas); id = c.id; messageCas = { texte: c.statut === 'a_preciser' && c.auteur_id === moi.id ? 'Cas corrigé et soumis de nouveau.' : 'Cas enregistré.', genre: 'ok' }; }
    else {
      const direct = $('fc-direct') && $('fc-direct').checked;
      id = await SB.createTdaCas(Object.assign(cas, direct ? { statut: 'valide' } : {}));
      messageCas = { texte: direct ? 'Cas enregistré et validé.' : 'Cas soumis : un MCD va le traiter.', genre: 'ok' };
    }
    await rechargerCasValides();
    location.hash = '#cas/' + id;
  } catch (e) {
    b.disabled = false;
    $('fc-erreur').innerHTML = '<p class="te-msg err" role="status">Enregistrement impossible : ' + esc(e.message || e) + '</p>';
  }
}
