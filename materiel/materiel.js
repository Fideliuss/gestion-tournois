// ══════════════════════════════════════════════════════
//  MATÉRIEL - page Sixains (chargée après materiel_core.js, shared/html.js, shared/supabase.js et shared/auth.js)
//  Suivi quotidien : ouvrir un sixain (Neuf, En service), le mettre hors d'usage, préparer les destructions. Les règles (séquence des
//  statuts, retour avec motif, numéro unique, jeu fixé) sont imposées par la base (supabase/migrations/materiel.sql) ;
//  l'écran propose les bons boutons et traduit les refus.
// ══════════════════════════════════════════════════════

const FAMILLE = 'sixain';
const MAX_LOT = 100;                          // fiches modifiées en une seule requête
const NOUVELLE = '__nouvelle';

let REF = null;                               // jeux, statuts, transitions, marques, destructions
let PIECES = [];
let FILTRE = { vue: 'cours', jeu: '', finition: '', marque: '', q: '' };
let SEL = [];                                 // identifiants des fiches cochées
let OCCUPE = false;                           // une écriture est en cours : on ignore les doubles clics
let FOCUS_AVANT = null;

const $ = function (id) { return document.getElementById(id); };
const esc = escapeHtml;

// ── Démarrage ────────────────────────────────────────
async function initMateriel() {
  try {
    const [ref, pieces] = await Promise.all([SB.getMaterielRef(), SB.listMaterielPieces(FAMILLE)]);
    REF = ref; PIECES = pieces;
  } catch (e) {
    $('mt-erreur').hidden = false;
    $('mt-erreur').textContent = 'Impossible de charger le matériel : ' + MATERIEL.traduireErreur(e);
    $('mt-liste').innerHTML = '';
    return;
  }
  $('mt-statuts').addEventListener('click', function (e) { const b = e.target.closest('[data-vue]'); if (b) { FILTRE.vue = b.dataset.vue; SEL = []; rendre(); } });
  $('mt-jeux').addEventListener('click', function (e) { const b = e.target.closest('[data-jeu]'); if (b) { FILTRE.jeu = b.dataset.jeu; SEL = []; rendre(); } });
  $('mt-finition').addEventListener('change', function () { FILTRE.finition = this.value; SEL = []; rendre(); });
  $('mt-marque').addEventListener('change', function () { FILTRE.marque = this.value; SEL = []; rendre(); });
  $('mt-q').addEventListener('input', function () { FILTRE.q = this.value; SEL = []; rendre(); });
  $('mt-ajouter').addEventListener('click', ouvrirAjout);
  $('mt-liste').addEventListener('click', clicListe);
  $('mt-liste').addEventListener('change', changeListe);
  $('mt-selbar').addEventListener('click', clicSelection);
  $('mt-modal').addEventListener('mousedown', function (e) { if (e.target === this) fermerModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('mt-modal').classList.contains('open')) fermerModal(); });
  rendre();
}

// ── Filtres et affichage ─────────────────────────────
function statutsVue() {
  if (FILTRE.vue === 'tous') return null;
  if (FILTRE.vue === 'cours') return MATERIEL.statuts(REF, FAMILLE).map(function (s) { return s.statut; }).filter(function (s) { return s !== 'Détruit'; });
  return [FILTRE.vue];
}
function filtreCourant() { return { statuts: statutsVue(), jeu: FILTRE.jeu, finition: FILTRE.finition, marque: FILTRE.marque, q: FILTRE.q }; }
function visibles() { return MATERIEL.trier(MATERIEL.filtrer(PIECES, filtreCourant())); }
function marqueNom(id) { const m = REF.marques.find(function (x) { return x.id === id; }); return m ? m.nom : ''; }

function rendre() {
  rendreStatuts(); rendreJeux(); rendreMarques(); rendreListe(); rendreSelection();
}

