/* ═══════════════════════════════════════════════
   barriere.js - Scripts communs
   Barrière Casino Bordeaux · Outils Tournois
═══════════════════════════════════════════════ */

/* Injection favicon - chemin déduit depuis l'URL du script lui-même */
(function () {
  const base = document.currentScript.src.replace('barriere.js', 'favicon/');
  [
    { rel: 'icon',            href: base + 'favicon.ico', sizes: '32x32' },
    { rel: 'icon',            href: base + 'favicon.svg', type: 'image/svg+xml' },
    { rel: 'apple-touch-icon',href: base + 'apple-touch-icon.png' },
    { rel: 'manifest',        href: base + 'site.webmanifest' },
  ].forEach(({ rel, href, sizes, type }) => {
    const l = document.createElement('link');
    l.rel = rel; l.href = href;
    if (sizes) l.sizes = sizes;
    if (type)  l.type  = type;
    document.head.appendChild(l);
  });
})();

function applyTheme(light) {
  document.body.classList.toggle('light', light);
  // Ancien bouton flottant : absent des pages qui n'ont que la barre de navigation
  const icon = document.getElementById('theme-icon'), label = document.getElementById('theme-label');
  if (icon)  icon.textContent  = light ? '🌙' : '☀️';
  if (label) label.textContent = light ? 'Mode nuit' : 'Mode jour';
}

function toggleTheme() {
  const isLight = !document.body.classList.contains('light');
  localStorage.setItem('barriere_theme', isLight ? 'light' : 'dark');
  applyTheme(isLight);
}

/* Application automatique au chargement */
document.addEventListener('DOMContentLoaded', () =>
  applyTheme(localStorage.getItem('barriere_theme') === 'light')
);

/* Transitions de page */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || a.target === '_blank') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript')) return;
  e.preventDefault();
  document.body.classList.add('is-leaving');
  setTimeout(() => { window.location.href = href; }, 200);
});

/* ── Déclarations : mois par défaut = le mois SUIVANT ──
   Les déclarations (DTPJ, courriers, extras) se font en amont : une fois le mois commencé, il est trop tard. */
function defaultDeclMonth() {
  const n = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);   // gère décembre → janvier
  return { month: n.getMonth() + 1, year: n.getFullYear() };
}

/* ── Sélecteur de période (mois + année), le même partout ──
   Remplit la liste des mois (noms avec majuscule initiale) et place le mois suivant par défaut. */
function initPeriodPicker(monthEl, yearEl, names) {
  const def = defaultDeclMonth();
  names.forEach((n, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    if (i + 1 === def.month) o.selected = true;
    monthEl.appendChild(o);
  });
  yearEl.value = def.year;
}

/* ── Impression avec un titre explicite ──
   Le navigateur propose le titre de la page comme nom du fichier PDF (et l'imprime en en-tête) : on le remplace le
   temps de l'impression par un titre qui dit ce qu'on imprime (« Déclaration DTPJ - Novembre 2026 »). */
function printWithTitle(title) {
  const previous = document.title;
  document.title = title;
  const restore = () => { document.title = previous; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
  setTimeout(restore, 1500);   // repli si `afterprint` n'est pas émis
}
