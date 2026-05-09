/* ═══════════════════════════════════════════════════════
   declaration.js — Déclaration mensuelle PN
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════════════ */

const JOURS   = ['DIMANCHE','LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'];
const MOIS    = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];
const ORDINAL = ['1er','2ème','3ème','4ème','5ème','6ème','7ème','8ème','9ème','10ème'];

const CFG_DEFAULT = {
  0: { actif: true,  heure: '17:00', cave: 78,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 4' },
  1: { actif: true,  heure: '21:00', cave: 60,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 5' },
  2: { actif: true,  heure: '21:00', cave: 78,  joueurs: 150, rachats: true,  bounty: 25, annexe: 'ANNEXE 4' },
  3: { actif: true,  heure: '21:00', cave: 56,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 1' },
  4: { actif: true,  heure: '21:00', cave: 45,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 2' },
  5: { actif: true,  heure: '21:00', cave: 125, joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 3' },
  6: { actif: false, heure: '21:00', cave: 0,   joueurs: 150, rachats: false, bounty: 0,  annexe: '' },
};

const STAFF_DEFAULT = {
  directeurs: ['Olivier SANCHEZ','Christophe CONDOURE','Brayan CUVELIER','Stéphane DUBOIS','Aurelien GROSDEMOUGE'],
  arbitres:   ['Pierre BERGEROO','Thomas CHAVERLANGE','David LOPES','Jeremy PELTIER','Marceau CASSIN','Olivier DOBIEZYNSKI','Isabelle GABA','Teddy GAULIER','Antonyn GRANIER','Jean-Baptiste LAGORCE','Dylan SALDOT','Guillaume SITBON'],
};

const DIST_STD = [33, 20, 13, 9, 7, 5, 4, 3, 3, 3];

const ANNEXES_DEFAULT = [
  { id: 'a1', nom: 'ANNEXE 1', joueurs: 150, cave: 56,  dist: [...DIST_STD] },
  { id: 'a2', nom: 'ANNEXE 2', joueurs: 150, cave: 45,  dist: [...DIST_STD] },
  { id: 'a3', nom: 'ANNEXE 3', joueurs: 150, cave: 125, dist: [...DIST_STD] },
  { id: 'a4', nom: 'ANNEXE 4', joueurs: 150, cave: 78,  dist: [...DIST_STD] },
  { id: 'a5', nom: 'ANNEXE 5', joueurs: 150, cave: 60,  dist: [...DIST_STD] },
];

/* ── État ── */
let cfg     = loadCfg();
let staff   = loadStaff();
let annexes = loadAnnexes();

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
function loadCfg()     { try { const s = localStorage.getItem('decl_cfg');     return s ? JSON.parse(s) : deepClone(CFG_DEFAULT);     } catch { return deepClone(CFG_DEFAULT); } }
function loadStaff()   { try { const s = localStorage.getItem('decl_staff');   return s ? JSON.parse(s) : deepClone(STAFF_DEFAULT);   } catch { return deepClone(STAFF_DEFAULT); } }
function loadAnnexes() { try { const s = localStorage.getItem('decl_annexes'); return s ? JSON.parse(s) : deepClone(ANNEXES_DEFAULT); } catch { return deepClone(ANNEXES_DEFAULT); } }
function saveCfg()     { localStorage.setItem('decl_cfg',     JSON.stringify(cfg));     }
function saveStaff()   { localStorage.setItem('decl_staff',   JSON.stringify(staff));   }
function saveAnnexes() { localStorage.setItem('decl_annexes', JSON.stringify(annexes)); }

/* ── Ad-hoc ── */
function adhocKey(m, y)       { return `decl_adhoc_${y}_${m}`; }
function loadAdhoc(m, y)      { try { const s = localStorage.getItem(adhocKey(m, y)); return s ? JSON.parse(s) : []; } catch { return []; } }
function saveAdhoc(m, y, lst) { localStorage.setItem(adhocKey(m, y), JSON.stringify(lst)); }

/* ── Exceptions ponctuelles ── */
function excKey(m, y)       { return `decl_exc_${y}_${m}`; }
function loadExc(m, y)      { try { const s = localStorage.getItem(excKey(m, y)); return s ? JSON.parse(s) : {}; } catch { return {}; } }
function saveExc(m, y, data) { localStorage.setItem(excKey(m, y), JSON.stringify(data)); }

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const selMonth = document.getElementById('sel-month');
  MOIS.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1; o.textContent = m;
    if (i === now.getMonth()) o.selected = true;
    selMonth.appendChild(o);
  });
  document.getElementById('inp-year').value = now.getFullYear();

  renderCfgTable();
  renderStaffEditor();
  renderAnnexesEditor();
  updateMonthInputs();
  renderAll();
});

/* ── Helpers ── */
function getMonth() { return +document.getElementById('sel-month').value; }
function getYear()  { return +document.getElementById('inp-year').value; }
function fmt(n)     { return n.toLocaleString('fr-FR'); }
function uid()      { return 'a' + Date.now().toString(36); }

function pad(n) { return String(n).padStart(2, '0'); }

function updateMonthInputs() {
  const month = getMonth(), year = getYear();
  const min = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const max = `${year}-${pad(month)}-${pad(lastDay)}`;
  ['adhoc-date', 'exc-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.min = min; el.max = max; el.value = min; }
  });
  onExcDateChange();
}

