// ══════════════════════════════════════════════════════
//  BREAK LIST - page « Aujourd'hui » : présents du soir, extraction Octime, répartition, break list imprimable
//  Les présents viennent du planning du mois ; l'extraction Octime (deltas de quota) reste dans le navigateur
//  (sessionStorage, effacée à la fermeture de l'onglet) et n'est jamais envoyée à la base.
// ══════════════════════════════════════════════════════

let cfg = null;
let plan = null;                  // planning du mois affiché (null = aucun)
let planMaj = null;               // date de la dernière mise à jour du planning (ISO)
let D = { y: 0, m: 0, d: 0 };     // soirée affichée
let octime = null;                // { at, rows: [{nom, matricule, minutes}] }
let match = null;                 // résultat de blRapprocher pour les présents
const SS_KEY = 'bl_octime';

// ── Démarrage ────────────────────────────────────────

async function init() {
  cfg = await blLoadConfig();
  const sel = document.getElementById('sel-mon');
  BL_MOIS.forEach(function (n, i) {
    const o = document.createElement('option');
    o.value = i + 1; o.textContent = n.charAt(0).toUpperCase() + n.slice(1);
    sel.appendChild(o);
  });
  try { const raw = sessionStorage.getItem(SS_KEY); if (raw) octime = JSON.parse(raw); } catch (e) { octime = null; }
  document.getElementById('opt-stackers').value = cfg.postes.stackers;
  document.getElementById('opt-compteurs').value = cfg.postes.compteurs;
  document.getElementById('opt-cartes').value = cfg.postes.cartes;
  document.getElementById('opt-salle').checked = !!cfg.postes.salle;
  const rep = document.getElementById('rep-out');
  rep.addEventListener('click', repClick);
  ['dragstart', 'dragover', 'drop'].forEach(function (t) { rep.addEventListener(t, repDrag); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && repSel) { repSel = null; drawRep(); } });
  await goToday();
}

async function goToday() {
  const t = blAujourdhui(new Date(), cfg);
  D = { y: t.year, m: t.month, d: t.day };
  await loadPlan();
}

function writeDate() {
  document.getElementById('inp-day').value = D.d;
  document.getElementById('sel-mon').value = D.m;
  document.getElementById('inp-year').value = D.y;
}

async function onDateChange() {
  const y = parseInt(document.getElementById('inp-year').value, 10) || D.y;
  const m = parseInt(document.getElementById('sel-mon').value, 10) || D.m;
  const d = Math.min(Math.max(parseInt(document.getElementById('inp-day').value, 10) || 1, 1), blDaysIn(y, m));
  const monthChanged = y !== D.y || m !== D.m;
  D = { y: y, m: m, d: d };
  if (monthChanged) await loadPlan(); else renderAll();
}

async function shiftDay(n) {
  const t = new Date(D.y, D.m - 1, D.d + n);
  D = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  await loadPlan();
}

async function loadPlan() {
  writeDate();
  const key = blMonthKey(D.y, D.m);
  try {
    plan = await SB.getBreakListPlanning(key);
    const row = plan ? (await SB.listBreakListPlannings()).find(function (r) { return r.mois === key; }) : null;
    planMaj = row ? row.updated_at : null;
  } catch (e) { console.error(e); plan = null; planMaj = null; flash('Lecture du planning impossible'); }
  renderAll();
}

// ── Rendu général ────────────────────────────────────

let _presents = [];

function renderAll() {
  _presents = plan && D.d <= plan.days ? blPresents(plan, D.d, cfg) : [];
  match = octime && _presents.length ? blRapprocher(_presents, octime.rows, cfg.aliases) : null;
  const info = document.getElementById('plan-info');
  if (!plan) info.innerHTML = 'Aucun planning pour ' + esc(blMonthLabel(D.y, D.m)) + '. <a href="planning.html" style="color:var(--gold-dim);text-decoration:underline">Importer le planning</a>';
  else info.textContent = 'Planning de ' + blMonthLabel(D.y, D.m) + ' · ' + plan.rows.length + ' salariés · ' + blDateLabel(D.y, D.m, D.d);
  document.getElementById('plan-maj').textContent = plan && planMaj ? 'Dernière mise à jour du planning : ' + blStamp(planMaj) : '';
  renderCount();
  renderPresents();
  renderOctime();
  renderRepartition();
  renderPrint();
}

