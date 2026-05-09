/* ═══════════════════════════════════════════════════════
   declaration.js — Déclaration mensuelle PN
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════════════ */

const JOURS   = ['DIMANCHE','LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'];
const MOIS    = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];
const ORDINAL = ['1er','2ème','3ème','4ème','5ème','6ème','7ème','8ème','9ème','10ème'];
const DIST_DEFAULT = [33, 20, 13, 9, 7, 5, 4, 3, 3, 3];

/* ── Config par défaut (calquée sur le fichier Excel) ── */
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
  directeurs: [
    'Olivier SANCHEZ',
    'Christophe CONDOURE',
    'Brayan CUVELIER',
    'Stéphane DUBOIS',
    'Aurelien GROSDEMOUGE',
  ],
  arbitres: [
    'Pierre BERGEROO',
    'Thomas CHAVERLANGE',
    'David LOPES',
    'Jeremy PELTIER',
    'Marceau CASSIN',
    'Olivier DOBIEZYNSKI',
    'Isabelle GABA',
    'Teddy GAULIER',
    'Antonyn GRANIER',
    'Jean-Baptiste LAGORCE',
    'Dylan SALDOT',
    'Guillaume SITBON',
  ],
};

/* ── État ── */
let cfg   = loadCfg();
let staff = loadStaff();

function loadCfg() {
  try {
    const s = localStorage.getItem('decl_cfg');
    return s ? JSON.parse(s) : deepClone(CFG_DEFAULT);
  } catch { return deepClone(CFG_DEFAULT); }
}
function loadStaff() {
  try {
    const s = localStorage.getItem('decl_staff');
    return s ? JSON.parse(s) : deepClone(STAFF_DEFAULT);
  } catch { return deepClone(STAFF_DEFAULT); }
}
function saveCfg()   { localStorage.setItem('decl_cfg',   JSON.stringify(cfg));   }
function saveStaff() { localStorage.setItem('decl_staff', JSON.stringify(staff)); }
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();

  const selMonth = document.getElementById('sel-month');
  MOIS.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = m;
    if (i === now.getMonth()) o.selected = true;
    selMonth.appendChild(o);
  });
  document.getElementById('inp-year').value = now.getFullYear();

  renderCfgTable();
  renderStaffEditor();
  renderAll();
});

/* ── Helpers ── */
function getMonth() { return +document.getElementById('sel-month').value; }
function getYear()  { return +document.getElementById('inp-year').value; }

function fmt(n) { return n.toLocaleString('fr-FR'); }

/* ── Config table ── */
function renderCfgTable() {
  const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lun → Sam → Dim
  document.getElementById('cfg-table').innerHTML = `
    <thead>
      <tr>
        <th>Jour</th>
        <th>Actif</th>
        <th>Heure</th>
        <th>Cave (€)</th>
        <th>Joueurs max</th>
        <th>Rachats</th>
        <th>Bounty (€)</th>
        <th>Annexe</th>
      </tr>
    </thead>
    <tbody>
      ${ORDER.map(d => {
        const c = cfg[d];
        return `<tr data-day="${d}" class="${c.actif ? '' : 'inactive'}">
          <td class="jour-label">${JOURS[d]}</td>
          <td><input type="checkbox" ${c.actif ? 'checked' : ''} onchange="toggleDay(${d}, this.checked)"/></td>
          <td><input type="text"   value="${c.heure}"   onchange="updateCfg(${d},'heure',   this.value)"  style="width:68px"/></td>
          <td><input type="number" value="${c.cave}"    onchange="updateCfg(${d},'cave',    +this.value)" style="width:68px"/></td>
          <td><input type="number" value="${c.joueurs}" onchange="updateCfg(${d},'joueurs', +this.value)" style="width:68px"/></td>
          <td><input type="checkbox" ${c.rachats ? 'checked' : ''} onchange="updateCfg(${d},'rachats', this.checked)"/></td>
          <td><input type="number" value="${c.bounty}"  onchange="updateCfg(${d},'bounty',  +this.value)" style="width:60px" placeholder="0"/></td>
          <td><input type="text"   value="${c.annexe}"  onchange="updateCfg(${d},'annexe',  this.value)"  style="width:86px" placeholder="ANNEXE X"/></td>
        </tr>`;
      }).join('')}
    </tbody>`;
}

