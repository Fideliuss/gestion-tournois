// ══════════════════════════════════════════════════════
//  NAV — barre de navigation commune
//  Injectée par AUTH.guard une fois l'accès validé (auth.js charge ce fichier et nav.css).
//  Trois niveaux : sections · pages de la section · fil d'Ariane (pour les pages de 3e niveau).
//  Les entrées suivent les droits de l'utilisateur : admin = tout, sinon panels du rôle (app_roles).
//  Pour ajouter une page : la déclarer dans PAGES (et dans SECTIONS si elle doit apparaître dans le menu).
// ══════════════════════════════════════════════════════

const NAV = (function () {

  // Chemins relatifs à la racine du site
  const SECTIONS = [
    { id: 'tournois', label: 'Outils Tournois', href: 'outils_tournois.html', panel: 'tournois', children: [
      { label: 'Prize Pool',     href: 'prize_pool/prize_pool.html',  panel: 'prize-pool' },
      { label: 'Leaderboard',    href: 'leaderboard/leaderboard.html', panel: 'leaderboard' },
      { label: 'Administration', href: 'admin/admin_tournois.html',   panel: 'admin-tournois' },
    ] },
    { id: 'training', label: 'Training Croupier', href: 'training/training.html', panel: 'training', children: [
      { label: 'Black Jack',             href: 'training/blackjack/blackjack_hub.html' },
      { label: 'Roulette Anglaise',      href: 'training/roulette/roulette_hub.html' },
      { label: 'Ultimate Texas Hold\'em', href: 'training/uth/uth_hub.html' },
      { label: 'Mes résultats',          href: 'training/suivi/suivi_croupier.html' },
      { label: 'Suivi équipe',           href: 'training/suivi/suivi_manager.html', panel: 'training-suivi' },
    ] },
    { id: 'comptes', label: 'Comptes', href: 'admin/comptes.html', role: 'admin' },
  ];

  // Page → section (s), entrée active du 2e niveau (c), chemin sous cette entrée (t : [libellé, lien?]).
  // Le fil d'Ariane s'affiche à partir de deux éléments dans t (page de 3e niveau).
  const BJ = 'training/blackjack/blackjack_hub.html', RO = 'training/roulette/roulette_hub.html', UTH = 'training/uth/uth_hub.html';
  const AD = 'admin/admin_tournois.html', DECL = 'admin/declaration/declaration.html';
  const mod = function (hub, hubLabel, label) { return { s: 'training', c: hub, t: [[hubLabel, hub], [label]] }; };
  const PAGES = {
    'index.html': {},
    'outils_tournois.html': { s: 'tournois' },
    'prize_pool/prize_pool.html': { s: 'tournois', c: 'prize_pool/prize_pool.html' },
    'leaderboard/leaderboard.html': { s: 'tournois', c: 'leaderboard/leaderboard.html' },
    'admin/admin_tournois.html': { s: 'tournois', c: AD },
    'admin/config_tournois.html': { s: 'tournois', c: AD, t: [['Administration', AD], ['Config tournois']] },
    'admin/declaration/declaration.html': { s: 'tournois', c: AD, t: [['Administration', AD], ['Déclaration DTPJ']] },
    'admin/extras/extras.html': { s: 'tournois', c: AD, t: [['Administration', AD], ['Déclaration Extras']] },
    'admin/declaration/courriers.html': { s: 'tournois', c: AD, t: [['Administration', AD], ['Déclaration DTPJ', DECL], ['Courriers PN']] },
    'admin/comptes.html': { s: 'comptes' },
    'training/training.html': { s: 'training' },
    'training/blackjack/blackjack_hub.html': { s: 'training', c: BJ },
    'training/blackjack/blackjack.html': mod(BJ, 'Black Jack', 'BJ Paiement'),
    'training/blackjack/blackjack_score.html': mod(BJ, 'Black Jack', 'BJ Score'),
    'training/roulette/roulette_hub.html': { s: 'training', c: RO },
    'training/roulette/roulette_paiement.html': mod(RO, 'Roulette Anglaise', 'Calcul paiement'),
    'training/roulette/roulette_conversion.html': mod(RO, 'Roulette Anglaise', 'Conversion pièces'),
    'training/roulette/roulette_couleur.html': mod(RO, 'Roulette Anglaise', 'Couleur du numéro'),
    'training/roulette/roulette_pointage.html': mod(RO, 'Roulette Anglaise', 'Pointage numéro'),
    'training/roulette/roulette_tables.html': mod(RO, 'Roulette Anglaise', 'Tables de multiplication'),
    'training/uth/uth_hub.html': { s: 'training', c: UTH },
    'training/uth/uth_main.html': mod(UTH, 'Ultimate Texas Hold\'em', 'Meilleure main'),
    'training/uth/uth_gagnant.html': mod(UTH, 'Ultimate Texas Hold\'em', 'Qui gagne ?'),
    'training/uth/uth_gains.html': mod(UTH, 'Ultimate Texas Hold\'em', 'Calcul des gains'),
    'training/suivi/suivi_croupier.html': { s: 'training', c: 'training/suivi/suivi_croupier.html' },
    'training/suivi/suivi_manager.html': { s: 'training', c: 'training/suivi/suivi_manager.html' },
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { n.addEventListener(ev, attrs.on[ev]); });
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function icon(paths) {
    const s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = paths;                 // constantes ci-dessous, jamais de données utilisateur
    return s;
  }
  const ICON_SUN  = '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>';
  const ICON_MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
  const ICON_USER = '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>';
  const ICON_MENU = '<path d="M4 7h16M4 12h16M4 17h16"/>';
  const ICON_X    = '<path d="M6 6l12 12M18 6L6 18"/>';

  // Le chemin peut s'afficher sans « .html » (serveurs locaux) : on compare sans l'extension
  function pageKey() {
    const path = location.pathname.replace(/\.html$/, '');
    if (path === '' || /\/$/.test(path) || /\/index$/.test(path)) return 'index.html';
    let best = null;
    Object.keys(PAGES).forEach(function (k) {
      if (path.endsWith('/' + k.replace(/\.html$/, '')) && (!best || k.length > best.length)) best = k;
    });
    return best;
  }

  function roleLabel(role) {
    return role === 'admin' ? 'Admin' : role === 'mcd' ? 'MCD' : role === 'floor' ? 'Floor' : role.charAt(0).toUpperCase() + role.slice(1);
  }

  // opts : { root, loginUrl, email, role, isAdmin, panels, color }
  function mount(opts) {
    const root = opts.root, panels = opts.panels || [];
    const can = function (item) {
      if (opts.isAdmin) return true;
      if (item.role) return item.role === opts.role;
      return !item.panel || panels.indexOf(item.panel) >= 0;
    };
    const sections = SECTIONS.filter(can).map(function (s) {
      return Object.assign({}, s, { children: (s.children || []).filter(function (c) { return can(Object.assign({ panel: s.panel }, c)); }) });
    });

    const key = pageKey(), page = (key && PAGES[key]) || {};
    const current = sections.find(function (s) { return s.id === page.s; }) || null;
    const href = function (p) { return root + p; };
    const mark = function (a, on) { if (on) a.setAttribute('aria-current', 'page'); return a; };

    // Ancienne interface flottante (retour, thème, badge) : remplacée par la barre
    document.querySelectorAll('.back, .theme-toggle, #auth-badge').forEach(function (n) { n.remove(); });

    // ── Ligne 1 ──
    const logo = function (file, cls) { return el('img', { src: href('shared/logos/' + file), alt: '', class: cls }); };
    const brand = el('a', { class: 'nav-brand', href: href('index.html'), 'aria-label': 'Barrière Casino — Accueil' },
      [logo('barriere_casino-logo.svg', 'logo-light'), logo('barriere_casino-logo-black.svg', 'logo-dark')]);

    const links = el('nav', { class: 'nav-sections', 'aria-label': 'Sections' }, sections.map(function (s) {
      return mark(el('a', { class: 'nav-link', href: href(s.href), text: s.label }), current && current.id === s.id);
    }));

    const themeBtn = el('button', { class: 'nav-btn nav-theme', type: 'button', on: { click: function () { toggleTheme(); } } }, [
      icon(ICON_SUN), icon(ICON_MOON),
      el('span', { id: 'theme-icon', hidden: true }), el('span', { id: 'theme-label', text: 'Mode jour' }),
    ]);
    themeBtn.querySelectorAll('svg')[0].classList.add('i-sun');
    themeBtn.querySelectorAll('svg')[1].classList.add('i-moon');

    const color = /^#[0-9a-f]{3,8}$/i.test(opts.color || '') ? opts.color : '#C37814';
    const chip = function () { const c = el('span', { class: 'nav-chip', text: roleLabel(opts.role) }); c.style.background = color + '28'; c.style.color = color; return c; };
    const short = opts.email.split('@')[0];

    const menu = el('div', { class: 'nav-menu', id: 'nav-menu', role: 'menu', hidden: true }, [
      el('div', { class: 'nav-menu-id' }, [el('b', { text: opts.email }), el('span', {}, [chip()])]),
      el('button', { type: 'button', role: 'menuitem', text: 'Changer le mot de passe', on: { click: function () { closeMenu(); AUTH._openChangePwd(); } } }),
      el('button', { type: 'button', role: 'menuitem', text: 'Déconnexion', on: { click: function () { AUTH.signOut(opts.loginUrl); } } }),
    ]);
    const userBtn = el('button', { class: 'nav-btn', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': 'nav-menu' },
      [icon(ICON_USER), el('span', { class: 'nav-user-name', text: short })]);
    const closeMenu = function () { menu.hidden = true; userBtn.setAttribute('aria-expanded', 'false'); };
    userBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      userBtn.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });

    const burger = el('button', { class: 'nav-btn nav-burger', type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'nav-panel' }, [icon(ICON_MENU)]);
    const main = el('div', { class: 'nav-main' }, [brand, links, el('div', { class: 'nav-tools' }, [themeBtn, userBtn]), burger]);

    // ── Ligne 2 : pages de la section ──
    let sub = null;
    if (current && current.children.length) {
      sub = el('nav', { class: 'nav-sub', 'aria-label': current.label }, current.children.map(function (c) {
        return mark(el('a', { href: href(c.href), text: c.label }), page.c === c.href);
      }));
    }

    // ── Ligne 3 : fil d'Ariane (pages de 3e niveau) ──
    let crumbs = null;
    if (current && page.t && page.t.length >= 2) {
      const parts = [el('a', { href: href(current.href), text: current.label })];
      page.t.forEach(function (p, i) {
        parts.push(el('span', { class: 'sep', 'aria-hidden': 'true', text: '›' }));
        parts.push(i < page.t.length - 1 && p[1] ? el('a', { href: href(p[1]), text: p[0] }) : mark(el('span', { text: p[0] }), i === page.t.length - 1));
      });
      crumbs = el('nav', { class: 'nav-crumbs', 'aria-label': 'Fil d\'Ariane' }, parts);
    }

    // ── Menu replié (mobile) ──
    const panel = el('div', { class: 'nav-panel', id: 'nav-panel' }, sections.map(function (s) {
      return el('div', { class: 'grp' }, [
        mark(el('a', { href: href(s.href), text: s.label }), current && current.id === s.id && !page.c),
        s.children.length ? el('div', { class: 'sub' }, s.children.map(function (c) { return mark(el('a', { href: href(c.href), text: c.label }), page.c === c.href); })) : null,
      ]);
    }).concat([el('div', { class: 'acts' }, [
      el('div', { class: 'who', text: opts.email + ' · ' + roleLabel(opts.role) }),
      el('button', { type: 'button', text: 'Changer de thème', on: { click: function () { toggleTheme(); } } }),
      el('button', { type: 'button', text: 'Changer le mot de passe', on: { click: function () { AUTH._openChangePwd(); } } }),
      el('button', { type: 'button', text: 'Déconnexion', on: { click: function () { AUTH.signOut(opts.loginUrl); } } }),
    ])]));
    burger.addEventListener('click', function () {
      const open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.replaceChildren(icon(open ? ICON_X : ICON_MENU));
    });

    const nav = el('header', { class: 'nav' }, [main, sub, crumbs, panel, menu]);
    document.body.classList.add('has-nav');
    document.body.insertBefore(nav, document.body.firstChild);
    if (typeof applyTheme === 'function') applyTheme(document.body.classList.contains('light'));
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    return true;
  }

  return { mount: mount, pageKey: pageKey, SECTIONS: SECTIONS, PAGES: PAGES };
})();