// ── Effectif du soir : une pastille par horaire du planning, puis le total ──

function renderCount() {
  const box = document.getElementById('count-out');
  box.hidden = !plan || D.d > plan.days;
  if (box.hidden) return;
  const n = function (k) { return _presents.filter(function (p) { return p.code === k.code; }).length; };
  // « 5 à 19:55 · 6 à 20:55 · 1 floor à 20:30 », puis le total ; les horaires d'équipe d'abord, le floor ensuite (seulement s'il y en a)
  const parts = cfg.codes.filter(function (k) { return !k.floor && k.groupe !== 'depart'; })
    .map(function (k) { return '<span><b>' + n(k) + '</b> à ' + esc(k.code) + '</span>'; })
    .concat(cfg.codes.filter(function (k) { return k.floor && n(k); })
      .map(function (k) { return '<span class="flr"><b>' + n(k) + '</b> floor à ' + esc(k.code) + '</span>'; }));
  box.innerHTML = parts.join('') + '<i class="sep"></i><span class="tot">Total <b>' + _presents.length + '</b></span>';
}

// ── Présents ─────────────────────────────────────────

function groupeLabel(g) { return g === '20h' ? '20h' : g === '21h' ? '21h' : 'départ'; }

function codeOptions(current) {
  const opts = cfg.codes.map(function (k) {
    return '<option value="' + esc(k.code) + '"' + (k.code === current ? ' selected' : '') + '>' + esc(k.code) + (k.floor ? ' floor' : '') + ' · ' + groupeLabel(k.groupe) + '</option>';
  });
  opts.push('<option value="ABS">Absent ce soir</option>');
  return opts.join('');
}

function renderPresents() {
  const out = document.getElementById('presents-out'), addBox = document.getElementById('add-box');
  addBox.hidden = !plan;
  if (!plan) { out.innerHTML = '<div class="bl-empty">Aucun planning pour ce mois.</div>'; return; }
  if (D.d > plan.days) { out.innerHTML = '<div class="bl-empty">Ce jour n\'existe pas dans le planning.</div>'; addBox.hidden = true; return; }
  const deltaOf = function (p) {
    const m = match && match.match[p.id];
    return m && m.octime.minutes != null ? m.octime.minutes : null;
  };
  const groups = [['20h', 'Arrivée 20h'], ['21h', 'Arrivée 21h'], ['depart', 'Part en premier']];
  out.innerHTML = '<div class="bl-groups">' + groups.map(function (g) {
    const list = _presents.filter(function (p) { return p.groupe === g[0]; });
    if (!list.length && g[0] === 'depart') return '';
    return '<div class="bl-group"><h4>' + g[1] + ' <span>' + list.length + '</span></h4>' + (list.length ? list.map(function (p) {
      const dm = deltaOf(p);
      return '<div class="bl-person"><span class="bl-dot" style="background:' + esc(p.color) + '"></span>'
        + '<span class="nm">' + (p.chef ? '<b>' + esc(blNomCourt(p, cfg.affichage)) + '</b>' : esc(blNomCourt(p, cfg.affichage)))
        + (p.floor ? '<span class="bl-tag">' + esc(cfg.breaklist.floorMarque) + '</span>' : '') + '<small>' + esc(p.grade) + '</small></span>'
        + '<span class="dl' + (octime && dm == null ? ' unk' : '') + '">' + (octime ? (dm == null ? '?' : blDeltaH(dm)) : '') + '</span>'
        + '<select data-id="' + esc(p.id) + '" onchange="editCode(this.dataset.id, this.value)">' + codeOptions(p.code) + '</select></div>';
    }).join('') : '<div class="bl-muted" style="padding:6px 0">Personne</div>') + '</div>';
  }).join('') + '</div>';
  // Ajout d'un présent : les absents du jour
  const present = {}; _presents.forEach(function (p) { present[p.id] = true; });
  const absents = plan.rows.filter(function (r) { return !present[blNorm(r.nom + ' ' + r.prenom)]; });
  document.getElementById('add-person').innerHTML = absents.map(function (r) {
    return '<option value="' + esc(blNorm(r.nom + ' ' + r.prenom)) + '">' + esc(r.nom + ' ' + r.prenom) + ' (' + esc(r.codes[D.d - 1] || 'vide') + ')</option>';
  }).join('');
  document.getElementById('add-code').innerHTML = cfg.codes.map(function (k) {
    return '<option value="' + esc(k.code) + '">' + esc(k.code) + (k.floor ? ' · floor' : '') + '</option>';
  }).join('');
  addBox.hidden = !absents.length;
}