function chip(attr, valeur, texte, n, actif) {
  return '<button type="button" class="fchip' + (actif ? ' on' : '') + '" data-' + attr + '="' + esc(valeur) + '"' + (actif ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(texte) +
    (n != null ? ' <span class="fchip-n">' + n + '</span>' : '') + '</button>';
}

function rendreStatuts() {
  const c = MATERIEL.compter(PIECES, filtreCourant());
  const sts = MATERIEL.statuts(REF, FAMILLE).map(function (s) { return s.statut; });
  const total = sts.reduce(function (n, s) { return n + (c.parStatut[s] || 0); }, 0);
  const cours = total - (c.parStatut['Détruit'] || 0);
  $('mt-statuts').innerHTML = chip('vue', 'cours', 'En cours', cours, FILTRE.vue === 'cours') +
    sts.map(function (s) { return chip('vue', s, s, c.parStatut[s] || 0, FILTRE.vue === s); }).join('') +
    chip('vue', 'tous', 'Tous', total, FILTRE.vue === 'tous');
}

function rendreJeux() {
  const c = MATERIEL.compter(PIECES, filtreCourant());
  const jeux = MATERIEL.jeuxPourSelect(REF);
  const total = jeux.reduce(function (n, j) { return n + (c.parJeu[j] || 0); }, 0);
  $('mt-jeux').innerHTML = chip('jeu', '', 'Tous les jeux', total, !FILTRE.jeu) +
    jeux.map(function (j) { return chip('jeu', j, j, c.parJeu[j] || 0, FILTRE.jeu === j); }).join('');
}

function rendreMarques() {
  const sel = $('mt-marque');
  sel.innerHTML = '<option value="">Toutes les marques</option><option value="sans">Sans marque</option>' +
    REF.marques.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.nom) + '</option>'; }).join('');
  sel.value = FILTRE.marque;
  if (sel.value !== FILTRE.marque) { FILTRE.marque = ''; sel.value = ''; }
}

function rendreListe() {
  const liste = visibles();
  if (!liste.length) {
    $('mt-liste').innerHTML = '<p class="mt-etat" role="status">' + (PIECES.length ? 'Aucun sixain ne correspond à ces filtres.' : 'Aucun sixain enregistré.') + '</p>';
    return;
  }
  const lignes = liste.map(function (p) {
    const pas = MATERIEL.passages(REF, FAMILLE, p.statut);
    const peutAvancer = pas.avance && pas.avance.vers !== 'Détruit';          // détruire se fait depuis l'onglet Destruction
    const coche = SEL.indexOf(p.id) >= 0;
    return '<tr' + (coche ? ' class="sel"' : '') + ' data-id="' + esc(p.id) + '">' +
      '<td class="mt-c"><input type="checkbox" data-sel aria-label="Choisir ' + esc(p.identifiant) + '"' + (coche ? ' checked' : '') + ' /></td>' +
      '<td class="mt-num"><button type="button" class="mt-lien" data-fiche>' + esc(p.identifiant) + '</button></td>' +
      '<td data-l="Jeu">' + esc(p.jeu || '') + '</td>' +
      '<td data-l="Finition">' + esc(p.finition || '') + '</td>' +
      '<td data-l="Marque">' + (p.marque_id != null ? esc(marqueNom(p.marque_id)) : '<span class="mt-vide">non renseignée</span>') + '</td>' +
      '<td data-l="Statut"><span class="mt-st ' + MATERIEL.classe(p.statut) + '">' + esc(p.statut) + '</span></td>' +
      '<td class="mt-act">' + (peutAvancer ? '<button type="button" class="btn btn-sm ' + (p.statut === 'Neuf' ? 'btn-gold' : 'btn-ghost') + '" data-avance="' + esc(pas.avance.vers) + '">' + esc(MATERIEL.actionVers(pas.avance.vers)) + '</button>' : '') + '</td>' +
      '</tr>';
  }).join('');
  const toutes = liste.length <= MAX_LOT && liste.every(function (p) { return SEL.indexOf(p.id) >= 0; });
  $('mt-liste').innerHTML = '<table class="mt-tbl"><thead><tr><th class="mt-c"><input type="checkbox" id="mt-tout" aria-label="Tout choisir"' + (toutes ? ' checked' : '') + ' /></th>' +
    '<th>Numéro</th><th>Jeu</th><th>Finition</th><th>Marque</th><th>Statut</th><th></th></tr></thead><tbody>' + lignes + '</tbody></table>';
}

