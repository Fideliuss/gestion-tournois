/* ═══════════════════════════════════════════════════════
   prize-pool.js — Prize Pool Calculator
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════════════ */

const RAKE_RATE = 0.04;
const CAGNOTTE  = 2;
const PP_STORE  = 'pp_cfg';
const PP_SPLITS = 'pp_splits';

const DEFAULT_TOURNAMENTS = [
  { id:'lucky-monday',     name:'Lucky Monday',        day:'Lundi',     buyin:80  },
  { id:'knockout-tuesday', name:'Tuesday Knock-Out',   day:'Mardi',     buyin:120 },
  { id:'funrebuy-tuesday', name:'Fun Rebuy Tuesday',   day:'Mardi',     buyin:40  },
  { id:'mercredi-poker',   name:'Mercredi Poker Time', day:'Mercredi',  buyin:75  },
  { id:'small-jeudi',      name:'Small du Jeudi',      day:'Jeudi',     buyin:60  },
  { id:'friday-highstack', name:'Friday High Stack',   day:'Vendredi',  buyin:150 },
  { id:'sunday-30k',       name:'Sunday 30K',          day:'Dimanche',  buyin:100 },
  { id:'sunday-40k',       name:'Sunday 40K',          day:'Dimanche',  buyin:200 },
  { id:'vsd',              name:'Le 33 (VSD)',          day:'Événement', buyin:330 },
];

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
const cent   = v => Math.round(v * 100) / 100;
const round5 = v => Math.round(v / 5) * 5;
const ceil5  = v => Math.ceil(v / 5) * 5;

function fmt(n) {
  const f = Number(n).toFixed(2), [int, dec] = f.split('.');
  const s = parseInt(int, 10).toLocaleString('fr-FR');
  return dec === '00' ? s + ' €' : s + ',' + dec + ' €';
}
const ord = n => n + (n === 1 ? 'er' : 'ème');

function calcAutoSpots(players) { return Math.max(1, Math.round(players * 0.12)); }

/* ══════════════════════════════════════════════════════
   ALGORITHME
   Géométrique bi-zone avec paliers groupés.
   Index interne : 0 = dernier payé, spots-1 = 1er.
══════════════════════════════════════════════════════ */
function genPayouts(pool, spots, buyinTotal, lastMult, steepFactor, minJump) {
  if (!pool || pool <= 0 || !spots || spots < 1) return null;
  if (spots === 1) return [pool];

  const targetLast = round5(buyinTotal * lastMult);
  if (targetLast <= 0 || targetLast >= pool) return null;

  if (spots === 2) {
    const first = pool - targetLast;
    return first > targetLast ? [first, targetLast] : null;
  }

  /* Zones : top = min(4, 45% des places), bot = reste */
  const topN = Math.min(4, Math.max(1, Math.floor(spots * 0.45)));
  const botN = spots - topN;

  /* Bisection sur r1 (ratio zone basse) tel que somme = pool.
     Zone haute : r2 = r1 × steepFactor */
  const sumForR = r1 => {
    const r2 = r1 * steepFactor;
    let s = 0;
    for (let k = 0; k < botN; k++) s += targetLast * Math.pow(r1, k);
    const anchor = targetLast * Math.pow(r1, botN - 1);
    for (let j = 1; j <= topN; j++) s += anchor * Math.pow(r2, j);
    return s;
  };

  let lo = 1.0001, hi = 500;
  for (let i = 0; i < 400; i++) {
    const mid = (lo + hi) / 2;
    if (sumForR(mid) >= pool) hi = mid; else lo = mid;
  }
  const r1 = (lo + hi) / 2;
  const r2 = r1 * steepFactor;

  /* Génération des valeurs brutes (ascendant : 0 = dernier) */
  const raw = [];
  for (let k = 0; k < botN; k++) raw.push(targetLast * Math.pow(r1, k));
  const anchor = raw[botN - 1];
  for (let j = 1; j <= topN; j++) raw.push(anchor * Math.pow(r2, j));

  /* Arrondi bas → haut avec contrainte de paliers.
     Règles :
     - Saut depuis le palier précédent < minJump → même palier (valeur identique)
     - Saut >= minJump → nouveau palier, saut doit être >= saut précédent
  */
  const result = new Array(spots);
  result[0] = round5(raw[0]);

  let prevTierVal  = result[0];
  let prevTierJump = minJump; /* le premier saut doit être >= minJump */

  for (let k = 1; k < spots - 1; k++) {
    const rawR = round5(raw[k]);
    const jumpFromPrev = rawR - prevTierVal;

    if (jumpFromPrev < minJump) {
      /* Trop petit : même palier */
      result[k] = prevTierVal;
    } else {
      /* Nouveau palier : saut doit être >= saut précédent */
      const minRequired = prevTierVal + Math.max(minJump, ceil5(prevTierJump));
      result[k] = Math.max(rawR, minRequired);
      prevTierJump = result[k] - prevTierVal;
      prevTierVal  = result[k];
    }
  }

  /* 1er = reste exact du pool */
  const othersSum = result.slice(0, spots - 1).reduce((a, b) => a + b, 0);
  result[spots - 1] = pool - othersSum;

  if (result[spots - 1] <= result[spots - 2]) return null;

  return result.reverse(); /* descendant : 1er en tête */
}

