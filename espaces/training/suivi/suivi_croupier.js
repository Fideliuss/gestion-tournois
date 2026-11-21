// ══════════════════════════════════════════════════════
//  SUIVI CROUPIER - « Mes résultats »
//  Historique, record et tendance de l'utilisateur connecté.
//  Navigation : Vue d'ensemble → jeu (Black Jack / Roulette) → module.
//  La vue courante est portée par le hash de l'URL (retour arrière et lien direct) :
//    #  (ensemble) · #roulette · #roulette/roulette-tables
// ══════════════════════════════════════════════════════

const SVC_HISTORY_PAGE = 8;   // sessions listées avant « Tout voir »
const SVC_BARS = 12;          // sessions dans le mini-histogramme

let _svcByGame = {};          // clé module (training_sessions.game) → sessions (plus récente d'abord)
const _svcLevel = {};         // clé module → filtre de niveau ('all' | 'facile' | ...)
const _svcExpanded = {};      // clé module → historique déplié
let _svcView = { family: null, module: null };

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
    root.innerHTML = '<div class="sv-empty">Pas de résultats</div>';
    return;
  }

  window.addEventListener('hashchange', function() { svcSyncView(true); });
  svcSyncView(false);
}

// ── Navigation ───────────────────────────────────────
function svcParseHash() {
  const parts = decodeURIComponent((location.hash || '').replace(/^#/, '')).split('/');
  const family = svFamily(parts[0]) ? parts[0] : null;
  const mod = svModule(parts[1]);
  return { family: family, module: (family && mod && mod.family === family) ? mod.game : null };
}

function svcSyncView(scrollTop) {
  const prev = _svcView.family;
  _svcView = svcParseHash();
  renderSuiviCroupier();
  if (scrollTop && prev !== _svcView.family) window.scrollTo(0, 0);
}

function svcGo(family, module) {
  location.hash = family ? family + (module ? '/' + module : '') : '';
}

// ── Rendu ────────────────────────────────────────────
function svcSessionsOf(familyId) {
  const out = [];
  svModulesOf(familyId).forEach(function(m) {
    if (_svcByGame[m.game]) out.push.apply(out, _svcByGame[m.game]);
  });
  return out;
}

function renderSuiviCroupier() {
  const html = renderTabs() + (_svcView.family ? renderFamily(_svcView.family, _svcView.module) : renderOverview());
  document.getElementById('svc-root').innerHTML = html;
}

function renderTabs() {
  const tabs = [{ id: null, label: 'Vue d\'ensemble' }].concat(SV_FAMILIES.map(function(f) {
    return { id: f.id, label: f.name + ' ' + f.em, n: svcSessionsOf(f.id).length };
  }));
  return '<div class="sv-tabs seg">' + tabs.map(function(t) {
    const on = t.id === _svcView.family;
    return '<button class="sv-tab seg-btn' + (on ? ' on' : '') + '" onclick="svcGo(' + (t.id ? '\'' + t.id + '\'' : '') + ')">'
      + t.label + (t.n !== undefined ? '<span class="sv-tab-n seg-n">' + t.n + '</span>' : '') + '</button>';
  }).join('') + '</div>';
}

// Vue d'ensemble : chiffres globaux + un bloc par jeu avec un tableau cliquable des modules
function renderOverview() {
  const all = [];
  Object.keys(_svcByGame).forEach(function(g) { all.push.apply(all, _svcByGame[g]); });
  const played = SV_MODULES.filter(function(m) { return _svcByGame[m.game]; });
  let html = renderMetrics(all, played.length, SV_MODULES.length);

  SV_FAMILIES.forEach(function(f) {
    html += '<div class="card"><div class="sv-head"><div class="sv-title">' + f.name + ' <em>' + f.em + '</em></div>'
      + '<button class="btn btn-ghost" onclick="svcGo(\'' + f.id + '\')">Ouvrir →</button></div>'
      + '<div class="sv-mrow sv-mhead"><span>Module</span><span>Sessions</span><span>Record</span><span>Moy.</span><span>Tendance</span></div>'
      + svModulesOf(f.id).map(renderModuleRow).join('') + '</div>';
  });
  return html;
}

function renderModuleRow(m) {
  const list = _svcByGame[m.game];
  const name = m.name + ' <em>' + m.em + '</em>';
  if (!list) {
    return '<div class="sv-mrow sv-none"><span class="sv-mname">' + name + '</span>'
      + '<span class="sv-mnone">Pas de résultats</span></div>';
  }
  const st = svStats(list);
  return '<button class="sv-mrow" onclick="svcGo(\'' + m.family + '\',\'' + m.game + '\')">'
    + '<span class="sv-mname">' + name + '</span>'
    + '<span class="sv-mval">' + st.count + '</span>'
    + '<span class="sv-mval">' + st.best + '<small>%</small></span>'
    + '<span class="sv-mval">' + st.avg + '<small>%</small></span>'
    + '<span class="sv-mval">' + trendInline(st.trend) + '</span></button>';
}

// Vue d'un jeu : chiffres du jeu, sélecteur de module, puis les cartes (toutes, ou celle choisie)
function renderFamily(familyId, moduleKey) {
  const mods = svModulesOf(familyId);
  const played = mods.filter(function(m) { return _svcByGame[m.game]; });

  let html = renderMetrics(svcSessionsOf(familyId), played.length, mods.length);
  html += renderModulePills(familyId, mods, moduleKey);

  if (moduleKey) {
    html += _svcByGame[moduleKey]
      ? renderModuleCard(svModule(moduleKey))
      : '<div class="sv-empty">Pas de résultats</div>';
  } else if (!played.length) {
    html += '<div class="sv-empty">Pas de résultats</div>';
  } else {
    html += played.map(renderModuleCard).join('');
  }
  return html;
}

function renderModulePills(familyId, mods, current) {
  const pill = function(key, label, n, dim) {
    const on = (key || null) === (current || null);
    return '<button class="fchip' + (on ? ' on' : '') + (dim ? ' dim' : '') + '"'
      + (dim ? ' disabled' : ' onclick="svcGo(\'' + familyId + '\'' + (key ? ',\'' + key + '\'' : '') + ')"') + '>'
      + label + (n !== null ? ' <span class="fchip-n">' + n + '</span>' : '') + '</button>';
  };
  return '<div class="fchips sv-pills">' + pill(null, 'Tous les modules', null, false)
    + mods.map(function(m) {
        const n = (_svcByGame[m.game] || []).length;
        return pill(m.game, m.name + ' ' + m.em, n, n === 0);
      }).join('') + '</div>';
}

// Chiffres clés pour un ensemble de sessions
function renderMetrics(all, playedCount, moduleCount) {
  const total   = all.reduce(function(a, s) { return a + (s.total || 0); }, 0);
  const correct = all.reduce(function(a, s) { return a + (s.correct || 0); }, 0);
  const last    = all.reduce(function(a, s) { return s.started_at > a ? s.started_at : a; }, '');
  const pct     = total ? Math.round((correct / total) * 100) : 0;

  return '<div class="sv-metrics">'
    + metric('Sessions', all.length)
    + metric('Précision globale', all.length ? pct + '<small>%</small>' : '-')
    + metric('Modules essayés', playedCount + '<small>/ ' + moduleCount + '</small>')
    + '<div class="sv-metric"><div class="sv-metric-label">Dernière session</div>'
    + '<div class="sv-metric-val sv-sm">' + (last ? svFormatDay(last) : '-') + '</div></div>'
    + '</div>';
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
    return html + '<div class="sv-empty" style="padding:20px">Pas de résultats</div></div>';
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

function renderTrend(trend) {
  return '<div><div class="sv-stat-label">Tendance</div><div class="sv-stat-val">' + trendInline(trend) + '</div></div>';
}

function renderLevelChips(m, all, current) {
  const present = SV_LEVELS.filter(function(l) {
    return all.some(function(s) { return svLevelOf(s) === l[0]; });
  });
  if (present.length < 1) return '';
  const chips = [['all', 'Tous']].concat(present);
  return '<div class="fchips">' + chips.map(function(c) {
    return '<button class="fchip' + (c[0] === current ? ' on' : '') + '" onclick="setSuiviLevel(\'' + m.game + '\',\'' + c[0] + '\')">' + c[1] + '</button>';
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
