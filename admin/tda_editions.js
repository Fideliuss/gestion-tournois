// ══════════════════════════════════════════════════════
//  ÉDITIONS DU RÈGLEMENT TDA (admin)
//  Le TDA publie une nouvelle édition environ tous les 2 ans. Cette page importe le fichier produit par
//  tda/outils/extraire_tda.js (le PDF n'est jamais lu par le navigateur), l'enregistre en brouillon, puis l'active :
//  une seule édition est active à la fois, c'est celle que consultent les comptes qui ont le panel « Règlement TDA ».
// ══════════════════════════════════════════════════════

const $ = function (id) { return document.getElementById(id); };
const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

const TYPES = { regle: 'règles', rp: 'procédures recommandées', exemple: 'exemples', glossaire: 'termes du glossaire' };
let _fichier = null;                // contenu du fichier choisi, validé
let _editions = [];

function fmtDate(iso) {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
}

function message(zone, texte, genre) {
  const el = $(zone);
  el.innerHTML = texte ? '<p class="te-msg ' + (genre || '') + '" role="status">' + esc(texte) + '</p>' : '';
}

async function initEditionsTda() {
  $('te-fichier').addEventListener('change', choisirFichier);
  await chargerEditions();
}

// ── Liste des éditions ───────────────────────────────
async function chargerEditions() {
  try {
    _editions = await SB.listTdaEditions();
    // Une édition est « complète » quand tous les blocs annoncés sont présents (sinon l'import a été interrompu)
    for (const e of _editions) e.presents = await SB.countTdaBlocs(e.id);
    afficherEditions();
  } catch (err) {
    $('te-liste').innerHTML = '<p class="te-msg err" role="status">Lecture impossible : ' + esc(err.message || err) + '</p>';
  }
}

function afficherEditions() {
  if (!_editions.length) {
    $('te-liste').innerHTML = '<p class="te-vide">Aucune édition importée.</p>';
    return;
  }
  $('te-liste').innerHTML = _editions.map(function (e) {
    const complete = e.presents === e.nb_blocs;
    const badge = e.active ? '<span class="te-badge on">Active</span>'
                : complete ? '<span class="te-badge">Brouillon</span>'
                : '<span class="te-badge warn">Incomplète</span>';
    const meta = [
      e.date_publication ? 'Publiée le ' + fmtDate(e.date_publication) : '',
      e.traduction ? 'traduction ' + e.traduction : '',
      e.presents + (complete ? '' : ' sur ' + e.nb_blocs) + ' blocs',
    ].filter(Boolean).join(' · ');
    const actions = e.active ? '' :
      (complete ? '<button class="btn btn-gold btn-sm" data-act="activer" data-id="' + esc(e.id) + '">Activer</button>' : '') +
      '<button class="btn btn-red btn-sm" data-act="supprimer" data-id="' + esc(e.id) + '">Supprimer</button>';
    return '<div class="te-ligne">' +
      '<div class="te-info"><div class="te-nom">' + esc(e.libelle) + ' ' + badge + '</div><div class="te-meta">' + esc(meta) + '</div></div>' +
      '<div class="te-actions">' + actions + '</div></div>';
  }).join('') + '<div id="te-msg-liste"></div>';
  $('te-liste').querySelectorAll('button[data-act]').forEach(function (b) {
    b.addEventListener('click', function () { agir(b.dataset.act, b.dataset.id); });
  });
}

async function agir(action, id) {
  const e = _editions.find(function (x) { return x.id === id; });
  if (!e) return;
  try {
    if (action === 'activer') {
      const actuelle = _editions.find(function (x) { return x.active; });
      const q = 'Activer « ' + e.libelle + ' » ?' + (actuelle ? '\nElle remplacera « ' + actuelle.libelle + ' » pour tous les comptes.' : '');
      if (!confirm(q)) return;
      await SB.activateTdaEdition(id);
      await chargerEditions();
      message('te-msg-liste', 'Édition activée.', 'ok');
    } else {
      if (!confirm('Supprimer « ' + e.libelle + ' » ?\nElle devra être réimportée pour être de nouveau disponible.')) return;
      await SB.deleteTdaEdition(id);
      await chargerEditions();
      message('te-msg-liste', 'Édition supprimée.', 'ok');
    }
  } catch (err) {
    message('te-msg-liste', 'Échec : ' + (err.message || err), 'err');
  }
}

