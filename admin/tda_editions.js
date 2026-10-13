// ══════════════════════════════════════════════════════
//  ÉDITIONS DU RÈGLEMENT TDA (admin)
//  Le TDA publie une nouvelle édition environ tous les 2 ans. L'administrateur dépose le PDF : il est lu et analysé dans
//  le navigateur (tda_pdf.js, tda_analyse.js), les contrôles s'affichent, puis l'édition est enregistrée en brouillon et
//  activée. Une seule édition est active à la fois : c'est celle que consultent les comptes qui ont le panel « Règlement TDA ».
// ══════════════════════════════════════════════════════

const $ = function (id) { return document.getElementById(id); };
const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

const TYPES = [['regle', 'règle', 'règles'], ['rp', 'procédure recommandée', 'procédures recommandées'], ['exemple', 'exemple', 'exemples'], ['glossaire', 'terme du glossaire', 'termes du glossaire']];
const NIVEAUX = { ok: 'OK', avert: 'À voir', erreur: 'Erreur' };
let _analyse = null;                // résultat de l'analyse du PDF déposé
let _editions = [];
let _actuelle = null;               // contenu de l'édition active (nombre de blocs par type), pour comparer avec le PDF déposé

function fmtDate(iso) {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
}

function message(zone, texte, genre) {
  $(zone).innerHTML = texte ? '<p class="te-msg ' + (genre || '') + '" role="status">' + esc(texte) + '</p>' : '';
}

function decompte(n) {
  return TYPES.filter(function (t) { return n[t[0]]; }).map(function (t) { return n[t[0]] + ' ' + (n[t[0]] > 1 ? t[2] : t[1]); }).join(', ');
}

async function initEditionsTda() {
  $('te-fichier').addEventListener('change', choisirPdf);
  await chargerEditions();
}

// ── Liste des éditions ───────────────────────────────
async function chargerEditions() {
  try {
    _editions = await SB.listTdaEditions();
    // Une édition est « complète » quand tous les blocs annoncés sont présents (sinon l'import a été interrompu)
    for (const e of _editions) e.presents = await SB.countTdaBlocs(e.id);
    const active = _editions.find(function (e) { return e.active; });
    _actuelle = active ? await SB.countTdaParType(active.id) : null;
    afficherEditions();
  } catch (err) {
    $('te-liste').innerHTML = '<p class="te-msg err" role="status">Lecture impossible : ' + esc(err.message || err) + '</p>';
  }
}