function rendreSelection() {
  const bar = $('mt-selbar');
  SEL = SEL.filter(function (id) { return PIECES.some(function (p) { return p.id === id; }); });
  if (!SEL.length) { bar.hidden = true; bar.innerHTML = ''; return; }
  const n = SEL.length;
  const s = MATERIEL.selectionCommune(PIECES, SEL, REF);
  let h = '<span class="mt-n">' + n + (n > 1 ? ' sélectionnés' : ' sélectionné') + '</span>';
  if (n > MAX_LOT) {
    h += '<span class="mt-raison">' + MAX_LOT + ' fiches au maximum à la fois</span>';
  } else if (!s.ok) {
    h += '<span class="mt-raison">Statuts différents : choisissez des fiches au même statut pour les faire avancer</span>';
  } else {
    if (s.passages.avance && s.passages.avance.vers !== 'Détruit') h += '<button type="button" class="btn btn-gold btn-sm" data-sel-avance="' + esc(s.passages.avance.vers) + '">' + esc(MATERIEL.actionVers(s.passages.avance.vers)) + ' (' + n + ')</button>';
    if (s.passages.retour) h += '<button type="button" class="btn btn-ghost btn-sm" data-sel-retour="' + esc(s.passages.retour.vers) + '">Revenir à « ' + esc(s.passages.retour.vers) + ' »</button>';
  }
  if (n <= MAX_LOT) h += '<button type="button" class="btn btn-ghost btn-sm" data-sel-marque>Marque...</button>';
  h += '<button type="button" class="btn btn-ghost btn-sm mt-fin" data-sel-effacer>Effacer la sélection</button>';
  bar.hidden = false; bar.innerHTML = h;
}

// ── Clics sur la liste et la barre de sélection ──────
function clicListe(e) {
  const tr = e.target.closest('tr[data-id]');
  if (!tr) return;
  const id = tr.dataset.id;
  if (e.target.closest('[data-fiche]')) return ouvrirFiche(id);
  const av = e.target.closest('[data-avance]');
  if (av) return avancer([id], av.dataset.avance);
}

function changeListe(e) {
  if (e.target.id === 'mt-tout') {
    const ids = visibles().slice(0, MAX_LOT + 1).map(function (p) { return p.id; });
    SEL = e.target.checked ? ids : [];
    rendreListe(); rendreSelection();
    return;
  }
  const c = e.target.closest('[data-sel]');
  if (!c) return;
  const id = c.closest('tr').dataset.id;
  SEL = SEL.filter(function (x) { return x !== id; });
  if (c.checked) SEL.push(id);
  c.closest('tr').classList.toggle('sel', c.checked);
  rendreSelection();
}

function clicSelection(e) {
  const av = e.target.closest('[data-sel-avance]');
  if (av) return avancer(SEL.slice(), av.dataset.selAvance);
  const re = e.target.closest('[data-sel-retour]');
  if (re) return ouvrirRetour(SEL.slice(), re.dataset.selRetour);
  if (e.target.closest('[data-sel-marque]')) return ouvrirMarqueLot(SEL.slice());
  if (e.target.closest('[data-sel-effacer]')) { SEL = []; rendreListe(); rendreSelection(); }
}

// ── Écritures ────────────────────────────────────────
function fusionner(maj) {
  maj.forEach(function (n) {
    const i = PIECES.findIndex(function (p) { return p.id === n.id; });
    if (i >= 0) PIECES[i] = n; else PIECES.push(n);
  });
}

function toast(texte, erreur) {
  const t = $('mt-toast');
  t.textContent = texte;
  t.classList.toggle('err', !!erreur);
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { t.classList.remove('on'); }, erreur ? 6000 : 3000);
}

function libelleLot(ids) {
  if (ids.length === 1) { const p = PIECES.find(function (x) { return x.id === ids[0]; }); return p ? p.identifiant : '1 sixain'; }
  return ids.length + ' sixains';
}

