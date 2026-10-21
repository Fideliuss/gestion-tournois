// ══════════════════════════════════════════════════════
//  RÉGLAGES - réglages partagés entre les postes, enregistrés dans la table `parametres` (clé / valeur JSON)
//  (testé sous Node : voir reglages.test.js ; table et droits : supabase/migrations/parametres.sql)
//
//  Avant, ces réglages vivaient dans le navigateur (localStorage) : propres à chaque poste, perdus avec lui, laissés sur les
//  postes partagés. Les pages gardent des lectures SYNCHRONES, qui lisent une copie en mémoire chargée au démarrage :
//
//    await REGLAGES.charger('extras_', ADOPTIONS)      // une fois, avant le premier affichage
//    const cfg = REGLAGES.lire('extras_reglages', { weekdayTime: '20:55' })   // copie : on peut la modifier librement
//    REGLAGES.ecrire('extras_reglages', cfg)           // mémoire tout de suite, base ensuite (écritures d'une clé dans l'ordre)
//
//  Garde-fous :
//   - Si le chargement d'un préfixe échoue, on n'écrit PLUS rien sous ce préfixe (sinon on écraserait la base avec des valeurs
//     par défaut) et un bandeau le dit. Il disparaît au prochain chargement réussi.
//   - Une écriture qui échoue affiche un bandeau et renvoie false (la page n'a pas à gérer l'exception).
//   - Reprise de l'existant (adoptions) : si la base n'a pas encore la clé et que ce poste en a une copie locale, elle est envoyée
//     à la base. La copie locale n'est JAMAIS supprimée ici. Le premier poste qui ouvre la page devient la référence.
//   - Fermer l'onglet pendant une écriture demande confirmation.
//
//  Clés : minuscules, chiffres et _ (2 à 60 caractères), contrainte de la table. Un préfixe par espace : declaration_, extras_...
// ══════════════════════════════════════════════════════

function creerReglages(deps) {
  // deps : { lire(prefixe) -> Promise<[{cle, valeur}]>, ecrire(cle, valeur) -> Promise, local: stockage de type localStorage,
  //          signaler(message|null) : affiche ou efface le bandeau d'erreur }
  const cache = Object.create(null);
  const refuses = [];                         // préfixes dont le chargement a échoué
  const chaines = Object.create(null);        // clé -> dernière écriture en cours (les écritures d'une clé restent dans l'ordre)
  let enCours = 0;

  const copie = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
  const signaler = function (m) { try { deps.signaler(m); } catch (e) { /* l'affichage ne doit jamais bloquer */ } };
  const refusee = function (cle) { return refuses.some(function (p) { return cle.indexOf(p) === 0; }); };

  // Écrit une clé en base ; true si c'est enregistré, false sinon (bandeau affiché)
  function ecrire(cle, valeur) {
    if (refusee(cle)) {
      signaler('Les réglages n\'ont pas pu être chargés : vos modifications ne sont pas enregistrées. Rechargez la page.');
      return Promise.resolve(false);
    }
    cache[cle] = copie(valeur);
    enCours++;
    const instantane = copie(valeur);
    const suite = (chaines[cle] || Promise.resolve()).then(function () { return deps.ecrire(cle, instantane); }).then(
      function () { signaler(null); return true; },
      function (e) { signaler('Enregistrement impossible : ' + ((e && e.message) || 'erreur réseau') + '. Votre dernière modification n\'est pas sauvegardée.'); return false; }
    ).then(function (ok) { enCours--; return ok; });
    chaines[cle] = suite;
    return suite;
  }

  // Valeur sans contenu (null, [], {}) : l'état par défaut de la page la remplace
  const vide = function (v) { return v === null || v === undefined || (Array.isArray(v) ? v.length === 0 : (typeof v === 'object' && Object.keys(v).length === 0)); };

  // adoptions : [{ locale: 'nom_de_la_cle_locale' | /motif/, cle: 'cle_en_base' | function (resultatDuMotif) -> cle }]
  async function adopter(adoptions) {
    let n = 0;
    for (const a of adoptions) {
      const locales = [];
      if (typeof a.locale === 'string') locales.push([a.locale, null]);
      else for (let i = 0; i < deps.local.length; i++) { const k = deps.local.key(i); const m = k && a.locale.exec(k); if (m) locales.push([k, m]); }
      for (const [k, m] of locales) {
        const cle = typeof a.cle === 'function' ? a.cle(m) : a.cle;
        if (!cle || cache[cle] !== undefined) continue;                      // la base fait foi
        let valeur;
        try { valeur = JSON.parse(deps.local.getItem(k)); } catch (e) { continue; }
        if (vide(valeur)) continue;                                          // rien à reprendre : l'état par défaut suffit
        if (await ecrire(cle, valeur)) n++;
      }
    }
    return n;
  }

  // Charge toutes les clés d'un préfixe ; renvoie false si la base n'a pas répondu
  async function charger(prefixe, adoptions) {
    let lignes;
    try { lignes = await deps.lire(prefixe); }
    catch (e) {
      if (refuses.indexOf(prefixe) < 0) refuses.push(prefixe);
      signaler('Les réglages n\'ont pas pu être chargés (' + ((e && e.message) || 'erreur réseau') + '). Rechargez la page : vos modifications ne seront pas enregistrées.');
      return false;
    }
    const i = refuses.indexOf(prefixe); if (i >= 0) refuses.splice(i, 1);
    lignes.forEach(function (l) { cache[l.cle] = l.valeur; });
    if (adoptions) await adopter(adoptions);
    return true;
  }

  function lire(cle, defaut) { const v = cache[cle]; return copie(v === undefined ? defaut : v); }

  return { charger: charger, lire: lire, ecrire: ecrire, enAttente: function () { return enCours; } };
}

// ── Navigateur : branché sur Supabase, bandeau d'erreur en haut de la page ──
(function () {
  if (typeof window === 'undefined' || typeof SB === 'undefined') return;
  function bandeau(message) {
    let el = document.getElementById('reglages-erreur');
    if (!message) { if (el) el.style.display = 'none'; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'reglages-erreur'; el.className = 'alert-warn'; el.setAttribute('role', 'alert');
      const app = document.querySelector('.app');
      const hdr = app && app.querySelector('.hdr');
      if (app) app.insertBefore(el, hdr ? hdr.nextSibling : app.firstChild); else document.body.insertBefore(el, document.body.firstChild);
    }
    el.textContent = message; el.style.display = 'flex';
  }
  window.REGLAGES = creerReglages({
    lire: function (prefixe) { return SB.getParametres(prefixe); },
    ecrire: function (cle, valeur) { return SB.saveParametre(cle, valeur); },
    local: (function () { try { return window.localStorage; } catch (e) { return { length: 0, key: function () { return null; }, getItem: function () { return null; } }; } })(),
    signaler: bandeau,
  });
  window.addEventListener('beforeunload', function (e) {
    if (window.REGLAGES.enAttente() > 0) { e.preventDefault(); e.returnValue = ''; }
  });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { creerReglages: creerReglages };