/* ══════════════════════════════════════════════════════
   ÉTAT
══════════════════════════════════════════════════════ */
let state = {
  total: 150, pp: 130, frais: 20,
  players: 77, spotsManual: false, spotsOverride: 9,
  lastMult: 2.0, steepFactor: 1.5, minJump: 50,
  activeTournamentId: null,
  tournaments: [],
};
let ppSplits = {};

function loadPersist() {
  try { Object.assign(state, JSON.parse(localStorage.getItem(PP_STORE) || '{}')); } catch {}
  try { ppSplits = JSON.parse(localStorage.getItem(PP_SPLITS) || '{}'); } catch {}
}
function savePersist() {
  const { total, pp, frais, players, spotsManual, spotsOverride,
          lastMult, steepFactor, minJump, activeTournamentId } = state;
  localStorage.setItem(PP_STORE, JSON.stringify({
    total, pp, frais, players, spotsManual, spotsOverride,
    lastMult, steepFactor, minJump, activeTournamentId
  }));
}
function saveSplits() {
  localStorage.setItem(PP_SPLITS, JSON.stringify(ppSplits));
}

/* ══════════════════════════════════════════════════════
   DÉRIVÉS
══════════════════════════════════════════════════════ */
function derive() {
  const { total, pp, frais, players, spotsManual, spotsOverride,
          lastMult, steepFactor, minJump } = state;
  const rake      = cent(pp * RAKE_RATE);
  const netPP     = cent(pp - rake);
  const fraisCas  = cent(frais - CAGNOTTE);
  const ok        = total > 0 && Math.abs(pp + frais - total) < 0.01;
  const autoSpots = players > 0 ? calcAutoSpots(players) : 1;
  const effSpots  = spotsManual ? spotsOverride : autoSpots;
  const poolNet   = ok && players > 0 ? cent(players * netPP) : 0;
  const rakeTotal = ok && players > 0 ? cent(players * rake) : 0;
  const cagTotal  = ok && players > 0 ? cent(players * CAGNOTTE) : 0;
  const payouts   = ok && players > 0 && effSpots > 0 && poolNet > 0
    ? genPayouts(poolNet, effSpots, total, lastMult, steepFactor, minJump)
    : null;
  return { rake, netPP, fraisCas, ok, autoSpots, effSpots, poolNet, rakeTotal, cagTotal, payouts };
}

