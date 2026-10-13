// ══════════════════════════════════════════════════════
//  BREAK LIST - page « Paramètres » : grades, horaires du planning, postes, break list imprimable, rapprochements
//  Tout est enregistré en un bloc (table breaklist_config, clé 'config'), complété par les valeurs par défaut.
// ══════════════════════════════════════════════════════

let W = null;     // copie de travail des paramètres
let dirty = false;

async function init() {
  W = await blLoadConfig();
  render();
  let tab = 'equipe';
  try { tab = sessionStorage.getItem('pm_tab') || 'equipe'; } catch (e) { tab = 'equipe'; }
  showTab(tab);
  // toute saisie ou tout choix dans la page marque une modification non enregistrée
  document.querySelector('.app').addEventListener('input', function (e) { if (e.target.closest('.pm-view')) { markDirty(); if (e.target.closest('#pm-feuilles')) { collect(); renderPreview(); } } });
  document.querySelector('.app').addEventListener('change', function (e) { if (e.target.closest('.pm-view')) { markDirty(); collect(); renderPreview(); } });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
}

function showTab(name) {
  try { sessionStorage.setItem('pm_tab', name); } catch (e) { /* stockage indisponible : l'onglet n'est pas retenu */ }
  document.querySelectorAll('#pm-tabs .seg-btn').forEach(function (b) {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on));
  });
  ['equipe', 'soiree', 'feuilles'].forEach(function (t) { document.getElementById('pm-' + t).hidden = t !== name; });
}

function markDirty() { dirty = true; document.getElementById('pm-bar').hidden = false; }
function clearDirty() { dirty = false; document.getElementById('pm-bar').hidden = true; }

async function cancelChanges() {
  W = await blLoadConfig();
  render();
  clearDirty();
}

/** Aperçu des deux feuilles d'après les paramètres en cours de saisie */
function renderPreview() {
  const b = W.breaklist, cols = Math.max(1, b.colonnes | 0), blocs = Math.max(1, b.blocs | 0), kc = Math.max(1, b.colonnesVerso | 0);
  const cells = function (n) { return '<i></i>'.repeat(n); };
  const names = ['Alex', 'Basile', 'Camille', 'Dorian'];
  let recto = '<div class="pv-title">Breaklist du mercredi 07 octobre</div>';
  for (let k = 0; k < blocs; k++) {
    recto += '<div class="pv-block">' + names.map(function (n, i) {
      const g = W.grades[i % Math.max(W.grades.length, 1)];
      return '<div class="pv-row"><span class="pv-n" style="background:' + esc(g ? g.color : '#ccc') + '">' + n + '</span><span class="pv-g" style="grid-template-columns:repeat(' + cols + ',1fr)">'
        + (i === 1 ? '<i>' + esc(b.floorMarque) + '</i>' + cells(cols - 1) : cells(cols)) + '</span></div>';
    }).join('') + '</div>';
  }
  const verso = b.tables.map(function (l) {
    return '<div class="pv-row' + (/^TOTAL\b/i.test(l) ? ' tot' : '') + '"><span class="pv-n">' + esc(l) + '</span><span class="pv-g" style="grid-template-columns:repeat(' + kc + ',1fr)">' + cells(kc) + '</span></div>';
  }).join('');
  document.getElementById('pm-prev').innerHTML = '<div><div class="pv-cap">Recto</div><div class="pv-sheet">' + recto + '</div></div><div><div class="pv-cap">Verso</div><div class="pv-sheet pv-v">' + verso + '</div></div>';
}

