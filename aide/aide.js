// ══════════════════════════════════════════════════════
//  AIDE - liste des guides (selon les droits) et affichage d'un guide
//  Lien direct vers un guide : aide.html#<id>. Le bouton « ? » de la barre de navigation ouvre le guide de la page courante.
// ══════════════════════════════════════════════════════

let GUIDES = [];     // guides visibles pour cet utilisateur

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

async function init(user) {
  const role = (user.user_metadata && user.user_metadata.role) || 'floor', isAdmin = role === 'admin';
  let panels = [];
  if (!isAdmin) {
    try { const r = (await SB.getRoles()).find(function (x) { return x.slug === role; }); panels = (r && r.panels) || []; }
    catch (e) { panels = []; }
  }
  // Chacun ne voit que les guides des espaces auxquels il a droit (les admins voient tout)
  GUIDES = AIDE_GUIDES.filter(function (g) { return isAdmin || !g.panel || panels.indexOf(g.panel) >= 0; });
  window.addEventListener('hashchange', show);
  show();
}

function currentId() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (GUIDES.some(function (g) { return g.id === id; })) return id;
  // lien vers un espace (ex. #break-list) : son premier guide
  const first = GUIDES.find(function (g) { return g.space === id; });
  return first ? first.id : (GUIDES[0] ? GUIDES[0].id : null);
}

function show() {
  const id = currentId(), list = document.getElementById('aide-list'), box = document.getElementById('aide-guide');
  if (!GUIDES.length) {
    list.innerHTML = '';
    box.innerHTML = '<div class="aide-empty">Aucun guide n\'est disponible pour vos accès pour le moment.</div>';
    return;
  }
  // liste groupée par espace
  const spaces = [];
  GUIDES.forEach(function (g) { if (spaces.indexOf(g.space) < 0) spaces.push(g.space); });
  list.innerHTML = spaces.map(function (s) {
    return '<div class="aide-grp"><h3>' + esc(AIDE_ESPACES[s] || s) + '</h3>' + GUIDES.filter(function (g) { return g.space === s; }).map(function (g) {
      return '<a href="#' + esc(g.id) + '"' + (g.id === id ? ' class="on" aria-current="page"' : '') + '>' + esc(g.title) + '</a>';
    }).join('') + '</div>';
  }).join('');

  const g = GUIDES.find(function (x) { return x.id === id; }), i = GUIDES.indexOf(g);
  box.innerHTML = '<div class="aide-head"><div><span class="aide-tag">' + esc(AIDE_ESPACES[g.space] || g.space) + '</span><h2>' + esc(g.title) + '</h2></div>'
    + '<button class="btn btn-ghost aide-print" type="button" onclick="printGuide()"><i class="ico ico-print"></i> Imprimer ce guide</button></div>'
    + (g.intro ? '<p class="aide-intro">' + g.intro + '</p>' : '')
    + '<ol class="aide-steps">' + g.steps.map(function (s) {
      return '<li><div class="aide-step-h"><span class="aide-n"></span><h3>' + esc(s.title) + '</h3></div><div class="aide-txt">' + s.text + '</div>'
        + (s.imgs || []).map(function (im) { return '<figure><img src="' + esc(im.src) + '" alt="' + esc(im.alt || '') + '" loading="lazy"/></figure>'; }).join('') + '</li>';
    }).join('') + '</ol>'
    + '<div class="aide-nav">' + (GUIDES[i - 1] ? '<a href="#' + esc(GUIDES[i - 1].id) + '">← ' + esc(GUIDES[i - 1].title) + '</a>' : '<span></span>')
    + (GUIDES[i + 1] ? '<a href="#' + esc(GUIDES[i + 1].id) + '">' + esc(GUIDES[i + 1].title) + ' →</a>' : '') + '</div>';
  window.scrollTo(0, 0);
  document.title = 'Aide - ' + g.title + ' - Barrière Casino Bordeaux';
}

function printGuide() {
  const g = GUIDES.find(function (x) { return x.id === currentId(); });
  printWithTitle('Aide - ' + (AIDE_ESPACES[g.space] || g.space) + ' - ' + g.title);
}
