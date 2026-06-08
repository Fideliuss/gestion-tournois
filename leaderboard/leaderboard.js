// ══════════════════════════════════════════════════════
//  TOURNOIS PAR DÉFAUT
// ══════════════════════════════════════════════════════
/* Les tournois par défaut et TournamentsStore sont définis dans shared/tournaments.js */

// ══════════════════════════════════════════════════════
//  FILE SYSTEM — wrapper leaderboard (via BarriereFS)
// ══════════════════════════════════════════════════════
const FS = {
  fileName: 'barriere_data.json',
  get connected() { return BarriereFS.connected; },
  async read() {
    const fb = { version:1, results:[], sessions:[], tournaments:null };
    if (!BarriereFS.connected) {
      try { return JSON.parse(localStorage.getItem('barriere_fallback')) || fb; } catch { return fb; }
    }
    return BarriereFS.read(this.fileName, fb);
  },
  async write(data) {
    if (!BarriereFS.connected) { localStorage.setItem('barriere_fallback', JSON.stringify(data)); return; }
    await BarriereFS.write(this.fileName, data);
  },
};

// ══════════════════════════════════════════════════════
//  ACCÈS AUX DONNÉES
// ══════════════════════════════════════════════════════
async function getData()         { return await FS.read(); }
async function setData(d)        { await FS.write(d); }
async function getResults()      { return (await getData()).results   || []; }
async function getSessions()     { return (await getData()).sessions  || []; }
async function saveResults(r)    { const d=await getData(); d.results  =r; await setData(d); }
async function saveSessions(s)   { const d=await getData(); d.sessions =s; await setData(d); }
async function totalCagnotte()   { return (await getSessions()).reduce((a,s)=>a+(s.cagnotte||0),0); }

async function getTournaments()    { return TournamentsStore.read(); }
async function saveTournaments(t)  { await TournamentsStore.write(t); _tournamentsCache = t; }

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
async function init() {
  document.getElementById('inp-date').value = new Date().toISOString().split('T')[0];
  await BarriereFS.restore();
  await populateTournoiSelects();
  await renderClassement();
}

async function connectFolder() { await BarriereFS.connect(); await renderClassement(); }

async function populateTournoiSelects() {
  const tournaments = await getTournaments();
  const sel  = document.getElementById('inp-tournoi');
  const selH = document.getElementById('filter-tournoi-hist');
  sel.innerHTML  = '<option value="">— Choisir —</option>';
  selH.innerHTML = '<option value="">Tous les tournois</option>';
  tournaments.forEach(t => {
    sel.appendChild( new Option(`${t.day} — ${t.name} (${t.buyin}€)`, t.id));
    selH.appendChild(new Option(t.name, t.id));
  });
}

// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
const TAB_NAMES = ['classement','saisir','historique','ranking','config'];
async function showTab(name) {
  TAB_NAMES.forEach(t => {
    document.getElementById('tab-'+t).style.display = t===name?'block':'none';
  });
  document.querySelectorAll('.tab').forEach((el,i) => {
    el.classList.toggle('active', TAB_NAMES[i]===name);
  });
  if (name==='classement') await renderClassement();
  if (name==='historique') await renderHistorique();
  if (name==='ranking')    await renderRankingDoc();
  if (name==='config')     await renderConfigTournois();
}

// ══════════════════════════════════════════════════════
//  SAISIE
// ══════════════════════════════════════════════════════
async function checkDuplicate() {
  const date=document.getElementById('inp-date').value;
  const tid =document.getElementById('inp-tournoi').value;
  const el  =document.getElementById('alert-dup');
  if (!date||!tid) { el.style.display='none'; return; }
  const sessions=await getSessions();
  const dup=sessions.find(s=>s.date===date&&s.tournamentId===tid);
  if (dup) {
    el.innerHTML=`⚠️ <strong>Doublon détecté</strong> — ${await getTName(tid)} du ${fmtDate(date)} a déjà été saisi (${dup.nbResults} résultats, ${dup.entries} entrées).`;
    el.style.display='block';
  } else { el.style.display='none'; }
}

function onTournoiChange() { checkDuplicate(); buildPlacementRows(); }

function updateCagnotte() {
  const n=parseInt(document.getElementById('inp-entrees').value)||0;
  const box=document.getElementById('cagnotte-box');
  if (n>0) { box.style.display='flex'; document.getElementById('cagnotte-value').textContent=`${(n*2).toLocaleString('fr-FR')} €`; }
  else { box.style.display='none'; }
}

async function refreshPlayersDl() {
  const results=await getResults();
  const names=[...new Set(results.map(r=>r.player))].sort();
  document.getElementById('players-dl').innerHTML=names.map(n=>`<option value="${n}">`).join('');
}

let currentPlaceCount = 0;

// ── État accordion historique ──
let _histExpandedIds  = new Set();   // sessions actuellement ouvertes
let _histResultsCache = null;        // cache résultats pour édition inline