async function setCell(id, code) {
  const row = plan.rows.find(function (r) { return blNorm(r.nom + ' ' + r.prenom) === id; });
  if (!row) return;
  while (row.codes.length < plan.days) row.codes.push('');
  row.codes[D.d - 1] = code;
  try { await SB.saveBreakListPlanning(blMonthKey(D.y, D.m), plan); planMaj = new Date().toISOString(); flash('Planning mis à jour'); }
  catch (e) { console.error(e); flash('Enregistrement impossible'); }
  renderAll();
}

function editCode(id, code) { setCell(id, code); }

function addPresent() {
  const id = document.getElementById('add-person').value, code = document.getElementById('add-code').value;
  if (id && code) setCell(id, code);
}

// ── Extraction Octime ────────────────────────────────

function saveOctime() {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(octime)); } catch (e) { /* stockage indisponible : l'extraction reste en mémoire */ }
}

function setOctime(rows) {
  octime = { at: Date.now(), rows: rows };
  saveOctime();
  renderAll();
}

function clearOctime() {
  octime = null;
  try { sessionStorage.removeItem(SS_KEY); } catch (e) { /* rien à effacer */ }
  renderAll();
}

let _pasteT = null;
function onOctimePaste() {
  clearTimeout(_pasteT);
  _pasteT = setTimeout(function () {
    const ta = document.getElementById('octime-paste'), text = ta.value;
    if (!text.trim()) return;
    try { setOctime(blParseOctime(text)); ta.value = ''; flash('Extraction lue'); }
    catch (e) { document.getElementById('octime-status').innerHTML = '<span style="color:#D9864A">' + esc(e.message) + '</span>'; }
  }, 250);
}

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('Chargement de la bibliothèque Excel impossible (connexion ?)')); };
    document.head.appendChild(s);
  });
}

async function onOctimeFile(input) {
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  try {
    let rows;
    if (/\.xlsx?$/i.test(f.name)) {
      if (typeof XLSX === 'undefined') await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      let last = null;
      for (let i = 0; i < wb.SheetNames.length && !rows; i++) {
        try { rows = blOctimeRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[i]], { header: 1, raw: true, defval: '' })); }
        catch (e) { last = e; }
      }
      if (!rows) throw last || new Error('Aucune feuille exploitable.');
    } else rows = blParseOctime(blDecodeText(await f.arrayBuffer()));
    setOctime(rows); flash('Extraction lue');
  } catch (e) {
    document.getElementById('octime-status').innerHTML = '<span style="color:#D9864A">' + esc(e.message) + '</span>';
  }
}

