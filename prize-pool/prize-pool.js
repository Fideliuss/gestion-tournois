/* ═══════════════════════════════════════════════════════
   prize-pool.js — Prize Pool Builder
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════════════ */

const RAKE_RATE = 0.04;
const CAGNOTTE  = 2;
const PP_STORE  = 'pp_cfg';
const PP_SPLITS = 'pp_splits';

/* Les tournois par défaut et TournamentsStore sont définis dans shared/tournaments.js */

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
const cent   = v => Math.round(v * 100) / 100;
const round5 = v => Math.round(v / 5) * 5;

function fmt(n) {
  const f = Number(n).toFixed(2), [int, dec] = f.split('.');
  const s = parseInt(int, 10).toLocaleString('fr-FR');
  return dec === '00' ? s + ' €' : s + ',' + dec + ' €';
}
const ord = n => n + (n === 1 ? 'er' : 'ème');

function calcAutoSpots(players) { return Math.max(1, Math.round(players * 0.12)); }

/* ══════════════════════════════════════════════════════
   ALGORITHME DE SUGGESTION
   Géométrique pure à deux ancres.
   Utilisé uniquement par le bouton "Suggérer".
   Bisection : Σ(k=0..n-1) last×r^k = pool − firstTarget
   Index interne : 0 = dernier payé, ascendant.
══════════════════════════════════════════════════════ */
function genPayouts(pool, spots, buyinTotal, lastMult, firstPctDecimal) {
  if (!pool || pool <= 0 || !spots || spots < 1) return null;
  if (spots === 1) return [pool];

  const last = round5(buyinTotal * lastMult);
  if (last <= 0 || last >= pool) return null;

  if (spots === 2) {
    const first = pool - last;
    return first > last ? [first, last] : null;
  }

  const firstTarget = round5(pool * firstPctDecimal);
  if (firstTarget <= last) return null;

  const n          = spots - 1;
  const restTarget = pool - firstTarget;

  if (last * n >= restTarget) return null;

  const sumGeo = r => last * (Math.pow(r, n) - 1) / (r - 1);
  let lo = 1.0001, hi = 200;
  for (let i = 0; i < 400; i++) {
    const mid = (lo + hi) / 2;
    if (sumGeo(mid) < restTarget) lo = mid; else hi = mid;
  }
  const r = (lo + hi) / 2;
  if (!isFinite(r)) return null;

  const amounts = [];
  for (let k = 0; k < n; k++) amounts.push(round5(last * Math.pow(r, k)));

  for (let k = 2; k < amounts.length; k++) {
    const prevDelta = amounts[k - 1] - amounts[k - 2];
    const currDelta = amounts[k] - amounts[k - 1];
    if (prevDelta > 0 && currDelta < prevDelta) amounts[k] = amounts[k - 1] + prevDelta;
  }

  const sumRest = amounts.reduce((a, b) => a + b, 0);
  const first   = pool - sumRest;
  if (first <= amounts[amounts.length - 1]) return null;

  return [first, ...amounts.reverse()];
}

/* ══════════════════════════════════════════════════════
   ÉTAT
══════════════════════════════════════════════════════ */
let state = {
  total: 150, pp: 130, frais: 20,
  players: 77, spotsManual: false, spotsOverride: 9,
  lastMult: 2.0, firstPct: 28,
  amounts: [],
  activeTournamentId: null,
  tournaments: [],
};
let ppSplits = {};

function loadPersist() {
  try { Object.assign(state, JSON.parse(localStorage.getItem(PP_STORE) || '{}')); } catch {}
  try { ppSplits = JSON.parse(localStorage.getItem(PP_SPLITS) || '{}'); } catch {}
  if (!Array.isArray(state.amounts)) state.amounts = [];
}
function savePersist() {
  const { total, pp, frais, players, spotsManual, spotsOverride,
          lastMult, firstPct, activeTournamentId, amounts } = state;
  localStorage.setItem(PP_STORE, JSON.stringify({
    total, pp, frais, players, spotsManual, spotsOverride,
    lastMult, firstPct, activeTournamentId, amounts
  }));
}
function saveSplits() { localStorage.setItem(PP_SPLITS, JSON.stringify(ppSplits)); }

