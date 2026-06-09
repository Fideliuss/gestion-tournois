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
index.html              Hub principal (guard auth, filtrage cartes par rôle)
admin.html              Sous-hub Gestion Administrative (guard admin)
login.html              Page de connexion magic link (charte graphique, thème, redirect par rôle)

shared/
  barriere.css      Styles partagés (thème, composants communs, styles auth : #auth-overlay, #auth-badge, .auth-chip-*)
  barriere.js       Scripts partagés (toggle jour/nuit, favicon, BarriereFS — couche de persistance File System Access API + IndexedDB pour extras uniquement)
  tournaments.js    Référentiel tournois centralisé : TOURNAMENT_DEFAULTS (leaderboard le lit comme fallback)
  supabase.js       Client Supabase : mappers camelCase↔snake_case + objet SB (CRUD résultats, sessions, tournois, extras + auth)
  auth.js           Garde d'accès auth : AUTH.guard(), AUTH.signOut(), AUTH._addBadge() — chargé après supabase.js
  changelog.js      Mis à jour manuellement avant chaque PR de release (var CHANGELOG[])
  logo.png          Logo officiel utilisé dans les courriers
  favicon/          Favicon et icônes PWA (ico, svg, png, apple-touch, manifest)

leaderboard/
  leaderboard.html  Challenge Saisonnier — HTML pur
  leaderboard.css   Styles du leaderboard
  leaderboard.js    Logique JS du leaderboard (~600 lignes)

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

extras/
  extras.html       Déclaration extras & émargement — HTML pur
  extras.css        Styles + règles d'impression (portrait déclaration / paysage émargement)
  extras.js         Logique JS (~270 lignes)
```

**Règle de séparation :** chaque fichier HTML ne contient que la structure + les balises `<link>` et `<script>`. Tout le CSS et le JS sont externalisés dans leurs fichiers dédiés.

---

## Stack technique

- Vanilla JS (leaderboard), React 18 via CDN (prize pool)
- **Supabase** (PostgreSQL cloud) pour la persistance du leaderboard ET des extras ET pour l'authentification
  - URL : `https://grpzgidhawyhinzrqiqm.supabase.co`
  - Clé : publishable key (frontend-safe, RLS activé)
  - Client JS via CDN : `@supabase/supabase-js@2`
  - `shared/supabase.js` : objet `SB` avec CRUD complet (résultats, sessions, tournois, extras) + méthodes auth (`sendMagicLink`, `signOut`, `getSession`, `onAuthStateChange`) + mappers camelCase↔snake_case
  - Tables : `results`, `sessions`, `tournaments` (ids bigint auto-incrémentés) + `extras` (id texte généré côté client)
  - **RLS** : politique `authenticated` sur les 4 tables — accès réservé aux utilisateurs connectés
- **Auth magic link** (Supabase Auth) :
  - `login.html` : page de connexion (magic link, redirect par rôle après authentification)
  - `shared/auth.js` : `AUTH.guard({ loginUrl, role })` — overlay spinner, vérif session, vérif rôle, badge utilisateur
  - Rôles : `admin` (accès total) et `floor` (prize pool uniquement) — stockés dans `auth.users.raw_user_meta_data.role`
  - Default rôle : `floor` si aucune métadonnée définie
  - Persistance session : JWT 7 jours (604800s) via localStorage (géré par supabase-js)
  - Redirect magic link : `https://fideliuss.github.io/gestion-tournois/login.html`
  - Pages admin-only : `admin.html`, `leaderboard/leaderboard.html`, `declaration/declaration.html`, `declaration/courriers.html`, `extras/extras.html`
  - Pages authentifiées (tous rôles) : `index.html`, `prize-pool/prize-pool.html`
  - Sur `index.html` : les cartes Challenge Saisonnier et Gestion Administrative ont `data-role="admin"` et sont masquées pour les utilisateurs `floor`
- File System Access API — **plus utilisée** (BarriereFS toujours défini dans `shared/barriere.js` mais aucun module ne l'appelle)
- localStorage pour la persistance des configs déclaration/courriers/émargements hebdo (`extras_cfg`, `extras_emarg_YYYY_WW`, `decl_*`, `courriers_tpl`)
- Indicateur de connexion FS (`.fs-indicator`) toujours défini dans `shared/barriere.css` mais retiré de toutes les pages

---

## Workflow Git

```
main       Branche stable — ce qui tourne au casino. Ne jamais push directement.
develop    Branche de travail active. Point de départ pour toute nouvelle feature.
feature/x  Une branche par fonctionnalité, créée depuis develop.
```

**Flux standard (feature → develop) :**
1. `git checkout develop`
2. `git checkout -b feature/nom-feature`
3. Travail + commits
4. Push de la branche : `git push -u origin feature/nom-feature`
5. **Ouvrir une PR** `feature/nom-feature → develop` sur GitHub
6. Relecture + merge de la PR (pas de merge local direct)

**Flux release (develop → main) :**
1. Mettre à jour `shared/changelog.js` sur `develop` : ajouter l'entrée `{ version, date, message }` en tête du tableau — le message = titre de la PR à venir
2. Mettre à jour `CONTEXT.md` et `README.md` si nécessaire
3. Push `develop`, ouvrir une PR `develop → main` sur GitHub
4. Merger la PR
5. Taguer le merge commit (tag léger — hérite du "Verified" GitHub) :
   ```
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

> **Règle absolue :** aucun commit direct sur `main`. Tout passe par une PR. Le tag se pose sur le merge commit, jamais sur un commit séparé.
> **Tags légers** (`git tag` sans `-a`) : pointent directement sur le merge commit signé par GitHub → badge "Verified" automatique. Ne pas utiliser `-a`.

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
| 8 | csv-import.html | Sélection fichier silencieuse — `<div onclick="input.click()">` remplacé par `<label for="...">` natif |
| 9 | csv-import.html | Preview ne s'affichait pas — `style.display = ''` ne surcharge pas `display:none` CSS → corrigé en `style.display = 'block'` |
| 10 | leaderboard.css | Modal scroll figé — `overflow-y:auto` sur l'overlay `position:fixed` bloqué par Chrome → déplacé sur `.modal` avec `max-height: calc(100vh - 80px)` |
| 11 | leaderboard.js | Impression classement en ordre ligne — CSS Grid (ordre lignes) remplacé par CSS `columns` (ordre colonnes) |

---

### Déclaration Extras (`extras/`)
- Liste des croupiers extras avec infos personnelles CRUD (nom, prénom, date/lieu naissance, adresse)
- **Déclaration mensuelle** : tableau « DECLARATION CROUPIER EXTRA [MOIS] [ANNÉE] - CASINO BORDEAUX » imprimable A4 paysage, sélecteur `<input type="month">`
- **Émargement hebdomadaire** : grille 4×N imprimable A4 paysage, sélecteur `<input type="week">`
  - Cochage des jours travaillés → heure auto (20:55 semaine, 16:55 dimanche, configurables)
  - Overrides d'horaires ad-hoc : par colonne (jour) et par cellule (extra × jour), chaîne de priorité `cellule → colonne → défaut`
  - Seuls les extras cochés apparaissent dans l'émargement imprimé
  - Couleurs : bleu (#4472C4) pour jours semaine travaillés, orange (#C55A11) pour dimanche
  - Cartes blanches en complément pour arriver à un multiple de 4
- Persistance : liste extras dans **Supabase** (table `extras`) ; config horaire et émargements hebdo dans `localStorage` (`extras_cfg`, `extras_emarg_YYYY_WW`)
- Accessible depuis `admin.html` (carte "Déclaration Extras")

## Fonctionnalités implémentées

### Prize Pool Calculator
- Sélection du tournoi via presets configurables (référentiel centralisé `tournaments.json`)
- PP et Frais définis par tournoi ; Buy-in = PP + Frais (calculé automatiquement, readonly)
- Répartition manuelle des gains : constructeur interactif avec indicateurs live et hints
- Suggestion géométrique automatique ajustable
- Bandeau récap : brut / rake / prize pool net / cagnotte
- Gestion des tournois (CRUD) accessible via ⚙ discret dans l'en-tête des presets
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
- **Historique vue calendrier** : grille mensuelle 7 colonnes (Lun → Dim), mois les plus récents en premier
  - Jours avec session : chips cliquables (nom tournoi + cagnotte) — la date de saisie n'a aucun effet sur l'ordre
  - Clic sur un chip → panneau détail sous le calendrier du mois (résultats, édition inline, suppression)
  - Indicateur "aujourd'hui" dans le mois courant
  - Cagnotte mensuelle totale affichée dans le header de chaque mois
  - Recherche texte (joueur ou tournoi) + filtre par tournoi + filtre par date
  - **Édition inline des résultats** : place, nom, points — directement dans la ligne, Enter=save, Escape=cancel
  - **Édition inline des sessions** : nombre d'entrées (cagnotte recalculée automatiquement)
  - Suppression par résultat ou par session entière
- Gestion des tournois (CRUD complet + barèmes de points)
- **Document ranking imprimable** (A4 portrait, centré) :
  - Encadré doré (2pt `#C4A04A`), typographie Cormorant Garamond
  - Casino Barrière Bordeaux → filet or → titre cursif → date → montant 68pt
  - Cases 🥇 or / 🥈 gris avec rang, montant, % — fonds forcés avec `print-color-adjust`
- **Impression classement one-page** (A4 portrait) :
  - Podium visuel 3 marches (2ème | 1er | 3ème), bordure dorée 1er
  - Places 4-30 en 3 colonnes, 31-150 en 4 colonnes — ordre colonne par colonne (CSS `columns`)
  - Coupure stricte à 150 — pas de section 151+
- Fiche joueur détaillée (modal : total points, meilleur résultat, historique) — affichée en haut de page
- Données sauvegardées dans **Supabase** (cloud PostgreSQL) — accessible depuis n'importe quelle machine

---

## Conventions de code

- Noms de fonctions : camelCase, verbe + sujet (`renderClassement`, `validateTournament`)
- IDs HTML : kebab-case (`hist-body`, `fs-banner`)
- Classes CSS : kebab-case, préfixe par composant (`fs-banner`, `rank-entry-sm`)
- Apostrophes dans les onclick : toujours passer par `esc(s)` → `s.replace(/'/g,"\\x27")`
- IDs d'entrées leaderboard : générés par Supabase (`bigint generated always as identity`) — ne pas passer `id` dans les inserts
- Noms de joueurs : stockés et comparés en MAJUSCULES, affichés via `cap()`
- Pas de bundler, pas de npm — zéro dépendance locale

---

## Pistes de fonctionnalités discutées

- Export CSV des résultats
- Filtrage du classement par tournoi
- Évolution du rang d'un joueur sur la saison
- Sauvegarde de configurations buy-in dans le prize pool

---

## À savoir pour la prochaine session

- **Toujours mettre à jour `CONTEXT.md` et `README.md` avant de créer une PR et de merger** — sans attendre que l'utilisateur le demande
- On travaille toujours sur `develop`, jamais sur `main` directement
- Tester avec Chrome ou Edge
- Les données leaderboard ET extras sont dans **Supabase** (cloud) — synchronisées automatiquement, accessibles depuis n'importe quelle machine, aucune config FS requise
- `shared/changelog.js` EST dans le repo — **mis à jour manuellement** avant chaque PR de release, jamais via script
- `declaration/courriers.html` ne doit PAS apparaître dans le hub — accès réservé via `declaration/declaration.html` (bouton "✉ Courriers")
- Les destinataires des courriers sont éditables dans l'app (accordéon discret) et persistés dans `localStorage('courriers_tpl')`
- Si les valeurs par défaut des courriers changent (ex : triangle destinataires), l'utilisateur doit cliquer "Réinitialiser" dans l'accordéon pour purger le localStorage et recharger les nouvelles valeurs
- Transitions de page (fade in/out) gérées dans `shared/barriere.js` — classe `is-leaving` sur `<body>`
- Lien `.back` est `position:fixed` top-left sur toutes les pages
- La déclaration extras est dans `extras/` et accessible depuis `admin.html`
- `extras/extras.html` gère 3 onglets : Liste / Déclaration / Émargement — tout en un seul fichier
- L'impression utilise `injectPageStyle()` pour injecter dynamiquement `@page` (portrait ou paysage) avant `window.print()`, puis nettoie avec un setTimeout
- Les semaines utilisent la numérotation ISO (lun=1er jour, `getMondayOfISOWeek`)
- Ce fichier est à mettre à jour en fin de chaque session avant de pusher
- **Changelog** : mis à jour manuellement dans `shared/changelog.js` avant la PR de release. Ajouter l'entrée en tête du tableau avec le titre de la PR. La version affichée dans `index.html` = `CHANGELOG[0].version`
- `csv-import.html` et `supabase-import.html` ont été supprimés du repo après migration — outils one-shot, migration terminée
- Le schéma Supabase (tables `results`, `sessions`, `tournaments`, `extras`) doit être créé manuellement via le SQL Editor de Supabase avant le premier usage
- **Supabase RLS** : les 4 tables (`results`, `sessions`, `tournaments`, `extras`) ont une politique `authenticated` (plus `anon`). Toute modification du RLS doit utiliser un bloc `DO $$ ... $$` pour dropper les polices existantes par nom dynamique (les noms varient)
- **Auth guard pattern** : chaque page protégée charge `shared/supabase.js` + `shared/auth.js` via CDN supabase-js, puis appelle `AUTH.guard({ loginUrl, role })` — l'overlay est injecté de façon synchrone pour éviter le flash de contenu
- Pour définir le rôle d'un utilisateur : dans Supabase Dashboard → Authentication → Users → Edit user → `raw_user_meta_data` → `{ "role": "admin" }` ou `{ "role": "floor" }`
- `_tournamentsCache` (var privée dans `leaderboard.js`) mis à `null` après chaque upsert/delete de tournoi pour forcer un rechargement depuis Supabase
- L'impression du classement (onglet 🏆) utilise un div dédié `#classement-print-page` (masqué en temps normal, affiché via `body.print-classement`), généré à la volée par `printClassement()` — même pattern que le document ranking
- Le modal joueur utilise `_closeModal()` (retire `modal-open` du body) et `body.modal-open { overflow: hidden }` pour bloquer le scroll de fond
- L'historique utilise une **vue calendrier** (grille 7 cols par mois) — plus d'accordion. `_histExpandedIds` (Set) mémorise les sessions dont le panneau détail est ouvert sous le calendrier
- Le document ranking utilise des classes CSS `rp-*` (pas d'inline styles) — le même HTML alimente la prévisualisation écran (`.ranking-doc`) et le print (`.rp-page`) ; `print-color-adjust: exact` force les fonds colorés
- `toggleCalSession(id)` ouvre/ferme le panneau détail d'une session dans la vue calendrier (remplace `toggleSession` de l'ancien accordion)