/* ── Config table ── */
function renderCfgTable() {
  const ORDER = [1, 2, 3, 4, 5, 6, 0];
  document.getElementById('cfg-table').innerHTML = `
    <thead>
      <tr><th>Jour</th><th>Actif</th><th>Heure</th><th>Cave (€)</th><th>Joueurs max</th><th>Rachats</th><th>Bounty (€)</th><th>Annexe</th></tr>
    </thead>
    <tbody>
      ${ORDER.map(d => { const c = cfg[d]; return `<tr data-day="${d}" class="${c.actif ? '' : 'inactive'}">
          <td class="jour-label">${JOURS[d]}</td>
          <td><input type="checkbox" ${c.actif ? 'checked' : ''} onchange="toggleDay(${d},this.checked)"/></td>
          <td><input type="text"   value="${c.heure}"   onchange="updateCfg(${d},'heure',this.value)"   style="width:68px"/></td>
          <td><input type="number" value="${c.cave}"    onchange="updateCfg(${d},'cave',+this.value)"   style="width:68px"/></td>
          <td><input type="number" value="${c.joueurs}" onchange="updateCfg(${d},'joueurs',+this.value)" style="width:68px"/></td>
          <td><input type="checkbox" ${c.rachats ? 'checked' : ''} onchange="updateCfg(${d},'rachats',this.checked)"/></td>
          <td><input type="number" value="${c.bounty}"  onchange="updateCfg(${d},'bounty',+this.value)"  style="width:60px" placeholder="0"/></td>
          <td><input type="text"   value="${c.annexe}"  onchange="updateCfg(${d},'annexe',this.value)"   style="width:86px" placeholder="ANNEXE X"/></td>
        </tr>`; }).join('')}
    </tbody>`;
}
function toggleDay(d, val) { cfg[d].actif = val; const r = document.querySelector(`#cfg-table tr[data-day="${d}"]`); if (r) r.className = val ? '' : 'inactive'; }
function updateCfg(d, k, v) { cfg[d][k] = v; }
function resetConfig() { if (!confirm('Réinitialiser la configuration ?')) return; cfg = deepClone(CFG_DEFAULT); saveCfg(); renderCfgTable(); renderAll(); }
function saveAndRender() { saveCfg(); renderAll(); }

/* ── Staff ── */
function renderStaffEditor() {
  document.getElementById('staff-grid').innerHTML = `
    <div>
      <div class="staff-section-title">Directeurs de tournois</div>
      <div class="staff-list-edit">${staff.directeurs.map((n,i) => staffRow('directeurs',i,n)).join('')}</div>
      <button class="btn-ghost" onclick="addStaff('directeurs')" style="margin-top:8px">+ Ajouter</button>
    </div>
    <div>
      <div class="staff-section-title">Arbitres</div>
      <div class="staff-list-edit">${staff.arbitres.map((n,i) => staffRow('arbitres',i,n)).join('')}</div>
      <button class="btn-ghost" onclick="addStaff('arbitres')" style="margin-top:8px">+ Ajouter</button>
    </div>`;
}
function staffRow(type, i, n) { return `<div class="staff-item"><input type="text" value="${n}" onchange="updateStaff('${type}',${i},this.value)"/><button class="btn-red" onclick="removeStaff('${type}',${i})">×</button></div>`; }
function updateStaff(type, i, v) { staff[type][i] = v; }
function addStaff(type)          { staff[type].push(''); saveStaff(); renderStaffEditor(); }
function removeStaff(type, i)    { staff[type].splice(i,1); saveStaff(); renderStaffEditor(); }
function saveStaffAndRender()    { saveStaff(); renderAll(); }

