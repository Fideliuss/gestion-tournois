// ══════════════════════════════════════════════════════
//  SAISONS - saison d'une date (testé sous Node : voir saisons.test.js)
//
//  Clé d'une saison = année de début : 2025 → saison 2025 / 2026. Par défaut elle court du 1er novembre au 31 octobre.
//  `fins` = { saison: 'AAAA-MM-JJ' } : dernier jour (inclus) des saisons dont la direction a fixé la fin à une autre date
//  (table saisons_fins). Mêmes règles que saison_de() côté base (supabase/migrations/saisons_fin_variable.sql).
// ══════════════════════════════════════════════════════

/* Saison d'une date 'AAAA-MM-JJ' : celle du calendrier, décalée si la fin de cette saison ou de la précédente a été déplacée */
function saisonDe(date, fins) {
  const [y, m] = date.split('-').map(Number);
  const c = m >= 11 ? y : y - 1;
  if (fins[c] && date > fins[c]) return c + 1;
  if (fins[c - 1] && date <= fins[c - 1]) return c - 1;
  return c;
}

/* Dernier jour de la saison : la fin fixée, sinon le 31 octobre */
function finDeSaison(saison, fins) {
  return fins[saison] || `${saison + 1}-10-31`;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { saisonDe: saisonDe, finDeSaison: finDeSaison };
