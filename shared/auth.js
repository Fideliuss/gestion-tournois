// ══════════════════════════════════════════════════════
//  AUTH - garde d'accès + badge utilisateur
//  Doit être chargé APRÈS supabase.js
// ══════════════════════════════════════════════════════

let _rolePanelsCache = null;
// Dossier de ce script : nav.js et nav.css s'y trouvent
const _AUTH_BASE = document.currentScript ? document.currentScript.src.replace(/auth\.js[^/]*$/, '') : '';

// Charge la barre de navigation (nav.css + nav.js) une seule fois ; résout false si le chargement échoue
function _loadNav() {
  if (typeof NAV !== 'undefined') return Promise.resolve(true);
  return new Promise(function (resolve) {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = _AUTH_BASE + 'nav.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = _AUTH_BASE + 'nav.js';
    js.onload = function () { resolve(typeof NAV !== 'undefined'); };
    js.onerror = function () { resolve(false); };
    document.head.appendChild(js);
  });
}

// Charge un script du dossier shared/ à la demande ; résout false si le chargement échoue
function _loadScript(fichier) {
  return new Promise(function (resolve) {
    const js = document.createElement('script');
    js.src = _AUTH_BASE + fichier;
    js.onload = function () { resolve(true); };
    js.onerror = function () { resolve(false); };
    document.head.appendChild(js);
  });
}

async function _loadRolePanels() {
  if (_rolePanelsCache) return _rolePanelsCache;
  try {
    const roles = await SB.getRoles();
    _rolePanelsCache = {};
    roles.forEach(r => {
      _rolePanelsCache[r.slug] = { panels: r.panels || [], color: r.color || null };
    });
  } catch {
    _rolePanelsCache = {};
  }
  return _rolePanelsCache;
}

