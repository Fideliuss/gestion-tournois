// ══════════════════════════════════════════════════════
//  SUIVI MANAGER — résultats de toute l'équipe (panel 'training-suivi')
//  4 vues : Classement · Progression · Points faibles · Activité
//  Vue courante portée par le hash : #classement · #progression/<user_id> · #faibles · #activite
//  Les agrégats viennent de fonctions SQL (supabase/migrations/phase3_suivi_fonctions_manager.sql).
// ══════════════════════════════════════════════════════

const SVM_TABS = [
  { id: 'classement',  label: 'Classement'     },
  { id: 'progression', label: 'Progression'    },
  { id: 'faibles',     label: 'Points faibles' },
  { id: 'activite',    label: 'Activité'       },
];

const SVM_MIN_RANKED = 3;         // sessions pour apparaître au classement (en dessous : listé, non numéroté)
const SVM_MIN_ATTEMPTS_TEAM = 5;  // tentatives minimales par ligne dans « Points faibles » (équipe)
const SVM_MIN_ATTEMPTS_USER = 3;  // idem pour un croupier seul (moins de volume)
const SVM_FACET_ROWS = 10;        // lignes max par facette (ex. les numéros de la roulette)
const SVM_INACTIVE_DAYS = 14;
const SVM_WEEKS = 12;

const SVM_LABELS = {
  'Type de mise': { plein: 'Plein (×35)', cheval: 'Cheval (×17)', transversale: 'Transversale (×11)', carre: 'Carré (×8)', sixain: 'Sixain (×5)' },
  // Ultimate Texas Hold'em
  'Combinaison': { 0: 'Carte haute', 1: 'Paire', 2: 'Double paire', 3: 'Brelan', 4: 'Quinte', 5: 'Couleur', 6: 'Full', 7: 'Carré', 8: 'Quinte flush', 9: 'Quinte flush royale' },
  'Piège': {
    roue: 'Quinte à la roue (A-2-3-4-5)', couleur_et_quinte: 'Couleur et quinte', deux_brelans: 'Deux brelans', trois_paires: 'Trois paires',
    carre_brelan: 'Carré et brelan', full_deux_paires: 'Brelan et deux paires', quinte_et_paire: 'Quinte et paire', couleur_et_paire: 'Couleur et paire',
  },
  'Situation': {
    category: 'Combinaisons différentes', kicker: 'Même combinaison (kicker)', unqualified: 'Banque non qualifiée', tie: 'Égalité',
    win: 'Le joueur gagne (Blind rendu)', blind: 'Le joueur gagne (Blind payé)', lose: 'La banque gagne', fold: 'Le joueur se couche', jackpot: 'Jackpot Prog',
  },
  'Mise': { ante: 'Ante', blind: 'Blind', play: 'Play', trips: 'Bonus (Trips)', jp1: 'Prog (JP1)' },
};

const _svm = {
  tab: 'classement',
  rankGame: 'roulette-conversion', rankLevel: null, rankRatio: 35,
  progUser: null, progGame: null, progLevel: null,
  weakGame: 'roulette-paiement', weakUser: null,
  actDays: 30,
};
let _svmUsers = [];            // training_activity : un croupier par ligne (sert aux sélecteurs)
const _svmSessions = {};       // user_id → sessions terminées (cache de la vue Progression)
let _svmToken = 0;             // ignore les réponses périmées quand on change de vue rapidement

// ── Démarrage et navigation ──────────────────────────
async function initSuiviManager() {
  try {
    _svmUsers = await SB.getTrainingActivity(30);
  } catch (e) {
    document.getElementById('svm-root').innerHTML = '<div class="sv-empty">Impossible de charger les résultats pour le moment. Réessaie dans quelques instants.</div>';
    return;
  }
  window.addEventListener('hashchange', function() { svmSync(true); });
  svmSync(false);
}

