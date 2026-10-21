// ══════════════════════════════════════════════════════
//  MOT DE PASSE - règles, messages et générateur (testés sous Node : voir mot_de_passe.test.js)
//
//  Les règles reproduisent celles du projet Supabase (Authentication > Sign In / Providers > Email) :
//  12 caractères au moins, avec minuscules, majuscules, chiffres et symboles. La fonction serveur manage-users applique les
//  mêmes règles (supabase/functions/manage-users/regles.ts, comparées à celles-ci par handler.test.ts) : si on change un
//  réglage dans Supabase, changer ici ET là.
//  Supabase refuse en plus les mots de passe connus pour avoir fuité (liste HaveIBeenPwned) : seul le serveur peut le savoir,
//  messageErreur() traduit sa réponse.
//
//  Chargé par login.html et admin/comptes.html ; shared/auth.js le charge à la demande (fenêtre de changement de mot de passe).
// ══════════════════════════════════════════════════════

const MOT_DE_PASSE = (function () {
  const MIN = 12, MAX = 72;
  // Les mêmes symboles que Supabase (un espace ou une lettre accentuée n'est pas un symbole)
  const SYMBOLES = '!@#$%^&*()_+-=[]{};\':"\\|<>?,./`~';

  const REGLES = [
    { id: 'longueur',  texte: MIN + ' caractères au moins', ok: function (p) { return p.length >= MIN; } },
    { id: 'minuscule', texte: 'une minuscule',               ok: function (p) { return /[a-z]/.test(p); } },
    { id: 'majuscule', texte: 'une majuscule',               ok: function (p) { return /[A-Z]/.test(p); } },
    { id: 'chiffre',   texte: 'un chiffre',                  ok: function (p) { return /[0-9]/.test(p); } },
    { id: 'symbole',   texte: 'un symbole (! @ # $ % & * ...)', ok: function (p) {
      for (let i = 0; i < p.length; i++) if (SYMBOLES.indexOf(p[i]) >= 0) return true;
      return false;
    } },
  ];

  /** Une ligne par règle : { id, texte, ok } - pour afficher la liste qui se coche pendant la saisie */
  function liste(pwd) {
    const p = String(pwd == null ? '' : pwd);
    return REGLES.map(function (r) { return { id: r.id, texte: r.texte, ok: r.ok(p) }; });
  }

  /** Message d'erreur en français, ou null si le mot de passe respecte les règles */
  function erreur(pwd) {
    const p = String(pwd == null ? '' : pwd);
    if (p.length > MAX) return 'Le mot de passe est trop long (' + MAX + ' caractères au plus).';
    const manque = liste(p).filter(function (r) { return !r.ok; }).map(function (r) { return r.texte; });
    return manque.length ? 'Le mot de passe doit contenir : ' + manque.join(', ') + '.' : null;
  }

  /** Traduit une erreur renvoyée par Supabase Auth (updateUser, signIn...) en message compréhensible */
  function messageErreur(err) {
    if (!err) return 'Une erreur est survenue, réessayez.';
    const code = err.code || '', msg = String(err.message || '');
    const raisons = err.reasons || (err.weak_password && err.weak_password.reasons) || [];
    if (code === 'weak_password' || raisons.length || /weak|easy to guess|known to be|should contain|at least \d+ char/i.test(msg)) {
      if (raisons.indexOf('pwned') >= 0) return 'Ce mot de passe figure dans une liste de mots de passe compromis : choisissez-en un autre.';
      if (raisons.indexOf('length') >= 0 || raisons.indexOf('characters') >= 0) {
        return 'Mot de passe refusé : il faut ' + MIN + ' caractères au moins, avec minuscules, majuscules, chiffres et symboles.';
      }
      return 'Ce mot de passe est trop faible ou trop répandu : choisissez-en un autre.';
    }
    if (code === 'same_password' || /different from the old/i.test(msg)) return 'Le nouveau mot de passe doit être différent de l\'ancien.';
    if (code === 'invalid_credentials' || /current password|invalid login|incorrect/i.test(msg)) return 'Le mot de passe actuel est incorrect.';
    if (code === 'reauthentication_needed' || /reauthenticat/i.test(msg)) {
      return 'Pour des raisons de sécurité, déconnectez-vous puis reconnectez-vous avant de changer le mot de passe.';
    }
    if (code === 'over_request_rate_limit' || err.status === 429 || /rate limit|too many/i.test(msg)) return 'Trop de tentatives : réessayez dans quelques minutes.';
    return 'Erreur : ' + (msg || 'réessayez dans quelques instants.');
  }

  // Entier aléatoire dans [0, n[ sans biais (tirage rejeté au-delà du plus grand multiple de n)
  function entierAleatoire(n) {
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : require('node:crypto').webcrypto;
    const limite = Math.floor(0x100000000 / n) * n, buf = new Uint32Array(1);
    do { c.getRandomValues(buf); } while (buf[0] >= limite);
    return buf[0] % n;
  }

  /** Mot de passe de 16 caractères qui respecte les règles (sans caractères ambigus : 0 O 1 l I) */
  function generer() {
    const jeux = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%&*?-_=+'];
    const tout = jeux.join('');
    const car = jeux.map(function (j) { return j[entierAleatoire(j.length)]; });   // au moins un de chaque sorte
    while (car.length < 16) car.push(tout[entierAleatoire(tout.length)]);
    for (let i = car.length - 1; i > 0; i--) { const j = entierAleatoire(i + 1); const t = car[i]; car[i] = car[j]; car[j] = t; }
    return car.join('');
  }

  return { MIN: MIN, MAX: MAX, SYMBOLES: SYMBOLES, liste: liste, erreur: erreur, messageErreur: messageErreur, generer: generer };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { MOT_DE_PASSE: MOT_DE_PASSE };