function renderOctime() {
  const st = document.getElementById('octime-status'), clr = document.getElementById('btn-octime-clear'), um = document.getElementById('unmatched-out');
  clr.hidden = !octime;
  um.innerHTML = '';
  if (!octime) { st.textContent = 'Aucune extraction chargée.'; return; }
  const t = new Date(octime.at), hh = blPad(t.getHours()) + ':' + blPad(t.getMinutes());
  const total = _presents.length, ok = match ? Object.keys(match.match).length : 0;
  // Les extractions sont arrêtées au dimanche qui suit la soirée (réglable) : une autre date fausse les deltas (repos décalés)
  const arr = blOctimeArrete(octime.rows), attendu = blArreteAttendu(D.y, D.m, D.d, cfg.arreteJour);
  const mauvais = arr != null && arr !== attendu;
  const fr = function (t, long) { return new Date(t).toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } : { timeZone: 'UTC' }); };
  const arrTxt = arr == null ? '' : ' · arrêtée au <b' + (mauvais ? ' style="color:#D9864A"' : '') + '>' + fr(arr) + '</b>';
  st.innerHTML = 'Extraction chargée à <b>' + hh + '</b>' + arrTxt + ' : ' + octime.rows.length + ' salariés lus' + (total ? ' · <b>' + ok + '/' + total + '</b> présents rapprochés' : '')
    + (mauvais ? '<br><span style="color:#D9864A">Pour la soirée du ' + esc(blDateLabel(D.y, D.m, D.d)) + ', il faut une extraction arrêtée au <b>' + esc(fr(attendu, true)) + '</b> : sinon les repos décalés faussent les deltas.</span>' : '');
  if (!match || (!match.manquants.length && !match.ambigus.length)) return;
  const names = octime.rows.map(function (r) { return r.nom; }).sort(function (a, b) { return a.localeCompare(b, 'fr'); });
  const rowsHtml = match.ambigus.map(function (a) { return [a.p, a.candidats.map(function (c) { return c.nom; })]; })
    .concat(match.manquants.map(function (p) { return [p, []]; }));
  um.innerHTML = '<div class="bl-muted" style="margin-bottom:6px">Ces présents ne sont pas reconnus dans l\'extraction. Choisissez leur ligne Octime (le choix est mémorisé), sinon leur delta est compté 0.</div>'
    + rowsHtml.map(function (r) {
      const p = r[0], cand = r[1];
      const opts = ['<option value="">Pas de delta (compté 0)</option>']
        .concat(cand.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + ' (possible)</option>'; }))
        .concat(names.filter(function (n) { return cand.indexOf(n) < 0; }).map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }));
      return '<div class="bl-um"><span>' + esc(p.nom + ' ' + p.prenom) + '</span><select data-key="' + esc(blNorm(p.nom + ' ' + p.prenom)) + '" onchange="setAlias(this.dataset.key, this.value)">' + opts.join('') + '</select></div>';
    }).join('');
}

async function setAlias(key, value) {
  if (value) cfg.aliases[key] = value; else delete cfg.aliases[key];
  try { await SB.saveBreakListConfig(cfg); flash('Rapprochement enregistré'); }
  catch (e) { console.error(e); flash('Enregistrement impossible'); }
  renderAll();
}

// ── Répartition ──────────────────────────────────────

function numOpt(id) { return Math.max(0, parseInt(document.getElementById(id).value, 10) || 0); }

let repState = null;   // répartition affichée : { key, cols, manual, warns, people } ; modifiable à la main
let repSel = null;     // identifiant du nom sélectionné pour un échange ou un déplacement
const REP_COLS = [['stackers', 'Stackers'], ['compteurs', 'Compteurs'], ['cartes', 'Cartes'], ['salle', 'Salle'], ['departs', 'Départs']];

