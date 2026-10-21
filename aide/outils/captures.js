// ══════════════════════════════════════════════════════
//  Génération des captures de la page Aide (aide/captures/*.png), avec des données fictives
//
//  Usage (depuis la racine du site) :   node aide/outils/captures.js [nom_de_capture ...]
//  Prérequis : Node et Google Chrome (variable CHROME si l'installation n'est pas à l'emplacement habituel).
//  Principe : un petit serveur local sert le site, chaque page est copiée en `_qa_aide_*.html` avec une base simulée
//  (données de donnees_fictives.js), la date figée au mercredi 14 octobre 2026 à 20 h, puis Chrome sans interface la photographie.
//  Les copies temporaires sont supprimées à la fin. Refaire les captures après toute modification d'un écran décrit dans un guide.
// ══════════════════════════════════════════════════════

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const data = require('./donnees_fictives.js');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'captures');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon', '.webmanifest': 'application/json' };

const PLANNING = data.planning(), OCTIME = data.octimeTsv();

// Espace Tournois : barèmes réels de l'application (aucun nom de personne), saison, extras et courriers fictifs
const TOURNOIS = require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'shared', 'tournaments.js'), 'utf8') + ';TOURNAMENT_DEFAULTS');
const SAISON = data.saison(TOURNOIS), EXTRAS = data.extras(), STAFF = data.encadrement(), TPL = data.courriersGabarits();
const TOTAUX = {};
SAISON.results.forEach(function (r) { TOTAUX[r.player] = (TOTAUX[r.player] || 0) + r.points; });
const PREMIER = Object.keys(TOTAUX).sort(function (a, b) { return TOTAUX[b] - TOTAUX[a]; })[0];
const SESSION_VENDREDI = SAISON.sessions.filter(function (x) { return x.date === '2026-10-09'; })[0];

// Date figée : mercredi 14 octobre 2026, 20 h
const FIGE = `<script>(function(){var R=Date,T=new R(2026,9,14,20,0,0).getTime();function D(){if(!(this instanceof D))return new R(T).toString();var a=[].slice.call(arguments);return a.length?new (Function.prototype.bind.apply(R,[null].concat(a)))():new R(T);}D.prototype=R.prototype;D.now=function(){return T};D.UTC=R.UTC;D.parse=R.parse;window.Date=D;})();</script>`;

// Base simulée : un administrateur, le planning fictif d'octobre 2026, aucun paramètre enregistré (valeurs par défaut)
const BASE = `<script>(function(){var P=${JSON.stringify(PLANNING)};
window.SB={getSession:async function(){return{user:{id:'u',email:'demo@example.com',app_metadata:{role:'admin'},user_metadata:{role:'admin',first_name:'Démo',last_name:'Fictif'},app_metadata:{role:'admin'}}}},getRoles:async function(){return[]},signOut:async function(){},
getBreakListPlanning:async function(k){return k==='2026-10'?JSON.parse(JSON.stringify(P)):null},listBreakListPlannings:async function(){return[{mois:'2026-10',updated_at:'2026-10-12T18:05:00.000Z'}]},
saveBreakListPlanning:async function(){},deleteBreakListPlanning:async function(){},getBreakListConfig:async function(){return null},saveBreakListConfig:async function(){}};})();</script>`;

