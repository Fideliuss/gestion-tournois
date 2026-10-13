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
  'break-list': 'Break list',
};

var AIDE_GUIDES = [

  // ══ Tournois ══

  {
    id: 'tournois-pour-commencer', space: 'tournois', panel: 'tournois',
    title: 'Pour commencer',
    intro: "L'espace Tournois réunit les outils des tournois de poker : le calcul du prize pool, le challenge saisonnier et, pour les personnes qui en ont l'accès, l'administration (déclarations, courriers, extras, calendrier).",
    steps: [
      {
        title: "Les deux outils de l'espace",
        text: "<p>La page d'accueil de l'espace propose deux outils.</p><ul>"
          + "<li><b>Prize Pool Builder</b> : prépare la répartition des gains d'un tournoi et imprime le tableau.</li>"
          + "<li><b>Challenge Saisonnier</b> : saisit les résultats de chaque tournoi et tient le classement de la saison.</li></ul>"
          + "<p>Vous ne voyez que les outils auxquels votre compte donne accès.</p>",
        imgs: [{ src: 'captures/tn_accueil.png', alt: "La page d'accueil de l'espace Tournois" }],
      },
      {
        title: "La barre de navigation",
        text: "<p>Dans la barre du haut, <b>Prize Pool</b> et <b>Leaderboard</b> ouvrent les deux outils. Le menu <b>Administration tournois</b> regroupe quatre pages : <b>Déclarations</b>, <b>Générateur de courrier</b>, <b>Gestion des Extras</b> et <b>Calendrier &amp; barèmes</b>.</p>"
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
          + "<p>Vos montants sont conservés dans ce navigateur : vous les retrouvez en revenant sur la page. Choisir un autre tournoi les efface.</p>",
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
          + "<p>Les réglages sont enregistrés dans le navigateur de l'ordinateur utilisé : sur un autre poste, il faut les saisir de nouveau.</p>",
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
          + "<p><b>Enregistrer</b> garde vos changements ; <b>Réinitialiser</b> revient aux valeurs d'origine ; <b>Retour au courrier</b> ferme l'éditeur. Ces réglages sont enregistrés dans le navigateur de l'ordinateur utilisé.</p>",
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
          + "<p>Les présences et les heures de la semaine sont enregistrées dans le navigateur de l'ordinateur utilisé ; la liste des extras, elle, est commune à tous.</p>",
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
        title: "Les réglages ont disparu sur un autre ordinateur",
        text: "<p>Les réglages de la déclaration, des courriers et de l'émargement sont enregistrés dans le navigateur de l'ordinateur où ils ont été saisis. Sur un autre poste, ou après un effacement des données du navigateur, il faut les saisir de nouveau.</p>",
        imgs: [],
      },
      {
        title: "La déclaration est vide ou incomplète",
        text: "<p>Ouvrez <b>Réglages</b> : un jour décoché dans <b>Actif</b> n'apparaît pas. Pour un tournoi exceptionnel ou une annulation, passez par <b>Ajout/Modifications</b>. Un total des annexes différent de 100 % s'affiche en rouge dans l'onglet Annexes.</p>",
        imgs: [],
      },
      {
        title: "Une page ou un menu n'apparaît pas",
        text: "<p>Chacun ne voit que les pages auxquelles son compte donne accès. S'il en manque une, demandez l'accès à l'administrateur.</p>",
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
