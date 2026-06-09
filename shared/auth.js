// ══════════════════════════════════════════════════════
//  AUTH — garde d'accès + badge utilisateur
//  Doit être chargé APRÈS supabase.js
// ══════════════════════════════════════════════════════

const AUTH_DOMAIN = 'groupebarriere.com';   // seul domaine autorisé

const AUTH = {

  /**
   * À appeler sur chaque page protégée.
   * @param {object} opts
   *   loginUrl    {string} — chemin relatif vers login.html depuis cette page
   *   role        {string|null} — 'admin' = admin seulement, null = tout utilisateur connecté
   */
  async guard({ loginUrl = 'login.html', role = null } = {}) {
    // Overlay immédiat pour éviter le flash de contenu
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    document.body.appendChild(overlay);

    const session = await SB.getSession();

    if (!session) {
      window.location.replace(loginUrl);
      return null;
    }

    // Vérification du domaine @groupebarriere.com
    if (!session.user.email.endsWith('@' + AUTH_DOMAIN)) {
      await SB.signOut();
      window.location.replace(loginUrl + '?err=domain');
      return null;
    }

    const userRole = session.user.user_metadata?.role || 'floor';

    // Floor qui tente d'accéder à une page admin → prize pool
    if (role === 'admin' && userRole !== 'admin') {
      const depth = (loginUrl.match(/\.\.\//g) || []).length;
      const root  = depth > 0 ? '../'.repeat(depth) : './';
      window.location.replace(root + 'prize-pool/prize-pool.html');
      return null;
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
    const roleLabel = role === 'admin' ? 'Admin' : 'Floor';
    const roleClass = role === 'admin' ? 'auth-chip-admin' : 'auth-chip-floor';
    badge.innerHTML = `
      <span class="auth-email">${short}</span>
      <span class="auth-chip ${roleClass}">${roleLabel}</span>
      <button class="auth-logout" onclick="AUTH.signOut('${loginUrl}')">Déconnexion</button>`;
    document.body.appendChild(badge);
  }
};