/* ── Éditeur annexes ── */
function renderAnnexesEditor() {
  const el = document.getElementById('annexes-editor-list');
  if (!el) return;
  el.innerHTML = annexes.map(a => annexeEditorCard(a)).join('');
}
function annexeEditorCard(a) {
  const total = a.dist.reduce((s,v) => s+v, 0);
  const distInputs = a.dist.map((pct,i) => `
    <div class="annexe-dist-slot">
      <label>${ORDINAL[i]}</label>
      <input type="number" value="${pct}" min="0" max="100" onchange="updateAnnexeDist('${a.id}',${i},+this.value)" style="width:46px"/>
    </div>`).join('');
  return `<div class="annexe-editor-item" id="ae-${a.id}">
    <div class="annexe-editor-header">
      <div class="fg"><label class="fl">Nom</label><input type="text" value="${a.nom}" onchange="updateAnnexeField('${a.id}','nom',this.value)" style="width:110px"/></div>
      <div class="fg"><label class="fl">Joueurs</label><input type="number" value="${a.joueurs}" onchange="updateAnnexeField('${a.id}','joueurs',+this.value)" style="width:70px"/></div>
      <div class="fg"><label class="fl">Cave (€)</label><input type="number" value="${a.cave}" onchange="updateAnnexeField('${a.id}','cave',+this.value)" style="width:70px"/></div>
      <div style="margin-left:auto"><button class="btn-red" onclick="removeAnnexe('${a.id}')">Supprimer</button></div>
    </div>
    <div class="annexe-editor-dist">
      <div class="annexe-editor-dist-label">Répartition (%)</div>
      <div class="annexe-dist-inputs">
        ${distInputs}
        <span class="dist-total ${total===100?'ok':'err'}" id="dt-${a.id}">= ${total} %</span>
      </div>
    </div>
  </div>`;
}
function updateAnnexeField(id, k, v) { const a = annexes.find(x => x.id===id); if (a) a[k] = v; }
function updateAnnexeDist(id, idx, v) {
  const a = annexes.find(x => x.id===id); if (!a) return;
  a.dist[idx] = v;
  const total = a.dist.reduce((s,x) => s+x, 0);
  const el = document.getElementById(`dt-${id}`);
  if (el) { el.textContent = `= ${total} %`; el.className = `dist-total ${total===100?'ok':'err'}`; }
}
function addAnnexe() { annexes.push({id:uid(), nom:'ANNEXE '+(annexes.length+1), joueurs:150, cave:0, dist:[...DIST_STD]}); saveAnnexes(); renderAnnexesEditor(); renderAll(); }
function removeAnnexe(id) { if (!confirm('Supprimer cette annexe ?')) return; annexes = annexes.filter(a => a.id!==id); saveAnnexes(); renderAnnexesEditor(); renderAll(); }
function saveAnnexesAndRender() { saveAnnexes(); renderAll(); }

