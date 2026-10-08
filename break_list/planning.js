// ══════════════════════════════════════════════════════
//  BREAK LIST - page « Planning » : import du CSV mensuel, consultation, correction d'une case
//  Un planning par mois ; importer un mois déjà enregistré le remplace après confirmation (différences affichées).
// ══════════════════════════════════════════════════════

let cfg = null;
let Y = 0, M = 0;
let plan = null;          // planning enregistré du mois affiché
let pending = null;       // fichier lu, en attente de confirmation : { planning, old }
let saved = [];           // mois déjà enregistrés

async function init() {
  cfg = await blLoadConfig();
  const sel = document.getElementById('sel-month');
  BL_MOIS.forEach(function (n, i) {
    const o = document.createElement('option');
    o.value = i + 1; o.textContent = n.charAt(0).toUpperCase() + n.slice(1);
    sel.appendChild(o);
  });
  const t = blAujourdhui(new Date(), cfg);
  Y = t.year; M = t.month;
  await refresh();
}

function writePeriod() {
  document.getElementById('sel-month').value = M;
  document.getElementById('inp-year').value = Y;
}

async function onPeriodChange() {
  Y = parseInt(document.getElementById('inp-year').value, 10) || Y;
  M = parseInt(document.getElementById('sel-month').value, 10) || M;
  pending = null;
  await refresh();
}

async function refresh() {
  writePeriod();
  try {
    plan = await SB.getBreakListPlanning(blMonthKey(Y, M));
    saved = await SB.listBreakListPlannings();
  } catch (e) { console.error(e); plan = null; flash('Lecture impossible'); }
  render();
}

function render() {
  document.getElementById('btn-del').hidden = !plan;
  document.getElementById('saved-months').innerHTML = saved.length
    ? 'Plannings enregistrés : ' + saved.map(function (s) {
        const y = Number(s.mois.slice(0, 4)), m = Number(s.mois.slice(5));
        return '<a href="#" style="color:var(--gold-dim);text-decoration:underline;margin-right:10px" onclick="goMonth(' + y + ',' + m + ');return false">' + esc(blMonthLabel(y, m)) + '</a>';
      }).join('')
    : 'Aucun planning enregistré pour le moment.';
  renderPending();
  document.getElementById('plan-title').textContent = 'Planning de ' + blMonthLabel(Y, M);
  renderTable();
}

function goMonth(y, m) { Y = y; M = m; pending = null; refresh(); }

// ── Import ───────────────────────────────────────────

async function readText(file) { return blDecodeText(await file.arrayBuffer()); }          // UTF-8, ou Windows-1252 (CSV Excel français)

