/* ═══════════════════════════════════════════════════════
   semainier.js — Sélecteur de tournoi par jour
   Casino Barrière Bordeaux · Outils Tournois
   Utilisé par : leaderboard.html · prize-pool.html
═══════════════════════════════════════════════════════ */

const SEMAINIER_DAYS       = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const SEMAINIER_DAYS_SHORT = ['Lun',  'Mar',  'Mer',    'Jeu',  'Ven',    'Sam',   'Dim'];

/**
 * Construit le HTML du semainier (sélecteur de tournoi par jour).
 * @param {Array}  tournaments  — liste {id, name, day, buyin, …}
 * @param {string} selectedId   — id du tournoi actif ('' si aucun)
 * @param {string} onSelectFn   — nom de la fonction JS globale : onSelectFn('id')
 * @returns {string} HTML à injecter via innerHTML
 */
function buildSemainier(tournaments, selectedId, onSelectFn) {
  const byDay  = {};
  const events = [];

  SEMAINIER_DAYS.forEach(d => { byDay[d] = []; });

  (tournaments || []).forEach(t => {
    if (SEMAINIER_DAYS.includes(t.day)) {
      byDay[t.day].push(t);
    } else {
      events.push(t);
    }
  });

  /* ── Colonnes de la semaine ── */
  const weekCols = SEMAINIER_DAYS.map((day, i) => {
    const ts = byDay[day];

    if (ts.length === 0) {
      return `<div class="sem-day sem-day-empty">
        <div class="sem-day-label">${SEMAINIER_DAYS_SHORT[i]}</div>
        <div class="sem-day-off"></div>
      </div>`;
    }

    const btns = ts.map(t =>
      `<button class="sem-btn${t.id === selectedId ? ' sem-active' : ''}"
        onclick="${onSelectFn}('${t.id}')"
        title="${t.name} · ${t.buyin} €">${t.name}</button>`
    ).join('');

    return `<div class="sem-day">
      <div class="sem-day-label">${SEMAINIER_DAYS_SHORT[i]}</div>
      ${btns}
    </div>`;
  }).join('');

  /* ── Section Événements ── */
  const evtBtns = events.map(t =>
    `<button class="sem-btn${t.id === selectedId ? ' sem-active' : ''}"
      onclick="${onSelectFn}('${t.id}')"
      title="${t.name} · ${t.buyin} €">${t.name}</button>`
  ).join('');

  const eventsHtml = events.length
    ? `<div class="sem-events">
        <span class="sem-events-label">Événements</span>
        <div class="sem-events-btns">${evtBtns}</div>
      </div>`
    : '';

  return `<div class="semainier">
    <div class="sem-week">${weekCols}</div>
    ${eventsHtml}
  </div>`;
}