/* ── Ad-hoc ── */
function addAdhoc() {
  const month = getMonth(), year = getYear();
  const dateVal = document.getElementById('adhoc-date').value;
  if (!dateVal) return alert('Veuillez choisir une date.');
  const [y,m,d] = dateVal.split('-').map(Number);
  const dow = new Date(y, m-1, d).getDay();
  const heure   = document.getElementById('adhoc-heure').value.trim() || '21:00';
  const cave    = +document.getElementById('adhoc-cave').value    || 0;
  const joueurs = +document.getElementById('adhoc-joueurs').value || 150;
  const rachats = document.getElementById('adhoc-rachats').checked;
  const bounty  = +document.getElementById('adhoc-bounty').value  || 0;
  const annexe  = document.getElementById('adhoc-annexe').value.trim();
  const titre   = `${JOURS[dow]} ${d} ${MOIS[m-1]} ${y} à ${heure}${rachats ? ' RE ENTRY' : ''}`;

  const list = loadAdhoc(month, year);
  list.push({id: Date.now(), d, dow, titre, heure, cave, joueurs, rachats, bounty, annexe});
  saveAdhoc(month, year, list);

  document.getElementById('adhoc-heure').value = '21:00';
  document.getElementById('adhoc-cave').value  = '';
  document.getElementById('adhoc-joueurs').value = '150';
  document.getElementById('adhoc-rachats').checked = true;
  document.getElementById('adhoc-bounty').value = '';
  document.getElementById('adhoc-annexe').value = '';

  renderAdhocList(); renderAll();
}
function removeAdhoc(id) {
  const month = getMonth(), year = getYear();
  saveAdhoc(month, year, loadAdhoc(month, year).filter(t => t.id !== id));
  renderAdhocList(); renderAll();
}
function renderAdhocList() {
  const month = getMonth(), year = getYear();
  const list = loadAdhoc(month, year);
  const el = document.getElementById('adhoc-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="adhoc-empty">Aucun tournoi ad-hoc ce mois.</div>'; return; }
  el.innerHTML = [...list].sort((a,b) => a.d-b.d).map(t => `
    <div class="adhoc-item">
      <div class="adhoc-info">
        <span class="adhoc-titre">${t.titre}</span>
        <span class="adhoc-meta">${t.cave}€ · ${t.joueurs} jrs${t.bounty ? ` · Bounty ${t.bounty}€` : ''}${t.annexe ? ` · ${t.annexe}` : ''}</span>
      </div>
      <button class="btn-red" onclick="removeAdhoc(${t.id})">Supprimer</button>
    </div>`).join('');
}

/* ── Exceptions ponctuelles ── */
function onExcDateChange() {
  const dateVal = document.getElementById('exc-date')?.value;
  if (!dateVal) return;
  const [y,m,d] = dateVal.split('-').map(Number);
  const dow = new Date(y, m-1, d).getDay();
  const c   = cfg[dow];
  const exc = loadExc(getMonth(), getYear());
  const existing = exc[d];
  const vals = (existing && existing.type === 'modified') ? existing : c;

  document.getElementById('exc-heure').value     = vals.heure   ?? c.heure;
  document.getElementById('exc-cave').value      = vals.cave    ?? c.cave;
  document.getElementById('exc-joueurs').value   = vals.joueurs ?? c.joueurs;
  document.getElementById('exc-rachats').checked = vals.rachats ?? c.rachats;
  document.getElementById('exc-bounty').value    = vals.bounty  ?? 0;
  document.getElementById('exc-annexe').value    = vals.annexe  ?? c.annexe;

  if (existing) {
    const radio = document.querySelector(`input[name="exc-type"][value="${existing.type}"]`);
    if (radio) { radio.checked = true; onExcTypeChange(); }
  }
}
function onExcTypeChange() {
  const type = document.querySelector('input[name="exc-type"]:checked')?.value;
  const form = document.getElementById('exc-modify-form');
  if (form) form.style.display = type === 'modified' ? 'grid' : 'none';
}
function applyException() {
  const dateVal = document.getElementById('exc-date').value;
  if (!dateVal) return alert('Veuillez choisir une date.');
  const [,m,d] = dateVal.split('-').map(Number);
  const month = getMonth(), year = getYear();
  if (m !== month) return alert('La date ne correspond pas au mois sélectionné.');

  const type = document.querySelector('input[name="exc-type"]:checked').value;
  const exc  = loadExc(month, year);

  exc[d] = type === 'cancelled' ? { type: 'cancelled' } : {
    type: 'modified',
    heure:   document.getElementById('exc-heure').value || '21:00',
    cave:    +document.getElementById('exc-cave').value,
    joueurs: +document.getElementById('exc-joueurs').value,
    rachats: document.getElementById('exc-rachats').checked,
    bounty:  +document.getElementById('exc-bounty').value,
    annexe:  document.getElementById('exc-annexe').value.trim(),
  };

  saveExc(month, year, exc);
  renderExcList(); renderAll();
}
function removeExc(d) {
  const month = getMonth(), year = getYear();
  const exc = loadExc(month, year);
  delete exc[d];
  saveExc(month, year, exc);
  renderExcList(); renderAll();
}
function renderExcList() {
  const month = getMonth(), year = getYear();
  const exc = loadExc(month, year);
  const el  = document.getElementById('exc-list');
  if (!el) return;
  const entries = Object.entries(exc).sort((a,b) => +a[0] - +b[0]);
  if (!entries.length) { el.innerHTML = '<div class="adhoc-empty">Aucune exception ce mois.</div>'; return; }
  el.innerHTML = entries.map(([d, e]) => {
    const dow     = new Date(year, month-1, +d).getDay();
    const dateStr = `${JOURS[dow]} ${d} ${MOIS[month-1]} ${year}`;
    const detail  = e.type === 'cancelled'
      ? '<span style="color:#e07a68;font-weight:500">Annulé</span>'
      : `<span style="color:var(--gold);font-weight:500">Modifié</span> — ${e.cave}€ · ${e.heure}${e.rachats ? ' RE ENTRY' : ''}${e.annexe ? ' · '+e.annexe : ''}`;
    return `<div class="adhoc-item">
      <div class="adhoc-info">
        <span class="adhoc-titre">${dateStr}</span>
        <span class="adhoc-meta">${detail}</span>
      </div>
      <button class="btn-ghost" onclick="removeExc(${d})">Restaurer</button>
    </div>`;
  }).join('');
}