async function buildPlacementRows() {
  const tid        =document.getElementById('inp-tournoi').value;
  const placeholder=document.getElementById('placement-placeholder');
  const section    =document.getElementById('placement-section');
  const rowsEl     =document.getElementById('placement-rows');
  if (!tid) { placeholder.style.display='block'; section.style.display='none'; return; }
  const tournaments=await getTournaments();
  const t=tournaments.find(t=>t.id===tid);
  placeholder.style.display='none'; section.style.display='block';
  refreshPlayersDl();
  currentPlaceCount = t.points.length;
  rowsEl.innerHTML = t.points.map((pts,i) => buildStandardRow(i+1, pts)).join('');
  setTimeout(()=>{ const f=document.getElementById('player-1'); if(f)f.focus(); },50);
}

function buildStandardRow(place, pts) {
  const pClass = place===1?'p1':place===2?'p2':place===3?'p3':'';
  const next   = place+1;
  return `<div class="placement-row" id="row-${place}">
    <div class="place-num ${pClass}">${place}</div>
    <input type="text" id="player-${place}" placeholder="Nom du joueur…" list="players-dl" autocomplete="off"
      onkeydown="if(event.key==='Enter'){const n=document.getElementById('player-${next}');if(n)n.focus();}" />
    <div class="pts-chip">+${pts}</div>
  </div>`;
}

function addExtraPlace() {
  const tid=document.getElementById('inp-tournoi').value;
  if (!tid) return;
  currentPlaceCount++;
  const place = currentPlaceCount;
  const rowsEl=document.getElementById('placement-rows');
  const div=document.createElement('div');
  div.className='placement-row extra-row';
  div.id='row-'+place;
  div.innerHTML=`
    <div class="place-num extra">${place}</div>
    <input type="text" id="player-${place}" placeholder="Nom du joueur…" list="players-dl" autocomplete="off" />
    <input type="number" class="pts-input-extra" id="pts-${place}" placeholder="pts" min="0" />
  `;
  rowsEl.appendChild(div);
  setTimeout(()=>{ const f=document.getElementById('player-'+place); if(f)f.focus(); },30);
}

