// ══════════════════════════════════════════════════════
//  RÈGLEMENT TDA - consultation
//  Charge l'édition active (SB.getTdaActive), puis affiche cinq vues : Règles, Procédures recommandées, Glossaire, Favoris
//  et les résultats d'une recherche. Tout est dans l'adresse (hash) pour pouvoir partager et revenir en arrière :
//    #r45  une règle   ·  #r47/B  un point de la règle   ·  #r45/exemples  les exemples de la règle
//    #rp5  une procédure   ·  #g_8  un terme du glossaire   ·  #regles / #procedures / #glossaire / #favoris  une vue
//    #q=relance%20minimum  une recherche (« / » met le curseur dans le champ)
//  Téléphone et tablette : le sommaire occupe l'écran, une règle ouverte le remplace (bouton « Sommaire » pour revenir).
//  Ordinateur : sommaire fixe à gauche, règle à droite. La mise en forme du contenu est dans tda_rendu.js, la recherche
//  dans tda_recherche.js. Les favoris sont propres à chaque utilisateur (table tda_favoris) ; si cette table n'existe pas
//  encore, la page fonctionne sans favoris.
// ══════════════════════════════════════════════════════

const $ = function (id) { return document.getElementById(id); };
const esc = TDA_RENDU.esc;

const VUES = ['regles', 'procedures', 'glossaire', 'favoris'];
let D = null;                       // { edition, blocs }
let parId = {}, regles = [], procedures = [], exemplesDe = {}, glossaire = [], ctxBase = null, sectionsParId = {};
let indexRecherche = null;
let favoris = [], favorisActifs = false;          // identifiants de blocs ; actifs seulement si la table des favoris répond
let surligner = null;                              // mots à surligner à l'ouverture d'un résultat de recherche (une seule fois)
let delaiRecherche = null;

// ── Chargement ───────────────────────────────────────
async function initTda() {
  try {
    D = await SB.getTdaActive();
  } catch (err) {
    etat('Le règlement n\'a pas pu être chargé. Vérifiez la connexion puis rechargez la page.');
    return;
  }
  if (!D) { etat('Aucune édition du règlement n\'est disponible pour le moment.'); return; }
  indexer();
  try { favoris = await SB.getTdaFavoris(); favorisActifs = true; } catch (e) { favoris = []; favorisActifs = false; }
  $('td-tab-fav').hidden = !favorisActifs;
  majCompteurFavoris();
  afficherEntete();
  $('td-tabs').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-vue]');
    if (b) location.hash = '#' + b.dataset.vue;
  });
  $('td-q').addEventListener('input', saisieRecherche);
  $('td-q').addEventListener('keydown', toucheRecherche);
  document.addEventListener('click', clicDocument);
  document.addEventListener('keydown', toucheDocument);
  window.addEventListener('hashchange', route);
  route();
}

function etat(texte) {
  $('td-side').innerHTML = '';
  $('td-wrap').className = 'td-wrap';
  $('td-main').innerHTML = '<p class="td-etat" role="status">' + esc(texte) + '</p>';
}

function indexer() {
  const blocs = D.blocs.slice().sort(function (a, b) { return a.ordre - b.ordre; });
  blocs.forEach(function (b) { parId[b.id] = b; });
  regles = blocs.filter(function (b) { return b.kind === 'regle'; });
  procedures = blocs.filter(function (b) { return b.kind === 'rp'; });
  glossaire = blocs.filter(function (b) { return b.kind === 'glossaire'; });
  blocs.filter(function (b) { return b.kind === 'exemple'; }).forEach(function (x) {
    (exemplesDe[x.data.regle] = exemplesDe[x.data.regle] || []).push(x);
  });
  (D.edition.sections || []).forEach(function (s) { sectionsParId[s.id] = s; });
  ctxBase = { parId: parId, glossaire: TDA_RENDU.creerGlossaire(glossaire), exemplesVers: null };
  indexRecherche = TDA_RECHERCHE.creerIndex(blocs);
}

function fmtDate(iso) {
  const p = String(iso || '').slice(0, 10).split('-');
  const M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return p.length === 3 ? parseInt(p[2], 10) + ' ' + M[parseInt(p[1], 10) - 1] + ' ' + p[0] : '';
}

