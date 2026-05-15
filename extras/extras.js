/* ═══════════════════════════════════════════════════════
   extras.js — Déclaration Extras & Émargement Hebdomadaire
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════════════ */

const MOIS_FULL  = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN',
                    'JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];
const DAY_KEYS   = ['lun','mar','mer','jeu','ven','sam','dim'];
const DAY_LABELS = ['lun.','mar.','mer.','jeu.','ven.','sam.','dim.'];
const DAY_HDR    = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];


/* ══════════════════════════════════════════════════════
   FILE SYSTEM — wrapper extras (via BarriereFS)
══════════════════════════════════════════════════════ */
const FS = {
  fileName: 'extras_data.json',
  get connected() { return BarriereFS.connected; },
  async readAll() {
    const fb = { version:1, extras:[] };
    if (!BarriereFS.connected) {
      try { return JSON.parse(localStorage.getItem('extras_fallback')) || fb; } catch { return fb; }
    }
    return BarriereFS.read(this.fileName, fb);
  },
  async writeAll(data) {
    if (!BarriereFS.connected) { localStorage.setItem('extras_fallback', JSON.stringify(data)); return; }
    await BarriereFS.write(this.fileName, data);
  },
  async loadExtras() {
    const d = await this.readAll();
    return Array.isArray(d.extras) ? d.extras : [];
  },
  async saveExtras(list) {
    const d = await this.readAll();
    d.version = 1; d.extras = list;
    await this.writeAll(d);
  }
};

/* ── Persistance config + émargement (localStorage) ── */
function loadCfg()        { try { return Object.assign({weekdayTime:'20:55',sundayTime:'16:55'}, JSON.parse(localStorage.getItem('extras_cfg') || '{}')); } catch { return {weekdayTime:'20:55',sundayTime:'16:55'}; } }
function saveCfgData(c)   { localStorage.setItem('extras_cfg', JSON.stringify(c)); }
function emargKey(y, w)   { return `extras_emarg_${y}_${String(w).padStart(2, '0')}`; }
function loadEmarg(y, w)  { try { return JSON.parse(localStorage.getItem(emargKey(y, w)) || '{}'); } catch { return {}; } }
function saveEmarg(y,w,d) { localStorage.setItem(emargKey(y, w), JSON.stringify(d)); }

/* ── État ── */
let extras    = [];
let cfg       = loadCfg();
let editingId = null;

/* ── Helpers ── */
function uid()           { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function pad2(n)         { return String(n).padStart(2, '0'); }
function fmtDate(d)      { return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; }
function esc(s)          { return String(s).replace(/'/g, '\\x27'); }
function capWords(s)     { return s ? s.toLowerCase().replace(/(?:^|[ \-])\S/g, c => c.toUpperCase()) : ''; }
function sortedExtras()  { return [...extras].sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr')); }

/* ── ISO week ── */
function getISOWeek(date) {
  const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y1  = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - y1) / 86400000 + 1) / 7);
}
function getMondayOfISOWeek(week, year) {
  const jan4 = new Date(year, 0, 4);
  const dow  = jan4.getDay() || 7;
  const mon  = new Date(jan4);
  mon.setDate(jan4.getDate() - (dow - 1) + (week - 1) * 7);
  return mon;
}
function getWeekDays(week, year) {
  const mon = getMondayOfISOWeek(week, year);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  const now = new Date();

  document.getElementById('decl-month-input').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
  document.getElementById('emarg-week-input').value = `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2,'0')}`;
  document.getElementById('cfg-weekday-time').value = cfg.weekdayTime;
  document.getElementById('cfg-sunday-time').value  = cfg.sundayTime;

  await BarriereFS.restore();
  extras = await FS.loadExtras();
  renderAll();
});

function renderAll() {
  renderExtrasList();
  renderDeclaration();
  renderAssignTable();
  renderEmargement();
}

/* ── Onglets ── */
function showTab(name) {
  ['liste', 'declaration', 'emargement'].forEach(t => {
    document.getElementById(`tab-${t}`).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.xt-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name)
  );
}