// Base simulée de l'espace Tournois : administrateur, tournois, saison complète, extras ; rien n'est écrit
const BASE_TN = `<script>(function(){var R=${JSON.stringify(SAISON.results)},S=${JSON.stringify(SAISON.sessions)},T=${JSON.stringify(TOURNOIS)},X=${JSON.stringify(EXTRAS)},ST=${JSON.stringify(STAFF)},PM=${JSON.stringify(REGLAGES_FICTIFS)};
var cp=function(o){return JSON.parse(JSON.stringify(o))},nop=async function(){};
window.SB={getSession:async function(){return{user:{id:'u',email:'demo@example.com',app_metadata:{role:'admin'},user_metadata:{role:'admin',first_name:'Démo',last_name:'Fictif'},app_metadata:{role:'admin'}}}},getRoles:async function(){return[]},signOut:nop,
getResults:async function(){return cp(R)},getResultsByMonth:async function(m){return cp(R.filter(function(r){return r.date.slice(0,7)===m}))},getSessions:async function(){return cp(S)},getSeasonClosures:async function(){return[]},
insertResults:async function(a){return a},insertSession:nop,updateResult:nop,deleteResult:nop,deleteResultsBySession:nop,updateSession:nop,deleteSession:nop,closeSeason:nop,reopenSeason:nop,
getTournaments:async function(){return cp(T)},upsertTournament:nop,deleteTournament:nop,getExtras:async function(){return cp(X)},insertExtra:nop,updateExtra:nop,deleteExtra:nop,getParametre:async function(k){return k==='declaration_encadrement'?cp(ST):null},saveParametre:nop,
getParametres:async function(p){return Object.keys(PM).filter(function(k){return k.indexOf(p)===0}).map(function(k){return{cle:k,valeur:cp(PM[k])}})}};})();</script>`;
// Réglages enregistrés en base (table parametres, voir shared/reglages.js) : les courriers par défaut de l'application n'ont plus de nom de signataire, on met un modèle fictif ; émargement fictif des extras
const REGLAGES_FICTIFS = {
  courriers_modeles: TPL,
  extras_emargement_2026_42: { x1: { lun: true, mer: true, ven: true }, x2: { lun: true, mar: true, jeu: true }, x3: { mer: true, ven: true, sam: true, dim: true, _hours: { dim: '17:30' } }, x4: { mar: true, mer: true }, x5: { ven: true, sam: true, dim: true }, x6: { lun: true, jeu: true, ven: true }, x7: { mer: true, jeu: true }, _dayHours: { sam: '21:30' } },
};

// Espace Training : croupiers fictifs et leurs sessions ; les fonctions de suivi de la base sont recalculées ici à partir des sessions
const TR = data.entrainement();
const isTr = function (c) { return c.page.indexOf('training/') === 0 || c.page === 'admin/config_training.html'; };
const BASE_TR = `<script>(function(){var S=${JSON.stringify(TR.sessions)},U=${JSON.stringify(TR.croupiers)},ME=U[0].id,NOW=new Date(2026,9,14,20,0,0).getTime();
var cp=function(o){return JSON.parse(JSON.stringify(o))},nop=async function(){};
var pct=function(s){return s.total?Math.round(100*s.correct/s.total):0},avg=function(l){return l.length?Math.round(l.reduce(function(a,s){return a+pct(s)},0)/l.length):0};
var of=function(u,g,lv){return S.filter(function(s){return s.user_id===u&&s.game===g&&(!lv||(s.meta&&s.meta.level)===lv)})};
var day=function(iso){var d=new Date(iso);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()};
var WEAK={'roulette-paiement':[['Type de mise','plein',120,12],['Type de mise','cheval',140,31],['Type de mise','transversale',90,28],['Type de mise','carre',75,29],['Type de mise','sixain',80,14]],
 'uth-gains':[['Mise','ante',160,18],['Mise','blind',160,41],['Mise','play',150,22],['Mise','trips',70,17],['Mise','jp1',60,5]]};
window.SB={getSession:async function(){return{user:{id:ME,email:'demo@example.com',app_metadata:{role:'admin'},user_metadata:{role:'admin',first_name:'Démo',last_name:'Fictif'},app_metadata:{role:'admin'}}}},getRoles:async function(){return[]},signOut:nop,
getTrainingConfig:async function(){return null},updateTrainingConfig:nop,startTrainingSession:async function(){return{id:1}},endTrainingSession:nop,addTrainingResult:nop,
getMyTrainingSessions:async function(){return cp(S.filter(function(s){return s.user_id===ME}))},
getTrainingSessionsOf:async function(u,g){return cp(S.filter(function(s){return s.user_id===u&&(!g||s.game===g)}))},
getTrainingActivity:async function(d){return U.map(function(c){var m=S.filter(function(s){return s.user_id===c.id}),p=m.filter(function(s){return NOW-new Date(s.started_at)<=d*86400000});
 var days={};p.forEach(function(s){days[day(s.started_at)]=1});return{user_id:c.id,user_label:c.label,sessions_period:p.length,active_days:Object.keys(days).length,sessions_total:m.length,last_at:m.length?m[0].started_at:null}})},
getTrainingActivityWeekly:async function(w){var out=[],mon=new Date(NOW);mon.setHours(0,0,0,0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
 for(var i=w-1;i>=0;i--){var a=new Date(mon);a.setDate(a.getDate()-7*i);var b=new Date(a);b.setDate(b.getDate()+7);var l=S.filter(function(s){var t=new Date(s.started_at);return t>=a&&t<b}),us={};l.forEach(function(s){us[s.user_id]=1});
  out.push({week_start:a.getFullYear()+'-'+String(a.getMonth()+1).padStart(2,'0')+'-'+String(a.getDate()).padStart(2,'0'),sessions:l.length,users:Object.keys(us).length})}return out},
getTrainingRanking:async function(g,lv,min){var rows=U.map(function(c){var l=of(c.id,g,lv);return l.length?{user_id:c.id,user_label:c.label,sessions:l.length,best_pct:Math.max.apply(null,l.map(pct)),avg_recent:avg(l.slice(0,5)),last_at:l[0].started_at,ranked:l.length>=min}:null}).filter(Boolean);
 return rows.sort(function(a,b){return (b.ranked-a.ranked)||(b.avg_recent-a.avg_recent)})},
getTrainingTablesBest:async function(r){return U.map(function(c){var l=of(c.id,'roulette-tables').filter(function(s){return !r||s.meta.ratio===r});if(!l.length)return null;var ok=l.filter(function(s){return s.correct===s.total});
 return{user_id:c.id,user_label:c.label,best_ms:ok.length?Math.min.apply(null,ok.map(function(s){return s.meta.elapsedMs})):null,perfect_runs:ok.length,sessions:l.length,last_at:l[0].started_at}}).filter(Boolean).sort(function(a,b){return (a.best_ms===null)-(b.best_ms===null)||a.best_ms-b.best_ms})},
getTrainingWeakPoints:async function(g,u){return(WEAK[g]||[]).map(function(r){return{facet:r[0],value:r[1],attempts:r[2],errors:r[3]}})}};})();</script>`;
// Règlement TDA : édition fictive (aucun texte du vrai règlement dans le dépôt public), administrateur ; rien n'est écrit
const isTda = function (c) { return c.page.indexOf('tda/') === 0; };
const BASE_TDA = `<script>(function(){var D=${JSON.stringify(data.tda())};var nop=async function(){};
window.SB={getSession:async function(){return{user:{id:'u',email:'demo@example.com',app_metadata:{role:'admin'},user_metadata:{role:'admin',first_name:'Démo',last_name:'Fictif'},app_metadata:{role:'admin'}}}},getRoles:async function(){return[]},signOut:nop,
getTdaActive:async function(){return JSON.parse(JSON.stringify({edition:D.edition,blocs:D.blocs}))}};})();</script>`;
// Tirage aléatoire fixé (graine propre à chaque capture) : les questions affichées sont toujours les mêmes
const SEED = function (n) { return `<script>(function(){var a=${n};Math.random=function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();</script>`; };

