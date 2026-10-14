// ══════════════════════════════════════════════════════
//  Règlement TDA - recherche (sans DOM : testable sous Node, voir tda_recherche.test.js)
//
//  - insensible aux accents, à la casse et à la ponctuation ; tous les mots de la recherche doivent se trouver (titre ou texte)
//  - tolérante aux fautes de frappe (un mot de 5 lettres ou plus peut avoir une lettre fausse, 9 lettres ou plus : deux)
//  - équivalents français / anglais du jeu (raise = relance, fausse donne = misdeal...) : le règlement mêle les deux
//  - accès direct par numéro : « 45 » = règle 45, « 55-A » = point A de la règle 55, « RP-5 » ou « rp 5 » = procédure 5
//  Le classement favorise les titres, puis le texte ; les exemples comptent un peu moins que les règles.
// ══════════════════════════════════════════════════════
(function (root) {
  'use strict';

  // Mots du jeu qui se disent de deux façons. Chaque ligne est un groupe d'équivalents (formes normalisées : sans accent, minuscules).
  const SYNONYMES = [
    ['relance', 'relancer', 'raise', 'raiser', 'surrelance', 'sur relance'],
    ['mise', 'miser', 'bet'],
    ['paye', 'payer', 'call', 'suivre', 'suit'],
    ['passe', 'passer', 'fold', 'coucher', 'se coucher'],
    ['parole', 'check'],
    ['tapis', 'all in', 'allin'],
    ['fausse donne', 'misdeal', 'fausse donne'],
    ['bouton mort', 'dead button'],
    ['action substantielle', 'sa', 'significant action', 'action significative'],
    ['action prematuree', 'oot', 'out of turn', 'hors tour', 'action hors tour'],
    ['mise en plusieurs fois', 'string bet', 'string bets', 'string raise', 'string raises'],
    ['abattage', 'showdown'],
    ['pot exterieur', 'side pot', 'pots exterieurs'],
    ['bruler', 'brule', 'burn', 'carte brulee'],
    ['tuer', 'kill', 'main morte', 'morte'],
    ['muck', 'defausse', 'defausser'],
    ['blinds', 'blind', 'aveugle', 'aveugles'],
    ['grosse blind', 'big blind', 'bb'],
    ['petite blind', 'small blind', 'sb'],
    ['eviter les blinds', 'dodging blinds'],
    ['chip race', 'chip-race', 'color up', 'colorup'],
    ['ralentissement', 'stalling', 'temporisation', 'perte de temps'],
    ['soft play', 'jeu complaisant', 'complaisance'],
    ['tablage', 'tabler', 'montrer', 'retourner'],
    ['heads up', 'headsup', 'tete a tete'],
    ['rabbit hunting', 'rabbit'],
    ['penalite', 'penalites', 'sanction', 'sanctions', 'punition'],
    ['avertissement', 'warning'],
    ['floor', 'directeur de tournoi', 'td'],
    ['croupier', 'dealer'],
    ['jeton', 'jetons', 'chip', 'chips'],
    ['siege', 'place'],
    ['bouton', 'button', 'dealer button'],
    ['equilibrage', 'balancing', 'rebalancer'],
    ['recave', 'recaves', 'rebuy', 'rebuys', 're buy'],
    ['reentree', 'reentry', 're entry'],
    ['telephone', 'portable', 'mobile', 'smartphone'],
    ['main par main', 'hand for hand', 'h4h'],
    ['bulle', 'bubble'],
  ];
  const MOTS_VIDES = { le: 1, la: 1, les: 1, de: 1, du: 1, des: 1, un: 1, une: 1, et: 1, ou: 1, a: 1, au: 1, aux: 1, en: 1, d: 1, l: 1, que: 1, qui: 1, est: 1, sur: 1, dans: 1, pour: 1, par: 1 };

  // ── Normalisation, avec la correspondance vers le texte d'origine ─────────────────────────
  // Renvoie le texte normalisé (a-z, 0-9, espaces simples) et, pour chaque caractère normalisé, sa position dans le texte d'origine
  function normaliserAvecPositions(s) {
    let n = '';
    const idx = [];
    let espace = true;                                       // pas d'espace en tête, pas d'espaces doubles
    for (let i = 0; i < s.length; i++) {
      const d = s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      for (let k = 0; k < d.length; k++) {
        const c = d[k];
        if (/[a-z0-9]/.test(c)) { n += c; idx.push(i); espace = false; }
        else if (!espace && c !== "'" && c !== '’') { n += ' '; idx.push(i); espace = true; }
        else if (c === "'" || c === '’') { if (!espace) { n += ' '; idx.push(i); espace = true; } }
      }
    }
    return { n: n.replace(/ $/, ''), idx: idx };
  }
  function norm(s) { return normaliserAvecPositions(String(s == null ? '' : s)).n; }

  // ── Équivalents ───────────────────────────────────────────────────────────────────────────
  function equivalents(jeton) {
    const out = [];
    SYNONYMES.forEach(function (g) {
      const dedans = g.some(function (m) { return m === jeton || (jeton.length >= 4 && m.indexOf(' ') < 0 && m.indexOf(jeton) === 0); });
      if (dedans) g.forEach(function (m) { if (m !== jeton && out.indexOf(m) < 0) out.push(m); });
    });
    return out;
  }

  // ── Distance d'édition bornée (une insertion, suppression ou lettre fausse = 1) ──────────────
  function distanceMax(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prec = [];
    for (let j = 0; j <= b.length; j++) prec.push(j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let mini = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < mini) mini = cur[j];
      }
      if (mini > max) return max + 1;
      prec = cur;
    }
    return prec[b.length];
  }
  function tolerance(jeton) { return jeton.length >= 9 ? 2 : jeton.length >= 5 ? 1 : 0; }

  // ── Index ─────────────────────────────────────────────────────────────────────────────────
  // Un document par bloc consultable : règle, procédure, exemple, terme du glossaire
  function creerIndex(blocs) {
    const docs = [];
    const parId = {};
    (blocs || []).forEach(function (b) {
      if (b.kind === 'rp_intro') return;
      let corps;
      if (b.kind === 'glossaire') corps = [{ texte: b.data.definition || '' }];
      else corps = (b.data.elements || []).map(function (e) { return { texte: e.texte }; });
      const d = {
        id: b.id, kind: b.kind, numero: b.numero, titre: b.titre, regle: b.data && b.data.regle,
        nTitre: ' ' + norm(b.titre) + ' ',
        elements: corps.map(function (e) { return { texte: e.texte, n: ' ' + norm(e.texte) + ' ' }; }),
      };
      d.nCorps = d.elements.map(function (e) { return e.n; }).join('');
      d.mots = {};
      (d.nTitre + d.nCorps).split(' ').forEach(function (m) { if (m.length >= 5) d.mots[m] = true; });
      d.motsListe = Object.keys(d.mots);
      docs.push(d); parId[d.id] = d;
    });
    return { docs: docs, parId: parId };
  }

  // Nombre d'occurrences d'une forme (mot entier ou début de mot) dans un texte normalisé encadré d'espaces
  function compter(texte, forme, debutDeMot) {
    const motif = debutDeMot ? ' ' + forme : ' ' + forme + ' ';
    let n = 0, i = texte.indexOf(motif);
    while (i >= 0 && n < 10) { n++; i = texte.indexOf(motif, i + 1); }
    return n;
  }

  // Les mots de la recherche, sans les mots vides (sauf si la recherche n'est faite que de mots vides)
  function jetons(requete) {
    const tous = norm(requete).split(' ').filter(Boolean);
    const utiles = tous.filter(function (t) { return !MOTS_VIDES[t]; });
    return utiles.length ? utiles : tous;
  }

  // ── Accès direct par numéro ───────────────────────────────────────────────────────────────
  function numero(requete) {
    const q = String(requete || '').trim();
    let m = /^rp[\s-]*(\d{1,2})(?:[\s-]*([a-z]))?$/i.exec(q);
    if (m) return { id: 'rp' + parseInt(m[1], 10), sous: m[2] ? m[2].toUpperCase() : null };
    m = /^(?:r(?:[eè]gle)?\s*)?(\d{1,2})(?:[\s-]*([a-z]))?(?:[\s-]*\d)?$/i.exec(q);
    if (m) return { id: 'r' + parseInt(m[1], 10), sous: m[2] ? m[2].toUpperCase() : null };
    return null;
  }

  // ── Plages à surligner dans un texte d'origine (mots entiers ou débuts de mots de la recherche et de leurs équivalents) ──
  function plages(texte, termes) {
    const { n, idx } = normaliserAvecPositions(texte);
    const h = ' ' + n + ' ';                                   // h[k + 1] correspond à n[k] ; chaque mot est encadré d'espaces
    const out = [];
    termes.forEach(function (forme) {
      let i = h.indexOf(' ' + forme);
      while (i >= 0) {
        let fin = i + 1 + forme.length;                        // fin (exclue) de la forme dans h
        const mot = forme.indexOf(' ') < 0;
        let garde = h[fin] === ' ' || (mot && forme.length >= 3);          // mot entier, ou début de mot d'au moins 3 lettres
        if (garde && mot && h[fin] !== ' ') {                  // « relance » surligne « relances » (jusqu'à 4 lettres de plus), sinon seulement le début du mot
          let plus = 0, f = fin;
          while (f < h.length && h[f] !== ' ' && plus < 4) { f++; plus++; }
          if (h[f] === ' ') fin = f;
        }
        if (garde) {
          const a = idx[i], b = idx[fin - 2] + 1;
          if (a !== undefined && b > a) out.push([a, b]);
        }
        i = h.indexOf(' ' + forme, i + 1);
      }
    });
    out.sort(function (x, y) { return x[0] - y[0] || y[1] - x[1]; });
    const fusion = [];
    out.forEach(function (p) {
      const dernier = fusion[fusion.length - 1];
      if (dernier && p[0] <= dernier[1]) dernier[1] = Math.max(dernier[1], p[1]); else fusion.push(p.slice());
    });
    return fusion;
  }

  // Formes à rechercher pour une recherche : chaque mot et ses équivalents
  function termes(requete) {
    const out = [];
    jetons(requete).forEach(function (t) {
      [t].concat(equivalents(t)).forEach(function (f) { if (out.indexOf(f) < 0) out.push(f); });
    });
    return out;
  }

  // ── Recherche ─────────────────────────────────────────────────────────────────────────────
  const POIDS = { regle: 1, rp: 1, glossaire: 1, exemple: 0.75 };

  function chercher(index, requete, limite) {
    const brut = String(requete || '').trim();
    const sortie = { saut: null, resultats: [], termes: [] };
    if (!brut) return sortie;

    const num = numero(brut);
    if (num && index.parId[num.id]) {
      const d = index.parId[num.id];
      sortie.saut = { id: d.id, kind: d.kind, numero: d.numero, titre: d.titre, sous: num.sous };
      // Les exemples d'une règle accompagnent l'accès direct
      if (d.kind === 'regle') index.docs.forEach(function (x) {
        if (x.kind === 'exemple' && x.regle === d.numero) sortie.resultats.push({ id: x.id, kind: x.kind, numero: x.numero, titre: x.titre, score: 1, extrait: null });
      });
      return sortie;
    }
    if (num && /^\d{1,2}$/.test(brut.replace(/\s/g, ''))) return sortie;      // un nombre qui n'est pas une règle : rien

    const toks = jetons(brut);
    if (!toks.length) return sortie;
    const alt = toks.map(function (t) {
      return [{ f: t, direct: true }].concat(equivalents(t).map(function (f) { return { f: f, direct: false }; }));
    });
    sortie.termes = termes(brut);
    const phrase = norm(brut);

    const trouves = [];
    index.docs.forEach(function (d) {
      let score = 0, nb = 0;
      for (let k = 0; k < alt.length; k++) {
        let meilleur = 0;
        alt[k].forEach(function (a) {
          const coef = a.direct ? 1 : 0.8;
          const multi = a.f.indexOf(' ') >= 0;
          let s = 0;
          const titreExact = compter(d.nTitre, a.f, false), titreDebut = titreExact || compter(d.nTitre, a.f, true);
          if (titreExact) s = Math.max(s, 12); else if (titreDebut && a.f.length >= 3) s = Math.max(s, 9);
          const corpsExact = compter(d.nCorps, a.f, false), corpsDebut = corpsExact || (a.f.length >= 3 ? compter(d.nCorps, a.f, true) : 0);
          if (corpsExact) s = Math.max(s, 3 + 0.6 * Math.min(corpsExact, 4)); else if (corpsDebut) s = Math.max(s, 2);
          if (!multi && a.f.length >= 6) {                                           // même racine : « minimum » trouve « minimale », « relance » trouve « relancer »
            const racine = a.f.slice(0, Math.max(5, a.f.length - 2));
            if (compter(d.nTitre, racine, true)) s = Math.max(s, 7);
            else if (compter(d.nCorps, racine, true)) s = Math.max(s, 2.4);
          }
          if (!s && !multi && a.direct && tolerance(a.f) > 0) {                   // faute de frappe
            const max = tolerance(a.f);
            for (let m = 0; m < d.motsListe.length; m++) {
              const mot = d.motsListe[m];
              if (mot[0] !== a.f[0] && max < 2) continue;
              if (distanceMax(a.f, mot, max) <= max) { s = d.nTitre.indexOf(' ' + mot + ' ') >= 0 ? 5 : 1; break; }
            }
          }
          if (s * coef > meilleur) meilleur = s * coef;
        });
        if (meilleur) { score += meilleur; nb++; }
      }
      if (!nb) return;
      if (phrase.indexOf(' ') >= 0) {                                              // la recherche entière, dans l'ordre
        if (d.nTitre.indexOf(' ' + phrase + ' ') >= 0) score += 15;
        else if (d.nCorps.indexOf(' ' + phrase + ' ') >= 0) score += 6;
      }
      if (d.kind === 'glossaire' && d.nTitre.trim() === phrase) score += 10;
      trouves.push({ d: d, nb: nb, score: score * (POIDS[d.kind] || 1) });
    });
    // Tous les mots d'abord ; si aucun passage ne les contient tous (question tapée en phrase), ceux qui en contiennent au moins la moitié
    const complets = trouves.filter(function (t) { return t.nb === alt.length; });
    const retenus = complets.length ? complets : trouves.filter(function (t) { return t.nb >= Math.ceil(alt.length / 2); });
    trouves.length = 0;
    Array.prototype.push.apply(trouves, retenus);
    trouves.sort(function (x, y) { return y.score - x.score; });

    const formes = sortie.termes;
    trouves.slice(0, limite || 60).forEach(function (t) {
      const d = t.d;
      // Extrait : le premier élément du texte qui contient un des mots (ou équivalents) de la recherche
      let extrait = null;
      for (let e = 0; e < d.elements.length && !extrait; e++) {
        const p = plages(d.elements[e].texte, formes);
        if (p.length) {
          const txt = d.elements[e].texte;
          let a = Math.max(0, p[0][0] - 60), b = Math.min(txt.length, p[0][1] + 100);
          if (a > 0) { const sp = txt.indexOf(' ', a); if (sp >= 0 && sp < p[0][0]) a = sp + 1; }
          if (b < txt.length) { const sp = txt.lastIndexOf(' ', b); if (sp > p[0][1]) b = sp; }
          const fen = txt.slice(a, b);
          extrait = { texte: fen, debut: a > 0, fin: b < txt.length, plages: plages(fen, formes) };
        }
      }
      sortie.resultats.push({ id: d.id, kind: d.kind, numero: d.numero, titre: d.titre, score: t.score, extrait: extrait, plagesTitre: plages(d.titre, formes) });
    });
    return sortie;
  }

  const API = { creerIndex: creerIndex, chercher: chercher, plages: plages, termes: termes, norm: norm, numero: numero };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TDA_RECHERCHE = API;
})(typeof window !== 'undefined' ? window : this);