/* ── Config session ── */
function saveCfgFromUI() {
  cfg.weekdayTime = document.getElementById('cfg-weekday-time').value.trim() || '20:55';
  cfg.sundayTime  = document.getElementById('cfg-sunday-time').value.trim()  || '16:55';
  saveCfgData(cfg);
  renderEmargement();
}
function dayTime(i) { return i === 6 ? cfg.sundayTime : cfg.weekdayTime; }

/* Priorité : override cellule > override colonne > défaut global */
function resolveTime(extraId, dayKey, dayIdx, emarg) {
  const cell = emarg[extraId]?._hours?.[dayKey];
  if (cell) return cell;
  const col = emarg._dayHours?.[dayKey];
  if (col) return col;
  return dayTime(dayIdx);
}

/* ── Liste extras ── */
function renderExtrasList() {
  const el = document.getElementById('extras-list-body');
  if (!el) return;
  if (!extras.length) {
    el.innerHTML = '<tr><td colspan="9" class="xt-empty">Aucun extra enregistré.</td></tr>';
    return;
  }
  el.innerHTML = sortedExtras().map(e => `
    <tr>
      <td class="xt-nom">${e.nom}</td>
      <td class="xt-prenom">${e.prenom}</td>
      <td>${e.dateNaissance || '—'}</td>
      <td>${e.lieuNaissance || '—'}</td>
      <td>${e.adresse || '—'}</td>
      <td>${e.codePostal || '—'}</td>
      <td>${e.ville || '—'}</td>
      <td><button class="btn-ghost" onclick="openEditModal('${esc(e.id)}')">✎</button></td>
      <td><button class="btn-red" onclick="removeExtra('${esc(e.id)}')">×</button></td>
    </tr>`).join('');
}

/* ── Édition extra ── */
function openEditModal(id) {
  editingId = id;
  const e = extras.find(x => x.id === id);
  if (!e) return;
  document.getElementById('edit-modal-content').innerHTML = `
    <div class="sec">Modifier l'extra</div>
    <div class="xt-form" style="margin-bottom:20px">
      <div class="fg"><label class="fl">Nom *</label><input type="text" id="edit-nom"/></div>
      <div class="fg"><label class="fl">Prénom *</label><input type="text" id="edit-prenom"/></div>
      <div class="fg"><label class="fl">Date de naissance</label><input type="text" id="edit-ddn" placeholder="jj/mm/aaaa"/></div>
      <div class="fg"><label class="fl">Lieu de naissance</label><input type="text" id="edit-lieu"/></div>
      <div class="fg xt-form-wide"><label class="fl">Adresse</label><input type="text" id="edit-adresse"/></div>
      <div class="fg"><label class="fl">Code postal</label><input type="text" id="edit-cp"/></div>
      <div class="fg"><label class="fl">Ville</label><input type="text" id="edit-ville"/></div>
    </div>
    <button class="btn btn-gold" onclick="saveEdit()">✓ Enregistrer</button>`;
  document.getElementById('edit-nom').value     = e.nom || '';
  document.getElementById('edit-prenom').value  = e.prenom || '';
  document.getElementById('edit-ddn').value     = e.dateNaissance || '';
  document.getElementById('edit-lieu').value    = e.lieuNaissance || '';
  document.getElementById('edit-adresse').value = e.adresse || '';
  document.getElementById('edit-cp').value      = e.codePostal || '';
  document.getElementById('edit-ville').value   = e.ville || '';
  document.getElementById('edit-modal').style.display = 'flex';
}