const coller = function (txt) { return `var ta=document.getElementById('octime-paste');ta.value=${JSON.stringify(txt)};ta.dispatchEvent(new Event('input'));`; };
const COLLER = coller(OCTIME);
// extraction avec deux anomalies : arrêtée un samedi (et non le dimanche attendu) et un nom écrit autrement que dans le planning
const COLLER_ANOMALIES = coller(OCTIME.replace(/18\/10\/2026/g, '17/10/2026').replace('MARCHAL LEA', 'MARCHAL DUVAL LEA'));
// planning à importer : trois cases changées par rapport à celui enregistré et un code inconnu
const IMPORT = "var np=JSON.parse(JSON.stringify(plan));np.rows[2].codes[14]='CP';np.rows[5].codes[20]='M';np.rows[9].codes[3]='20:55';np.rows[7].codes[25]='TT';pending={planning:np,old:plan};render();";
const SEULE_CARTE = function (sel) { return sel + '{display:none!important}'; };
const MASQUER_BARRE = 'header.nav{display:none!important} .bl-toast{display:none!important} *{transition:none!important}';
const FEUILLE = '.bl-toast{display:none!important} .app{padding:12px!important;background:#222!important} .hdr,.bl-part,header.nav{display:none!important} body{background:#222!important}';

// nom, page, taille de la fenêtre, actions (exécutées après le chargement), CSS ajouté
const CAPTURES = [
  { nom: 'bl_barre', page: 'break_list/break_list.html', w: 1400, h: 235, actions: '', css: '' },
  { nom: 'bl_seance', page: 'break_list/break_list.html', w: 1180, h: 1010, actions: '', css: MASQUER_BARRE },
  { nom: 'bl_recto', page: 'break_list/break_list.html', w: 1140, h: 745, actions: "document.getElementById('bl-print').hidden=false;", css: FEUILLE + ' #bl-print{max-width:none!important} #bl-print .bl-page:nth-child(2){display:none!important}' },
  { nom: 'bl_verso', page: 'break_list/break_list.html', w: 1140, h: 762, actions: "document.getElementById('bl-print').hidden=false;", css: FEUILLE + ' #bl-print{max-width:none!important} #bl-print .bl-page:nth-child(1){display:none!important}' },
  { nom: 'bl_departs', page: 'break_list/break_list.html', w: 1180, h: 900, actions: COLLER + "setTimeout(function(){showPart('departs')},600);", css: MASQUER_BARRE },
  { nom: 'bl_feuille_departs', page: 'break_list/break_list.html', w: 860, h: 500, actions: COLLER, css: FEUILLE + ' #dep-print{display:block!important;max-width:794px;margin:0 auto}' },
  // Planning
  { nom: 'bl_planning', page: 'break_list/planning.html', w: 1280, h: 760, actions: '', css: MASQUER_BARRE },
  { nom: 'bl_planning_import', page: 'break_list/planning.html', w: 1280, h: 670, actions: IMPORT, css: MASQUER_BARRE + SEULE_CARTE('#plan-card') },
  // Présents et absents de la séance
  { nom: 'bl_ajout', page: 'break_list/break_list.html', w: 1180, h: 760, actions: '', css: MASQUER_BARRE + SEULE_CARTE('#part-breaklist > .card:first-child') + SEULE_CARTE('#abs-box') + ' .hdr{display:none!important}' },
  { nom: 'bl_absents', page: 'break_list/break_list.html', w: 1180, h: 390, actions: "document.getElementById('abs-box').open=true;", css: MASQUER_BARRE + SEULE_CARTE('#part-breaklist > .card:not(.bl-abs)') + ' .hdr{display:none!important}' },
  // Départs
  { nom: 'bl_extraction', page: 'break_list/break_list.html', w: 1180, h: 430, actions: COLLER_ANOMALIES + "setTimeout(function(){showPart('departs')},600);", css: MASQUER_BARRE + SEULE_CARTE('#part-departs > .card:nth-child(2)') + ' .hdr{display:none!important}' },
  { nom: 'bl_departs_main', page: 'break_list/break_list.html', w: 1180, h: 480, actions: COLLER + "setTimeout(function(){showPart('departs');var q=function(i){document.querySelectorAll('#rep-out li')[i].click()};setTimeout(function(){q(0);setTimeout(function(){q(8);setTimeout(function(){q(3)},250)},250)},300)},600);", css: MASQUER_BARRE + SEULE_CARTE('#part-departs > .card:first-child') + ' .hdr{display:none!important}' },
  // Paramètres
  { nom: 'bl_param_equipe', page: 'break_list/parametres.html', w: 1180, h: 1075, actions: '', css: MASQUER_BARRE },
  { nom: 'bl_param_absences', page: 'break_list/parametres.html', w: 1180, h: 580, actions: '', css: MASQUER_BARRE + SEULE_CARTE('#pm-equipe > .card:nth-child(-n+2)') + SEULE_CARTE('#pm-tabs') + SEULE_CARTE('.hdr') },
  { nom: 'bl_param_barre', page: 'break_list/parametres.html', w: 1180, h: 420, actions: "showTab('soiree');var i=document.getElementById('cf-stackers');i.value=6;i.dispatchEvent(new Event('input',{bubbles:true}));", css: MASQUER_BARRE + SEULE_CARTE('.hdr') + SEULE_CARTE('#pm-tabs') + SEULE_CARTE('.pm-foot') + SEULE_CARTE('#pm-soiree > .card:nth-child(n+2)') },
  { nom: 'bl_param_seance', page: 'break_list/parametres.html', w: 1180, h: 1260, actions: "showTab('soiree');", css: MASQUER_BARRE },
  { nom: 'bl_param_feuilles', page: 'break_list/parametres.html', w: 1180, h: 1500, actions: "showTab('feuilles');", css: MASQUER_BARRE },
];

