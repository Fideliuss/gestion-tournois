/* ═══════════════════════════════════════════════════════
   courriers.js — Générateur de courriers PN
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════════════ */

/* ── Constantes ── */
const JOURS_LETTRE = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MOIS_LETTRE  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const CFG_DEFAULT = {
  0: { actif: true,  heure: '17:00', cave: 78,  joueurs: 150, rachats: true,  bounty: 0, annexe: 'ANNEXE 4' },
  1: { actif: true,  heure: '21:00', cave: 60,  joueurs: 150, rachats: true,  bounty: 0, annexe: 'ANNEXE 5' },
  2: { actif: true,  heure: '21:00', cave: 78,  joueurs: 150, rachats: true,  bounty: 25, annexe: 'ANNEXE 4' },
  3: { actif: true,  heure: '21:00', cave: 56,  joueurs: 150, rachats: true,  bounty: 0, annexe: 'ANNEXE 1' },
  4: { actif: true,  heure: '21:00', cave: 45,  joueurs: 150, rachats: true,  bounty: 0, annexe: 'ANNEXE 2' },
  5: { actif: true,  heure: '21:00', cave: 125, joueurs: 150, rachats: true,  bounty: 0, annexe: 'ANNEXE 3' },
  6: { actif: false, heure: '21:00', cave: 0,   joueurs: 150, rachats: false, bounty: 0, annexe: '' },
};

/* ── Chargement localStorage (miroir de declaration.js) ── */
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
function loadCfg()         { try { const s = localStorage.getItem('decl_cfg');              return s ? JSON.parse(s) : deepClone(CFG_DEFAULT); } catch { return deepClone(CFG_DEFAULT); } }
function loadAdhoc(m, y)   { try { const s = localStorage.getItem(`decl_adhoc_${y}_${m}`); return s ? JSON.parse(s) : []; } catch { return []; } }
function loadExc(m, y)     { try { const s = localStorage.getItem(`decl_exc_${y}_${m}`);   return s ? JSON.parse(s) : {}; } catch { return {}; } }

/* ── Calendrier (même logique que declaration.js) ── */
function buildRows(month, year) {
  const cfg     = loadCfg();
  const exc     = loadExc(month, year);
  const numDays = new Date(year, month, 0).getDate();
  const rows    = [];

  for (let d = 1; d <= numDays; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const c   = cfg[dow];
    if (!c.actif) continue;
    const override = exc[d];
    if (override?.type === 'cancelled') continue;
    const vals = override?.type === 'modified' ? { ...c, ...override } : c;
    rows.push({ d, dow, adhoc: false, cave: vals.cave, joueurs: vals.joueurs, rachats: vals.rachats, bounty: vals.bounty, annexe: vals.annexe });
  }

  loadAdhoc(month, year).forEach(t => rows.push({ ...t, adhoc: true }));
  rows.sort((a, b) => a.d - b.d || (a.adhoc ? 1 : -1));
  return rows;
}

/* ── Regroupement des jours par jour de semaine ── */
function buildDayLines(rows, month) {
  const groups = {};
  rows.forEach(r => {
    if (!groups[r.dow]) groups[r.dow] = new Set();
    groups[r.dow].add(r.d);
  });

  const monthName  = MOIS_LETTRE[month - 1];
  const DOW_ORDER  = [1, 2, 3, 4, 5, 6, 0]; // Lundi → Dimanche

  return DOW_ORDER
    .filter(dow => groups[dow])
    .map(dow => {
      const days   = [...groups[dow]].sort((a, b) => a - b);
      const last   = days[days.length - 1];
      const others = days.slice(0, -1);
      const nums   = others.length ? others.join(', ') + ' et ' + last : String(last);
      return `${JOURS_LETTRE[dow]} ${nums} ${monthName}`;
    });
}

