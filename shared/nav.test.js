// Tests des services de la barre (nav.js) : `node shared/nav.test.js`
const assert = require('assert');
const NAV = require('./nav.js');

let ok = 0;
const t = function (nom, f) { f(); ok++; };
const JT = 'jeux_traditionnels', MAS = 'machines_a_sous';
const espace = function (id, service) { return { id: id, service: service, items: [] }; };

t('chaque espace appartient à un service connu', function () {
  const ids = NAV.SERVICES.map(function (sv) { return sv.id; });
  NAV.SPACES.forEach(function (s) { assert.ok(ids.indexOf(s.service) >= 0, s.id); });
});

t('services visibles : ceux qui ont au moins un espace accessible', function () {
  assert.deepStrictEqual(NAV.servicesVisibles([]).map(function (s) { return s.id; }), []);
  assert.deepStrictEqual(NAV.servicesVisibles([espace('a', JT)]).map(function (s) { return s.id; }), [JT]);
  assert.deepStrictEqual(NAV.servicesVisibles([espace('a', MAS), espace('b', JT)]).map(function (s) { return s.id; }), [JT, MAS]);
});

const deux = NAV.servicesVisibles([espace('a', JT), espace('b', MAS)]);
const un = NAV.servicesVisibles([espace('a', JT)]);

t('la page ouverte impose son service', function () {
  assert.strictEqual(NAV.serviceCourant(deux, JT, MAS), MAS);
});
t('sans page de service, le choix retenu', function () {
  assert.strictEqual(NAV.serviceCourant(deux, MAS, null), MAS);
});
t('plusieurs services sans choix : il faut choisir', function () {
  assert.strictEqual(NAV.serviceCourant(deux, null, null), null);
});
t('un choix retenu qui n\'est plus accessible est ignoré', function () {
  assert.strictEqual(NAV.serviceCourant(un, MAS, null), JT);
  assert.strictEqual(NAV.serviceCourant(deux, 'inconnu', null), null);
});
t('une page d\'un service non accessible ne l\'impose pas', function () {
  assert.strictEqual(NAV.serviceCourant(un, null, MAS), JT);
});
t('un seul service : choisi d\'office', function () {
  assert.strictEqual(NAV.serviceCourant(un, null, null), JT);
});
t('aucun service', function () {
  assert.strictEqual(NAV.serviceCourant([], JT, JT), null);
});

// Le générateur de courrier appartient à deux espaces : Administration tournois (Jeux traditionnels) et Courrier (Machines à sous)
const COURRIER = 'outils/courrier/courriers.html';
const place = function (opts, memorise) {
  const c = NAV.contexteDe(NAV.CONTEXTES[COURRIER], NAV.visibleSpaces(opts), memorise);
  return c && c.s;
};
t('le courrier a une place dans chaque service', function () {
  assert.deepStrictEqual(NAV.CONTEXTES[COURRIER].map(function (c) { return c.s; }).sort(), ['courrier', 'tournois']);
});
t('admin : la place suit le service retenu', function () {
  assert.strictEqual(place({ isAdmin: true }, MAS), 'courrier');
  assert.strictEqual(place({ isAdmin: true }, JT), 'tournois');
});
t('droit courrier seul : espace Courrier', function () {
  assert.strictEqual(place({ panels: ['courrier'] }, JT), 'courrier');
});
t('Administration tournois seule : espace Tournois', function () {
  assert.strictEqual(place({ panels: ['admin-tournois'] }, MAS), 'tournois');
});
t('aucun des deux droits : aucune place', function () {
  assert.strictEqual(place({ panels: ['training'] }, null), null);
});

console.log(ok + ' contrôles réussis.');