// ── Espace Tournois ──
const NU = 'header.nav{display:none!important} *{transition:none!important} .decl-toast{display:none!important}';   // sans la barre de navigation
const PP = "applyPreset('friday-highstack');";
const SAISIR = "showTab('saisir');setTimeout(function(){onDateChange();setTimeout(function(){var n=['ARNAUD ADRIEN','BERTRAND CLEMENT','CHEVALIER DAMIEN','DELMAS EMILIE','ESTEVE FABIEN'];n.forEach(function(v,i){document.getElementById('player-'+(i+1)).value=v});document.getElementById('inp-entrees').value=64;updateCagnotte();},500)},400);";
const CAPTURES_TN = [
  { nom: 'tn_accueil', page: 'tournois.html', w: 1400, h: 330, actions: '', css: '*{transition:none!important}' },
  { nom: 'tn_menu_admin', page: 'prize_pool/prize_pool.html', w: 1400, h: 440, actions: "Array.prototype.find.call(document.querySelectorAll('nav.nav-items button'),function(b){return /Administration/.test(b.textContent)}).click();", css: '*{transition:none!important}' },
  // Prize Pool
  { nom: 'pp_choix', page: 'prize_pool/prize_pool.html', w: 1180, h: 640, actions: PP, css: NU + SEULE_CARTE('.card-print') },
  { nom: 'pp_tournoi', page: 'prize_pool/prize_pool.html', w: 1180, h: 1080, actions: PP + "suggest();", css: NU + SEULE_CARTE('.pp-presets-card') + SEULE_CARTE('.app > .card:not(.card-print):not(.pp-presets-card)') },
  { nom: 'pp_restant', page: 'prize_pool/prize_pool.html', w: 1180, h: 820, actions: PP + "clearAmounts();[1500,1100,850,650,500,400,300,250].forEach(function(v,i){document.getElementById('amt-'+(i+1)).value=v;onAmountChange(i+1,v)});", css: NU + SEULE_CARTE('.pp-presets-card') + SEULE_CARTE('.app > .card:not(.card-print):not(.pp-presets-card)') + SEULE_CARTE('.card-print .igrid-2') + SEULE_CARTE('.tog-row') + SEULE_CARTE('.suggest-row') },
  // Challenge saisonnier
  { nom: 'lb_classement', page: 'leaderboard/leaderboard.html', w: 1180, h: 1100, actions: '', css: NU },
  { nom: 'lb_saisir', page: 'leaderboard/leaderboard.html', w: 1180, h: 1120, actions: SAISIR, css: NU },
  { nom: 'lb_doublon', page: 'leaderboard/leaderboard.html', w: 1180, h: 560, actions: "showTab('saisir');setTimeout(function(){document.getElementById('inp-date').value='2026-10-09';onDateChange();setTimeout(function(){window.scrollTo(0,0)},800)},400);", css: NU + SEULE_CARTE('.hdr') },
  { nom: 'lb_historique', page: 'leaderboard/leaderboard.html', w: 1180, h: 1250, actions: "showTab('historique');setTimeout(function(){toggleCalSession(" + SESSION_VENDREDI.id + ")},700);", css: NU },
  { nom: 'lb_ranking', page: 'leaderboard/leaderboard.html', w: 1400, h: 820, actions: "showTab('ranking');", css: NU },
  { nom: 'lb_joueur', page: 'leaderboard/leaderboard.html', w: 1180, h: 760, actions: "openPlayerModal(" + JSON.stringify(PREMIER) + ");", css: NU },
  { nom: 'lb_saison', page: 'leaderboard/leaderboard.html', w: 1180, h: 820, actions: "setTimeout(function(){openCloseSeason()},600);", css: NU },
  // Administration : déclarations
  { nom: 'ad_declaration', page: 'admin/declaration/declaration.html', w: 1280, h: 900, actions: '', css: NU },
  { nom: 'ad_decl_extras', page: 'admin/declaration/declaration.html', w: 1280, h: 760, actions: "showDeclaration('extras');", css: NU },
  { nom: 'ad_decl_reglages', page: 'admin/declaration/declaration.html', w: 1280, h: 640, actions: "openView('cfg');", css: NU },
  { nom: 'ad_decl_encadrement', page: 'admin/declaration/declaration.html', w: 1280, h: 780, actions: "openView('cfg');showDeclTab('encadrement');", css: NU },
  { nom: 'ad_decl_annexes', page: 'admin/declaration/declaration.html', w: 1280, h: 900, actions: "openView('cfg');showDeclTab('annexes');", css: NU },
  { nom: 'ad_decl_adhoc', page: 'admin/declaration/declaration.html', w: 1280, h: 1060, actions: "openView('adhoc');document.getElementById('adhoc-date').value='2026-11-14';document.getElementById('adhoc-cave').value=200;document.getElementById('adhoc-annexe').value=4;addAdhoc();document.getElementById('exc-date').value='2026-11-20';onExcDateChange();applyException();", css: NU },
  // Administration : courriers
  { nom: 'ad_courrier', page: 'admin/declaration/courriers.html', w: 1180, h: 560, actions: '', css: NU + '.letter-preview-wrap{display:none!important}' },
  { nom: 'ad_courrier_reglages', page: 'admin/declaration/courriers.html', w: 1180, h: 1010, actions: "toggleTplPanel();", css: NU + '.letter-preview-wrap{display:none!important}' },
  { nom: 'ad_courrier_annul', page: 'admin/declaration/courriers.html', w: 1180, h: 900, actions: "selectDocType('annulation');['2026-11-17','2026-11-24'].forEach(function(d){document.getElementById('annul-date-input').value=d;addAnnulDate()});document.getElementById('annul-motif').value='de travaux prévus dans la salle de poker';renderAnnulation();", css: NU + '.letter-preview-wrap{display:none!important}' },
  // Administration : extras
  { nom: 'ad_extras_liste', page: 'admin/extras/extras.html', w: 1180, h: 800, actions: '', css: NU },
  { nom: 'ad_extras_emarg', page: 'admin/extras/extras.html', w: 1180, h: 900, actions: "showTab('emargement');", css: NU + '#emarg-output{display:none!important}' },
  // Administration : calendrier et barèmes
  { nom: 'ad_calendrier', page: 'admin/config_tournois.html', w: 1280, h: 820, actions: '', css: NU },
  { nom: 'ad_calendrier_form', page: 'admin/config_tournois.html', w: 1180, h: 760, actions: "editTournament('friday-highstack');", css: NU },
];
CAPTURES.push.apply(CAPTURES, CAPTURES_TN);

