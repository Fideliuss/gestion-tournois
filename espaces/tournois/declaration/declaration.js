/* ═══════════════════════════════════════════════════════
   declaration.js - Déclaration mensuelle PN
   Barrière Casino Bordeaux · Tournois
═══════════════════════════════════════════════════════ */

const JOURS   = ['DIMANCHE','LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'];
const MOIS    = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];
const ORDINAL = ['1er','2ème','3ème','4ème','5ème','6ème','7ème','8ème','9ème','10ème'];

/* ── État ── */
let cfg     = deepClone(CFG_DEFAULT);       // remplacés par les réglages de la base au démarrage (voir DOMContentLoaded)
let annexes = deepClone(ANNEXES_DEFAULT);

/* Encadrement (directeurs et arbitres) : enregistré en base (table parametres, clé declaration_encadrement), donc partagé entre
   les postes. Les noms ne sont PAS dans le code (dépôt public). Listes vides tant que la base n'a pas répondu. */
const STAFF_CLE = 'declaration_encadrement';
let staff       = { directeurs: [], arbitres: [] };
let staffEtat   = 'chargement';   // chargement | ok | erreur : on n'enregistre que si 'ok' (sinon on écraserait la base avec des listes vides)

/* Écritures des réglages : table parametres (shared/reglages.js). Lectures et clés : donnees.js */
function saveCfg()     { REGLAGES.ecrire('declaration_config',  cfg);     }
function saveAnnexes() { REGLAGES.ecrire('declaration_annexes', annexes); }
function saveAdhoc(m, y, lst)  { REGLAGES.ecrire(adhocKey(m, y), lst);  }
function saveExc(m, y, data)   { REGLAGES.ecrire(excKey(m, y), data);   }

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  await REGLAGES.charger(DECL_PREFIXE, DECL_ADOPTIONS);   // sans réponse de la base : bandeau, et rien ne s'enregistre
  cfg     = loadCfg();
  annexes = loadAnnexes();

  initPeriodPicker(document.getElementById('sel-month'), document.getElementById('inp-year'), MOIS);   // mois suivant par défaut

  SB.getExtras().then(list => { extras = list; renderExtrasDeclaration(); }).catch(() => {});
  chargerEncadrement();
  syncViews();
  renderCfgTable();
  renderStaffEditor();
  renderAnnexesEditor();
  updateMonthInputs();
  renderAll();
});

/* ── Déclaration affichée (Tournois ou Extras), Réglages et Ajout/Modifications (tournois) ── */
let _decl = 'tournois';
let _view = 'decl';          // decl | cfg (réglages) | adhoc (ajout / modifications ponctuelles)

