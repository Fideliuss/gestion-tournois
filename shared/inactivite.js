// ══════════════════════════════════════════════════════
//  INACTIVITÉ : déconnexion automatique d'un poste laissé ouvert (audit S-10, S-09)
//  Supabase (plan gratuit) ne limite pas la durée d'une session : sans cela, un navigateur laissé connecté sur un poste partagé
//  le reste des semaines. Ce garde-fou est côté navigateur : il protège le poste oublié, pas un attaquant qui aurait déjà le jeton.
//
//  - Délai selon le rôle : 30 min pour admin et mcd (accès aux données personnelles), 2 h pour les autres.
//  - Une minute avant, un avertissement propose de rester connecté ; sans réponse, déconnexion et retour à la page de connexion.
//  - La dernière activité est partagée entre les onglets (localStorage, clé pm_activite : un horodatage, aucune donnée) :
//    l'activité dans un onglet maintient les autres. À l'ouverture d'une page, une session restée inactive plus longtemps que le
//    délai est fermée (ordinateur éteint, onglet resté ouvert pendant la nuit).
//  - Charger à la demande par AUTH.guard (shared/auth.js). Les fonctions pures sont testées sous Node : voir inactivite.test.js.
// ══════════════════════════════════════════════════════

const INACTIVITE = (function () {
  const MINUTE = 60000;
  const DELAIS_MIN = { admin: 30, mcd: 30 };
  const DELAI_DEFAUT_MIN = 120;
  const PREAVIS_MS = 60000;        // avertissement pendant la dernière minute
  const CLE = 'pm_activite';
  const THROTTLE_MS = 5000;        // une écriture de l'horodatage toutes les 5 s au plus
  const EVENEMENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];

  // ── Règles pures ──
  function delaiPour(role) { return (DELAIS_MIN[role] || DELAI_DEFAUT_MIN) * MINUTE; }
  function reste(derniere, maintenant, delai) { return derniere + delai - maintenant; }
  function etat(restant) { return restant <= 0 ? 'expire' : restant <= PREAVIS_MS ? 'avertir' : 'actif'; }

  // Efface ce qui ne doit pas survivre à une session : mémoire de l'onglet et horodatage d'activité.
  // (La configuration enregistrée dans localStorage, propre au poste, n'est pas touchée ici : voir CONTEXT.md.)
  function nettoyer(session, local) {
    try { if (session) session.clear(); } catch (e) { /* stockage indisponible : rien à effacer */ }
    try { if (local) local.removeItem(CLE); } catch (e) { /* idem */ }
  }

  // ── Horodatage partagé ──
  let memoire = null;              // repli si localStorage est indisponible (navigation privée)
  function lire() {
    try { const v = Number(localStorage.getItem(CLE)); if (v > 0) return v; } catch (e) { /* repli mémoire */ }
    return memoire;
  }
  function noter(t) {
    memoire = t;
    try { localStorage.setItem(CLE, String(t)); } catch (e) { /* repli mémoire */ }
  }

  // ── Avertissement ──
  let boite = null;
  function afficher(secondes, rester, partir) {
    if (!boite) {
      boite = document.createElement('div');
      boite.id = 'inactivite-avert';
      boite.className = 'modal-overlay open';
      boite.setAttribute('role', 'alertdialog');
      boite.setAttribute('aria-modal', 'true');
      boite.setAttribute('aria-labelledby', 'inactivite-titre');
      const carte = document.createElement('div'); carte.className = 'modal-box';
      const titre = document.createElement('div'); titre.className = 'sec'; titre.id = 'inactivite-titre'; titre.textContent = 'Toujours là ?';
      const texte = document.createElement('p'); texte.id = 'inactivite-texte'; texte.style.margin = '0 0 20px';
      const actions = document.createElement('div'); actions.className = 'form-actions';
      const bRester = document.createElement('button'); bRester.className = 'btn btn-gold'; bRester.id = 'inactivite-rester'; bRester.textContent = 'Rester connecté';
      const bPartir = document.createElement('button'); bPartir.className = 'btn btn-ghost'; bPartir.textContent = 'Se déconnecter';
      bRester.addEventListener('click', rester);
      bPartir.addEventListener('click', partir);
      actions.append(bRester, bPartir);
      carte.append(titre, texte, actions);
      boite.appendChild(carte);
      document.body.appendChild(boite);
      bRester.focus();
    }
    document.getElementById('inactivite-texte').textContent =
      'Faute d\'activité, vous allez être déconnecté dans ' + secondes + ' seconde' + (secondes > 1 ? 's' : '') + '.';
  }
  function masquer() { if (boite) { boite.remove(); boite = null; } }

  // ── Démarrage ──
  // options : { role, onExpire } ; onExpire() ferme la session et renvoie vers la connexion
  function demarrer(options) {
    const delai = delaiPour(options.role);
    let fini = false, minuteur = null;
    const expirer = function () { if (fini) return; fini = true; clearInterval(minuteur); masquer(); options.onExpire(); };

    const derniere = lire();
    if (derniere && reste(derniere, Date.now(), delai) <= 0) { expirer(); return; }   // restée inactive plus longtemps que le délai
    if (!derniere) noter(Date.now());

    let dernierEcrit = 0;
    const activite = function () {
      if (boite) return;                                        // l'avertissement ne se ferme que par son bouton
      const t = Date.now();
      if (t - dernierEcrit >= THROTTLE_MS) { dernierEcrit = t; noter(t); }
    };
    EVENEMENTS.forEach(function (e) { document.addEventListener(e, activite, { capture: true, passive: true }); });

    const rester = function () { noter(Date.now()); masquer(); };

    const controle = function () {
      if (fini) return;
      const maintenant = Date.now();
      const restant = reste(lire() || maintenant, maintenant, delai);
      const s = etat(restant);
      if (s === 'expire') expirer();
      else if (s === 'avertir') afficher(Math.max(1, Math.ceil(restant / 1000)), rester, expirer);
      else masquer();                                           // activité dans un autre onglet
    };
    minuteur = setInterval(controle, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) controle(); });
  }

  return { demarrer: demarrer, delaiPour: delaiPour, reste: reste, etat: etat, nettoyer: nettoyer, CLE: CLE, PREAVIS_MS: PREAVIS_MS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = INACTIVITE;
