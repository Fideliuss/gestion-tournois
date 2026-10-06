// ══════════════════════════════════════════════════════
//  GESTION DES COMPTES (admin)
//  Onglet Comptes : liste filtrable (recherche, rôle, inactifs), tri par colonne, regroupement par rôle optionnel.
//  Onglet Rôles & accès : matrice rôles × pages, enregistrée d'un coup ; nom, couleur et suppression d'un rôle en modale.
//  Onglet courant dans le hash de l'URL (#comptes / #roles).
// ══════════════════════════════════════════════════════

let _users        = [];
let _allRoles     = [];
let _editId       = null;
let _editRoleSlug = null;
let _tab          = 'comptes';
let _draft        = {};        // accès en cours d'édition dans la matrice : { slug: [id de page…] } (rien n'est envoyé avant « Enregistrer »)

const INACTIVE_DAYS = 60;       // « inactif » : jamais connecté, ou aucune connexion depuis plus de 60 jours
const f = { q: '', role: null, inactive: false, group: false, sort: { key: 'email', dir: 1 } };

// `short` : intitulé de la colonne dans la matrice
const PANELS = [
  { id: 'tournois', label: 'Outils Tournois', children: [
    { id: 'prize-pool',     label: 'Prize Pool',              short: 'Prize Pool'      },
    { id: 'leaderboard',    label: 'Leaderboard',             short: 'Leaderboard'     },
    { id: 'admin-tournois', label: 'Administration tournois', short: 'Admin. tournois' },
  ]},
  { id: 'training', label: 'Training Croupier', children: [
    { id: 'training-suivi', label: 'Suivi équipe', short: 'Suivi équipe' },
  ]},
];

const ROLE_COLORS = [
  { hex: '#C37814', label: 'Or'     },
  { hex: '#3264C8', label: 'Cobalt' },
  { hex: '#0075A9', label: 'Jean'   },
  { hex: '#28B4D7', label: 'Teal'   },
  { hex: '#c45278', label: 'Rose'   },
  { hex: '#6dcc8e', label: 'Vert'   },
  { hex: '#E65A00', label: 'Cognac' },
  { hex: '#888888', label: 'Gris'   },
];
const DEFAULT_COLORS = { admin: '#C37814', mcd: '#3264C8', floor: '#0075A9' };

const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const ICON_DEL  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
const ICON_COG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Onglets & action principale ──────────────────────
const TABS = ['comptes', 'roles'];
function showTab(name, fromHash) {
  _tab = name;
  document.querySelectorAll('.seg-btn[data-tab]').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  TABS.forEach(t => { $('tab-' + t).hidden = t !== name; });
  $('btn-primary').textContent = name === 'comptes' ? '＋ Nouveau compte' : '＋ Nouveau rôle';
  if (!fromHash && location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
}
function tabFromHash() { const h = location.hash.replace('#', ''); return TABS.indexOf(h) >= 0 ? h : 'comptes'; }
function primaryAction() { if (_tab === 'comptes') openForm(); else openNewRoleModal(); }

// ── Échap / clic sur le fond : fermer les modales ────
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if ($('modal-form').classList.contains('open'))          closeForm();
  else if ($('modal-new-role').classList.contains('open')) closeNewRoleModal();
  else if ($('modal-role').classList.contains('open'))     closeRoleEdit();
});
function onOverlayClick(e, id) {
  if (e.target !== $(id)) return;
  if (id === 'modal-form') closeForm(); else if (id === 'modal-new-role') closeNewRoleModal(); else closeRoleEdit();
}

// ── Chargement ───────────────────────────────────────
async function loadAndRender() {
  try {
    const [users, roles] = await Promise.all([SB.listUsers(), SB.getRoles()]);
    _users = users; _allRoles = roles;
    ensureDraft();
    renderAll();
  } catch (e) {
    $('accounts-list').textContent = '';
    showErr('Erreur de chargement : ' + e.message);
  }
}

function renderAll() {
  $('n-comptes').textContent = _users.length;
  $('n-roles').textContent = _allRoles.length;
  renderChips();
  renderAccounts();
  renderRoles();
  populateRoleSelect();
}