function afficherEditions() {
  if (!_editions.length) {
    $('te-liste').innerHTML = '<p class="te-vide">Aucune édition importée.</p><div id="te-msg-liste"></div>';
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

// ── Import d'un PDF ──────────────────────────────────
const pause = function () { return new Promise(function (r) { setTimeout(r, 30); }); };

async function choisirPdf(ev) {
  const fichier = ev.target.files && ev.target.files[0];
  _analyse = null;
  $('te-apercu').innerHTML = '';
  if (!fichier) return;
  const etat = function (t) { $('te-apercu').innerHTML = '<p class="te-msg" role="status">' + esc(t) + '</p>'; };
  try {
    etat('Lecture du PDF...');
    const pages = await TDA_PDF.lire(fichier, function (n, total) { etat('Lecture du PDF : page ' + n + ' sur ' + total); });
    etat('Analyse du contenu...');
    await pause();
    _analyse = TDA_ANALYSE.analyser(pages);
  } catch (err) {
    message('te-apercu', err.message || String(err), 'err');
    return;
  }
  afficherAnalyse();
}

function afficherAnalyse() {
  const a = _analyse, f = a.fichier;
  const controles = '<ul class="te-controles">' + a.controles.map(function (c) {
    return '<li class="te-c ' + c.niveau + '"><span class="te-c-n">' + NIVEAUX[c.niveau] + '</span><span>' + esc(c.texte) + '</span></li>';
  }).join('') + '</ul>';
  if (!f) { $('te-apercu').innerHTML = '<div class="te-apercu">' + controles + '</div>'; return; }

  const e = f.edition, n = {};
  f.blocs.forEach(function (b) { n[b.kind] = (n[b.kind] || 0) + 1; });
  $('te-apercu').innerHTML =
    '<div class="te-apercu">' +
      '<div class="te-champs">' +
        '<div class="fg"><label class="fl" for="te-f-libelle">Libellé</label><input type="text" id="te-f-libelle" value="' + esc(e.libelle) + '" /></div>' +
        '<div class="fg"><label class="fl" for="te-f-id">Identifiant</label><input type="text" id="te-f-id" value="' + esc(e.id) + '" maxlength="40" autocomplete="off" /></div>' +
        '<div class="fg"><label class="fl" for="te-f-date">Date de publication</label><input type="date" id="te-f-date" value="' + esc(e.date_publication || '') + '" /></div>' +
        '<div class="fg"><label class="fl" for="te-f-trad">Traduction</label><input type="text" id="te-f-trad" value="' + esc(e.traduction || '') + '" /></div>' +
      '</div>' +
      '<div id="te-f-msg"></div>' +
      '<p class="te-resume"><strong>Ce PDF :</strong> ' + esc(decompte(n)) + '.' +
        (_actuelle ? '<br /><strong>Édition active :</strong> ' + esc(decompte(_actuelle)) + '.' : '') + '</p>' +
      controles +
      '<div class="te-actions"><button class="btn btn-gold" id="te-importer">Importer en brouillon</button></div>' +
      '<div id="te-msg-import"></div>' +
    '</div>';
  ['te-f-libelle', 'te-f-id'].forEach(function (id) { $(id).addEventListener('input', verifierSaisie); });
  $('te-importer').addEventListener('click', importer);
  verifierSaisie();
}

// Les champs modifiables doivent donner une édition valide, et l'analyse ne doit contenir aucune erreur
function verifierSaisie() {
  const id = $('te-f-id').value.trim(), libelle = $('te-f-libelle').value.trim();
  let probleme = null;
  if (_analyse.controles.some(function (c) { return c.niveau === 'erreur'; })) probleme = 'L\'analyse a signalé une erreur : l\'import est bloqué (voir les contrôles ci-dessous).';
  else if (!libelle) probleme = 'Le libellé est obligatoire.';
  else if (!/^[a-z0-9_]{3,40}$/.test(id)) probleme = 'L\'identifiant doit faire de 3 à 40 caractères : minuscules, chiffres et _ (par exemple 2028_v1_0).';
  else if (_editions.some(function (x) { return x.id === id; })) probleme = 'Une édition « ' + id + ' » existe déjà. Changez l\'identifiant, ou supprimez cette édition pour la réimporter.';
  message('te-f-msg', probleme, 'err');
  $('te-importer').disabled = !!probleme;
}

async function importer() {
  const f = JSON.parse(JSON.stringify(_analyse.fichier));
  f.edition.id = $('te-f-id').value.trim();
  f.edition.libelle = $('te-f-libelle').value.trim();
  f.edition.date_publication = $('te-f-date').value || null;
  f.edition.traduction = $('te-f-trad').value.trim() || null;
  const b = $('te-importer');
  b.disabled = true;
  try {
    await SB.importTdaEdition(f, function (fait, total) { message('te-msg-import', 'Import en cours : ' + fait + ' / ' + total); });
    const id = f.edition.id;
    $('te-fichier').value = '';
    _analyse = null;
    await chargerEditions();
    $('te-apercu').innerHTML = '<div class="te-apercu"><p class="te-msg ok" role="status">Édition importée en brouillon.</p>' +
      '<div class="te-actions"><button class="btn btn-gold" id="te-activer-maintenant">Activer maintenant</button></div></div>';
    $('te-activer-maintenant').addEventListener('click', function () { agir('activer', id); });
  } catch (err) {
    b.disabled = false;
    message('te-msg-import', 'Échec de l\'import : ' + (err.message || err), 'err');
  }
}
