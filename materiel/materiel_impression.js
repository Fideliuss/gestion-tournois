// ══════════════════════════════════════════════════════
//  MATÉRIEL - feuilles imprimables (chargé après materiel.js, dont il utilise PIECES, REF, FAMILLE, esc, $, toast)
//  Même principe que la Break list : le contenu est posé dans #mt-print, la page n'affiche que lui à l'impression (classe mt-imprime sur body).
//  - Pointage du dépôt : une page A4 avec tous les sixains du dépôt, une case à cocher par numéro, pour vérifier sur place que rien ne manque.
// ══════════════════════════════════════════════════════

// Une feuille doit tenir sur une page A4 : on la mesure hors écran (mêmes règles qu'à l'impression) et, si elle dépasse, on la réduit (jamais sous 55 %)
const PAGE_UTILE_MM = 270;                                  // A4 (297) moins les marges de 8 mm, avec une réserve pour les écarts de rendu entre navigateurs
function ajusterPage() {
  const el = $('mt-print'), page = el.firstElementChild;
  if (!page) return;
  el.style.cssText = 'display:block;position:absolute;visibility:hidden;left:-9999px;top:0;width:194mm;';
  const h = page.getBoundingClientRect().height;
  el.removeAttribute('style');
  const dispo = PAGE_UTILE_MM * 96 / 25.4;
  if (h > dispo) page.style.zoom = String(Math.max(0.55, Math.floor(dispo / h * 100) / 100));
}

function lancerImpression(html, titre) {
  $('mt-print').innerHTML = html;
  ajusterPage();
  document.body.classList.add('mt-imprime');
  const page = document.createElement('style');
  page.textContent = '@page { size: A4 portrait; margin: 8mm; }';
  document.head.appendChild(page);
  const fin = function () {
    document.body.classList.remove('mt-imprime'); page.remove(); $('mt-print').innerHTML = '';
    window.removeEventListener('afterprint', fin);
  };
  window.addEventListener('afterprint', fin);
  printWithTitle(titre);
  setTimeout(fin, 1500);                                   // repli si `afterprint` n'est pas émis
}

// ── Pointage du dépôt ────────────────────────────────
function imprimerPointage() {
  const sts = MATERIEL.statuts(REF, FAMILLE).map(function (s) { return s.statut; });
  const pt = MATERIEL.pointage(PIECES, MATERIEL.jeuxPourSelect(REF), sts);
  if (!pt.total) { toast('Aucun sixain au dépôt à pointer', true); return; }
  const date = MATERIEL.dateFr(MATERIEL.aujourdhui());
  const fs = pt.total <= 70 ? 13 : pt.total <= 110 ? 12 : pt.total <= 160 ? 11 : 10;       // plus il y en a, plus on resserre, pour tenir sur une page
  const blocs = pt.blocs.map(function (b) {
    const sousTitre = b.finitions.length === 1 ? '<span class="pt-fin">' + esc(b.finitions[0]) + '</span>' : '';
    const lignes = b.groupes.map(function (g) {
      const lib = esc(g.statut) + ' <i>' + g.ids.length + '</i>' + (g.finition ? '<span class="pt-fin">' + esc(g.finition) + '</span>' : '');
      return '<div class="pt-ligne"><div class="pt-lib">' + lib + '</div><div class="pt-cells">' +
        g.ids.map(function (id) { return '<span class="pt-c"><b class="pt-case"></b>' + esc(id) + '</span>'; }).join('') + '</div></div>';
    }).join('');
    return '<div class="pt-jeu"><div class="pt-jeu-t"><b>' + esc(b.jeu) + '</b>' + sousTitre + '<span class="pt-n">' + b.total + (b.total > 1 ? ' sixains' : ' sixain') + '</span></div>' + lignes + '</div>';
  }).join('');
  const html = '<section class="pt-page" style="--pt-fs:' + fs + 'px">' +
    '<div class="pt-tete"><div class="pt-titre">Pointage du dépôt des sixains</div><div class="pt-meta">Le ' + esc(date) + ' · ' + pt.total + (pt.total > 1 ? ' sixains' : ' sixain') + ' au dépôt</div></div>' +
    blocs +
    '<div class="pt-pied"><div class="pt-ecarts"><span>Écarts constatés</span></div>' +
    '<div class="pt-sign"><span>Pointé par : </span><span>Date : </span></div></div></section>';
  lancerImpression(html, 'Pointage des sixains - ' + date.replace(/\//g, '-'));
}

// ── Bilan de destruction (feuille à transmettre au directeur des jeux) ───
// Seulement le bilan par jeu, tel qu'il est affiché dans l'onglet Destruction.
function imprimerBilan() {
  const bilan = MATERIEL.bilanJeux(PIECES, MATERIEL.jeuxPourSelect(REF));
  const date = MATERIEL.dateFr(MATERIEL.aujourdhui());
  const ligne = function (l, total) {
    return '<tr' + (total ? ' class="bd-total"' : '') + '><th scope="row">' + esc(l.jeu) + '</th><td>' + l.stock + '</td><td>' + l.entrees + '</td><td>' + l.sorties + '</td><td class="bd-fort">' + l.depot + '</td>' +
      '<td class="bd-g">' + l.neuf + '</td><td>' + l.enService + '</td><td>' + l.horsUsage + '</td><td class="bd-fort">' + l.total + '</td></tr>';
  };
  const html = '<section class="pt-page bd-page">' +
    '<div class="pt-tete"><div class="pt-titre">Destruction des sixains</div><div class="pt-meta">Le ' + esc(date) + '</div></div>' +
    '<table class="bd-tab"><thead><tr><th>Jeux</th><th>Stock initial</th><th>Entrées</th><th>Sorties</th><th>En dépôt</th><th class="bd-g">Neuf</th><th>En service</th><th>Hors d\'usage</th><th>Total</th></tr></thead><tbody>' +
    bilan.lignes.map(function (l) { return ligne(l, false); }).join('') + ligne(bilan.total, true) + '</tbody></table></section>';
  lancerImpression(html, 'Destruction des sixains - ' + date.replace(/\//g, '-'));
}
