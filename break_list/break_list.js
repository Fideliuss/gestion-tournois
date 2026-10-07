// ══════════════════════════════════════════════════════
//  BREAK LIST - page « Aujourd'hui » : présents du soir, extraction Octime, répartition, break list imprimable
//  Les présents viennent du planning du mois ; l'extraction Octime (deltas de quota) reste dans le navigateur
//  (sessionStorage, effacée à la fermeture de l'onglet) et n'est jamais envoyée à la base.
// ══════════════════════════════════════════════════════

let cfg = null;
let plan = null;                  // planning du mois affiché (null = aucun)
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
  try { plan = await SB.getBreakListPlanning(blMonthKey(D.y, D.m)); }
  catch (e) { console.error(e); plan = null; flash('Lecture du planning impossible'); }
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
  box.innerHTML = parts.join('<i>·</i>') + '<span class="tot">Total <b>' + _presents.length + '</b></span>';
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
  try { await SB.saveBreakListPlanning(blMonthKey(D.y, D.m), plan); flash('Planning mis à jour'); }
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
    } else rows = blParseOctime(await f.text());
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
  st.innerHTML = 'Extraction de <b>' + hh + '</b> : ' + octime.rows.length + ' salariés lus' + (total ? ' · <b>' + ok + '/' + total + '</b> présents rapprochés' : '');
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

function renderRepartition() {
  const out = document.getElementById('rep-out');
  if (!_presents.length) { out.innerHTML = '<div class="bl-empty">Aucun présent à répartir.</div>'; return; }
  if (!octime) { out.innerHTML = '<div class="bl-empty">Collez l\'extraction Octime pour calculer la répartition.</div>'; return; }
  const people = _presents.map(function (p) {
    const m = match && match.match[p.id], dm = m && m.octime.minutes != null ? m.octime.minutes : null;
    return Object.assign({}, p, { delta: dm == null ? 0 : dm, known: dm != null });
  });
  const res = blRepartir(people, { stackers: numOpt('opt-stackers'), compteurs: numOpt('opt-compteurs'), cartes: numOpt('opt-cartes'), salle: document.getElementById('opt-salle').checked });
  const li = function (p) {
    return '<li class="' + (p.chef ? 'chef' : '') + '">' + (p.groupe === '20h' ? '◉ ' : '') + esc(blNomCourt(p, cfg.affichage))
      + (p.floor ? ' <em>' + esc(cfg.breaklist.floorMarque) + '</em>' : '') + ' <i>(' + (p.known ? blDeltaH(p.delta) : '?') + ')</i></li>';
  };
  const col = function (title, list) { return '<div class="bl-rep-col"><h4>' + title + ' <span>' + list.length + '</span></h4><ul>' + list.map(li).join('') + '</ul></div>'; };
  const warns = res.warnings.slice();
  const unk = people.filter(function (p) { return !p.known; }).length;
  if (unk) warns.push(unk + ' présent(s) sans delta (compté 0) : ' + people.filter(function (p) { return !p.known; }).map(function (p) { return blNomCourt(p, cfg.affichage); }).join(', ') + '.');
  out.innerHTML = '<div class="bl-rep">' + col('Stackers Haut', res.stackers) + col('Compteurs', res.compteurs) + col('Cartes', res.cartes) + col('Salle', res.salle) + col('Départs', res.departs) + '</div>'
    + (warns.length ? '<div class="bl-warn">' + warns.map(esc).join('<br>') + '</div>' : '')
    + '<div class="bl-legend">◉ arrivée 20h · en gras : chef · ' + esc(cfg.breaklist.floorMarque) + ' : floor · entre parenthèses : delta de quota</div>';
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