function toggleDay(d, val) {
  cfg[d].actif = val;
  const row = document.querySelector(`#cfg-table tr[data-day="${d}"]`);
  if (row) row.className = val ? '' : 'inactive';
}
function updateCfg(d, key, val) { cfg[d][key] = val; }

function resetConfig() {
  if (!confirm('Réinitialiser la configuration aux valeurs par défaut ?')) return;
  cfg = deepClone(CFG_DEFAULT);
  saveCfg();
  renderCfgTable();
  renderAll();
}
function saveAndRender() { saveCfg(); renderAll(); }

/* ── Staff editor ── */
function renderStaffEditor() {
  document.getElementById('staff-grid').innerHTML = `
    <div>
      <div class="staff-section-title">Directeurs de tournois</div>
      <div class="staff-list-edit" id="dir-list">
        ${staff.directeurs.map((n, i) => staffRow('directeurs', i, n)).join('')}
      </div>
      <button class="btn-ghost" onclick="addStaff('directeurs')" style="margin-top:8px">+ Ajouter</button>
    </div>
    <div>
      <div class="staff-section-title">Arbitres</div>
      <div class="staff-list-edit" id="arb-list">
        ${staff.arbitres.map((n, i) => staffRow('arbitres', i, n)).join('')}
      </div>
      <button class="btn-ghost" onclick="addStaff('arbitres')" style="margin-top:8px">+ Ajouter</button>
    </div>`;
}
function staffRow(type, i, n) {
  return `<div class="staff-item">
    <input type="text" value="${n}" onchange="updateStaff('${type}',${i},this.value)"/>
    <button class="btn-red" onclick="removeStaff('${type}',${i})">×</button>
  </div>`;
}
function updateStaff(type, i, val) { staff[type][i] = val; }
function addStaff(type)    { staff[type].push(''); saveStaff(); renderStaffEditor(); }
function removeStaff(type, i) { staff[type].splice(i, 1); saveStaff(); renderStaffEditor(); }
function saveStaffAndRender() { saveStaff(); renderAll(); }

/* ── Génération du calendrier ── */
function buildRows(month, year) {
  const rows = [];
  const numDays = new Date(year, month, 0).getDate();
  for (let d = 1; d <= numDays; d++) {
    const date = new Date(year, month - 1, d);
    const dow  = date.getDay();
    const c    = cfg[dow];
    if (!c.actif) continue;
    rows.push({
      d, dow,
      titre:   `${JOURS[dow]} ${d} ${MOIS[month - 1]} ${year} à ${c.heure} RE ENTRY`,
      cave:    c.cave,
      joueurs: c.joueurs,
      rachats: c.rachats,
      bounty:  c.bounty,
      annexe:  c.annexe,
    });
  }
  return rows;
}

/* ── Rendu principal ── */
function renderAll() {
  renderDeclaration();
  renderAnnexes();
}