function renderRepartition() {
  const out = document.getElementById('rep-out'), btn = document.getElementById('btn-print-dep');
  document.getElementById('dep-print').innerHTML = '';
  btn.disabled = true;
  if (!_presents.length) { repState = null; out.innerHTML = '<div class="bl-empty">Aucun présent à répartir.</div>'; return; }
  if (!octime) { repState = null; out.innerHTML = '<div class="bl-empty">Collez l\'extraction Octime pour calculer la répartition.</div>'; return; }
  const people = _presents.map(function (p) {
    const m = match && match.match[p.id], dm = m && m.octime.minutes != null ? m.octime.minutes : null;
    return Object.assign({}, p, { delta: dm == null ? 0 : dm, known: dm != null });
  });
  const opts = { stackers: numOpt('opt-stackers'), compteurs: numOpt('opt-compteurs'), cartes: numOpt('opt-cartes'), salle: document.getElementById('opt-salle').checked };
  // Une répartition modifiée à la main est conservée tant que les présents, les deltas et les postes ne changent pas
  const key = JSON.stringify([people.map(function (p) { return [p.id, p.delta, p.groupe, p.chef]; }), opts]);
  if (!repState || repState.key !== key) {
    const res = blRepartir(people, opts);
    repState = { key: key, manual: false, warns: res.warnings, people: people,
      cols: { stackers: res.stackers, compteurs: res.compteurs, cartes: res.cartes, salle: res.salle, departs: res.departs } };
    repSel = null;
  }
  drawRep();
  btn.disabled = false;
}

function drawRep() {
  const out = document.getElementById('rep-out'), st = repState;
  const li = function (p) {
    return '<li draggable="true" data-id="' + esc(p.id) + '" class="' + (p.chef ? 'chef ' : '') + (repSel === p.id ? 'sel' : '') + '">' + (p.groupe === '20h' ? '◉ ' : '') + esc(blNomCourt(p, cfg.affichage))
      + ' <i>(' + (p.known ? blDeltaH(p.delta) : '?') + ')</i></li>';
  };
  const shown = REP_COLS.filter(function (c) { return st.cols[c[0]].length || repSel; });
  if (!shown.length) shown.push(REP_COLS[4]);
  const col = function (c) {
    const list = st.cols[c[0]];
    return '<div class="bl-rep-col' + (list.length ? '' : ' ghost') + '" data-col="' + c[0] + '"><h4>' + c[1] + ' <span>' + list.length + '</span></h4><ul>' + list.map(li).join('') + '</ul></div>';
  };
  const warns = st.warns.slice();
  if (st.manual) {
    const chefs = st.cols.stackers.filter(function (p) { return p.chef; }).length;
    if (st.cols.stackers.length && chefs !== 1) warns.push('Stackers : ' + chefs + ' chef(s) (1 attendu).');
  }
  const unk = st.people.filter(function (p) { return !p.known; });
  if (unk.length) warns.push(unk.length + ' présent(s) sans delta (compté 0) : ' + unk.map(function (p) { return blNomCourt(p, cfg.affichage); }).join(', ') + '.');
  out.innerHTML = '<div class="bl-rep" style="--n:' + shown.length + '">' + shown.map(col).join('') + '</div>'
    + (warns.length ? '<div class="bl-warn">' + warns.map(esc).join('<br>') + '</div>' : '')
    + '<div class="bl-legend">◉ arrivée 20h'
    + (st.manual ? ' · <b style="color:var(--gold-dim)">modifiée à la main</b> <button class="btn btn-ghost btn-sm" onclick="resetRep()">Régénérer</button>' : '') + '</div>';
  renderDepPrint(st.cols);
}

// Modification à la main : cliquer un nom puis un autre pour les échanger, ou puis une colonne pour l'y déplacer (le glisser-déposer fait de même)

function repFind(id) {
  for (let i = 0; i < REP_COLS.length; i++) {
    const k = REP_COLS[i][0], idx = repState.cols[k].findIndex(function (p) { return p.id === id; });
    if (idx >= 0) return { k: k, idx: idx };
  }
  return null;
}

