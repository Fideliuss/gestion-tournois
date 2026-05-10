/* ═══════════════════════════════════════════════
   barriere.js — Scripts communs
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════ */

function applyTheme(light) {
  document.body.classList.toggle('light', light);
  document.getElementById('theme-icon').textContent  = light ? '🌙' : '☀️';
  document.getElementById('theme-label').textContent = light ? 'Mode nuit' : 'Mode jour';
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
