// ══════════════════════════════════════════════════════
//  SUIVI - constantes et calculs partagés
//  Utilisé par suivi_croupier (Mes résultats) et, à l'étape 3, suivi_manager
// ══════════════════════════════════════════════════════

// Jeux (regroupement des modules).
const SV_FAMILIES = [
  { id: 'blackjack', name: 'Black',    em: 'Jack'     },
  { id: 'roulette',  name: 'Roulette', em: 'Anglaise' },
  { id: 'uth',       name: 'Ultimate', em: "Texas Hold'em" },
];

// Modules suivis. `game` = clé en base (training_sessions.game), `family` = jeu parent.
// roulette-mixte (module abandonné) n'y figure volontairement pas.
const SV_MODULES = [
  { game: 'blackjack',           family: 'blackjack', name: 'BJ',         em: 'Paiement',       levels: false },
  { game: 'blackjack-score',     family: 'blackjack', name: 'BJ',         em: 'Score',          levels: true  },
  { game: 'roulette-paiement',   family: 'roulette',  name: 'Calcul',     em: 'Paiement',       levels: true  },
  { game: 'roulette-conversion', family: 'roulette',  name: 'Conversion', em: 'Pièces',         levels: true  },
  { game: 'roulette-couleur',    family: 'roulette',  name: 'Couleur',    em: 'Numéro',         levels: true  },
  { game: 'roulette-pointage',   family: 'roulette',  name: 'Pointage',   em: 'Numéro',         levels: true  },
  { game: 'roulette-tables',     family: 'roulette',  name: 'Tables',     em: 'Multiplication', levels: false, timed: true },
  { game: 'uth-main',            family: 'uth',       name: 'Meilleure',  em: 'Main',           levels: false },
  { game: 'uth-gagnant',         family: 'uth',       name: 'Qui',        em: 'Gagne ?',        levels: false },
  { game: 'uth-gains',           family: 'uth',       name: 'Calcul des', em: 'Gains',          levels: false },
];

const SV_LEVELS = [['facile', 'Facile'], ['medium', 'Médium'], ['expert', 'Expert']];
const SV_RATIOS = [35, 17, 11, 8, 5];

// Tendance : moyenne des 5 dernières sessions vs les 5 précédentes (il faut au moins 3 sessions de référence)
const SV_RECENT = 5;
const SV_MIN_PREV = 3;

function svFamily(id) {
  return SV_FAMILIES.find(function(f) { return f.id === id; }) || null;
}

function svModulesOf(familyId) {
  return SV_MODULES.filter(function(m) { return m.family === familyId; });
}

function svModule(game) {
  return SV_MODULES.find(function(m) { return m.game === game; }) || null;
}

function svPct(s) {
  return s.total ? Math.round((s.correct / s.total) * 100) : 0;
}

function svLevelLabel(level) {
  const l = SV_LEVELS.find(function(x) { return x[0] === level; });
  return l ? l[1] : null;
}

function svLevelOf(s) {
  return (s.meta && s.meta.level) || null;
}

function svAvg(list) {
  if (!list.length) return null;
  return Math.round(list.reduce(function(a, s) { return a + svPct(s); }, 0) / list.length);
}

// sessions : triées de la plus récente à la plus ancienne
function svStats(sessions) {
  const recent = sessions.slice(0, SV_RECENT);
  const prev   = sessions.slice(SV_RECENT, SV_RECENT * 2);
  const avgRecent = svAvg(recent);
  const avgPrev   = prev.length >= SV_MIN_PREV ? svAvg(prev) : null;
  return {
    count: sessions.length,
    best:  sessions.length ? Math.max.apply(null, sessions.map(svPct)) : null,
    avg:   avgRecent,
    trend: avgPrev === null ? null : avgRecent - avgPrev,
  };
}

// Meilleur temps (Tables) par table : uniquement les sessions sans erreur, avec un chrono mesuré
function svBestTimes(sessions) {
  const out = {};
  sessions.forEach(function(s) {
    const ms = s.meta && s.meta.elapsedMs, ratio = s.meta && s.meta.ratio;
    if (!ms || !ratio || s.correct !== s.total) return;
    if (!(ratio in out) || ms < out[ratio]) out[ratio] = ms;
  });
  return out;
}

// m:ss.t - identique au chrono du module Tables
function svFormatTime(ms) {
  const t = Math.floor(ms / 100) / 10;
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function svFormatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function svFormatDay(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Les libellés (user_label…) viennent de la base : toujours échapper avant injection dans innerHTML
function svEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// uuid reçu de la base, avant de le placer dans un attribut onclick
function svIsId(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));
}

function svAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'aujourd\'hui';
  if (days === 1) return 'hier';
  if (days < 60) return 'il y a ' + days + ' j';
  return 'il y a ' + Math.round(days / 30) + ' mois';
}

// ── Blocs d'affichage partagés (vue croupier + vue manager) ──
function metric(label, val) {
  return '<div class="sv-metric"><div class="sv-metric-label">' + label + '</div>'
    + '<div class="sv-metric-val">' + val + '</div></div>';
}

function stat(label, val) {
  return '<div><div class="sv-stat-label">' + label + '</div><div class="sv-stat-val">' + val + '</div></div>';
}

function trendInline(trend) {
  if (trend === null) {
    // Message explicite plutôt qu'un tiret : il faut SV_RECENT sessions récentes + SV_MIN_PREV de comparaison
    return '<span class="sv-flat sv-trend-none" title="Il faut au moins ' + (SV_RECENT + SV_MIN_PREV)
      + ' sessions pour comparer les ' + SV_RECENT + ' dernières aux précédentes">Pas assez de sessions</span>';
  }
  if (trend > 0) return '<span class="sv-up">▲ ' + trend + '<small>pts</small></span>';
  if (trend < 0) return '<span class="sv-down">▼ ' + Math.abs(trend) + '<small>pts</small></span>';
  return '<span class="sv-flat">= 0<small>pt</small></span>';
}

function renderBestTimes(all) {
  const best = svBestTimes(all);
  return '<div class="sv-times">' + SV_RATIOS.map(function(r) {
    const ms = best[r];
    return '<div class="sv-time"><div class="sv-time-ratio">× ' + r + '</div>'
      + '<div class="sv-time-val' + (ms ? '' : ' none') + '">' + (ms ? svFormatTime(ms) : '-') + '</div></div>';
  }).join('') + '</div>'
    + '<div class="sv-caption" style="margin-top:6px">Meilleur temps par table - sessions sans erreur uniquement</div>';
}
