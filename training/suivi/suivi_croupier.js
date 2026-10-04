// ══════════════════════════════════════════════════════
//  SUIVI CROUPIER — « Mes résultats »
//  Historique, record et tendance de l'utilisateur connecté, par module
// ══════════════════════════════════════════════════════

const SVC_HISTORY_PAGE = 8;   // sessions listées avant « Tout voir »
const SVC_BARS = 12;          // sessions dans le mini-histogramme

let _svcByGame = {};          // game → sessions (plus récente d'abord)
const _svcLevel = {};         // game → filtre de niveau ('all' | 'facile' | ...)
const _svcExpanded = {};      // game → historique déplié

async function initSuiviCroupier() {
  const root = document.getElementById('svc-root');
  let sessions;
  try {
    sessions = await SB.getMyTrainingSessions();
  } catch (e) {
    root.innerHTML = '<div class="sv-empty">Impossible de charger tes résultats pour le moment. Réessaie dans quelques instants.</div>';
    return;
  }

  _svcByGame = {};
  sessions.forEach(function(s) {
    if (!svModule(s.game)) return;
    (_svcByGame[s.game] = _svcByGame[s.game] || []).push(s);
  });

  if (!Object.keys(_svcByGame).length) {
    root.innerHTML = '<div class="sv-empty">Aucune session terminée pour l\'instant.<br>'
      + 'Lance un module depuis <a href="../training.html">Training Croupier</a> : tes résultats apparaîtront ici.</div>';
    return;
  }
  renderSuiviCroupier();
}

function renderSuiviCroupier() {
  const played = SV_MODULES.filter(function(m) { return _svcByGame[m.game]; });
  const untried = SV_MODULES.filter(function(m) { return !_svcByGame[m.game]; });

  let html = renderGlobalMetrics(played);
  html += played.map(renderModuleCard).join('');
  if (untried.length) {
    html += '<div class="sv-untried">Pas encore essayé : '
      + untried.map(function(m) { return m.name + ' ' + m.em; }).join(' · ') + '</div>';
  }
  document.getElementById('svc-root').innerHTML = html;
}

function renderGlobalMetrics(played) {
  const all = [];
  played.forEach(function(m) { all.push.apply(all, _svcByGame[m.game]); });
  const total   = all.reduce(function(a, s) { return a + (s.total || 0); }, 0);
  const correct = all.reduce(function(a, s) { return a + (s.correct || 0); }, 0);
  const last    = all.reduce(function(a, s) { return s.started_at > a ? s.started_at : a; }, '');
  const pct     = total ? Math.round((correct / total) * 100) : 0;

  return '<div class="sv-metrics">'
    + metric('Sessions', all.length)
    + metric('Précision globale', pct + '<small>%</small>')
    + metric('Modules essayés', played.length + '<small>/ ' + SV_MODULES.length + '</small>')
    + '<div class="sv-metric"><div class="sv-metric-label">Dernière session</div>'
    + '<div class="sv-metric-val sv-sm">' + svFormatDay(last) + '</div></div>'
    + '</div>';
}

function metric(label, val) {
  return '<div class="sv-metric"><div class="sv-metric-label">' + label + '</div>'
    + '<div class="sv-metric-val">' + val + '</div></div>';
}

function renderModuleCard(m) {
  const all = _svcByGame[m.game];
  const level = _svcLevel[m.game] || 'all';
  const list = (m.levels && level !== 'all')
    ? all.filter(function(s) { return svLevelOf(s) === level; })
    : all;

  let html = '<div class="card" id="svc-' + m.game + '">'
    + '<div class="sv-head"><div class="sv-title">' + m.name + ' <em>' + m.em + '</em></div>'
    + (m.levels ? renderLevelChips(m, all, level) : '') + '</div>';

  if (!list.length) {
    return html + '<div class="sv-empty" style="padding:20px">Aucune session à ce niveau.</div></div>';
  }

  const st = svStats(list);
  html += '<div class="sv-stats">'
    + stat('Sessions', st.count)
    + stat('Record', st.best + '<small>%</small>')
    + stat('Moy. ' + Math.min(SV_RECENT, list.length) + ' dernières', st.avg + '<small>%</small>')
    + renderTrend(st.trend)
    + '</div>';

  html += renderBars(list);
  if (m.timed) html += renderBestTimes(all);
  html += renderHistory(m, list);
  return html + '</div>';
}

