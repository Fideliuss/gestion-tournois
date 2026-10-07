// ══════════════════════════════════════════════════════
//  BREAK LIST - helpers communs aux pages (réglages, messages, dates)
//  À charger après break_list_core.js et supabase.js
// ══════════════════════════════════════════════════════

let BL_CONFIG = null;

/** Fusion profonde : les objets se fusionnent, tableaux et valeurs simples de `over` remplacent ceux de `def` */
function blMerge(def, over) {
  if (over == null) return JSON.parse(JSON.stringify(def));
  if (Array.isArray(def) || typeof def !== 'object' || def === null) return over;
  const out = {};
  Object.keys(def).forEach(function (k) { out[k] = k in over ? blMerge(def[k], over[k]) : JSON.parse(JSON.stringify(def[k])); });
  Object.keys(over).forEach(function (k) { if (!(k in out)) out[k] = over[k]; });   // clés ajoutées plus tard (aliases...)
  return out;
}

/** Réglages enregistrés, complétés par les valeurs par défaut pour toute clé manquante */
async function blLoadConfig() {
  let saved = null;
  try { saved = await SB.getBreakListConfig(); } catch (e) { console.warn('Réglages Break list : lecture impossible', e); }
  BL_CONFIG = blMerge(BL_DEFAULT_CONFIG, saved);
  return BL_CONFIG;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

function blPad(n) { return String(n).padStart(2, '0'); }

/** « mercredi 07 octobre 2026 » */
function blDateLabel(y, m, d) {
  return BL_JOURS[new Date(y, m - 1, d).getDay()] + ' ' + blPad(d) + ' ' + BL_MOIS[m - 1] + ' ' + y;
}

function blDaysIn(y, m) { return new Date(y, m, 0).getDate(); }

function blMonthLabel(y, m) {
  const n = BL_MOIS[m - 1];
  return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + y;
}

/** Petit message en bas de page */
function flash(msg) {
  let t = document.getElementById('bl-toast');
  if (!t) { t = document.createElement('div'); t.id = 'bl-toast'; t.className = 'bl-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(flash._t); flash._t = setTimeout(function () { t.classList.remove('on'); }, 2400);
}

/** « 12 octobre 2026 à 18:05 » */
function blStamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.getDate() + ' ' + BL_MOIS[d.getMonth()] + ' ' + d.getFullYear() + ' à ' + blPad(d.getHours()) + ':' + blPad(d.getMinutes());
}