// ── Espace Training ──
// Questions : pas d'enchaînement automatique après une réponse, chronomètres figés à leur valeur de départ
const FIGER = "var _st=window.setTimeout;window.setTimeout=function(f,t){return(t===700||t===800||t===900||t===1000||t===1400||t===1700||t===1800)?0:_st(f,t)};window.setInterval=function(){return 0};";
const CAPTURES_TR = [
  { nom: 'tr_accueil', page: 'training/training.html', w: 1400, h: 900, actions: '', css: '*{transition:none!important}' },
  // Black Jack
  { nom: 'tr_bj_paiement', page: 'training/blackjack/blackjack.html', w: 900, h: 660, actions: "document.getElementById('answer-input').value='225';", css: NU },
  { nom: 'tr_bj_faux', page: 'training/blackjack/blackjack.html', w: 900, h: 660, actions: FIGER + "document.getElementById('answer-input').value='10';submitAnswer();", css: NU },
  { nom: 'tr_bj_bilan', page: 'training/blackjack/blackjack.html', w: 900, h: 460, actions: "_correct=8;_qIndex=10;showSummary();", css: NU },
  { nom: 'tr_bjs_niveaux', page: 'training/blackjack/blackjack_score.html', w: 900, h: 460, actions: '', css: NU },
  { nom: 'tr_bjs_question', page: 'training/blackjack/blackjack_score.html', w: 900, h: 520, actions: FIGER + "startWithLevel('medium');setTimeout(function(){document.getElementById('answer-input').value='18'},500);", css: NU },
  // Roulette : calculs
  { nom: 'tr_rp_niveaux', page: 'training/roulette/roulette_paiement.html', w: 900, h: 340, actions: '', css: NU },
  { nom: 'tr_rp_question', page: 'training/roulette/roulette_paiement.html', w: 900, h: 980, actions: FIGER + "startPaiementLevel('medium');", css: NU, seed: 11 },
  { nom: 'tr_rp_faux', page: 'training/roulette/roulette_paiement.html', w: 900, h: 1060, actions: FIGER + "startPaiementLevel('medium');setTimeout(function(){document.getElementById('rp-answer-input').value='3';submitPaiement()},500);", css: NU, seed: 11 },
  { nom: 'tr_rc_valeur', page: 'training/roulette/roulette_conversion.html', w: 900, h: 460, actions: '', css: NU },
  { nom: 'tr_rc_question', page: 'training/roulette/roulette_conversion.html', w: 900, h: 700, actions: FIGER + "selectChipValue(5);setTimeout(function(){startConversionLevel('medium');setTimeout(function(){document.getElementById('cv-answer-input').value='60'},500)},500);", css: NU },
  { nom: 'tr_rt_choix', page: 'training/roulette/roulette_tables.html', w: 900, h: 460, actions: '', css: NU },
  { nom: 'tr_rt_carte', page: 'training/roulette/roulette_tables.html', w: 900, h: 560, actions: FIGER + "selectTable(35);setTimeout(function(){var q=document.getElementById('tb-question').textContent.split(String.fromCharCode(215));document.getElementById('tb-answer-input').value=parseInt(q[0])*parseInt(q[1]);},500);", css: NU },
  { nom: 'tr_rt_reponse', page: 'training/roulette/roulette_tables.html', w: 900, h: 560, actions: FIGER + "selectTable(35);setTimeout(function(){var q=document.getElementById('tb-question').textContent.split(String.fromCharCode(215));document.getElementById('tb-answer-input').value=parseInt(q[0])*parseInt(q[1]);submitTables()},500);", css: NU },
  // Roulette : le tapis
  { nom: 'tr_rpt_question', page: 'training/roulette/roulette_pointage.html', w: 900, h: 640, actions: FIGER + "startPointageLevel('medium');", css: NU, seed: 5 },
  { nom: 'tr_rcol_question', page: 'training/roulette/roulette_couleur.html', w: 900, h: 560, actions: FIGER + "startCouleurLevel('medium');", css: NU, seed: 12 },
  // Ultimate Texas Hold'em
  { nom: 'tr_uth_main', page: 'training/uth/uth_main.html', w: 900, h: 940, actions: '', css: NU, seed: 3 },
  { nom: 'tr_uth_main_reponse', page: 'training/uth/uth_main.html', w: 900, h: 1080, actions: FIGER + "setTimeout(function(){umAnswer(2)},500);", css: NU, seed: 3 },
  { nom: 'tr_uth_gagnant', page: 'training/uth/uth_gagnant.html', w: 900, h: 920, actions: FIGER + "setTimeout(function(){ugPickQualified(true)},500);", css: NU, seed: 9 },
  { nom: 'tr_uth_gains', page: 'training/uth/uth_gains.html', w: 900, h: 940, actions: '', css: NU, seed: 4 },
  { nom: 'tr_uth_gains_mise', page: 'training/uth/uth_gains.html', w: 900, h: 940, actions: "setTimeout(function(){ucOpen(ucBets()[0].bet)},500);", css: NU, seed: 4 },
  // Suivi
  { nom: 'tr_resultats', page: 'training/suivi/suivi_croupier.html', w: 1180, h: 960, actions: '', css: NU },
  { nom: 'tr_resultats_module', page: 'training/suivi/suivi_croupier.html', w: 1180, h: 1100, actions: "location.hash='#roulette/roulette-tables';", css: NU },
  { nom: 'tr_equipe_classement', page: 'training/suivi/suivi_manager.html', w: 1180, h: 760, actions: '', css: NU },
  { nom: 'tr_equipe_progression', page: 'training/suivi/suivi_manager.html', w: 1180, h: 1000, actions: "svmGo('progression');", css: NU },
  { nom: 'tr_equipe_faibles', page: 'training/suivi/suivi_manager.html', w: 1180, h: 760, actions: "svmGo('faibles');", css: NU },
  { nom: 'tr_equipe_activite', page: 'training/suivi/suivi_manager.html', w: 1180, h: 960, actions: "svmGo('activite');", css: NU },
  // Configuration des modules
  { nom: 'tr_config_bj', page: 'admin/config_training.html', w: 1180, h: 950, actions: '', css: NU },
  { nom: 'tr_config_roulette', page: 'admin/config_training.html', w: 1180, h: 1080, actions: "location.hash='#roulette';", css: NU },
  { nom: 'tr_config_uth', page: 'admin/config_training.html', w: 1180, h: 520, actions: "location.hash='#uth';", css: NU },
];
CAPTURES.push.apply(CAPTURES, CAPTURES_TR);