function afficherEntete() {
  const e = D.edition;
  // Mention obligatoire du TDA, sur chaque page, avec un lien actif vers son site
  const mention = esc(e.mention).replace(/https?:\/\/[^\s,]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>'; });
  $('td-mention').innerHTML = '<p>' + mention + '</p>' +
    '<p>' + esc(e.libelle) + (e.date_publication ? ' du ' + fmtDate(e.date_publication) : '') + (e.traduction ? ', traduction française de ' + esc(e.traduction) : '') + '.</p>';
}

// ── Routage ──────────────────────────────────────────
function lireHash() {
  const brut = location.hash.replace(/^#/, '');
  if (/^q=/.test(brut)) { let q = ''; try { q = decodeURIComponent(brut.slice(2)); } catch (e) { q = brut.slice(2); } return { recherche: q, id: '', sous: '' }; }
  let h = brut; try { h = decodeURIComponent(brut); } catch (e) { /* adresse mal formée : on garde le texte brut */ }
  const i = h.indexOf('/');
  return { recherche: null, id: i < 0 ? h : h.slice(0, i), sous: i < 0 ? '' : h.slice(i + 1) };
}

function route() {
  const h = lireHash();
  fermerPop();
  if (h.recherche !== null) { afficherRecherche(h.recherche); return; }
  let vue = 'regles', courant = null, sous = h.sous, exemple = null;
  if (VUES.indexOf(h.id) >= 0) vue = h.id;
  else if (parId[h.id]) {
    const b = parId[h.id];
    if (b.kind === 'regle') { vue = 'regles'; courant = b; }
    else if (b.kind === 'rp') { vue = 'procedures'; courant = b; }
    else if (b.kind === 'glossaire') { vue = 'glossaire'; courant = b; }
    else if (b.kind === 'exemple') { vue = 'regles'; courant = parId['r' + b.data.regle.replace(/\D.*/, '')] || null; exemple = b.id; sous = 'exemples'; }
    else if (b.kind === 'rp_intro') vue = 'procedures';
  }
  if (vue === 'favoris' && !favorisActifs) vue = 'regles';
  if (document.activeElement !== $('td-q')) $('td-q').value = '';
  afficherVue(vue, courant, sous, exemple);
}

function afficherVue(vue, courant, sous, exemple) {
  document.querySelectorAll('#td-tabs .seg-btn').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.vue === vue)); });
  $('td-wrap').className = 'td-wrap vue-' + vue + (courant && vue !== 'glossaire' ? ' lecture' : '');
  $('td-side').hidden = vue === 'glossaire';
  if (vue !== 'glossaire') afficherSommaire(vue, courant);
  if (vue === 'glossaire') afficherGlossaire(courant);
  else if (courant) afficherBloc(vue, courant, sous, exemple);
  else afficherAccueil(vue);
  document.title = (courant ? (courant.numero ? courant.numero + ' - ' : '') + courant.titre + ' - ' : '') + 'Règlement TDA - Barrière Casino Bordeaux';
}

// ── Sommaire ─────────────────────────────────────────
function lienSommaire(b, courant) {
  const num = b.kind === 'glossaire' ? 'Gl.' : b.numero.replace('RP-', 'RP ');
  return '<a class="td-item' + (courant && courant.id === b.id ? ' on' : '') + '" href="#' + esc(b.id) + '"' + (courant && courant.id === b.id ? ' aria-current="page"' : '') + '>' +
    '<span class="td-num">' + esc(num) + '</span><span class="td-tit">' + esc(b.titre) + '</span></a>';
}

function afficherSommaire(vue, courant) {
  let html = '';
  if (vue === 'regles') {
    let section = null;
    regles.forEach(function (b) {
      if (b.section !== section) {
        section = b.section;
        html += '<h2 class="td-sec">' + esc((sectionsParId[section] || {}).titre || '') + '</h2>';
      }
      html += lienSommaire(b, courant);
    });
  } else if (vue === 'favoris') {
    const ordre = regles.concat(procedures, glossaire).filter(function (b) { return favoris.indexOf(b.id) >= 0; });
    html += ordre.map(function (b) { return lienSommaire(b, courant); }).join('');
  } else {
    html += '<h2 class="td-sec">Procédures recommandées</h2>' + procedures.map(function (b) { return lienSommaire(b, courant); }).join('');
  }
  const side = $('td-side');
  side.innerHTML = html;
  const on = side.querySelector('.td-item.on');
  if (on && window.matchMedia('(min-width: 900px)').matches) on.scrollIntoView({ block: 'nearest' });
}