// ── Rôles : helpers ──────────────────────────────────
const ROLE_RANK = { admin: 0, mcd: 1, floor: 2 };
const roleRank  = slug => (ROLE_RANK[slug] !== undefined ? ROLE_RANK[slug] : 9);
function sortedRoles() {
  return _allRoles.slice().sort((a, b) => roleRank(a.slug) - roleRank(b.slug) || a.label.localeCompare(b.label));
}
function roleLabel(slug) { const r = _allRoles.find(r => r.slug === slug); return r ? r.label : slug; }
function roleColor(slug) { const r = _allRoles.find(r => r.slug === slug); return (r && r.color) || DEFAULT_COLORS[slug] || '#5294d2'; }
function usersOf(slug) { return _users.filter(u => u.role === slug); }
function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Comptes : état d'un compte ───────────────────────
function daysSince(iso) { return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5); }
function isInactive(u) { return !u.lastSignIn || daysSince(u.lastSignIn) > INACTIVE_DAYS; }
function initials(email) {
  const parts = email.split('@')[0].split('.');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}
function lastInfo(u) {
  if (!u.lastSignIn) return { text: 'Jamais connecté', cls: 'never', title: "Ce compte ne s'est jamais connecté" };
  const d = daysSince(u.lastSignIn);
  const text = d <= 0 ? "Aujourd'hui" : d === 1 ? 'Hier' : d < 31 ? 'Il y a ' + d + ' j'
             : d < 365 ? 'Il y a ' + Math.floor(d / 30) + ' mois' : 'Il y a ' + Math.floor(d / 365) + (d < 730 ? ' an' : ' ans');
  return { text, cls: d > INACTIVE_DAYS ? 'stale' : '', title: new Date(u.lastSignIn).toLocaleString('fr-FR') };
}

// ── Comptes : filtres ────────────────────────────────
function renderChips() {
  const counts = {};
  _users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
  if (f.role && !counts[f.role]) f.role = null;
  const chip = (key, label, n, on, dot, title) =>
    '<button class="fchip' + (on ? ' on' : '') + '" data-chip="' + esc(key) + '" aria-pressed="' + on + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>'
    + (dot ? '<i class="fchip-dot" style="background:' + dot + '"></i>' : '') + esc(label) + ' <span class="fchip-n">' + n + '</span></button>';
  $('chips').innerHTML =
    chip('all', 'Tous', _users.length, !f.role && !f.inactive)
    + sortedRoles().filter(r => counts[r.slug]).map(r => chip('role:' + r.slug, r.label, counts[r.slug], f.role === r.slug, roleColor(r.slug))).join('')
    + '<span class="fchip-sep"></span>'
    + chip('inactive', 'Inactifs', _users.filter(isInactive).length, f.inactive, null, 'Jamais connectés ou sans connexion depuis plus de ' + INACTIVE_DAYS + ' jours');
}

function onChipClick(key) {
  if (key === 'all') { f.role = null; f.inactive = false; }
  else if (key === 'inactive') f.inactive = !f.inactive;
  else { const slug = key.slice(5); f.role = f.role === slug ? null : slug; }
  renderChips(); renderAccounts();
}

function toggleGroup() {
  f.group = !f.group;
  try { localStorage.setItem('cp_group', f.group ? '1' : '0'); } catch (e) {}
  renderAccounts();
}

function setSort(key) {
  if (f.sort.key === key) f.sort.dir = -f.sort.dir;
  else f.sort = { key, dir: key === 'last' ? -1 : 1 };     // dernière connexion : la plus récente d'abord
  renderAccounts();
}

function resetFilters() {
  f.role = null; f.inactive = false; $('search').value = '';
  renderChips(); renderAccounts();
}

function compareUsers(a, b) {
  const k = f.sort.key;
  let r;
  if (k === 'role')      r = roleRank(a.role) - roleRank(b.role) || roleLabel(a.role).localeCompare(roleLabel(b.role)) || a.email.localeCompare(b.email);
  else if (k === 'last') r = (a.lastSignIn ? Date.parse(a.lastSignIn) : 0) - (b.lastSignIn ? Date.parse(b.lastSignIn) : 0) || a.email.localeCompare(b.email);
  else                   r = a.email.localeCompare(b.email);
  return r * f.sort.dir;
}

