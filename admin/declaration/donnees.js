/* ═══════════════════════════════════════════════════════
   donnees.js - Données communes à Déclarations et Courriers
   Valeurs par défaut, clés des réglages en base (table parametres, voir shared/reglages.js) et lectures.
   Chargé après shared/reglages.js, avant declaration.js et courriers.js. Les écritures restent dans declaration.js (seule page qui
   modifie ces réglages) et courriers.js (modèles de courriers).

   Clés : declaration_config, declaration_annexes, declaration_adhoc_AAAA_M, declaration_exc_AAAA_M, courriers_modeles
   (et declaration_encadrement, géré à part dans declaration.js). Anciennes copies locales reprises une fois : DECL_ADOPTIONS.
═══════════════════════════════════════════════════════ */

const DECL_PREFIXE      = 'declaration_';
const COURRIERS_PREFIXE = 'courriers_';

/* Reprise de l'ancienne copie locale du poste si la base n'a pas encore la clé (jamais supprimée ici) */
const DECL_ADOPTIONS = [
  { locale: 'decl_cfg',      cle: 'declaration_config' },
  { locale: 'decl_annexes',  cle: 'declaration_annexes' },
  { locale: /^decl_adhoc_(\d{4})_(\d{1,2})$/, cle: m => `declaration_adhoc_${m[1]}_${m[2]}` },
  { locale: /^decl_exc_(\d{4})_(\d{1,2})$/,   cle: m => `declaration_exc_${m[1]}_${m[2]}` },
];
const COURRIERS_ADOPTIONS = [
  { locale: 'courriers_tpl', cle: 'courriers_modeles' },
];

const CFG_DEFAULT = {
  0: { actif: true,  heure: '17:00', cave: 78,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 4' },
  1: { actif: true,  heure: '21:00', cave: 60,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 5' },
  2: { actif: true,  heure: '21:00', cave: 78,  joueurs: 150, rachats: true,  bounty: 25, annexe: 'ANNEXE 4' },
  3: { actif: true,  heure: '21:00', cave: 56,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 1' },
  4: { actif: true,  heure: '21:00', cave: 45,  joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 2' },
  5: { actif: true,  heure: '21:00', cave: 125, joueurs: 150, rachats: true,  bounty: 0,  annexe: 'ANNEXE 3' },
  6: { actif: false, heure: '21:00', cave: 0,   joueurs: 150, rachats: false, bounty: 0,  annexe: '' },
};

const DIST_STD = [33, 20, 13, 9, 7, 5, 4, 3, 3, 3];

const ANNEXES_DEFAULT = [
  { id: 'a1', nom: 'ANNEXE 1', joueurs: 150, cave: 56,  dist: [...DIST_STD] },
  { id: 'a2', nom: 'ANNEXE 2', joueurs: 150, cave: 45,  dist: [...DIST_STD] },
  { id: 'a3', nom: 'ANNEXE 3', joueurs: 150, cave: 125, dist: [...DIST_STD] },
  { id: 'a4', nom: 'ANNEXE 4', joueurs: 150, cave: 78,  dist: [...DIST_STD] },
  { id: 'a5', nom: 'ANNEXE 5', joueurs: 150, cave: 60,  dist: [...DIST_STD] },
];

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

/* Lectures : sur la copie en mémoire de REGLAGES (appeler REGLAGES.charger avant le premier affichage) */
function loadCfg()      { return REGLAGES.lire('declaration_config',  CFG_DEFAULT); }
function loadAnnexes()  { return REGLAGES.lire('declaration_annexes', ANNEXES_DEFAULT); }

/* Tournois ad hoc et exceptions ponctuelles : une clé par mois */
function adhocKey(m, y) { return `declaration_adhoc_${y}_${m}`; }
function excKey(m, y)   { return `declaration_exc_${y}_${m}`; }
function loadAdhoc(m, y) { return REGLAGES.lire(adhocKey(m, y), []); }
function loadExc(m, y)   { return REGLAGES.lire(excKey(m, y), {}); }
