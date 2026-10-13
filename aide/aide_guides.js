// ══════════════════════════════════════════════════════
//  AIDE - contenu des guides
//  Un guide = une tâche, en quelques étapes avec une capture chacune. Vouvoiement.
//  Les captures (aide/captures/) sont générées avec des données fictives : voir aide/outils/captures.js
//
//  Pour ajouter un guide : une entrée dans AIDE_GUIDES (id unique, espace, droit requis `panel`).
//  Pour ajouter un espace : une entrée dans AIDE_ESPACES.
//  steps : { title, text (HTML), imgs: [{ src, alt }] }
// ══════════════════════════════════════════════════════

var AIDE_ESPACES = {
  'break-list': 'Break list',
};

var AIDE_GUIDES = [
  {
    id: 'break-list-vue-ensemble', space: 'break-list', panel: 'break-list',
    title: 'Vue d\'ensemble',
    intro: 'L\'espace Break list prépare la séance : qui est présent, la feuille de pauses à imprimer et les départs de fin de séance. Il remplace l\'ancien tableur et son script.',
    steps: [
      {
        title: 'Les trois pages de l\'espace',
        text: '<p>La barre du haut donne accès à trois pages.</p><ul>'
          + '<li><b>Aujourd\'hui</b> : la page de chaque séance, avec deux parties, Break list et Départs.</li>'
          + '<li><b>Planning</b> : à utiliser une fois par mois, pour importer le planning.</li>'
          + '<li><b>Paramètres</b> : les grades, les horaires, les types d\'absence, les postes et les feuilles imprimées.</li></ul>',
        imgs: [{ src: 'captures/bl_barre.png', alt: 'La barre de navigation avec l\'espace Break list et ses trois pages' }],
      },
      {
        title: 'Break list : préparer la séance',
        text: '<p>La partie <b>Break list</b> s\'ouvre en premier. Un texte rappelle la date du jour ; les flèches de la carte <b>Séance</b> permettent d\'aller au jour précédent ou suivant.</p>'
          + '<p>Les présents viennent du planning du mois, classés par heure d\'arrivée, avec l\'effectif en haut à droite. Pour corriger une présence, utilisez le menu à droite de chaque nom : il permet de changer l\'horaire ou d\'indiquer le motif d\'une absence.</p>',
        imgs: [{ src: 'captures/bl_seance.png', alt: 'La partie Break list : la carte Séance et les présents' }],
      },
      {
        title: 'Imprimer la break list',
        text: '<p>Le bouton <b>Imprimer la break list</b> ouvre l\'aperçu d\'impression : une page au recto, la grille des pauses avec les présents classés par grade et par couleur, et une page au verso, la situation des tables. Le format est A4 paysage.</p>',
        imgs: [
          { src: 'captures/bl_recto.png', alt: 'Le recto de la break list : la grille des pauses' },
          { src: 'captures/bl_verso.png', alt: 'Le verso de la break list : la situation des tables' },
        ],
      },
      {
        title: 'Départs : extraction et répartition',
        text: '<p>Cliquez sur <b>Départs</b>, en haut de la page. Collez l\'extraction Octime (ou choisissez le fichier) : l\'application calcule la répartition de la séance entre les stackers, les compteurs, les cartes, la salle et les départs.</p>'
          + '<p>Chaque nom se déplace ou s\'échange d\'un clic : cliquez un nom, puis un autre nom ou un poste.</p>',
        imgs: [{ src: 'captures/bl_departs.png', alt: 'La partie Départs : l\'extraction Octime et la répartition' }],
      },
      {
        title: 'Imprimer la feuille des départs',
        text: '<p>Le bouton <b>Imprimer les départs</b> sort une feuille A4 en portrait, pliable : une colonne par poste, avec le delta de chaque personne. Un poste vide n\'est pas imprimé.</p>',
        imgs: [{ src: 'captures/bl_feuille_departs.png', alt: 'La feuille des départs imprimée' }],
      },
    ],
  },
];