/* ══════════════════════════════════════════════════════
   RENDU
══════════════════════════════════════════════════════ */
function render() {
  const d = derive();
  const { ok, payouts } = d;

  /* Tiles buy-in */
  document.getElementById('bk-netpp').textContent = fmt(d.netPP);
  document.getElementById('bk-rake' ).textContent = fmt(d.rake);
  document.getElementById('bk-frais').textContent = fmt(d.fraisCas);
  document.getElementById('bk-cag'  ).textContent = fmt(CAGNOTTE) + ' €';

  /* Alerte buy-in */
  const alertEl = document.getElementById('buyin-alert');
  if (!ok && state.total && state.pp && state.frais) {
    alertEl.style.display = 'flex';
    document.getElementById('buyin-alert-txt').innerHTML =
      `<strong>PP (${fmt(state.pp)}) + Frais (${fmt(state.frais)}) = ${fmt(cent(state.pp + state.frais))}</strong>` +
      ` ≠ Prix total (${fmt(state.total)}).`;
  } else {
    alertEl.style.display = 'none';
  }

  /* Classe err sur les inputs */
  const hasErr = !ok && state.total && state.pp && state.frais;
  ['inp-total', 'inp-pp', 'inp-frais'].forEach(id => {
    document.getElementById(id).classList.toggle('err', !!hasErr);
  });

  /* Summary */
  document.getElementById('sum-pool' ).textContent = ok ? fmt(d.poolNet)   : '—';
  document.getElementById('sum-rake' ).textContent = ok ? fmt(d.rakeTotal) : '—';
  document.getElementById('sum-cag'  ).textContent = ok ? fmt(d.cagTotal)  : '—';
  document.getElementById('sum-first').textContent = payouts ? fmt(payouts[0]) : '—';

  /* Spots */
  const spotsInput = document.getElementById('inp-spots');
  spotsInput.value    = d.effSpots;
  spotsInput.disabled = !state.spotsManual;
  document.getElementById('spots-pfx').style.color = state.spotsManual ? 'var(--gold)' : 'var(--text-muted)';
  document.getElementById('spots-tog').classList.toggle('on', state.spotsManual);
  document.getElementById('spots-tog-lbl').textContent = state.spotsManual
    ? 'Places : override manuel'
    : `Places : auto — ${d.autoSpots} (12% de ${state.players} joueurs)`;
  document.getElementById('spots-auto-lbl').textContent = state.spotsManual ? '' : '';

  /* Dernier payé hint */
  const lastEur = round5(state.total * state.lastMult);
  document.getElementById('last-lbl').textContent =
    ok ? `≈ ${fmt(lastEur)} (${state.lastMult}× buy-in)` : '';

  /* Table */
  renderTable(d);

  /* Print header (caché à l'écran, visible à l'impression) */
  const now = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  document.getElementById('print-sub').textContent =
    `${state.players} joueurs · Buy-in ${fmt(state.total)} · ${d.effSpots} places payées`;
  document.getElementById('print-meta').innerHTML =
    `<div>${now}</div><div>Dernier ≈ ${fmt(round5(state.total * state.lastMult))}</div><div>Pool net : ${fmt(d.poolNet)}</div>`;
}

