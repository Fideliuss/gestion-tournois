# Contexte projet — Outils Tournois Casino Barrière Bordeaux

> Fichier à lire en début de session pour assurer la continuité.
> À mettre à jour avant de clore chaque session de travail.

---

## Projet

Outil interne web pour la gestion des tournois de poker du Casino Barrière Bordeaux.
Quatre outils disponibles, zéro serveur, zéro build — s'ouvre directement dans Chrome/Edge.

**Repo GitHub :** https://github.com/Fideliuss/gestion-tournois (privé)
**Développeur :** Fideliuss

---

## Architecture

```
index.html          Hub principal
admin.html          Sous-hub Gestion Administrative

shared/
  barriere.css      Styles partagés (thème, composants communs)
  barriere.js       Scripts partagés (toggle jour/nuit)
  logo.png          Logo officiel utilisé dans les courriers

leaderboard/
  leaderboard.html  Challenge Saisonnier — HTML pur
  leaderboard.css   Styles du leaderboard
  leaderboard.js    Logique JS du leaderboard (~400 lignes)

prize-pool/
  prize-pool.html   Prize Pool Calculator — HTML pur
  prize-pool.css    Styles du calculateur
  prize-pool.js     Logique React du calculateur

declaration/
  declaration.html  Déclaration mensuelle PN — HTML pur
  declaration.css   Styles de la déclaration
  declaration.js    Logique JS de la déclaration (~450 lignes)
  courriers.html    Générateur de courriers PN — accessible depuis declaration.html uniquement
  courriers.css     Styles lettre A4 + règles d'impression
  courriers.js      Logique JS courriers (~300 lignes)
```

**Règle de séparation :** chaque fichier HTML ne contient que la structure + les balises `<link>` et `<script>`. Tout le CSS et le JS sont externalisés dans leurs fichiers dédiés.

---

## Stack technique

- Vanilla JS (leaderboard), React 18 via CDN (prize pool)
- File System Access API (Chrome/Edge uniquement) pour la persistance des données
- IndexedDB pour mémoriser le handle du dossier entre sessions
- localStorage comme fallback si dossier non connecté
- Données stockées dans `barriere_data.json` (exclu du repo via .gitignore)

---

## Workflow Git

```
main       Branche stable — ce qui tourne au casino. Ne jamais push directement.
develop    Branche de travail active. Point de départ pour toute nouvelle feature.
feature/x  Une branche par fonctionnalité, créée depuis develop.
```

**Flux standard :**
1. `git checkout develop`
2. `git checkout -b feature/nom-feature`
3. Travail + commits
4. Merge dans `develop`
5. Quand version validée → merge `develop` dans `main` + tag `vX.Y.Z`

---

## Bugs corrigés (historique)

| # | Fichier | Correction |
|---|---------|------------|
| 1 | leaderboard.js | `threeColsOf()` — `indexOf` sur sous-tableau remplacé par offset+index local |
| 2 | prize-pool.js | `result[1]` undefined quand `spots===1` — guard ajouté |
| 3 | leaderboard.js | Apostrophes dans les `onclick` — helper `esc()` avec `\x27` |
| 4 | leaderboard.js | IDs `Date.now()` — remplacé par compteur `nextId()` |
| 5 | leaderboard.js | `showDirectoryPicker` — erreurs surfacées à l'utilisateur au lieu d'être avalées |
| 6 | barriere.css | Bouton thème jour/nuit masqué à l'impression (`@media print`) |
| 7 | declaration.css | Fond beige en mode jour à l'impression — `body` et `.app` passés en `!important` dans `@media print` |

---

## Fonctionnalités implémentées

### Prize Pool Calculator
- Décomposition buy-in (prize pool, rake 4%, frais casino, cagnotte 2€)
- Progression super-géométrique, dernier payé = 2× buy-in
- 12% des joueurs payés (ajustable manuellement)
- Impression du tableau

### Déclaration DTPJ
- Tableau mensuel généré automatiquement depuis une config par jour de semaine (lun–dim)
- Impression A4 paysage : seuls tableau + annexes visibles, tient sur 1 page
- Annexes Prize Pool indépendantes et éditables (joueurs, cave, répartition % à 10 places)
- Tournois ad-hoc : ajout d'un tournoi exceptionnel pour le mois en cours, trié chronologiquement
- Gestion ponctuelle : annuler ou modifier un tournoi sur un jour précis (restaurable)
- Encadrement (directeurs + arbitres) configurable
- Sections de config regroupées en 4 onglets : Tournois / Encadrement / Annexes / Ponctuel
- Persistance localStorage (`decl_cfg`, `decl_staff`, `decl_annexes`, `decl_adhoc_Y_M`, `decl_exc_Y_M`)
- Toggle rachats : si désactivé, "RE ENTRY" disparaît du titre du tournoi

