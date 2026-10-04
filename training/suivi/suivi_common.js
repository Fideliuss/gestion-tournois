// ══════════════════════════════════════════════════════
//  SUIVI — constantes et calculs partagés
//  Utilisé par suivi_croupier (Mes résultats) et, à l'étape 3, suivi_manager
// ══════════════════════════════════════════════════════

// Modules suivis. `legacy` (roulette-mixte, module abandonné) n'y figure volontairement pas.
const SV_MODULES = [
  { game: 'blackjack',           name: 'BJ',         em: 'Paiement',       levels: false },
  { game: 'blackjack-score',     name: 'BJ',         em: 'Score',          levels: true  },
  { game: 'roulette-paiement',   name: 'Calcul',     em: 'Paiement',       levels: true  },
  { game: 'roulette-conversion', name: 'Conversion', em: 'Pièces',         levels: true  },
  { game: 'roulette-couleur',    name: 'Couleur',    em: 'Numéro',         levels: true  },
  { game: 'roulette-pointage',   name: 'Pointage',   em: 'Numéro',         levels: true  },
  { game: 'roulette-tables',     name: 'Tables',     em: 'Multiplication', levels: false, timed: true },
];

const SV_LEVELS = [['facile', 'Facile'], ['medium', 'Médium'], ['expert', 'Expert']];
const SV_RATIOS = [35, 17, 11, 8, 5];

// Tendance : moyenne des 5 dernières sessions vs les 5 précédentes (il faut au moins 3 sessions de référence)
const SV_RECENT = 5;
const SV_MIN_PREV = 3;

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

// m:ss.t — identique au chrono du module Tables
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
