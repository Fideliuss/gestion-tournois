// ══════════════════════════════════════════════════════
//  AUTH — garde d'accès + badge utilisateur
//  Doit être chargé APRÈS supabase.js
// ══════════════════════════════════════════════════════

let _rolePanelsCache = null;

async function _loadRolePanels() {
  if (_rolePanelsCache) return _rolePanelsCache;
  try {
    const roles = await SB.getRoles();
    _rolePanelsCache = {};
    roles.forEach(r => { _rolePanelsCache[r.slug] = r.panels || []; });
  } catch {
    _rolePanelsCache = {};
  }
  return _rolePanelsCache;
}

const AUTH = {

  /**
   * À appeler sur chaque page protégée.
   * @param {object} opts
   *   loginUrl    {string}              — chemin relatif vers login.html depuis cette page
   *   role        {string|string[]|null} — 'admin', ['admin','mcd'], ou null = tout connecté
   *   panel       {string|string[]|null} — panel(s) requis ; les admins passent toujours
   */
  async guard({ loginUrl = 'login.html', role = null, panel = null } = {}) {
    // Overlay immédiat pour éviter le flash de contenu
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    document.body.appendChild(overlay);

    const session = await SB.getSession();

    if (!session) {
      window.location.replace(loginUrl);
      return null;
    }

    const userRole = session.user.user_metadata?.role || 'floor';
    const isAdmin  = userRole === 'admin';

    const depth = (loginUrl.match(/\.\.\//g) || []).length;
    const root  = depth > 0 ? '../'.repeat(depth) : './';

    // Vérification du rôle (string ou tableau)
    if (role !== null) {
      const allowed = Array.isArray(role) ? role : [role];
      if (!allowed.includes(userRole)) {
        window.location.replace(root + 'index.html');
        return null;
      }
    }

    // Vérification du panel via la table app_roles — les admins passent toujours
    if (panel !== null && !isAdmin) {
      const rolePanels = await _loadRolePanels();
      const allowed    = rolePanels[userRole] || [];
      const required   = Array.isArray(panel) ? panel : [panel];
      if (!required.some(p => allowed.includes(p))) {
        window.location.replace(root + 'index.html');
        return null;
      }
    }

    // Auth OK
    overlay.remove();
    AUTH._addBadge(loginUrl, session.user.email, userRole);
    return session.user;
  },

  async signOut(loginUrl = 'login.html') {
    await SB.signOut();
    window.location.replace(loginUrl);
  },

  _addBadge(loginUrl, email, role) {
    const badge = document.createElement('div');
    badge.id = 'auth-badge';
    const short     = email.split('@')[0];
    const roleLabel = role === 'admin' ? 'Admin' : (role === 'mcd' ? 'MCD' : 'Floor');
    const roleClass = role === 'admin' ? 'auth-chip-admin' : (role === 'mcd' ? 'auth-chip-mcd' : 'auth-chip-floor');
    badge.innerHTML = `
      <span class="auth-email">${short}</span>
      <span class="auth-chip ${roleClass}">${roleLabel}</span>
      <button class="auth-pwd-btn" onclick="AUTH._openChangePwd()" title="Changer le mot de passe">🔑</button>
      <button class="auth-logout" onclick="AUTH.signOut('${loginUrl}')">Déconnexion</button>`;
    document.body.appendChild(badge);
  },

  // ── Modal changement de mot de passe ──────────────────

  _openChangePwd() {
    if (document.getElementById('auth-pwd-overlay')) return; // déjà ouvert

    const overlay = document.createElement('div');
    overlay.id = 'auth-pwd-overlay';
    overlay.innerHTML = `
      <div id="auth-pwd-modal" role="dialog" aria-modal="true" aria-labelledby="auth-pwd-title">
        <div class="auth-pwd-title" id="auth-pwd-title">Changer le mot de passe</div>

        <label class="auth-pwd-label" for="auth-pwd-new">Nouveau mot de passe</label>
        <input type="password" id="auth-pwd-new" class="auth-pwd-input"
          placeholder="••••••••" autocomplete="new-password"
          onkeydown="if(event.key==='Enter') document.getElementById('auth-pwd-confirm').focus()" />

        <label class="auth-pwd-label" for="auth-pwd-confirm">Confirmer le mot de passe</label>
        <input type="password" id="auth-pwd-confirm" class="auth-pwd-input"
          placeholder="••••••••" autocomplete="new-password"
          onkeydown="if(event.key==='Enter') AUTH._saveNewPwd()" />

        <div class="auth-pwd-actions">
          <button class="auth-pwd-save" id="auth-pwd-save-btn" onclick="AUTH._saveNewPwd()">
            Enregistrer →
          </button>
          <button class="auth-pwd-cancel" onclick="AUTH._closeChangePwd()">Annuler</button>
        </div>
        <div class="auth-pwd-msg" id="auth-pwd-msg"></div>
      </div>`;

    // Fermer en cliquant l'overlay (hors modal)
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) AUTH._closeChangePwd();
    });
    // Fermer avec Escape
    overlay._keyHandler = function(e) { if (e.key === 'Escape') AUTH._closeChangePwd(); };
    document.addEventListener('keydown', overlay._keyHandler);

    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('auth-pwd-new').focus(), 50);
  },

  _closeChangePwd() {
    const overlay = document.getElementById('auth-pwd-overlay');
    if (!overlay) return;
    document.removeEventListener('keydown', overlay._keyHandler);
    overlay.remove();
  },

  clearRolesCache() {
    _rolePanelsCache = null;
  },

  async _saveNewPwd() {
    const pwd     = (document.getElementById('auth-pwd-new').value     || '').trim();
    const confirm = (document.getElementById('auth-pwd-confirm').value || '').trim();
    const msg     = document.getElementById('auth-pwd-msg');
    const btn     = document.getElementById('auth-pwd-save-btn');

    msg.textContent = ''; msg.className = 'auth-pwd-msg';

    if (pwd.length < 8) {
      msg.textContent = 'Le mot de passe doit faire au moins 8 caractères.';
      msg.className = 'auth-pwd-msg err'; return;
    }
    if (pwd !== confirm) {
      msg.textContent = 'Les deux mots de passe ne correspondent pas.';
      msg.className = 'auth-pwd-msg err'; return;
    }

    btn.disabled = true; btn.textContent = 'Enregistrement…';
    try {
      await SB.updatePassword(pwd);
      msg.textContent = 'Mot de passe mis à jour ✓';
      msg.className = 'auth-pwd-msg ok';
      setTimeout(() => AUTH._closeChangePwd(), 1200);
    } catch(ex) {
      msg.textContent = 'Erreur : ' + (ex.message || 'Réessaie dans quelques instants.');
      msg.className = 'auth-pwd-msg err';
      btn.disabled = false; btn.textContent = 'Enregistrer →';
    }
  }
};