/* ═══════════════════════════════════════
   TEMPLATES DES 3 COURRIERS
═══════════════════════════════════════ */
const TEMPLATES_DEFAULT = {

  ministre: {
    id:    'ministre',
    label: 'Ministre de l\'Intérieur',
    recipient: [
      'Monsieur le Ministre de l\'Intérieur',
      'S/C de Monsieur Le Directeur Central',
      'de la Police Judiciaire',
      'Service Central des Courses et Jeux',
      '11, Rue des Saussaies',
      '75008 PARIS',
    ],
    salutation: 'Monsieur le Ministre,',
    closingParagraph: 'À cet effet, vous trouverez ci-joints les conditions d\'organisation, conformément à l\'Article 57-5 et suivants de l\'Arrêté du 14 mai 2007, tenant compte des modifications introduites par l\'Arrêté rectificatif du 24 décembre 2008, ainsi que du décret n°2009-937 du 29 juillet 2009, ainsi que le règlement de chaque tournoi.',
    closingFormula:   'Vous en souhaitant bonne réception, je vous prie de croire, Monsieur le Ministre, à l\'assurance de ma haute considération.',
    sigName:          'Stéphane GARCIA',
    autresItems: [
      'SIPJ 33 / Section des Courses & Jeux',
      'Préfecture de la Gironde',
    ],
  },

  sipj: {
    id:    'sipj',
    label: 'Police Judiciaire (SIPJ 33)',
    recipient: [
      'Mr Jean René PERSONNIC',
      'Commissaire divisionnaire de police',
      'Chef du service interdépartemental de la',
      'police judiciaire de la Gironde',
      'SIPJ 33 / Section des Courses & Jeux',
      '23, rue François de Sourdis',
      'BP 933',
      '33062 BORDEAUX CEDEX',
    ],
    salutation: null,
    closingParagraph: 'A cet effet, vous trouverez, ci-joints, les conditions d\'organisation ainsi que le règlement de chaque tournoi.',
    closingFormula:   'Vous en souhaitant bonne réception, je vous prie de croire, Monsieur le Commissaire Divisionnaire, à l\'assurance de ma haute considération.',
    sigName:          'Stéphane GARCIA',
    autresItems: [
      'Ministre de l\'Intérieur – S/C de Monsieur Le Directeur Central de la Police Judiciaire',
      'Préfecture de la Gironde',
    ],
  },

  prefecture: {
    id:    'prefecture',
    label: 'Préfecture de la Gironde',
    recipient: [
      'Préfecture de la Gironde',
      'A l\'attention du service de',
      'Mme BESSELERE-LAMOTHE',
      'Esplanade Charles de Gaulle',
      '33037 BORDEAUX',
    ],
    salutation: null,
    closingParagraph: 'A cet effet, vous trouverez, ci-joints, les conditions d\'organisation ainsi que le règlement de chaque tournoi.',
    closingFormula:   'Vous en souhaitant bonne réception, je vous prie de croire, Madame, à l\'assurance de ma haute considération.',
    sigName:          'Stéphane GARCIA',
    autresItems: [
      'Ministre de l\'Intérieur – S/C de Monsieur Le Directeur Central de la Police Judiciaire',
      'SIPJ 33 / Section des Courses & Jeux',
    ],
  },

};

/* ── État ── */
let currentTab    = 'ministre';
let currentTplTab = 'ministre';
let templates;
let docType    = 'mensuel';
let annulDates = [];

/* ── Persistance des templates ── */
function loadTemplates() {
  try {
    const s = localStorage.getItem('courriers_tpl');
    const overrides = s ? JSON.parse(s) : {};
    templates = deepClone(TEMPLATES_DEFAULT);
    ['ministre', 'sipj', 'prefecture'].forEach(id => {
      if (overrides[id]) Object.assign(templates[id], overrides[id]);
    });
  } catch {
    templates = deepClone(TEMPLATES_DEFAULT);
  }
}

function saveTemplates() {
  const data = {};
  ['ministre', 'sipj', 'prefecture'].forEach(id => {
    const t = templates[id];
    data[id] = {
      recipient:      t.recipient,
      salutation:     t.salutation,
      closingFormula: t.closingFormula,
      sigName:        t.sigName,
      autresItems:    t.autresItems,
    };
  });
  localStorage.setItem('courriers_tpl', JSON.stringify(data));
}

/* ── Éditeur de templates ── */
function showTplTab(tplId) {
  currentTplTab = tplId;
  document.querySelectorAll('.tpl-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tpl === tplId)
  );
  renderTplEditor(tplId);
}

