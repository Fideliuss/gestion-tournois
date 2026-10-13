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
    id: 'break-list-pour-commencer', space: 'break-list', panel: 'break-list',
    title: 'Pour commencer',
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

  {
    id: 'break-list-planning', space: 'break-list', panel: 'break-list',
    title: 'Importer le planning du mois',
    intro: "Tout part du planning : l'application y lit qui est présent chaque jour. Il s'importe une fois par mois, depuis la page Planning, et reste modifiable case par case.",
    steps: [
      {
        title: "Choisir le mois",
        text: "<p>Ouvrez la page <b>Planning</b>. La carte <b>Période</b> propose le mois et l'année. Un mois dont le planning est déjà enregistré porte une coche verte dans la liste.</p>"
          + "<p>L'application garde un seul planning par mois.</p>",
        imgs: [{ src: 'captures/bl_planning.png', alt: 'La page Planning : la période et le tableau du mois' }],
      },
      {
        title: "Importer le fichier CSV",
        text: "<p>Cliquez sur <b>Importer un planning (CSV)</b> et choisissez le fichier du mois. Ce fichier doit être une extraction (au format CSV) du planning Google Sheet : ce planning est standardisé, l'application en reconnaît donc la mise en forme. Le mois et l'année sont lus dans le fichier : le sélecteur se place dessus tout seul.</p>"
          + "<p>Rien n'est enregistré tout de suite : un aperçu s'affiche d'abord, avec le nombre de salariés et de jours. Vérifiez-le, puis validez avec le bouton en bas à droite, ou cliquez sur <b>Annuler</b>.</p>",
        imgs: [],
      },
      {
        title: "Remplacer un planning déjà enregistré",
        text: "<p>Si le mois existe déjà, l'aperçu liste les <b>différences</b> avec le planning enregistré : qui, quel jour, l'ancien code barré et le nouveau. Si le nouveau fichier est identique, l'aperçu l'indique.</p>"
          + "<p>Un encadré orange signale les <b>codes non reconnus</b> du fichier. Ils sont traités comme des absences tant qu'ils ne sont pas déclarés dans <b>Paramètres</b>, rubrique Équipe (voir le guide « Régler les paramètres »).</p>"
          + "<p>Validez avec <b>Remplacer le planning</b> : le nouveau fichier prend la place de l'ancien.</p>",
        imgs: [{ src: 'captures/bl_planning_import.png', alt: "L'aperçu d'un import : les différences et un code non reconnu" }],
      },
      {
        title: "Lire et corriger le tableau",
        text: "<p>Le tableau montre une ligne par personne, avec la couleur de son grade, et une colonne par jour. Les week-ends sont en orange et le jour de la séance est repéré. Les couleurs des cases donnent l'arrivée (20h, 21h, floor) ou le type d'absence ; la légende est sous le tableau.</p>"
          + "<p>Pour <b>corriger une case</b>, cliquez dessus : une liste propose <b>Vide</b> (non planifié), les horaires de présence, les types d'absence ou <b>Autre code</b>. La modification est enregistrée aussitôt.</p>"
          + "<p>Le bouton <b>Supprimer ce planning</b> efface le mois affiché, après confirmation.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'break-list-presents', space: 'break-list', panel: 'break-list',
    title: 'Présents et absents de la séance',
    intro: "La partie Break list de la page Aujourd'hui part du planning. Ce guide explique comment la relire, la corriger si la séance ne se passe pas comme prévu, et retrouver les absents.",
    steps: [
      {
        title: "Choisir la séance",
        text: "<p>Un texte sous le titre rappelle la date du jour. Dans la carte <b>Séance</b>, les flèches passent au jour précédent ou suivant, la date se tape directement, et le bouton <b>Aujourd'hui</b> revient à la séance en cours.</p>"
          + "<p>La page ne change pas de séance à minuit, mais à l'heure de changement réglée dans <b>Paramètres</b> (6 h au départ) : avant cette heure, elle affiche encore la séance de la veille.</p>",
        imgs: [{ src: 'captures/bl_seance.png', alt: 'La carte Séance et les présents' }],
      },
      {
        title: "Corriger une présence",
        text: "<p>Les présents sont classés par heure d'arrivée. Le <b>nom en gras</b> est celui d'un chef, le repère à côté d'un nom indique le floor, et la pastille donne la couleur du grade.</p>"
          + "<p>Le menu à droite de chaque nom permet de changer l'horaire ou de passer la personne en <b>absent à la séance</b> en précisant le motif. Le changement est écrit dans le planning du mois : la page Planning le montre aussi.</p>",
        imgs: [],
      },
      {
        title: "Ajouter un présent",
        text: "<p>En bas de la carte, <b>Ajouter un présent</b> liste les personnes qui ne sont pas présentes ce jour-là, avec leur motif entre parenthèses (repos, congés, non planifié...). Choisissez la personne et son horaire, puis cliquez sur <b>Ajouter</b>.</p>",
        imgs: [{ src: 'captures/bl_ajout.png', alt: "Les présents de la séance et le bloc « Ajouter un présent »" }],
      },
      {
        title: "Retrouver les absents",
        text: "<p>La carte <b>Absents de la séance</b> est repliée : cliquez sur son titre pour l'ouvrir. Les absents y sont regroupés par type d'absence, dans l'ordre des paramètres, puis les non planifiés et les codes non reconnus.</p>",
        imgs: [{ src: 'captures/bl_absents.png', alt: 'La carte Absents de la séance, dépliée' }],
      },
    ],
  },

  {
    id: 'break-list-departs', space: 'break-list', panel: 'break-list',
    title: 'Faire les départs',
    intro: "La partie Départs répartit la séance entre les postes en tenant compte du delta de chacun. Il faut pour cela l'extraction Octime de la période, que l'on colle dans l'application.",
    steps: [
      {
        title: "Charger l'extraction",
        text: "<p>Cliquez sur <b>Départs</b>, en haut de la page. Collez l'extraction dans la zone de texte avec <b>Ctrl+V</b>, ou cliquez sur <b>Choisir un fichier</b> (CSV, texte ou Excel). Elle est lue automatiquement.</p>"
          + "<p>Un message résume la lecture : date et heure du chargement, jour d'arrêt, nombre de salariés lus et nombre de présents retrouvés. L'extraction n'est pas enregistrée dans l'application : elle disparaît à la fermeture de l'onglet. <b>Effacer l'extraction</b> la retire tout de suite.</p>",
        imgs: [],
      },
      {
        title: "Vérifier le jour d'arrêt",
        text: "<p>Les deltas ne sont justes que si l'extraction est arrêtée au bon jour : le <b>dimanche qui suit la séance</b> (ce jour se règle dans <b>Paramètres</b>, rubrique Séance). Si ce n'est pas le cas, le jour d'arrêt s'affiche en orange avec la date attendue.</p>"
          + "<p>Dans ce cas, chargez une extraction arrêtée à la date indiquée.</p>",
        imgs: [{ src: 'captures/bl_extraction.png', alt: "L'extraction chargée : avertissement sur le jour d'arrêt et un nom à rapprocher" }],
      },
      {
        title: "Rapprocher les noms",
        text: "<p>Quand un nom du planning n'est pas écrit comme dans l'extraction, il est listé sous le message. Choisissez sa ligne dans la liste : le choix est <b>mémorisé</b> pour les séances suivantes et se retrouve dans <b>Paramètres</b>, rubrique Séance.</p>"
          + "<p>Sans rapprochement, le delta de la personne est compté 0 et s'affiche <b>?</b>.</p>",
        imgs: [],
      },
      {
        title: "Choisir les postes",
        text: "<p>La carte <b>Répartition</b> propose le nombre de <b>Stackers</b>, de <b>Compteurs</b>, de <b>Cartes</b> et la case <b>Salle</b> (un chef y est placé). Ces valeurs de départ viennent des <b>Paramètres</b> ; changez-les pour la séance en cours, la répartition se recalcule.</p>"
          + "<p>Dans chaque colonne, le delta de la personne est entre parenthèses, un nom en gras est un chef et ◉ marque une arrivée à 20h. Un encadré orange signale ce qui mérite d'être regardé.</p>",
        imgs: [{ src: 'captures/bl_departs.png', alt: "La partie Départs : l'extraction et la répartition" }],
      },
      {
        title: "Ajuster à la main",
        text: "<p>La répartition se retouche d'un clic : cliquez un nom (il devient doré), puis un autre nom pour les <b>échanger</b>, ou une colonne pour <b>déplacer</b> la personne. Le glisser-déposer fait la même chose.</p>"
          + "<p>La mention <b>modifiée à la main</b> apparaît ; <b>Régénérer</b> recalcule la répartition d'origine. Vos retouches sont conservées tant que les présents, les deltas et les postes ne changent pas.</p>",
        imgs: [{ src: 'captures/bl_departs_main.png', alt: 'Une répartition modifiée à la main, un nom sélectionné' }],
      },
      {
        title: "Imprimer la feuille",
        text: "<p><b>Imprimer les départs</b> ouvre l'aperçu de la feuille A4 en portrait, pliable. Les postes vides ne sont pas imprimés.</p>",
        imgs: [{ src: 'captures/bl_feuille_departs.png', alt: 'La feuille des départs imprimée' }],
      },
    ],
  },

  {
    id: 'break-list-parametres', space: 'break-list', panel: 'break-list',
    title: 'Régler les paramètres',
    intro: "La page Paramètres adapte l'espace à votre fonctionnement : grades, horaires, absences, postes et feuilles imprimées. Elle est rangée en trois rubriques, en haut de la page.",
    steps: [
      {
        title: "Équipe : grades et horaires",
        text: "<p>Les <b>grades</b> classent et colorent les noms de la break list, dans l'ordre de la liste (les flèches le changent). Un grade qui <b>peut être chef</b> fournit les chefs des stackers et de la salle.</p>"
          + "<p>Les <b>horaires de présence</b> sont les codes du planning qui veulent dire « présent à la séance ». Chacun est rattaché à un groupe (arrivée 20h, arrivée 21h, part en premier) ; un horaire marqué <b>C'est le floor</b> reçoit le repère du floor.</p>",
        imgs: [{ src: 'captures/bl_param_equipe.png', alt: 'La rubrique Équipe : grades et horaires de présence' }],
      },
      {
        title: "Équipe : types d'absence",
        text: "<p>Les <b>types d'absence</b> sont les autres codes du planning : repos, congés, maladie... Chacun a une signification et une couleur, utilisées dans le tableau du planning et dans la carte des absents. Une case vide veut toujours dire « non planifié ».</p>"
          + "<p>Pour un code nouveau, <b>Ajouter un type d'absence</b>.</p>",
        imgs: [{ src: 'captures/bl_param_absences.png', alt: "Les types d'absence" }],
      },
      {
        title: "Séance",
        text: "<p>Cette rubrique règle les <b>postes</b> proposés au départ de la page Départs, l'<b>écriture des noms</b> (Alex M. ou M. Alex), l'<b>heure de changement de séance</b>, le <b>jour d'arrêt</b> attendu pour l'extraction, et liste les <b>rapprochements de noms</b> déjà enregistrés.</p>",
        imgs: [{ src: 'captures/bl_param_seance.png', alt: 'La rubrique Séance' }],
      },
      {
        title: "Feuilles imprimées",
        text: "<p>Le <b>recto</b> de la break list se règle par le nombre de colonnes libres, le nombre de fois où la liste des présents est répétée et le repère du floor. Pour le <b>verso</b>, on choisit le nombre de colonnes et la liste des tables, une par ligne ; une ligne qui commence par TOTAL est grisée.</p>"
          + "<p>L'<b>aperçu</b>, en bas de la rubrique, se met à jour pendant que vous modifiez.</p>",
        imgs: [{ src: 'captures/bl_param_feuilles.png', alt: 'La rubrique Feuilles imprimées et son aperçu' }],
      },
      {
        title: "Enregistrer",
        text: "<p>Dès qu'un réglage change, une barre apparaît en bas de l'écran : <b>Modifications non enregistrées</b>. Cliquez sur <b>Enregistrer</b> pour les garder, ou sur <b>Annuler</b> pour revenir à l'état enregistré.</p>"
          + "<p>Tout en bas de la page, <b>Rétablir les valeurs d'origine</b> remet les réglages de départ.</p>",
        imgs: [{ src: 'captures/bl_param_barre.png', alt: "La barre d'enregistrement" }],
      },
    ],
  },

  {
    id: 'break-list-depannage', space: 'break-list', panel: 'break-list',
    title: "Dépannage",
    intro: "Les situations les plus courantes, et ce qu'il faut regarder.",
    steps: [
      {
        title: "« Aucun planning pour ce mois »",
        text: "<p>Le planning du mois n'a pas été importé. Ouvrez la page <b>Planning</b> et importez le fichier (guide « Importer le planning du mois »).</p>",
        imgs: [],
      },
      {
        title: "Une personne manque dans les présents",
        text: "<p>Ouvrez la carte <b>Absents de la séance</b> : vous y verrez pourquoi (repos, congés, case vide, code non reconnu). Si elle travaille bien ce soir, utilisez <b>Ajouter un présent</b>, ou corrigez sa case dans la page Planning.</p>",
        imgs: [],
      },
      {
        title: "Des codes non reconnus",
        text: "<p>Un code du planning n'est ni un horaire de présence, ni un type d'absence : il est traité comme une absence. Déclarez-le dans <b>Paramètres</b>, rubrique Équipe, comme horaire ou comme type d'absence.</p>",
        imgs: [],
      },
      {
        title: "L'extraction n'est pas lue",
        text: "<p>Un message orange explique ce qui manque. Collez le tableau en entier, avec sa ligne de titres, ou choisissez le fichier plutôt que de le coller. Si le problème persiste, <b>Effacer l'extraction</b> puis recommencez.</p>",
        imgs: [],
      },
      {
        title: "Un delta affiche « ? »",
        text: "<p>La personne n'est pas retrouvée dans l'extraction, son delta est compté 0. Rapprochez son nom de sa ligne dans la liste sous le message de lecture (guide « Faire les départs », étape 3).</p>",
        imgs: [],
      },
      {
        title: "Le jour d'arrêt est en orange",
        text: "<p>L'extraction n'est pas arrêtée au jour attendu, et les deltas peuvent être faux. Chargez une extraction arrêtée à la date indiquée. Si vos extractions sont arrêtées un autre jour de façon habituelle, changez-le dans <b>Paramètres</b>, rubrique Séance.</p>",
        imgs: [],
      },
      {
        title: "La page affiche la séance de la veille",
        text: "<p>Avant l'heure de changement de séance, la page reste sur la séance précédente. Cliquez sur <b>Aujourd'hui</b> ou changez l'heure dans <b>Paramètres</b>, rubrique Séance.</p>",
        imgs: [],
      },
      {
        title: "Un réglage n'est pas pris en compte",
        text: "<p>Les paramètres ne s'appliquent qu'une fois enregistrés : vérifiez que la barre « Modifications non enregistrées » n'est plus affichée en bas de la page Paramètres.</p>",
        imgs: [],
      },
      {
        title: "« Enregistrement impossible » ou « Lecture impossible »",
        text: "<p>La connexion avec le serveur a échoué. Vérifiez votre connexion, rechargez la page et recommencez. Si le message revient, prévenez l'administrateur.</p>",
        imgs: [],
      },
      {
        title: "Un espace ou un guide n'apparaît pas",
        text: "<p>Chacun ne voit que les espaces et les guides auxquels il a droit. S'il en manque un, demandez l'accès à l'administrateur.</p>",
        imgs: [],
      },
    ],
  },
];
