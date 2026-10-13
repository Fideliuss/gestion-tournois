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
  // (un guide marqué `admin: true` ne s'adresse qu'aux administrateurs)
  GUIDES = AIDE_GUIDES.filter(function (g) { return isAdmin || (!g.admin && (!g.panel || panels.indexOf(g.panel) >= 0)); });
  window.addEventListener('hashchange', show);
  document.getElementById('aide-list').addEventListener('click', function (e) {          // sommaire : défilement jusqu'à l'étape, sans changer de guide
    const a = e.target.closest('a[data-step]');
    if (!a) return;
    e.preventDefault();
    document.getElementById('aide-step-' + a.dataset.step).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('aide-list').addEventListener('change', function (e) {          // liste déroulante des espaces : premier guide de l'espace choisi
    if (e.target.matches('select[data-space]')) location.hash = '#' + e.target.value;
  });
  let busy = false;
  window.addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(function () { busy = false; spy(); }); } }, { passive: true });
  show();
}

/** Met en évidence, dans le sommaire, l'étape en cours de lecture (la dernière dont le haut a passé le bas de la barre) */
function spy() {
  const steps = document.querySelectorAll('.aide-steps > li'), links = document.querySelectorAll('.aide-toc a');
  if (!steps.length || !links.length) return;
  let cur = 0;
  steps.forEach(function (li, k) { if (li.getBoundingClientRect().top <= 140) cur = k; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = steps.length - 1;   // en bas de page : la dernière
  links.forEach(function (a) { a.classList.toggle('on', Number(a.dataset.step) === cur); });
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
  // Liste de l'espace du guide affiché seulement ; un sélecteur d'espace n'apparaît que si l'on a accès à plusieurs espaces
  const g = GUIDES.find(function (x) { return x.id === id; });
  const spaces = [];
  GUIDES.forEach(function (x) { if (spaces.indexOf(x.space) < 0) spaces.push(x.space); });
  const switcher = spaces.length > 1
    ? '<select class="aide-spaces" data-space aria-label="Espace">' + spaces.map(function (s) {
        return '<option value="' + esc(s) + '"' + (s === g.space ? ' selected' : '') + '>' + esc(AIDE_ESPACES[s] || s) + '</option>';
      }).join('') + '</select>'
    : '';
  list.innerHTML = switcher + '<div class="aide-grp"><h3>' + esc(AIDE_ESPACES[g.space] || g.space) + '</h3>' + GUIDES.filter(function (x) { return x.space === g.space; }).map(function (x) {
    return '<a href="#' + esc(x.id) + '"' + (x.id === id ? ' class="on" aria-current="page"' : '') + '>' + esc(x.title) + '</a>'
      + (x.id === id ? '<ol class="aide-toc" aria-label="Sommaire du guide">' + x.steps.map(function (s, k) {
        return '<li><a href="#" data-step="' + k + '">' + esc(s.title) + '</a></li>';
      }).join('') + '</ol>' : '');
  }).join('') + '</div>';
  if (typeof NAV !== 'undefined' && NAV.setSpace) NAV.setSpace(g.space);          // la barre de navigation suit l'espace du guide lu

  const mates = GUIDES.filter(function (x) { return x.space === g.space; }), i = mates.indexOf(g);   // guide précédent / suivant : dans le même espace
  box.innerHTML = '<div class="aide-head"><div><span class="aide-tag">' + esc(AIDE_ESPACES[g.space] || g.space) + '</span><h2>' + esc(g.title) + '</h2></div>'
    + '<button class="btn btn-ghost aide-print" type="button" onclick="printGuide()"><i class="ico ico-print"></i> Imprimer ce guide</button></div>'
    + (g.intro ? '<p class="aide-intro">' + g.intro + '</p>' : '')
    + '<ol class="aide-steps">' + g.steps.map(function (s, k) {
      return '<li id="aide-step-' + k + '"><div class="aide-step-h"><span class="aide-n"></span><h3>' + esc(s.title) + '</h3></div><div class="aide-txt">' + s.text + '</div>'
        + (s.imgs || []).map(function (im) { return '<figure><img src="' + esc(im.src) + '" alt="' + esc(im.alt || '') + '" loading="lazy"/></figure>'; }).join('') + '</li>';
    }).join('') + '</ol>'
    + '<div class="aide-nav">' + (mates[i - 1] ? '<a href="#' + esc(mates[i - 1].id) + '">← ' + esc(mates[i - 1].title) + '</a>' : '<span></span>')
    + (mates[i + 1] ? '<a href="#' + esc(mates[i + 1].id) + '">' + esc(mates[i + 1].title) + ' →</a>' : '') + '</div>';
  window.scrollTo(0, 0);
  spy();
  document.title = 'Aide - ' + g.title + ' - Barrière Casino Bordeaux';
}

function printGuide() {
  const g = GUIDES.find(function (x) { return x.id === currentId(); });
  printWithTitle('Aide - ' + (AIDE_ESPACES[g.space] || g.space) + ' - ' + g.title);
}