// ── Règlement TDA (texte fictif) ──
const CAPTURES_TDA = [
  { nom: 'tda_sommaire', page: 'tda/tda.html', w: 1180, h: 760, actions: '', css: '*{transition:none!important}' },
  { nom: 'tda_regle', page: 'tda/tda.html', w: 1180, h: 800, actions: "location.hash='#r3';", css: NU },
  { nom: 'tda_terme', page: 'tda/tda.html', w: 1180, h: 470, actions: "location.hash='#r2';setTimeout(function(){document.querySelector('.td-terme').click()},500);", css: NU },
  { nom: 'tda_renvoi', page: 'tda/tda.html', w: 1180, h: 470, actions: "location.hash='#r4';setTimeout(function(){document.querySelector('.td-verif').click()},500);", css: NU },
  { nom: 'tda_recherche', page: 'tda/tda.html', w: 1180, h: 760, actions: "location.hash='#q=exemple';var q=document.getElementById('td-q');q.value='exemple';", css: NU },
  { nom: 'tda_glossaire', page: 'tda/tda.html', w: 1180, h: 560, actions: "location.hash='#glossaire';", css: NU },
  { nom: 'tda_mobile', page: 'tda/tda.html', w: 390, h: 820, actions: "location.hash='#r3';", css: NU },
];
CAPTURES.push.apply(CAPTURES, CAPTURES_TDA);