/* ══════════════════════════════════════════════════════
   DÉRIVÉS (pas de calcul de payouts ici)
══════════════════════════════════════════════════════ */
function derive() {
  const { total, pp, frais, players, spotsManual, spotsOverride } = state;
  const rake      = cent(pp * RAKE_RATE);
  const netPP     = cent(pp - rake);
  const fraisCas  = cent(frais - CAGNOTTE);
  const ok        = total > 0 && Math.abs(pp + frais - total) < 0.01;
  const autoSpots = players > 0 ? calcAutoSpots(players) : 1;
  const effSpots  = spotsManual ? spotsOverride : autoSpots;
  const poolNet   = ok && players > 0 ? cent(players * netPP) : 0;
  const rakeTotal = ok && players > 0 ? cent(players * rake) : 0;
  const cagTotal  = ok && players > 0 ? cent(players * CAGNOTTE) : 0;
  const poolBrut  = ok && players > 0 ? cent(players * pp) : 0;
  return { rake, netPP, fraisCas, ok, autoSpots, effSpots, poolNet, rakeTotal, cagTotal, poolBrut };
}

/* ══════════════════════════════════════════════════════
   SUGGESTION INLINE
   Pour chaque case vide, calcule le montant idéal qui
   maintiendrait la même accélération (×Δ constant).
══════════════════════════════════════════════════════ */
function computeHint(i, amounts) {
  if ((amounts[i] || 0) > 0) return null;

  const a1 = amounts[i + 1] || 0;
  const a2 = amounts[i + 2] || 0;
  const a3 = amounts[i + 3] || 0;
  if (a1 <= 0) return null;

  const d1 = a1 - a2; // delta entre la place juste en dessous et celle d'après
  if (d1 <= 0) return null;

  /* Même incrément (+Δ) : on répète le saut d1 */
  const flat = round5(a1 + d1);

  /* Même accélération (×Δ) : on applique le ratio d1/d2 */
  const d2   = a2 - a3;
  const accel = d2 > 0 ? round5(a1 + d1 * (d1 / d2)) : null;

  return { flat, accel };
}

