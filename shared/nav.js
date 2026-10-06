// ══════════════════════════════════════════════════════
//  NAV — barre de navigation commune
//  Injectée par AUTH.guard une fois l'accès validé (auth.js charge ce fichier et nav.css).
//
//  Structure : des ESPACES (Outils Tournois, Training Croupier…) qui ont chacun leurs pages ; un lanceur d'espaces ;
//  des menus déroulants pour les pages qui regroupent des modules ; un menu Administration (admin) à droite
//  (gestion des comptes, config Training).
//
//  La barre s'adapte aux droits de l'utilisateur (admin = tout, sinon les panels de son rôle) :
//   · un seul espace accessible  → pas de lanceur, le nom de l'espace est un simple titre ;
//   · à l'ouverture (index.html) → un seul espace : on y entre directement ;
//   · espace Outils Tournois avec une seule page accessible → on arrive directement sur cette page ;
//   · un droit sur une sous-page seule suffit à afficher l'espace, avec cette page.
//
//  Pour ajouter une page : la déclarer dans SPACES (menu) ; pour un nouvel espace, ajouter une entrée à SPACES.
// ══════════════════════════════════════════════════════

const NAV = (function () {

  // Chemins relatifs à la racine du site. `panel` : droit requis (hérité de l'espace si absent).
  const T = 'training/', BJ = T + 'blackjack/', RO = T + 'roulette/', UTH = T + 'uth/';
  const SPACES = [
    { id: 'tournois', label: 'Outils Tournois', note: 'Prize pool, classement, administration', href: 'outils_tournois.html', panel: 'tournois', items: [
      { label: 'Prize Pool',  href: 'prize_pool/prize_pool.html',   panel: 'prize-pool' },
      { label: 'Leaderboard', href: 'leaderboard/leaderboard.html', panel: 'leaderboard' },
      { label: 'Administration tournois', id: 'admin-tournois', panel: 'admin-tournois', menu: [
        { label: 'Déclaration DTPJ',      href: 'admin/declaration/declaration.html' },
        { label: 'Générateur de courrier', href: 'admin/declaration/courriers.html' },
        { label: 'Gestion des Extras',    href: 'admin/extras/extras.html' },
        { label: 'Calendrier & barèmes',  href: 'admin/config_tournois.html' },
      ] },
    ] },
    { id: 'training', label: 'Training Croupier', note: 'Black Jack, roulette, Ultimate Texas Hold\'em', href: T + 'training.html', panel: 'training', items: [
      { label: 'Black Jack', id: 'blackjack', menu: [
        { label: 'BJ Paiement', href: BJ + 'blackjack.html' },
        { label: 'BJ Score',    href: BJ + 'blackjack_score.html' },
      ] },
      { label: 'Roulette Anglaise', id: 'roulette', menu: [
        { label: 'Calcul paiement',          href: RO + 'roulette_paiement.html' },
        { label: 'Conversion pièces',        href: RO + 'roulette_conversion.html' },
        { label: 'Couleur du numéro',        href: RO + 'roulette_couleur.html' },
        { label: 'Pointage numéro',          href: RO + 'roulette_pointage.html' },
        { label: 'Tables de multiplication', href: RO + 'roulette_tables.html' },
      ] },
      { label: 'Ultimate Texas Hold\'em', id: 'uth', menu: [
        { label: 'Meilleure main',   href: UTH + 'uth_main.html' },
        { label: 'Qui gagne ?',      href: UTH + 'uth_gagnant.html' },
        { label: 'Calcul des gains', href: UTH + 'uth_gains.html' },
      ] },
      { label: 'Mes résultats', href: T + 'suivi/suivi_croupier.html' },
    ] },
  ];

  // Menu « Gestion », à droite de la barre : une partie par domaine (Comptes, Training), chaque entrée selon les droits
  // (`role: 'admin'` = admins seulement ; `panel` = droit de l'espace, comme dans les gardes de page)
  const GESTION = { label: 'Gestion', groups: [
    { title: 'Comptes',  items: [ { label: 'Gestion des comptes',       href: 'admin/comptes.html',            role: 'admin' } ] },
    { title: 'Training', items: [
      { label: 'Suivi équipe',              href: T + 'suivi/suivi_manager.html', panel: 'training-suivi' },
      { label: 'Configuration des modules', href: 'admin/config_training.html',   role: 'admin' },
    ] },
  ] };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    moon:  '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    user:  '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>',
    menu:  '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x:     '<path d="M6 6l12 12M18 6L6 18"/>',
    down:  '<path d="M6 9l6 6 6-6"/>',
  };

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

  function icon(name, cls) {
    const s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = ICONS[name];            // constantes ci-dessus, jamais de données utilisateur
    return s;
  }

  // Index des pages : chemin → { s: espace, i: entrée de la barre à souligner }
  const PAGES = { 'index.html': {} };
  GESTION.groups.forEach(function (g) { g.items.forEach(function (it) { PAGES[it.href] = { admin: true }; }); });
  // Suivi équipe et Configuration des modules restent dans le contexte Training : la barre de l'espace est affichée, « Gestion » surligné
  PAGES[T + 'suivi/suivi_manager.html'].s = 'training';
  PAGES['admin/config_training.html'].s = 'training';
  SPACES.forEach(function (s) {
    PAGES[s.href] = { s: s.id };
    s.items.forEach(function (it) {
      const id = it.id || it.href;                      // entrée de la barre : un lien (href) ou un menu de pages (id + menu)
      if (it.href) PAGES[it.href] = { s: s.id, i: id };
      (it.menu || []).forEach(function (m) { PAGES[m.href] = { s: s.id, i: id }; });
    });
  });

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

  // Espaces et pages visibles pour cet utilisateur
  function visibleSpaces(opts) {
    const panels = opts.panels || [];
    const has = function (p) { return opts.isAdmin || !p || panels.indexOf(p) >= 0; };
    const out = [];
    SPACES.forEach(function (s) {
      const items = s.items.filter(function (it) { return has(it.panel || s.panel); });
      const parent = has(s.panel);
      if (!parent && !items.length) return;
      // Sans le droit sur l'espace lui-même, on n'affiche que les pages dont on a le droit propre
      out.push(Object.assign({}, s, { items: parent ? items : s.items.filter(function (it) { return it.panel && has(it.panel); }), parent: parent }));
    });
    return out.filter(function (s) { return s.items.length || s.parent; });
  }

  // Page d'une entrée de la barre : son lien, ou la première page de son menu déroulant
  function itemHref(it) { return it.href || (it.menu && it.menu[0] && it.menu[0].href); }

  // Page d'entrée d'un espace : sa page d'accueil si l'on y a droit, sinon la seule page accessible
  function entryOf(space) {
    if (space.items.length === 1) return itemHref(space.items[0]);
    return space.parent ? space.href : (space.items[0] && itemHref(space.items[0])) || space.href;
  }

  // opts : { root, loginUrl, email, role, isAdmin, panels, color }
  // Renvoie true si la barre est en place (ou si l'on est redirigé), false pour retomber sur l'ancienne interface
  function mount(opts) {
    const root = opts.root, key = pageKey(), page = (key && PAGES[key]) || {};
    const spaces = visibleSpaces(opts);
    const href = function (p) { return root + p; };

    // ── Redirections d'entrée ──
    if (key === 'index.html' && spaces.length === 1) { location.replace(href(entryOf(spaces[0]))); return true; }
    if (page.s && !page.i && spaces.length) {                       // page d'accueil d'un espace
      const sp = spaces.find(function (s) { return s.id === page.s; });
      if (sp && sp.items.length === 1 && itemHref(sp.items[0]) !== key) { location.replace(href(itemHref(sp.items[0]))); return true; }
    }

    const current = spaces.find(function (s) { return s.id === page.s; }) || null;

    // Ancienne interface flottante (retour, thème, badge) : remplacée par la barre
    document.querySelectorAll('.back, .theme-toggle, #auth-badge').forEach(function (n) { n.remove(); });

    // ── Menus déroulants : un seul ouvert à la fois ──
    const dropdowns = [];
    const closeAll = function (except) {
      dropdowns.forEach(function (d) { if (d !== except) { d.pop.hidden = true; d.btn.setAttribute('aria-expanded', 'false'); } });
    };
    const dropdown = function (btn, popContent, alignRight) {
      const pop = el('div', { class: 'nav-pop-wrap' + (alignRight ? ' right' : ''), hidden: true }, [el('div', { class: 'nav-pop', role: 'menu' }, popContent)]);
      const d = { btn: btn, pop: pop };
      dropdowns.push(d);
      btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = pop.hidden;
        closeAll(d);
        pop.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
      return el('div', { class: 'nav-dd' }, [btn, pop]);
    };
    document.addEventListener('click', function (e) { if (!e.target.closest('.nav-pop-wrap')) closeAll(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

    const row = function (label, to, on, sub) {
      const a = el('a', { class: 'nav-row', href: href(to), role: 'menuitem' }, [el('span', { text: label }), sub ? el('small', { text: sub }) : null]);
      if (on) a.setAttribute('aria-current', 'page');
      return a;
    };

    // ── Marque ──
    const logo = function (file, cls) { return el('img', { src: href('shared/logos/' + file), alt: '', class: cls }); };
    const brand = el('a', { class: 'nav-brand', href: href('index.html'), 'aria-label': 'Barrière Casino Bordeaux, Service Jeux traditionnels — Accueil' }, [
      logo('barriere_casino-logo.svg', 'logo-light'), logo('barriere_casino-logo-black.svg', 'logo-dark'),
      el('span', { class: 'nav-city', text: 'Bordeaux' }),
      el('span', { class: 'nav-service' }, [el('span', { text: 'Service' }), el('span', { text: 'Jeux traditionnels' })]),
    ]);

    // ── Espace courant : lanceur (plusieurs espaces) ou simple titre (un seul) ──
    let spaceEl = null;
    if (spaces.length > 1) {
      const label = current ? current.label : 'Espaces';
      const btn = el('button', { class: 'nav-pill', type: 'button' }, [el('span', { text: label }), icon('down')]);
      spaceEl = dropdown(btn, spaces.map(function (s) {
        return row(s.label, entryOf(s), current && current.id === s.id, s.note);
      }));
    } else if (spaces.length === 1) {
      spaceEl = el('span', { class: 'nav-title', text: spaces[0].label });
    }

    // ── Pages de l'espace ──
    const items = el('nav', { class: 'nav-items', 'aria-label': 'Pages' }, (current ? current.items : []).map(function (it) {
      const on = page.i === (it.id || it.href);
      if (!it.menu) return mark(el('a', { class: 'nav-item', href: href(it.href), text: it.label }), on);
      const btn = el('button', { class: 'nav-item', type: 'button' }, [el('span', { text: it.label }), icon('down')]);
      if (on) btn.setAttribute('aria-current', 'page');
      const entries = (it.href ? [row('Vue d\'ensemble', it.href, key === it.href)] : [])
        .concat(it.menu.map(function (m) { return row(m.label, m.href, key === m.href); }));
      return dropdown(btn, entries);
    }));
    function mark(a, on) { if (on) a.setAttribute('aria-current', 'page'); return a; }

    // ── Outils à droite : Gestion, thème, utilisateur ──
    const tools = [];
    const gestion = GESTION.groups.map(function (g) {
      return { title: g.title, items: g.items.filter(function (it) { return opts.isAdmin || (!it.role && (opts.panels || []).indexOf(it.panel) >= 0); }) };
    }).filter(function (g) { return g.items.length; });
    if (gestion.length) {
      const abtn = el('button', { class: 'nav-btn', type: 'button' }, [el('span', { class: 'nav-btn-label', text: GESTION.label }), icon('down')]);
      if (page.admin) abtn.setAttribute('aria-current', 'page');
      const entries = [];
      gestion.forEach(function (g) {
        entries.push(el('div', { class: 'nav-grp', text: g.title }));
        g.items.forEach(function (it) { entries.push(row(it.label, it.href, key === it.href)); });
      });
      tools.push(dropdown(abtn, entries, true));
    }
    const themeBtn = el('button', { class: 'nav-btn nav-theme', type: 'button', 'aria-label': 'Changer de thème', on: { click: function () { toggleTheme(); } } }, [
      icon('sun', 'i-sun'), icon('moon', 'i-moon'),
      el('span', { id: 'theme-icon', hidden: true }), el('span', { id: 'theme-label', class: 'nav-btn-label', text: 'Mode jour' }),
    ]);
    tools.push(themeBtn);

    const color = /^#[0-9a-f]{3,8}$/i.test(opts.color || '') ? opts.color : '#C37814';
    const chip = el('span', { class: 'nav-chip', text: roleLabel(opts.role) });
    chip.style.background = color + '28'; chip.style.color = color;
    const userBtn = el('button', { class: 'nav-btn', type: 'button' }, [icon('user'), el('span', { class: 'nav-btn-label nav-user-name', text: opts.email.split('@')[0] })]);
    tools.push(dropdown(userBtn, [
      el('div', { class: 'nav-id' }, [el('b', { text: opts.email }), chip]),
      el('button', { class: 'nav-row', type: 'button', role: 'menuitem', on: { click: function () { closeAll(); AUTH._openChangePwd(); } } }, [el('span', { text: 'Changer le mot de passe' })]),
      el('button', { class: 'nav-row', type: 'button', role: 'menuitem', on: { click: function () { AUTH.signOut(opts.loginUrl); } } }, [el('span', { text: 'Déconnexion' })]),
    ], true));

    // ── Menu replié (téléphone, tablette) : toute l'arborescence ──
    const burger = el('button', { class: 'nav-btn nav-burger', type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'nav-panel' }, [icon('menu')]);
    const group = function (title, links) {
      return el('div', { class: 'grp' }, [title ? el('div', { class: 'gt', text: title }) : null].concat(links));
    };
    const plink = function (label, to, on) { return mark(el('a', { href: href(to), text: label }), on); };
    const groups = spaces.map(function (s) {
      const links = [];
      s.items.forEach(function (it) {
        links.push(it.href ? plink(it.label, it.href, key === it.href) : el('div', { class: 'gt', text: it.label }));
        (it.menu || []).forEach(function (m) { links.push(el('a', { class: 'sub', href: href(m.href), text: m.label, 'aria-current': key === m.href ? 'page' : null })); });
      });
      return group(spaces.length > 1 ? s.label : null, links);
    });
    gestion.forEach(function (g) { groups.push(group(GESTION.label + ' · ' + g.title, g.items.map(function (it) { return plink(it.label, it.href, key === it.href); }))); });
    const panel = el('div', { class: 'nav-panel', id: 'nav-panel' }, groups.concat([el('div', { class: 'grp acts' }, [
      el('div', { class: 'who', text: opts.email + ' · ' + roleLabel(opts.role) }),
      el('button', { type: 'button', text: 'Changer de thème', on: { click: function () { toggleTheme(); } } }),
      el('button', { type: 'button', text: 'Changer le mot de passe', on: { click: function () { AUTH._openChangePwd(); } } }),
      el('button', { type: 'button', text: 'Déconnexion', on: { click: function () { AUTH.signOut(opts.loginUrl); } } }),
    ])]));
    burger.addEventListener('click', function () {
      const open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.replaceChildren(icon(open ? 'x' : 'menu'));
    });

    const main = el('div', { class: 'nav-main' }, [brand, spaceEl, items, el('div', { class: 'nav-tools' }, tools), burger]);
    document.body.classList.add('has-nav');
    document.body.insertBefore(el('header', { class: 'nav' }, [main, panel]), document.body.firstChild);
    if (typeof applyTheme === 'function') applyTheme(document.body.classList.contains('light'));
    return true;
  }

  return { mount: mount, pageKey: pageKey, SPACES: SPACES, visibleSpaces: visibleSpaces, entryOf: entryOf };
})();
