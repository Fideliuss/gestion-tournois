// ══════════════════════════════════════════════════════
//  HTML - échappement partagé (testé sous Node : voir html.test.js)
//
//  À utiliser pour TOUTE donnée qui vient de la base ou de l'utilisateur (noms, adresses, libellés...) avant de
//  l'insérer dans du HTML construit en chaîne (innerHTML, gabarits) :  `<td>${escapeHtml(e.nom)}</td>`
//  Valable dans le texte et dans les attributs entre guillemets : `value="${escapeHtml(nom)}"`.
//
//  NE PAS s'en servir pour passer une donnée à un `onclick="f('…')"` : le navigateur décode les entités AVANT d'exécuter
//  le JavaScript, l'échappement HTML n'y protège donc pas. Passer la donnée par un attribut `data-*` (échappé avec
//  escapeHtml) et la lire dans un écouteur d'événements (`el.dataset.xxx`).
//
//  Charger ce fichier avant les scripts de la page (la page de connexion et l'accueil n'en ont pas besoin).
// ══════════════════════════════════════════════════════

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { escapeHtml: escapeHtml };
