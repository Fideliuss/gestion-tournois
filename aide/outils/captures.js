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
window.SB={getSession:async function(){return{user:{id:'u',email:'demo@example.com',user_metadata:{role:'admin',first_name:'Démo',last_name:'Fictif'},app_metadata:{role:'admin'}}}},getRoles:async function(){return[]},signOut:async function(){},
getBreakListPlanning:async function(k){return k==='2026-10'?JSON.parse(JSON.stringify(P)):null},listBreakListPlannings:async function(){return[{mois:'2026-10',updated_at:'2026-10-12T18:05:00.000Z'}]},
saveBreakListPlanning:async function(){},deleteBreakListPlanning:async function(){},getBreakListConfig:async function(){return null},saveBreakListConfig:async function(){}};})();</script>`;

// Base simulée de l'espace Tournois : administrateur, tournois, saison complète, extras ; rien n'est écrit
const BASE_TN = `<script>(function(){var R=${JSON.stringify(SAISON.results)},S=${JSON.stringify(SAISON.sessions)},T=${JSON.stringify(TOURNOIS)},X=${JSON.stringify(EXTRAS)};
var cp=function(o){return JSON.parse(JSON.stringify(o))},nop=async function(){};
window.SB={getSession:async function(){return{user:{id:'u',email:'demo@example.com',user_metadata:{role:'admin',first_name:'Démo',last_name:'Fictif'},app_metadata:{role:'admin'}}}},getRoles:async function(){return[]},signOut:nop,
getResults:async function(){return cp(R)},getResultsByMonth:async function(m){return cp(R.filter(function(r){return r.date.slice(0,7)===m}))},getSessions:async function(){return cp(S)},getSeasonClosures:async function(){return[]},
insertResults:async function(a){return a},insertSession:nop,updateResult:nop,deleteResult:nop,deleteResultsBySession:nop,updateSession:nop,deleteSession:nop,closeSeason:nop,reopenSeason:nop,
getTournaments:async function(){return cp(T)},upsertTournament:nop,deleteTournament:nop,getExtras:async function(){return cp(X)},insertExtra:nop,updateExtra:nop,deleteExtra:nop};})();</script>`;
// Réglages enregistrés dans le navigateur : l'encadrement et les courriers par défaut de l'application contiennent de vrais noms, on les remplace
const SEED_TN = `<script>try{localStorage.setItem('decl_staff',${JSON.stringify(JSON.stringify(STAFF))});localStorage.setItem('courriers_tpl',${JSON.stringify(JSON.stringify(TPL))});localStorage.setItem('extras_emarg_2026_42',${JSON.stringify(JSON.stringify({ x1: { lun: true, mer: true, ven: true }, x2: { lun: true, mar: true, jeu: true }, x3: { mer: true, ven: true, sam: true, dim: true, _hours: { dim: '17:30' } }, x4: { mar: true, mer: true }, x5: { ven: true, sam: true, dim: true }, x6: { lun: true, jeu: true, ven: true }, x7: { mer: true, jeu: true }, _dayHours: { sam: '21:30' } }))});}catch(e){}</script>`;

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

function buildPage(c) {
  let h = fs.readFileSync(path.join(ROOT, c.page), 'utf8');
  h = h.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\s*/, '')
    .replace(/<script src="[^"]*supabase\.js"><\/script>/, function () { return c.page.indexOf('break_list/') === 0 ? BASE : BASE_TN; })
    .replace('<head>', '<head><script>history.replaceState(null,"","/' + c.page + '");</script>' + FIGE + (c.page.indexOf('break_list/') === 0 ? '' : SEED_TN))   // l'adresse reprend le vrai nom de la page : la barre reconnaît l'espace courant
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