function renderTplEditor(tplId) {
  const t = templates[tplId];
  document.getElementById('tpl-editor').innerHTML = `
    <div class="tpl-form">
      <div class="fg">
        <label class="fl">Destinataire (1 ligne par entrée)</label>
        <textarea id="tpl-recipient" rows="7">${esc(t.recipient.join('\n'))}</textarea>
      </div>
      <div class="tpl-col-right">
        <div class="fg">
          <label class="fl">Appel (laisser vide si aucun)</label>
          <input type="text" id="tpl-salutation" value="${esc(t.salutation || '')}"/>
        </div>
        <div class="fg">
          <label class="fl">Formule de politesse</label>
          <textarea id="tpl-formula" rows="3">${esc(t.closingFormula)}</textarea>
        </div>
        <div class="fg">
          <label class="fl">Nom du signataire</label>
          <input type="text" id="tpl-signame" value="${esc(t.sigName)}"/>
        </div>
        <div class="fg">
          <label class="fl">Autres destinataires (1 par ligne)</label>
          <textarea id="tpl-autres" rows="3">${esc(t.autresItems.join('\n'))}</textarea>
        </div>
      </div>
    </div>`;
}

function saveTplAndRender() {
  const t = templates[currentTplTab];
  const recipientEl  = document.getElementById('tpl-recipient');
  const salutationEl = document.getElementById('tpl-salutation');
  const formulaEl    = document.getElementById('tpl-formula');
  const signameEl    = document.getElementById('tpl-signame');
  const autresEl     = document.getElementById('tpl-autres');
  if (recipientEl)  t.recipient      = recipientEl.value.split('\n').filter(l => l.trim());
  if (salutationEl) t.salutation     = salutationEl.value.trim() || null;
  if (formulaEl)    t.closingFormula = formulaEl.value.trim();
  if (signameEl)    t.sigName        = signameEl.value.trim();
  if (autresEl)     t.autresItems    = autresEl.value.split('\n').filter(l => l.trim());
  saveTemplates();
  renderAll();
}

function toggleTplAccordion() {
  const btn  = document.getElementById('tpl-accordion-btn');
  const body = document.getElementById('tpl-accordion-body');
  const open = body.classList.toggle('open');
  btn.classList.toggle('open', open);
}

function resetTemplates() {
  if (!confirm('Réinitialiser les destinataires par défaut ?')) return;
  localStorage.removeItem('courriers_tpl');
  loadTemplates();
  renderTplEditor(currentTplTab);
  renderAll();
}

/* ── Helpers UI ── */
function getMonth() { return +document.getElementById('sel-month').value; }
function getYear()  { return +document.getElementById('inp-year').value; }

function computeDeadline(month, year) {
  const d = new Date(year, month - 1, 1 - 21);
  return { d: d.getDate(), m: d.getMonth() + 1, y: d.getFullYear() };
}

function onPeriodChange() {
  const month = getMonth();
  const year  = getYear();
  if (!month || !year) return;
  const dl = computeDeadline(month, year);
  document.getElementById('inp-date-d').value = dl.d;
  document.getElementById('inp-date-m').value = dl.m;
  document.getElementById('inp-date-y').value = dl.y;
  const label = `${String(dl.d).padStart(2, '0')} ${MOIS_LETTRE[dl.m - 1]} ${dl.y}`;
  const hint = document.getElementById('deadline-hint');
  if (hint) hint.textContent = `Date limite de déclaration · ${label}`;
  renderAll();
}