function renderDeclaration() {
  const month  = getMonth();
  const year   = getYear();
  const rows   = buildRows(month, year);
  const periode = `${MOIS[month - 1]} ${year}`;

  const staffHtml = `
    <div class="enc-hdr">Directeurs de tournois</div>
    ${staff.directeurs.map(n => `<div>${n}</div>`).join('')}
    <div class="enc-hdr" style="margin-top:6px">Arbitres</div>
    ${staff.arbitres.map(n => `<div>${n}</div>`).join('')}`;

  const dataHtml = rows.length
    ? rows.map((r, i) => `
        <tr class="drow">
          <td class="titre-cell">${r.titre}</td>
          <td>${r.cave} €</td>
          <td>${r.joueurs}</td>
          <td>ESPÈCES</td>
          <td>MULTI-TABLES</td>
          <td>1</td>
          <td>${r.rachats ? 'OUI' : 'NON'}</td>
          <td>Level 8</td>
          <td>${r.bounty > 0 ? r.bounty + ' €' : '—'}</td>
          <td>${r.annexe || '—'}</td>
          ${i === 0 ? `<td class="staff-col" rowspan="${rows.length}">${staffHtml}</td>` : ''}
        </tr>`).join('')
    : `<tr><td colspan="11" class="empty">Aucun tournoi actif ce mois.</td></tr>`;

  document.getElementById('decl-output').innerHTML = `
    <table class="decl-form">
      <thead>
        <tr><td colspan="11" class="decl-casino">CASINO BARRIERE DE BORDEAUX</td></tr>
        <tr class="info-row">
          <td class="info-lbl">TITRE</td>
          <td colspan="10">TOURNOI MULTITABLE</td>
        </tr>
        <tr class="info-row">
          <td class="info-lbl">LIEU</td>
          <td colspan="10">Le Salon des jeux du CASINO BARRIERE DE BORDEAUX</td>
        </tr>
        <tr class="info-row">
          <td class="info-lbl">TYPE</td>
          <td colspan="10">No Limit Texas Hold'em Poker</td>
        </tr>
        <tr class="info-row">
          <td class="info-lbl">PÉRIODE</td>
          <td colspan="10" style="font-weight:600;color:var(--gold);letter-spacing:.08em">${periode}</td>
        </tr>
        <tr class="hrow">
          <th style="text-align:left;min-width:230px">Tournoi</th>
          <th>Cave</th>
          <th>Joueurs</th>
          <th>Qualificatif</th>
          <th>Tables</th>
          <th>Nb.</th>
          <th>Rachats</th>
          <th>Durée</th>
          <th>Bounty</th>
          <th>Prize Pool</th>
          <th style="min-width:180px">Encadrement</th>
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

/* ── Rendu annexes ── */
function renderAnnexes() {
  /* Collecte les annexes uniques dans l'ordre alphabétique */
  const seen  = {};
  const ORDER = [1, 2, 3, 4, 5, 0]; // Lun→Ven→Dim (exclut Sam inactif)
  ORDER.forEach(d => {
    const c = cfg[d];
    if (!c.actif || !c.annexe || seen[c.annexe]) return;
    seen[c.annexe] = { cave: c.cave, joueurs: c.joueurs };
  });

  const sorted = Object.entries(seen).sort((a, b) => a[0].localeCompare(b[0]));

  if (!sorted.length) {
    document.getElementById('annexes-output').innerHTML =
      '<p style="color:var(--text-muted);font-size:12px">Aucune annexe configurée.</p>';
    return;
  }

  document.getElementById('annexes-output').innerHTML = sorted.map(([name, { cave, joueurs }]) => {
    const total   = joueurs * cave;
    const retenue = Math.round(total * 0.04);
    const pool    = total - retenue;

    const distRows = DIST_DEFAULT.map((pct, i) => {
      const montant = Math.round(pool * pct / 100);
      return `<tr>
        <td class="place-cell">${ORDINAL[i]}</td>
        <td>${pct} %</td>
        <td>ESPÈCES</td>
        <td>${fmt(montant)} €</td>
      </tr>`;
    }).join('');

    return `<div class="annexe-card">
      <div class="annexe-title">${name}</div>
      <div class="annexe-subtitle">Tournoi Cash — Répartition des lots</div>

      <div class="annexe-calc">
        <div class="ac-row"><span>Joueurs</span><span class="ac-val">${joueurs}</span></div>
        <div class="ac-row"><span>Achat de cave</span><span class="ac-val">${cave} €</span></div>
        <div class="ac-row"><span>Total brut</span><span class="ac-val">${fmt(total)} €</span></div>
        <div class="ac-row"><span>Retenue cagnotte (4 %)</span><span class="ac-val ac-ret">− ${fmt(retenue)} €</span></div>
        <div class="ac-row ac-total"><span>Prize pool net</span><span class="ac-val">${fmt(pool)} €</span></div>
      </div>

      <table class="dist-tbl">
        <thead>
          <tr><th>Place</th><th>%</th><th>Type</th><th>Montant</th></tr>
        </thead>
        <tbody>${distRows}</tbody>
      </table>

      <div class="annexe-legal">Prize pool indicatif qui pourra varier conformément à l'article 57-10 de l'arrêté du 14 mai 2007 relatif à la réglementation des jeux dans les casinos.</div>
    </div>`;
  }).join('');
}