function render() {
  document.getElementById('tb-grades').innerHTML = W.grades.map(function (g, i) {
    return '<tr><td><input type="text" class="g-code" value="' + esc(g.code) + '" maxlength="6"/></td>'
      + '<td><input type="text" class="g-label" value="' + esc(g.label) + '"/></td>'
      + '<td><input type="color" class="g-color" value="' + esc(g.color) + '"/></td>'
      + '<td><input type="checkbox" class="g-chef"' + (g.chef ? ' checked' : '') + '/></td>'
      + '<td class="act"><button class="btn btn-ghost btn-icon" title="Monter" onclick="moveGrade(' + i + ',-1)"' + (i === 0 ? ' disabled' : '') + '>↑</button> '
      + '<button class="btn btn-ghost btn-icon" title="Descendre" onclick="moveGrade(' + i + ',1)"' + (i === W.grades.length - 1 ? ' disabled' : '') + '>↓</button> '
      + '<button class="btn btn-icon danger" title="Supprimer" onclick="delGrade(' + i + ')"><i class="ico ico-del"></i></button></td></tr>';
  }).join('');
  document.getElementById('tb-codes').innerHTML = W.codes.map(function (k, i) {
    const opt = function (v, l) { return '<option value="' + v + '"' + (k.groupe === v ? ' selected' : '') + '>' + l + '</option>'; };
    return '<tr><td><input type="text" class="k-code" value="' + esc(k.code) + '" maxlength="8" placeholder="19:55"/></td>'
      + '<td><select class="k-groupe">' + opt('20h', 'Arrivée 20h') + opt('21h', 'Arrivée 21h') + opt('depart', 'Part en premier (sans poste)') + '</select></td>'
      + '<td><input type="checkbox" class="k-floor"' + (k.floor ? ' checked' : '') + '/></td>'
      + '<td class="act"><button class="btn btn-icon danger" title="Supprimer" onclick="delCode(' + i + ')"><i class="ico ico-del"></i></button></td></tr>';
  }).join('');
  document.getElementById('tb-absences').innerHTML = W.absences.map(function (a, i) {
    return '<tr><td><input type="text" class="a-code" value="' + esc(a.code) + '" maxlength="8"/></td>'
      + '<td><input type="text" class="a-label" value="' + esc(a.label) + '"/></td>'
      + '<td><input type="color" class="a-color" value="' + esc(a.color) + '"/></td>'
      + '<td class="act"><button class="btn btn-icon danger" title="Supprimer" onclick="delAbsence(' + i + ')"><i class="ico ico-del"></i></button></td></tr>';
  }).join('');
  document.getElementById('cf-stackers').value = W.postes.stackers;
  document.getElementById('cf-compteurs').value = W.postes.compteurs;
  document.getElementById('cf-cartes').value = W.postes.cartes;
  document.getElementById('cf-salle').value = W.postes.salle ? '1' : '0';
  document.getElementById('cf-affichage').value = W.affichage;
  document.getElementById('cf-bascule').value = W.bascule;
  document.getElementById('cf-arrete').value = String(W.arreteJour);
  document.getElementById('cf-colonnes').value = W.breaklist.colonnes;
  document.getElementById('cf-blocs').value = W.breaklist.blocs;
  document.getElementById('cf-floor').value = W.breaklist.floorMarque;
  document.getElementById('cf-colverso').value = W.breaklist.colonnesVerso;
  document.getElementById('cf-tables').value = W.breaklist.tables.join('\n');
  const al = Object.keys(W.aliases);
  document.getElementById('alias-out').innerHTML = al.length ? al.map(function (k) {
    return '<div class="cf-alias"><span>' + esc(k) + ' <small>→ ' + esc(W.aliases[k]) + '</small></span><button class="btn btn-icon danger" title="Supprimer" onclick="delAlias(this.dataset.k)" data-k="' + esc(k) + '"><i class="ico ico-del"></i></button></div>';
  }).join('') : '<div class="bl-muted">Aucun rapprochement enregistré.</div>';
  renderPreview();
}