function formatLetterDate() {
  const d = +document.getElementById('inp-date-d').value;
  const m = +document.getElementById('inp-date-m').value;
  const y = +document.getElementById('inp-date-y').value;
  return `${String(d).padStart(2, '0')} ${MOIS_LETTRE[m - 1]} ${y}`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Initialisation ── */
document.addEventListener('DOMContentLoaded', () => {
  const now      = new Date();
  const selMonth = document.getElementById('sel-month');

  MOIS_LETTRE.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = m;
    if (i === now.getMonth()) o.selected = true;
    selMonth.appendChild(o);
  });

  document.getElementById('inp-year').value = now.getFullYear();

  // Peuple le select mois de la date courrier
  const selDateM = document.getElementById('inp-date-m');
  MOIS_LETTRE.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = m;
    selDateM.appendChild(o);
  });

  // Peuple le select mois de la date du courrier annulation
  const annulDateM = document.getElementById('annul-date-m');
  MOIS_LETTRE.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = m;
    annulDateM.appendChild(o);
  });
  document.getElementById('annul-date-d').value = now.getDate();
  document.getElementById('annul-date-m').value = now.getMonth() + 1;
  document.getElementById('annul-date-y').value = now.getFullYear();

  loadTemplates();
  renderTplEditor('ministre');
  renderAnnulDateList();
  onPeriodChange(); // auto-remplit date courrier + hint + renderAll
});

/* ── Gestion des onglets ── */
function selectTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  renderAll();
}

/* ── Rendu principal ── */
function renderAll() {
  if (docType === 'annulation') { renderAnnulation(); return; }
  const month = getMonth();
  const year  = getYear();
  const rows  = buildRows(month, year);
  document.getElementById('letter-output').innerHTML =
    generateLetterHtml(templates[currentTab], rows, month, year);
}

/* ── Génération HTML de la lettre ── */
function generateLetterHtml(tpl, rows, month, year) {
  const moisStr  = MOIS_LETTRE[month - 1] + ' ' + year;
  const dateStr  = formatLetterDate();
  const dayLines = buildDayLines(rows, month);

  const daysHtml = dayLines.length
    ? dayLines.map(line => `<li>${esc(line)}</li>`).join('')
    : '<li><em>Aucun tournoi actif pour ce mois.</em></li>';

  const salutHtml = tpl.salutation
    ? `<div class="letter-salut">${esc(tpl.salutation)}</div>`
    : '';

  const recipientHtml = tpl.recipient.map(esc).join('<br>');

  return `
<div class="letter">

  <!-- En-tête -->
  <div class="letter-header">
    <div class="letter-header-left">
      <img class="letter-logo-img" src="../../shared/logos/logo.png" alt="Casino Barrière Bordeaux">
    </div>
    <div class="letter-header-right">
      <div class="letter-recipient">${recipientHtml}</div>
      <div class="letter-date">Bordeaux, le ${esc(dateStr)}</div>
    </div>
  </div>

  <!-- Objet -->
  <div class="letter-objet">
    <span class="letter-objet-lbl">Objet&nbsp;:</span> Tournois de Texas Holdem Poker du mois de ${esc(moisStr)}.
  </div>

  ${salutHtml}

  <!-- Corps -->
  <div class="letter-body">
    <p>J'ai l'honneur de vous informer que le Casino Barrière Bordeaux organisera des Tournois Multi-tables de Texas Hold'em Poker au cours du mois de ${esc(moisStr)}, comme suit&nbsp;:</p>

    <ul class="letter-days">${daysHtml}</ul>

    <p>${esc(tpl.closingParagraph)}</p>

    <p>${esc(tpl.closingFormula)}</p>
  </div>

  <!-- Espace signature manuscrite + nom -->
  <div class="letter-signature-space"></div>
  <div class="letter-signature">
    <div class="letter-signature-inner">
      ${esc(tpl.sigName)}<br>
      Directeur Responsable
    </div>
  </div>

  <!-- Autres destinataires -->
  <div class="letter-autres">
    <div class="letter-autres-title">Autres Destinataires&nbsp;:</div>
    <ul>${tpl.autresItems.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
  </div>

  <div class="letter-spacer"></div>

  <!-- Pied de page -->
  <div class="letter-footer">
    Rue Cardinal Richaud &ndash; T&nbsp;05&nbsp;56&nbsp;69&nbsp;49&nbsp;00 &ndash; 33300 BORDEAUX<br>
    Casino Barrière Bordeaux &ndash; STABL au capital de 6&nbsp;000&nbsp;000 euros &ndash;<br>
    Identification entreprise B&nbsp;841&nbsp;461&nbsp;650 R.C.S. BORDEAUX &ndash; Identification TVA&nbsp;: FR&nbsp;23&nbsp;841&nbsp;461&nbsp;650
  </div>

</div>`;
}

