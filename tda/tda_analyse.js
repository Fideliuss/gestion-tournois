// ══════════════════════════════════════════════════════
//  Règlement TDA - analyse d'un PDF (sans DOM : tourne dans le navigateur et sous Node)
//
//  1. lignesDepuisItems(pages)  : texte positionné (pdf.js) vers lignes, une liste par page ('' = ligne blanche)
//  2. analyser(pages)           : lignes vers { fichier: { edition, sections, blocs }, controles, stats }
//
//  L'analyse s'appuie sur la mise en page du règlement : titres « 12 - ... » (règles) et « RP12 - ... » (procédures),
//  points « A) », sous-points « 1) », puces « - », notes « § » et « v », exemples « Règle 45 : ... », glossaire. Elle n'embarque
//  aucun texte du règlement et ne suppose ni le nombre de règles, ni les noms des sections, ni ceux des groupes du glossaire :
//  une nouvelle édition du TDA (environ tous les 2 ans) s'importe donc telle quelle.
//  Garde-fou : le texte reconstruit à partir des données doit être IDENTIQUE à celui du PDF (espaces mis à part), sinon
//  `controles` contient une erreur et l'import est refusé par la page.
// ══════════════════════════════════════════════════════
(function (root) {
  'use strict';

  // ── 1. Texte positionné vers lignes ─────────────────────────────────────────────
  // `pages` : pour chaque page, la liste des morceaux de texte de pdf.js { str, x, y, w, h } (y vers le haut, comme pdf.js)
  // Le règlement marque ses notes avec deux pictogrammes d'une police de symboles : pdf.js les lit « Ü » et « s » (pdftotext « § » et « v »).
  // On repère cette police (que des caractères isolés) et on ramène les pictogrammes à « § » et « v ».
  const MARQUEUR_PDFJS = { 'Ü': '§', '§': '§', 's': 'v', 'v': 'v' };
  function lignesDepuisItems(pages) {
    const avertissements = [];
    const polices = {};                       // police -> { nb, longs, signes }
    pages.forEach(function (items) {
      items.forEach(function (it) {
        const s = (it.str || '').replace(/\s/g, '');
        if (!s || !it.f) return;
        const p = polices[it.f] = polices[it.f] || { nb: 0, longs: 0, signes: {} };
        p.nb++; if (s.length > 1) p.longs++; p.signes[s] = true;
      });
    });
    const symboles = {};
    Object.keys(polices).forEach(function (f) {
      const p = polices[f];
      if (!p.longs && p.nb >= 2 && Object.keys(p.signes).length <= 6) symboles[f] = true;
    });
    const inconnus = {};
    const lignesPages = pages.map(function (items) {
      items = items.map(function (it) {
        if (!(it.f && symboles[it.f]) || !it.str || !it.str.trim()) return it;
        const m = MARQUEUR_PDFJS[it.str.trim()];
        if (!m) inconnus[it.str.trim()] = true;
        return Object.assign({}, it, { str: m || '§' });
      });
      const morceaux = items.filter(function (it) { return it.str; });          // espaces conservés : ce sont des éléments à part dans le PDF
      // Regroupement par ligne : même ligne de base, à un demi-corps de caractère près
      morceaux.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
      const lignes = [];
      morceaux.forEach(function (it) {
        const l = lignes.length ? lignes[lignes.length - 1] : null;
        if (l && Math.abs(l.y - it.y) <= Math.max(2, 0.5 * Math.min(l.h || it.h || 10, it.h || 10))) l.items.push(it);
        else lignes.push({ y: it.y, h: it.h, items: [it] });
      });
      lignes.forEach(function (l) {
        l.items.sort(function (a, b) { return a.x - b.x; });
        let t = '', fin = null;
        l.items.forEach(function (it) {
          const hauteur = it.h || 10;
          if (fin !== null && it.x - fin > 0.18 * hauteur && !/\s$/.test(t) && !/^\s/.test(it.str)) t += ' ';
          t += it.str;
          fin = it.x + (it.w || 0);
        });
        l.t = t.replace(/\s+/g, ' ').trim();
      });
      for (let i = lignes.length - 1; i >= 0; i--) if (!lignes[i].t) lignes.splice(i, 1);       // lignes faites d'espaces seulement
      // Lignes blanches : un écart vertical nettement plus grand que l'interligne habituel de la page
      const ecarts = [];
      for (let i = 1; i < lignes.length; i++) ecarts.push(lignes[i - 1].y - lignes[i].y);
      const tries = ecarts.slice().sort(function (a, b) { return a - b; });
      const pas = tries.length ? tries[Math.floor(tries.length * 0.3)] : 12;          // interligne habituel : les écarts de paragraphes sont minoritaires
      const out = [];
      lignes.forEach(function (l, i) {
        if (i > 0 && lignes[i - 1].y - l.y > pas * 1.45) out.push('');
        out.push(l.t);
      });
      return out;
    });
    Object.keys(inconnus).forEach(function (c) { avertissements.push('Pictogramme « ' + c + ' » inconnu dans le PDF : traité comme une note (§).'); });
    lignesPages.avertissements = avertissements;
    return lignesPages;
  }

  // ── 2. Analyse ─────────────────────────────────────────────────────────────────
  const BRUIT = [
    /^©\s*Copyright/i, /layout by\b/i, /^\d+\s*\/\s*\d+$/, /^\d+\s*\/\s*\d+\s+Poker TDA\b/i, /\bPoker TDA \d{4}\s+\d+\s*\/\s*\d+$/i,
    /^Poker TDA \d{4}$/i, /^POKER TOURNAMENT DIRECTORS ASSN\.?$/i, /^Traduction française\b/i, /^Règles \d{4} Version [\d.]+\./i,
  ];
  const MOIS = ['janv', 'fevr', 'mars', 'avr', 'mai', 'juin', 'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];
  const RE_RP_TITRE = /^RP-?\s?(\d{1,2}) - (.+)$/;
  const MARQUEURS = [
    { k: 'pt',    re: /^([A-Z])\)\s+(.*)$/ },
    { k: 'sub',   re: /^(\d{1,2})\)\s+(.*)$/ },
    { k: 'li',    re: /^-\s+(.*)$/ },
    { k: 'note',  re: /^§\s+(.*)$/ },
    { k: 'note2', re: /^v\s+(.*)$/ },
  ];
  const FIN = /[.!?:;]$/;
  const TITRE_POINTILLES = /(\. ){3}|\.{4}/;          // la table des matières écrit « Titre . . . . 12 »

  function sansAccent(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function estMajuscules(t) { return t.length >= 6 && t === t.toUpperCase() && /\p{L}{3}/u.test(t) && !/^\d/.test(t); }
  function phrase(t) { const m = t.toLowerCase(); return m.charAt(0).toUpperCase() + m.slice(1); }

  function metaEdition(pages) {
    const lignes = [];
    pages.slice(0, 2).forEach(function (p) { p.forEach(function (l) { if (l && l.trim()) lignes.push(l.trim()); }); });
    const meta = { annee: null, version: null, date: null, traduction: null };
    lignes.forEach(function (l) {
      const m = /Règles\s+(\d{4})\s+Version\s+([\d.]+?)\.?\s+(\d{1,2})\s+([\p{L}.]+)\s+(\d{4})/u.exec(l);
      if (m && !meta.annee) {
        meta.annee = m[1]; meta.version = m[2];
        const mois = MOIS.findIndex(function (x) { return sansAccent(m[4].toLowerCase()).indexOf(x) === 0; });
        if (mois >= 0) meta.date = m[5] + '-' + String(mois + 1).padStart(2, '0') + '-' + String(parseInt(m[3], 10)).padStart(2, '0');
      }
      const t = /^Traduction française\s+(.+)$/i.exec(l);
      if (t && !meta.traduction) meta.traduction = t[1].trim();
    });
    return meta;
  }

  function nettoyer(pages) {
    // Lignes qui reviennent sur la plupart des pages (en-têtes, pieds de page) : ignorées, comme les motifs connus
    const nbPages = pages.length, vues = {};
    pages.forEach(function (p) {
      const dans = {};
      p.forEach(function (l) { const t = l.trim(); if (t) dans[t.replace(/\d+/g, '#')] = true; });
      Object.keys(dans).forEach(function (k) { vues[k] = (vues[k] || 0) + 1; });
    });
    const repetee = function (t) { return nbPages >= 6 && (vues[t.replace(/\d+/g, '#')] || 0) >= nbPages * 0.5; };
    const lignes = [];
    let saut = false;
    pages.forEach(function (p, i) {
      if (i > 0) saut = true;
      p.forEach(function (l) {
        const t = l.trim();
        if (t && (BRUIT.some(function (r) { return r.test(t); }) || repetee(t))) return;
        lignes.push({ t: t, pb: t ? saut : false });
        if (t) saut = false;
      });
    });
    return lignes;
  }

  function elements(ls, seuil, debut) {
    const out = [];
    let cur = null, vide = true, pb = false;
    ls.forEach(function (l) {
      if (!l.t) { vide = true; return; }
      if (l.pb) pb = true;
      let m = null;
      for (let i = 0; i < MARQUEURS.length && !m; i++) { const r = MARQUEURS[i].re.exec(l.t); if (r) m = { k: MARQUEURS[i].k, r: r }; }
      if (m) {
        const e = { t: m.k };
        if (m.k === 'pt' || m.k === 'sub') { e.n = m.r[1]; e.texte = m.r[2]; } else e.texte = m.r[1];
        e.derniere = e.texte;
        out.push(e); cur = e; vide = false; pb = false; return;
      }
      // Suite d'un élément : ligne coupée, ou phrase reprise après une coupure (saut de page, ligne blanche)
      const minuscule = /^[a-zàâçéèêëîïôûùüÿœ]/.test(l.t);
      const coupure = vide || pb;
      const courte = cur && cur.derniere !== undefined && cur.derniere.length < seuil && FIN.test(cur.derniere);
      if (cur && !(debut && debut.test(l.t)) && ((!coupure && !courte) || (coupure && minuscule && !FIN.test(cur.derniere || cur.texte)))) {
        cur.texte += ' ' + l.t; cur.derniere = l.t;
      } else {
        cur = { t: 'p', texte: l.t, derniere: l.t }; out.push(cur);
      }
      vide = false; pb = false;
    });
    out.forEach(function (e) { delete e.derniere; });
    return out;
  }
  function marque(e) { return e.t === 'pt' || e.t === 'sub' ? e.n + ') ' : e.t === 'li' ? '- ' : e.t === 'note' ? '§ ' : e.t === 'note2' ? 'v ' : ''; }
  function sansEspace(s) { return s.replace(/\s+/g, ''); }

  // ── Renvois entre règles ──
  const reRegle = /\b[Rr]ègles?\s+(\d{1,2})(?!\d)((?:-[A-Z0-9]+)*)/g;
  const reSuite = /^(\s*(?:,|et|ou)\s*)(\d{1,2})(?!\d)((?:-[A-Z0-9]+)*)/;
  const reRP = /\bRP-?\s?(\d{1,2})(?!\d)((?:-[A-Z0-9]+)*)/g;
  function renvois(texte) {
    const r = [];
    let m;
    reRegle.lastIndex = 0;
    while ((m = reRegle.exec(texte))) {
      r.push({ a: m.index + m[0].length - (m[1].length + m[2].length), b: m.index + m[0].length, cible: 'r' + parseInt(m[1], 10), sous: m[2].replace(/^-/, '') || null });
      let fin = m.index + m[0].length, s;
      while ((s = reSuite.exec(texte.slice(fin)))) {
        const deb = fin + s[1].length;
        r.push({ a: deb, b: deb + s[2].length + s[3].length, cible: 'r' + parseInt(s[2], 10), sous: s[3].replace(/^-/, '') || null });
        fin = deb + s[2].length + s[3].length;
      }
      reRegle.lastIndex = fin;
    }
    reRP.lastIndex = 0;
    while ((m = reRP.exec(texte))) r.push({ a: m.index, b: m.index + m[0].length, cible: 'rp' + parseInt(m[1], 10), sous: m[2].replace(/^-/, '') || null });
    return r.sort(function (x, y) { return x.a - y.a; });
  }

  // Renvoi dont la formulation désigne une autre règle que celle citée : « règle 49 (accepter l'action) », « action substantielle (cf. règle 36) ».
  // Détection volontairement prudente (titre identique, au moins deux mots) : elle ne repère qu'une partie des erreurs de traduction.
  function normaliser(t) { return sansAccent(t.toLowerCase()).replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function titreDesigne(texte, r, titres) {
    const apres = /^\s*\(([^)]{5,60})\)/.exec(texte.slice(r.b));
    const candidats = [];
    if (apres) candidats.push(normaliser(apres[1]));
    const avant = /([\p{L}' ]{5,60}?)\s*\(\s*(?:cf\.?|voir|Voir)?\s*règles?\s*$/u.exec(texte.slice(Math.max(0, r.a - 70), r.a));
    if (avant) {
      const mots = normaliser(avant[1]).split(' ');
      for (let n = Math.min(4, mots.length); n >= 2; n--) candidats.push(mots.slice(-n).join(' '));
    }
    for (let i = 0; i < candidats.length; i++) {
      if (candidats[i].split(' ').length < 2) continue;
      const trouve = titres.filter(function (t) { return t.norm === candidats[i]; });
      if (trouve.length === 1) return trouve[0];
    }
    return null;
  }

  // ── Analyse complète ──
  function analyser(pagesBrutes) {
    const controles = [];
    const ok = function (t) { controles.push({ niveau: 'ok', texte: t }); };
    const avert = function (t) { controles.push({ niveau: 'avert', texte: t }); };
    const erreur = function (t) { controles.push({ niveau: 'erreur', texte: t }); };

    (pagesBrutes.avertissements || []).forEach(avert);
    const meta = metaEdition(pagesBrutes);
    const lignes = nettoyer(pagesBrutes);
    let nbAntislash = 0;
    lignes.forEach(function (l) { l.t = l.t.replace(/(\d)\\/g, function (m, d) { nbAntislash++; return d; }); });   // « 700\. » est un défaut de conversion du PDF
    if (nbAntislash) ok(nbAntislash + ' antislash parasites supprimés après un chiffre (défaut de conversion du PDF)');

    const trouver = function (re, depuis, dernier) {
      let r = -1;
      for (let i = depuis || 0; i < lignes.length; i++) if (re.test(lignes[i].t)) { r = i; if (!dernier) return i; }
      return r;
    };
    // Corps : première règle numéro 1 (hors table des matières, qui écrit « Titre . . . . 12 »)
    const iR1 = (function () { for (let i = 0; i < lignes.length; i++) { const m = /^1 - (.+)$/.exec(lignes[i].t); if (m && !TITRE_POINTILLES.test(m[1])) return i; } return -1; })();
    if (iR1 < 0) { erreur('Aucune règle numérotée « 1 - ... » trouvée : ce PDF n\'a pas la mise en page du règlement du TDA.'); return { fichier: null, controles: controles, stats: {} }; }
    let iCorps = iR1;
    for (let i = iR1 - 1; i >= 0 && i >= iR1 - 3; i--) { if (!lignes[i].t) continue; if (estMajuscules(lignes[i].t)) iCorps = i; break; }
    const iRP = trouver(/^(\d{4}\s+)?proc[ée]dures?\s+recomm[ae]nd/i, iR1);          // « recommendées » : la traduction écrit parfois ainsi
    const iEx = trouver(/^exemples?\s+d['’]illustration/i, Math.max(iR1, iRP));
    const iGlo = trouver(/^glossaire$/i, Math.max(iR1, iRP, iEx), true);
    const finRegles = iRP >= 0 ? iRP : (iEx >= 0 ? iEx : (iGlo >= 0 ? iGlo : lignes.length));
    if (iRP < 0) avert('Aucune partie « Procédures recommandées » trouvée.');
    if (iEx < 0) avert('Aucune partie « Exemples d\'illustration » trouvée.');
    if (iGlo < 0) avert('Aucun glossaire trouvé.');

    const blocs = [], flux = [];
    let ordre = 0;

    // ── Règles et sections ──
    const sections = [];
    (function regles() {
      const zone = lignes.slice(iCorps, finRegles);
      let attendu = 1, courant = null, corps = [], section = null;
      const fermer = function () {
        if (!courant) return;
        blocs.push({ id: 'r' + courant.n, kind: 'regle', numero: String(courant.n), section: courant.section.id, titre: courant.titre, ordre: ++ordre, data: { elements: elements(corps, 75) } });
        courant = null; corps = [];
      };
      const prochaine = function (i) { for (let j = i + 1; j < zone.length; j++) if (zone[j].t) return zone[j].t; return ''; };
      zone.forEach(function (l, i) {
        const m = l.t && /^(\d{1,2}) - (.+)$/.exec(l.t);
        const titreSuivant = function (t) { const x = /^(\d{1,2}) - (.+)$/.exec(t); return x && parseInt(x[1], 10) === attendu && !TITRE_POINTILLES.test(x[2]); };
        if (l.t && estMajuscules(l.t) && titreSuivant(prochaine(i))) {          // en-tête de section juste avant le titre d'une règle
          fermer();
          section = { id: 's' + (sections.length + 1), titre: phrase(l.t), ordre: sections.length + 1 };
          sections.push(section); flux.push(l.t); return;
        }
        if (m && titreSuivant(l.t)) {
          fermer();
          if (!section) { section = { id: 's1', titre: 'Règles', ordre: 1 }; sections.push(section); }
          courant = { n: attendu, titre: m[2], section: section }; attendu++; flux.push(l.t);
        } else if (courant) corps.push(l);
      });
      fermer();
      const n = attendu - 1;
      if (n >= 1) ok(n + ' règles et ' + sections.length + ' sections');
      else erreur('Aucune règle n\'a pu être lue.');
    })();

    // ── Procédures recommandées ──
    if (iRP >= 0) (function procedures() {
      const fin = iEx >= 0 ? iEx : (iGlo >= 0 ? iGlo : lignes.length);
      const zone = lignes.slice(iRP, fin);
      let i = 1;
      const intro = [];
      while (i < zone.length && !(RE_RP_TITRE.test(zone[i].t) && !TITRE_POINTILLES.test(zone[i].t))) { intro.push(zone[i]); i++; }
      const introEl = elements(intro, 75);
      blocs.push({ id: 'rp_intro', kind: 'rp_intro', numero: '', section: 'rp', titre: zone[0].t, ordre: ++ordre, data: { elements: introEl } });
      flux.push(zone[0].t);
      let attendu = 1, courant = null, corps = [];
      const fermer = function () {
        if (!courant) return;
        blocs.push({ id: 'rp' + courant.n, kind: 'rp', numero: 'RP-' + courant.n, section: 'rp', titre: courant.titre, ordre: ++ordre, data: { elements: elements(corps, 75) } });
        courant = null; corps = [];
      };
      zone.slice(i).forEach(function (l) {
        const m = l.t && RE_RP_TITRE.exec(l.t);
        if (m && parseInt(m[1], 10) === attendu) { fermer(); courant = { n: attendu, titre: m[2] }; attendu++; flux.push(l.t); }
        else if (courant) corps.push(l);
      });
      fermer();
      if (attendu - 1 >= 1) ok((attendu - 1) + ' procédures recommandées'); else avert('Aucune procédure recommandée n\'a pu être lue.');
    })();

    // ── Exemples d'illustration ──
    if (iEx >= 0) (function exemples() {
      const zone = lignes.slice(iEx + 1, iGlo >= 0 ? iGlo : lignes.length);
      const REEX = /^Règle (\d{1,2})((?:-[A-Z0-9]+)*)\s*:\s*(.+)$/;
      const DEBUT = /^(Exemple|Example|Situation)\b[^:]{0,28}:/;
      let courant = null, corps = [], nb = 0;
      const fermer = function () {
        if (!courant) return;
        const ref = courant.n + courant.suffixe;
        blocs.push({ id: 'ex_' + ref.toLowerCase().replace(/-/g, '_'), kind: 'exemple', numero: ref, section: 'ex', titre: courant.titre, ordre: ++ordre, data: { regle: String(courant.n), elements: elements(corps, 90, DEBUT) } });
        nb++; courant = null; corps = [];
      };
      zone.forEach(function (l) {
        const m = l.t && REEX.exec(l.t);
        if (m) { fermer(); courant = { n: parseInt(m[1], 10), suffixe: m[2], titre: m[3] }; flux.push(l.t); }
        else if (courant) corps.push(l);
      });
      fermer();
      if (nb) ok(nb + ' exemples d\'illustration'); else avert('Aucun exemple d\'illustration n\'a pu être lu.');
    })();

    // ── Glossaire : un groupe = ligne sans puce, qui commence par une majuscule, précédée d'une coupure et suivie d'une puce ──
    if (iGlo >= 0) (function glossaire() {
      const zone = lignes.slice(iGlo + 1);
      const entrees = [];
      let groupe = null, nbGroupes = 0;
      zone.forEach(function (l, i) {
        if (!l.t) return;
        if (/^-\s+/.test(l.t)) { entrees.push({ groupe: groupe, texte: l.t.replace(/^-\s+/, '') }); return; }
        let suivante = '';
        for (let j = i + 1; j < zone.length; j++) if (zone[j].t) { suivante = zone[j].t; break; }
        let precedenteVide = i === 0 || l.pb;
        for (let j = i - 1; j >= 0 && !precedenteVide; j--) { if (!zone[j].t) { precedenteVide = true; } break; }
        if (/^\p{Lu}/u.test(l.t) && /^-\s+/.test(suivante) && (precedenteVide || !entrees.length) && !/[.]$/.test(l.t)) {
          groupe = l.t; nbGroupes++; entrees.push({ groupe: l.t, titre: true });
        } else if (entrees.length && !entrees[entrees.length - 1].titre) entrees[entrees.length - 1].texte += ' ' + l.t;
      });
      let nb = 0;
      entrees.forEach(function (e) {
        if (e.titre) { flux.push(e.groupe); return; }
        const i = e.texte.indexOf(': ');
        const terme = i > 0 ? e.texte.slice(0, i) : e.texte, def = i > 0 ? e.texte.slice(i + 2) : '';
        nb++;
        blocs.push({ id: 'g_' + nb, kind: 'glossaire', numero: '', section: 'gl', titre: terme, ordre: ++ordre, data: { groupe: e.groupe || 'Glossaire', definition: def } });
        flux.push('- ' + e.texte);
      });
      if (nb) ok(nb + ' termes du glossaire dans ' + nbGroupes + ' groupes'); else avert('Aucun terme de glossaire n\'a pu être lu.');
    })();

    // ── Renvois ──
    const parId = {};
    blocs.forEach(function (b) { parId[b.id] = b; });
    const titres = blocs.filter(function (b) { return b.kind === 'regle' || b.kind === 'rp'; }).map(function (b) { return { id: b.id, norm: normaliser(b.titre), numero: b.numero, titre: b.titre }; });
    let nbRenvois = 0, nbAVerifier = 0;
    const casses = [], inventaire = [];
    blocs.forEach(function (b) {
      (b.data.elements || []).forEach(function (e) {
        e.renvois = renvois(e.texte);
        e.renvois.forEach(function (r) {
          nbRenvois++;
          const cible = parId[r.cible];
          let probleme = null;
          if (!cible) probleme = 'cible inexistante';
          else if (r.sous && /^[A-Z]$/.test(r.sous.split('-')[0]) && !(cible.data.elements || []).some(function (x) { return x.t === 'pt' && x.n === r.sous.split('-')[0]; })) probleme = 'point ' + r.sous.split('-')[0] + ' absent de la règle citée';
          if (probleme) casses.push((b.numero || b.id) + ' : « ' + e.texte.slice(Math.max(0, r.a - 14), r.b + 14) + ' » (' + probleme + ')');
          if (cible && !probleme) {
            const vise = titreDesigne(e.texte, r, titres);
            if (vise && vise.id !== r.cible) {
              r.verifier = { attendu: vise.id, note: 'Le texte parle de « ' + vise.titre.replace(/\s*\(.*\)\s*$/, '') + ' », qui est la règle ' + vise.numero.replace('RP-', 'RP ') + ' et non la ' + cible.numero.replace('RP-', 'RP ') + '.' };
              nbAVerifier++;
            }
          }
          inventaire.push({ de: b.numero || b.id, cible: r.cible, sous: r.sous, probleme: probleme, verifier: !!r.verifier });
        });
        if (!e.renvois.length) delete e.renvois;
      });
    });
    ok(nbRenvois + ' renvois entre règles' + (nbAVerifier ? ', dont ' + nbAVerifier + ' signalés « à vérifier » (la formulation désigne une autre règle que celle citée)' : ''));
    if (casses.length) avert(casses.length + ' renvoi(s) vers une règle ou un point qui n\'existe pas : ' + casses.slice(0, 6).join(' ; ') + (casses.length > 6 ? ' ...' : ''));

    // ── Contrôle de non-perte : le texte des données doit être celui du PDF ──
    const compare = function (nom, a, b) {
      const x = sansEspace(a), y = sansEspace(b);
      if (x === y) { ok('Texte de « ' + nom + ' » identique à celui du PDF (' + x.length + ' caractères)'); return; }
      let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++;
      erreur('Texte de « ' + nom + ' » différent du PDF à partir du caractère ' + i + ' (PDF : « ' + x.slice(Math.max(0, i - 25), i + 35) + ' », données : « ' + y.slice(Math.max(0, i - 25), i + 35) + ' »).');
    };
    const texteBloc = function (b) { return (b.data.elements || []).map(function (e) { return marque(e) + e.texte; }).join(''); };
    const regles = blocs.filter(function (b) { return b.kind === 'regle'; });
    if (regles.length) {
      const sectionDe = {}; sections.forEach(function (s) { sectionDe[s.id] = s; });
      let derniere = null, sortie = '';
      regles.forEach(function (b) {
        if (b.section !== derniere) { derniere = b.section; sortie += flux.find(function (f) { return phrase(f) === sectionDe[b.section].titre; }) || ''; }
        sortie += b.numero + ' - ' + b.titre + texteBloc(b);
      });
      blocs.filter(function (b) { return b.kind === 'rp_intro' || b.kind === 'rp'; }).forEach(function (b) {
        sortie += (b.kind === 'rp_intro' ? b.titre : b.numero.replace('RP-', 'RP') + ' - ' + b.titre) + texteBloc(b);
      });
      // Le texte du PDF pour la même partie : de la première section aux procédures incluses
      const srcFin = iEx >= 0 ? iEx : (iGlo >= 0 ? iGlo : lignes.length);
      compare('règles et procédures', lignes.slice(iCorps, srcFin).map(function (l) { return l.t; }).join(''), sortie);
    }
    if (iEx >= 0) {
      compare('exemples d\'illustration', lignes.slice(iEx + 1, iGlo >= 0 ? iGlo : lignes.length).map(function (l) { return l.t; }).join(''),
        blocs.filter(function (b) { return b.kind === 'exemple'; }).map(function (b) { return 'Règle ' + b.numero + ' : ' + b.titre + texteBloc(b); }).join(''));
    }
    if (iGlo >= 0) {
      compare('glossaire', lignes.slice(iGlo + 1).map(function (l) { return l.t; }).join(''),
        flux.filter(function (f) { return /^- /.test(f) || (blocs.some(function (b) { return b.kind === 'glossaire' && b.data.groupe === f; })); }).join(''));
    }

    const annee = meta.annee || String(new Date().getFullYear());
    const edition = {
      id: meta.annee ? meta.annee + '_v' + String(meta.version || '1').replace(/\./g, '_') : '',
      libelle: meta.annee ? 'Règles ' + meta.annee + ' - Version ' + (meta.version || '') : '',
      date_publication: meta.date || null,
      traduction: meta.traduction || null,
      introduction: null,
      mention: 'TDA rules used by permission of the Poker TDA, Copyright ' + annee + ', http://www.pokertda.com, All rights reserved.',
    };
    // Présentation de l'association, en tête du document (premier paragraphe de la première page)
    const iIntro = pagesBrutes.length ? pagesBrutes[0].findIndex(function (l) { return /association/i.test(l) && /Poker TDA/i.test(l); }) : -1;
    if (iIntro >= 0) { const p = []; for (let i = iIntro; i < pagesBrutes[0].length && pagesBrutes[0][i].trim(); i++) p.push(pagesBrutes[0][i].trim()); edition.introduction = p.join(' '); }
    if (!meta.annee) avert('L\'année et la version n\'ont pas été reconnues sur la première page : à saisir à la main.');

    const secs = sections.slice();
    if (blocs.some(function (b) { return b.kind === 'rp'; })) secs.push({ id: 'rp', titre: 'Procédures recommandées', ordre: secs.length + 1 });
    if (blocs.some(function (b) { return b.kind === 'exemple'; })) secs.push({ id: 'ex', titre: 'Exemples d\'illustration', ordre: secs.length + 1 });
    if (blocs.some(function (b) { return b.kind === 'glossaire'; })) secs.push({ id: 'gl', titre: 'Glossaire', ordre: secs.length + 1 });

    const stats = { regles: regles.length, sections: sections.length, rp: blocs.filter(function (b) { return b.kind === 'rp'; }).length,
      exemples: blocs.filter(function (b) { return b.kind === 'exemple'; }).length, glossaire: blocs.filter(function (b) { return b.kind === 'glossaire'; }).length,
      renvois: nbRenvois, aVerifier: nbAVerifier, casses: casses.length, blocs: blocs.length };
    return { fichier: { edition: edition, sections: secs, blocs: blocs }, controles: controles, stats: stats, inventaire: inventaire };
  }

  const API = { lignesDepuisItems: lignesDepuisItems, analyser: analyser, metaEdition: metaEdition };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TDA_ANALYSE = API;
})(typeof window !== 'undefined' ? window : this);
