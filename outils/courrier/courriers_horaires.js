/* ═══════════════════════════════════════
   courriers_horaires.js - Courriers d'horaires (service Machines à sous)
   · Période d'exploitation (art. 19 de l'arrêté du 14 mai 2007) : note annuelle au Ministre de l'Intérieur,
     par exercice (1er novembre N au 31 octobre N+1) et horaires par catégorie de jeux (horaires enregistrés en base, clé courriers_horaires).
   · Dérogation d'horaire (art. 31) : ouverture exceptionnelle, fermeture anticipée avec réouverture, fermeture prolongée.
   Chargé après courriers.js (en-tête, signature, pied de page, destinataires, signataires).
═══════════════════════════════════════ */

const HORAIRES_DEFAUT = [
  { categorie: 'Machines à sous',                                                                  jours: 'Lundi au Dimanche & jours fériés', horaires: '10h00 à 04h00' },
  { categorie: 'Jeux de table traditionnels',                                                      jours: 'Lundi au Dimanche & jours fériés', horaires: '21h00 à 04h00' },
  { categorie: 'Jeux de contrepartie électroniques (Roulette anglaise électronique & Black Jack électronique)', jours: 'Lundi au Dimanche & jours fériés', horaires: '10h00 à 04h00' },
];
const CLE_HORAIRES = 'courriers_horaires';

let horaires = null;

function hEl(id) { return document.getElementById(id); }

/* « 2026-11-05 » → { j, m, a, jour } ; null si vide */
function dateDe(iso) {
  if (!iso) return null;
  const [a, m, j] = iso.split('-').map(Number);
  return { j, m, a, jour: JOURS_LETTRE[new Date(a, m - 1, j).getDay()] };
}
/* Dates et heures insécables (espaces fines) : une date ne se coupe jamais en fin de ligne */
const INSEC = '\u00a0';
function dateLongue(iso, avecJour) {
  const d = dateDe(iso);
  if (!d) return '…';
  return [avecJour ? d.jour.toLowerCase() : null, d.j === 1 ? '1er' : String(d.j), MOIS_LETTRE[d.m - 1].toLowerCase(), String(d.a)].filter(Boolean).join(INSEC);
}
function heureDe(hhmm) { return hhmm ? hhmm.replace(':', 'h') : '…'; }
function aHeure(hhmm) { return `à${INSEC}${heureDe(hhmm)}`; }

/* Date du courrier (jour, mois, année, comme les autres courriers) */
function initDateCourrier(prefix, now) {
  fillMonthSelect(hEl(`${prefix}-m`));
  hEl(`${prefix}-d`).value = now.getDate();
  hEl(`${prefix}-m`).value = now.getMonth() + 1;
  hEl(`${prefix}-y`).value = now.getFullYear();
}
function dateCourrier(prefix) {
  const d = +hEl(`${prefix}-d`).value, m = +hEl(`${prefix}-m`).value, y = +hEl(`${prefix}-y`).value;
  return d && m && y ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
}
function isoDe(dt) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; }
function lendemain(iso) { const d = dateDe(iso); return d ? isoDe(new Date(d.a, d.m - 1, d.j + 1)) : ''; }