// ── Comptes : liste ──────────────────────────────────
function rowHtml(u) {
  const c = roleColor(u.role), last = lastInfo(u);
  return '<div class="cp-row" data-id="' + esc(u.id) + '">'
    + '<div class="cp-who"><div class="cp-avatar" style="background:' + c + '22;color:' + c + '">' + esc(initials(u.email)) + '</div>'
    + '<div class="cp-email" title="' + esc(u.email) + '">' + esc(u.email) + '</div></div>'
    + '<div class="cp-rolecol"><span class="cp-role" style="background:' + c + '1f;color:' + c + '"><i class="fchip-dot" style="background:' + c + '"></i>' + esc(roleLabel(u.role)) + '</span></div>'
    + '<div class="cp-last ' + last.cls + '" title="' + esc(last.title) + '">' + esc(last.text) + '</div>'
    + '<div class="cp-acts">'
    + '<button class="cp-icon" data-act="edit" title="Modifier" aria-label="Modifier ' + esc(u.email) + '">' + ICON_EDIT + '</button>'
    + '<button class="cp-icon danger" data-act="delete" title="Supprimer" aria-label="Supprimer ' + esc(u.email) + '">' + ICON_DEL + '</button>'
    + '</div></div>';
}

function headHtml() {
  const col = (key, label) =>
    '<button class="cp-sort' + (f.sort.key === key ? ' on' : '') + '" data-sort="' + key + '">' + label
    + (f.sort.key === key ? ' <span class="arr">' + (f.sort.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</button>';
  return '<div class="cp-head">' + col('email', 'Compte') + col('role', 'Rôle') + col('last', 'Dernière connexion') + '<span></span></div>';
}

function renderAccounts() {
  f.q = $('search').value.trim().toLowerCase();
  $('group-toggle').classList.toggle('on', f.group);
  $('group-toggle').setAttribute('aria-pressed', String(f.group));

  const list = _users.filter(u =>
    (!f.role || u.role === f.role)
    && (!f.inactive || isInactive(u))
    && (!f.q || u.email.toLowerCase().indexOf(f.q) >= 0 || roleLabel(u.role).toLowerCase().indexOf(f.q) >= 0)
  ).sort(compareUsers);

  const plural = n => n + ' compte' + (n > 1 ? 's' : '');
  $('count').textContent = list.length === _users.length ? plural(_users.length) : list.length + ' sur ' + plural(_users.length);

  const el = $('accounts-list');
  el.classList.toggle('grouped', f.group);
  if (!_users.length) { el.innerHTML = '<div class="cp-empty">Aucun compte.</div>'; return; }
  if (!list.length) {
    el.innerHTML = '<div class="cp-empty">Aucun compte ne correspond. <button onclick="resetFilters()">Effacer les filtres</button></div>';
    return;
  }
  if (!f.group) { el.innerHTML = headHtml() + list.map(rowHtml).join(''); return; }

  el.innerHTML = headHtml() + sortedRoles().map(r => {
    const rows = list.filter(u => u.role === r.slug);
    if (!rows.length) return '';
    return '<div class="cp-grp"><i class="fchip-dot" style="background:' + roleColor(r.slug) + '"></i>'
      + '<span class="cp-grp-name">' + esc(r.label) + '</span><span class="cp-grp-n">' + rows.length + '</span>'
      + '<button class="cp-icon" data-act="editrole" data-slug="' + esc(r.slug) + '" title="Modifier le rôle" aria-label="Modifier le rôle ' + esc(r.label) + '">' + ICON_COG + '</button></div>'
      + rows.map(rowHtml).join('');
  }).join('');
}

// Clics délégués : filtres, tri, actions d'une ligne
document.addEventListener('click', function (e) {
  const chip = e.target.closest('[data-chip]');
  if (chip) { onChipClick(chip.dataset.chip); return; }
  const sort = e.target.closest('[data-sort]');
  if (sort) { setSort(sort.dataset.sort); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  if (btn.dataset.act === 'editrole') { openRoleEdit(btn.dataset.slug); return; }
  const row = btn.closest('[data-id]');
  const u = row && _users.find(u => String(u.id) === row.dataset.id);
  if (!u) return;
  if (btn.dataset.act === 'edit') editAccount(u.id, u.email, u.role);
  else if (btn.dataset.act === 'delete') deleteAccount(u.id, u.email);
});

// ── Rôles & accès : matrice ──────────────────────────
function flatPanels() {
  const out = [];
  PANELS.forEach(p => { out.push({ p, parent: null }); p.children.forEach(c => out.push({ p: c, parent: p })); });
  return out;
}

function ensureDraft() {
  const slugs = _allRoles.map(r => r.slug);
  Object.keys(_draft).forEach(s => { if (slugs.indexOf(s) < 0) delete _draft[s]; });
  _allRoles.forEach(r => { if (!_draft[r.slug]) _draft[r.slug] = (r.panels || []).slice(); });
}

const sameSet = (a, b) => a.length === b.length && a.every(x => b.indexOf(x) >= 0);
function changedRoles() { return _allRoles.filter(r => r.slug !== 'admin' && !sameSet(_draft[r.slug] || [], r.panels || [])); }

function renderRoles() {
  const cols = flatPanels();
  const head1 = '<tr><th rowspan="2" class="col-role">Rôle</th>'
    + PANELS.map(p => '<th colspan="' + (1 + p.children.length) + '" class="grp first">' + esc(p.label) + '</th>').join('') + '</tr>';
  const head2 = '<tr>' + cols.map(c => '<th class="sub' + (c.parent ? '' : ' first') + '">' + (c.parent ? esc(c.p.short) : 'Espace') + '</th>').join('') + '</tr>';

  const body = sortedRoles().map(role => {
    const isAdmin = role.slug === 'admin', n = usersOf(role.slug).length, c = roleColor(role.slug);
    const first = '<td class="col-role"><span class="perm-role"><i class="fchip-dot" style="background:' + c + '"></i>' + esc(role.label)
      + ' <small>' + n + ' compte' + (n > 1 ? 's' : '') + '</small>'
      + '<button class="cp-icon" data-act="editrole" data-slug="' + esc(role.slug) + '" title="Modifier le rôle" aria-label="Modifier le rôle ' + esc(role.label) + '">' + ICON_COG + '</button></span></td>';
    if (isAdmin) return '<tr data-slug="admin">' + first + '<td class="perm-all" colspan="' + cols.length + '">Accès total à toute l\'application (non modifiable)</td></tr>';
    const mine = _draft[role.slug] || [];
    return '<tr data-slug="' + esc(role.slug) + '">' + first + cols.map(col => {
      const checked = mine.indexOf(col.p.id) >= 0;
      const disabled = col.parent && mine.indexOf(col.parent.id) < 0;
      return '<td' + (col.parent ? '' : ' class="first"') + '><input type="checkbox" class="perm-cb" data-slug="' + esc(role.slug) + '" data-panel="' + col.p.id + '"'
        + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' aria-label="' + esc(role.label + ' : ' + col.p.label) + '"></td>';
    }).join('') + '</tr>';
  }).join('');

  $('perm-table').innerHTML = '<thead>' + head1 + head2 + '</thead><tbody>' + body + '</tbody>';
  updateDirty();
}

document.addEventListener('change', function (e) {
  const cb = e.target.closest && e.target.closest('.perm-cb');
  if (!cb) return;
  const slug = cb.dataset.slug, id = cb.dataset.panel;
  let mine = (_draft[slug] || []).filter(x => x !== id);
  if (cb.checked) mine.push(id);
  else {                                     // décocher un espace retire aussi ses pages
    const parent = PANELS.find(p => p.id === id);
    if (parent) mine = mine.filter(x => !parent.children.some(c => c.id === x));
  }
  _draft[slug] = mine;
  renderRoles();
  const again = document.querySelector('.perm-cb[data-slug="' + slug + '"][data-panel="' + id + '"]');
  if (again) again.focus();               // le tableau est redessiné : on garde le focus clavier
});

function updateDirty() {
  const n = changedRoles().length;
  $('perm-save').disabled = n === 0;
  $('perm-reset').style.display = n ? '' : 'none';
  const msg = $('perm-msg');
  if (n) { msg.textContent = n + ' rôle' + (n > 1 ? 's' : '') + ' modifié' + (n > 1 ? 's' : '') + ', non enregistré' + (n > 1 ? 's' : ''); msg.className = 'perm-msg dirty'; }
  else if (msg.className.indexOf('dirty') >= 0) { msg.textContent = ''; msg.className = 'perm-msg'; }
}

function resetPermissions() { _draft = {}; ensureDraft(); renderRoles(); }

async function savePermissions() {
  const btn = $('perm-save'), msg = $('perm-msg');
  const todo = changedRoles();
  if (!todo.length) return;
  btn.disabled = true;
  try {
    await Promise.all(todo.map(r => SB.upsertRole(r.slug, r.label, _draft[r.slug] || [], r.color || null)));
    AUTH.clearRolesCache();
    todo.forEach(r => { r.panels = (_draft[r.slug] || []).slice(); });
    renderRoles();
    msg.textContent = 'Accès enregistrés'; msg.className = 'perm-msg ok';
    setTimeout(() => { if (msg.className.indexOf('ok') >= 0) { msg.textContent = ''; msg.className = 'perm-msg'; } }, 2500);
  } catch (e) {
    msg.textContent = 'Erreur : ' + e.message; msg.className = 'perm-msg err';
    btn.disabled = false;
  }
}

// ── Modal Nouveau rôle ───────────────────────────────
function swatches(selectedHex, handler) {
  return ROLE_COLORS.map(c =>
    '<span class="color-swatch' + (c.hex === selectedHex ? ' selected' : '') + '" style="background:' + c.hex + '" data-color="' + c.hex + '" onclick="' + handler + '(this)" title="' + c.label + '"></span>'
  ).join('');
}
function pickSwatch(el, containerId) {
  document.querySelectorAll('#' + containerId + ' .color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

function openNewRoleModal() {
  $('new-role-name').value = '';
  $('new-role-slug-display').innerHTML = '';
  $('new-role-err').textContent = '';
  $('new-role-colors').innerHTML = swatches('#0075A9', 'selectNewRoleColor');
  $('modal-new-role').classList.add('open');
  setTimeout(() => $('new-role-name').focus(), 50);
}
function closeNewRoleModal() { $('modal-new-role').classList.remove('open'); }
function selectNewRoleColor(el) { pickSwatch(el, 'new-role-colors'); }
function onNewRoleNameInput(val) {
  const slug = slugify(val);
  $('new-role-slug-display').innerHTML = slug ? 'identifiant : <b>' + slug + '</b>' : '';
}

async function createRole() {
  const label = $('new-role-name').value.trim(), err = $('new-role-err');
  err.textContent = '';
  if (!label) return;
  const slug = slugify(label);
  if (!slug) { err.textContent = 'Nom invalide.'; return; }
  if (_allRoles.find(r => r.slug === slug)) { err.textContent = 'Ce rôle existe déjà.'; return; }
  const sel = document.querySelector('#new-role-colors .color-swatch.selected');
  const color = sel ? sel.dataset.color : '#5294d2';
  try {
    await SB.upsertRole(slug, label, [], color);
    AUTH.clearRolesCache();
    _allRoles.push({ slug, label, panels: [], color });
    ensureDraft();
    closeNewRoleModal();
    renderAll();
    showTab('roles');                    // l'étape suivante : lui donner ses accès
    showOk('Rôle « ' + label + ' » créé. Cochez ses accès puis enregistrez.');
  } catch (e) { err.textContent = 'Erreur : ' + e.message; }
}

// ── Modal Édition rôle (nom, couleur, suppression) ───
function openRoleEdit(slug) {
  const role = _allRoles.find(r => r.slug === slug);
  if (!role) return;
  _editRoleSlug = slug;
  const isAdmin = slug === 'admin';
  $('role-edit-title').textContent = role.label;
  const inp = $('role-edit-label');
  inp.value = role.label; inp.disabled = isAdmin;
  $('role-edit-colors').innerHTML = swatches(roleColor(slug), 'selectRoleColor');
  $('role-edit-delete').style.display = isAdmin ? 'none' : '';
  $('role-edit-msg').textContent = '';
  $('modal-role').classList.add('open');
  if (!isAdmin) setTimeout(() => inp.focus(), 50);
}
function closeRoleEdit() { $('modal-role').classList.remove('open'); _editRoleSlug = null; }
function selectRoleColor(el) { pickSwatch(el, 'role-edit-colors'); }

async function saveRoleEdit() {
  const slug = _editRoleSlug, role = _allRoles.find(r => r.slug === slug);
  if (!role) return;
  const label = $('role-edit-label').value.trim();
  if (!label) return;
  const sel = document.querySelector('#role-edit-colors .color-swatch.selected');
  const color = sel ? sel.dataset.color : (role.color || null);
  try {
    await SB.upsertRole(slug, label, role.panels || [], color);     // les accès enregistrés, pas ceux en cours d'édition dans la matrice
    AUTH.clearRolesCache();
    Object.assign(role, { label, color });
    closeRoleEdit();
    renderAll();
  } catch (e) {
    const msg = $('role-edit-msg');
    msg.textContent = 'Erreur : ' + e.message; msg.style.color = '#e07a68';
  }
}

async function deleteRoleFromEdit() {
  const slug = _editRoleSlug, role = _allRoles.find(r => r.slug === slug);
  if (!role) return;
  const msg = $('role-edit-msg');
  const n = usersOf(slug).length;
  if (n) {                                // un rôle supprimé laisserait ces comptes sans accès
    msg.textContent = n + ' compte' + (n > 1 ? 's ont' : ' a') + ' encore ce rôle : changez d\'abord leur rôle.'; msg.style.color = '#e07a68';
    return;
  }
  if (!confirm('Supprimer le rôle « ' + role.label + ' » ?')) return;
  try {
    await SB.deleteRole(slug);
    AUTH.clearRolesCache();
    _allRoles = _allRoles.filter(r => r.slug !== slug);
    ensureDraft();
    closeRoleEdit();
    renderAll();
  } catch (e) { msg.textContent = 'Erreur : ' + e.message; msg.style.color = '#e07a68'; }
}

// ── Modal Compte ─────────────────────────────────────
function populateRoleSelect(current) {
  const sel = $('inp-role'), keep = current || sel.value;
  sel.innerHTML = sortedRoles().map(r => '<option value="' + esc(r.slug) + '">' + esc(r.label) + '</option>').join('');
  if (keep) sel.value = keep;
}

function openForm() {
  _editId = null;
  $('form-sec').textContent = 'Nouveau compte';
  $('inp-email').value = ''; $('inp-password').value = '';
  $('inp-email').disabled = false;
  $('pwd-hint').style.display = 'none';
  $('btn-save').textContent = 'Créer le compte →';
  populateRoleSelect(f.role || 'floor');           // le filtre de rôle en cours sert de valeur par défaut
  $('modal-form').classList.add('open');
  setTimeout(() => $('inp-email').focus(), 50);
}

function editAccount(id, email, role) {
  _editId = id;
  $('form-sec').textContent = 'Modifier le compte';
  $('inp-email').value = email; $('inp-password').value = '';
  $('inp-email').disabled = true;
  $('pwd-hint').style.display = '';
  $('btn-save').textContent = 'Enregistrer →';
  populateRoleSelect(role);
  $('modal-form').classList.add('open');
  setTimeout(() => $('inp-role').focus(), 50);
}

function closeForm() { $('modal-form').classList.remove('open'); _editId = null; }

async function saveForm() {
  const email = $('inp-email').value.trim(), password = $('inp-password').value, role = $('inp-role').value, btn = $('btn-save');
  if (!_editId && !email)              { showErr("L'e-mail est requis."); return; }
  if (!_editId && password.length < 8) { showErr('Mot de passe trop court (8 car. min).'); return; }
  if (_editId && password && password.length < 8) { showErr('Mot de passe trop court (8 car. min).'); return; }
  btn.disabled = true;
  try {
    if (!_editId) { await SB.createUser(email, password, role); closeForm(); showOk('Compte créé.'); }
    else { await SB.updateUser(_editId, Object.assign({ role }, password ? { password } : {})); closeForm(); showOk('Compte mis à jour.'); }
    await loadAndRender();
  } catch (e) { showErr('Erreur : ' + e.message); }
  finally { btn.disabled = false; }
}

// ── Suppression d'un compte ──────────────────────────
async function deleteAccount(id, email) {
  // Les sessions et résultats de training sont liés au compte (ON DELETE CASCADE) : ils partent avec lui
  if (!confirm('Supprimer « ' + email + ' » ?\n\nSon historique d\'entraînement (sessions et résultats) sera aussi effacé définitivement, et il disparaîtra des classements du Suivi équipe.\n\nCette action est irréversible.')) return;
  try {
    await SB.deleteUser(id);
    showOk('Compte et historique d\'entraînement supprimés.');
    await loadAndRender();
  } catch (e) { showErr('Erreur : ' + e.message); }
}

// ── Alertes ──────────────────────────────────────────
let _alertTimer = null;
function showOk(msg)  { const el = $('alert-ok');  $('alert-err').style.display = 'none'; el.textContent = msg; el.style.display = 'flex'; clearTimeout(_alertTimer); _alertTimer = setTimeout(() => { el.style.display = 'none'; }, 6000); }
function showErr(msg) { const el = $('alert-err'); $('alert-ok').style.display = 'none'; el.textContent = msg; el.style.display = 'flex'; }

// ── Démarrage ────────────────────────────────────────
try { f.group = localStorage.getItem('cp_group') === '1'; } catch (e) {}
window.addEventListener('hashchange', () => showTab(tabFromHash(), true));
showTab(tabFromHash(), true);
loadAndRender();