/* ── Calendrier ── */
function buildRows(month, year) {
  const rows    = [];
  const numDays = new Date(year, month, 0).getDate();
  const exc     = loadExc(month, year);

  for (let d = 1; d <= numDays; d++) {
    const dow = new Date(year, month-1, d).getDay();
    const c   = cfg[dow];
    if (!c.actif) continue;

    const override = exc[d];
    if (override?.type === 'cancelled') continue;

    const vals = override?.type === 'modified' ? { ...c, ...override } : c;
    rows.push({
      d, dow, adhoc: false,
      titre:   `${JOURS[dow]} ${d} ${MOIS[month-1]} ${year} à ${vals.heure}${vals.rachats ? ' RE ENTRY' : ''}`,
      cave: vals.cave, joueurs: vals.joueurs, rachats: vals.rachats, bounty: vals.bounty, annexe: vals.annexe,
    });
  }

  loadAdhoc(month, year).forEach(t => rows.push({...t, adhoc: true}));
  rows.sort((a,b) => a.d - b.d || (a.adhoc ? 1 : -1));
  return rows;
}

/* ── Rendu principal ── */
function renderAll() {
  updateMonthInputs();
  renderAdhocList();
  renderExcList();
  renderDeclaration();
  renderAnnexes();
}

/* ── Déclaration ── */
function renderDeclaration() {
  const month   = getMonth(), year = getYear();
  const rows    = buildRows(month, year);
  const periode = `${MOIS[month-1]} ${year}`;

  const staffHtml = `
    <div class="enc-hdr">Directeurs de tournois</div>
    ${staff.directeurs.map(n => `<div>${n}</div>`).join('')}
    <div class="enc-hdr" style="margin-top:5px">Arbitres</div>
    ${staff.arbitres.map(n => `<div>${n}</div>`).join('')}`;

  const dataHtml = rows.length
    ? rows.map((r,i) => `
        <tr class="drow">
          <td class="titre-cell">${r.titre}</td>
          <td>${r.cave} €</td><td>${r.joueurs}</td><td>ESPÈCES</td><td>MULTI-TABLES</td><td>1</td>
          <td>${r.rachats ? 'OUI' : 'NON'}</td><td>Level 8</td>
          <td>${r.bounty > 0 ? r.bounty+' €' : '—'}</td><td>${r.annexe || '—'}</td>
          ${i===0 ? `<td class="staff-col" rowspan="${rows.length}">${staffHtml}</td>` : ''}
        </tr>`).join('')
    : `<tr><td colspan="11" class="empty">Aucun tournoi actif ce mois.</td></tr>`;

  document.getElementById('decl-output').innerHTML = `
    <table class="decl-form">
      <colgroup>
        <col class="col-titre"/><col class="col-cave"/><col class="col-joueurs"/>
        <col class="col-qual"/><col class="col-tables"/><col class="col-nb"/>
        <col class="col-rachats"/><col class="col-duree"/><col class="col-bounty"/>
        <col class="col-pool"/><col class="col-enc"/>
      </colgroup>
      <thead>
        <tr><td colspan="11" class="decl-casino">CASINO BARRIERE DE BORDEAUX</td></tr>
        <tr class="info-row"><td class="info-lbl">TITRE</td><td colspan="10">TOURNOI MULTITABLE</td></tr>
        <tr class="info-row"><td class="info-lbl">LIEU</td><td colspan="10">Le Salon des jeux du CASINO BARRIERE DE BORDEAUX</td></tr>
        <tr class="info-row"><td class="info-lbl">TYPE</td><td colspan="10">No Limit Texas Hold'em Poker</td></tr>
        <tr class="info-row">
          <td class="info-lbl">PÉRIODE</td>
          <td colspan="10" style="font-weight:600;color:var(--gold);letter-spacing:.08em">${periode}</td>
        </tr>
        <tr class="hrow">
          <th>Tournoi</th><th>Cave</th><th>Joueurs</th><th>Qualificatif</th><th>Tables</th>
          <th>Nb.</th><th>Rachats</th><th>Durée</th><th>Bounty</th><th>Prize Pool</th><th>Encadrement</th>
        </tr>
      </thead>
      <tbody>${dataHtml}</tbody>
      <tfoot>
        <tr class="footer-row">
          <td colspan="11">La jetonnerie utilisée sera composée de jetons non négociables (de valeur virtuelle) dédiés exclusivement aux tournois et réputés sans valeur en dehors.</td>
        </tr>
      </tfoot>
    </table>`;
}