// ── Accueil d'une vue (rien d'ouvert) ────────────────
function afficherAccueil(vue) {
  const e = D.edition;
  let html = '<div class="td-accueil"><h2 class="td-titre">' + (vue === 'procedures' ? 'Procédures recommandées' : vue === 'favoris' ? 'Favoris' : esc(e.libelle)) + '</h2>';
  if (vue === 'procedures') {
    const intro = D.blocs.find(function (b) { return b.kind === 'rp_intro'; });
    if (intro) html += TDA_RENDU.elementsHtml(intro.data.elements, Object.assign({}, ctxBase), intro.id);
  } else if (vue === 'favoris') {
    if (!favoris.some(function (id) { return parId[id]; })) html += '<p class="td-p">Aucun favori.</p>';
  } else if (e.introduction) {
    html += '<p class="td-p">' + esc(e.introduction) + '</p>';
  }
  html += '</div>';
  $('td-main').innerHTML = html;
  window.scrollTo(0, 0);
}

// ── Une règle ou une procédure ───────────────────────
function boutonFavori(id) {
  if (!favorisActifs) return '';
  const on = favoris.indexOf(id) >= 0;
  return '<button type="button" class="td-fav" data-fav="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Retirer des favoris' : 'Ajouter aux favoris') + '">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.8l6.1-.7z"/></svg></button>';
}

function afficherBloc(vue, b, sous, exemple) {
  const liste = vue === 'procedures' ? procedures : regles;
  const i = liste.indexOf(b);
  // Les exemples d'une règle sont rattachés à son numéro seul (« 55 »), même s'ils portent un sous-point (« 55-A-1 »)
  const lesExemples = b.kind === 'regle' ? (exemplesDe[b.numero] || []) : [];
  const ctx = Object.assign({}, ctxBase, { exemplesVers: lesExemples.length ? b.id : null });
  const section = (sectionsParId[b.section] || {}).titre || (vue === 'procedures' ? 'Procédures recommandées' : '');
  const libelle = function (x) { return esc(x.numero.replace('RP-', 'RP ') + ' - ' + x.titre); };

  const html = '<article class="td-art">' +
    '<a class="td-back" href="#' + vue + '">&lsaquo; Sommaire</a>' +
    '<div class="td-kicker">' + esc(section) + '</div>' +
    '<div class="td-entete"><h2 class="td-titre"><span class="td-n">' + esc(b.numero.replace('RP-', 'RP ')) + '</span>' + esc(b.titre) + '</h2>' + boutonFavori(b.id) + '</div>' +
    TDA_RENDU.elementsHtml(b.data.elements, ctx, b.id) +
    TDA_RENDU.exemplesHtml(lesExemples, ctx) +
    '<div class="td-pager">' +
      (i > 0 ? '<a class="td-prev" href="#' + esc(liste[i - 1].id) + '"><small>Précédente</small>' + libelle(liste[i - 1]) + '</a>' : '<span></span>') +
      (i < liste.length - 1 ? '<a class="td-next" href="#' + esc(liste[i + 1].id) + '"><small>Suivante</small>' + libelle(liste[i + 1]) + '</a>' : '<span></span>') +
    '</div></article>';
  $('td-main').innerHTML = html;

  // Mots de la recherche d'où l'on vient : surlignés une fois
  let premier = null;
  if (surligner && surligner.length) { premier = surlignerDom($('td-main').querySelector('.td-art'), surligner); }
  surligner = null;

  // Cible demandée : exemples, ou un point de la règle (« B », « A-1 » : on retient la lettre)
  let cible = null;
  if (sous === 'exemples') {
    document.querySelectorAll('#td-main .td-ex').forEach(function (d) { d.open = !exemple || d.id === exemple; });
    cible = (exemple && $(exemple)) || $('td-exemples');
  } else if (sous) {
    cible = $('pt-' + b.id + '-' + sous.split('-')[0]);
  }
  if (cible) {
    cible.scrollIntoView({ block: 'start' });
    cible.classList.remove('flash'); void cible.offsetWidth; cible.classList.add('flash');
  } else if (premier) {
    const dans = premier.closest('details');
    if (dans) dans.open = true;
    premier.scrollIntoView({ block: 'center' });
  } else window.scrollTo(0, 0);
}

// Entoure de <mark> les mots à surligner dans les textes d'un élément ; renvoie le premier surlignage
function surlignerDom(racine, termes) {
  if (!racine) return null;
  const noeuds = [];
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) { return n.parentElement.closest('button, .td-back, .td-pager, mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
  });
  while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
  let premier = null;
  noeuds.forEach(function (n) {
    const p = TDA_RECHERCHE.plages(n.nodeValue, termes);
    if (!p.length) return;
    const frag = document.createDocumentFragment();
    let pos = 0;
    p.forEach(function (r) {
      if (r[0] > pos) frag.appendChild(document.createTextNode(n.nodeValue.slice(pos, r[0])));
      const m = document.createElement('mark');
      m.textContent = n.nodeValue.slice(r[0], r[1]);
      frag.appendChild(m);
      if (!premier) premier = m;
      pos = r[1];
    });
    if (pos < n.nodeValue.length) frag.appendChild(document.createTextNode(n.nodeValue.slice(pos)));
    n.parentNode.replaceChild(frag, n);
  });
  return premier;
}