function buildPage(c) {
  let h = fs.readFileSync(path.join(ROOT, c.page), 'utf8');
  h = h.replace(/<script src="(?:\.\.\/)*shared\/vendor\/supabase_js\.js"><\/script>\s*/, '')
    .replace(/<script src="[^"]*supabase\.js"><\/script>/, function () { return c.page.indexOf('break_list/') === 0 ? BASE : isTr(c) ? BASE_TR : isTda(c) ? BASE_TDA : BASE_TN; })
    .replace('<head>', '<head><script>history.replaceState(null,"","/' + c.page + '");</script>' + FIGE + (c.page.indexOf('break_list/') === 0 || isTda(c) ? '' : isTr(c) ? SEED(c.seed || 7) : ''))   // l'adresse reprend le vrai nom de la page : la barre reconnaît l'espace courant
    .replace('</head>', '<style>' + c.css + '</style></head>')
    .replace('</body>', '<script>window.addEventListener("load",function(){setTimeout(function(){' + c.actions + '},900)});</script></body>');
  const file = path.join(path.dirname(path.join(ROOT, c.page)), '_qa_aide_' + c.nom + '.html');
  fs.writeFileSync(file, h);
  return file;
}

const server = http.createServer(function (req, res) {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

/** Lance Chrome sans interface (asynchrone : le serveur local doit pouvoir répondre pendant ce temps) ; échoue après 60 s */
function photographier(url, png, w, h) {
  return new Promise(function (resolve) {
    const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--lang=fr-FR', '--force-device-scale-factor=1', '--window-size=' + w + ',' + h,
      '--virtual-time-budget=9000', '--screenshot=' + png, url], { stdio: 'ignore' });
    const t = setTimeout(function () { p.kill(); resolve(false); }, 60000);
    p.on('exit', function (code) { clearTimeout(t); resolve(code === 0 && fs.existsSync(png)); });
    p.on('error', function () { clearTimeout(t); resolve(false); });
  });
}

server.listen(0, '127.0.0.1', async function () {
  const port = server.address().port, voulues = process.argv.slice(2), temp = [];
  fs.mkdirSync(OUT, { recursive: true });
  const liste = CAPTURES.filter(function (c) { return !voulues.length || voulues.indexOf(c.nom) >= 0; });
  for (const c of liste) {
    const file = buildPage(c); temp.push(file);
    const ok = await photographier('http://127.0.0.1:' + port + '/' + path.relative(ROOT, file).split(path.sep).join('/'), path.join(OUT, c.nom + '.png'), c.w, c.h);
    console.log((ok ? 'ok      ' : 'ÉCHEC   ') + c.nom);
  }
  temp.forEach(function (f) { fs.unlinkSync(f); });
  server.close();
});