function svmParseHash() {
  const parts = decodeURIComponent((location.hash || '').replace(/^#/, '')).split('/');
  const tab = SVM_TABS.some(function(t) { return t.id === parts[0]; }) ? parts[0] : 'classement';
  return { tab: tab, user: svIsId(parts[1]) ? parts[1] : null };
}

function svmSync(scrollTop) {
  const h = svmParseHash();
  const changed = h.tab !== _svm.tab;
  _svm.tab = h.tab;
  if (h.tab === 'progression' && h.user) _svm.progUser = h.user;
  svmRender();
  if (scrollTop && changed) window.scrollTo(0, 0);
}

function svmGo(tab, user) {
  location.hash = tab + (user ? '/' + user : '');
}

// Depuis une ligne de classement ou d'activité : ouvre la progression de ce croupier
function svmOpenProg(userId, game, level) {
  if (!svIsId(userId)) return;
  if (game) { _svm.progGame = game; _svm.progLevel = level || null; }
  svmGo('progression', userId);
}

async function svmRender() {
  const token = ++_svmToken;
  const root = document.getElementById('svm-root');
  const head = svmTabs();
  root.innerHTML = head + '<div class="sv-empty">Chargement…</div>';

  const views = { classement: svmClassement, progression: svmProgression, faibles: svmFaibles, activite: svmActivite };
  let body;
  try {
    body = await views[_svm.tab]();
  } catch (e) {
    body = '<div class="sv-empty">Impossible de charger ces données pour le moment. Réessaie dans quelques instants.</div>';
  }
  if (token === _svmToken) root.innerHTML = head + body;
}

function svmTabs() {
  return '<div class="sv-tabs">' + SVM_TABS.map(function(t) {
    return '<button class="sv-tab' + (t.id === _svm.tab ? ' on' : '') + '" onclick="svmGo(\'' + t.id + '\')">' + t.label + '</button>';
  }).join('') + '</div>';
}

// ── Contrôles communs ────────────────────────────────
function svmModuleChips(current, fn, onlyKeys) {
  return SV_FAMILIES.map(function(f) {
    const mods = svModulesOf(f.id).filter(function(m) { return !onlyKeys || onlyKeys.indexOf(m.game) >= 0; });
    if (!mods.length) return '';
    return '<div class="svm-group"><span class="svm-group-label">' + f.name + ' ' + f.em + '</span><div class="sv-chips">'
      + mods.map(function(m) {
          return '<button class="sv-chip' + (m.game === current ? ' on' : '') + '" onclick="' + fn + '(\'' + m.game + '\')">' + m.name + ' ' + m.em + '</button>';
        }).join('') + '</div></div>';
  }).join('');
}

function svmLevelChips(current, fn, presentKeys) {
  const levels = SV_LEVELS.filter(function(l) { return !presentKeys || presentKeys.indexOf(l[0]) >= 0; });
  const chips = [['', 'Tous niveaux']].concat(levels);
  return '<div class="svm-group"><span class="svm-group-label">Niveau</span><div class="sv-chips">'
    + chips.map(function(c) {
        return '<button class="sv-chip' + ((current || '') === c[0] ? ' on' : '') + '" onclick="' + fn + '(\'' + c[0] + '\')">' + c[1] + '</button>';
      }).join('') + '</div></div>';
}

function svmUserSelect(current, fn, withTeam) {
  const users = _svmUsers.slice().sort(function(a, b) {
    return String(a.user_label || '').localeCompare(String(b.user_label || ''), 'fr');
  });
  return '<select class="svm-select" onchange="' + fn + '(this.value)">'
    + (withTeam ? '<option value="">Toute l\'équipe</option>' : '')
    + users.map(function(u) {
        return '<option value="' + svEsc(u.user_id) + '"' + (u.user_id === current ? ' selected' : '') + '>'
          + svEsc(u.user_label || '—') + ' (' + u.sessions_total + ')</option>';
      }).join('') + '</select>';
}

function svmEmpty(msg) {
  return '<div class="sv-empty">' + (msg || 'Pas de résultats') + '</div>';
}

// ══ 1. Classement ════════════════════════════════════
function svmSetRankGame(g)   { _svm.rankGame = g; _svm.rankLevel = null; svmRender(); }
function svmSetRankLevel(l)  { _svm.rankLevel = l || null; svmRender(); }
function svmSetRankRatio(r)  { _svm.rankRatio = Number(r); svmRender(); }

async function svmClassement() {
  const m = svModule(_svm.rankGame);
  let controls = '<div class="svm-controls">' + svmModuleChips(m.game, 'svmSetRankGame');
  if (m.levels) controls += svmLevelChips(_svm.rankLevel, 'svmSetRankLevel');
  if (m.timed) {
    controls += '<div class="svm-group"><span class="svm-group-label">Table</span><div class="sv-chips">'
      + SV_RATIOS.map(function(r) {
          return '<button class="sv-chip' + (r === _svm.rankRatio ? ' on' : '') + '" onclick="svmSetRankRatio(' + r + ')">× ' + r + '</button>';
        }).join('') + '</div></div>';
  }
  controls += '</div>';

  const rows = m.timed
    ? await SB.getTrainingTablesBest(_svm.rankRatio)
    : await SB.getTrainingRanking(m.game, m.levels ? _svm.rankLevel : null, SVM_MIN_RANKED);
  return controls + '<div class="card">' + (m.timed ? svmTimesTable(rows, m) : svmRankTable(rows, m)) + '</div>';
}

function svmRankTable(rows, m) {
  if (!rows.length) return svmEmpty();
  const ranked = rows.filter(function(r) { return r.ranked; });
  const others = rows.filter(function(r) { return !r.ranked; });
  const line = function(r, rank) {
    const pct = r.avg_recent || 0;
    return '<button class="svm-row svm-t-rank' + (rank ? '' : ' svm-dim') + '" onclick="svmOpenProg(\'' + svEsc(r.user_id) + '\',\'' + m.game + '\',' + (m.levels && _svm.rankLevel ? '\'' + _svm.rankLevel + '\'' : 'null') + ')">'
      + '<span class="svm-rank' + (rank && rank <= 3 ? ' top' : '') + '">' + (rank || '·') + '</span>'
      + '<span class="svm-name">' + svEsc(r.user_label || '—') + '</span>'
      + '<span class="svm-val svm-hide-m">' + r.sessions + '</span>'
      + '<span class="svm-val">' + pct + '<small>%</small></span>'
      + '<span class="sv-meter svm-hide-m"><i style="width:' + pct + '%"></i></span>'
      + '<span class="svm-val svm-hide-m">' + r.best_pct + '<small>%</small></span>'
      + '<span class="svm-date">' + svAgo(r.last_at) + '</span></button>';
  };
  let html = '<div class="svm-row svm-t-rank svm-head"><span>#</span><span>Croupier</span><span class="svm-hide-m">Sessions</span><span>Moy. 5 dern.</span><span class="svm-hide-m"></span><span class="svm-hide-m">Record</span><span>Dernière</span></div>';
  html += ranked.map(function(r, i) { return line(r, i + 1); }).join('');
  if (others.length) {
    html += '<div class="svm-sep">Moins de ' + SVM_MIN_RANKED + ' sessions — pas encore classés</div>';
    html += others.map(function(r) { return line(r, 0); }).join('');
  }
  return html;
}

function svmTimesTable(rows, m) {
  if (!rows.length) return svmEmpty();
  const timed = rows.filter(function(r) { return r.best_ms !== null; });
  const untimed = rows.filter(function(r) { return r.best_ms === null; });
  const line = function(r, rank) {
    return '<button class="svm-row svm-t-time' + (rank ? '' : ' svm-dim') + '" onclick="svmOpenProg(\'' + svEsc(r.user_id) + '\',\'' + m.game + '\',null)">'
      + '<span class="svm-rank' + (rank && rank <= 3 ? ' top' : '') + '">' + (rank || '·') + '</span>'
      + '<span class="svm-name">' + svEsc(r.user_label || '—') + '</span>'
      + '<span class="svm-val">' + (r.best_ms !== null ? svFormatTime(Number(r.best_ms)) : '—') + '</span>'
      + '<span class="svm-val svm-hide-m">' + r.perfect_runs + '</span>'
      + '<span class="svm-val svm-hide-m">' + r.sessions + '</span>'
      + '<span class="svm-date">' + svAgo(r.last_at) + '</span></button>';
  };
  let html = '<div class="svm-row svm-t-time svm-head"><span>#</span><span>Croupier</span><span>Meilleur temps</span><span class="svm-hide-m">Sans erreur</span><span class="svm-hide-m">Sessions</span><span>Dernière</span></div>';
  html += timed.map(function(r, i) { return line(r, i + 1); }).join('');
  if (untimed.length) {
    html += '<div class="svm-sep">Pas encore de temps — il faut une session sans erreur chronométrée</div>';
    html += untimed.map(function(r) { return line(r, 0); }).join('');
  }
  return html;
}

// ══ 2. Progression d'un croupier ═════════════════════
function svmSetProgUser(id)  {
  if (!svIsId(id)) return;
  _svm.progUser = id; _svm.progGame = null; _svm.progLevel = null;
  history.replaceState(null, '', '#progression/' + id);
  svmRender();
}
function svmSetProgGame(g)   { _svm.progGame = g; _svm.progLevel = null; svmRender(); }
function svmSetProgLevel(l)  { _svm.progLevel = l || null; svmRender(); }

async function svmProgression() {
  if (!_svmUsers.length) return svmEmpty();
  if (!_svmUsers.some(function(u) { return u.user_id === _svm.progUser; })) _svm.progUser = _svmUsers[0].user_id;

  if (!_svmSessions[_svm.progUser]) _svmSessions[_svm.progUser] = await SB.getTrainingSessionsOf(_svm.progUser);
  const all = _svmSessions[_svm.progUser].filter(function(s) { return svModule(s.game); });

  const counts = {};
  all.forEach(function(s) { counts[s.game] = (counts[s.game] || 0) + 1; });
  const playedKeys = Object.keys(counts);

  let html = '<div class="svm-controls"><div class="svm-group"><span class="svm-group-label">Croupier</span>'
    + svmUserSelect(_svm.progUser, 'svmSetProgUser', false) + '</div>';
  if (!playedKeys.length) return html + '</div>' + svmEmpty();

  if (!_svm.progGame || !counts[_svm.progGame]) {
    _svm.progGame = playedKeys.sort(function(a, b) { return counts[b] - counts[a]; })[0];
    _svm.progLevel = null;
  }
  const m = svModule(_svm.progGame);
  const ofModule = all.filter(function(s) { return s.game === m.game; });   // plus récente d'abord
  html += svmModuleChips(m.game, 'svmSetProgGame', playedKeys);
  if (m.levels) {
    const present = SV_LEVELS.map(function(l) { return l[0]; }).filter(function(k) {
      return ofModule.some(function(s) { return svLevelOf(s) === k; });
    });
    if (present.length) html += svmLevelChips(_svm.progLevel, 'svmSetProgLevel', present);
  }
  html += '</div>';

  const list = (m.levels && _svm.progLevel)
    ? ofModule.filter(function(s) { return svLevelOf(s) === _svm.progLevel; })
    : ofModule;
  if (!list.length) return html + svmEmpty();

  const st = svStats(list);
  html += '<div class="card"><div class="sv-head"><div class="sv-title">' + m.name + ' <em>' + m.em + '</em></div>'
    + '<div class="sv-caption">' + list.length + ' session' + (list.length > 1 ? 's' : '') + '</div></div>'
    + '<div class="sv-stats">'
    + stat('Sessions', st.count)
    + stat('Record', st.best + '<small>%</small>')
    + stat('Moy. ' + Math.min(SV_RECENT, list.length) + ' dernières', st.avg + '<small>%</small>')
    + '<div><div class="sv-stat-label">Tendance</div><div class="sv-stat-val">' + trendInline(st.trend) + '</div></div>'
    + '</div>'
    + svmChart(list)
    + (m.timed ? renderBestTimes(ofModule) : '')
    + '</div>';
  return html;
}

// Courbe de précision : un point par session, trait épais = moyenne glissante sur 5 sessions
function svmChart(listDesc) {
  const pts = listDesc.slice().reverse();                      // chronologique
  const n = pts.length;
  const root = document.getElementById('svm-root');
  const W = Math.min(720, Math.max(300, (root ? root.clientWidth : 640) - 64));
  const H = 210, PL = 34, PR = 10, PT = 12, PB = 26;
  const x = function(i) { return n === 1 ? PL + (W - PL - PR) / 2 : PL + i * (W - PL - PR) / (n - 1); };
  const y = function(p) { return PT + (100 - p) / 100 * (H - PT - PB); };

  const pct = pts.map(svPct);
  const roll = pct.map(function(_, i) {
    const a = pct.slice(Math.max(0, i - SV_RECENT + 1), i + 1);
    return a.reduce(function(s, v) { return s + v; }, 0) / a.length;
  });
  const line = function(vals) { return vals.map(function(v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' '); };
  const day = function(iso) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); };

  let svg = '<svg class="svm-chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Précision par session">';
  [0, 50, 100].forEach(function(g) {
    svg += '<line class="svm-grid" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y(g) + '" y2="' + y(g) + '"/>'
      + '<text class="svm-axis" x="' + (PL - 6) + '" y="' + (y(g) + 3) + '" text-anchor="end">' + g + '%</text>';
  });
  if (n > 1) svg += '<polyline class="svm-raw" points="' + line(pct) + '"/><polyline class="svm-avg" points="' + line(roll) + '"/>';
  pts.forEach(function(s, i) {
    const tip = svFormatDate(s.started_at) + ' · ' + s.correct + '/' + s.total + ' · ' + pct[i] + ' %';
    svg += '<circle class="svm-dot' + (i === n - 1 ? ' last' : '') + '" cx="' + x(i).toFixed(1) + '" cy="' + y(pct[i]).toFixed(1) + '" r="' + (i === n - 1 ? 5 : 3.5) + '"><title>' + tip + '</title></circle>';
  });
  svg += '<text class="svm-axis" x="' + PL + '" y="' + (H - 6) + '">' + day(pts[0].started_at) + '</text>'
    + (n > 1 ? '<text class="svm-axis" x="' + (W - PR) + '" y="' + (H - 6) + '" text-anchor="end">' + day(pts[n - 1].started_at) + '</text>' : '')
    + '</svg>';
  return '<div class="svm-chart-wrap">' + svg + '</div>'
    + '<div class="sv-caption">Un point par session · trait épais : moyenne glissante sur ' + SV_RECENT + ' sessions</div>';
}

// ══ 3. Points faibles ════════════════════════════════
function svmSetWeakGame(g) { _svm.weakGame = g; svmRender(); }
function svmSetWeakUser(id) { _svm.weakUser = svIsId(id) ? id : null; svmRender(); }

function svmFacetLabel(facet, value) {
  const map = SVM_LABELS[facet];
  if (map && map[value]) return map[value];
  if (facet === 'Valeur de pièce') return value + ' €';
  if (facet === 'Table') return '× ' + value;
  if (facet === 'Nombre de cartes') return value + ' cartes';
  return value;
}

async function svmFaibles() {
  const m = svModule(_svm.weakGame);
  const rows = await SB.getTrainingWeakPoints(m.game, _svm.weakUser);
  const minAttempts = _svm.weakUser ? SVM_MIN_ATTEMPTS_USER : SVM_MIN_ATTEMPTS_TEAM;

  let html = '<div class="svm-controls">' + svmModuleChips(m.game, 'svmSetWeakGame')
    + '<div class="svm-group"><span class="svm-group-label">Périmètre</span>'
    + svmUserSelect(_svm.weakUser, 'svmSetWeakUser', true) + '</div></div>';

  if (!rows.length) return html + svmEmpty();

  const facets = {};
  rows.forEach(function(r) {
    if (r.attempts < minAttempts) return;
    (facets[r.facet] = facets[r.facet] || []).push(r);
  });
  const names = Object.keys(facets);
  if (!names.length) return html + svmEmpty('Pas assez de tentatives (minimum ' + minAttempts + ' par ligne)');

  names.forEach(function(f) {
    const list = facets[f].map(function(r) {
      return { label: svmFacetLabel(r.facet, r.value), attempts: r.attempts, errors: r.errors, rate: Math.round(100 * r.errors / r.attempts) };
    }).sort(function(a, b) { return b.rate - a.rate || b.attempts - a.attempts; }).slice(0, SVM_FACET_ROWS);

    html += '<div class="card"><div class="sv-head"><div class="sv-title">' + svEsc(f) + '</div>'
      + '<div class="sv-caption">Triés par taux d\'erreur · minimum ' + minAttempts + ' tentatives</div></div>'
      + '<div class="svm-row svm-t-weak svm-head"><span>' + svEsc(f) + '</span><span class="svm-hide-m">Erreurs</span><span class="svm-hide-m">Tentatives</span><span>Taux d\'erreur</span></div>'
      + list.map(function(r) {
          const cls = r.rate >= 30 ? 'hi' : r.rate >= 15 ? 'mid' : 'lo';
          return '<div class="svm-row svm-t-weak"><span class="svm-name">' + svEsc(r.label) + '</span>'
            + '<span class="svm-val svm-hide-m">' + r.errors + '</span><span class="svm-val svm-hide-m">' + r.attempts + '</span>'
            + '<span class="svm-rate ' + cls + '"><span class="sv-meter"><i style="width:' + Math.min(r.rate, 100) + '%"></i></span><b>' + r.rate + '%</b></span></div>';
        }).join('') + '</div>';
  });

  if (m.game === 'uth-gains') {
    html += '<div class="sv-caption svm-note">Une donne est comptée une fois pour chaque mise corrigée : l\'action (je paie, je laisse, je ramasse) et, pour « je paie », le montant doivent être justes. Le jackpot n\'est pas corrigé.</div>';
  }
  if (m.game === 'roulette-paiement') {
    html += '<div class="sv-caption svm-note">Une question est comptée une fois pour chaque type de mise qu\'elle contient.</div>';
  }
  return html;
}

// ══ 4. Activité ══════════════════════════════════════
function svmSetActDays(n) { _svm.actDays = Number(n); svmRender(); }

function svmLocalIsoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function svmActivite() {
  const results = await Promise.all([SB.getTrainingActivity(_svm.actDays), SB.getTrainingActivityWeekly(SVM_WEEKS)]);
  const users = results[0], weekly = results[1];
  _svmUsers = users;
  if (!users.length) return svmEmpty();

  const periodSessions = users.reduce(function(a, u) { return a + u.sessions_period; }, 0);
  const active = users.filter(function(u) { return u.sessions_period > 0; }).length;
  const inactive = users.filter(function(u) { return (Date.now() - new Date(u.last_at).getTime()) / 86400000 > SVM_INACTIVE_DAYS; }).length;
  const last = users.reduce(function(a, u) { return u.last_at > a ? u.last_at : a; }, '');

  let html = '<div class="svm-controls"><div class="svm-group"><span class="svm-group-label">Période</span><div class="sv-chips">'
    + [7, 30, 90].map(function(n) {
        return '<button class="sv-chip' + (n === _svm.actDays ? ' on' : '') + '" onclick="svmSetActDays(' + n + ')">' + n + ' jours</button>';
      }).join('') + '</div></div></div>';

  html += '<div class="sv-metrics">'
    + metric('Sessions', periodSessions)
    + metric('Croupiers actifs', active + '<small>/ ' + users.length + '</small>')
    + metric('Inactifs +' + SVM_INACTIVE_DAYS + ' j', inactive)
    + '<div class="sv-metric"><div class="sv-metric-label">Dernière session</div><div class="sv-metric-val sv-sm">' + svFormatDay(last) + '</div></div></div>';

  // Sessions par semaine (les semaines sans activité sont complétées à 0)
  const byWeek = {};
  weekly.forEach(function(w) { byWeek[w.week_start] = w; });
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks = [];
  for (let i = SVM_WEEKS - 1; i >= 0; i--) {
    const d = new Date(monday); d.setDate(d.getDate() - 7 * i);
    const key = svmLocalIsoDate(d);
    weeks.push({ key: key, label: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'),
                 sessions: byWeek[key] ? byWeek[key].sessions : 0, users: byWeek[key] ? byWeek[key].users : 0 });
  }
  const maxW = Math.max.apply(null, weeks.map(function(w) { return w.sessions; })) || 1;
  html += '<div class="card"><div class="sv-head"><div class="sv-title">Sessions <em>par semaine</em></div>'
    + '<div class="sv-caption">' + SVM_WEEKS + ' dernières semaines</div></div><div class="svm-weeks">'
    + weeks.map(function(w, i) {
        return '<div class="svm-week" title="Semaine du ' + w.label + ' · ' + w.sessions + ' sessions · ' + w.users + ' croupier' + (w.users > 1 ? 's' : '') + '">'
          + '<span class="svm-week-n">' + (w.sessions || '') + '</span>'
          + '<div class="svm-week-bar' + (i === weeks.length - 1 ? ' last' : '') + '" style="height:' + Math.max(Math.round(100 * w.sessions / maxW), w.sessions ? 4 : 1) + '%"></div>'
          + '<span class="svm-week-l">' + w.label + '</span></div>';
      }).join('') + '</div></div>';

  html += '<div class="card"><div class="svm-row svm-t-act svm-head"><span>Croupier</span><span>Sessions (' + _svm.actDays + ' j)</span><span class="svm-hide-m">Jours actifs</span><span class="svm-hide-m">Total</span><span>Dernière</span></div>'
    + users.map(function(u) {
        const idle = (Date.now() - new Date(u.last_at).getTime()) / 86400000 > SVM_INACTIVE_DAYS;
        return '<button class="svm-row svm-t-act" onclick="svmOpenProg(\'' + svEsc(u.user_id) + '\',null,null)">'
          + '<span class="svm-name">' + svEsc(u.user_label || '—') + (idle ? ' <span class="svm-badge">Inactif</span>' : '') + '</span>'
          + '<span class="svm-val">' + u.sessions_period + '</span>'
          + '<span class="svm-val svm-hide-m">' + u.active_days + '</span>'
          + '<span class="svm-val svm-hide-m">' + u.sessions_total + '</span>'
          + '<span class="svm-date">' + svAgo(u.last_at) + '</span></button>';
      }).join('') + '</div>';
  return html;
}