const AUTH = {

  /**
   * À appeler sur chaque page protégée.
   * @param {object} opts
   *   loginUrl    {string}              - chemin relatif vers login.html depuis cette page
   *   role        {string|string[]|null} - 'admin', ['admin','mcd'], ou null = tout connecté
   *   panel       {string|string[]|null} - panel(s) requis ; les admins passent toujours
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

    const userRole = AUTH.roleOf(session.user);
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

    // Chargement des rôles (panels + couleurs) - pour tous, badge inclus
    await _loadRolePanels();

    // Vérification du panel via la table app_roles - les admins passent toujours
    if (panel !== null && !isAdmin) {
      const entry   = (_rolePanelsCache[userRole] || {});
      const allowed = entry.panels || [];
      const required = Array.isArray(panel) ? panel : [panel];
      if (!required.some(p => allowed.includes(p))) {
        window.location.replace(root + 'index.html');
        return null;
      }
    }

    // Auth OK
    // La barre est montée avant de retirer l'overlay : une redirection d'entrée (un seul espace accessible)
    // ne laisse alors voir aucune page intermédiaire
    let navOk = false;
    try {
      const cached = _rolePanelsCache[userRole] || {};
      navOk = (await _loadNav()) && NAV.mount({
        root, loginUrl, email: session.user.email, name: AUTH.fullName(session.user), role: userRole, isAdmin,
        panels: cached.panels || [], color: cached.color || null,
      });
    } catch (e) { navOk = false; }
    overlay.remove();
    if (!navOk) AUTH._navFallback(root, loginUrl);
    // Déconnexion automatique après inactivité (30 min admin et mcd, 2 h les autres) : chargée sans retarder la page
    _loadScript('inactivite.js').then(function (ok) {
      if (ok) INACTIVITE.demarrer({ role: userRole, onExpire: function () { AUTH.signOut(loginUrl + '?expire=1'); } });
    });
    return session.user;
  },

  /**
   * Rôle de l'utilisateur. Lu dans `app_metadata` (posé par la fonction serveur manage-users, non modifiable par l'utilisateur),
   * comme le font la RLS et la fonction serveur. JAMAIS dans `user_metadata`, que chacun peut modifier lui-même.
   * Sans rôle : 'floor', le rôle le moins privilégié des rôles de base.
   */
  roleOf(user) {
    return (user && user.app_metadata && user.app_metadata.role) || 'floor';
  },

  /**
   * Prénom à afficher. Métadonnée `first_name` / `prenom` si elle existe, sinon le début de l'e-mail (prenom.nom@…).
   * Vide si on ne peut pas le déduire (identifiant sans point, ou simple initiale comme « b.nom »).
   */
  firstName(user) {
    const meta  = (user && user.user_metadata) || {};
    const local = ((user && user.email) || '').split('@')[0];
    const raw   = (meta.first_name || meta.prenom || (local.indexOf('.') > 0 ? local.split('.')[0] : '') || '').trim();
    if (raw.replace(/[^a-zà-ÿ]/gi, '').length < 2) return '';
    return raw.split(/([-' ])/).map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); }).join('');
  },

  /** « Prénom Nom » si les deux sont renseignés (métadonnées), sinon vide */
  fullName(user) {
    const meta = (user && user.user_metadata) || {};
    return [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();
  },

  /** « Bonjour » le jour, « Bonsoir » de 18 h à 4 h */
  salutation() {
    const h = new Date().getHours();
    return h >= 18 || h < 4 ? 'Bonsoir' : 'Bonjour';
  },

  async signOut(loginUrl = 'login.html') {
    // Même si le serveur ne répond pas (réseau coupé), on efface ce qui est local et on quitte la page
    try { await SB.signOut(); } catch (e) { /* session locale quand même fermée par supabase-js */ }
    if (typeof INACTIVITE === 'undefined') await _loadScript('inactivite.js');
    if (typeof INACTIVITE !== 'undefined') INACTIVITE.nettoyer(window.sessionStorage, window.localStorage);
    else { try { window.sessionStorage.clear(); } catch (e) { /* stockage indisponible */ } }
    window.location.replace(loginUrl);
  },

  /** Barre de navigation indisponible (fichiers non chargés) : bandeau minimal pour ne pas rester bloqué */
  _navFallback(root, loginUrl) {
    const bar = document.createElement('div');
    bar.id = 'auth-fallback';
    bar.innerHTML = 'Navigation indisponible'
      + '<a href="' + root + 'index.html">Accueil</a>'
      + '<a href="#" onclick="location.reload(); return false">Recharger</a>'
      + '<a href="#" onclick="AUTH.signOut(\'' + loginUrl + '\'); return false">Déconnexion</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  },

  // ── Modal changement de mot de passe ──────────────────

  async _openChangePwd() {
    if (document.getElementById('auth-pwd-overlay')) return; // déjà ouvert
    // Règles et messages de mot de passe : chargés à la demande (shared/mot_de_passe.js)
    if (typeof MOT_DE_PASSE === 'undefined' && !(await _loadScript('mot_de_passe.js'))) {
      alert('Le formulaire n\'a pas pu se charger. Rechargez la page et réessayez.');
      return;
    }
    if (document.getElementById('auth-pwd-overlay')) return; // ouvert entre-temps (double clic)

    const overlay = document.createElement('div');
    overlay.id = 'auth-pwd-overlay';
    overlay.innerHTML = `
      <div id="auth-pwd-modal" role="dialog" aria-modal="true" aria-labelledby="auth-pwd-title">
        <div class="auth-pwd-title" id="auth-pwd-title">Changer le mot de passe</div>

        <label class="auth-pwd-label" for="auth-pwd-current">Mot de passe actuel</label>
        <input type="password" id="auth-pwd-current" class="auth-pwd-input"
          placeholder="••••••••" autocomplete="current-password"
          onkeydown="if(event.key==='Enter') document.getElementById('auth-pwd-new').focus()" />

        <label class="auth-pwd-label" for="auth-pwd-new">Nouveau mot de passe</label>
        <input type="password" id="auth-pwd-new" class="auth-pwd-input"
          placeholder="••••••••" autocomplete="new-password"
          oninput="AUTH._majRegles()"
          onkeydown="if(event.key==='Enter') document.getElementById('auth-pwd-confirm').focus()" />
        <ul class="pwd-rules" id="auth-pwd-rules" aria-live="polite"></ul>

        <label class="auth-pwd-label" for="auth-pwd-confirm">Confirmer le mot de passe</label>
        <input type="password" id="auth-pwd-confirm" class="auth-pwd-input"
          placeholder="••••••••" autocomplete="new-password"
          onkeydown="if(event.key==='Enter') AUTH._saveNewPwd()" />

        <div class="auth-pwd-actions">
          <button class="btn btn-gold" id="auth-pwd-save-btn" onclick="AUTH._saveNewPwd()">
            Enregistrer →
          </button>
          <button class="btn btn-ghost" onclick="AUTH._closeChangePwd()">Annuler</button>
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
    AUTH._majRegles();
    setTimeout(() => document.getElementById('auth-pwd-current').focus(), 50);
  },

  /** Coche, pendant la saisie, les règles que le nouveau mot de passe respecte déjà */
  _majRegles() {
    const ul = document.getElementById('auth-pwd-rules'), champ = document.getElementById('auth-pwd-new');
    if (!ul || !champ) return;
    ul.innerHTML = MOT_DE_PASSE.liste(champ.value).map(function (r) {
      return '<li class="' + (r.ok ? 'ok' : '') + '">' + r.texte + '</li>';   // textes constants du module, aucune donnée saisie
    }).join('');
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
    // Pas de trim() : un mot de passe est pris tel quel, sinon celui qu'on enregistre n'est plus celui qu'on a tapé
    const actuel  = document.getElementById('auth-pwd-current').value || '';
    const pwd     = document.getElementById('auth-pwd-new').value     || '';
    const confirm = document.getElementById('auth-pwd-confirm').value || '';
    const msg     = document.getElementById('auth-pwd-msg');
    const btn     = document.getElementById('auth-pwd-save-btn');
    const echec   = function (texte) { msg.textContent = texte; msg.className = 'auth-pwd-msg err'; };

    msg.textContent = ''; msg.className = 'auth-pwd-msg';

    if (!actuel) return echec('Saisissez votre mot de passe actuel.');
    const regle = MOT_DE_PASSE.erreur(pwd);
    if (regle) return echec(regle);
    if (pwd === actuel) return echec('Le nouveau mot de passe doit être différent de l\'actuel.');
    if (pwd !== confirm) return echec('Les deux mots de passe ne correspondent pas.');

    btn.disabled = true; btn.textContent = 'Enregistrement…';
    try {
      await SB.updatePassword(pwd, actuel);
      msg.textContent = 'Mot de passe mis à jour ✓';
      msg.className = 'auth-pwd-msg ok';
      setTimeout(() => AUTH._closeChangePwd(), 1200);
    } catch(ex) {
      echec(MOT_DE_PASSE.messageErreur(ex));
      btn.disabled = false; btn.textContent = 'Enregistrer →';
    }
  }
};
