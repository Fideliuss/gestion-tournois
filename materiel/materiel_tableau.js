// ══════════════════════════════════════════════════════
//  MATÉRIEL - onglet Tableau de bord (chargé après materiel.js, dont il utilise PIECES, REF, FAMILLE, esc, $)
//  Reprend la feuille « Etat général » du Google Sheet d'origine : nombre de sixains par jeu et par statut, avec le détail par finition.
//  Chaque nombre ouvre la liste filtrée correspondante.
// ══════════════════════════════════════════════════════

function lienListe(n, jeu, statut, finition) {
  if (!n) return '<span class="mt-zero">0</span>';
  const q = new URLSearchParams();
  if (jeu) q.set('jeu', jeu);
  q.set('vue', statut);
  if (finition) q.set('finition', finition);
  return '<a class="mt-nb" href="#liste?' + esc(q.toString()) + '">' + n + '</a>';
}

function rendreTableau() {
  const sts = MATERIEL.statuts(REF, FAMILLE).map(function (s) { return s.statut; });
  const m = MATERIEL.matrice(PIECES, sts, MATERIEL.jeuxPourSelect(REF));
  const tete = '<tr><th>Jeu</th>' + sts.map(function (s) { return '<th class="mt-nbc"><span class="mt-st ' + MATERIEL.classe(s) + '">' + esc(s) + '</span></th>'; }).join('') + '<th class="mt-nbc">Total</th></tr>';
  const lignes = m.lignes.map(function (l) {
    const detail = !!l.finition;
    const nom = detail ? esc(l.finition) : esc(l.jeu) + (l.finitions && l.finitions.length === 1 ? ' <span class="mt-fin">' + esc(l.finitions[0]) + '</span>' : '');
    return '<tr class="' + (detail ? 'mt-sous' : 'mt-jeu') + '"><td>' + nom + '</td>' +
      sts.map(function (s) { return '<td class="mt-nbc">' + lienListe(l.parStatut[s], l.jeu, s, l.finition) + '</td>'; }).join('') +
      '<td class="mt-nbc mt-tot">' + l.total + '</td></tr>';
  }).join('');
  const total = '<tr class="mt-total"><td>Total</td>' + sts.map(function (s) { return '<td class="mt-nbc">' + lienListe(m.total.parStatut[s], '', s, '') + '</td>'; }).join('') +
    '<td class="mt-nbc mt-tot">' + m.total.total + '</td></tr>';
  $('vue-tableau').innerHTML = '<div class="card mt-bloc"><div class="mt-defile"><table class="mt-matrice"><thead>' + tete + '</thead><tbody>' + lignes + total + '</tbody></table></div></div>';
}