/** Relit les champs de la page dans la copie de travail (avant toute modification de structure) */
function collect() {
  W.grades = Array.prototype.map.call(document.querySelectorAll('#tb-grades tr'), function (tr) {
    return { code: tr.querySelector('.g-code').value.trim().toUpperCase(), label: tr.querySelector('.g-label').value.trim(), color: tr.querySelector('.g-color').value, chef: tr.querySelector('.g-chef').checked };
  });
  W.codes = Array.prototype.map.call(document.querySelectorAll('#tb-codes tr'), function (tr) {
    return { code: tr.querySelector('.k-code').value.trim(), groupe: tr.querySelector('.k-groupe').value, floor: tr.querySelector('.k-floor').checked };
  });
  W.absences = Array.prototype.map.call(document.querySelectorAll('#tb-absences tr'), function (tr) {
    const code = tr.querySelector('.a-code').value.trim();
    return { code: code, label: tr.querySelector('.a-label').value.trim() || code, color: tr.querySelector('.a-color').value };
  });
  const n = function (id, min, max) { return Math.min(max, Math.max(min, parseInt(document.getElementById(id).value, 10) || 0)); };
  W.postes = { stackers: n('cf-stackers', 0, 12), compteurs: n('cf-compteurs', 0, 10), cartes: n('cf-cartes', 0, 10), salle: document.getElementById('cf-salle').value === '1' };
  W.affichage = document.getElementById('cf-affichage').value;
  W.bascule = n('cf-bascule', 0, 12);
  W.arreteJour = parseInt(document.getElementById('cf-arrete').value, 10);
  W.breaklist = {
    colonnes: n('cf-colonnes', 1, 40) || 24, blocs: n('cf-blocs', 1, 4) || 1, floorMarque: document.getElementById('cf-floor').value.trim() || 'T',
    colonnesVerso: n('cf-colverso', 1, 8) || 1,
    tables: document.getElementById('cf-tables').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean),
  };
}

function addGrade() { collect(); W.grades.push({ code: '', label: '', color: '#CCCCCC', chef: false }); markDirty(); render(); }
function delGrade(i) { collect(); W.grades.splice(i, 1); markDirty(); render(); }
function moveGrade(i, d) { collect(); const g = W.grades.splice(i, 1)[0]; W.grades.splice(i + d, 0, g); markDirty(); render(); }
function addCode() { collect(); W.codes.push({ code: '', groupe: '21h', floor: false }); markDirty(); render(); }
function delCode(i) { collect(); W.codes.splice(i, 1); markDirty(); render(); }
function addAbsence() { collect(); W.absences.push({ code: '', label: '', color: '#8C8577' }); markDirty(); render(); }
function delAbsence(i) { collect(); W.absences.splice(i, 1); markDirty(); render(); }
function delAlias(k) { collect(); delete W.aliases[k]; markDirty(); render(); }

function resetDefaults() {
  if (!confirm('Rétablir tous les paramètres d\'origine ? Les rapprochements de noms sont conservés.')) return;
  const keep = W.aliases;
  W = blMerge(BL_DEFAULT_CONFIG, {});
  W.aliases = keep;
  markDirty();
  render();
  flash('Valeurs d\'origine chargées : pensez à enregistrer');
}

async function saveConfig() {
  collect();
  const codes = {}, grades = {};
  for (let i = 0; i < W.grades.length; i++) {
    const g = W.grades[i];
    if (!g.code) { alert('Un grade n\'a pas de code.'); return; }
    if (grades[g.code]) { alert('Le code de grade « ' + g.code + ' » est en double.'); return; }
    grades[g.code] = true;
  }
  for (let i = 0; i < W.codes.length; i++) {
    const k = W.codes[i];
    if (!k.code) { alert('Un horaire n\'a pas de code.'); return; }
    if (codes[k.code]) { alert('L\'horaire « ' + k.code + ' » est en double.'); return; }
    codes[k.code] = true;
  }
  const abs = {};
  for (let i = 0; i < W.absences.length; i++) {
    const a = W.absences[i], k = a.code.toLowerCase();
    if (!a.code) { alert('Un type d\'absence n\'a pas de code.'); return; }
    if (abs[k]) { alert('Le type d\'absence « ' + a.code + ' » est en double.'); return; }
    if (codes[a.code]) { alert('« ' + a.code + ' » est déjà un horaire de présence.'); return; }
    abs[k] = true;
  }
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  try { await SB.saveBreakListConfig(W); clearDirty(); flash('Paramètres enregistrés'); }
  catch (e) { console.error(e); flash('Enregistrement impossible'); }
  btn.disabled = false;
}