async function validateTournament() {
  const date   =document.getElementById('inp-date').value;
  const tid    =document.getElementById('inp-tournoi').value;
  const entries=parseInt(document.getElementById('inp-entrees').value)||0;
  const warnEl =document.getElementById('alert-warn');
  const succEl =document.getElementById('alert-success');
  warnEl.style.display='none'; succEl.style.display='none';

  if (!date||!tid) { warnEl.innerHTML='⚠ Sélectionne une date et un type de tournoi.'; warnEl.style.display='flex'; return; }

  // Blocage doublon
  const allSessions=await getSessions();
  const dup=allSessions.find(s=>s.date===date&&s.tournamentId===tid);
  if (dup) {
    warnEl.innerHTML=`⛔ <strong>Doublon bloqué</strong> — ${await getTName(tid)} du ${fmtDate(date)} a déjà été saisi (${dup.nbResults} résultats). Supprime la session existante dans l'Historique avant de re-saisir.`;
    warnEl.style.display='flex';
    return;
  }

  const tournaments=await getTournaments();
  const t=tournaments.find(t=>t.id===tid);
  const newEntries=[];
  let _uid=Date.now(); const nextId=()=>++_uid;

  t.points.forEach((pts,i) => {
    const place=i+1;
    const raw=(document.getElementById('player-'+place)?.value||'').trim();
    if (raw) newEntries.push({id:nextId(), date, tournamentId:tid, place, player:raw.toUpperCase(), points:pts, extra:false});
  });

  for (let place=t.points.length+1; place<=currentPlaceCount; place++) {
    const raw=(document.getElementById('player-'+place)?.value||'').trim();
    const pts=parseInt(document.getElementById('pts-'+place)?.value)||0;
    if (raw) newEntries.push({id:nextId(), date, tournamentId:tid, place, player:raw.toUpperCase(), points:pts, extra:true});
  }

  if (newEntries.length===0) { warnEl.innerHTML='⚠ Aucun nom de joueur renseigné.'; warnEl.style.display='flex'; return; }

  const places=newEntries.map(e=>e.place);
  const maxP  =Math.max(...places);
  const missing=Array.from({length:maxP},(_,i)=>i+1).filter(p=>!places.includes(p));
  if (missing.length>0 && !confirm(`Places ${missing.join(', ')} sans joueur. Continuer ?`)) return;

  const results =await getResults();
  const sessions=await getSessions();
  newEntries.forEach(e=>results.push(e));
  sessions.push({id:nextId(), date, tournamentId:tid, entries, cagnotte:entries*2, nbResults:newEntries.length});
  await saveResults(results);
  await saveSessions(sessions);

  document.getElementById('inp-tournoi').value='';
  document.getElementById('inp-entrees').value='';
  document.getElementById('inp-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('placement-placeholder').style.display='block';
  document.getElementById('placement-section').style.display='none';
  document.getElementById('cagnotte-box').style.display='none';
  document.getElementById('alert-dup').style.display='none';
  currentPlaceCount=0;

  const extras=newEntries.filter(e=>e.extra).length;
  succEl.innerHTML=`✓ ${newEntries.length} résultat(s) enregistré(s)${extras>0?` dont ${extras} place(s) supplémentaire(s)`:''}${entries>0?` · Cagnotte +${entries*2} €`:''}`;
  succEl.style.display='flex';
  setTimeout(()=>succEl.style.display='none',5000);
  await refreshPlayersDl();
}

// ══════════════════════════════════════════════════════
//  CONFIG TOURNOIS
// ══════════════════════════════════════════════════════
async function renderConfigTournois() {
  const tournaments=await getTournaments();
  const list=document.getElementById('tournament-list');
  const empty=document.getElementById('config-empty');
  if (tournaments.length===0) { list.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  list.innerHTML=tournaments.map((t,i) => {
    const ptsPrev=t.points.slice(0,8).join(', ')+(t.points.length>8?'…':'');
    return `<div class="tournament-item">
      <div class="t-info">
        <div class="t-name">${t.name}</div>
        <div class="t-meta">
          <span class="t-meta-chip">${t.day}</span>
          <span class="t-meta-chip">${t.buyin} €</span>
          <span style="color:var(--text-muted)">${t.points.length} place${t.points.length>1?'s':''} payée${t.points.length>1?'s':''}</span>
        </div>
        <div class="t-points-preview">${ptsPrev}</div>
      </div>
      <div class="t-actions">
        <button class="btn btn-ghost" style="font-size:10px;padding:5px 10px" onclick="editTournament('${t.id}')">Modifier</button>
        <button class="btn-red" onclick="deleteTournament('${t.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function openTournamentForm(editId) {
  const form=document.getElementById('tournament-form');
  document.getElementById('form-title').textContent = editId ? 'Modifier le tournoi' : 'Nouveau tournoi';
  document.getElementById('form-edit-id').value = editId||'';
  document.getElementById('form-name').value  = '';
  document.getElementById('form-day').value   = '';
  document.getElementById('form-buyin').value = '';
  document.getElementById('form-pp').value    = '';
  document.getElementById('form-frais').value = '';
  buildPointsGrid([22,16,13,11,9,8,7,6,5,4]);
  form.style.display='block';
  form.scrollIntoView({behavior:'smooth', block:'start'});
  document.getElementById('form-name').focus();
}

async function editTournament(id) {
  const tournaments=await getTournaments();
  const t=tournaments.find(t=>t.id===id);
  if (!t) return;
  const form=document.getElementById('tournament-form');
  document.getElementById('form-title').textContent='Modifier le tournoi';
  document.getElementById('form-edit-id').value=id;
  document.getElementById('form-name').value  = t.name;
  document.getElementById('form-day').value   = t.day;
  document.getElementById('form-buyin').value = t.buyin;
  document.getElementById('form-pp').value    = t.pp    != null ? t.pp    : '';
  document.getElementById('form-frais').value = t.frais != null ? t.frais : '';
  buildPointsGrid(t.points);
  form.style.display='block';
  form.scrollIntoView({behavior:'smooth', block:'start'});
  document.getElementById('form-name').focus();
}

function lbRecalcBuyin() {
  const pp   =parseFloat(document.getElementById('form-pp').value)||0;
  const frais=parseFloat(document.getElementById('form-frais').value)||0;
  document.getElementById('form-buyin').value = pp+frais > 0 ? pp+frais : '';
}

async function deleteTournament(id) {
  const tournaments=await getTournaments();
  const t=tournaments.find(t=>t.id===id);
  if (!t) return;
  if (!confirm(`Supprimer "${t.name}" ? Les résultats déjà enregistrés ne seront pas effacés.`)) return;
  await saveTournaments(tournaments.filter(t=>t.id!==id));
  await populateTournoiSelects();
  await renderConfigTournois();
  showConfigAlert(`"${t.name}" supprimé.`);
}

function closeTournamentForm() {
  document.getElementById('tournament-form').style.display='none';
}

async function saveTournamentForm() {
  const name  =(document.getElementById('form-name').value||'').trim();
  const day   =(document.getElementById('form-day').value||'').trim();
  const buyin =parseFloat(document.getElementById('form-buyin').value)||0;
  const pp    =parseFloat(document.getElementById('form-pp').value)||null;
  const frais =parseFloat(document.getElementById('form-frais').value)||null;
  const editId=document.getElementById('form-edit-id').value;

  if (!name) { alert('Donne un nom au tournoi.'); return; }
  if (buyin<=0) { alert('Indique un buy-in valide.'); return; }

  const points=getPointsFromGrid();
  if (points.length===0) { alert('Ajoute au moins une place payée.'); return; }
  if (points.some(p=>p<0)) { alert('Les points ne peuvent pas être négatifs.'); return; }

  const split = (pp && frais) ? { pp, frais } : {};
  const tournaments=await getTournaments();

  if (editId) {
    const idx=tournaments.findIndex(t=>t.id===editId);
    if (idx>=0) { tournaments[idx]={...tournaments[idx], name, day, buyin, ...split, points}; }
  } else {
    const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Date.now();
    tournaments.push({id, name, day, buyin, ...split, points});
  }

  await saveTournaments(tournaments);
  await populateTournoiSelects();
  closeTournamentForm();
  await renderConfigTournois();
  showConfigAlert(editId ? `"${name}" mis à jour.` : `"${name}" ajouté avec ${points.length} places.`);
}

function showConfigAlert(msg) {
  const el=document.getElementById('alert-config-success');
  el.textContent='✓ '+msg; el.style.display='block';
  setTimeout(()=>el.style.display='none', 3500);
}

function buildPointsGrid(pts) {
  const grid=document.getElementById('points-grid');
  grid.innerHTML=pts.map((v,i) => `
    <div class="pts-cell">
      <div class="pts-cell-num">${i+1}</div>
      <input type="number" min="0" value="${v}" oninput="updatePointsCountLabel()" />
    </div>`).join('');
  updatePointsCountLabel();
}

function addPointsSlot() {
  const grid=document.getElementById('points-grid');
  const cells=grid.querySelectorAll('.pts-cell');
  const n=cells.length+1;
  const lastVal=cells.length>0?parseInt(cells[cells.length-1].querySelector('input').value)||0:0;
  const newVal=Math.max(0,lastVal-1);
  const div=document.createElement('div');
  div.className='pts-cell';
  div.innerHTML=`<div class="pts-cell-num">${n}</div><input type="number" min="0" value="${newVal}" oninput="updatePointsCountLabel()" />`;
  grid.appendChild(div);
  updatePointsCountLabel();
  div.querySelector('input').focus();
}

function removePointsSlot() {
  const grid=document.getElementById('points-grid');
  const cells=grid.querySelectorAll('.pts-cell');
  if (cells.length>1) { cells[cells.length-1].remove(); updatePointsCountLabel(); }
}

function getPointsFromGrid() {
  return [...document.getElementById('points-grid').querySelectorAll('.pts-cell input')]
    .map(i=>parseInt(i.value)||0);
}

function updatePointsCountLabel() {
  const n=document.getElementById('points-grid').querySelectorAll('.pts-cell').length;
  document.getElementById('points-count-label').textContent=`${n} place${n>1?'s':''} payée${n>1?'s':''}`;
}

// ══════════════════════════════════════════════════════
//  CLASSEMENT
// ══════════════════════════════════════════════════════
async function renderClassement() {
  const results=await getResults();
  const search=(document.getElementById('search-player')?.value||'').toLowerCase();
  const map={};
  results.forEach(r=>{
    if (!map[r.player]) map[r.player]={player:r.player,points:0,count:0};
    map[r.player].points+=r.points; map[r.player].count++;
  });
  let sorted=Object.values(map).sort((a,b)=>b.points-a.points);
  if (search) sorted=sorted.filter(p=>p.player.toLowerCase().includes(search));

  const cagnotte=await totalCagnotte();
  const content =document.getElementById('classement-content');
  const empty   =document.getElementById('classement-empty');
  if (sorted.length===0) { content.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  const today=new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const isFiltered=!!search;

  const esc=s=>s.replace(/'/g,"\\x27");
  const entryMid=(p,rank)=>`<div class="rank-entry" onclick="openPlayerModal('${esc(p.player)}')">
    <span class="re-rank">${rank}</span><span class="re-name">${cap(p.player)}</span><span class="re-pts">${p.points}</span>
  </div>`;
  const entrySm=(p,rank)=>`<div class="rank-entry-sm" onclick="openPlayerModal('${esc(p.player)}')">
    <span class="re-rank">${rank}</span><span class="re-name">${cap(p.player)}</span><span class="re-pts">${p.points}</span>
  </div>`;

  function threeColsOf(players,startRank,entryFn,colClass) {
    const n=players.length,c1=Math.ceil(n/3),c2=Math.ceil((n-c1)/2);
    const offsets=[0,c1,c1+c2];
    const cols=[players.slice(0,c1),players.slice(c1,c1+c2),players.slice(c1+c2)];
    return `<div class="${colClass}">${cols.map((col,ci)=>`<div>${col.map((p,pi)=>entryFn(p,startRank+offsets[ci]+pi)).join('')}</div>`).join('')}</div>`;
  }

  let html='';
  if (!isFiltered) {
    html+=`<div class="class-header">
      <div class="class-title">Classement Challenge 2025 / 2026</div>
      <div class="class-date">Au ${today} — ${sorted.length} joueur${sorted.length>1?'s':''}</div>
      <div class="class-cagnotte"><span class="class-cagnotte-label">Ranking</span><span class="class-cagnotte-val">${cagnotte.toLocaleString('fr-FR')} €</span></div>
    </div>`;
    if (sorted.length>=1) {
      const p1=sorted[0];
      html+=`<div class="class-section-title">Podium</div><div class="podium">
        <div class="podium-first" onclick="openPlayerModal('${esc(p1.player)}')">
          <div class="p-rank">🥇 1<sup>er</sup></div>
          <div class="p-name">${cap(p1.player)}</div>
          <div class="p-pts">${p1.points} <small>pts</small></div>
        </div><div class="podium-sub">`;
      [1,2].forEach(i=>{
        if (sorted[i]) {
          const p=sorted[i],medal=i===1?'🥈':'🥉',ord=i===1?'2<sup>ème</sup>':'3<sup>ème</sup>';
          html+=`<div class="podium-card" onclick="openPlayerModal('${esc(p.player)}')">
            <div class="p-rank-num">${medal}</div>
            <div class="p-info"><div class="p-name">${cap(p.player)}</div><div style="font-size:9px;color:var(--text-muted);letter-spacing:.1em">${ord}</div></div>
            <div class="p-pts">${p.points} <small>pts</small></div>
          </div>`;
        }
      });
      html+=`</div></div>`;
    }
    const mid=sorted.slice(3,30);
    if(mid.length>0) { html+=`<div class="class-section-title">4<sup>ème</sup> au ${Math.min(30,sorted.length)}<sup>ème</sup></div>`+threeColsOf(mid,4,entryMid,'rank-cols'); }
    const low=sorted.slice(30,150);
    if(low.length>0) { html+=`<div class="class-section-title">31<sup>ème</sup> au ${Math.min(150,sorted.length)}<sup>ème</sup></div>`+threeColsOf(low,31,entrySm,'rank-cols-compact'); }
    if(sorted.length>150) { html+=`<div class="class-section-title">151<sup>ème</sup> et au-delà</div>`+threeColsOf(sorted.slice(150),151,entrySm,'rank-cols-compact'); }
  } else {
    html=`<div style="margin-top:16px">${sorted.map((p,i)=>entryMid(p,i+1)).join('')}</div>`;
  }
  content.innerHTML=html;
}

// ══════════════════════════════════════════════════════
//  HISTORIQUE — vue calendrier
// ══════════════════════════════════════════════════════
async function renderHistorique() {
  await refreshTournamentsCache();
  _histResultsCache = await getResults();

  const allSessions = (await getSessions()).slice();
  const search  = (document.getElementById('search-hist')?.value  || '').toLowerCase().trim();
  const filterT = (document.getElementById('filter-tournoi-hist')?.value || '');
  const filterD = (document.getElementById('filter-date-hist')?.value   || '');

  const clearBtn = document.getElementById('btn-clear-date');
  if (clearBtn) clearBtn.style.display = filterD ? 'inline-flex' : 'none';

  /* Index results → date|tid */
  const resIndex = {};
  _histResultsCache.forEach(r => {
    const key = `${r.date}|${r.tournamentId}`;
    (resIndex[key] = resIndex[key] || []).push(r);
  });

  let sessions = allSessions;
  if (filterT) sessions = sessions.filter(s => s.tournamentId === filterT);
  if (filterD) sessions = sessions.filter(s => s.date === filterD);
  if (search) {
    sessions = sessions.filter(s => {
      const tMatch = getTNameSync(s.tournamentId).toLowerCase().includes(search);
      const pMatch = (resIndex[`${s.date}|${s.tournamentId}`] || []).some(r => r.player.toLowerCase().includes(search));
      if (tMatch || pMatch) { _histExpandedIds.add(s.id); return true; }
      return false;
    });
  }

  const container = document.getElementById('hist-sessions-list');
  const emptyEl   = document.getElementById('hist-empty');

  if (sessions.length === 0) {
    container.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  /* Grouper par mois YYYY-MM (récents en premier) */
  const monthMap = {};
  sessions.forEach(s => {
    const m = s.date.substring(0, 7);
    (monthMap[m] = monthMap[m] || []).push(s);
  });
  const sortedMonths = Object.keys(monthMap).sort().reverse();

  container.innerHTML = `<div class="cal-months">${
    sortedMonths.map(m => _renderCalendarMonth(m, monthMap[m], resIndex, search)).join('')
  }</div>`;
}

const _MONTHS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const _DAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const _DAYS_LONG  = ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'];

function _renderCalendarMonth(yearMonth, sessions, resIndex, search) {
  const [year, month] = yearMonth.split('-').map(Number);

  const firstDay    = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow    = (firstDay.getDay() + 6) % 7; // 0 = Lun … 6 = Dim

  /* Aujourd'hui */
  const now       = new Date();
  const todayDay  = (now.getFullYear() === year && now.getMonth() + 1 === month) ? now.getDate() : -1;

  /* Sessions indexées par numéro de jour */
  const byDay = {};
  sessions.forEach(s => {
    const d = parseInt(s.date.split('-')[2]);
    (byDay[d] = byDay[d] || []).push(s);
  });

  /* Cellules de la grille */
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const daySessions = byDay[d];
    const isToday     = d === todayDay;
    if (daySessions && daySessions.length > 0) {
      const chips = daySessions.map(s => {
        const tname  = getTNameSync(s.tournamentId);
        const short  = tname.length > 14 ? tname.slice(0, 13) + '…' : tname;
        const isOpen = _histExpandedIds.has(s.id);
        return `<div class="cal-chip${isOpen ? ' cal-chip-open' : ''}"
          onclick="event.stopPropagation();toggleCalSession(${s.id})" id="chip-${s.id}">
          <span class="cal-chip-name">${short}</span>
          <span class="cal-chip-cag">+${(s.cagnotte || 0).toLocaleString('fr-FR')} €</span>
        </div>`;
      }).join('');
      cells += `<div class="cal-day cal-has-session${isToday ? ' cal-today' : ''}">
        <div class="cal-day-num">${d}</div>${chips}
      </div>`;
    } else {
      cells += `<div class="cal-day${isToday ? ' cal-today' : ''}">
        <div class="cal-day-num">${d}</div>
      </div>`;
    }
  }

  /* Panneaux détail pour les sessions ouvertes ce mois */
  const openSessions = sessions.filter(s => _histExpandedIds.has(s.id)).sort((a, b) => a.date.localeCompare(b.date));
  const detailHtml   = openSessions.map(s => {
    const key     = `${s.date}|${s.tournamentId}`;
    const results = (resIndex[key] || []).slice().sort((a, b) => a.place - b.place);
    return _renderCalDetail(s, results, search);
  }).join('');

  const totalCag = sessions.reduce((a, s) => a + (s.cagnotte || 0), 0);

  return `<div class="cal-month">
    <div class="cal-month-hdr">
      <div class="cal-month-title">${_MONTHS_FR[month - 1]} <span class="cal-month-year">${year}</span></div>
      <div class="cal-month-meta">
        <span>${sessions.length} session${sessions.length > 1 ? 's' : ''}</span>
        <span class="cal-month-cag">+${totalCag.toLocaleString('fr-FR')} €</span>
      </div>
    </div>
    <div class="cal-week-hdr">${_DAYS_SHORT.map(d => `<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
    ${detailHtml ? `<div class="cal-details">${detailHtml}</div>` : ''}
  </div>`;
}

function _renderCalDetail(s, results, search = '') {
  const dt        = new Date(s.date + 'T12:00:00');
  const [y, m, d] = s.date.split('-');
  const label     = `${_DAYS_LONG[dt.getDay()]} ${d}/${m}/${y}`;
  const tname     = getTNameSync(s.tournamentId);

  return `<div class="cal-detail-card" id="sess-${s.id}">
    <div class="cal-detail-hdr">
      <div class="cal-detail-info">
        <span class="sess-date">${label}</span>
        <span class="tournament-badge">${tname}</span>
        <span class="sess-meta" id="sess-meta-${s.id}">${s.entries || 0} entrées · ${results.length} résultats</span>
        <span class="session-cag">+${(s.cagnotte || 0).toLocaleString('fr-FR')} €</span>
      </div>
      <div class="cal-detail-acts">
        <button class="btn-sess-edit" title="Modifier les entrées" onclick="editSession(${s.id})">✎</button>
        <button class="btn-red" title="Supprimer" onclick="deleteSession(${s.id})">✕</button>
        <button class="btn-cancel-sm" onclick="toggleCalSession(${s.id})">Fermer</button>
      </div>
    </div>
    <div class="sess-results">${
      results.length
        ? results.map(r => _renderResultRow(r, search)).join('')
        : '<div class="sess-no-results">Aucun résultat pour cette session.</div>'
    }</div>
  </div>`;
}

function _renderResultRow(r, search = '') {
  const pc      = r.place === 1 ? 'p1' : r.place <= 3 ? 'p3' : '';
  const extra   = r.extra ? '<span class="extra-badge">extra</span>' : '';
  const name    = cap(r.player);
  const hilite  = search && r.player.toLowerCase().includes(search) ? ' style="background:rgba(196,160,74,.09)"' : '';
  return `<div class="res-row" id="res-${r.id}"${hilite}>
    <span class="place-badge-sm ${pc}">${r.place}</span>
    <span class="res-name">${name}${extra}</span>
    <span class="pts-badge">+${r.points}</span>
    <span class="res-acts">
      <button class="btn-edit-sm" onclick="editResult(${r.id})">✎</button>
      <button class="btn-red" onclick="deleteResult(${r.id})">✕</button>
    </span>
  </div>`;
}

/* ── Calendrier toggle ── */
function toggleCalSession(id) {
  _histExpandedIds.has(id) ? _histExpandedIds.delete(id) : _histExpandedIds.add(id);
  renderHistorique();
}

/* ── Édition inline résultat ── */
function editResult(id) {
  const row = document.getElementById(`res-${id}`);
  if (!row || row.dataset.editing) return;
  const r = (_histResultsCache || []).find(r => r.id === id);
  if (!r) return;

  row.dataset.editing = '1';
  row.innerHTML = `
    <input type="number" class="edit-place" id="ep-${id}" value="${r.place}" min="1" max="99" />
    <input type="text"   class="edit-name"  id="en-${id}" value="${cap(r.player)}" />
    <input type="number" class="edit-pts"   id="ept-${id}" value="${r.points}" min="0" />
    <span class="res-acts">
      <button class="btn-save-sm"   onclick="saveResultEdit(${id})">✓</button>
      <button class="btn-cancel-sm" onclick="renderHistorique()">✕</button>
    </span>`;

  const inp = document.getElementById(`en-${id}`);
  if (inp) { inp.focus(); inp.select(); }
  row.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveResultEdit(id);
    if (e.key === 'Escape') renderHistorique();
  }));
}

async function saveResultEdit(id) {
  const place  = parseInt(document.getElementById(`ep-${id}`)?.value)  || 1;
  const name   = (document.getElementById(`en-${id}`)?.value || '').trim().toUpperCase();
  const points = parseInt(document.getElementById(`ept-${id}`)?.value) || 0;
  if (!name) { alert('Le nom du joueur ne peut pas être vide.'); return; }

  const results = await getResults();
  const idx = results.findIndex(r => r.id === id);
  if (idx >= 0) {
    results[idx] = { ...results[idx], place, player: name, points };
    await saveResults(results);
  }
  await renderHistorique();
  await renderClassement();
}

/* ── Édition inline session (entrées / cagnotte) ── */
async function editSession(id) {
  const sessions = await getSessions();
  const s = sessions.find(s => s.id === id);
  if (!s) return;

  const metaEl = document.querySelector(`#sess-${id} .sess-meta`);
  if (!metaEl || metaEl.dataset.editing) return;
  metaEl.dataset.editing = '1';

  metaEl.innerHTML = `
    <input type="number" id="se-${id}" value="${s.entries || 0}" min="0"
      onclick="event.stopPropagation()" />
    entrées
    <button class="btn-save-sm"   onclick="event.stopPropagation();saveSessionEdit(${id})">✓</button>
    <button class="btn-cancel-sm" onclick="event.stopPropagation();renderHistorique()">✕</button>`;

  const inp = document.getElementById(`se-${id}`);
  if (inp) {
    inp.focus(); inp.select();
    inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter')  saveSessionEdit(id);
      if (e.key === 'Escape') renderHistorique();
    });
  }
}

async function saveSessionEdit(id) {
  const entries = parseInt(document.getElementById(`se-${id}`)?.value) || 0;
  const sessions = await getSessions();
  const idx = sessions.findIndex(s => s.id === id);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], entries, cagnotte: entries * 2 };
    await saveSessions(sessions);
  }
  await renderHistorique();
}