function showDeclaration(name) {
  _decl = name;
  document.querySelectorAll('#decl-main-tabs .seg-btn').forEach(b => {
    const on = b.dataset.decl === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  syncViews();
}

/* Les boutons de l'encadré de période ouvrent Réglages ou Ajout/Modifications à la place de la déclaration ;
   le bouton ouvert devient « Retour à la déclaration » */
function openView(name) {
  _view = _view === name ? 'decl' : name;
  syncViews();
  window.scrollTo(0, 0);
}

function syncViews() {
  const decl = _view === 'decl';
  document.getElementById('view-tournois').hidden = !(decl && _decl === 'tournois');
  document.getElementById('view-extras').hidden   = !(decl && _decl === 'extras');
  document.getElementById('view-cfg').hidden      = _view !== 'cfg';
  document.getElementById('view-adhoc').hidden    = _view !== 'adhoc';
  document.getElementById('decl-main-tabs').hidden = !decl;
  document.getElementById('btn-print').hidden      = !decl;
  [['btn-reglages', 'cfg', 'ico-cog', 'Réglages'], ['btn-adhoc', 'adhoc', 'ico-plus', 'Ajout/Modifications']].forEach(([id, view, icon, label]) => {
    const b = document.getElementById(id);
    b.hidden = decl ? _decl !== 'tournois' : _view !== view;   // réservés à la déclaration des tournois ; ouverts, seul le bouton actif reste
    b.querySelector('span').textContent = _view === view ? 'Retour à la déclaration' : label;
    b.querySelector('i').className = 'ico ' + (_view === view ? 'ico-chev-l' : icon);
  });
}

/* Période modifiée : tout se recalcule, plus de bouton « Générer » */
function onPeriodChange() { if (getMonth() && getYear()) renderAll(); }

/* Petit message de confirmation (les réglages sont dans une autre vue que le résultat) */
function flash(msg) {
  let t = document.getElementById('decl-toast');
  if (!t) { t = document.createElement('div'); t.id = 'decl-toast'; t.className = 'decl-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(flash._t); flash._t = setTimeout(() => t.classList.remove('on'), 2200);
}

/* Impression : le titre devient le nom du PDF proposé */
function printDeclaration() {
  const m = MOIS[getMonth() - 1].toLowerCase();
  const mois = m.charAt(0).toUpperCase() + m.slice(1);
  printWithTitle(_decl === 'extras' ? `Déclaration extras - ${mois} ${getYear()}` : `Déclaration Tournois - ${mois} ${getYear()}`);
}

/* ── Annexe : on saisit le numéro seul, on stocke et on affiche « ANNEXE n » ── */
function annexeNum(v)   { const m = String(v == null ? '' : v).match(/\d+/); return m ? m[0] : ''; }
function annexeLabel(v) { const n = annexeNum(v); return n ? 'ANNEXE ' + n : ''; }

/* ── Onglets config ── */
function showDeclTab(name) {
  document.querySelectorAll('.decl-tab').forEach(b => b.classList.toggle('active', b.getAttribute('onclick').includes(`'${name}'`)));
  document.querySelectorAll('.decl-tab-panel').forEach(p => p.style.display = p.id === `dtab-${name}` ? '' : 'none');
}

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
      <tr><th>Jour</th><th>Actif</th><th>Heure</th><th>Cave (€)</th><th>Joueurs max</th><th>Rachats</th><th>Bounty (€)</th><th>N° annexe</th></tr>
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
          <td><input type="number" value="${annexeNum(c.annexe)}" onchange="updateCfg(${d},'annexe',annexeLabel(this.value))" style="width:60px" min="1" placeholder="N°"/></td>
        </tr>`; }).join('')}
    </tbody>`;
}
function toggleDay(d, val) { cfg[d].actif = val; const r = document.querySelector(`#cfg-table tr[data-day="${d}"]`); if (r) r.className = val ? '' : 'inactive'; }
function updateCfg(d, k, v) { cfg[d][k] = v; }
function resetConfig() { if (!confirm('Réinitialiser la configuration ?')) return; cfg = deepClone(CFG_DEFAULT); saveCfg(); renderCfgTable(); renderAll(); }
function saveAndRender() { saveCfg(); renderAll(); flash('Réglages des tournois enregistrés'); }

/* ── Staff ── */
function normaliserStaff(v) {
  const liste = x => (Array.isArray(x) ? x : []).map(n => String(n).trim()).filter(Boolean);
  return { directeurs: liste(v && v.directeurs), arbitres: liste(v && v.arbitres) };
}

/* Lecture en base. Si la base n'a encore rien, on reprend UNE fois l'ancienne version enregistrée dans ce navigateur
   (avant que l'encadrement soit en base) pour ne rien perdre, puis on la retire du navigateur. */
async function chargerEncadrement() {
  try {
    const v = await SB.getParametre(STAFF_CLE);
    if (v) {
      staff = normaliserStaff(v);
    } else {
      let local = null;
      try { local = JSON.parse(localStorage.getItem('decl_staff') || 'null'); } catch { local = null; }
      if (local) {
        staff = normaliserStaff(local);
        await SB.saveParametre(STAFF_CLE, staff);
        localStorage.removeItem('decl_staff');
        flash('Encadrement de ce poste repris et enregistré en base');
      }
    }
    staffEtat = 'ok';
  } catch (e) {
    console.warn('Encadrement : lecture impossible', e);
    staffEtat = 'erreur';
  }
  renderStaffEditor();
  renderAll();
}

/* Enregistre en base ; renvoie true si c'est fait. Refuse tant que la lecture n'a pas réussi (écraserait la base avec du vide). */
async function saveStaff() {
  if (staffEtat !== 'ok') { flash('Encadrement non enregistré : il n\'a pas pu être chargé. Rechargez la page.'); return false; }
  staff = normaliserStaff(staff);
  try { await SB.saveParametre(STAFF_CLE, staff); return true; }
  catch (e) { console.warn('Encadrement : enregistrement impossible', e); flash('Enregistrement impossible : ' + (e.message || 'réessayez')); return false; }
}

function renderStaffEditor() {
  const msg = document.getElementById('staff-msg');
  if (msg) {
    msg.style.display = staffEtat === 'ok' && (staff.directeurs.length + staff.arbitres.length) > 0 ? 'none' : 'flex';
    msg.textContent = staffEtat === 'erreur' ? 'L\'encadrement n\'a pas pu être chargé : rechargez la page. Rien ne sera enregistré tant qu\'il n\'est pas chargé.'
      : staffEtat === 'chargement' ? 'Chargement de l\'encadrement…'
      : 'Aucun nom enregistré : ajoutez les directeurs et les arbitres, puis enregistrez.';
  }
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
function staffRow(type, i, n) { return `<div class="staff-item"><input type="text" value="${escapeHtml(n)}" onchange="updateStaff('${type}',${i},this.value)"/><button class="btn-red" onclick="removeStaff('${type}',${i})">×</button></div>`; }
function updateStaff(type, i, v) { staff[type][i] = v; }
function addStaff(type)          { staff[type].push(''); renderStaffEditor(); }   // la ligne vide n'est enregistrée qu'une fois remplie (bouton Enregistrer)
async function removeStaff(type, i) { staff[type].splice(i,1); await saveStaff(); renderStaffEditor(); renderAll(); }
async function saveStaffAndRender() {
  if (!(await saveStaff())) return;
  renderStaffEditor(); renderAll(); flash('Encadrement enregistré');
}

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
      <div class="fg"><label class="fl">N° d'annexe</label><input type="number" value="${annexeNum(a.nom)}" min="1" onchange="updateAnnexeField('${a.id}','nom',annexeLabel(this.value))" style="width:80px"/></div>
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
function saveAnnexesAndRender() { saveAnnexes(); renderAll(); flash('Annexes enregistrées'); }

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
  const annexe  = annexeLabel(document.getElementById('adhoc-annexe').value);
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
        <span class="adhoc-titre">${escapeHtml(t.titre)}</span>
        <span class="adhoc-meta">${escapeHtml(t.cave)}€ · ${escapeHtml(t.joueurs)} jrs${t.bounty ? ` · Bounty ${escapeHtml(t.bounty)}€` : ''}${t.annexe ? ` · ${escapeHtml(t.annexe)}` : ''}</span>
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
  document.getElementById('exc-annexe').value    = annexeNum(vals.annexe ?? c.annexe);

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
    annexe:  annexeLabel(document.getElementById('exc-annexe').value),
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
      : `<span style="color:var(--gold);font-weight:500">Modifié</span> - ${escapeHtml(e.cave)}€ · ${escapeHtml(e.heure)}${e.rachats ? ' RE ENTRY' : ''}${e.annexe ? ' · '+escapeHtml(e.annexe) : ''}`;
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
  renderExtrasDeclaration();
}

/* ── Déclaration Extras (liste des croupiers extras enregistrés dans Gestion des Extras) ── */
let extras = [];
function renderExtrasDeclaration() {
  const el = document.getElementById('extras-output');
  if (!el) return;
  if (!extras.length) { el.innerHTML = '<p class="adhoc-empty" style="padding:20px 0">Aucun extra enregistré. Ils se gèrent dans « Gestion des Extras ».</p>'; return; }
  const list = [...extras].sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
  el.innerHTML = `
    <table class="decl-extras-tbl">
      <thead>
        <tr><th colspan="7" class="det-title">DECLARATION CROUPIER EXTRA ${MOIS[getMonth() - 1]} ${getYear()} - CASINO BORDEAUX</th></tr>
        <tr class="det-hrow">
          <th>Noms</th><th>Prenoms</th><th>Date de naissance</th>
          <th>Lieu de naissance</th><th>Adresse</th><th>Code postal</th><th>Ville</th>
        </tr>
      </thead>
      <tbody>${list.map(e => `
        <tr>
          <td class="det-nom">${escapeHtml(e.nom)}</td>
          <td class="det-prenom">${escapeHtml(e.prenom.toUpperCase())}</td>
          <td class="det-italic">${escapeHtml(e.dateNaissance || '')}</td>
          <td class="det-lieu">${escapeHtml(e.lieuNaissance || '')}</td>
          <td>${escapeHtml(e.adresse || '')}</td>
          <td>${escapeHtml(e.codePostal || '')}</td>
          <td class="det-ville">${escapeHtml(e.ville || '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ── Déclaration ── */
function renderDeclaration() {
  const month   = getMonth(), year = getYear();
  const rows    = buildRows(month, year);
  const periode = `${MOIS[month-1]} ${year}`;

  const staffHtml = `
    <div class="enc-hdr">Directeurs de tournois</div>
    ${staff.directeurs.map(n => `<div>${escapeHtml(n)}</div>`).join('')}
    <div class="enc-hdr" style="margin-top:5px">Arbitres</div>
    ${staff.arbitres.map(n => `<div>${escapeHtml(n)}</div>`).join('')}`;

  const dataHtml = rows.length
    ? rows.map((r,i) => `
        <tr class="drow">
          <td class="titre-cell">${escapeHtml(r.titre)}</td>
          <td>${r.cave} €</td><td>${r.joueurs}</td><td>ESPÈCES</td><td>MULTI-TABLES</td><td>1</td>
          <td>${r.rachats ? 'OUI' : 'NON'}</td><td>Level 8</td>
          <td>${r.bounty > 0 ? escapeHtml(r.bounty)+' €' : '-'}</td><td>${escapeHtml(r.annexe || '-')}</td>
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
      <div class="annexe-title">${escapeHtml(a.nom)}</div>
      <div class="annexe-subtitle">Tournoi Cash - Répartition des lots</div>
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
