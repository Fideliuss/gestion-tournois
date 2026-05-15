/* ═══════════════════════════════════════════════
   barriere.js — Scripts communs
   Casino Barrière Bordeaux · Outils Tournois
═══════════════════════════════════════════════ */

/* Injection favicon — chemin déduit depuis l'URL du script lui-même */
(function () {
  const base = document.currentScript.src.replace('barriere.js', 'favicon/');
  [
    { rel: 'icon',            href: base + 'favicon.ico', sizes: '32x32' },
    { rel: 'icon',            href: base + 'favicon.svg', type: 'image/svg+xml' },
    { rel: 'apple-touch-icon',href: base + 'apple-touch-icon.png' },
    { rel: 'manifest',        href: base + 'site.webmanifest' },
  ].forEach(({ rel, href, sizes, type }) => {
    const l = document.createElement('link');
    l.rel = rel; l.href = href;
    if (sizes) l.sizes = sizes;
    if (type)  l.type  = type;
    document.head.appendChild(l);
  });
})();

function applyTheme(light) {
  document.body.classList.toggle('light', light);
  document.getElementById('theme-icon').textContent  = light ? '🌙' : '☀️';
  document.getElementById('theme-label').textContent = light ? 'Mode nuit' : 'Mode jour';
}

function toggleTheme() {
  const isLight = !document.body.classList.contains('light');
  localStorage.setItem('barriere_theme', isLight ? 'light' : 'dark');
  applyTheme(isLight);
}

/* Application automatique au chargement */
document.addEventListener('DOMContentLoaded', () =>
  applyTheme(localStorage.getItem('barriere_theme') === 'light')
);

/* Transitions de page */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || a.target === '_blank') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript')) return;
  e.preventDefault();
  document.body.classList.add('is-leaving');
  setTimeout(() => { window.location.href = href; }, 200);
});

/* ═══════════════════════════════════════════════
   BarriereFS — Couche de persistance partagée
   File System Access API + IndexedDB
   Utilisé par : leaderboard.js · extras.js
═══════════════════════════════════════════════ */
const BarriereFS = {
  dirHandle: null,
  dbName:    'barriere_fs_v1',

  async _openDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
      req.onsuccess = e => res(e.target.result);
      req.onerror = rej;
    });
  },
  async _saveHandle(h) {
    const db = await this._openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(h, 'dir');
      tx.oncomplete = res; tx.onerror = rej;
    });
  },
  async _loadHandle() {
    const db = await this._openDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get('dir');
      req.onsuccess = e => res(e.target.result || null);
      req.onerror = rej;
    });
  },

  async _initFiles(h) {
    const files = [
      { name: 'barriere_data.json', init: { version:1, results:[], sessions:[], tournaments:null } },
      { name: 'extras_data.json',   init: { version:1, extras:[] } },
    ];
    for (const f of files) {
      try { await h.getFileHandle(f.name); }
      catch {
        const fh = await h.getFileHandle(f.name, { create: true });
        const w  = await fh.createWritable();
        await w.write(JSON.stringify(f.init, null, 2));
        await w.close();
      }
    }
  },

  async connect() {
    if (!window.showDirectoryPicker) {
      alert("Votre navigateur ne supporte pas la sélection de dossier.\nUtilisez Google Chrome ou Microsoft Edge.");
      return false;
    }
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      const h    = await root.getDirectoryHandle('data', { create: true });
      this.dirHandle = h;
      await this._saveHandle(h);
      await this._initFiles(h);
      this._updateUI();
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') alert("Impossible d'ouvrir le sélecteur de dossier.\n" + e.message);
      return false;
    }
  },

  async restore() {
    try {
      const h = await this._loadHandle();
      if (!h) return false;
      const p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') { this.dirHandle = h; this._updateUI(); return true; }
      const g = await h.requestPermission({ mode: 'readwrite' });
      if (g === 'granted') { this.dirHandle = h; this._updateUI(); return true; }
    } catch {}
    return false;
  },

  async read(fileName, fallback) {
    if (!this.dirHandle) return fallback;
    try {
      const fh = await this.dirHandle.getFileHandle(fileName);
      return JSON.parse(await (await fh.getFile()).text());
    } catch { return fallback; }
  },

  async write(fileName, data) {
    if (!this.dirHandle) return false;
    const fh = await this.dirHandle.getFileHandle(fileName, { create: true });
    const w  = await fh.createWritable();
    await w.write(JSON.stringify(data, null, 2));
    await w.close();
    return true;
  },

  _updateUI() {
    const c  = !!this.dirHandle;
    const el = document.getElementById('fs-indicator');
    if (!el) return;
    el.className = 'fs-indicator ' + (c ? 'connected' : 'disconnected');
    el.title     = c ? 'Connecté · dossier data/' : 'Cliquer pour connecter le dossier de données';
    const lbl    = document.getElementById('fs-ind-label');
    if (lbl) lbl.textContent = c ? 'data/' : 'Données';
  },

  get connected() { return !!this.dirHandle; }
};

async function connectFolder() { await BarriereFS.connect(); }
