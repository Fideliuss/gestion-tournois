// ══════════════════════════════════════════════════════
//  MATÉRIEL - onglet Destruction (chargé après materiel.js, dont il utilise PIECES, REF, FAMILLE, OCCUPE, MAX_LOT, esc, $, toast, fusionner,
//  ouvrirModal, fermerModal, erreurModal)
//  Reprend la feuille « Destruction » du Google Sheet d'origine : par jeu, stock actuel + entrées (A intégrer) - sorties (A détruire) = sixains
//  en dépôt après la destruction. On choisit les sixains « A détruire » (en général une douzaine), on valide une SESSION (date, référence) :
//  les fiches passent à « Détruit » avec cette session, ce qui permet de retrouver ce qui est sorti au registre officiel.
// ══════════════════════════════════════════════════════

let SEL_D = [];                                          // identifiants des fiches choisies pour la destruction
let FORM_D = { date: '', reference: '', note: '' };      // valeurs du formulaire, gardées d'un affichage à l'autre

function initDestruction() {
  const v = $('vue-destruction');
  v.addEventListener('change', changeDestruction);
  v.addEventListener('input', function (e) {
    const k = { 'mt-d-date': 'date', 'mt-d-ref': 'reference', 'mt-d-note': 'note' }[e.target.id];
    if (k) { FORM_D[k] = e.target.value; majBoutonDestruction(); }
  });
  v.addEventListener('click', clicDestruction);
}