function stat(label, val) {
  return '<div><div class="sv-stat-label">' + label + '</div><div class="sv-stat-val">' + val + '</div></div>';
}

function renderTrend(trend) {
  let val;
  if (trend === null) val = '<span class="sv-flat">—</span>';
  else if (trend > 0) val = '<span class="sv-up">▲ ' + trend + '<small>pts</small></span>';
  else if (trend < 0) val = '<span class="sv-down">▼ ' + Math.abs(trend) + '<small>pts</small></span>';
  else val = '<span class="sv-flat">= 0<small>pt</small></span>';
  return '<div><div class="sv-stat-label">Tendance</div><div class="sv-stat-val">' + val + '</div></div>';
}

function renderLevelChips(m, all, current) {
  const present = SV_LEVELS.filter(function(l) {
    return all.some(function(s) { return svLevelOf(s) === l[0]; });
  });
  if (present.length < 1) return '';
  const chips = [['all', 'Tous']].concat(present);
  return '<div class="sv-chips">' + chips.map(function(c) {
    return '<button class="sv-chip' + (c[0] === current ? ' on' : '') + '" onclick="setSuiviLevel(\'' + m.game + '\',\'' + c[0] + '\')">' + c[1] + '</button>';
  }).join('') + '</div>';
}

function renderBars(list) {
  const recent = list.slice(0, SVC_BARS).reverse();   // chronologique, la plus récente à droite
  const bars = recent.map(function(s, i) {
    const pct = svPct(s);
    const tip = svFormatDate(s.started_at) + ' · ' + s.correct + '/' + s.total + ' · ' + pct + ' %';
    return '<div class="sv-bar' + (i === recent.length - 1 ? ' last' : '') + '" style="height:' + Math.max(pct, 4) + '%" title="' + tip + '"></div>';
  }).join('');
  return '<div class="sv-bars">' + bars + '</div>'
    + '<div class="sv-caption">Précision des ' + recent.length + ' dernières sessions (la plus récente à droite)</div>';
}

function renderBestTimes(all) {
  const best = svBestTimes(all);
  return '<div class="sv-times">' + SV_RATIOS.map(function(r) {
    const ms = best[r];
    return '<div class="sv-time"><div class="sv-time-ratio">× ' + r + '</div>'
      + '<div class="sv-time-val' + (ms ? '' : ' none') + '">' + (ms ? svFormatTime(ms) : '—') + '</div></div>';
  }).join('') + '</div>'
    + '<div class="sv-caption" style="margin-top:6px">Meilleur temps par table — sessions sans erreur uniquement</div>';
}

function renderHistory(m, list) {
  const open = _svcExpanded[m.game];
  const shown = open ? list : list.slice(0, SVC_HISTORY_PAGE);
  let html = '<div class="sv-hist">' + shown.map(function(s) {
    const pct = svPct(s);
    const lvl = svLevelLabel(svLevelOf(s));
    // Tables : table jouée + chrono ; autres modules : niveau
    const ctx = m.timed
      ? [s.meta && s.meta.ratio ? '× ' + s.meta.ratio : '', s.meta && s.meta.elapsedMs ? svFormatTime(s.meta.elapsedMs) : ''].filter(Boolean).join(' · ')
      : (lvl || '');
    return '<div class="sv-row">'
      + '<span class="sv-row-date">' + svFormatDate(s.started_at) + '</span>'
      + '<span class="sv-lvl">' + ctx + '</span>'
      + '<span class="sv-row-score">' + s.correct + '/' + s.total + '</span>'
      + '<span class="sv-meter"><i style="width:' + pct + '%"></i></span>'
      + '<span class="sv-row-pct">' + pct + ' %</span>'
      + '</div>';
  }).join('') + '</div>';
  if (list.length > SVC_HISTORY_PAGE) {
    html += '<button class="btn btn-ghost sv-more" onclick="toggleSuiviHistory(\'' + m.game + '\')">'
      + (open ? 'Réduire' : 'Tout voir (' + list.length + ')') + '</button>';
  }
  return html;
}

function setSuiviLevel(game, level) {
  _svcLevel[game] = level;
  _svcExpanded[game] = false;
  renderSuiviCroupier();
}

function toggleSuiviHistory(game) {
  _svcExpanded[game] = !_svcExpanded[game];
  renderSuiviCroupier();
}