/* ── Impression ── */
function printCurrent() {
  window.print();
}

/* ── Sélecteur de type de document ── */
function selectDocType(type) {
  docType = type;
  document.getElementById('section-mensuel').style.display    = type === 'mensuel'    ? '' : 'none';
  document.getElementById('section-annulation').style.display = type === 'annulation' ? '' : 'none';
  document.getElementById('dtype-mensuel').classList.toggle('active',    type === 'mensuel');
  document.getElementById('dtype-annulation').classList.toggle('active', type === 'annulation');
  renderAll();
}

/* ── Annulation : gestion multi-dates ── */
function addAnnulDate() {
  const input = document.getElementById('annul-date-input');
  const val   = input.value;
  if (!val) return;
  if (annulDates.includes(val)) { input.value = ''; return; }
  annulDates.push(val);
  annulDates.sort();
  input.value = '';
  renderAnnulDateList();
  renderAnnulation();
}

function removeAnnulDate(idx) {
  annulDates.splice(idx, 1);
  renderAnnulDateList();
  renderAnnulation();
}

function renderAnnulDateList() {
  const container = document.getElementById('annul-date-list');
  const objetEl   = document.getElementById('annul-objet-preview');
  if (!annulDates.length) {
    container.innerHTML = '<div class="annul-empty-hint">Aucune date ajoutée.</div>';
    if (objetEl) objetEl.textContent = '—';
    return;
  }
  container.innerHTML = annulDates.map((d, i) => {
    const [y, m, day] = d.split('-').map(Number);
    const dow   = new Date(y, m - 1, day).getDay();
    const label = `${JOURS_LETTRE[dow]} ${String(day).padStart(2, '0')} ${MOIS_LETTRE[m - 1]} ${y}`;
    return `<div class="annul-date-chip">${esc(label)}<button class="chip-remove" onclick="removeAnnulDate(${i})" title="Supprimer">✕</button></div>`;
  }).join('');
  if (objetEl) objetEl.textContent = formatAnnulObjet(annulDates);
}

/* ── Formatage des dates d'annulation ── */
function _buildDateStr(dates) {
  const sorted = [...dates].sort();
  const parsed = sorted.map(d => {
    const [y, m, day] = d.split('-').map(Number);
    return { y, m, day };
  });

  if (parsed.length === 1) {
    const { day, m, y } = parsed[0];
    return { core: `${String(day).padStart(2, '0')} ${MOIS_LETTRE[m - 1]} ${y}`, range: false };
  }

  if (parsed.length >= 3) {
    const isConsecutive = parsed.every((d, i) => {
      if (i === 0) return true;
      const prev = parsed[i - 1];
      return (new Date(d.y, d.m - 1, d.day) - new Date(prev.y, prev.m - 1, prev.day)) === 86400000;
    });
    if (isConsecutive) {
      const first = parsed[0];
      const last  = parsed[parsed.length - 1];
      if (first.m === last.m && first.y === last.y) {
        return { core: `${String(first.day).padStart(2, '0')} au ${String(last.day).padStart(2, '0')} ${MOIS_LETTRE[first.m - 1]} ${first.y} inclus`, range: true };
      }
      return { core: `${String(first.day).padStart(2, '0')} ${MOIS_LETTRE[first.m - 1]} au ${String(last.day).padStart(2, '0')} ${MOIS_LETTRE[last.m - 1]} ${last.y} inclus`, range: true };
    }
  }

  const allSameMonth = parsed.every(d => d.m === parsed[0].m && d.y === parsed[0].y);
  if (allSameMonth) {
    const { m, y } = parsed[0];
    const days   = parsed.map(d => String(d.day).padStart(2, '0'));
    const last   = days[days.length - 1];
    const others = days.slice(0, -1);
    return { core: `${others.join(', ')} et ${last} ${MOIS_LETTRE[m - 1]} ${y}`, range: false };
  }

  const full   = parsed.map(({ day, m, y }) => `${String(day).padStart(2, '0')} ${MOIS_LETTRE[m - 1]} ${y}`);
  const last   = full[full.length - 1];
  const others = full.slice(0, -1);
  return { core: `${others.join(', ')} et ${last}`, range: false };
}