/* ══════════════════════════════════════════════════════
   CONSTRUCTION DE LA TABLE (rebuild complet des lignes)
   Appelé uniquement quand le nombre de places change,
   ou après suggest/clear — préserve le focus sinon.
══════════════════════════════════════════════════════ */
function buildTableBody(effSpots) {
  const tbody = document.getElementById('pp-tbody');
  if (!tbody) return;

  tbody.innerHTML = Array.from({ length: effSpots }, (_, i) => {
    const v       = state.amounts[i] > 0 ? state.amounts[i] : '';
    const isFirst = i === 0;
    return `<tr id="pp-row-${i}" class="pp-row${isFirst ? ' r1' : ''}">
      <td><span class="badge">${i + 1}</span><span class="plbl">${ord(i + 1)}</span></td>
      <td class="amt-cell">
        <div class="amt-wrap">
          <div class="iw">
            <span class="ip">€</span>
            <input type="number" id="amt-${i}" class="amt-inp"
              min="0" step="5" value="${v}" placeholder="—"
              oninput="onAmountChange(${i}, this.value)"
              onkeydown="onAmountKey(event, ${i})"/>
          </div>
          <span id="pp-hint-${i}" class="amt-hint" style="display:none"></span>
          ${isFirst
            ? `<button class="btn-fill-first" id="btn-fill-first"
                 onclick="affecterPremier()" title="Affecter le restant au 1er"
                 style="display:none">← restant</button>`
            : ''}
        </div>
      </td>
      <td id="pp-delta-${i}" class="ind-cell"></td>
      <td id="pp-ratio-${i}" class="ind-cell"></td>
      <td id="pp-pct-${i}"   class="ind-cell"></td>
      <td class="bcell"><div class="bbg"><div id="pp-bar-${i}" class="bfill" style="width:0%"></div></div></td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════
   MISE À JOUR DES INDICATEURS (sans rebuild des inputs)
   Appelé à chaque frappe pour ne pas perdre le focus.
══════════════════════════════════════════════════════ */
function updateIndicators(d) {
  const amounts = state.amounts;
  const n       = amounts.length;

  if (!d || !d.poolNet || n === 0) {
    updateRestant(0, 0);
    return;
  }

  /* Deltas entre places consécutives (décroissant, index 0 = 1er) */
  const deltas = amounts.map((v, i) =>
    amounts[i + 1] !== undefined ? v - amounts[i + 1] : null
  );

  const maxAmt = Math.max(...amounts.filter(v => v > 0), 1);

  for (let i = 0; i < n; i++) {
    const amount = amounts[i] || 0;
    const delta  = deltas[i];

    /* ×Δ = delta[i] / premier delta non nul en dessous */
    let ratioD = null;
    if (delta !== null && delta > 0) {
      for (let j = i + 1; j < deltas.length; j++) {
        if (deltas[j] !== null && deltas[j] > 0) { ratioD = delta / deltas[j]; break; }
      }
    }

    /* Statut de la ligne */
    const row = document.getElementById(`pp-row-${i}`);
    if (row) {
      let cls = 'pp-row' + (i === 0 ? ' r1' : '');
      if (amount > 0 && delta !== null && delta < 0) cls += ' row-err';
      else if (ratioD !== null && ratioD < 0.999)   cls += ' row-warn';
      row.className = cls;
    }

    /* Δ */
    const deltaEl = document.getElementById(`pp-delta-${i}`);
    if (deltaEl) deltaEl.innerHTML = renderDelta(delta);

    /* ×Δ */
    const ratioEl = document.getElementById(`pp-ratio-${i}`);
    if (ratioEl) ratioEl.innerHTML = renderRatio(ratioD);

    /* % pool */
    const pctEl = document.getElementById(`pp-pct-${i}`);
    if (pctEl) {
      const pct = d.poolNet > 0 && amount > 0 ? (amount / d.poolNet * 100).toFixed(1) : null;
      let pctCls = 'pct';
      if (pct !== null && i === 0) {
        const p = parseFloat(pct);
        if (p < 20 || p > 45) pctCls += ' ind-warn';
      }
      pctEl.innerHTML = pct
        ? `<span class="${pctCls}">${pct}%</span>`
        : `<span class="pct ind-muted">—</span>`;
    }

    /* Barre */
    const barEl = document.getElementById(`pp-bar-${i}`);
    if (barEl) barEl.style.width = amount > 0 ? `${(amount / maxAmt * 100).toFixed(1)}%` : '0%';

    /* Hint : montants idéaux si la case est vide */
    const hintEl = document.getElementById(`pp-hint-${i}`);
    if (hintEl) {
      if (amount === 0) {
        const hint = computeHint(i, amounts);
        if (hint) {
          const fmtH = v => Math.round(v).toLocaleString('fr-FR') + ' €';
          /* N'affiche l'accélération que si elle diffère de l'incrément plat */
          const showAccel = hint.accel !== null && hint.accel !== hint.flat;
          hintEl.innerHTML =
            (showAccel
              ? `<span class="hint-line hint-accel"><span class="hint-arrow">→</span>${fmtH(hint.accel)}<span class="hint-tag">×Δ</span></span>`
              : '') +
            `<span class="hint-line hint-flat"><span class="hint-arrow">→</span>${fmtH(hint.flat)}<span class="hint-tag">+Δ</span></span>`;
          hintEl.style.display = '';
        } else {
          hintEl.style.display = 'none';
        }
      } else {
        hintEl.style.display = 'none';
      }
    }
  }

  /* Restant */
  const sum     = amounts.reduce((a, b) => a + (b || 0), 0);
  const restant = d.poolNet - sum;
  updateRestant(restant, d.poolNet);

  /* Bouton ← restant (visible seulement s'il y a un restant positif) */
  const btnFill = document.getElementById('btn-fill-first');
  if (btnFill) btnFill.style.display = restant > 0.01 ? '' : 'none';

  /* Bouton Imprimer */
  const printBtn = document.getElementById('btn-print');
  if (printBtn) {
    const ready = Math.abs(restant) < 0.01 && sum > 0;
    printBtn.disabled    = !ready;
    printBtn.style.opacity = ready ? '1' : '0.4';
  }
}

function renderDelta(delta) {
  if (delta === null) return '<span class="delta ind-muted">last</span>';
  if (delta === 0)    return '<span class="delta-eq ind-muted">=</span>';
  if (delta < 0)      return `<span class="delta ind-err">−${Math.round(-delta).toLocaleString('fr-FR')} €</span>`;
  return `<span class="delta ind-ok">+${Math.round(delta).toLocaleString('fr-FR')} €</span>`;
}

function renderRatio(ratioD) {
  if (ratioD === null) return '<span class="ratio-d ind-muted">—</span>';
  const warn = ratioD < 0.999;
  return `<span class="ratio-d ${warn ? 'ind-warn' : 'ind-ok'}">×${ratioD.toFixed(2)}</span>`;
}

/* ══════════════════════════════════════════════════════
   BARRE "RESTANT"
══════════════════════════════════════════════════════ */
function updateRestant(restant, poolNet) {
  const bar = document.getElementById('restant-bar');
  const val = document.getElementById('restant-value');
  const btn = document.getElementById('btn-affecter');
  if (!bar || !val) return;

  if (poolNet <= 0) {
    bar.className = 'restant-bar restant-idle';
    val.innerHTML = '<span class="restant-idle-txt">Configurez le buy-in et les joueurs</span>';
    if (btn) btn.style.display = 'none';
    return;
  }

  const abs = Math.abs(restant);

  if (abs < 0.01) {
    bar.className = 'restant-bar restant-ok';
    val.innerHTML = '<span class="r-ok-ico">✓</span><span class="r-ok-txt">Pool entièrement distribué — prêt à imprimer</span>';
    if (btn) btn.style.display = 'none';
  } else if (restant > 0) {
    const pct = (restant / poolNet * 100).toFixed(1);
    bar.className = `restant-bar ${abs > poolNet * 0.05 ? 'restant-err' : 'restant-warn'}`;
    val.innerHTML = `<span class="r-amount">${fmt(restant)}</span><span class="r-sub">à distribuer (${pct}% du pool)</span>`;
    if (btn) btn.style.display = '';
  } else {
    bar.className = 'restant-bar restant-err';
    val.innerHTML = `<span class="r-amount">${fmt(-restant)}</span><span class="r-sub">de trop — dépasse le pool net</span>`;
    if (btn) btn.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════════
   RENDU TABLE
══════════════════════════════════════════════════════ */
function renderTable(d) {
  const tableEl = document.getElementById('pp-table');
  const errEl   = document.getElementById('pp-error');
  const fnoteEl = document.getElementById('pp-fnote');

  if (!d.ok || !d.poolNet) {
    tableEl.style.display   = 'none';
    if (fnoteEl) fnoteEl.style.display = 'none';
    errEl.style.display     = 'block';
    errEl.textContent       = 'Corrige la décomposition du buy-in.';
    updateRestant(0, 0);
    return;
  }

  errEl.style.display = 'none';
  tableEl.style.display = '';
  if (fnoteEl) fnoteEl.style.display = '';

  /* Reconstruire les lignes si le nombre de places a changé, ou si le tbody est vide
     (cas rechargement page avec amounts déjà sauvegardés de bonne longueur) */
  const tbody = document.getElementById('pp-tbody');
  if (!tbody || tbody.children.length === 0 || state.amounts.length !== d.effSpots) {
    const old    = [...state.amounts];
    state.amounts = Array.from({ length: d.effSpots }, (_, i) => old[i] || 0);
    buildTableBody(d.effSpots);
  }

  updateIndicators(d);
}

/* ══════════════════════════════════════════════════════
   RENDU PRINCIPAL
══════════════════════════════════════════════════════ */
function render() {
  const d = derive();

  /* Alerte buy-in */
  const alertEl = document.getElementById('buyin-alert');
  if (!d.ok && state.total && state.pp && state.frais) {
    alertEl.style.display = 'flex';
    document.getElementById('buyin-alert-txt').innerHTML =
      `<strong>PP (${fmt(state.pp)}) + Frais (${fmt(state.frais)}) = ${fmt(cent(state.pp + state.frais))}</strong>` +
      ` ≠ Prix total (${fmt(state.total)}).`;
  } else {
    alertEl.style.display = 'none';
  }

  const hasErr = !d.ok && state.total && state.pp && state.frais;
  ['inp-total', 'inp-pp', 'inp-frais'].forEach(id =>
    document.getElementById(id)?.classList.toggle('err', !!hasErr)
  );

  /* Récap */
  document.getElementById('sum-brut').textContent = d.ok ? fmt(d.poolBrut)  : '—';
  document.getElementById('sum-rake').textContent = d.ok ? fmt(d.rakeTotal) : '—';
  document.getElementById('sum-pool').textContent = d.ok ? fmt(d.poolNet)   : '—';
  document.getElementById('sum-cag' ).textContent = d.ok ? fmt(d.cagTotal)  : '—';

  /* Places */
  const spotsInp = document.getElementById('inp-spots');
  if (spotsInp) { spotsInp.value = d.effSpots; spotsInp.disabled = !state.spotsManual; }
  const pfx = document.getElementById('spots-pfx');
  if (pfx) pfx.style.color = state.spotsManual ? 'var(--gold)' : 'var(--text-muted)';
  document.getElementById('spots-tog')?.classList.toggle('on', state.spotsManual);
  const togLbl = document.getElementById('spots-tog-lbl');
  if (togLbl) togLbl.textContent = state.spotsManual
    ? 'Places : override manuel'
    : `Places : auto — ${d.autoSpots} (12% de ${state.players} joueurs)`;

  /* Table */
  renderTable(d);

  /* Résumés accordéons */
  const sumBuyin = document.getElementById('acc-sum-buyin');
  if (sumBuyin) sumBuyin.textContent = d.ok
    ? `${fmt(state.total)} · PP ${fmt(state.pp)} · Frais ${fmt(state.frais)}`
    : `${fmt(state.total)}`;
  const sumPresets = document.getElementById('acc-sum-presets');
  if (sumPresets) {
    const active = state.tournaments.find(t => t.id === state.activeTournamentId);
    sumPresets.textContent = active ? active.name : '';
  }

  /* En-tête impression */
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const printSub = document.getElementById('print-sub');
  if (printSub) printSub.textContent =
    `${state.players} joueurs · Buy-in ${fmt(state.total)} · ${d.effSpots} places payées`;
  const printMeta = document.getElementById('print-meta');
  if (printMeta) printMeta.innerHTML =
    `<div>${now}</div><div>Pool net : ${fmt(d.poolNet)}</div>`;
}

/* ══════════════════════════════════════════════════════
   ACTIONS SUR LA TABLE
══════════════════════════════════════════════════════ */
function onAmountChange(i, val) {
  const n = parseFloat(val);
  state.amounts[i] = isNaN(n) || n <= 0 ? 0 : n;
  updateIndicators(derive());
  savePersist();
}

function onAmountKey(event, i) {
  if (event.key === 'Enter') {
    event.preventDefault();
    /* Avancer à la place suivante, ou revenir à la 1ère */
    const next = document.getElementById(`amt-${i + 1}`) || document.getElementById('amt-0');
    next?.focus();
    next?.select();
  }
}

function suggest() {
  const d = derive();
  if (!d.ok || !d.poolNet) return;
  const payouts = genPayouts(d.poolNet, d.effSpots, state.total, state.lastMult, state.firstPct / 100);
  if (!payouts) {
    const errEl = document.getElementById('pp-error');
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Suggestion impossible — ajuste le % 1er ou le multiplicateur dernier.'; }
    return;
  }
  document.getElementById('pp-error').style.display = 'none';
  state.amounts = [...payouts];
  buildTableBody(d.effSpots);
  updateIndicators(d);
  savePersist();
}

function clearAmounts() {
  const d = derive();
  state.amounts = Array(d.effSpots).fill(0);
  buildTableBody(d.effSpots);
  updateIndicators(d);
  savePersist();
}

function affecterPremier() {
  const d = derive();
  if (!d.poolNet) return;
  const sumRest = state.amounts.slice(1).reduce((a, b) => a + (b || 0), 0);
  const first   = Math.round((d.poolNet - sumRest) * 100) / 100;
  if (first > 0) {
    state.amounts[0] = first;
    const inp = document.getElementById('amt-0');
    if (inp) { inp.value = first; }
    updateIndicators(d);
    savePersist();
  }
}

function doPrint() { window.print(); }

/* ══════════════════════════════════════════════════════
   ACCORDÉONS
══════════════════════════════════════════════════════ */
function toggleAcc(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  const hdr = body.previousElementSibling;
  hdr?.querySelector('.acc-chevron')?.classList.toggle('acc-chevron-closed', isOpen);
}

/* ══════════════════════════════════════════════════════
   CHAMPS BUY-IN
══════════════════════════════════════════════════════ */
function onField(key, val) {
  const n = parseFloat(val);
  if (isNaN(n)) return;
  state[key] = n;

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
    if (state.frais > state.total) state.frais = state.total;
    state.pp = cent(state.total - state.frais);
    document.getElementById('inp-pp').value    = state.pp;
    document.getElementById('inp-frais').value = state.frais;
    saveSplitIfActive();
  }
  savePersist();
  render();
}

const KEY_TO_ID = {
  total: 'inp-total', pp: 'inp-pp', frais: 'inp-frais',
  players: 'inp-players', lastMult: 'inp-lastmult', firstPct: 'inp-firstpct',
};

function clampField(key, min, max) {
  const el = document.getElementById(KEY_TO_ID[key]);
  const v  = parseFloat(el?.value) || min;
  const clamped = max !== undefined ? Math.min(Math.max(min, v), max) : Math.max(min, v);
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
    state.frais = Math.max(5, round5(t.buyin * 0.10));
    state.pp    = t.buyin - state.frais;
  }
  /* Réinitialiser les montants pour le nouveau tournoi */
  state.amounts = [];
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
   SYNC INPUTS → state vers HTML
══════════════════════════════════════════════════════ */
function syncInputs() {
  document.getElementById('inp-total'   ).value = state.total;
  document.getElementById('inp-pp'      ).value = state.pp;
  document.getElementById('inp-frais'   ).value = state.frais;
  document.getElementById('inp-players' ).value = state.players;
  document.getElementById('inp-lastmult').value = state.lastMult;
  document.getElementById('inp-firstpct').value = state.firstPct;
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

  document.getElementById('fs-indicator')?.addEventListener('click', async () => {
    await loadTournaments();
    render();
  });
});

async function loadTournaments() {
  state.tournaments = await TournamentsStore.read();
  renderPresets();
}

/* ══════════════════════════════════════════════════════
   MODAL — GESTION DES TOURNOIS
   Interface discrète : ⚙ dans l'en-tête des presets.
   Modifie uniquement name / day / buyin.
   La clé "points" (leaderboard) est préservée.
══════════════════════════════════════════════════════ */
function openTmModal(e) {
  if (e) e.stopPropagation();
  tmRenderList();
  document.getElementById('tm-modal').style.display = 'flex';
}

function closeTmModal() {
  document.getElementById('tm-modal').style.display = 'none';
  tmCloseForm();
}

function closeTmModalIfBg(e) {
  if (e.target === document.getElementById('tm-modal')) closeTmModal();
}

function tmRenderList() {
  const list = document.getElementById('tm-list');
  if (!list) return;
  const ts = state.tournaments;
  if (!ts.length) {
    list.innerHTML = '<div class="tm-empty">Aucun tournoi — cliquez + Ajouter</div>';
    return;
  }
  list.innerHTML = ts.map(t => `
    <div class="tm-row" id="tm-row-${t.id}">
      <div class="tm-row-info">
        <span class="tm-row-name">${t.name}</span>
        <span class="tm-row-meta">${t.day} · ${t.buyin} €</span>
      </div>
      <div class="tm-row-actions">
        <button class="tm-btn-edit" onclick="tmOpenForm('${t.id}')" title="Modifier">✎</button>
        <button class="tm-btn-del"  onclick="tmDelete('${t.id}')"   title="Supprimer">✕</button>
      </div>
    </div>`).join('');
}

function tmOpenForm(editId) {
  const t = editId ? state.tournaments.find(t => t.id === editId) : null;
  document.getElementById('tm-form-edit-id').value = editId || '';
  document.getElementById('tm-form-name').value    = t ? t.name  : '';
  document.getElementById('tm-form-day').value     = t ? t.day   : 'Lundi';
  document.getElementById('tm-form-buyin').value   = t ? t.buyin : '';
  document.getElementById('tm-form-title').textContent = editId ? 'Modifier le tournoi' : 'Nouveau tournoi';
  document.getElementById('tm-form').style.display = '';
  document.getElementById('tm-form-name').focus();
}

function tmCloseForm() {
  const f = document.getElementById('tm-form');
  if (f) f.style.display = 'none';
}

async function tmSave() {
  const name  = (document.getElementById('tm-form-name').value || '').trim();
  const day   = (document.getElementById('tm-form-day').value  || '').trim();
  const buyin = parseFloat(document.getElementById('tm-form-buyin').value) || 0;
  const editId = document.getElementById('tm-form-edit-id').value;

  if (!name)    { document.getElementById('tm-form-name').focus();  return; }
  if (buyin <= 0){ document.getElementById('tm-form-buyin').focus(); return; }

  if (editId) {
    state.tournaments = await TournamentsStore.update(editId, { name, day, buyin });
  } else {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
    state.tournaments = await TournamentsStore.add({ id, name, day, buyin, points: [] });
  }

  tmCloseForm();
  tmRenderList();
  renderPresets();
  savePersist();
}

async function tmDelete(id) {
  const t = state.tournaments.find(t => t.id === id);
  if (!t) return;
  if (!confirm(`Supprimer "${t.name}" ?`)) return;
  state.tournaments = await TournamentsStore.remove(id);
  if (state.activeTournamentId === id) state.activeTournamentId = null;
  tmRenderList();
  renderPresets();
  savePersist();
}
