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
const TEMPLATES = {

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
    sigName:          'Stéphane Garcia',
    autresTitreItalique: false,
    autresItems: [
      'Préfecture de la Gironde',
      'Ministère de l\'Intérieur – S/C du service Central des Courses et Jeux de la Direction Centrale de la Police',
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
      'SIPJ 33 / Section des Courses & jeux',
      '23, rue François de Sourdis',
      'BP 933',
      '33062 BORDEAUX CEDEX',
    ],
    salutation: null,
    closingParagraph: 'A cet effet, vous trouverez, ci-joints, les conditions d\'organisation ainsi que le règlement de chaque tournoi.',
    closingFormula:   'Vous en souhaitant bonne réception, je vous prie de croire, Monsieur le Commissaire Divisionnaire, à l\'assurance de ma haute considération.',
    sigName:          'Stéphane GARCIA',
    autresTitreItalique: true,
    autresItems: [
      'Préfecture de la Gironde',
      'Ministère de l\'Intérieur – S/C du service Central des Courses et Jeux de la Direction Centrale de la Police Judiciaire',
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
    autresTitreItalique: false,
    autresItems: [
      'Préfecture de la Gironde',
      'Ministère de l\'Intérieur – S/C du service Central des Courses et Jeux de la Direction Centrale de la Police Judiciaire',
    ],
  },

};

/* ── État ── */
let currentTab = 'ministre';

/* ── Helpers UI ── */
function getMonth() { return +document.getElementById('sel-month').value; }
function getYear()  { return +document.getElementById('inp-year').value; }

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

  // Date du courrier — 3 champs séparés
  const selDateM = document.getElementById('inp-date-m');
  MOIS_LETTRE.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = m;
    if (i === now.getMonth()) o.selected = true;
    selDateM.appendChild(o);
  });
  document.getElementById('inp-date-d').value = now.getDate();
  document.getElementById('inp-date-y').value = now.getFullYear();

  renderAll();
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
  const month = getMonth();
  const year  = getYear();
  const rows  = buildRows(month, year);
  document.getElementById('letter-output').innerHTML =
    generateLetterHtml(TEMPLATES[currentTab], rows, month, year);
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

  const autresTitreClass = tpl.autresTitreItalique
    ? 'letter-autres-title italic-underline'
    : 'letter-autres-title';

  return `
<div class="letter">

  <!-- En-tête -->
  <div class="letter-header">
    <div class="letter-header-left">
      <img class="letter-logo-img" src="casino-barriere-bordeaux-logo.png" alt="Casino Barrière Bordeaux">
    </div>
    <div class="letter-header-right">
      <div class="letter-recipient">${recipientHtml}</div>
      <div class="letter-date">Bordeaux, Le ${esc(dateStr)}</div>
    </div>
  </div>

  <!-- Objet -->
  <div class="letter-objet">
    <span class="letter-objet-lbl">Objet&nbsp;:</span> Tournoi de Texas Holdem Poker du mois de ${esc(moisStr)}.
  </div>

  ${salutHtml}

  <!-- Corps -->
  <div class="letter-body">
    <p>J'ai l'honneur de vous informer que le Casino Barrière de Bordeaux organisera des Tournois Multi-tables de Texas Hold'em Poker au cours du mois de ${esc(moisStr)}, comme suit&nbsp;:</p>

    <ul class="letter-days">${daysHtml}</ul>

    <p>${esc(tpl.closingParagraph)}</p>

    <p>${esc(tpl.closingFormula)}</p>
  </div>

  <!-- Espace signature manuscrite + nom -->
  <div class="letter-signature-space"></div>
  <div class="letter-signature">
    ${esc(tpl.sigName)}<br>
    Directeur Responsable
  </div>

  <!-- Autres destinataires -->
  <div class="letter-autres">
    <div class="${autresTitreClass}">Autres Destinataires&nbsp;:</div>
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
