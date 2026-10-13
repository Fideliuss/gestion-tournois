// ══════════════════════════════════════════════════════
//  Règlement TDA - lecture d'un PDF dans le navigateur (pdf.js), puis mise en lignes par tda_analyse.js
//  La bibliothèque pdf.js n'est chargée qu'au moment où un administrateur dépose un PDF (page « Éditions du règlement TDA »).
//  Le PDF reste dans le navigateur : il n'est envoyé nulle part, seul le contenu analysé est enregistré dans la base.
// ══════════════════════════════════════════════════════
const TDA_PDF = (function () {
  const BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const INTEGRITE = 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e';
  let chargement = null;

  function charger() {
    if (window.pdfjsLib) return Promise.resolve();
    if (!chargement) {
      chargement = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = BASE + 'pdf.min.js';
        s.integrity = INTEGRITE;
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = function () { chargement = null; reject(new Error('La bibliothèque de lecture des PDF n\'a pas pu être chargée. Vérifiez la connexion puis recommencez.')); };
        document.head.appendChild(s);
      });
    }
    return chargement;
  }

  // Lit un fichier PDF et renvoie ses lignes, page par page. `onPage(n, total)` informe de l'avancement.
  async function lire(fichier, onPage) {
    await charger();
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.js';
    let doc;
    try { doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) }).promise; }
    catch (e) { throw new Error('Ce fichier n\'est pas un PDF lisible.'); }
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const contenu = await (await doc.getPage(i)).getTextContent();
      pages.push(contenu.items.map(function (it) {
        return { str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || Math.abs(it.transform[3]), f: it.fontName };
      }));
      if (onPage) onPage(i, doc.numPages);
    }
    if (!pages.some(function (p) { return p.some(function (it) { return it.str && it.str.trim(); }); })) {
      throw new Error('Ce PDF ne contient pas de texte (document scanné ?) : il ne peut pas être analysé.');
    }
    return TDA_ANALYSE.lignesDepuisItems(pages);
  }

  return { lire: lire };
})();