function clearDateFilter() {
  const inp = document.getElementById('filter-date-hist');
  if (inp) inp.value = '';
  renderHistorique();
}

async function deleteResult(id) {
  if(!confirm('Supprimer ce résultat ?')) return;
  await saveResults((await getResults()).filter(r=>r.id!==id));
  await renderHistorique(); await renderClassement();
}

async function deleteSession(id) {
  if(!confirm('Supprimer cette session et tous ses résultats associés ?')) return;
  const s=(await getSessions()).find(s=>s.id===id); if(!s) return;
  await saveResults((await getResults()).filter(r=>!(r.date===s.date&&r.tournamentId===s.tournamentId)));
  await saveSessions((await getSessions()).filter(s2=>s2.id!==id));
  await renderHistorique(); await renderClassement();
}

// ══════════════════════════════════════════════════════
//  RANKING DOC
// ══════════════════════════════════════════════════════
async function renderRankingDoc() {
  const total  = await totalCagnotte();
  const prize1 = Math.round(total * 0.10 * 100) / 100;
  const prize2 = Math.round(total * 0.05 * 100) / 100;
  const today  = new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  const inner = `
    <div class="rp-header">
      <div class="rp-casino-lbl">Casino</div>
      <div class="rp-brand">Barrière</div>
      <div class="rp-city">Bordeaux</div>
    </div>
    <div class="rp-hr"></div>
    <div class="rp-main-title">Montant du Ranking</div>
    <div class="rp-challenge">Challenge Saisonnier · 2025 / 2026</div>
    <div class="rp-date">Au ${todayCap}</div>
    <div class="rp-amount">${total.toLocaleString('fr-FR')} €</div>
    <div class="rp-prizes">
      <div class="rp-prize rp-gold">
        <div class="rp-p-medal">🥇</div>
        <div class="rp-p-rank">1<sup>er</sup></div>
        <div class="rp-p-amt">${fmtEur(prize1)}</div>
        <div class="rp-p-pct">10% de la cagnotte</div>
      </div>
      <div class="rp-prize rp-silver">
        <div class="rp-p-medal">🥈</div>
        <div class="rp-p-rank">2<sup>ème</sup></div>
        <div class="rp-p-amt">${fmtEur(prize2)}</div>
        <div class="rp-p-pct">5% de la cagnotte</div>
      </div>
    </div>
  `;
  document.getElementById('ranking-doc-screen').innerHTML = `<div class="rp-doc">${inner}</div>`;
  document.getElementById('ranking-print-page').innerHTML = `<div class="rp-page"><div class="rp-doc">${inner}</div></div>`;
}