function formatAnnulDatesObjet(dates) {
  if (!dates.length) return null;
  const { core } = _buildDateStr(dates);
  return `du ${core}`;
}

function formatAnnulDatesBody(dates) {
  if (!dates.length) return null;
  const { core, range } = _buildDateStr(dates);
  return range ? `du ${core}` : `le ${core}`;
}

function formatAnnulObjet(dates) {
  const dateStr = formatAnnulDatesObjet(dates);
  if (!dateStr) return '—';
  const plural = dates.length > 1;
  return `Annulation ${plural ? 'des tournois' : 'du tournoi'} de Texas Hold'em Poker ${dateStr}.`;
}

/* ── Annulation de tournoi ── */
function formatAnnulLetterDate() {
  const d = +document.getElementById('annul-date-d').value || 0;
  const m = +document.getElementById('annul-date-m').value || 0;
  const y = +document.getElementById('annul-date-y').value || 0;
  if (!d || !m || !y) return '—';
  return `${String(d).padStart(2, '0')} ${MOIS_LETTRE[m - 1]} ${y}`;
}

function renderAnnulation() {
  const dateStr = formatAnnulLetterDate();
  const motif   = document.getElementById('annul-motif')?.value || '';
  document.getElementById('letter-output').innerHTML =
    generateAnnulationHtml(templates.sipj, annulDates, motif, dateStr);
}

function generateAnnulationHtml(tpl, dates, motif, dateStr) {
  const recipientHtml = tpl.recipient.map(esc).join('<br>');
  const plural        = dates.length > 1;
  const objetStr      = formatAnnulObjet(dates);
  const bodyDatesStr  = formatAnnulDatesBody(dates) || '—';

  const motifPara = motif.trim()
    ? `<p>Cette annulation est rendue nécessaire en raison ${esc(motif.trim())}.</p>`
    : '';

  const closingFormula = 'Je vous prie d\'agréer, Monsieur le Commissaire Divisionnaire, l\'expression de ma très haute considération.';

  return `
<div class="letter">

  <div class="letter-header">
    <div class="letter-header-left">
      <img class="letter-logo-img" src="../../shared/logos/logo.png" alt="Casino Barrière Bordeaux">
    </div>
    <div class="letter-header-right">
      <div class="letter-recipient">${recipientHtml}</div>
      <div class="letter-date">Bordeaux, le ${esc(dateStr)}</div>
    </div>
  </div>

  <div class="letter-objet">
    <span class="letter-objet-lbl">Objet&nbsp;:</span> ${esc(objetStr)}
  </div>

  <div class="letter-salut">Monsieur le Commissaire Divisionnaire,</div>

  <div class="letter-body">
    <p>Conform&eacute;ment &agrave; l&rsquo;article 57-8 de l&rsquo;arr&ecirc;t&eacute; du 14 mai 2007, j&rsquo;ai l&rsquo;honneur de vous informer de l&rsquo;annulation ${plural ? 'des tournois' : 'du tournoi'} de Texas Hold&rsquo;em Poker ${plural ? 'qui devaient se tenir' : 'qui devait se tenir'} ${esc(bodyDatesStr)}.</p>
    ${motifPara}
    <p>Nous vous prions de bien vouloir prendre acte de cette information.</p>
    <p>${esc(closingFormula)}</p>
  </div>

  <div class="letter-signature-space"></div>
  <div class="letter-signature">
    <div class="letter-signature-inner">
      ${esc(tpl.sigName)}<br>
      Directeur Responsable
    </div>
  </div>

  <div class="letter-spacer"></div>

  <div class="letter-footer">
    Rue Cardinal Richaud &ndash; T&nbsp;05&nbsp;56&nbsp;69&nbsp;49&nbsp;00 &ndash; 33300 BORDEAUX<br>
    Casino Barrière Bordeaux &ndash; STABL au capital de 6&nbsp;000&nbsp;000 euros &ndash;<br>
    Identification entreprise B&nbsp;841&nbsp;461&nbsp;650 R.C.S. BORDEAUX &ndash; Identification TVA&nbsp;: FR&nbsp;23&nbsp;841&nbsp;461&nbsp;650
  </div>

</div>`;
}