### Courriers mensuels
- Génération des 3 courriers officiels d'accompagnement mensuel : Ministre de l'Intérieur, SIPJ 33, Préfecture de la Gironde
- Lit la même config localStorage que la Déclaration DTPJ — aucune saisie supplémentaire
- Mise en page A4 portrait stricte (1 page), police Garamond/Times New Roman, style administratif français
- Paramètres en deux sections séparées : "Mois déclaré" et "Date du courrier"
- Date courrier auto-calculée à J-21 du début du mois déclaré, avec hint "Date limite de déclaration"
- Triangle des destinataires corrigé : chaque courrier liste les 2 autres destinataires (Ministre→SIPJ+Préfecture, SIPJ→Ministre+Préfecture, Préfecture→Ministre+SIPJ)
- Destinataires et signatures éditables dans l'app (accordéon discret), persistés dans `localStorage('courriers_tpl')`
- Export PDF via `window.print()` + CSS `@media print` (marges à 0, fond blanc)
- **Accessible uniquement depuis declaration.html** (bouton "✉ Courriers") — non listé dans le hub
- Après un reset du localStorage (`courriers_tpl`), les valeurs par défaut sont rechargées depuis `TEMPLATES_DEFAULT`

### Challenge Saisonnier (Leaderboard)
- Classement en temps réel avec podium visuel (top 3 + colonnes 4-30 + 31-150+)
- Saisie des résultats par tournoi (places standards + places supplémentaires)
- **Blocage doublon** : validation impossible si même tournoi + même date déjà saisi
- **Pagination historique** : 25 résultats/page, reset auto au filtrage
- Historique des résultats avec recherche et filtre par tournoi
- Suppression par résultat ou par session entière
- Gestion des tournois (CRUD complet + barèmes de points)
- Document ranking imprimable (cagnotte totale, 1er=10%, 2ème=5%)
- Fiche joueur détaillée (modal : total points, meilleur résultat, historique)
- Sauvegarde locale en JSON via File System Access API

---

## Conventions de code

- Noms de fonctions : camelCase, verbe + sujet (`renderClassement`, `validateTournament`)
- IDs HTML : kebab-case (`hist-body`, `fs-banner`)
- Classes CSS : kebab-case, préfixe par composant (`fs-banner`, `rank-entry-sm`)
- Apostrophes dans les onclick : toujours passer par `esc(s)` → `s.replace(/'/g,"\\x27")`
- IDs d'entrées : générés via `nextId()` (compteur basé sur `Date.now()`)
- Noms de joueurs : stockés et comparés en MAJUSCULES, affichés via `cap()`
- Pas de bundler, pas de npm — zéro dépendance locale

---

## Pistes de fonctionnalités discutées

- Édition d'un résultat existant (actuellement : suppression uniquement)
- Export CSV des résultats
- Filtrage du classement par tournoi
- Évolution du rang d'un joueur sur la saison
- Sauvegarde de configurations buy-in dans le prize pool

---

## À savoir pour la prochaine session

- On travaille toujours sur `develop`, jamais sur `main` directement
- Tester avec Chrome ou Edge (File System Access API non disponible ailleurs)
- `barriere_data.json` n'est pas dans le repo — les données restent locales
- `declaration/courriers.html` ne doit PAS apparaître dans le hub — accès réservé via `declaration/declaration.html` (bouton "✉ Courriers")
- Les destinataires des courriers sont éditables dans l'app (accordéon discret) et persistés dans `localStorage('courriers_tpl')`
- Si les valeurs par défaut des courriers changent (ex : triangle destinataires), l'utilisateur doit cliquer "Réinitialiser" dans l'accordéon pour purger le localStorage et recharger les nouvelles valeurs
- Transitions de page (fade in/out) gérées dans `shared/barriere.js` — classe `is-leaving` sur `<body>`
- Lien `.back` est `position:fixed` top-left sur toutes les pages
- La déclaration extras sera dans `declaration/` quand elle sera implémentée, avec une entrée dans `admin.html`
- Ce fichier est à mettre à jour en fin de chaque session avant de pusher