function printRanking() {
  document.body.className='print-ranking';
  window.print();
  setTimeout(()=>document.body.className='',500);
}

async function printClassement() {
  /* ── Récupérer et trier les données ── */
  const results  = await getResults();
  const cagnotte = await totalCagnotte();
  const map = {};
  results.forEach(r => {
    if (!map[r.player]) map[r.player] = { player:r.player, points:0, count:0 };
    map[r.player].points += r.points;
    map[r.player].count++;
  });
  const sorted = Object.values(map).sort((a,b) => b.points - a.points);
  if (sorted.length === 0) return;

  const today = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});

  /* ── Podium ── */
  const medals = ['🥇','🥈','🥉'];
  const ords   = ['1<sup>er</sup>','2<sup>ème</sup>','3<sup>ème</sup>'];
  /* Ordre classique podium : 2ème gauche · 1er centre · 3ème droite */
  const podiumHtml = [1, 0, 2].map(i => {
    const p = sorted[i]; if (!p) return '';
    return `<div class="cp-pod cp-p${i+1}">
      <div class="cp-pod-medal">${medals[i]}</div>
      <div class="cp-pod-ord">${ords[i]}</div>
      <div class="cp-pod-name">${cap(p.player)}</div>
      <div class="cp-pod-pts">${p.points} <span class="cp-pod-ptslbl">pts</span></div>
    </div>`;
  }).join('');

  /* ── Helper grille ── */
  const gridHtml = (players, startRank) => players.map((p,i) =>
    `<div class="cp-entry">
      <span class="cp-rank">${startRank+i}</span>
      <span class="cp-name">${cap(p.player)}</span>
      <span class="cp-pts">${p.points}</span>
    </div>`
  ).join('');

  const mid = sorted.slice(3, 30);
  const low = sorted.slice(30, 150);

  const endMid = Math.min(30,  sorted.length);
  const endLow = Math.min(150, sorted.length);

  const html = `
    <div class="cp-header">
      <div>
        <div class="cp-logo">Casino Barrière · Bordeaux</div>
        <div class="cp-title">Classement Challenge 2025 / 2026</div>
      </div>
      <div class="cp-meta">Au ${today}<br>${sorted.length} joueur${sorted.length>1?'s':''}</div>
      <div class="cp-cag">Ranking<br><strong>${cagnotte.toLocaleString('fr-FR')} €</strong></div>
    </div>

    <div class="cp-podium">${podiumHtml}</div>

    ${mid.length ? `
    <div class="cp-section-title">4<sup>ème</sup> — ${endMid}<sup>ème</sup></div>
    <div class="cp-grid cp-grid-3">${gridHtml(mid, 4)}</div>` : ''}

    ${low.length ? `
    <div class="cp-section-title">31<sup>ème</sup> — ${endLow}<sup>ème</sup></div>
    <div class="cp-grid cp-grid-4">${gridHtml(low, 31)}</div>` : ''}
  `;

  document.getElementById('classement-print-page').innerHTML = html;
  document.body.className = 'print-classement';
  window.print();
  setTimeout(() => document.body.className = '', 500);
}

