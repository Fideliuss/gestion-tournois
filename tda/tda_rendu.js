// ══════════════════════════════════════════════════════
//  Règlement TDA - mise en forme du contenu (sans DOM : testable sous Node, voir tda_rendu.test.js)
//
//  Transforme les blocs importés (data.elements : paragraphes, points A), sous-points 1), puces, notes § et v,
//  avec leurs renvois) en HTML. Tout le texte est échappé ; les renvois deviennent des liens `#r45/B`, les termes du
//  glossaire des info-bulles, « voir exemples » un lien vers les exemples de la règle.
//  Le texte du règlement n'est jamais modifié : on ne fait qu'entourer des portions de texte (le texte affiché,
//  balises retirées, est identique au texte importé : propriété vérifiée par le test).
// ══════════════════════════════════════════════════════
(function (root) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // ── Glossaire : repérage des termes dans un texte ─────────────────────────────
  // Termes très fréquents ou d'une lettre : jamais soulignés (TD revient à chaque ligne, M se confond avec une lettre)
  const EXCLUS = { 'TD': 1, 'TDA': 1, 'M': 1 };
  const COURTS_AUTORISES = { 'SA': 1, 'BB': 1, 'SB': 1 };

  function cle(t) { return t.toLowerCase().replace(/[\u00a0-]/g, ' ').replace(/\u2019/g, "'"); }
  function motifTexte(t) {
    // espace et tiret sont interchangeables (« bring-in », « Bring in »), comme les deux apostrophes
    return t.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/[ -]/g, '[ \\u00a0-]').replace(/'/g, "['\\u2019]");
  }

  function creerGlossaire(blocs) {
    const items = [];
    (blocs || []).forEach(function (b) {
      const v = b.titre.split(/\s+ou\s+/).map(function (t) { return t.trim(); });
      const m = /^The\s+(.+)$/.exec(b.titre);
      if (m) v.push(m[1]);
      v.forEach(function (t) {
        if (!t || EXCLUS[t]) return;
        if (t.length < 3 && !COURTS_AUTORISES[t]) return;
        items.push({ t: t, id: b.id, maj: t === t.toUpperCase() && /[A-Z]/.test(t) });
      });
    });
    items.sort(function (a, b) { return b.t.length - a.t.length; });      // « PLO/8 » avant « PLO »
    const parCle = {};
    items.forEach(function (i) { parCle[cle(i.t)] = i.id; });
    const G = '(^|[^\\p{L}\\p{N}-])', D = '(?![\\p{L}\\p{N}-])';
    const construire = function (liste, drapeaux) {
      return liste.length ? new RegExp(G + '(' + liste.map(function (i) { return motifTexte(i.t); }).join('|') + ')' + D, drapeaux) : null;
    };
    const reMaj = construire(items.filter(function (i) { return i.maj; }), 'gu');     // sigles : respect de la casse
    const reMin = construire(items.filter(function (i) { return !i.maj; }), 'giu');   // mots : casse indifférente

    return {
      chercher: function (texte) {
        const out = [];
        [reMaj, reMin].forEach(function (re) {
          if (!re) return;
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(texte))) {
            const a = m.index + m[1].length;
            out.push({ a: a, b: a + m[2].length, id: parCle[cle(m[2])] });
            re.lastIndex = a + m[2].length;
          }
        });
        return out;
      },
    };
  }

  // ── Texte d'un élément : renvois, « voir exemples », termes du glossaire ──────
  const RE_EXEMPLES = /\b[Vv]oir (?:les )?exemples?\b/g;

  function texteHtml(texte, renvois, ctx) {
    const marques = [];
    (renvois || []).forEach(function (r) {
      if (ctx.parId[r.cible]) marques.push({ a: r.a, b: r.b, t: 'ref', r: r });
    });
    const libre = function (a, b) { return !marques.some(function (m) { return a < m.b && b > m.a; }); };
    const candidats = [];
    if (ctx.exemplesVers) {
      RE_EXEMPLES.lastIndex = 0;
      let m;
      while ((m = RE_EXEMPLES.exec(texte))) candidats.push({ a: m.index, b: m.index + m[0].length, t: 'ex' });
    }
    if (ctx.glossaire) ctx.glossaire.chercher(texte).forEach(function (g) { candidats.push({ a: g.a, b: g.b, t: 'terme', id: g.id }); });
    candidats.sort(function (x, y) { return x.a - y.a || (y.b - y.a) - (x.b - x.a); });
    let fin = -1;
    candidats.forEach(function (c) {
      if (c.a >= fin && libre(c.a, c.b)) { marques.push(c); fin = c.b; }
    });
    marques.sort(function (x, y) { return x.a - y.a; });

    let html = '', pos = 0;
    marques.forEach(function (m) {
      html += esc(texte.slice(pos, m.a));
      const brut = esc(texte.slice(m.a, m.b));
      if (m.t === 'ref') {
        const r = m.r;
        html += '<a class="td-ref' + (r.verifier ? ' td-ref-verif' : '') + '" href="#' + esc(r.cible + (r.sous ? '/' + r.sous : '')) + '">' + brut + '</a>';
        if (r.verifier) {
          html += '<button class="td-verif" type="button" aria-label="Renvoi à vérifier" data-note="' + esc(r.verifier.note) + '"' +
                  (r.verifier.attendu ? ' data-attendu="' + esc(r.verifier.attendu) + '"' : '') + '>?</button>';
        }
      } else if (m.t === 'ex') {
        html += '<a class="td-ref" href="#' + esc(ctx.exemplesVers) + '/exemples">' + brut + '</a>';
      } else {
        html += '<span class="td-terme" role="button" tabindex="0" data-g="' + esc(m.id) + '">' + brut + '</span>';
      }
      pos = m.b;
    });
    return html + esc(texte.slice(pos));
  }

  // ── Éléments d'un bloc ────────────────────────────────────────────────────────
  function elementsHtml(elements, ctx, blocId) {
    let html = '', puces = false;
    const fermerPuces = function () { if (puces) { html += '</ul>'; puces = false; } };
    (elements || []).forEach(function (e) {
      const corps = texteHtml(e.texte, e.renvois, ctx);
      if (e.t === 'li') {
        if (!puces) { html += '<ul class="td-ul">'; puces = true; }
        html += '<li>' + corps + '</li>';
        return;
      }
      fermerPuces();
      if (e.t === 'pt') {
        html += '<div class="td-pt" id="pt-' + esc(blocId) + '-' + esc(e.n) + '"><span class="td-lab">' + esc(e.n) + ')</span><div>' + corps + '</div></div>';
      } else if (e.t === 'sub') {
        html += '<div class="td-sub"><span class="td-lab">' + esc(e.n) + ')</span><div>' + corps + '</div></div>';
      } else if (e.t === 'note') {
        html += '<p class="td-note"><span class="td-mq" aria-hidden="true">\u25AA</span><span>' + corps + '</span></p>';
      } else if (e.t === 'note2') {
        html += '<p class="td-note td-note-v"><span class="td-mq" aria-hidden="true">\u25C6</span><span>' + corps + '</span></p>';
      } else {
        html += '<p class="td-p">' + corps + '</p>';
      }
    });
    fermerPuces();
    return html;
  }

  // ── Exemples d'illustration d'une règle (repliables) ──────────────────────────
  function exemplesHtml(exemples, ctx) {
    if (!exemples || !exemples.length) return '';
    const sous = Object.assign({}, ctx, { exemplesVers: null });          // pas de « voir exemples » dans un exemple
    return '<section class="td-exemples" id="td-exemples" aria-label="Exemples d\'illustration"><h3 class="td-h3">Exemples d\'illustration</h3>' +
      exemples.map(function (x) {
        return '<details class="td-ex" id="' + esc(x.id) + '"><summary><span class="td-ex-n">Règle ' + esc(x.numero) + '</span>' + esc(x.titre) + '</summary>' +
               '<div class="td-ex-corps">' + elementsHtml(x.data.elements, sous, x.id) + '</div></details>';
      }).join('') + '</section>';
  }

  const API = { esc: esc, creerGlossaire: creerGlossaire, texteHtml: texteHtml, elementsHtml: elementsHtml, exemplesHtml: exemplesHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TDA_RENDU = API;
})(typeof window !== 'undefined' ? window : this);
