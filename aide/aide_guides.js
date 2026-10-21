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
  'tournois': 'Tournois',
  'training': 'Training',
  'break-list': 'Break list',
};

var AIDE_GUIDES = [

  // ══ Tournois ══

  {
    id: 'tournois-pour-commencer', space: 'tournois', panel: 'tournois',
    title: 'Pour commencer',
    intro: "L'espace Tournois réunit les outils des tournois de poker : le calcul du prize pool, le challenge saisonnier, le règlement TDA et, pour les personnes qui en ont l'accès, l'administration (déclarations, courriers, extras, calendrier).",
    steps: [
      {
        title: "Les outils de l'espace",
        text: "<p>La page d'accueil de l'espace propose trois outils.</p><ul>"
          + "<li><b>Prize Pool Builder</b> : prépare la répartition des gains d'un tournoi et imprime le tableau.</li>"
          + "<li><b>Challenge Saisonnier</b> : saisit les résultats de chaque tournoi et tient le classement de la saison.</li>"
          + "<li><b>Règlement TDA</b> : le règlement du Poker TDA, à consulter et à interroger par une recherche.</li></ul>"
          + "<p>Vous ne voyez que les outils auxquels votre compte donne accès.</p>",
        imgs: [{ src: 'captures/tn_accueil.png', alt: "La page d'accueil de l'espace Tournois" }],
      },
      {
        title: "La barre de navigation",
        text: "<p>Dans la barre du haut, <b>Prize Pool</b>, <b>Leaderboard</b> et <b>Règlement TDA</b> ouvrent les trois outils. Le menu <b>Administration tournois</b> regroupe quatre pages : <b>Déclarations</b>, <b>Générateur de courrier</b>, <b>Gestion des Extras</b> et <b>Calendrier &amp; barèmes</b>.</p>"
          + "<p>Le bouton <b>Aide</b> ouvre le guide de la page où vous êtes.</p>",
        imgs: [{ src: 'captures/tn_menu_admin.png', alt: "Le menu Administration tournois dans la barre de navigation" }],
      },
      {
        title: "Le calendrier des tournois, base de tout",
        text: "<p>Les tournois (nom, jour, buy-in, barème de points) sont définis une seule fois dans <b>Calendrier &amp; barèmes</b>. Le prize pool et la saisie des résultats s'appuient sur cette liste : si un tournoi manque ou si son barème est faux, c'est là qu'il faut le corriger. (La déclaration mensuelle a ses propres réglages, par jour de la semaine.)</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-prize-pool', space: 'tournois', panel: 'prize-pool',
    title: 'Préparer le prize pool',
    intro: "Le Prize Pool Builder calcule le prize pool d'un tournoi à partir du nombre de joueurs et vous aide à répartir les gains entre les places payées, avec des repères pour que la progression reste régulière.",
    steps: [
      {
        title: "Choisir le tournoi et son buy-in",
        text: "<p>Dans la carte <b>Tournois</b>, cliquez sur le tournoi du jour : le semainier le range par jour de la semaine. Le buy-in se remplit tout seul. Les tournois exceptionnels sont dans la ligne <b>Événements</b>.</p>"
          + "<p>La carte <b>Structure du buy-in</b> sépare le <b>prix du tournoi</b> en une <b>part prize pool</b> et des <b>frais d'entrée</b> (dont 2 € de cagnotte). Modifiez l'un des trois champs, les deux autres suivent. Si le total ne tombe pas juste, un avertissement s'affiche. La répartition modifiée est mémorisée pour ce tournoi.</p>"
          + "<p>Un clic sur le titre d'une carte la replie.</p>",
        imgs: [{ src: 'captures/pp_choix.png', alt: 'Le semainier et la structure du buy-in' }],
      },
      {
        title: "Indiquer les joueurs et les places payées",
        text: "<p>Tapez le nombre de <b>joueurs</b>. Le bandeau récapitulatif donne le prize pool brut, le rake (4 %), le <b>prize pool net</b> à distribuer et la cagnotte.</p>"
          + "<p>Le nombre de <b>places payées</b> est calculé automatiquement (12 % des joueurs). Pour le fixer vous-même, cliquez sur l'interrupteur « Places » puis modifiez le nombre.</p>",
        imgs: [{ src: 'captures/pp_tournoi.png', alt: 'Joueurs, places payées, récapitulatif et tableau des gains' }],
      },
      {
        title: "Répartir les gains",
        text: "<p>Deux façons de procéder, qui se combinent.</p><ul>"
          + "<li><b>Suggérer</b> remplit tout le tableau d'une progression régulière. Les deux réglages à côté du bouton l'ajustent : le multiplicateur du <b>dernier</b> payé (en multiple du buy-in) et la part visée pour le <b>1er</b>. <b>Effacer</b> vide le tableau.</li>"
          + "<li>Vous pouvez aussi saisir les montants place par place. Entrée passe à la place suivante.</li></ul>"
          + "<p>Si la suggestion est impossible avec ces réglages, un message dit lequel changer.</p>",
        imgs: [],
      },
      {
        title: "Lire les repères",
        text: "<p>Chaque ligne affiche trois repères : <b>Δ palier</b> (l'écart avec la place du dessous), <b>×Δ</b> (de combien cet écart dépasse celui du dessous) et <b>% pool</b>. La ligne se colore en orange si l'écart n'augmente plus (×Δ inférieur à 1) et en rouge si une place paie moins que celle du dessous.</p>"
          + "<p>Sur une case vide, deux montants proposés apparaissent à droite : l'un garde la même accélération (×Δ), l'autre le même écart (+Δ).</p>",
        imgs: [],
      },
      {
        title: "Distribuer tout le pool",
        text: "<p>La barre <b>Restant</b> indique ce qui reste à distribuer. Le bouton <b>→ 1er</b> (ou <b>← restant</b> sur la ligne du 1er) donne le reste à la première place.</p>"
          + "<p>Quand le restant est à zéro, la barre passe au vert : « Pool entièrement distribué - prêt à imprimer ». Si le total dépasse le pool, elle indique le montant « de trop ».</p>",
        imgs: [{ src: 'captures/pp_restant.png', alt: 'Une répartition en cours : il reste 4 429,20 € à distribuer' }],
      },
      {
        title: "Imprimer",
        text: "<p>Le bouton <b>Imprimer</b> n'est actif que lorsque tout le pool est distribué. Il ouvre l'aperçu d'impression avec le nombre de joueurs, le buy-in, le nombre de places payées, la date et le tableau des gains.</p>"
          + "<p>Vos montants sont conservés dans ce navigateur jusqu'à votre déconnexion : vous les retrouvez en revenant sur la page. Choisir un autre tournoi les efface.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-saisir', space: 'tournois', panel: 'leaderboard',
    title: "Saisir les résultats d'un tournoi",
    intro: "Chaque tournoi terminé se saisit une fois dans le Challenge Saisonnier : les points de chaque joueur et la cagnotte sont ajoutés au classement de la saison.",
    steps: [
      {
        title: "Ouvrir la saisie, choisir la date et le tournoi",
        text: "<p>Dans le Challenge Saisonnier, cliquez sur <b>＋ Saisir</b>, en haut à droite. La date du jour est proposée ; changez-la si besoin.</p>"
          + "<p>Le <b>type de tournoi</b> se choisit dans le semainier. Si un seul tournoi a lieu ce jour de la semaine, il est sélectionné tout seul ; sinon le jour est mis en évidence et il reste à cliquer le bon.</p>",
        imgs: [{ src: 'captures/lb_saisir.png', alt: "La saisie d'un tournoi : date, entrées, tournoi et places" }],
      },
      {
        title: "Indiquer le nombre d'entrées",
        text: "<p>Le <b>nombre d'entrées</b> compte les joueurs et les rachats. Il fixe la <b>cagnotte</b> du tournoi (2 € par entrée), affichée dans l'encadré doré : elle s'ajoute à la cagnotte de la saison.</p>",
        imgs: [],
      },
      {
        title: "Saisir les joueurs",
        text: "<p>Le tableau liste les places payées du tournoi avec leurs points. Tapez le nom de chaque joueur dans l'ordre d'arrivée ; Entrée passe à la ligne suivante.</p>"
          + "<p>En tapant, l'application propose les noms déjà saisis : <b>reprenez toujours le nom proposé</b>, pour qu'un joueur ne figure pas deux fois dans le classement sous deux écritures. Les noms sont enregistrés en majuscules.</p>"
          + "<p>Pour une place au-delà du barème, <b>Ajouter une place supplémentaire</b> ouvre une ligne où l'on indique aussi les points.</p>",
        imgs: [],
      },
      {
        title: "Valider",
        text: "<p><b>Valider les résultats du tournoi</b> enregistre tout. Un message confirme le nombre de résultats et la cagnotte ajoutée. Si une place n'a pas de nom alors qu'une place plus basse en a un, l'application demande confirmation avant de continuer.</p>",
        imgs: [],
      },
      {
        title: "Le doublon est bloqué",
        text: "<p>Un même tournoi ne peut être saisi qu'une fois à une date donnée. Si c'est déjà fait, un avertissement apparaît dès que vous choisissez la date et le tournoi, et la validation est refusée. Pour saisir de nouveau, supprimez d'abord la session existante dans l'<b>Historique</b> (guide « Consulter le classement et l'historique »).</p>"
          + "<p>De la même façon, aucune saisie n'est possible dans une saison clôturée.</p>",
        imgs: [{ src: 'captures/lb_doublon.png', alt: 'Avertissement de doublon' }],
      },
    ],
  },

  {
    id: 'tournois-classement', space: 'tournois', panel: 'leaderboard',
    title: "Consulter le classement et l'historique",
    intro: "Le Challenge Saisonnier a trois onglets de consultation : le classement, l'historique des tournois et le document du ranking. Toutes les corrections de saisie se font dans l'historique.",
    steps: [
      {
        title: "Le classement",
        text: "<p>L'onglet <b>Classement</b> affiche le podium puis les joueurs rangés par points : du 4e au 30e en trois colonnes, puis du 31e au 150e. Le montant du <b>ranking</b> (la cagnotte de la saison) figure en haut, avec la date et le nombre de joueurs.</p>"
          + "<p>Le champ de recherche filtre un joueur. <b>Imprimer</b> sort le classement sur une page : podium et colonnes jusqu'au 150e.</p>",
        imgs: [{ src: 'captures/lb_classement.png', alt: 'Le classement de la saison' }],
      },
      {
        title: "La fiche d'un joueur",
        text: "<p>Cliquez sur un nom du classement pour ouvrir sa fiche : points, nombre de tournois joués, meilleur résultat, et la liste de ses résultats de la saison avec la date, le tournoi, la place et les points.</p>",
        imgs: [{ src: 'captures/lb_joueur.png', alt: "La fiche d'un joueur" }],
      },
      {
        title: "L'historique, mois par mois",
        text: "<p>L'onglet <b>Historique</b> montre un mois sous forme de calendrier. Les flèches, de part et d'autre du mois, changent de mois. Chaque tournoi apparaît sur son jour, avec la cagnotte qu'il a rapportée ; un tournoi sans résultat est signalé.</p>"
          + "<p>Cliquez sur un tournoi pour afficher ses résultats ; <b>Fermer</b> le replie. La recherche (joueur ou tournoi) et le filtre par tournoi aident à retrouver une séance.</p>",
        imgs: [{ src: 'captures/lb_historique.png', alt: "L'historique : calendrier du mois et résultats d'un tournoi" }],
      },
      {
        title: "Corriger ou supprimer une saisie",
        text: "<p>Sur une ligne de résultat, le crayon permet de modifier la place, le nom et les points ; validez avec la coche. La corbeille supprime le résultat, après confirmation.</p>"
          + "<p>Sur l'en-tête d'un tournoi, le crayon corrige le nombre d'entrées (la cagnotte suit) et la corbeille supprime tout le tournoi et ses résultats. Pour corriger l'écriture d'un nom saisi de deux façons, modifiez chaque ligne concernée.</p>"
          + "<p>Ces boutons disparaissent quand la saison est clôturée.</p>",
        imgs: [],
      },
      {
        title: "Le document ranking",
        text: "<p>L'onglet <b>Ranking</b> présente le montant de la cagnotte de la saison et les gains du 1er (10 %) et du 2e (5 %). <b>Imprimer le document ranking</b> le sort sur une page.</p>",
        imgs: [{ src: 'captures/lb_ranking.png', alt: 'Le document ranking' }],
      },
      {
        title: "Consulter une autre saison",
        text: "<p>La saison court du 1er novembre au 31 octobre. Elle est reconnue toute seule d'après la date des résultats : la suivante démarre avec le premier tournoi daté du 1er novembre, et les points comme la cagnotte repartent de zéro.</p>"
          + "<p>À gauche de la barre d'onglets, un sélecteur permet de revenir sur les saisons précédentes (elles apparaissent dès qu'elles ont des résultats). À côté, un libellé indique si la saison est en cours, terminée ou clôturée.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-tda', space: 'tournois', panel: 'tda',
    title: 'Consulter le règlement TDA',
    intro: "Le règlement du Poker TDA est consultable dans l'application : les règles, les procédures recommandées et le glossaire, avec des renvois cliquables entre les règles. Sur les captures de ce guide, les textes sont des exemples fictifs.",
    steps: [
      {
        title: "Ouvrir le règlement",
        text: "<p>Dans la barre du haut, <b>Règlement TDA</b> ouvre la page (ou la tuile de l'accueil de l'espace Tournois). Trois onglets : <b>Règles</b>, <b>Procédures</b> et <b>Glossaire</b>.</p>"
          + "<p>Le sommaire de l'onglet est à gauche : cliquez sur une règle pour la lire. La barre de recherche, sous les onglets, a son propre guide.</p>",
        imgs: [{ src: 'captures/tda_sommaire.png', alt: "La page du règlement TDA avec les onglets, la recherche et le sommaire des règles" }],
      },
      {
        title: "Lire une règle",
        text: "<p>La règle s'affiche à droite, avec ses points repérés par une lettre (A, B, C...) et ses remarques sur un fond distinct. Les <b>exemples d'illustration</b> de la règle sont en dessous : cliquez sur un exemple pour le déplier.</p>"
          + "<p>Les boutons <b>Précédente</b> et <b>Suivante</b>, en bas, passent à la règle voisine ; <b>Sommaire</b>, en haut, revient à la liste.</p>",
        imgs: [{ src: 'captures/tda_regle.png', alt: "Une règle avec ses points, une remarque et un exemple d'illustration replié" }],
      },
      {
        title: "Procédures et glossaire",
        text: "<p>L'onglet <b>Procédures</b> contient les procédures recommandées par le TDA, lues de la même façon que les règles. L'onglet <b>Glossaire</b> explique les termes du jeu, classés par groupe.</p>",
        imgs: [{ src: 'captures/tda_glossaire.png', alt: "L'onglet Glossaire, termes classés par groupe" }],
      },
      {
        title: "Suivre un renvoi",
        text: "<p>Quand un texte cite une autre règle (par exemple « règle 47-B »), la mention est soulignée en couleur : un clic ouvre cette règle et met en évidence le point cité. <b>Voir exemples</b> ouvre les exemples de la règle en cours.</p>"
          + "<p>Le bouton « retour » de votre navigateur ramène à la règle d'où vous veniez.</p>",
        imgs: [],
      },
      {
        title: "Comprendre un terme",
        text: "<p>Les mots du glossaire sont soulignés en pointillés dans le texte. Un clic affiche leur définition dans une bulle, avec un lien <b>Voir au glossaire</b>. Cliquez ailleurs ou appuyez sur Échap pour la fermer.</p>",
        imgs: [{ src: 'captures/tda_terme.png', alt: "La définition d'un terme affichée dans une bulle" }],
      },
      {
        title: "Un renvoi marqué d'un point d'interrogation",
        text: "<p>Dans la traduction française, quelques renvois citent un numéro qui semble erroné. Ils sont signalés par un petit <b>?</b> : un clic explique le doute et propose la règle probable. En cas de doute sur un point, le texte officiel du TDA, en anglais, fait foi.</p>",
        imgs: [{ src: 'captures/tda_renvoi.png', alt: "La bulle d'un renvoi à vérifier, avec un lien vers la règle probable" }],
      },
      {
        title: "Sur téléphone et tablette",
        text: "<p>La page s'adapte à l'écran. Sur un petit écran, le sommaire occupe toute la page : touchez une règle pour la lire, puis <b>Sommaire</b> pour revenir à la liste.</p>",
        imgs: [{ src: 'captures/tda_mobile.png', alt: "Une règle affichée sur un écran de téléphone" }],
      },
    ],
  },

  {
    id: 'tournois-tda-recherche', space: 'tournois', panel: 'tda',
    title: 'Rechercher dans le règlement',
    intro: "La barre de recherche du règlement TDA trouve un mot, une question ou un numéro de règle dans les règles, les procédures, les exemples et le glossaire.",
    steps: [
      {
        title: "Lancer une recherche",
        text: "<p>Tapez dans la barre <b>Rechercher un mot ou un numéro</b> (la touche <b>/</b> y amène le curseur). Les résultats s'affichent en direct, rangés par partie : <b>Règles</b>, <b>Procédures recommandées</b>, <b>Exemples d'illustration</b> et <b>Glossaire</b>. Les mots cherchés sont surlignés dans un extrait.</p>",
        imgs: [{ src: 'captures/tda_recherche.png', alt: "Les résultats d'une recherche, rangés par partie, avec les mots surlignés" }],
      },
      {
        title: "Aller directement à une règle",
        text: "<p>Pour une règle dont vous connaissez le numéro, tapez-le : <b>45</b> ouvre la règle 45, <b>55-A</b> son point A, <b>RP-5</b> la procédure recommandée 5. Appuyez sur Entrée pour l'ouvrir.</p>",
        imgs: [],
      },
      {
        title: "Écrire comme on parle",
        text: "<p>Les accents et les majuscules n'ont pas d'importance, et une petite faute de frappe est pardonnée. Les termes anglais usuels (raise, call, fold, all-in) retrouvent les règles écrites en français. Vous pouvez aussi taper une question entière : le règlement renvoie les règles qui contiennent le plus de vos mots.</p>",
        imgs: [],
      },
      {
        title: "Ouvrir un résultat et revenir",
        text: "<p>Cliquez sur un résultat (ou appuyez sur Entrée pour ouvrir le premier) : la règle s'ouvre avec vos mots surlignés. Le bouton « retour » du navigateur revient aux résultats. <b>Échap</b> efface la recherche.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-saison', space: 'tournois', panel: 'leaderboard', admin: true,
    title: 'Clôturer la saison',
    intro: "En fin de saison, un administrateur clôture le challenge : le classement est alors figé et plus rien ne peut être saisi, modifié ou supprimé pour cette saison.",
    steps: [
      {
        title: "Préparer la clôture",
        text: "<p>Sous le sélecteur de saison, le bouton <b>Clôturer la saison</b> n'est visible que pour les administrateurs. Il ouvre un récapitulatif : nombre de joueurs, nombre de tournois, montant du ranking et podium.</p>"
          + "<p>Si la saison n'est pas finie (avant le 31 octobre), l'application le signale. Avant de clôturer, vous pouvez <b>imprimer le classement final</b> depuis cette fenêtre.</p>",
        imgs: [{ src: 'captures/lb_saison.png', alt: 'Le récapitulatif de clôture de saison' }],
      },
      {
        title: "Clôturer",
        text: "<p>Cliquez sur <b>Clôturer la saison</b>, puis confirmez. Le libellé passe à « Clôturée », les boutons de modification disparaissent de l'historique, la saisie est refusée pour les dates de la saison, et le classement affiche « Classement final au » suivi de la date de clôture.</p>"
          + "<p>Le verrouillage est aussi appliqué par la base de données : il tient même en dehors de l'application.</p>",
        imgs: [],
      },
      {
        title: "Rouvrir en cas d'erreur",
        text: "<p>Un administrateur peut <b>rouvrir la saison</b> (bouton à la place de « Clôturer ») : les saisies et modifications redeviennent possibles.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-declaration', space: 'tournois', panel: 'admin-tournois',
    title: 'Déclaration mensuelle',
    intro: "La page Déclarations produit chaque mois le tableau des tournois à déclarer et ses annexes, ainsi que la déclaration des croupiers extras. Tout se calcule à partir des réglages : on les saisit une fois et on les ajuste quand quelque chose change.",
    steps: [
      {
        title: "Choisir la période",
        text: "<p>Dans <b>Administration tournois</b>, ouvrez <b>Déclarations</b>. Le mois proposé est le <b>mois suivant</b>, puisque la déclaration se fait en amont. Changez le mois ou l'année : le tableau se recalcule aussitôt.</p>"
          + "<p>L'onglet <b>Tournois</b> montre le tableau, une ligne par tournoi du mois, puis les annexes en dessous. Il est construit d'après les réglages de chaque jour de la semaine.</p>",
        imgs: [{ src: 'captures/ad_declaration.png', alt: 'La déclaration des tournois du mois' }],
      },
      {
        title: "Régler les tournois de chaque jour",
        text: "<p>Le bouton <b>Réglages</b> ouvre trois onglets. <b>Tournois</b> donne, pour chaque jour de la semaine : si un tournoi a lieu (case <b>Actif</b>), son heure, la cave, le nombre de joueurs maximum, les rachats, le bounty et le numéro d'annexe.</p>"
          + "<p><b>Enregistrer</b> applique les changements ; <b>Réinitialiser</b> revient aux valeurs d'origine. <b>Retour à la déclaration</b> ferme les réglages.</p>"
          + "<p>Les réglages sont enregistrés dans l'application et communs à tous les postes : ce que vous réglez ici se retrouve sur n'importe quel ordinateur.</p>",
        imgs: [{ src: 'captures/ad_decl_reglages.png', alt: 'Les réglages des tournois de chaque jour' }],
      },
      {
        title: "Régler l'encadrement",
        text: "<p>L'onglet <b>Encadrement</b> liste les directeurs de tournois et les arbitres, tels qu'ils figurent dans le tableau. <b>+ Ajouter</b> ajoute une ligne, la croix en supprime une. Terminez par <b>Enregistrer</b>.</p>",
        imgs: [{ src: 'captures/ad_decl_encadrement.png', alt: "Les listes de l'encadrement" }],
      },
      {
        title: "Régler les annexes",
        text: "<p>Chaque annexe détaille le prize pool d'un tournoi : son numéro, le nombre de joueurs, la cave et la répartition en pourcentage entre les dix premières places. Le total de la répartition doit faire <b>100 %</b>, sinon il s'affiche en rouge.</p>"
          + "<p>Le numéro d'annexe d'un tournoi (onglet Tournois) renvoie à ces annexes. <b>+ Nouvelle annexe</b> en crée une, <b>Supprimer</b> en retire une.</p>",
        imgs: [{ src: 'captures/ad_decl_annexes.png', alt: 'Les annexes du prize pool' }],
      },
      {
        title: "Un tournoi exceptionnel, une annulation, une modification",
        text: "<p>Le bouton <b>Ajout/Modifications</b> sert pour le mois affiché seulement.</p><ul>"
          + "<li><b>Tournoi ad-hoc</b> : ajoutez un tournoi exceptionnel avec sa date, son heure, sa cave, ses joueurs, les rachats, le bounty et son annexe. Il s'insère dans le tableau à sa date.</li>"
          + "<li><b>Modifier ou annuler un tournoi</b> : choisissez la date, puis <b>Annuler</b> ou <b>Modifier</b> (et renseignez les nouvelles valeurs), puis <b>Appliquer</b>. <b>Restaurer</b> remet le tournoi d'origine.</li></ul>",
        imgs: [{ src: 'captures/ad_decl_adhoc.png', alt: 'Un tournoi ad-hoc et une annulation ponctuelle' }],
      },
      {
        title: "La déclaration des extras",
        text: "<p>L'onglet <b>Extras</b> liste les croupiers extras enregistrés dans <b>Gestion des Extras</b> pour le mois choisi, avec leur état civil et leur adresse. Pour la mettre à jour, il suffit de corriger la liste dans Gestion des Extras (guide « Gérer les extras »).</p>",
        imgs: [{ src: 'captures/ad_decl_extras.png', alt: 'La déclaration des croupiers extras' }],
      },
      {
        title: "Imprimer",
        text: "<p><b>Imprimer / PDF</b> imprime la déclaration affichée (tournois ou extras). Dans la boîte de dialogue, choisissez <b>Enregistrer en PDF</b> pour obtenir un fichier ; son nom reprend le titre et le mois, par exemple « Déclaration Tournois - Novembre 2026 ». Le tableau et ses annexes sont mis en page pour l'impression.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-courriers', space: 'tournois', panel: 'admin-tournois',
    title: 'Générer les courriers',
    intro: "Le Générateur de courrier prépare les courriers mensuels de déclaration et, quand un tournoi est annulé, le courrier d'annulation. Les courriers se lisent à l'écran puis s'impriment ou s'enregistrent en PDF.",
    steps: [
      {
        title: "Les courriers mensuels",
        text: "<p>Dans <b>Administration tournois</b>, ouvrez <b>Générateur de courrier</b>. L'onglet <b>Courriers mensuels</b> est ouvert.</p>"
          + "<p>Choisissez le <b>mois déclaré</b> (le mois suivant est proposé). La <b>date du courrier</b> se met à la date limite de déclaration, 21 jours avant le premier du mois déclaré ; vous pouvez la changer.</p>"
          + "<p>Les jours de tournoi du courrier viennent des mêmes réglages que la page Déclarations : rien à saisir en plus.</p>",
        imgs: [{ src: 'captures/ad_courrier.png', alt: 'Le mois déclaré, la date du courrier et le choix du courrier' }],
      },
      {
        title: "Choisir le courrier et l'imprimer",
        text: "<p>Trois courriers sont proposés, un par destinataire. Cliquez sur l'onglet voulu : le courrier s'affiche en dessous, prêt à imprimer, sur une page A4.</p>"
          + "<p><b>Imprimer / Exporter PDF</b> ouvre la boîte d'impression. Choisissez <b>Enregistrer en PDF</b> et vérifiez que les marges sont sur <b>Aucune</b>.</p>",
        imgs: [],
      },
      {
        title: "Modifier les destinataires et les signatures",
        text: "<p>Le bouton <b>Réglages</b> remplace le courrier par l'éditeur des destinataires. Pour chacun des trois courriers : le destinataire (une ligne par entrée), l'appel, la formule de politesse, le nom du signataire et la liste des autres destinataires mis en copie.</p>"
          + "<p><b>Enregistrer</b> garde vos changements ; <b>Réinitialiser</b> revient aux valeurs d'origine ; <b>Retour au courrier</b> ferme l'éditeur. Ces réglages sont enregistrés dans l'application et communs à tous les postes. Le nom du signataire se saisit ici, une seule fois.</p>",
        imgs: [{ src: 'captures/ad_courrier_reglages.png', alt: "L'éditeur des destinataires et signatures" }],
      },
      {
        title: "Annuler un tournoi",
        text: "<p>L'onglet <b>Annulation de tournoi</b> prépare le courrier d'annulation. Ajoutez la ou les <b>dates annulées</b> : l'objet du courrier est écrit automatiquement. Un <b>motif</b> facultatif complète la phrase d'explication ; laissez-le vide si vous n'en donnez pas.</p>"
          + "<p>Réglez la date du courrier, puis imprimez comme pour les courriers mensuels.</p>",
        imgs: [{ src: 'captures/ad_courrier_annul.png', alt: "La préparation d'un courrier d'annulation" }],
      },
    ],
  },

  {
    id: 'tournois-extras', space: 'tournois', panel: 'admin-tournois',
    title: 'Gérer les extras',
    intro: "La page Gestion des Extras tient la liste des croupiers extras et prépare chaque semaine la feuille d'émargement. La liste alimente aussi la déclaration mensuelle des extras.",
    steps: [
      {
        title: "La liste des extras",
        text: "<p>Dans l'onglet <b>Liste</b>, le formulaire <b>Ajouter un extra</b> demande au minimum le <b>nom</b> et le <b>prénom</b> (marqués d'une étoile). Date et lieu de naissance, adresse, code postal et ville complètent la fiche et servent à la déclaration.</p>"
          + "<p>Les extras enregistrés sont listés en dessous, triés par nom.</p>",
        imgs: [{ src: 'captures/ad_extras_liste.png', alt: 'Le formulaire et la liste des extras' }],
      },
      {
        title: "Modifier ou supprimer un extra",
        text: "<p>Sur une ligne, le crayon ouvre la fiche pour la modifier. La croix supprime l'extra, après confirmation. Les changements sont repris dans la déclaration des extras.</p>",
        imgs: [],
      },
      {
        title: "Préparer la semaine d'émargement",
        text: "<p>L'onglet <b>Émargement</b> prépare la feuille de la semaine. Choisissez la <b>semaine</b> ; ses dates s'affichent à côté. Dans <b>Présences de la semaine</b>, cochez les jours de présence de chaque extra : l'heure d'arrivée apparaît sous la case.</p>"
          + "<p>Les heures par défaut sont 20:55 du lundi au samedi et 16:55 le dimanche ; elles se changent dans <b>Horaires par défaut</b>. Pour une exception, tapez une heure dans la ligne <b>Heure du jour</b> (toute la colonne) ou sous la case d'une personne.</p>",
        imgs: [{ src: 'captures/ad_extras_emarg.png', alt: 'Les présences de la semaine' }],
      },
      {
        title: "Imprimer la feuille",
        text: "<p><b>Imprimer / PDF</b> sort la feuille d'émargement en A4 paysage : une fiche par extra, 16 fiches par page. Au-delà, la feuille continue sur une page suivante, avec « Page n/N » en en-tête.</p>"
          + "<p>Les présences et les heures de la semaine sont enregistrées dans l'application, comme la liste des extras : elles sont communes à tous les postes.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-calendrier', space: 'tournois', panel: 'admin-tournois',
    title: 'Calendrier et barèmes',
    intro: "Calendrier &amp; barèmes est la liste des tournois de l'espace : nom, jour, buy-in et barème de points. Le prize pool, la saisie des résultats et le semainier s'en servent.",
    steps: [
      {
        title: "Lire le calendrier",
        text: "<p>Chaque tournoi est une carte rangée dans la colonne de son jour, avec son buy-in, la part prize pool et les frais, et le début de son barème. Les tournois qui n'ont pas lieu un jour fixe sont dans la ligne <b>Événements</b>.</p>",
        imgs: [{ src: 'captures/ad_calendrier.png', alt: 'Le calendrier des tournois' }],
      },
      {
        title: "Ajouter un tournoi",
        text: "<p>Le bouton <b>+</b> sous un jour ouvre le formulaire avec ce jour déjà choisi ; <b>Nouveau tournoi</b>, en bas, l'ouvre sans jour. Indiquez le nom, le jour ou « Événement », la <b>part PP</b> et les <b>frais</b> : le buy-in est calculé tout seul.</p>"
          + "<p>Le <b>barème de points</b> donne les points de chaque place payée. <b>Ajouter une place</b> et <b>Retirer la dernière</b> en changent le nombre. <b>Enregistrer</b> valide.</p>",
        imgs: [{ src: 'captures/ad_calendrier_form.png', alt: "Le formulaire d'un tournoi et son barème de points" }],
      },
      {
        title: "Modifier ou supprimer",
        text: "<p><b>Modifier</b> sur une carte rouvre le formulaire. Un nouveau barème s'applique aux saisies suivantes.</p>"
          + "<p>La corbeille supprime le tournoi, après confirmation : les résultats déjà enregistrés ne sont pas effacés.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'tournois-depannage', space: 'tournois', panel: 'tournois',
    title: 'Résolution des problèmes courants',
    intro: "Les situations les plus courantes de l'espace Tournois, et ce qu'il faut regarder.",
    steps: [
      {
        title: "Le bouton Imprimer du prize pool est grisé",
        text: "<p>Il ne s'active que lorsque le prize pool est entièrement distribué : la barre <b>Restant</b> doit être verte. Distribuez le reste, ou utilisez <b>→ 1er</b>.</p>",
        imgs: [],
      },
      {
        title: "Un avertissement sur le buy-in",
        text: "<p>La part prize pool et les frais doivent faire le prix du tournoi. Modifiez l'un des trois champs : les deux autres se recalculent.</p>",
        imgs: [],
      },
      {
        title: "« Suggestion impossible »",
        text: "<p>Les réglages de la suggestion ne tiennent pas dans le pool. Le message dit lequel changer : baissez le multiplicateur du dernier payé ou augmentez la part visée pour le 1er.</p>",
        imgs: [],
      },
      {
        title: "Un tournoi manque ou un barème est faux",
        text: "<p>Les tournois se gèrent dans <b>Calendrier &amp; barèmes</b> (menu Administration tournois, guide « Calendrier et barèmes »). Si l'écran dit « Aucun tournoi configuré », c'est la même page.</p>",
        imgs: [],
      },
      {
        title: "« Doublon bloqué » à la saisie",
        text: "<p>Ce tournoi est déjà enregistré à cette date. Vérifiez la date. Si la première saisie est mauvaise, supprimez la session dans l'<b>Historique</b>, puis saisissez de nouveau.</p>",
        imgs: [],
      },
      {
        title: "Saison clôturée : impossible de saisir ou de corriger",
        text: "<p>La saison de cette date est verrouillée. Seul un administrateur peut la rouvrir (guide « Clôturer la saison »).</p>",
        imgs: [],
      },
      {
        title: "Un joueur apparaît deux fois au classement",
        text: "<p>Son nom a été saisi avec deux écritures. Dans l'<b>Historique</b>, ouvrez les tournois concernés et modifiez le nom (crayon) pour qu'il soit identique. À la prochaine saisie, reprenez le nom proposé par la liste.</p>",
        imgs: [],
      },
      {
        title: "Un message dit que les réglages ne s'enregistrent pas",
        text: "<p>Les réglages de la déclaration, des courriers et de l'émargement sont enregistrés dans l'application. Si un bandeau rouge indique qu'ils n'ont pas pu être chargés ou enregistrés, la connexion avec l'application a été interrompue : rechargez la page. Tant que le bandeau est affiché, vos modifications ne sont pas enregistrées.</p>",
        imgs: [],
      },
      {
        title: "La déclaration est vide ou incomplète",
        text: "<p>Ouvrez <b>Réglages</b> : un jour décoché dans <b>Actif</b> n'apparaît pas. Pour un tournoi exceptionnel ou une annulation, passez par <b>Ajout/Modifications</b>. Un total des annexes différent de 100 % s'affiche en rouge dans l'onglet Annexes.</p>",
        imgs: [],
      },
      {
        title: "Le règlement TDA ne se charge pas",
        text: "<p>« Le règlement n'a pas pu être chargé » : vérifiez la connexion, puis rechargez la page. Si le message « Aucune édition du règlement n'est disponible » s'affiche, prévenez l'administrateur : le texte n'est pas activé.</p>",
        imgs: [],
      },
      {
        title: "La recherche du règlement ne trouve rien",
        text: "<p>Essayez un mot plus court ou le numéro de la règle (par exemple <b>45</b>). Les accents et les majuscules n'ont pas d'importance. Le guide « Rechercher dans le règlement » détaille ce que la recherche comprend.</p>",
        imgs: [],
      },
      {
        title: "Une page ou un menu n'apparaît pas",
        text: "<p>Chacun ne voit que les pages auxquelles son compte donne accès. S'il en manque une, demandez l'accès à l'administrateur.</p>",
        imgs: [],
      },
    ],
  },

  // ══ Training ══

  {
    id: 'training-pour-commencer', space: 'training', panel: 'training',
    title: 'Pour commencer',
    intro: "L'espace Training sert à s'entraîner aux calculs et aux réflexes de la table : Black Jack, roulette anglaise et Ultimate Texas Hold'em. Chaque module pose des questions, corrige tout de suite et garde la trace de vos séances.",
    steps: [
      {
        title: "Choisir un module",
        text: "<p>La page d'accueil de l'espace réunit tous les modules, groupés par jeu. Cliquez sur une tuile pour lancer l'entraînement. La tuile « Ordre Paiement » est grisée : ce module n'est pas encore disponible.</p>"
          + "<p>La barre du haut donne les mêmes accès : un menu par jeu, et <b>Mes résultats</b>.</p>",
        imgs: [{ src: 'captures/tr_accueil.png', alt: "La page d'accueil de l'espace Training" }],
      },
      {
        title: "Une session, de la première question au bilan",
        text: "<p>Une session compte <b>10 questions</b> (15 pour Couleur numéro, 20 cartes pour Tables de multiplication). En haut de l'écran, le numéro de la question, votre score et une barre de progression suivent l'avancement.</p>"
          + "<p>Validez une réponse avec la touche <b>Entrée</b> ou le bouton <b>→</b>. La correction s'affiche aussitôt, en vert si c'est juste, en rouge sinon avec la bonne réponse. À la fin, le bilan donne votre score, un pourcentage et un mot d'appréciation, puis propose de rejouer.</p>",
        imgs: [],
      },
      {
        title: "Niveaux et chronomètre",
        text: "<p>Certains modules proposent trois <b>niveaux</b>, Facile, Médium et Expert : plus le niveau monte, plus le temps de réponse est court ou plus la situation est chargée. Le temps de chaque niveau est affiché sur sa carte.</p>"
          + "<p>Les modules de l'Ultimate Texas Hold'em, BJ Paiement et Calcul paiement n'ont pas de chronomètre. Tables de multiplication a un chronomètre libre, qui mesure le temps total.</p>",
        imgs: [],
      },
      {
        title: "Ce qui est enregistré",
        text: "<p>Une session est enregistrée <b>quand elle est terminée</b>. Si vous quittez la page en cours de route, elle n'est pas comptée : elle est effacée à la prochaine ouverture du module.</p>"
          + "<p>Vos sessions terminées se retrouvent dans <b>Mes résultats</b> (guide « Suivre ses résultats »). Les responsables d'équipe voient les résultats de chacun.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'training-blackjack', space: 'training', panel: 'training',
    title: "S'entraîner au Black Jack",
    intro: "Deux modules : BJ Paiement, pour le calcul du paiement d'un blackjack, et BJ Score, pour lire la valeur d'une main sous le chronomètre.",
    steps: [
      {
        title: "BJ Paiement : calculer le paiement",
        text: "<p>Une mise s'affiche sur le tapis, avec le rapport de paiement du blackjack (3 pour 2). Tapez le montant à payer, en euros, puis validez. Les décimales sont acceptées, avec une virgule ou un point.</p>"
          + "<p>Il n'y a ni niveau ni chronomètre. Après chaque réponse, la correction s'affiche et la question suivante arrive toute seule.</p>",
        imgs: [{ src: 'captures/tr_bj_paiement.png', alt: 'BJ Paiement : la mise et la zone de réponse' }],
      },
      {
        title: "Lire la correction",
        text: "<p>Une bonne réponse s'affiche en vert. En cas d'erreur, la barre passe en rouge et donne le montant exact, pour comprendre avant de passer à la suite.</p>",
        imgs: [{ src: 'captures/tr_bj_faux.png', alt: 'Une réponse fausse et sa correction' }],
      },
      {
        title: "BJ Score : choisir son niveau",
        text: "<p>BJ Score montre une main de cartes : il faut en donner la <b>valeur</b> avant la fin du temps. Choisissez d'abord un niveau. Il fixe le temps disponible (15, 10 ou 5 secondes au départ) et la longueur des mains : plus le niveau est élevé, plus il y a de cartes.</p>",
        imgs: [{ src: 'captures/tr_bjs_niveaux.png', alt: 'Le choix du niveau de BJ Score' }],
      },
      {
        title: "BJ Score : répondre avant la fin du temps",
        text: "<p>Le chronomètre et sa barre se vident pendant que vous comptez. Tapez la valeur en points et validez. Une main avec un As accepte ses deux totaux possibles ; une main qui dépasse 21 est annoncée « Bust » avec son total. Si le temps est écoulé, la question compte comme fausse et la correction s'affiche.</p>",
        imgs: [{ src: 'captures/tr_bjs_question.png', alt: 'BJ Score : une main, le chronomètre et la zone de réponse' }],
      },
      {
        title: "Le bilan",
        text: "<p>Le bilan donne le score sur 10, le pourcentage et un mot d'appréciation : Parfait, Excellent, Bien, À améliorer ou À reprendre. <b>Nouvelle session</b> (ou <b>Rejouer</b> dans BJ Score) recommence, <b>← Training</b> revient aux modules.</p>",
        imgs: [{ src: 'captures/tr_bj_bilan.png', alt: "Le bilan d'une session" }],
      },
    ],
  },

  {
    id: 'training-roulette-calculs', space: 'training', panel: 'training',
    title: 'Roulette : les calculs',
    intro: "Trois modules de calcul pour la roulette anglaise : compter le paiement d'une mise, convertir des pièces en euros et apprendre les tables de multiplication des paiements.",
    steps: [
      {
        title: "Calcul paiement : choisir le niveau",
        text: "<p>Le niveau fixe le nombre de pièces misées : 1 à 3 pièces en Facile, 1 à 10 en Médium, le maximum en Expert. Il n'y a pas de chronomètre.</p>",
        imgs: [{ src: 'captures/tr_rp_niveaux.png', alt: 'Calcul paiement : le choix du niveau' }],
      },
      {
        title: "Calcul paiement : compter les pièces",
        text: "<p>Un numéro sort, et des pièces sont posées sur le tapis. Pour chaque mise, il faut combiner le type de mise et le nombre de pièces. Tapez le <b>nombre total de pièces</b> à payer, puis validez.</p>",
        imgs: [{ src: 'captures/tr_rp_question.png', alt: 'Calcul paiement : un numéro tiré et des mises sur le tapis' }],
      },
      {
        title: "Calcul paiement : comprendre une erreur",
        text: "<p>Quand la réponse est fausse, les pièces du tapis prennent la couleur de leur type de mise, et la barre rouge détaille le calcul de chaque type : par exemple « Cheval 11×17=187 ». Prenez le temps de la lire, puis cliquez sur <b>Question suivante</b>. Une bonne réponse, elle, enchaîne toute seule.</p>",
        imgs: [{ src: 'captures/tr_rp_faux.png', alt: 'Calcul paiement : la correction détaillée par type de mise' }],
      },
      {
        title: "Conversion pièces : valeur de la pièce, puis niveau",
        text: "<p>Commencez par choisir la <b>valeur de la pièce</b> (2,50 €, 5 €, 10 €... selon ce que l'administrateur a proposé). Elle reste la même pendant toute la session. Choisissez ensuite le niveau : le temps par question est de 12, 8 ou 4 secondes au départ.</p>",
        imgs: [{ src: 'captures/tr_rc_valeur.png', alt: 'Conversion pièces : le choix de la valeur de la pièce' }],
      },
      {
        title: "Conversion pièces : donner la valeur totale",
        text: "<p>Le nombre de pièces payées s'affiche avec leur valeur. Tapez le total en euros avant la fin du temps. Le nombre de pièces correspond à un vrai paiement de roulette, donc il varie selon le niveau.</p>"
          + "<p>Après une erreur ou un temps écoulé, la bonne valeur s'affiche et un bouton <b>Question suivante</b> apparaît.</p>",
        imgs: [{ src: 'captures/tr_rc_question.png', alt: 'Conversion pièces : le nombre de pièces et la zone de réponse' }],
      },
      {
        title: "Tables de multiplication : choisir la table",
        text: "<p>Choisissez la table à réviser : ×35, ×17, ×11, ×8 ou ×5, les rapports de paiement de la roulette. Une session est un paquet de <b>20 cartes</b> : les multiplications de ×1 à ×20, une fois chacune, dans le désordre.</p>",
        imgs: [{ src: 'captures/tr_rt_choix.png', alt: 'Tables de multiplication : le choix de la table' }],
      },
      {
        title: "Tables de multiplication : retourner la carte",
        text: "<p>Un chronomètre libre tourne du début à la fin du paquet : l'objectif est d'aller vite sans se tromper. Tapez le résultat et validez : la carte se retourne et montre la bonne réponse, en vert si vous aviez juste, en rouge sinon.</p>"
          + "<p>Le temps final figure dans le bilan, et vos meilleurs temps par table sont gardés dans <b>Mes résultats</b> (pour les sessions sans erreur).</p>",
        imgs: [{ src: 'captures/tr_rt_carte.png', alt: 'Tables de multiplication : une carte à calculer' }, { src: 'captures/tr_rt_reponse.png', alt: 'La carte retournée avec la bonne réponse' }],
      },
    ],
  },

  {
    id: 'training-roulette-tapis', space: 'training', panel: 'training',
    title: 'Roulette : le tapis',
    intro: "Deux modules pour connaître le tapis par cœur : retrouver un numéro sur le tapis, et reconnaître la couleur d'un numéro.",
    steps: [
      {
        title: "Pointage numéro : retrouver le numéro",
        text: "<p>Choisissez un niveau (10, 6 ou 3 secondes au départ). Le cylindre annonce un numéro : cliquez sur sa case, <b>avant la fin du temps</b>. Les numéros sont masqués sur le tapis, et celui-ci peut être inversé d'une question à l'autre (le zéro est à gauche ou à droite) pour ne pas apprendre par cœur une seule orientation.</p>",
        imgs: [{ src: 'captures/tr_rpt_question.png', alt: 'Pointage numéro : un numéro annoncé et le tapis aux numéros masqués' }],
      },
      {
        title: "Pointage numéro : la correction",
        text: "<p>Après chaque réponse, la bonne case est surlignée. En cas d'erreur ou de temps écoulé, un message indique où se trouvait le numéro : le zéro, ou la première, la deuxième ou la troisième douzaine. Un bouton <b>Question suivante</b> laisse le temps de regarder.</p>",
        imgs: [],
      },
      {
        title: "Couleur numéro : rouge, noir ou zéro",
        text: "<p>Un numéro s'affiche : cliquez sur <b>Rouge</b>, <b>Noir</b> ou <b>Zéro</b> avant la fin du temps (5, 3 ou 2 secondes au départ). Une session compte 15 questions. La correction indique la bonne couleur, puis la question suivante arrive.</p>",
        imgs: [{ src: 'captures/tr_rcol_question.png', alt: 'Couleur numéro : un numéro et les trois réponses' }],
      },
    ],
  },

  {
    id: 'training-uth', space: 'training', panel: 'training',
    title: "S'entraîner à l'Ultimate Texas Hold'em",
    intro: "Trois modules pour s'exercer à l'Ultimate Texas Hold'em. Aucun n'a de niveau ni de chronomètre : la session démarre dès l'ouverture de la page, avec des donnes tirées au hasard.",
    steps: [
      {
        title: "Meilleure main : trouver la combinaison",
        text: "<p>Vous voyez sept cartes : deux au joueur, cinq au board. Choisissez la <b>meilleure combinaison de cinq cartes</b> parmi les dix proposées, de Carte haute à Quinte flush royale.</p>"
          + "<p>Certaines donnes sont des pièges, avec par exemple deux combinaisons possibles : lisez bien toutes les cartes.</p>",
        imgs: [{ src: 'captures/tr_uth_main.png', alt: 'Meilleure main : sept cartes et dix combinaisons à choisir' }],
      },
      {
        title: "Meilleure main : la correction",
        text: "<p>Votre choix est coloré en rouge s'il est faux, la bonne combinaison en vert. Les cinq cartes de la meilleure main restent bien visibles et les deux autres sont atténuées. Cliquez sur <b>Suivant</b> pour continuer ; une bonne réponse sur une donne simple enchaîne seule.</p>",
        imgs: [{ src: 'captures/tr_uth_main_reponse.png', alt: 'Meilleure main : la correction, avec les cinq cartes de la meilleure main' }],
      },
      {
        title: "Qui gagne ? : deux questions par donne",
        text: "<p>Pour chaque donne, répondez à <b>deux questions</b>. La première : la banque est-elle qualifiée (au moins une paire) ? La seconde, qui apparaît ensuite : qui gagne, le joueur, la banque, ou l'égalité ?</p>"
          + "<p>La donne ne compte comme juste que si les deux réponses sont justes. La correction montre les deux meilleures mains, avec une explication du résultat ; un clic sur <b>Suivant</b> passe à la donne suivante.</p>",
        imgs: [{ src: 'captures/tr_uth_gagnant.png', alt: 'Qui gagne ? : la banque est-elle qualifiée, puis qui gagne' }],
      },
      {
        title: "Calcul des gains : lire la situation",
        text: "<p>Une phrase décrit ce que fait le joueur (par exemple « se couche »). Dessous, le tapis montre la banque, le board et les mises du joueur avec leurs jetons : le <b>Bonus</b> en losange, le voyant rouge du <b>Prog</b>, puis <b>Blind</b>, <b>Ante</b> et <b>Play</b>.</p>",
        imgs: [{ src: 'captures/tr_uth_gains.png', alt: 'Calcul des gains : le tapis et les mises du joueur' }],
      },
      {
        title: "Calcul des gains : répondre mise par mise",
        text: "<p>Cliquez sur chaque mise : une fenêtre propose <b>Je paie</b> (tapez alors le gain à payer, mise rendue non comprise, puis <b>OK</b>), <b>Je laisse</b> (la mise est rendue) ou <b>Je ramasse</b> (la mise est perdue). Le compteur indique le nombre de mises traitées.</p>"
          + "<p>Quand toutes les mises sont renseignées, <b>Valider</b> donne la correction, mise par mise. La donne n'est juste que si toutes les mises le sont. Le jackpot du Prog n'est pas corrigé : un simple rappel signale qu'il se fait valider par le superviseur.</p>",
        imgs: [{ src: 'captures/tr_uth_gains_mise.png', alt: "La fenêtre de réponse d'une mise" }],
      },
    ],
  },

  {
    id: 'training-mes-resultats', space: 'training', panel: 'training',
    title: 'Suivre ses résultats',
    intro: "La page Mes résultats garde toutes vos sessions terminées : vos records, votre moyenne récente, votre tendance et l'historique, module par module.",
    steps: [
      {
        title: "La vue d'ensemble",
        text: "<p>Ouvrez <b>Mes résultats</b> dans la barre ou sur la page d'accueil du Training. La vue d'ensemble donne quatre chiffres : le nombre de sessions, la précision globale, le nombre de modules essayés et la date de la dernière session.</p>"
          + "<p>En dessous, un tableau par jeu : pour chaque module, vos sessions, votre <b>record</b>, la <b>moyenne</b> de vos cinq dernières sessions et la <b>tendance</b>. Cliquez sur une ligne pour ouvrir le module.</p>",
        imgs: [{ src: 'captures/tr_resultats.png', alt: "Mes résultats : la vue d'ensemble" }],
      },
      {
        title: "Comprendre la tendance",
        text: "<p>La tendance compare la moyenne de vos cinq dernières sessions à celle des cinq précédentes : une flèche vers le haut vaut une progression, vers le bas un recul. Il faut au moins <b>huit sessions</b> dans le module pour qu'elle s'affiche ; avant, la page indique « Pas assez de sessions ».</p>",
        imgs: [],
      },
      {
        title: "Un jeu, un module",
        text: "<p>Les onglets du haut (Black Jack, Roulette Anglaise, Ultimate Texas Hold'em) affichent leurs sessions ; les puces permettent de choisir un module, ou tous. Pour les modules à niveaux, d'autres puces filtrent Facile, Médium ou Expert.</p>"
          + "<p>Chaque module montre ses chiffres, un histogramme de vos douze dernières sessions (la plus récente à droite) et l'historique : date, niveau, score et pourcentage. <b>Tout voir</b> déplie la liste complète.</p>",
        imgs: [],
      },
      {
        title: "Les meilleurs temps aux tables",
        text: "<p>Pour Tables de multiplication, l'historique indique la table jouée et le temps. Au-dessus, le <b>meilleur temps par table</b> ne tient compte que des sessions sans erreur.</p>",
        imgs: [{ src: 'captures/tr_resultats_module.png', alt: 'Tables de multiplication : meilleurs temps et historique' }],
      },
    ],
  },

  {
    id: 'training-suivi-equipe', space: 'training', panel: 'training-suivi',
    title: "Suivre l'équipe",
    intro: "Le Suivi équipe donne aux responsables les résultats de l'entraînement de toute l'équipe, en quatre vues. Il s'ouvre depuis le menu Gestion de la barre, rubrique Training.",
    steps: [
      {
        title: "Classement",
        text: "<p>Choisissez un module avec les puces (et un niveau, ou une table pour Tables de multiplication) : le classement range les croupiers selon la moyenne de leurs cinq dernières sessions. La colonne « Record » donne leur meilleur score, « Dernière » le temps écoulé depuis leur dernière session.</p>"
          + "<p>Un croupier doit avoir fait <b>trois sessions</b> pour être classé ; les autres sont listés dessous, sans numéro. Un clic sur un nom ouvre sa progression.</p>",
        imgs: [{ src: 'captures/tr_equipe_classement.png', alt: "Le classement de l'équipe sur un module" }],
      },
      {
        title: "Progression",
        text: "<p>Choisissez un croupier, puis un module et un niveau : la courbe montre le score de chaque session (un point par session) et, en trait épais, la moyenne glissante sur cinq sessions. Au-dessus, ses chiffres : sessions, record, moyenne récente et tendance.</p>",
        imgs: [{ src: 'captures/tr_equipe_progression.png', alt: "La progression d'un croupier sur un module" }],
      },
      {
        title: "Points faibles",
        text: "<p>Cette vue cherche où l'équipe se trompe le plus. Choisissez un module, et le périmètre : toute l'équipe ou un croupier. Les lignes sont triées par <b>taux d'erreur</b> : par exemple, pour Calcul paiement, le type de mise le plus souvent raté.</p>"
          + "<p>Une ligne n'apparaît qu'à partir de 5 tentatives pour l'équipe, 3 pour un croupier seul, pour que les chiffres aient du sens.</p>",
        imgs: [{ src: 'captures/tr_equipe_faibles.png', alt: "Les points faibles de l'équipe sur Calcul paiement" }],
      },
      {
        title: "Activité",
        text: "<p>Choisissez la période (7, 30 ou 90 jours) : la vue donne le nombre de sessions, de croupiers actifs, d'<b>inactifs depuis plus de 14 jours</b> et la date de la dernière session. Le graphique montre les sessions des douze dernières semaines, et le tableau détaille chaque croupier, avec un repère « Inactif » quand il en est un.</p>",
        imgs: [{ src: 'captures/tr_equipe_activite.png', alt: "L'activité de l'équipe" }],
      },
    ],
  },

  {
    id: 'training-configuration', space: 'training', panel: 'training', admin: true,
    title: 'Configurer les modules',
    intro: "Un administrateur règle ici les modules d'entraînement : plages de mises, chronomètres, cartes, valeurs de pièces. La page s'ouvre depuis le menu Gestion, rubrique Training. Les changements s'appliquent à la prochaine session de chaque croupier.",
    steps: [
      {
        title: "Black Jack",
        text: "<p>Trois réglages. Les <b>plages de mises</b> de BJ Paiement : deux plages (minimum, maximum, pas) avec un poids qui dit la fréquence : 80 / 20 signifie que 80 % des mises tombent dans la première. Un poids de 0 à la deuxième plage la désactive.</p>"
          + "<p>Le <b>chronomètre par niveau</b> de BJ Score (3 secondes au minimum), et le <b>nombre de cartes par niveau</b> : minimum, maximum (0 pour illimité) et seuil d'arrêt, 17 pour tirer comme la banque, 20 pour tirer comme un client.</p>",
        imgs: [{ src: 'captures/tr_config_bj.png', alt: 'Les réglages du Black Jack' }],
      },
      {
        title: "Roulette anglaise",
        text: "<p>Le <b>chronomètre par niveau</b> de Couleur numéro, Pointage numéro et Conversion pièces (2 secondes au minimum). Pour Conversion pièces, cochez aussi les <b>valeurs de pièces proposées</b> : une au moins est obligatoire.</p>"
          + "<p>Calcul paiement et Tables de multiplication n'ont rien à régler.</p>",
        imgs: [{ src: 'captures/tr_config_roulette.png', alt: 'Les réglages de la roulette anglaise' }],
      },
      {
        title: "Ultimate Texas Hold'em",
        text: "<p>Un seul réglage : le <b>montant maximum des mises</b> de Calcul des gains, de 5 à 200 €, par pas de 5 €. Meilleure main et Qui gagne ? n'ont rien à régler.</p>",
        imgs: [{ src: 'captures/tr_config_uth.png', alt: "Le réglage de l'Ultimate Texas Hold'em" }],
      },
      {
        title: "Enregistrer",
        text: "<p>Chaque jeu a son bouton <b>Enregistrer</b> : il n'enregistre que les réglages de cet onglet. Une valeur impossible (un maximum inférieur au minimum, par exemple) est refusée avec un message précis, et rien n'est envoyé. « Enregistré » confirme que c'est pris en compte.</p>",
        imgs: [],
      },
    ],
  },

  {
    id: 'training-depannage', space: 'training', panel: 'training',
    title: 'Résolution des problèmes courants',
    intro: "Les situations les plus courantes de l'espace Training, et ce qu'il faut regarder.",
    steps: [
      {
        title: "« Pas de résultats » dans Mes résultats",
        text: "<p>Seules les sessions <b>terminées</b> comptent. Allez jusqu'au bilan de la session, puis revenez : elle apparaîtra.</p>",
        imgs: [],
      },
      {
        title: "Ma session n'a pas été comptée",
        text: "<p>Elle a été interrompue avant la dernière question (page fermée, retour en arrière...). Une session incomplète n'est pas conservée. Refaites-la en entier.</p>",
        imgs: [],
      },
      {
        title: "La tendance affiche « Pas assez de sessions »",
        text: "<p>La tendance compare vos cinq dernières sessions aux cinq précédentes : il en faut au moins huit dans le module (en tenant compte du niveau choisi, si vous filtrez).</p>",
        imgs: [],
      },
      {
        title: "Rien ne se passe quand je valide",
        text: "<p>Le champ de réponse est vide ou ne contient pas un nombre. Tapez une valeur, puis validez avec Entrée ou le bouton →. Dans Calcul des gains, le bouton <b>Valider</b> reste grisé tant que toutes les mises n'ont pas de réponse (et un montant pour « Je paie »).</p>",
        imgs: [],
      },
      {
        title: "Le temps est trop court ou trop long",
        text: "<p>Le chronomètre de chaque niveau est réglé par un administrateur (guide « Configurer les modules »). Demandez-lui de l'ajuster.</p>",
        imgs: [],
      },
      {
        title: "La question suivante n'arrive pas toute seule",
        text: "<p>Après une erreur dans les modules de roulette, un bouton <b>Question suivante</b> laisse le temps de lire la correction. Dans Meilleure main, c'est <b>Suivant</b>. Une bonne réponse, elle, enchaîne automatiquement.</p>",
        imgs: [],
      },
      {
        title: "Un croupier n'est pas numéroté au classement",
        text: "<p>Il doit avoir fait au moins trois sessions dans le module (et le niveau) choisi. Avant, il est listé sous la ligne « pas encore classés ».</p>",
        imgs: [],
      },
      {
        title: "« Impossible de charger » les résultats",
        text: "<p>La connexion avec le serveur a échoué. Vérifiez votre connexion, rechargez la page et recommencez. Si le message revient, prévenez l'administrateur.</p>",
        imgs: [],
      },
      {
        title: "Une page ou un menu n'apparaît pas",
        text: "<p>Chacun ne voit que les pages auxquelles son compte donne accès : le Suivi équipe est réservé aux responsables, la Configuration des modules aux administrateurs. S'il en manque une, demandez l'accès à l'administrateur.</p>",
        imgs: [],
      },
    ],
  },

  // ══ Break list ══

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
    title: "Résolution des problèmes courants",
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
