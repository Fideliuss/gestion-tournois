// ══════════════════════════════════════════════════════
//  Journal d'audit (admin) : qui a fait quoi, quand. Lecture seule : le journal s'écrit par des déclencheurs en base
//  (supabase/migrations/journal_audit.sql) et par la fonction manage-users, jamais depuis cette page.
//  Le texte de chaque ligne vient de journal_texte.js (testé sous Node).
// ══════════════════════════════════════════════════════

const PAGE = 100;
// Périodes proposées : [clé, libellé, nombre de jours (null = tout le journal conservé)]
const PERIODES = [['24h', '24 heures', 1], ['7j', '7 jours', 7], ['30j', '30 jours', 30], ['tout', 'Tout', null]];

let _lignes = [];            // lignes déjà chargées, les plus récentes d'abord
let _encore = false;         // il reste des lignes plus anciennes à charger
let _periode = '30j';
let _comptes = {};           // id du compte -> « Prénom Nom » ou e-mail
let _roles = {};             // slug -> libellé

const $ = id => document.getElementById(id);

function nomCompte(id) { return _comptes[id] || null; }
function libelleRole(slug) { return _roles[slug] || slug; }
const ctx = { nomCompte: nomCompte, libelleRole: libelleRole };

function acteurDe(e) {
  if (!e.acteur) return 'Système';                       // pg_cron, éditeur SQL, clé de service
  return nomCompte(e.acteur) || 'Compte supprimé';
}
function quand(e) {
  return new Date(e.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const phrase = e => JOURNAL_TEXTE.decrire(e, ctx);

function showErr(msg) { const el = $('alert-err'); el.textContent = msg; el.style.display = msg ? 'flex' : 'none'; }

// ── Filtres ──────────────────────────────────────────
function initFiltres() {
  $('sel-objet').innerHTML = '<option value="">Tous les domaines</option>'
    + JOURNAL_TEXTE.OBJETS.map(o => '<option value="' + escapeHtml(o[0]) + '">' + escapeHtml(o[1]) + '</option>').join('');
  $('chips-periode').innerHTML = PERIODES.map(p =>
    '<button class="fchip' + (p[0] === _periode ? ' on' : '') + '" data-periode="' + p[0] + '" aria-pressed="' + (p[0] === _periode) + '">' + escapeHtml(p[1]) + '</button>').join('');
}

document.addEventListener('click', function (ev) {
  const chip = ev.target.closest('[data-periode]');
  if (!chip) return;
  _periode = chip.dataset.periode;
  document.querySelectorAll('[data-periode]').forEach(c => { const on = c.dataset.periode === _periode; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
  recharger();
});

function depuis() {
  const p = PERIODES.find(x => x[0] === _periode);
  return p && p[2] ? new Date(Date.now() - p[2] * 864e5).toISOString() : null;
}

// ── Chargement ───────────────────────────────────────
async function charger(depart) {
  showErr('');
  try {
    const lot = await SB.getJournal({
      since: depuis(), objet: $('sel-objet').value || null,
      avant: depart ? null : (_lignes.length ? _lignes[_lignes.length - 1].id : null), limite: PAGE,
    });
    _lignes = depart ? lot : _lignes.concat(lot);
    _encore = lot.length === PAGE;
    rendre();
  } catch (e) {
    $('liste').textContent = '';
    showErr('Erreur de chargement : ' + e.message);
  }
}
function recharger() { $('liste').textContent = 'Chargement…'; return charger(true); }
function chargerPlus() { return charger(false); }

// ── Affichage ────────────────────────────────────────
function lignesAffichees() {
  const q = $('search').value.trim().toLowerCase();
  if (!q) return _lignes;
  return _lignes.filter(e => (acteurDe(e) + ' ' + phrase(e) + ' ' + JOURNAL_TEXTE.libelleObjet(e.objet)).toLowerCase().indexOf(q) >= 0);
}

function ligneHtml(e) {
  const detail = { ligne: e.ligne, action: e.action, objet: e.objet, detail: e.detail };
  return '<div class="jr-row">'
    + '<div class="jr-date">' + escapeHtml(quand(e)) + '</div>'
    + '<div class="jr-what"><span class="jr-who">' + escapeHtml(acteurDe(e)) + '</span>'
    + (e.role_acteur ? '<span class="jr-role">' + escapeHtml(libelleRole(e.role_acteur)) + '</span>' : '') + '<br>'
    + '<span class="jr-tag">' + escapeHtml(JOURNAL_TEXTE.libelleObjet(e.objet)) + '</span>' + escapeHtml(phrase(e)) + '</div>'
    + '<details class="jr-det"><summary>Détail technique</summary><pre>' + escapeHtml(JSON.stringify(detail, null, 2)) + '</pre></details>'
    + '</div>';
}

function rendre() {
  const liste = lignesAffichees();
  const filtre = liste.length !== _lignes.length;
  $('count').textContent = (filtre ? liste.length + ' sur ' + _lignes.length : _lignes.length) + ' ligne' + (_lignes.length > 1 ? 's' : '') + (_encore ? ' (les plus récentes)' : '');
  $('btn-plus').style.display = _encore ? '' : 'none';
  $('btn-csv').disabled = !liste.length;
  $('liste').innerHTML = liste.length ? liste.map(ligneHtml).join('')
    : '<div class="jr-empty">' + (_lignes.length ? 'Aucune ligne ne correspond à la recherche.' : 'Aucune activité sur cette période.') + '</div>';
}

// ── Export CSV (lignes affichées) ────────────────────
// Une cellule qui commence par = + - ou @ serait interprétée comme une formule par un tableur : on la précède d'une apostrophe
function cellule(v) {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function exporterCsv() {
  const lignes = [['Date', 'Personne', 'Rôle', 'Domaine', 'Action', 'Détail']].concat(
    lignesAffichees().map(e => [new Date(e.at).toLocaleString('fr-FR'), acteurDe(e), e.role_acteur ? libelleRole(e.role_acteur) : '', JOURNAL_TEXTE.libelleObjet(e.objet), e.action, phrase(e)]));
  const csv = '﻿' + lignes.map(l => l.map(cellule).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'journal_audit_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── Démarrage ────────────────────────────────────────
(async function () {
  initFiltres();
  // Noms des comptes et libellés des rôles : si l'un des deux échoue, le journal reste lisible (identifiants bruts)
  const [users, roles] = await Promise.all([SB.listUsers().catch(() => []), SB.getRoles().catch(() => [])]);
  users.forEach(u => { _comptes[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email; });
  roles.forEach(r => { _roles[r.slug] = r.label; });
  await recharger();
})();
