// ══════════════════════════════════════════════════════
//  BREAK LIST - page « Réglages » : grades, horaires du planning, postes, break list imprimable, rapprochements
//  Tout est enregistré en un bloc (table breaklist_config, clé 'config'), complété par les valeurs par défaut.
// ══════════════════════════════════════════════════════

let W = null;     // copie de travail des réglages

async function init() {
  W = await blLoadConfig();
  render();
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
}

/** Relit les champs de la page dans la copie de travail (avant toute modification de structure) */
function collect() {
  W.grades = Array.prototype.map.call(document.querySelectorAll('#tb-grades tr'), function (tr) {
    return { code: tr.querySelector('.g-code').value.trim().toUpperCase(), label: tr.querySelector('.g-label').value.trim(), color: tr.querySelector('.g-color').value, chef: tr.querySelector('.g-chef').checked };
  });
  W.codes = Array.prototype.map.call(document.querySelectorAll('#tb-codes tr'), function (tr) {
    return { code: tr.querySelector('.k-code').value.trim(), groupe: tr.querySelector('.k-groupe').value, floor: tr.querySelector('.k-floor').checked };
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

function addGrade() { collect(); W.grades.push({ code: '', label: '', color: '#CCCCCC', chef: false }); render(); }
function delGrade(i) { collect(); W.grades.splice(i, 1); render(); }
function moveGrade(i, d) { collect(); const g = W.grades.splice(i, 1)[0]; W.grades.splice(i + d, 0, g); render(); }
function addCode() { collect(); W.codes.push({ code: '', groupe: '21h', floor: false }); render(); }
function delCode(i) { collect(); W.codes.splice(i, 1); render(); }
function delAlias(k) { collect(); delete W.aliases[k]; render(); }

function resetDefaults() {
  if (!confirm('Rétablir tous les réglages d\'origine ? Les rapprochements de noms sont conservés.')) return;
  const keep = W.aliases;
  W = blMerge(BL_DEFAULT_CONFIG, {});
  W.aliases = keep;
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
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  try { await SB.saveBreakListConfig(W); flash('Réglages enregistrés'); }
  catch (e) { console.error(e); flash('Enregistrement impossible'); }
  btn.disabled = false;
}
