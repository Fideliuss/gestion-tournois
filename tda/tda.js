// ══════════════════════════════════════════════════════
//  RÈGLEMENT TDA - consultation
//  Charge l'édition active (SB.getTdaActive), puis affiche trois vues : Règles, Procédures recommandées, Glossaire.
//  Tout est dans l'adresse (hash) pour pouvoir partager et revenir en arrière :
//    #r45  une règle   ·  #r47/B  un point de la règle   ·  #r45/exemples  les exemples de la règle
//    #rp5  une procédure   ·  #g_8  un terme du glossaire   ·  #regles / #procedures / #glossaire  une vue
//  Téléphone et tablette : le sommaire occupe l'écran, une règle ouverte le remplace (bouton « Sommaire » pour revenir).
//  Ordinateur : sommaire fixe à gauche, règle à droite. La mise en forme du contenu est dans tda_rendu.js.
// ══════════════════════════════════════════════════════

const $ = function (id) { return document.getElementById(id); };
const esc = TDA_RENDU.esc;

const VUES = ['regles', 'procedures', 'glossaire'];
let D = null;                       // { edition, blocs }
let parId = {}, regles = [], procedures = [], exemplesDe = {}, glossaire = [], ctxBase = null, sectionsParId = {};

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
  afficherEntete();
  $('td-tabs').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-vue]');
    if (b) location.hash = '#' + b.dataset.vue;
  });
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
}

function fmtDate(iso) {
  const p = String(iso || '').slice(0, 10).split('-');
  const M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return p.length === 3 ? parseInt(p[2], 10) + ' ' + M[parseInt(p[1], 10) - 1] + ' ' + p[0] : '';
}

function afficherEntete() {
  const e = D.edition;
  $('td-sub').textContent = [e.libelle, e.date_publication ? 'du ' + fmtDate(e.date_publication) : ''].filter(Boolean).join(' ');
  // Mention obligatoire du TDA, sur chaque page, avec un lien actif vers son site
  const mention = esc(e.mention).replace(/https?:\/\/[^\s,]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>'; });
  $('td-mention').innerHTML = '<p>' + mention + '</p>' +
    (e.traduction ? '<p>' + esc(e.libelle) + ', traduction française de ' + esc(e.traduction) + '.</p>' : '');
}

// ── Routage ──────────────────────────────────────────
function lireHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const i = h.indexOf('/');
  return { id: i < 0 ? h : h.slice(0, i), sous: i < 0 ? '' : h.slice(i + 1) };
}

function route() {
  const h = lireHash();
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
  return '<a class="td-item' + (courant && courant.id === b.id ? ' on' : '') + '" href="#' + esc(b.id) + '"' + (courant && courant.id === b.id ? ' aria-current="page"' : '') + '>' +
    '<span class="td-num">' + esc(b.numero.replace('RP-', 'RP ')) + '</span><span class="td-tit">' + esc(b.titre) + '</span></a>';
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
  let html = '<div class="td-accueil"><h2 class="td-titre">' + (vue === 'procedures' ? 'Procédures recommandées' : esc(e.libelle)) + '</h2>';
  if (vue === 'procedures') {
    const intro = D.blocs.find(function (b) { return b.kind === 'rp_intro'; });
    if (intro) html += TDA_RENDU.elementsHtml(intro.data.elements, Object.assign({}, ctxBase), intro.id);
  } else if (e.introduction) {
    html += '<p class="td-p">' + esc(e.introduction) + '</p>';
  }
  html += '<p class="td-aide">' + (vue === 'procedures' ? 'Choisissez une procédure dans le sommaire.' : 'Choisissez une règle dans le sommaire.') + '</p></div>';
  $('td-main').innerHTML = html;
  window.scrollTo(0, 0);
}

// ── Une règle ou une procédure ───────────────────────
function afficherBloc(vue, b, sous, exemple) {
  const liste = vue === 'procedures' ? procedures : regles;
  const i = liste.indexOf(b);
  // Les exemples d'une règle sont rattachés à son numéro seul (« 55 »), même s'ils portent un sous-point (« 55-A-1 »)
  const lesExemples = b.kind === 'regle' ? (exemplesDe[b.numero] || []) : [];
  const ctx = Object.assign({}, ctxBase, { exemplesVers: lesExemples.length ? b.id : null });
  const section = (sectionsParId[b.section] || {}).titre || (vue === 'procedures' ? 'Procédures recommandées' : '');

  let html = '<article class="td-art">' +
    '<a class="td-back" href="#' + vue + '">&lsaquo; Sommaire</a>' +
    '<div class="td-kicker">' + esc(section) + '</div>' +
    '<h2 class="td-titre"><span class="td-n">' + esc(b.numero.replace('RP-', 'RP ')) + '</span>' + esc(b.titre) + '</h2>' +
    TDA_RENDU.elementsHtml(b.data.elements, ctx, b.id) +
    TDA_RENDU.exemplesHtml(lesExemples, ctx) +
    '<div class="td-pager">' +
      (i > 0 ? '<a class="td-prev" href="#' + esc(liste[i - 1].id) + '"><small>Précédente</small>' + esc(liste[i - 1].numero.replace('RP-', 'RP ') + ' - ' + liste[i - 1].titre) + '</a>' : '<span></span>') +
      (i < liste.length - 1 ? '<a class="td-next" href="#' + esc(liste[i + 1].id) + '"><small>Suivante</small>' + esc(liste[i + 1].numero.replace('RP-', 'RP ') + ' - ' + liste[i + 1].titre) + '</a>' : '<span></span>') +
    '</div></article>';
  $('td-main').innerHTML = html;

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
  } else window.scrollTo(0, 0);
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
      return '<div class="td-dt-dd" id="' + esc(g.id) + '"><dt>' + esc(g.titre) + '</dt><dd>' + esc(g.data.definition) + '</dd></div>';
    }).join('') + '</dl></section>';
  }).join('') + '</div>';
  const cible = courant && $(courant.id);
  if (cible) { cible.scrollIntoView({ block: 'center' }); cible.classList.add('flash'); }
  else window.scrollTo(0, 0);
}

// ── Info-bulles : terme du glossaire, renvoi à vérifier ──
function fermerPop() { $('td-pop').hidden = true; }

function ouvrirPop(cible, html) {
  const pop = $('td-pop');
  pop.innerHTML = html;
  pop.hidden = false;
  const r = cible.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);      // pas la place en dessous : au-dessus
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
}

function clicDocument(e) {
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
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('td-terme')) { e.preventDefault(); e.target.click(); }
}