function repSwap(a, b) {
  const A = repFind(a), B = repFind(b);
  if (!A || !B) return;
  const cols = repState.cols, t = cols[A.k][A.idx];
  cols[A.k][A.idx] = cols[B.k][B.idx]; cols[B.k][B.idx] = t;
}

function repMove(id, k) {
  const A = repFind(id);
  if (!A || A.k === k) return;
  repState.cols[k].push(repState.cols[A.k].splice(A.idx, 1)[0]);
}

function repEdited() { repState.manual = true; repSel = null; drawRep(); }

function resetRep() { repState = null; repSel = null; renderRepartition(); }

function repClick(e) {
  if (!repState) return;
  const li = e.target.closest('li[data-id]'), colEl = e.target.closest('.bl-rep-col');
  if (li) {
    const id = li.dataset.id;
    if (!repSel) repSel = id;
    else if (repSel === id) repSel = null;
    else { repSwap(repSel, id); repEdited(); return; }
    drawRep();
  } else if (colEl && repSel) { repMove(repSel, colEl.dataset.col); repEdited(); }
}

function repDrag(e) {
  const li = e.target.closest && e.target.closest('li[data-id]');
  if (e.type === 'dragstart' && li) { e.dataTransfer.setData('text/plain', li.dataset.id); e.dataTransfer.effectAllowed = 'move'; return; }
  if (e.type === 'dragover' && e.target.closest('.bl-rep-col')) { e.preventDefault(); return; }
  if (e.type === 'drop') {
    const id = e.dataTransfer.getData('text/plain'), colEl = e.target.closest('.bl-rep-col');
    if (!id || !colEl || !repState) return;
    e.preventDefault();
    if (li && li.dataset.id !== id) repSwap(id, li.dataset.id); else if (!li) repMove(id, colEl.dataset.col); else return;
    repEdited();
  }
}

// ── Feuille des départs imprimable (pour le chef qui gère la break list) : A4 portrait, pliable en 2 ou en 4 ──

function effectifTexte() {
  const n = function (k) { return _presents.filter(function (p) { return p.code === k.code; }).length; };
  return cfg.codes.filter(function (k) { return !k.floor && k.groupe !== 'depart'; }).map(function (k) { return n(k) + ' à ' + k.code; })
    .concat(cfg.codes.filter(function (k) { return k.floor && n(k); }).map(function (k) { return n(k) + ' floor à ' + k.code; }))
    .concat(['Total ' + _presents.length]).join(' · ');
}

/** Une colonne par poste, toutes sur une seule ligne ; un poste vide (la salle fermée, par exemple) n'est pas imprimé.
 *  Les colonnes ont la même largeur : à 4 colonnes, un pli en deux puis en quatre tombe entre elles. */
function renderDepPrint(cols) {
  const sections = REP_COLS.filter(function (c) { return cols[c[0]].length; });
  const max = Math.max.apply(null, sections.map(function (c) { return cols[c[0]].length; }).concat([1]));
  const cell = function (p) {
    if (!p) return '<td></td>';
    return '<td class="' + (p.chef ? 'chef' : '') + '"><span>' + (p.groupe === '20h' ? '◉ ' : '') + esc(blNomCourt(p, cfg.affichage))
      + '</span><small>' + (p.known ? blDeltaH(p.delta) : '?') + '</small></td>';
  };
  let body = '';
  for (let i = 0; i < max; i++) body += '<tr>' + sections.map(function (c) { return cell(cols[c[0]][i]); }).join('') + '</tr>';
  const rh = Math.round(Math.min(10, Math.max(7, 230 / max)) * 10) / 10;
  document.getElementById('dep-print').innerHTML = '<section class="bl-page dep-page"><div class="bl-title">Départs du ' + esc(blDateLabel(D.y, D.m, D.d)) + '</div>'
    + '<div class="dep-eff">' + esc(effectifTexte()) + '</div>'
    + '<table class="dep-tbl" style="--rh:' + rh + 'mm"><thead><tr>' + sections.map(function (c) {
      return '<th>' + c[1] + '<span>' + cols[c[0]].length + '</span></th>';
    }).join('') + '</tr></thead><tbody>' + body + '</tbody></table>'
    + '<div class="dep-leg">◉ arrivée 20h</div></section>';
}