function rendreDestruction() {
  if (!FORM_D.date) FORM_D.date = MATERIEL.aujourdhui();
  const jeux = MATERIEL.jeuxPourSelect(REF);
  const bilan = MATERIEL.bilanJeux(PIECES, jeux);
  const groupes = MATERIEL.aDetruireParJeu(PIECES);
  const ordre = jeux.concat(Object.keys(groupes).filter(function (j) { return jeux.indexOf(j) < 0; })).filter(function (j) { return groupes[j]; });
  SEL_D = SEL_D.filter(function (id) { return PIECES.some(function (p) { return p.id === id && p.statut === 'A détruire'; }); });
  const nb = function (n, jeu, statut) { return n ? '<a class="mt-nb" href="#liste?' + esc(new URLSearchParams({ jeu: jeu, vue: statut }).toString()) + '">' + n + '</a>' : '<span class="mt-zero">0</span>'; };

  const ligneBilan = function (l, total) {
    return '<tr' + (total ? ' class="mt-total"' : '') + '><td>' + esc(l.jeu) + '</td><td class="mt-nbc">' + l.stock + '</td><td class="mt-nbc">' + (total ? l.entrees : nb(l.entrees, l.jeu, 'A intégrer')) + '</td>' +
      '<td class="mt-nbc">' + (total ? l.sorties : nb(l.sorties, l.jeu, 'A détruire')) + '</td><td class="mt-nbc mt-tot">' + l.apres + '</td></tr>';
  };
  const carteBilan = '<div class="card mt-bloc"><div class="sec">Bilan par jeu</div><div class="mt-defile"><table class="mt-matrice mt-bilan"><thead><tr><th>Jeu</th>' +
    '<th class="mt-nbc" title="Neuf + En service + Hors d\'usage + A détruire">Stock actuel</th><th class="mt-nbc" title="Sixains « A intégrer »">Entrées</th>' +
    '<th class="mt-nbc" title="Sixains « A détruire »">Sorties</th><th class="mt-nbc" title="Stock actuel + entrées - sorties">En dépôt après</th></tr></thead><tbody>' +
    bilan.lignes.map(function (l) { return ligneBilan(l, false); }).join('') + ligneBilan(bilan.total, true) + '</tbody></table></div></div>';

  let carteChoix;
  if (!ordre.length) {
    carteChoix = '<div class="card mt-bloc"><div class="sec">Sixains à détruire</div><p class="mt-etat" role="status">Aucun sixain à détruire.</p></div>';
  } else {
    const blocs = ordre.map(function (j) {
      const fiches = groupes[j];
      const tous = fiches.every(function (p) { return SEL_D.indexOf(p.id) >= 0; });
      return '<div class="mt-groupe"><label class="mt-groupe-t"><input type="checkbox" data-d-jeu="' + esc(j) + '"' + (tous ? ' checked' : '') + ' /> ' + esc(j) + ' <span class="mt-compte">' + fiches.length + '</span></label>' +
        '<div class="mt-pastilles">' + fiches.map(function (p) {
          return '<label class="mt-pastille"><input type="checkbox" data-d-id="' + esc(p.id) + '"' + (SEL_D.indexOf(p.id) >= 0 ? ' checked' : '') + ' /> ' + esc(p.identifiant) + '</label>';
        }).join('') + '</div></div>';
    }).join('');
    carteChoix = '<div class="card mt-bloc"><div class="sec">Sixains à détruire</div>' + blocs +
      '<div class="mt-form"><div class="fg"><label class="fl" for="mt-d-date">Date de la destruction</label><input type="date" id="mt-d-date" value="' + esc(FORM_D.date) + '" /></div>' +
      '<div class="fg"><label class="fl" for="mt-d-ref">Référence (facultatif)</label><input type="text" id="mt-d-ref" maxlength="80" value="' + esc(FORM_D.reference) + '" autocomplete="off" /></div>' +
      '<div class="fg"><label class="fl" for="mt-d-note">Note (facultatif)</label><input type="text" id="mt-d-note" maxlength="500" value="' + esc(FORM_D.note) + '" autocomplete="off" /></div></div>' +
      '<div class="mt-actions"><button type="button" class="btn btn-red" id="mt-d-ok" disabled>Détruire la sélection</button>' +
      '<button type="button" class="btn btn-ghost" data-d-copier>Copier la liste</button><span class="mt-info" id="mt-d-info"></span></div></div>';
  }

  const sessions = MATERIEL.sessionsResume(PIECES, REF.destructions);
  const carteSessions = '<div class="card mt-bloc"><div class="sec">Sessions de destruction</div>' + (sessions.length ? sessions.map(function (s) {
    const titre = s.date ? MATERIEL.dateFr(s.date) : esc(s.reference || 'Avant l\'outil');
    return '<details class="mt-session"><summary><span class="mt-sdate">' + titre + '</span>' + (s.date && s.reference ? '<span class="mt-sref">' + esc(s.reference) + '</span>' : '') +
      '<span class="mt-compte">' + s.total + (s.total > 1 ? ' sixains' : ' sixain') + '</span></summary>' +
      '<div class="mt-sbody">' + (s.note ? '<p class="mt-info">' + esc(s.note) + '</p>' : '') +
      (s.total ? '<pre class="mt-liste-texte">' + esc(MATERIEL.texteListe(s.parJeu)) + '</pre><button type="button" class="btn btn-ghost btn-sm" data-d-copier-session="' + esc(s.id) + '">Copier la liste</button>' : '<p class="mt-info">Aucun sixain dans cette session.</p>') +
      '</div></details>';
  }).join('') : '<p class="mt-etat" role="status">Aucune session pour le moment.</p>') + '</div>';

  $('vue-destruction').innerHTML = carteBilan + carteChoix + carteSessions;
  majBoutonDestruction();
}

// Bouton et indication, mis à jour sans tout redessiner (pour ne pas perdre le curseur dans un champ)
function majBoutonDestruction() {
  const b = $('mt-d-ok');
  if (!b) return;
  const n = SEL_D.length;
  b.textContent = n ? 'Détruire la sélection (' + n + ')' : 'Détruire la sélection';
  b.disabled = !(n && FORM_D.date && n <= MAX_LOT);
  $('mt-d-info').textContent = n > MAX_LOT ? MAX_LOT + ' sixains au maximum par session' : '';
}