async function saveEdit() {
  const idx = extras.findIndex(x => x.id === editingId);
  if (idx < 0) return;
  const nom    = document.getElementById('edit-nom').value.trim().toUpperCase();
  const prenom = document.getElementById('edit-prenom').value.trim();
  if (!nom || !prenom) return alert('Nom et prénom obligatoires.');
  extras[idx] = {
    ...extras[idx],
    nom,
    prenom,
    dateNaissance: document.getElementById('edit-ddn').value.trim(),
    lieuNaissance: document.getElementById('edit-lieu').value.trim().toUpperCase(),
    adresse:       document.getElementById('edit-adresse').value.trim(),
    codePostal:    document.getElementById('edit-cp').value.trim(),
    ville:         document.getElementById('edit-ville').value.trim().toUpperCase(),
  };
  await FS.saveExtras(extras);
  document.getElementById('edit-modal').style.display = 'none';
  renderAll();
}

function closeEditModal(event) {
  if (event.target === document.getElementById('edit-modal'))
    document.getElementById('edit-modal').style.display = 'none';
}

async function addExtra() {
  const nom           = document.getElementById('inp-nom').value.trim().toUpperCase();
  const prenom        = document.getElementById('inp-prenom').value.trim();
  const dateNaissance = document.getElementById('inp-ddn').value.trim();
  const lieuNaissance = document.getElementById('inp-lieu').value.trim().toUpperCase();
  const adresse       = document.getElementById('inp-adresse').value.trim();
  const codePostal    = document.getElementById('inp-cp').value.trim();
  const ville         = document.getElementById('inp-ville').value.trim().toUpperCase();

  if (!nom || !prenom) return alert('Nom et prénom obligatoires.');

  extras.push({ id: uid(), nom, prenom, dateNaissance, lieuNaissance, adresse, codePostal, ville });
  await FS.saveExtras(extras);

  ['inp-nom','inp-prenom','inp-ddn','inp-lieu','inp-adresse','inp-cp','inp-ville']
    .forEach(id => { document.getElementById(id).value = ''; });

  renderAll();
}

async function removeExtra(id) {
  if (!confirm('Supprimer cet extra ?')) return;
  extras = extras.filter(e => e.id !== id);
  await FS.saveExtras(extras);
  renderAll();
}

/* ── Déclaration mensuelle ── */
function getDeclMonthVal() { return document.getElementById('decl-month-input').value || ''; }
function getDeclMonth()    { const v = getDeclMonthVal(); return v ? +v.split('-')[1] : new Date().getMonth() + 1; }
function getDeclYear()     { const v = getDeclMonthVal(); return v ? +v.split('-')[0] : new Date().getFullYear(); }