async function avancer(ids, vers, options) {
  if (OCCUPE) return;
  OCCUPE = true;
  const nom = libelleLot(ids);
  try {
    fusionner(await SB.changerMaterielStatut(ids, vers, options));
    SEL = SEL.filter(function (id) { return ids.indexOf(id) < 0; });
    toast(nom + ' : ' + vers);
    rendre();
    return true;
  } catch (e) {
    toast(MATERIEL.traduireErreur(e), true);
    return false;
  } finally { OCCUPE = false; }
}

// ── Fenêtre ──────────────────────────────────────────
function ouvrirModal(html) {
  FOCUS_AVANT = document.activeElement;
  const ancien = $('mt-modal-box');
  const box = ancien.cloneNode(false);                // un élément neuf : les écouteurs de la fenêtre précédente disparaissent
  ancien.parentNode.replaceChild(box, ancien);
  box.innerHTML = '<button type="button" class="btn-icon mt-fermer" data-fermer aria-label="Fermer"><i class="ico ico-x"></i></button>' + html;
  $('mt-modal').classList.add('open'); $('mt-modal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  box.querySelector('[data-fermer]').addEventListener('click', fermerModal);
  const premier = box.querySelector('select, textarea, input[type="text"], .btn-gold') || box.querySelector('[data-fermer]');
  if (premier) premier.focus();
  return box;
}
function fermerModal() {
  $('mt-modal').classList.remove('open'); $('mt-modal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  $('mt-modal-box').innerHTML = '';
  if (FOCUS_AVANT && FOCUS_AVANT.focus) FOCUS_AVANT.focus();
}
function erreurModal(texte) {
  const z = $('mt-modal-box').querySelector('.mt-err-zone');
  if (z) z.innerHTML = texte ? '<div class="mt-err" role="alert">' + esc(texte) + '</div>' : '';
}

// Choix d'une marque : liste, « marque inconnue » et « nouvelle marque » (créée à l'enregistrement)
function htmlMarque(id, valeur) {
  return '<select id="' + id + '"><option value="">Marque inconnue</option>' +
    REF.marques.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === valeur ? ' selected' : '') + '>' + esc(m.nom) + '</option>'; }).join('') +
    '<option value="' + NOUVELLE + '">+ Nouvelle marque...</option></select>' +
    '<div class="mt-nouvelle" id="' + id + '-nv" hidden><input type="text" id="' + id + '-nom" maxlength="60" placeholder="Nom de la marque" autocomplete="off" /></div>';
}
function brancherMarque(id) {
  $(id).addEventListener('change', function () { $(id + '-nv').hidden = this.value !== NOUVELLE; if (this.value === NOUVELLE) $(id + '-nom').focus(); });
}
// Renvoie l'identifiant de la marque choisie (null : inconnue) ; crée la marque si elle est nouvelle
async function lireMarque(id) {
  const v = $(id).value;
  if (v !== NOUVELLE) return v === '' ? null : Number(v);
  const nom = $(id + '-nom').value.trim();
  if (!nom) throw new Error('Indiquez le nom de la nouvelle marque.');
  const existante = REF.marques.find(function (m) { return m.nom.trim().toLowerCase() === nom.toLowerCase(); });
  if (existante) return existante.id;
  const m = await SB.createMaterielMarque(nom);
  REF.marques.push(m);
  REF.marques.sort(function (a, b) { return a.nom.localeCompare(b.nom); });
  return m.id;
}

