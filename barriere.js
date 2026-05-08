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