function changeDestruction(e) {
  const jeu = e.target.dataset && e.target.dataset.dJeu;
  if (jeu !== undefined) {
    const ids = (MATERIEL.aDetruireParJeu(PIECES)[jeu] || []).map(function (p) { return p.id; });
    SEL_D = SEL_D.filter(function (id) { return ids.indexOf(id) < 0; });
    if (e.target.checked) SEL_D = SEL_D.concat(ids);
    return rendreDestruction();
  }
  const id = e.target.dataset && e.target.dataset.dId;
  if (id) {
    SEL_D = SEL_D.filter(function (x) { return x !== id; });
    if (e.target.checked) SEL_D.push(id);
    const p = PIECES.find(function (x) { return x.id === id; });
    const grp = document.querySelector('[data-d-jeu="' + (p ? p.jeu : '').replace(/"/g, '') + '"]');
    if (grp) grp.checked = (MATERIEL.aDetruireParJeu(PIECES)[p.jeu] || []).every(function (q) { return SEL_D.indexOf(q.id) >= 0; });
    majBoutonDestruction();
  }
}

function groupesChoisis(ids) {
  const parJeu = {};
  MATERIEL.trier(PIECES.filter(function (p) { return ids.indexOf(p.id) >= 0; })).forEach(function (p) { (parJeu[p.jeu] = parJeu[p.jeu] || []).push(p.identifiant); });
  return parJeu;
}

function clicDestruction(e) {
  if (e.target.closest('#mt-d-ok')) return confirmerDestruction();
  if (e.target.closest('[data-d-copier]')) {
    const ids = SEL_D.length ? SEL_D : PIECES.filter(function (p) { return p.statut === 'A détruire'; }).map(function (p) { return p.id; });
    return copier(MATERIEL.texteListe(groupesChoisis(ids)));
  }
  const s = e.target.closest('[data-d-copier-session]');
  if (s) {
    const r = MATERIEL.sessionsResume(PIECES, REF.destructions).find(function (x) { return x.id === s.dataset.dCopierSession; });
    if (r) copier(MATERIEL.texteListe(r.parJeu));
  }
}

async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    toast('Liste copiée');
  } catch (e) {
    const t = document.createElement('textarea');                 // repli : pages servies sans connexion sécurisée
    t.value = texte; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(t);
    toast(ok ? 'Liste copiée' : 'Copie impossible : sélectionnez la liste à la main', !ok);
  }
}

// ── Validation d'une session de destruction ──────────
function confirmerDestruction() {
  const ids = SEL_D.slice();
  if (!ids.length || !FORM_D.date) return;
  const parJeu = groupesChoisis(ids);
  const box = ouvrirModal('<h2>Détruire ' + ids.length + (ids.length > 1 ? ' sixains' : ' sixain') + ' ?</h2>' +
    '<p class="mt-info">Session du ' + esc(MATERIEL.dateFr(FORM_D.date)) + (FORM_D.reference.trim() ? ' (' + esc(FORM_D.reference.trim()) + ')' : '') + '. Les fiches passeront à « Détruit ».</p>' +
    '<pre class="mt-liste-texte">' + esc(MATERIEL.texteListe(parJeu)) + '</pre>' +
    '<div class="mt-err-zone"></div><div class="mt-actions"><button type="button" class="btn btn-red" data-d-confirmer>Confirmer la destruction</button><button type="button" class="btn btn-ghost" data-fermer>Annuler</button></div>');
  box.querySelectorAll('[data-fermer]').forEach(function (b) { b.addEventListener('click', fermerModal); });
  box.querySelector('[data-d-confirmer]').addEventListener('click', async function () {
    if (OCCUPE) return;
    OCCUPE = true; this.disabled = true; erreurModal('');
    let session = null;
    try {
      session = await SB.createMaterielDestruction({ date_destruction: FORM_D.date, reference: FORM_D.reference.trim(), note: FORM_D.note.trim() });
      fusionner(await SB.changerMaterielStatut(ids, 'Détruit', { sessionId: session.id }));
      REF.destructions.push(session);
      SEL_D = []; FORM_D = { date: '', reference: '', note: '' };
      toast(ids.length + (ids.length > 1 ? ' sixains détruits' : ' sixain détruit'));
      fermerModal(); rendre();
    } catch (err) {
      if (session) { try { await SB.deleteMaterielDestruction(session.id); } catch (e2) { /* la session vide reste visible, on la retrouve dans la liste */ } }
      erreurModal(MATERIEL.traduireErreur(err));
      this.disabled = false;
    } finally { OCCUPE = false; }
  });
}