// ── Fiche d'un sixain ────────────────────────────────
async function ouvrirFiche(id) {
  const p = PIECES.find(function (x) { return x.id === id; });
  if (!p) return;
  const pas = MATERIEL.passages(REF, FAMILLE, p.statut);
  const peutAvancer = pas.avance && pas.avance.vers !== 'Détruit';
  const box = ouvrirModal(
    '<h2>' + esc(p.identifiant) + '</h2>' +
    '<div class="mt-tags"><span class="mt-st ' + MATERIEL.classe(p.statut) + '">' + esc(p.statut) + '</span><span class="mt-tag">' + esc(p.jeu || '') + '</span><span class="mt-tag">' + esc(p.finition || '') + '</span></div>' +
    '<div class="mt-actions">' +
      (peutAvancer ? '<button type="button" class="btn btn-gold" data-f-avance="' + esc(pas.avance.vers) + '">' + esc(MATERIEL.actionVers(pas.avance.vers)) + '</button>' : '') +
      (pas.retour ? '<button type="button" class="btn btn-ghost" data-f-retour="' + esc(pas.retour.vers) + '">Revenir à « ' + esc(pas.retour.vers) + ' »</button>' : '') +
    '</div>' +
    '<div id="mt-retour-zone"></div>' +
    '<h3>Informations</h3>' +
    '<div class="mt-grille"><div class="fg"><label class="fl" for="mt-f-marque">Marque</label>' + htmlMarque('mt-f-marque', p.marque_id) + '</div>' +
    '<div class="fg"><label class="fl" for="mt-f-note">Note</label><textarea id="mt-f-note" rows="3" maxlength="500">' + esc(p.note || '') + '</textarea></div></div>' +
    '<div class="mt-actions"><button type="button" class="btn btn-ghost" data-f-enregistrer>Enregistrer</button><span class="mt-sep" id="mt-supprimer-zone"></span></div>' +
    '<div class="mt-err-zone"></div>' +
    '<h3>Historique</h3><ul class="mt-hist" id="mt-hist"><li><span>Chargement...</span></li></ul>');
  brancherMarque('mt-f-marque');

  box.addEventListener('click', async function (e) {
    const av = e.target.closest('[data-f-avance]');
    if (av) { if (await avancer([id], av.dataset.fAvance)) fermerModal(); return; }
    const re = e.target.closest('[data-f-retour]');
    if (re) { zoneRetour(re.dataset.fRetour); return; }
    if (e.target.closest('[data-f-enregistrer]')) {
      try {
        const marque = await lireMarque('mt-f-marque');
        fusionner(await SB.updateMaterielPieces([id], { marque_id: marque, note: $('mt-f-note').value.trim() || null }));
        toast(p.identifiant + ' : informations enregistrées'); rendre(); fermerModal();
      } catch (err) { erreurModal(MATERIEL.traduireErreur(err)); }
      return;
    }
    if (e.target.closest('[data-f-supprimer]')) {
      const z = $('mt-supprimer-zone');
      z.innerHTML = '<button type="button" class="btn btn-red btn-sm" data-f-supprimer-ok>Confirmer la suppression de cette fiche</button>';
      return;
    }
    if (e.target.closest('[data-f-supprimer-ok]')) {
      try {
        await SB.deleteMaterielPiece(id);
        PIECES = PIECES.filter(function (x) { return x.id !== id; });
        toast(p.identifiant + ' : fiche supprimée'); rendre(); fermerModal();
      } catch (err) { erreurModal(MATERIEL.traduireErreur(err)); }
    }
  });

  function zoneRetour(vers) {
    $('mt-retour-zone').innerHTML = '<div class="fg" style="margin-top:14px"><label class="fl" for="mt-f-motif">Motif du retour à « ' + esc(vers) + ' » (obligatoire)</label>' +
      '<textarea id="mt-f-motif" rows="2" maxlength="300"></textarea></div><div class="mt-actions"><button type="button" class="btn btn-red btn-sm" data-f-retour-ok>Confirmer le retour</button></div>';
    $('mt-f-motif').focus();
    $('mt-retour-zone').querySelector('[data-f-retour-ok]').addEventListener('click', async function () {
      const motif = $('mt-f-motif').value.trim();
      if (motif.length < 3) { erreurModal('Indiquez un motif d\'au moins 3 caractères.'); return; }
      if (await avancer([id], vers, { motif: motif })) fermerModal(); else erreurModal('Le retour n\'a pas pu être enregistré.');
    });
  }

  try {
    const hist = await SB.getMaterielHistorique(id);
    $('mt-hist').innerHTML = hist.length ? hist.map(function (h) {
      return '<li><span class="mt-quand">' + esc(MATERIEL.dateHeure(h.at)) + '</span><span>' + (h.de_statut ? esc(h.de_statut) + ' → ' : '') + '<strong>' + esc(h.vers_statut) + '</strong>' +
        (h.retour ? '<span class="mt-retour">retour</span>' : '') + (h.par_nom ? ' · ' + esc(h.par_nom) : '') + '</span>' +
        (h.motif && h.motif !== 'Création' ? '<span class="mt-motif">' + esc(h.motif) + '</span>' : '') + '</li>';
    }).join('') : '<li><span>Aucun historique.</span></li>';
    const depart = REF.statuts.some(function (s) { return s.famille === FAMILLE && s.statut === p.statut && s.creation; });
    if (depart && hist.length <= 1 && $('mt-supprimer-zone')) $('mt-supprimer-zone').innerHTML = '<button type="button" class="btn btn-ghost btn-sm" data-f-supprimer>Supprimer cette fiche</button>';
  } catch (e) { if ($('mt-hist')) $('mt-hist').innerHTML = '<li><span>Historique indisponible : ' + esc(MATERIEL.traduireErreur(e)) + '</span></li>'; }
}

