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

// Date figée : mercredi 14 octobre 2026, 20 h
const FIGE = `<script>(function(){var R=Date,T=new R(2026,9,14,20,0,0).getTime();function D(){if(!(this instanceof D))return new R(T).toString();var a=[].slice.call(arguments);return a.length?new (Function.prototype.bind.apply(R,[null].concat(a)))():new R(T);}D.prototype=R.prototype;D.now=function(){return T};D.UTC=R.UTC;D.parse=R.parse;window.Date=D;})();</script>`;

// Base simulée : un administrateur, le planning fictif d'octobre 2026, aucun paramètre enregistré (valeurs par défaut)
const BASE = `<script>(function(){var P=${JSON.stringify(PLANNING)};
window.SB={getSession:async function(){return{user:{id:'u',email:'demo@example.com',user_metadata:{role:'admin',first_name:'Démo',last_name:'Fictif'},app_metadata:{role:'admin'}}}},getRoles:async function(){return[]},signOut:async function(){},
getBreakListPlanning:async function(k){return k==='2026-10'?JSON.parse(JSON.stringify(P)):null},listBreakListPlannings:async function(){return[{mois:'2026-10',updated_at:'2026-10-12T18:05:00.000Z'}]},
saveBreakListPlanning:async function(){},deleteBreakListPlanning:async function(){},getBreakListConfig:async function(){return null},saveBreakListConfig:async function(){}};})();</script>`;

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

function buildPage(c) {
  let h = fs.readFileSync(path.join(ROOT, c.page), 'utf8');
  h = h.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\s*/, '')
    .replace(/<script src="[^"]*supabase\.js"><\/script>/, BASE)
    .replace('<head>', '<head><script>history.replaceState(null,"","/' + c.page + '");</script>' + FIGE)   // l'adresse reprend le vrai nom de la page : la barre reconnaît l'espace courant
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
    const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=' + w + ',' + h,
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