async function onPlanFile(input) {
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  try {
    showError('');
    const parsed = blParsePlanning(await readText(f));
    Y = parsed.year; M = parsed.month;
    writePeriod();
    let old = null;
    try { old = await SB.getBreakListPlanning(blMonthKey(Y, M)); } catch (e) { console.error(e); }
    plan = old;
    pending = { planning: parsed, old: old };
    render();
    document.getElementById('pending-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {
    pending = null; render();
    showError(e.message);
  }
}

function showError(msg) {
  const box = document.getElementById('plan-error');
  box.textContent = msg; box.hidden = !msg;
}

function renderPending() {
  const card = document.getElementById('pending-card');
  card.hidden = !pending;
  if (!pending) return;
  const p = pending.planning, old = pending.old, diffs = old ? blDiffPlanning(old, p) : [];
  const unk = blCodesInconnus(p, cfg);
  document.getElementById('pending-title').textContent = (old ? 'Remplacer le planning de ' : 'Nouveau planning de ') + blMonthLabel(p.year, p.month);
  document.getElementById('btn-confirm').textContent = old ? 'Remplacer le planning' : 'Enregistrer le planning';
  let html = '<div class="bl-muted">' + p.rows.length + ' salariés · ' + p.days + ' jours.</div>';
  if (old) {
    html += diffs.length
      ? '<div class="bl-muted" style="margin-top:8px"><b style="color:var(--cream)">' + diffs.length + ' différence(s)</b> avec le planning enregistré :</div><div class="pl-diff">'
        + diffs.slice(0, 300).map(function (d) {
            const who = '<b>' + esc(d.nom + ' ' + d.prenom) + '</b>';
            return d.jour == null ? '<div>' + who + ' : ' + esc(d.avant) + ' → ' + esc(d.apres) + '</div>'
              : '<div>' + who + ', le ' + d.jour + ' : <s>' + esc(d.avant || 'vide') + '</s> → ' + esc(d.apres || 'vide') + '</div>';
          }).join('') + (diffs.length > 300 ? '<div>… et ' + (diffs.length - 300) + ' autres</div>' : '') + '</div>'
      : '<div class="bl-muted" style="margin-top:8px">Identique au planning enregistré : rien ne change.</div>';
  }
  if (unk.length) html += '<div class="bl-warn">Codes non reconnus (traités comme absents) : ' + unk.map(function (u) { return esc(u.code) + ' (' + u.nb + ' fois)'; }).join(', ') + '. À déclarer dans <a href="reglages.html" style="text-decoration:underline">Réglages</a> (horaires ou absences) si besoin.</div>';
  document.getElementById('pending-body').innerHTML = html;
}

async function confirmImport() {
  if (!pending) return;
  const p = pending.planning, btn = document.getElementById('btn-confirm');
  btn.disabled = true;
  try {
    await SB.saveBreakListPlanning(blMonthKey(p.year, p.month), p);
    flash('Planning enregistré');
    pending = null;
    await refresh();
  } catch (e) { console.error(e); flash('Enregistrement impossible'); }
  btn.disabled = false;
}

function cancelImport() { pending = null; refresh(); }

async function deletePlanning() {
  if (!plan || !confirm('Supprimer le planning de ' + blMonthLabel(Y, M) + ' ?')) return;
  try { await SB.deleteBreakListPlanning(blMonthKey(Y, M)); flash('Planning supprimé'); await refresh(); }
  catch (e) { console.error(e); flash('Suppression impossible'); }
}

// ── Tableau du mois ──────────────────────────────────

function renderTable() {
  const out = document.getElementById('plan-out');
  const p = pending ? pending.planning : plan;
  if (!p) { out.innerHTML = '<div class="bl-empty">Aucun planning pour ce mois. Importez le CSV du planning.</div>'; return; }
  const t = blAujourdhui(new Date(), cfg), todayCol = t.year === p.year && t.month === p.month ? t.day : 0;
  const L = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  let head = '<tr><th class="nm"></th>';
  for (let d = 1; d <= p.days; d++) {
    const dow = new Date(p.year, p.month - 1, d).getDay();
    head += '<th class="' + (dow === 0 || dow === 6 ? 'we ' : '') + (d === todayCol ? 'today' : '') + '">' + L[dow] + '<br>' + d + '</th>';
  }
  head += '</tr>';
  const gradeColor = {}; cfg.grades.forEach(function (g) { gradeColor[g.code] = g.color; });
  const body = p.rows.map(function (r, ri) {
    let tds = '';
    for (let d = 1; d <= p.days; d++) {
      const c = r.codes[d - 1] || '', st = blStatut(c, cfg), ab = st.groupe ? null : blAbsence(c, cfg);
      let cls = st.groupe ? (st.floor ? 'onfl' : st.groupe === '20h' ? 'on20' : 'on21') : (c && !ab ? 'unk' : '');
      const bg = ab && !ab.vide && /^#[0-9a-f]{6}$/i.test(ab.color) ? ' style="background:' + ab.color + '38"' : '';
      const tip = r.nom + ' ' + r.prenom + ', le ' + d + (ab ? ' : ' + ab.label : st.groupe ? '' : ' : code non reconnu');
      tds += '<td class="c ' + cls + (d === todayCol ? ' today' : '') + '"' + bg + (pending ? '' : ' data-r="' + ri + '" data-d="' + d + '"') + ' title="' + esc(tip) + '">' + esc(c) + '</td>';
    }
    return '<tr><td class="nm"><i style="background:' + esc(gradeColor[r.grade] || '#ccc') + '"></i>' + esc(r.nom + ' ' + r.prenom) + '</td>' + tds + '</tr>';
  }).join('');
  out.innerHTML = '<div class="pl-wrap"><table class="pl-tbl" id="pl-tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>'
    + '<div class="bl-legend pl-leg"><span><i style="background:var(--gold-dim)"></i>arrivée 20h</span><span><i style="background:#6f95e0"></i>arrivée 21h</span><span><i style="background:#6dcc8e"></i>floor</span>'
    + cfg.absences.map(function (a) { return '<span><i style="background:' + esc(a.color) + '"></i>' + esc(a.code) + ' ' + esc(a.label) + '</span>'; }).join('')
    + '<span>case vide : non planifié</span><span class="unkl">code non reconnu</span>'
    + '<span class="pl-note">' + (pending ? 'Aperçu du fichier à importer.' : 'Cliquez sur une case pour la modifier.') + '</span></div>';
  if (!pending) out.querySelector('#pl-tbl').addEventListener('click', onCellClick);
  document.getElementById('plan-card').hidden = false;
}

function onCellClick(e) {
  const td = e.target.closest('td.c');
  if (!td || td.querySelector('select, input')) return;
  const r = Number(td.dataset.r), d = Number(td.dataset.d), before = plan.rows[r].codes[d - 1] || '';
  const opt = function (v, l) { return '<option value="' + esc(v) + '">' + esc(l) + '</option>'; };
  const gl = function (g) { return g === '20h' ? '20h' : g === '21h' ? '21h' : 'départ'; };
  const sel = document.createElement('select');
  sel.innerHTML = opt('', 'Vide (non planifié)')
    + '<optgroup label="Présent">' + cfg.codes.map(function (k) { return opt(k.code, k.code + (k.floor ? ' floor' : '') + ' · ' + gl(k.groupe)); }).join('') + '</optgroup>'
    + '<optgroup label="Absent">' + cfg.absences.map(function (a) { return opt(a.code, a.code + ' · ' + a.label); }).join('') + '</optgroup>'
    + (before && !blStatut(before, cfg).groupe && !blAbsence(before, cfg) ? opt(before, before + ' (actuel)') : '') + opt('__autre', 'Autre code...');
  sel.value = before;
  td.textContent = ''; td.appendChild(sel); sel.focus();
  try { sel.showPicker(); } catch (err) { /* ouverture automatique non disponible : un clic suffit */ }
  let done = false, switching = false;
  const finish = async function (commit, v) {
    if (done) return; done = true;
    if (commit && v !== before) {
      while (plan.rows[r].codes.length < plan.days) plan.rows[r].codes.push('');
      plan.rows[r].codes[d - 1] = v;
      try { await SB.saveBreakListPlanning(blMonthKey(Y, M), plan); flash('Case modifiée'); }
      catch (err) { console.error(err); plan.rows[r].codes[d - 1] = before; flash('Enregistrement impossible'); }
    }
    renderTable();
  };
  sel.addEventListener('change', function () {
    if (sel.value !== '__autre') { finish(true, sel.value); return; }
    switching = true;                                           // code libre : un champ de saisie remplace la liste
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = before; inp.autocomplete = 'off';
    td.textContent = ''; td.appendChild(inp); inp.focus(); inp.select();
    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') finish(true, inp.value.trim()); else if (ev.key === 'Escape') finish(false); });
    inp.addEventListener('blur', function () { finish(true, inp.value.trim()); });
  });
  sel.addEventListener('blur', function () { if (!switching) finish(false); });
}