// ── Retour en arrière d'une sélection (motif obligatoire) ──
function ouvrirRetour(ids, vers) {
  const box = ouvrirModal('<h2>Revenir à « ' + esc(vers) + ' »</h2>' +
    '<p class="mt-info">' + esc(libelleLot(ids)) + ' ' + (ids.length > 1 ? 'reviendront' : 'reviendra') + ' à « ' + esc(vers) + ' ». Cela s\'inscrit dans l\'historique avec votre motif.</p>' +
    '<div class="fg" style="margin-top:14px"><label class="fl" for="mt-r-motif">Motif (obligatoire)</label><textarea id="mt-r-motif" rows="3" maxlength="300"></textarea></div>' +
    '<div class="mt-err-zone"></div><div class="mt-actions"><button type="button" class="btn btn-red" data-r-ok>Confirmer le retour</button><button type="button" class="btn btn-ghost" data-fermer>Annuler</button></div>');
  box.querySelector('[data-r-ok]').addEventListener('click', async function () {
    const motif = $('mt-r-motif').value.trim();
    if (motif.length < 3) { erreurModal('Indiquez un motif d\'au moins 3 caractères.'); return; }
    if (await avancer(ids, vers, { motif: motif })) fermerModal(); else erreurModal('Le retour n\'a pas pu être enregistré.');
  });
  box.querySelectorAll('[data-fermer]').forEach(function (b) { b.addEventListener('click', fermerModal); });
}

// ── Marque d'une sélection ───────────────────────────
function ouvrirMarqueLot(ids) {
  const box = ouvrirModal('<h2>Marque de ' + esc(libelleLot(ids)) + '</h2>' +
    '<div class="fg"><label class="fl" for="mt-m-marque">Marque</label>' + htmlMarque('mt-m-marque', null) + '</div>' +
    '<div class="mt-err-zone"></div><div class="mt-actions"><button type="button" class="btn btn-gold" data-m-ok>Enregistrer</button><button type="button" class="btn btn-ghost" data-fermer>Annuler</button></div>');
  brancherMarque('mt-m-marque');
  box.querySelector('[data-m-ok]').addEventListener('click', async function () {
    try {
      const marque = await lireMarque('mt-m-marque');
      fusionner(await SB.updateMaterielPieces(ids, { marque_id: marque }));
      toast(libelleLot(ids) + ' : marque enregistrée'); rendre(); fermerModal();
    } catch (e) { erreurModal(MATERIEL.traduireErreur(e)); }
  });
  box.querySelectorAll('[data-fermer]').forEach(function (b) { b.addEventListener('click', fermerModal); });
}