// ── Import d'un fichier ──────────────────────────────
// Vérifie la forme du fichier avant tout envoi : un fichier incomplet ou d'un autre outil est refusé avec la raison
function verifierFichier(f) {
  if (!f || typeof f !== 'object') return 'Le fichier n\'est pas une édition.';
  const e = f.edition;
  if (!e || !/^[a-z0-9_]{3,40}$/.test(e.id || '')) return 'Identifiant d\'édition absent ou invalide (minuscules, chiffres et _ seulement).';
  if (!e.libelle || !e.mention) return 'Il manque le libellé ou la mention de droits de l\'édition.';
  if (!Array.isArray(f.blocs) || !f.blocs.length) return 'Le fichier ne contient aucun bloc.';
  const ids = {};
  for (const b of f.blocs) {
    if (!b.id || !b.kind || !b.section || !b.titre || typeof b.ordre !== 'number') return 'Un bloc est incomplet (' + (b.id || '?') + ').';
    if (['regle', 'rp_intro', 'rp', 'exemple', 'glossaire'].indexOf(b.kind) < 0) return 'Type de bloc inconnu : ' + b.kind + '.';
    if (ids[b.id]) return 'Bloc en double : ' + b.id + '.';
    ids[b.id] = true;
  }
  return null;
}

async function choisirFichier(ev) {
  const fichier = ev.target.files && ev.target.files[0];
  _fichier = null;
  message('te-apercu', '');
  if (!fichier) return;
  let contenu;
  try { contenu = JSON.parse(await fichier.text()); }
  catch (e) { message('te-apercu', 'Ce fichier n\'est pas lisible (JSON invalide).', 'err'); return; }
  const erreur = verifierFichier(contenu);
  if (erreur) { message('te-apercu', erreur, 'err'); return; }
  _fichier = contenu;
  afficherApercu();
}

function afficherApercu() {
  const e = _fichier.edition, n = {};
  _fichier.blocs.forEach(function (b) { n[b.kind] = (n[b.kind] || 0) + 1; });
  const detail = Object.keys(TYPES).filter(function (k) { return n[k]; }).map(function (k) { return n[k] + ' ' + TYPES[k]; }).join(', ');
  const existe = _editions.some(function (x) { return x.id === e.id; });
  $('te-apercu').innerHTML =
    '<div class="te-apercu">' +
      '<div class="te-nom">' + esc(e.libelle) + '</div>' +
      '<div class="te-meta">' + esc([e.date_publication ? 'Publiée le ' + fmtDate(e.date_publication) : '', e.traduction ? 'traduction ' + e.traduction : ''].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="te-meta">' + esc(_fichier.blocs.length + ' blocs : ' + detail) + '</div>' +
      (existe ? '<p class="te-msg err" role="status">Une édition « ' + esc(e.id) + ' » existe déjà. Supprimez-la d\'abord pour la réimporter.</p>'
              : '<div class="te-actions"><button class="btn btn-gold" id="te-importer">Importer en brouillon</button></div>') +
      '<div id="te-msg-import"></div>' +
    '</div>';
  const b = $('te-importer');
  if (b) b.addEventListener('click', importer);
}

async function importer() {
  const b = $('te-importer');
  b.disabled = true;
  try {
    await SB.importTdaEdition(_fichier, function (fait, total) { message('te-msg-import', 'Import en cours : ' + fait + ' / ' + total); });
    $('te-fichier').value = '';
    _fichier = null;
    await chargerEditions();
    $('te-apercu').innerHTML = '';
    message('te-msg-liste', 'Édition importée. Elle reste en brouillon tant que vous ne l\'activez pas.', 'ok');
  } catch (err) {
    b.disabled = false;
    message('te-msg-import', 'Échec de l\'import : ' + (err.message || err), 'err');
  }
}