function renderDeclaration() {
  const month = getDeclMonth(), year = getDeclYear();
  const el = document.getElementById('decl-output');
  if (!el) return;

  if (!extras.length) {
    el.innerHTML = '<p class="xt-empty" style="padding:20px 0">Aucun extra enregistré.</p>';
    return;
  }

  el.innerHTML = `
    <table class="decl-extras-tbl">
      <thead>
        <tr><th colspan="7" class="det-title">DECLARATION CROUPIER EXTRA ${MOIS_FULL[month - 1]} ${year} - CASINO BORDEAUX</th></tr>
        <tr class="det-hrow">
          <th>Noms</th><th>Prenoms</th><th>Date de naissance</th>
          <th>Lieu de naissance</th><th>Adresse</th><th>Code postal</th><th>Ville</th>
        </tr>
      </thead>
      <tbody>${sortedExtras().map(e => `
        <tr>
          <td class="det-nom">${e.nom}</td>
          <td class="det-prenom">${e.prenom.toUpperCase()}</td>
          <td class="det-italic">${e.dateNaissance || ''}</td>
          <td class="det-lieu">${e.lieuNaissance || ''}</td>
          <td>${e.adresse || ''}</td>
          <td>${e.codePostal || ''}</td>
          <td class="det-ville">${e.ville || ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ── Émargement — tableau de saisie ── */
function getEmargWeekVal() { return document.getElementById('emarg-week-input').value || ''; }
function getEmargYear() { const v = getEmargWeekVal(); return v ? +v.split('-W')[0] : new Date().getFullYear(); }
function getEmargWeek() { const v = getEmargWeekVal(); return v ? +v.split('-W')[1] : getISOWeek(new Date()); }

function onWeekChange() {
  renderAssignTable();
  renderEmargement();
}

function renderAssignTable() {
  const year  = getEmargYear(), week = getEmargWeek();
  const days  = getWeekDays(week, year);
  const emarg = loadEmarg(year, week);
  const el    = document.getElementById('assign-table-wrap');
  if (!el) return;

  updateWeekRangeLabel(days);

  if (!extras.length) {
    el.innerHTML = '<p class="xt-empty" style="padding:16px 0">Aucun extra enregistré.</p>';
    return;
  }

  const headers = DAY_HDR.map((h, i) =>
    `<th>${h}<small>${fmtDate(days[i])}</small></th>`).join('');

  /* Ligne d'override d'heure par colonne (jour) */
  const hourCells = DAY_KEYS.map((k, i) => {
    const override = emarg._dayHours?.[k] || '';
    return `<td class="assign-check">
      <input class="assign-day-hour" type="text" value="${override}"
        placeholder="${dayTime(i)}" onchange="setDayHour('${k}',this.value)"/>
    </td>`;
  }).join('');

  /* Lignes par extra */
  const rows = sortedExtras().map(e => {
    const eData  = emarg[e.id] || {};
    const checks = DAY_KEYS.map((k, i) => {
      const checked  = !!eData[k];
      const override = eData._hours?.[k] || '';
      const ph       = resolveTime(e.id, k, i, emarg);
      return `<td class="assign-check">
        <input type="checkbox" ${checked ? 'checked' : ''}
          onchange="toggleDay('${esc(e.id)}','${k}',this.checked)"/>
        ${checked ? `<input class="assign-cell-hour" type="text" value="${override}"
          placeholder="${ph}" onchange="setCellHour('${esc(e.id)}','${k}',this.value)"/>` : ''}
      </td>`;
    }).join('');
    return `<tr>
      <td class="assign-name">${capWords(e.prenom)} ${capWords(e.nom)}</td>
      ${checks}
    </tr>`;
  }).join('');

  el.innerHTML = `
    <table class="assign-tbl">
      <thead>
        <tr><th class="assign-name-col">Extra</th>${headers}</tr>
        <tr class="assign-hours-row">
          <td class="assign-name assign-hours-label">Heure du jour</td>${hourCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function updateWeekRangeLabel(days) {
  const el = document.getElementById('week-range-label');
  if (!el || !days) return;
  const M = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  const mon = days[0], sun = days[6];
  el.textContent = `${mon.getDate()} au ${sun.getDate()} ${M[sun.getMonth()]} ${sun.getFullYear()}`;
}

function toggleDay(extraId, dayKey, checked) {
  const year  = getEmargYear(), week = getEmargWeek();
  const emarg = loadEmarg(year, week);
  if (!emarg[extraId]) emarg[extraId] = {};
  emarg[extraId][dayKey] = checked;
  if (!checked && emarg[extraId]._hours) delete emarg[extraId]._hours[dayKey];
  saveEmarg(year, week, emarg);
  renderAssignTable();
  renderEmargement();
}

function setDayHour(dayKey, val) {
  const year  = getEmargYear(), week = getEmargWeek();
  const emarg = loadEmarg(year, week);
  if (!emarg._dayHours) emarg._dayHours = {};
  const v = val.trim();
  if (v) emarg._dayHours[dayKey] = v; else delete emarg._dayHours[dayKey];
  saveEmarg(year, week, emarg);
  renderEmargement();
}

function setCellHour(extraId, dayKey, val) {
  const year  = getEmargYear(), week = getEmargWeek();
  const emarg = loadEmarg(year, week);
  if (!emarg[extraId]) emarg[extraId] = {};
  if (!emarg[extraId]._hours) emarg[extraId]._hours = {};
  const v = val.trim();
  if (v) emarg[extraId]._hours[dayKey] = v; else delete emarg[extraId]._hours[dayKey];
  saveEmarg(year, week, emarg);
  renderEmargement();
}

/* ── Émargement — grille imprimable ── */
function renderEmargement() {
  const year  = getEmargYear(), week = getEmargWeek();
  const days  = getWeekDays(week, year);
  const emarg = loadEmarg(year, week);
  const el    = document.getElementById('emarg-output');
  if (!el) return;

  /* Seuls les extras ayant au moins un jour coché */
  const sorted = sortedExtras().filter(e => DAY_KEYS.some(k => (emarg[e.id] || {})[k]));
  const cards  = [...sorted];
  while (cards.length % 4 !== 0) cards.push(null);

  const M      = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  const MLONG  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const mon    = days[0], sun = days[6];
  const sameMonth = mon.getMonth() === sun.getMonth();
  const rangeStr  = sameMonth
    ? `${mon.getDate()} au ${sun.getDate()} ${MLONG[sun.getMonth()]} ${sun.getFullYear()}`
    : `${mon.getDate()} ${MLONG[mon.getMonth()]} au ${sun.getDate()} ${MLONG[sun.getMonth()]} ${sun.getFullYear()}`;

  el.innerHTML = `
    <div class="emarg-header">
      <div class="emarg-header-title">FEUILLE D'ÉMARGEMENT — CROUPIERS EXTRAS POKER</div>
      <div class="emarg-header-meta">Casino Barrière Bordeaux &nbsp;·&nbsp; Semaine ${String(week).padStart(2,'0')} &nbsp;·&nbsp; du ${rangeStr}</div>
    </div>
    <div class="emarg-grid">
      ${cards.map(e =>
        e ? buildCard(e, week, days, emarg[e.id] || {}, emarg)
          : buildBlankCard(week, days)
      ).join('')}
    </div>`;
}

function buildCard(e, week, days, eData, emarg) {
  const name = `${capWords(e.prenom)} ${capWords(e.nom)}`;
  const rows = DAY_KEYS.map((k, i) => {
    const works = !!eData[k];
    const isSun = i === 6;
    const time  = works ? resolveTime(e.id, k, i, emarg) : '';
    const cls   = works ? (isSun ? ' ec-sun' : ' ec-eve') : '';
    return `<tr>
      <td class="ec-date">${fmtDate(days[i])}</td>
      <td class="ec-dayl">${DAY_LABELS[i]}</td>
      <td class="ec-time${cls}">${time}</td>
      <td class="ec-dep"></td>
      <td class="ec-sig"></td>
    </tr>`;
  }).join('');

  return `<table class="emarg-card">
    <thead><tr>
      <th class="ec-week">${week}</th>
      <th class="ec-j">J</th>
      <th colspan="3" class="ec-name">${name}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildBlankCard(week, days) {
  const rows = DAY_KEYS.map((k, i) => `<tr>
    <td class="ec-date">${fmtDate(days[i])}</td>
    <td class="ec-dayl">${DAY_LABELS[i]}</td>
    <td class="ec-time"></td>
    <td class="ec-dep"></td>
    <td class="ec-sig"></td>
  </tr>`).join('');

  return `<table class="emarg-card">
    <thead><tr>
      <th class="ec-week">${week}</th>
      <th class="ec-j">J</th>
      <th colspan="3" class="ec-name"></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* ── Impression ── */
function printDeclaration() {
  injectPageStyle('@page{size:A4 landscape;margin:10mm}');
  document.body.setAttribute('data-print', 'declaration');
  window.print();
  cleanupPrint();
}

function printEmargement() {
  injectPageStyle('@page{size:A4 landscape;margin:6mm}');
  document.body.setAttribute('data-print', 'emargement');
  window.print();
  cleanupPrint();
}

function injectPageStyle(css) {
  let s = document.getElementById('print-page-override');
  if (!s) { s = document.createElement('style'); s.id = 'print-page-override'; document.head.appendChild(s); }
  s.textContent = css;
}

function cleanupPrint() {
  setTimeout(() => {
    document.body.removeAttribute('data-print');
    document.getElementById('print-page-override')?.remove();
  }, 500);
}