// ── Ajout de sixains (plusieurs numéros d'un coup) ───
function ouvrirAjout() {
  const departs = REF.statuts.filter(function (s) { return s.famille === FAMILLE && s.creation; }).sort(function (a, b) { return a.ordre - b.ordre; });
  const box = ouvrirModal('<h2>Ajouter des sixains</h2>' +
    '<div class="mt-grille">' +
      '<div class="fg"><label class="fl" for="mt-a-jeu">Jeu</label><select id="mt-a-jeu"><option value="">Choisir...</option>' + MATERIEL.jeuxPourSelect(REF).map(function (j) { return '<option>' + esc(j) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fg"><label class="fl" for="mt-a-fin">Finition</label><select id="mt-a-fin"><option value="">Choisir...</option><option>Plastifié</option><option>Cartonné</option></select></div>' +
      '<div class="fg"><label class="fl" for="mt-a-statut">Statut de départ</label><select id="mt-a-statut">' + departs.map(function (s) { return '<option>' + esc(s.statut) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fg"><label class="fl" for="mt-a-marque">Marque</label>' + htmlMarque('mt-a-marque', null) + '</div>' +
    '</div>' +
    '<div class="fg" style="margin-top:6px"><label class="fl" for="mt-a-ids">Numéros</label><textarea id="mt-a-ids" rows="6" placeholder="Un numéro par ligne, ou séparés par des espaces" autocomplete="off" spellcheck="false"></textarea></div>' +
    '<div id="mt-a-bilan" class="mt-info" role="status"></div><div class="mt-err-zone"></div>' +
    '<div class="mt-actions"><button type="button" class="btn btn-gold" id="mt-a-ok" disabled>Ajouter</button><button type="button" class="btn btn-ghost" data-fermer>Annuler</button></div>');
  brancherMarque('mt-a-marque');
  box.querySelectorAll('[data-fermer]').forEach(function (b) { b.addEventListener('click', fermerModal); });

  const existants = function () { return PIECES.map(function (p) { return p.identifiant; }); };
  const analyse = function () { return MATERIEL.analyserSaisie($('mt-a-ids').value, existants()); };
  const maj = function () {
    const a = analyse();
    const msg = [];
    if (a.ids.length) msg.push(a.ids.length + (a.ids.length > 1 ? ' sixains à ajouter' : ' sixain à ajouter'));
    if (a.existe.length) msg.push('déjà enregistré' + (a.existe.length > 1 ? 's' : '') + ' (ignoré' + (a.existe.length > 1 ? 's' : '') + ') : ' + a.existe.join(', '));
    if (a.doublonsSaisie.length) msg.push('en double dans la saisie (compté une fois) : ' + a.doublonsSaisie.join(', '));
    if (a.invalides.length) msg.push('numéro non valide : ' + a.invalides.join(', '));
    const bilan = $('mt-a-bilan');
    bilan.textContent = msg.join(' · ');
    bilan.classList.toggle('attention', a.invalides.length > 0 || a.existe.length > 0 || a.doublonsSaisie.length > 0);
    $('mt-a-ok').disabled = !($('mt-a-jeu').value && $('mt-a-fin').value && a.ids.length && !a.invalides.length && a.ids.length <= MAX_LOT);
    if (a.ids.length > MAX_LOT) bilan.textContent += ' · ' + MAX_LOT + ' sixains au maximum à la fois';
  };
  ['mt-a-ids', 'mt-a-jeu', 'mt-a-fin'].forEach(function (id) { $(id).addEventListener('input', maj); $(id).addEventListener('change', maj); });

  $('mt-a-ok').addEventListener('click', async function () {
    if (OCCUPE) return;
    OCCUPE = true; this.disabled = true; erreurModal('');
    try {
      const a = analyse();
      const marque = await lireMarque('mt-a-marque');
      const fiches = a.ids.map(function (id) {
        return { famille: FAMILLE, identifiant: id, jeu: $('mt-a-jeu').value, finition: $('mt-a-fin').value, statut: $('mt-a-statut').value, marque_id: marque };
      });
      const crees = await SB.createMaterielPieces(fiches);
      fusionner(crees);
      toast(crees.length + (crees.length > 1 ? ' sixains ajoutés' : ' sixain ajouté'));
      rendre(); fermerModal();
    } catch (e) { erreurModal(MATERIEL.traduireErreur(e)); this.disabled = false; }
    finally { OCCUPE = false; }
  });
}

// L'écran n'a pas de bouton de destruction : « A détruire » devient « Détruit » avec une session (onglet Destruction, étape suivante)