// ── Glossaire ────────────────────────────────────────
function afficherGlossaire(courant) {
  const groupes = [];
  glossaire.forEach(function (g) {
    let grp = groupes.find(function (x) { return x.nom === g.data.groupe; });
    if (!grp) { grp = { nom: g.data.groupe, termes: [] }; groupes.push(grp); }
    grp.termes.push(g);
  });
  $('td-main').innerHTML = '<div class="td-gloss">' + groupes.map(function (grp) {
    return '<section><h2 class="td-sec">' + esc(grp.nom) + '</h2><dl class="td-dl">' + grp.termes.map(function (g) {
      return '<div class="td-dt-dd" id="' + esc(g.id) + '"><div><dt>' + esc(g.titre) + '</dt><dd>' + esc(g.data.definition) + '</dd></div>' + boutonFavori(g.id) + '</div>';
    }).join('') + '</dl></section>';
  }).join('') + '</div>';
  const cible = courant && $(courant.id);
  if (cible) { cible.scrollIntoView({ block: 'center' }); cible.classList.add('flash'); }
  else window.scrollTo(0, 0);
}

// ── Recherche ────────────────────────────────────────
function saisieRecherche() {
  clearTimeout(delaiRecherche);
  delaiRecherche = setTimeout(function () {
    const q = $('td-q').value.trim();
    const dansRecherche = /^#q=/.test(location.hash);
    if (!q) { if (dansRecherche) { history.replaceState(null, '', '#regles'); route(); } return; }
    const h = '#q=' + encodeURIComponent(q);
    if (dansRecherche) { history.replaceState(null, '', h); route(); }       // on tape : pas une page de plus dans l'historique
    else location.hash = h;
  }, 120);
}