function renderTable(d) {
  const tbody   = document.getElementById('pp-tbody');
  const table   = document.getElementById('pp-table');
  const errEl   = document.getElementById('pp-error');
  const fnote   = document.getElementById('pp-fnote');
  const printBtn = document.getElementById('btn-print');

  if (!d.payouts) {
    table.style.display   = 'none';
    fnote.style.display   = 'none';
    printBtn.style.display = 'none';
    errEl.style.display   = 'block';
    errEl.textContent = !d.ok
      ? 'Corrige la décomposition du buy-in.'
      : 'Configuration invalide — réduire les places payées ou ajuster le multiplicateur dernier.';
    return;
  }

  errEl.style.display    = 'none';
  table.style.display    = '';
  fnote.style.display    = '';
  printBtn.style.display = '';

  const p = d.payouts;
  /* Calcul des sauts et ×Δ.
     Le tableau est décroissant (1er en tête).
     ×Δ[i] = delta[i] / prochain_delta_non_nul_en_dessous
     → doit être ≥ 1 : chaque saut est plus grand que celui d'en dessous. */
  const deltas = p.map((amount, i) =>
    p[i + 1] !== undefined ? amount - p[i + 1] : null
  );
  const rows = p.map((amount, i) => {
    const delta    = deltas[i];
    const sameTier = i > 0 && p[i] === p[i - 1];
    let ratioD = null;
    if (delta !== null && delta > 0) {
      /* Cherche le prochain saut non nul en dessous (index > i) */
      for (let j = i + 1; j < deltas.length; j++) {
        if (deltas[j] !== null && deltas[j] > 0) {
          ratioD = delta / deltas[j];
          break;
        }
      }
    }
    const pct = (amount / d.poolNet * 100).toFixed(1);
    return { amount, delta, sameTier, ratioD, pct };
  });

  tbody.innerHTML = rows.map((r, i) => {
    const isFirst = i === 0;
    const trClass = [isFirst ? 'r1' : '', r.sameTier ? 'tier-same' : ''].join(' ').trim();

    let deltaStr = '—';
    if (r.delta === null)      deltaStr = '<span class="delta">last</span>';
    else if (r.delta === 0)    deltaStr = '<span class="delta-eq">=</span>';
    else                       deltaStr = `<span class="delta">+${Math.round(r.delta).toLocaleString('fr-FR')} €</span>`;

    let ratioDStr = '<span class="ratio-d" style="color:var(--text-muted);opacity:.3">—</span>';
    if (r.ratioD !== null) {
      const warn  = r.ratioD < 1.0;
      const label = `×${r.ratioD.toFixed(2)}`;
      ratioDStr = `<span class="ratio-d${warn ? ' ratio-warn' : ''}">${label}</span>`;
    }

    return `<tr class="${trClass}">
      <td><span class="badge">${i + 1}</span><span class="plbl">${ord(i + 1)}</span></td>
      <td><span class="amt">${fmt(r.amount)}</span></td>
      <td>${deltaStr}</td>
      <td>${ratioDStr}</td>
      <td><span class="pct">${r.pct} %</span></td>
      <td class="bcell"><div class="bbg"><div class="bfill" style="width:${(r.amount / p[0] * 100).toFixed(1)}%"></div></div></td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════
   PRESETS
══════════════════════════════════════════════════════ */
function renderPresets() {
  const wrap = document.getElementById('presets-row');
  if (!state.tournaments.length) {
    wrap.innerHTML = '<span class="pp-no-preset">Connectez le dossier de données pour charger les tournois</span>';
    return;
  }
  wrap.innerHTML = state.tournaments.map(t =>
    `<button class="pp-preset${state.activeTournamentId === t.id ? ' active' : ''}"
       onclick="applyPreset('${t.id}')">
      <span class="pp-preset-name">${t.name}</span>
      <span class="pp-preset-buyin">${t.buyin} €</span>
    </button>`
  ).join('');
}

function applyPreset(id) {
  const t = state.tournaments.find(t => t.id === id);
  if (!t) return;
  state.total = t.buyin;
  state.activeTournamentId = id;
  if (ppSplits[id]) {
    state.pp    = ppSplits[id].pp;
    state.frais = ppSplits[id].frais;
  } else {
    /* Heuristique par défaut : frais ≈ 10% arrondi à 5€, min 5€ */
    state.frais = Math.max(5, round5(t.buyin * 0.10));
    state.pp    = t.buyin - state.frais;
  }
  /* minJump adaptatif au buy-in : ~25% arrondi à 5€ */
  state.minJump = Math.max(10, round5(t.buyin * 0.25));

  syncInputs();
  renderPresets();
  savePersist();
  render();
}

function saveSplitIfActive() {
  if (!state.activeTournamentId) return;
  ppSplits[state.activeTournamentId] = { pp: state.pp, frais: state.frais };
  saveSplits();
}

/* ══════════════════════════════════════════════════════
   ÉVÉNEMENTS
══════════════════════════════════════════════════════ */
function onField(key, val) {
  const n = parseFloat(val);
  if (isNaN(n)) return;
  state[key] = n;

  /* Synchronisation pp ↔ frais */
  if (key === 'pp') {
    state.frais = cent(state.total - state.pp);
    document.getElementById('inp-frais').value = state.frais;
    saveSplitIfActive();
  }
  if (key === 'frais') {
    state.pp = cent(state.total - state.frais);
    document.getElementById('inp-pp').value = state.pp;
    saveSplitIfActive();
  }
  if (key === 'total') {
    /* Ajuste frais en gardant le ratio, pp prend le reste */
    if (state.frais > state.total) state.frais = state.total;
    state.pp = cent(state.total - state.frais);
    document.getElementById('inp-pp').value    = state.pp;
    document.getElementById('inp-frais').value = state.frais;
    saveSplitIfActive();
  }
  savePersist();
  render();
}

const KEY_TO_ID = { total:'inp-total', pp:'inp-pp', frais:'inp-frais',
                    players:'inp-players', lastMult:'inp-lastmult', minJump:'inp-minjump' };
function clampField(key, min) {
  const el = document.getElementById(KEY_TO_ID[key]);
  const v  = parseFloat(el?.value) || min;
  const clamped = Math.max(min, v);
  if (el) el.value = clamped;
  state[key] = clamped;
  savePersist();
  render();
}

function onSpotsInput(val) {
  const n = parseInt(val, 10);
  if (!isNaN(n) && n >= 1) {
    state.spotsOverride = n;
    savePersist();
    render();
  }
}

function toggleManualSpots() {
  state.spotsManual = !state.spotsManual;
  if (state.spotsManual) {
    state.spotsOverride = derive().autoSpots;
    document.getElementById('inp-spots').value = state.spotsOverride;
  }
  document.getElementById('inp-spots').disabled = !state.spotsManual;
  savePersist();
  render();
}

function setSteep(factor) {
  state.steepFactor = factor;
  document.querySelectorAll('.param-btn').forEach(b =>
    b.classList.toggle('active', parseFloat(b.dataset.steep) === factor)
  );
  savePersist();
  render();
}

function doPrint() {
  window.print();
}

/* ══════════════════════════════════════════════════════
   SYNC INPUTS → valeurs de state vers les champs HTML
══════════════════════════════════════════════════════ */
function syncInputs() {
  document.getElementById('inp-total'   ).value = state.total;
  document.getElementById('inp-pp'      ).value = state.pp;
  document.getElementById('inp-frais'   ).value = state.frais;
  document.getElementById('inp-players' ).value = state.players;
  document.getElementById('inp-lastmult').value = state.lastMult;
  document.getElementById('inp-minjump' ).value = state.minJump;
  document.querySelectorAll('.param-btn').forEach(b =>
    b.classList.toggle('active', parseFloat(b.dataset.steep) === state.steepFactor)
  );
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  loadPersist();
  syncInputs();

  await BarriereFS.restore();
  await loadTournaments();

  render();

  /* Recharger les tournois si le dossier se connecte après coup */
  document.getElementById('fs-indicator')?.addEventListener('click', async () => {
    await loadTournaments();
    render();
  });
});

async function loadTournaments() {
  let tournaments = DEFAULT_TOURNAMENTS;
  if (BarriereFS.connected) {
    try {
      const data = await BarriereFS.read('barriere_data.json',
        { version:1, results:[], sessions:[], tournaments:null });
      if (data.tournaments && data.tournaments.length > 0)
        tournaments = data.tournaments;
    } catch {}
  }
  state.tournaments = tournaments;
  renderPresets();
}