/* ── Initialisation (appelée par courriers.js une fois les réglages chargés) ── */
function initHoraires(now) {
  // Exercice du 1er novembre N au 31 octobre N+1 (liste « N - N+1 ») ; la note part en octobre pour l'exercice qui commence le mois suivant
  const propose = now.getMonth() <= 9 ? now.getFullYear() : now.getFullYear() + 1;
  hEl('per-annee').innerHTML = [-2, -1, 0, 1, 2].map(k => propose + k).map(n => `<option value="${n}">${n} - ${n + 1}</option>`).join('');
  hEl('per-annee').value = String(propose);
  initDateCourrier('per-date', now);
  horaires = REGLAGES.lire(CLE_HORAIRES, HORAIRES_DEFAUT);
  if (!Array.isArray(horaires) || !horaires.length) horaires = deepClone(HORAIRES_DEFAUT);
  renderHorairesEditor();

  const select = hEl('der-dest');
  select.innerHTML = ['sipj', 'prefecture', 'ministre'].map(id => `<option value="${id}">${esc(templates[id].label)}</option>`).join('')
    + `<option value="${LIBRE_AUTRE}">Autre destinataire</option>`;
  const demain = isoDe(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  hEl('der-jour').value = demain;
  hEl('der-reouv-jour').value = lendemain(demain);
  initDateCourrier('der-date', now);
  onDerDestChange();
  onDerVarianteChange();
}

/* ═══ Période d'exploitation ═══ */
function renderHorairesEditor() {
  hEl('per-horaires').innerHTML = `
    <div class="hor-row hor-tete"><span class="fl">Catégorie de jeux</span><span class="fl">Jours</span><span class="fl">Horaires</span><span></span></div>`
    + horaires.map((h, i) => `
    <div class="hor-row">
      <textarea class="hor-cat" rows="2" aria-label="Catégorie de jeux" oninput="lireHoraires();renderPeriode()">${esc(h.categorie)}</textarea>
      <textarea class="hor-jours" rows="2" aria-label="Jours" oninput="lireHoraires();renderPeriode()">${esc(h.jours)}</textarea>
      <input type="text" class="hor-heures" aria-label="Horaires" value="${esc(h.horaires)}" oninput="lireHoraires();renderPeriode()"/>
      <button class="btn btn-ghost" type="button" data-i="${i}" onclick="retirerHoraire(+this.dataset.i)" ${horaires.length < 2 ? 'disabled' : ''}>Retirer</button>
    </div>`).join('');
}
function lireHoraires() {
  const c = document.querySelectorAll('#per-horaires .hor-cat'), j = document.querySelectorAll('#per-horaires .hor-jours'), h = document.querySelectorAll('#per-horaires .hor-heures');
  horaires = Array.from(c).map((el, i) => ({ categorie: el.value.trim(), jours: j[i].value.trim(), horaires: h[i].value.trim() }));
}
function ajouterHoraire() { lireHoraires(); horaires.push({ categorie: '', jours: 'Lundi au Dimanche & jours fériés', horaires: '' }); renderHorairesEditor(); renderPeriode(); }
function retirerHoraire(i) { lireHoraires(); if (horaires.length < 2) return; horaires.splice(i, 1); renderHorairesEditor(); renderPeriode(); }
async function enregistrerHoraires() {
  lireHoraires();
  const ok = await REGLAGES.ecrire(CLE_HORAIRES, horaires);
  const msg = hEl('per-enregistre');
  msg.textContent = ok ? 'Horaires enregistrés.' : '';
  if (ok) setTimeout(() => { msg.textContent = ''; }, 2500);
}

/* Exercice N : du 1er novembre N au 31 octobre N+1 */
function exercice() {
  const n = +hEl('per-annee').value || new Date().getFullYear();
  return { n, debut: `${n}-11-01`, fin: `${n + 1}-10-31` };
}

function renderPeriode() {
  const tpl = templates.ministre, ex = exercice();
  const lignesHoraires = horaires.filter(h => h.categorie || h.horaires).map(h => `
      <div class="hor-cat-lettre">${esc(h.categorie)}&nbsp;:</div>
      <div class="hor-ligne"><span>${esc(h.jours)}</span><span>${esc(h.horaires)}</span></div>`).join('');
  document.getElementById('letter-output').innerHTML = `
<div class="letter">
  ${letterHeaderHtml(tpl.recipient, dateLongue(dateCourrier('per-date')))}
  ${tpl.salutation ? `<div class="letter-salut">${esc(tpl.salutation)}</div>` : ''}
  <div class="letter-body">
    <p>Conformément aux dispositions réglementaires en vigueur, j'ai l'honneur de vous faire connaître que, dans les limites fixées par l'arrêté d'autorisation, j'ai fixé comme suit la période d'exploitation et les horaires de fonctionnement des jeux&nbsp;:</p>
    <div class="per-titre">I) Période d'exploitation</div>
    <div class="per-valeur">${esc(dateLongue(ex.debut))} &ndash; ${esc(dateLongue(ex.fin))}</div>
    <div class="per-titre">II) Horaires de fonctionnement</div>
    ${lignesHoraires}
    <p class="per-formule">Je vous prie de croire, Monsieur le Ministre, en l'expression de ma très haute considération.</p>
  </div>
  ${letterSignatureHtml(signataireChoisi('periode'))}
  ${letterFooterHtml()}
</div>`;
}
function titrePeriode() {
  const ex = exercice();
  return `Horaires annuels ${ex.n} - ${ex.n + 1}`;
}

/* ═══ Dérogation d'horaire (art. 31) ═══ */
const DER_TEXTES = {
  ouverture: {
    objet: () => `Ouverture exceptionnelle de la salle des jeux le ${dateLongue(hEl('der-jour').value)} ${aHeure(hEl('der-heure').value)}.`,
    corps: () => `Conformément aux dispositions légales en vigueur, notamment l'article 31 de l'arrêté du 14 mai 2007 modifié, et dans les limites prévues par notre arrêté d'autorisation, j'ai l'honneur de vous adresser notre souhait de fixer exceptionnellement l'heure d'ouverture de la salle des jeux le ${dateLongue(hEl('der-jour').value, true)} ${aHeure(hEl('der-heure').value)}.`,
  },
  anticipee: {
    objet: () => `Fermeture anticipée de l'établissement, séance du ${dateLongue(hEl('der-jour').value)}.`,
    corps: () => `Conformément aux dispositions légales en vigueur, notamment l'article 31 de l'arrêté du 14 mai 2007 modifié, et dans le cadre de notre arrêté d'autorisation, j'ai l'honneur de vous informer que nous anticiperons la fermeture de notre établissement lors de la séance du ${dateLongue(hEl('der-jour').value, true)} ${aHeure(hEl('der-heure').value)}, et que nous rouvrirons le ${dateLongue(hEl('der-reouv-jour').value, true)} ${aHeure(hEl('der-reouv-heure').value)}.`,
  },
  prolongee: {
    objet: () => `Heure de fermeture du ${dateLongue(hEl('der-jour').value)}.`,
    corps: () => `Conformément aux dispositions légales en vigueur, notamment l'article 31 de l'arrêté du 14 mai 2007 modifié, j'ai l'honneur de solliciter, à titre exceptionnel, l'autorisation de fermer les salles de jeux de notre casino, à l'issue de la soirée du ${dateLongue(hEl('der-jour').value, true)}, ${aHeure(hEl('der-heure').value)} le lendemain.`,
  },
};
const DER_LIBELLES = {
  ouverture: { jour: 'Jour', heure: "Heure d'ouverture", defaut: '13:00' },
  anticipee: { jour: 'Séance du', heure: 'Heure de fermeture', defaut: '03:00' },
  prolongee: { jour: 'Soirée du', heure: 'Heure de fermeture', defaut: '05:00' },
};

function onDerVarianteChange() {
  const v = hEl('der-variante').value, l = DER_LIBELLES[v];
  hEl('der-jour-lbl').textContent = l.jour;
  hEl('der-heure-lbl').textContent = l.heure;
  hEl('der-heure').value = l.defaut;
  hEl('der-reouv').style.display = v === 'anticipee' ? '' : 'none';
  if (v === 'anticipee' && !hEl('der-reouv-heure').value) hEl('der-reouv-heure').value = '12:00';
  renderDerogation();
}
function onDerJourChange() {
  if (hEl('der-variante').value === 'anticipee') hEl('der-reouv-jour').value = lendemain(hEl('der-jour').value);
  renderDerogation();
}
/* Choisir un destinataire pré-remplit adresse, appel et formule (modifiables), comme le courrier libre */
function onDerDestChange() {
  const id = hEl('der-dest').value;
  hEl('der-adresse').value = id === LIBRE_AUTRE ? '' : templates[id].recipient.join('\n');
  hEl('der-appel').value   = LIBRE_TITRES[id] + ',';
  hEl('der-formule').value = libreFormule(id);
  renderDerogation();
}

function renderDerogation() {
  const t = DER_TEXTES[hEl('der-variante').value];
  const appel = hEl('der-appel').value.trim(), formule = hEl('der-formule').value.trim();
  document.getElementById('letter-output').innerHTML = `
<div class="letter">
  ${letterHeaderHtml(lignes(hEl('der-adresse').value), dateLongue(dateCourrier('der-date')))}
  <div class="letter-objet"><span class="letter-objet-lbl">Objet&nbsp;:</span> ${esc(t.objet())}</div>
  ${appel ? `<div class="letter-salut">${esc(appel)}</div>` : ''}
  <div class="letter-body">
    <p>${esc(t.corps())}</p>
    <p>Je reste à votre entière disposition pour tout renseignement complémentaire.</p>
    ${formule ? `<p>${esc(formule)}</p>` : ''}
  </div>
  ${letterSignatureHtml(signataireChoisi('derogation'))}
  ${letterFooterHtml()}
</div>`;
}
function titreDerogation() {
  const dest = DEST_COURT[hEl('der-dest').value] || lignes(hEl('der-adresse').value)[0] || '';
  const v = { ouverture: 'Ouverture exceptionnelle', anticipee: 'Fermeture anticipée', prolongee: 'Heure de fermeture' }[hEl('der-variante').value];
  return `${v} - ${dest} - ${dateLongue(hEl('der-jour').value)}`.replace(/[\\/:*?"<>|]/g, ' ');
}