function toucheRecherche(e) {
  if (e.key === 'Escape') {
    $('td-q').value = '';
    $('td-q').blur();
    if (/^#q=/.test(location.hash)) { history.replaceState(null, '', '#regles'); route(); }
  } else if (e.key === 'Enter') {
    const r = TDA_RECHERCHE.chercher(indexRecherche, $('td-q').value);
    const cible = r.saut ? '#' + r.saut.id + (r.saut.sous ? '/' + r.saut.sous : '') : (r.resultats[0] ? '#' + r.resultats[0].id : null);
    if (cible) { e.preventDefault(); surligner = r.termes; location.hash = cible; $('td-q').blur(); }
  }
}

function texteSurligne(texte, plages) {
  let html = '', pos = 0;
  (plages || []).forEach(function (p) { html += esc(texte.slice(pos, p[0])) + '<mark>' + esc(texte.slice(p[0], p[1])) + '</mark>'; pos = p[1]; });
  return html + esc(texte.slice(pos));
}

const GROUPES_RESULTATS = [['regle', 'Règles'], ['rp', 'Procédures recommandées'], ['exemple', 'Exemples d\'illustration'], ['glossaire', 'Glossaire']];

function afficherRecherche(q) {
  document.querySelectorAll('#td-tabs .seg-btn').forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
  $('td-wrap').className = 'td-wrap vue-recherche';
  $('td-side').hidden = true;
  if ($('td-q').value !== q && document.activeElement !== $('td-q')) $('td-q').value = q;
  document.title = 'Recherche - Règlement TDA - Barrière Casino Bordeaux';
  const r = TDA_RECHERCHE.chercher(indexRecherche, q);
  window.__tdaTermes = r.termes;
  let html = '<div class="td-res-liste">';
  if (r.saut) {
    const s = r.saut;
    html += '<a class="td-saut" href="#' + esc(s.id + (s.sous ? '/' + s.sous : '')) + '"><span class="td-num">' + esc(s.numero.replace('RP-', 'RP ')) + '</span><span>' +
      (s.kind === 'rp' ? 'Procédure' : 'Règle') + ' ' + esc(s.numero.replace('RP-', '')) + (s.sous ? ', point ' + esc(s.sous) : '') + ' : ' + esc(s.titre) + '</span></a>';
  }
  const nb = r.resultats.length;
  if (!r.saut && !nb) html += '<p class="td-etat" role="status">Aucun résultat pour « ' + esc(q) + ' ».</p>';
  else if (nb) html += '<p class="td-nb" role="status">' + nb + ' résultat' + (nb > 1 ? 's' : '') + (nb >= 60 ? ' (les 60 premiers)' : '') + '</p>';
  GROUPES_RESULTATS.forEach(function (g) {
    const liste = r.resultats.filter(function (x) { return x.kind === g[0]; });
    if (!liste.length) return;
    html += '<h2 class="td-sec">' + g[1] + '</h2>' + liste.map(function (x) {
      const num = x.kind === 'glossaire' ? 'Gl.' : x.kind === 'exemple' ? 'Ex. ' + x.numero : x.numero.replace('RP-', 'RP ');
      return '<a class="td-res" href="#' + esc(x.id) + '" data-q="1"><span class="td-num">' + esc(num) + '</span><span class="td-res-c">' +
        '<span class="td-res-t">' + texteSurligne(x.titre, x.plagesTitre) + '</span>' +
        (x.extrait ? '<span class="td-res-x">' + (x.extrait.debut ? '… ' : '') + texteSurligne(x.extrait.texte, x.extrait.plages) + (x.extrait.fin ? ' …' : '') + '</span>' : '') +
        '</span></a>';
    }).join('');
  });
  $('td-main').innerHTML = html + '</div>';
  window.scrollTo(0, 0);
}

// ── Favoris ──────────────────────────────────────────
function majCompteurFavoris() {
  $('td-nb-fav').textContent = favoris.filter(function (id) { return parId[id]; }).length;
}

function messageInfo(texte) {
  const el = $('td-info');
  el.textContent = texte;
  clearTimeout(messageInfo.t);
  messageInfo.t = setTimeout(function () { el.textContent = ''; }, 4000);
}

async function basculerFavori(id) {
  const avant = favoris.slice();
  const on = favoris.indexOf(id) < 0;
  favoris = on ? favoris.concat(id) : favoris.filter(function (x) { return x !== id; });
  majBoutonsFavori(id);
  majCompteurFavoris();
  try { await SB.setTdaFavori(id, on); }
  catch (err) {
    favoris = avant;
    majBoutonsFavori(id); majCompteurFavoris();
    messageInfo('Le favori n\'a pas pu être enregistré. Vérifiez la connexion.');
  }
  if (lireHash().id === 'favoris') route();
}

function majBoutonsFavori(id) {
  const on = favoris.indexOf(id) >= 0;
  document.querySelectorAll('.td-fav[data-fav="' + id + '"]').forEach(function (b) {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris');
  });
}

// ── Info-bulles : terme du glossaire, renvoi à vérifier ──
function fermerPop() { $('td-pop').hidden = true; }

function ouvrirPop(cible, html) {
  const pop = $('td-pop');
  pop.innerHTML = html;
  pop.hidden = false;
  const r = cible.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);      // pas la place en dessous : au-dessus
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
}

function clicDocument(e) {
  const fav = e.target.closest('.td-fav');
  if (fav) { basculerFavori(fav.dataset.fav); return; }
  const res = e.target.closest('.td-res, .td-saut');
  if (res) surligner = window.__tdaTermes || null;                              // la recherche d'où l'on vient
  const terme = e.target.closest('.td-terme');
  const verif = e.target.closest('.td-verif');
  if (terme) {
    const g = parId[terme.dataset.g];
    if (g) ouvrirPop(terme, '<div class="td-pop-t">' + esc(g.titre) + '</div><div>' + esc(g.data.definition || '') + '</div><a href="#' + esc(g.id) + '">Voir au glossaire</a>');
    return;
  }
  if (verif) {
    const att = verif.dataset.attendu && parId[verif.dataset.attendu];
    ouvrirPop(verif, '<div class="td-pop-t">Renvoi à vérifier</div><div>' + esc(verif.dataset.note) + '</div>' +
      (att ? '<a href="#' + esc(att.id) + '">Voir la règle ' + esc(att.numero) + ' : ' + esc(att.titre) + '</a>' : ''));
    return;
  }
  if (!e.target.closest('#td-pop') || e.target.closest('#td-pop a')) fermerPop();
}

function toucheDocument(e) {
  if (e.key === 'Escape') fermerPop();
  const champ = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
  if (e.key === '/' && !champ && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); $('td-q').focus(); $('td-q').select(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('td-terme')) { e.preventDefault(); e.target.click(); }
}