function printDeparts() {
  document.body.classList.add('print-dep');
  const page = document.createElement('style');                      // cette feuille est en portrait, la break list en paysage
  page.textContent = '@page { size: A4 portrait; margin: 8mm; }';
  document.head.appendChild(page);
  const done = function () { document.body.classList.remove('print-dep'); page.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  printWithTitle('Départs - ' + blDateLabel(D.y, D.m, D.d));
  setTimeout(done, 1500);
}

// ── Break list imprimable ────────────────────────────

/** Prénom seul, avec l'initiale du nom quand deux présents ont le même prénom */
function prenomAffiche(p, list) {
  const same = list.filter(function (x) { return blNorm(x.prenom) === blNorm(p.prenom); }).length > 1;
  return same ? p.prenom + ' ' + (p.nom.charAt(0).toUpperCase()) + '.' : p.prenom;
}

function renderPrint() {
  const b = cfg.breaklist, cols = Math.max(1, b.colonnes | 0), blocs = Math.max(1, b.blocs | 0);
  const pres = blOrdreBreakList(_presents), n = pres.length;
  const colgroup = '<colgroup><col style="width:22mm">' + '<col>'.repeat(cols) + '</colgroup>';
  const rowsN = n || 12;                                                  // aucun présent : feuille vierge de 12 lignes
  const rh = Math.round(Math.min(8.5, Math.max(4, (176 - (blocs - 1) * 2.2) / (rowsN * blocs))) * 10) / 10;
  let body = '';
  for (let k = 0; k < blocs; k++) {
    if (k) body += '<tr class="sep"><td colspan="' + (cols + 1) + '"></td></tr>';
    for (let i = 0; i < rowsN; i++) {
      const p = pres[i], last = i === rowsN - 1, endGrade = p && pres[i + 1] && pres[i + 1].grade !== p.grade;
      body += '<tr class="' + (i === 0 ? 'first ' : '') + (last ? 'last ' : '') + (endGrade ? 'endgrade' : '') + '">'
        + '<td class="n"' + (p ? ' style="background:' + esc(p.color) + '"' : '') + '>' + (p ? esc(prenomAffiche(p, pres)) : '') + '</td>'
        + '<td class="t">' + (p && p.floor ? esc(b.floorMarque) : '') + '</td>' + '<td></td>'.repeat(cols - 1) + '</tr>';
    }
  }
  const recto = '<section class="bl-page"><div class="bl-title">Breaklist du ' + esc(blDateLabel(D.y, D.m, D.d)) + '</div>'
    + '<table class="bl-grid" style="--rh:' + rh + 'mm">' + colgroup + '<tbody>' + body + '</tbody></table></section>';

  const lignes = blLignesVerso(cfg), kc = Math.max(1, b.colonnesVerso | 0);
  const rhv = Math.round(Math.min(9.5, 188 / Math.max(lignes.length, 1)) * 10) / 10;
  const verso = '<section class="bl-page"><table class="bl-tables" style="--rh:' + rhv + 'mm"><colgroup><col style="width:30mm">' + '<col>'.repeat(kc) + '</colgroup><tbody>'
    + lignes.map(function (l) {
      return '<tr class="' + (l.total ? 'tot' : '') + '"><td class="n">' + esc(l.label) + '</td>' + '<td></td>'.repeat(kc) + '</tr>';
    }).join('') + '</tbody></table></section>';
  document.getElementById('bl-print').innerHTML = recto + verso;
}

function printBreakList() {
  printWithTitle('Break list - ' + blDateLabel(D.y, D.m, D.d));
}