// ══════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════
async function openPlayerModal(playerName) {
  const results=(await getResults()).filter(r=>r.player===playerName).slice().reverse();
  const total=results.reduce((a,r)=>a+r.points,0);
  const best =results.reduce((b,r)=>r.place<b?r.place:b,99);
  const rows =results.map(r=>{
    const pc=r.place===1?'p1':r.place<=3?'p3':'';
    const extraTag=r.extra?'<span style="font-size:9px;color:var(--text-muted);margin-left:4px">extra</span>':'';
    return `<tr style="border-top:1px solid rgba(196,160,74,.05)">
      <td style="padding:8px;font-size:12px;color:var(--text-dim)">${fmtDate(r.date)}</td>
      <td style="padding:8px"><span class="tournament-badge">${getTNameSync(r.tournamentId)}</span></td>
      <td style="padding:8px"><span class="place-badge-sm ${pc}">${r.place}</span>${extraTag}</td>
      <td style="padding:8px"><span class="pts-badge">+${r.points}</span></td>
    </tr>`;
  }).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-name">${cap(playerName)}</div>
    <div class="modal-pts">${total} <small>pts</small></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
      <div class="stat-item"><div class="stat-v">${results.length}</div><div class="stat-k">Tournois</div></div>
      <div class="stat-item"><div class="stat-v">${best<99?best+(best===1?'er':'ème'):'—'}</div><div class="stat-k">Meilleur résultat</div></div>
    </div>
    <div style="font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--gold);margin-bottom:10px">Historique</div>
    <table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>
  `;
  const overlay = document.getElementById('modal');
  overlay.scrollTop = 0;
  overlay.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal')) _closeModal();
}
function _closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.body.classList.remove('modal-open');
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
let _tournamentsCache = null;
async function getTName(id) {
  const ts=await getTournaments(); const t=ts.find(t=>t.id===id); return t?t.name:id;
}
function getTNameSync(id) {
  if (!_tournamentsCache) return id;
  const t=_tournamentsCache.find(t=>t.id===id); return t?t.name:id;
}
async function refreshTournamentsCache() {
  _tournamentsCache=await getTournaments();
}

function fmtDate(str) { if(!str)return''; const[y,m,d]=str.split('-'); return`${d}/${m}/${y}`; }
function cap(str)     { return str.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' '); }
function fmtEur(n)    { const f=n.toFixed(2);const[i,d]=f.split('.');return parseInt(i).toLocaleString('fr-FR')+(d==='00'?' €':','+d+' €'); }

// ══════════════════════════════════════════════════════
init().then(refreshTournamentsCache);