/* ── Annexes ── */
function renderAnnexes() {
  const el = document.getElementById('annexes-output');
  if (!annexes.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:12px">Aucune annexe configurée.</p>'; return; }

  el.innerHTML = annexes.map(a => {
    const total   = a.joueurs * a.cave;
    const retenue = Math.round(total * 0.04);
    const pool    = total - retenue;
    const distSum = a.dist.reduce((s,v) => s+v, 0);
    const distRows = a.dist.map((pct,i) => `<tr>
      <td class="place-cell">${ORDINAL[i]}</td><td>${pct} %</td><td>ESPÈCES</td>
      <td>${fmt(Math.round(pool*pct/100))} €</td>
    </tr>`).join('');
    const warn = distSum !== 100 ? `<div class="alert-warn" style="margin-top:8px">⚠ Total répartition : ${distSum} % (doit être 100 %)</div>` : '';

    return `<div class="annexe-card">
      <div class="annexe-title">${a.nom}</div>
      <div class="annexe-subtitle">Tournoi Cash — Répartition des lots</div>
      <div class="annexe-calc">
        <div class="ac-row"><span>Joueurs</span><span class="ac-val">${a.joueurs}</span></div>
        <div class="ac-row"><span>Achat de cave</span><span class="ac-val">${a.cave} €</span></div>
        <div class="ac-row"><span>Total brut</span><span class="ac-val">${fmt(total)} €</span></div>
        <div class="ac-row"><span>Retenue cagnotte (4 %)</span><span class="ac-val ac-ret">− ${fmt(retenue)} €</span></div>
        <div class="ac-row ac-total"><span>Prize pool net</span><span class="ac-val">${fmt(pool)} €</span></div>
      </div>
      <table class="dist-tbl">
        <thead><tr><th>Place</th><th>%</th><th>Type</th><th>Montant</th></tr></thead>
        <tbody>${distRows}</tbody>
      </table>
      ${warn}
      <div class="annexe-legal">Prize pool indicatif qui pourra varier conformément à l'article 57-10 de l'arrêté du 14 mai 2007 relatif à la réglementation des jeux dans les casinos.</div>
    </div>`;
  }).join('');
}
