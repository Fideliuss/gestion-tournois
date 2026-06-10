/* ═══════════════════════════════════════════════════════
   semainier.js — Sélecteur de tournoi par jour
   Casino Barrière Bordeaux · Outils Tournois
   Utilisé par : leaderboard.html · prize-pool.html
═══════════════════════════════════════════════════════ */

const SEMAINIER_DAYS       = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const SEMAINIER_DAYS_SHORT = ['Lun',  'Mar',  'Mer',    'Jeu',  'Ven',    'Sam',   'Dim'];

/**
 * Construit le HTML du semainier (sélecteur de tournoi par jour).
 * @param {Array}  tournaments   - liste {id, name, day, buyin, ...}
 * @param {string} selectedId    - id du tournoi actif ('' si aucun)
 * @param {string} onSelectFn   - nom de la fonction JS globale : onSelectFn('id')
 * @param {string} [suggestedDay] - jour mis en surbrillance (ex: 'Jeudi')
 * @returns {string} HTML a injecter via innerHTML
 */
function buildSemainier(tournaments, selectedId, onSelectFn, suggestedDay) {
  const byDay  = {};
  const events = [];

  SEMAINIER_DAYS.forEach(function(d) { byDay[d] = []; });

  (tournaments || []).forEach(function(t) {
    if (SEMAINIER_DAYS.indexOf(t.day) !== -1) {
      byDay[t.day].push(t);
    } else {
      events.push(t);
    }
  });

  /* Colonnes de la semaine */
  var weekCols = SEMAINIER_DAYS.map(function(day, i) {
    var ts = byDay[day];
    var isDaySuggested = !!(suggestedDay && day === suggestedDay);

    if (ts.length === 0) {
      return '<div class="sem-day sem-day-empty' + (isDaySuggested ? ' sem-day-suggested' : '') + '">'
        + '<div class="sem-day-label">' + SEMAINIER_DAYS_SHORT[i] + '</div>'
        + '<div class="sem-day-off"></div>'
        + '</div>';
    }

    var btns = ts.map(function(t) {
      var isActive    = t.id === selectedId;
      var isSuggested = isDaySuggested && !isActive;
      var cls = 'sem-btn' + (isActive ? ' sem-active' : '') + (isSuggested ? ' sem-suggested' : '');
      return '<button class="' + cls + '"'
        + ' onclick="' + onSelectFn + '(\'' + t.id + '\')"'
        + ' title="' + t.name + ' · ' + t.buyin + ' €">'
        + t.name + '</button>';
    }).join('');

    return '<div class="sem-day' + (isDaySuggested ? ' sem-day-suggested' : '') + '">'
      + '<div class="sem-day-label">' + SEMAINIER_DAYS_SHORT[i] + '</div>'
      + btns
      + '</div>';
  }).join('');

  /* Section Evenements */
  var evtBtns = events.map(function(t) {
    var isActive = t.id === selectedId;
    var cls = 'sem-btn' + (isActive ? ' sem-active' : '');
    return '<button class="' + cls + '"'
      + ' onclick="' + onSelectFn + '(\'' + t.id + '\')"'
      + ' title="' + t.name + ' · ' + t.buyin + ' €">'
      + t.name + '</button>';
  }).join('');

  var eventsHtml = events.length
    ? '<div class="sem-events">'
      + '<span class="sem-events-label">&#201;v&#233;nements</span>'
      + '<div class="sem-events-btns">' + evtBtns + '</div>'
      + '</div>'
    : '';

  return '<div class="semainier">'
    + '<div class="sem-week">' + weekCols + '</div>'
    + eventsHtml
    + '</div>';
}
