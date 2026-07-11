# Contexte projet — Outils Tournois Casino Barrière Bordeaux

> Fichier à lire en début de session pour assurer la continuité.
> À mettre à jour avant de clore chaque session de travail (et avant toute PR).

---

## Projet

Application web interne pour le Casino Barrière Bordeaux, organisée en 3 panneaux : **Outils Tournois** (gestion des tournois de poker), **Training Croupier** (entraînement Blackjack + Roulette), **Gestion Comptes** (admin). Zéro serveur, zéro build — s'ouvre directement dans Chrome/Edge.

Conçue pour être **extensible au-delà des tournois** — architecture de panneaux/rôles pensée pour accueillir de futurs modules (Jeux de Tables au sens large).

**Repo GitHub :** https://github.com/Fideliuss/gestion-tournois (privé)
**Développeur :** B. Cuvelier (Fideliuss)
**Convention de nommage :** underscore `_` pour tous les fichiers et dossiers (`prize_pool`, `admin_tournois`, `roulette_paiement`), jamais de tiret.

---

## Roadmap phases

- **Phase 0** — Restructuration : hub multi-panneaux, rôles/permissions par panel, licence propriétaire. Livrée.
- **Phase 1** — Training Croupier : Blackjack (BJ Paiement, BJ Score). Livrée.
- **Phase 2** — Training Croupier : Roulette Anglaise (Couleur, Pointage, Conversion, Calcul Paiement). Livrée, taguée `v2.0.0` (2026-07-03).
- **Phase 3** — Suivi résultats : vue historique croupier + vue manager (tous les croupiers). À venir.
- **Phase 4** — Ultimate Texas Hold'em : nouveau jeu complet. À venir.

**Stratégie de release** : itérative depuis Phase 2 (chaque phase peut donner lieu à sa propre release taguée), et non plus "tout accumulé sur develop jusqu'à la fin de la roadmap" comme prévu initialement.

---

## Architecture

```
index.html                    Hub principal — 3 panneaux (Outils Tournois / Training Croupier / Gestion Comptes)
outils_tournois.html          Sous-hub Outils Tournois (Prize Pool, Leaderboard, Administration Tournois)
login.html                    Page de connexion (e-mail + mot de passe, charte graphique, redirect par rôle)

shared/
  barriere.css      Styles partagés (thème, composants communs, styles auth : #auth-overlay, #auth-badge, .auth-chip-*)
  barriere.js       Scripts partagés (toggle jour/nuit, favicon, transitions de page)
  tournaments.js    TOURNAMENT_DEFAULTS (fallback) + TournamentsStore (lecture/écriture Supabase, source de vérité)
  semainier.js      buildSemainier() — widget sélecteur de tournoi par jour, utilisé par prize_pool + leaderboard
  supabase.js       Client Supabase : mappers camelCase↔snake_case + objet SB (CRUD résultats/sessions/tournois/extras/app_roles/training + auth + Edge Function manage-users)
  auth.js           AUTH.guard({loginUrl, role, panel}), AUTH.signOut(), AUTH._addBadge(), AUTH.clearRolesCache() — chargé après supabase.js
  changelog.js      Mis à jour manuellement avant chaque PR de release (var CHANGELOG[])
  logos/            Logos blanc (écran) / noir (impression) / PNG (courriers)
  favicon/          Favicon et icônes PWA

leaderboard/
  leaderboard.html  Challenge Saisonnier — HTML pur
  leaderboard.css
  leaderboard.js

prize_pool/
  prize_pool.html   Prize Pool Builder — HTML pur
  prize_pool.css
  prize_pool.js     Logique React

admin/
  admin_tournois.html   Sous-hub Administration Tournois (Déclaration DTPJ, Extras, Config Tournois)
  config_tournois.html  CRUD tournois — semainier par jour, barème de points, guard panel:'admin-tournois'
  comptes.html           Gestion Comptes — CRUD comptes + rôles personnalisables + permissions par panneau, guard role:'admin' (intentionnellement admin-only, pas de panel)
  declaration/
    declaration.html  Déclaration mensuelle PN, guard panel:'admin-tournois'
    declaration.css / declaration.js
    courriers.html    Générateur de courriers PN — accessible depuis declaration.html uniquement, guard panel:'admin-tournois'
    courriers.css / courriers.js
  extras/
    extras.html   Déclaration extras & émargement, guard panel:'admin-tournois'
    extras.css / extras.js

training/
  training.html          Sous-hub Training Croupier (Blackjack / Roulette / Ultimate Poker à venir)
  training.css            Styles partagés training (level-card, game-card, answer-zone, feedback-bar)
  blackjack/
    blackjack_hub.html      Sous-hub Blackjack + modal config admin (plages de mise, timers, cartes/niveau)
    blackjack.html / .js    BJ Paiement
    blackjack_score.html / .js  BJ Score
  roulette/
    roulette_hub.html       Sous-hub Roulette + modal config admin (timers, valeurs de pièces par module)
    roulette.css            Styles partagés tapis + chips + badges (tous modules roulette)
    roulette_tapis.js       Composant partagé : renderTapis(), génération de mises (buildBetPool/weightedPickPool), positionnement DOM des chips (chipPosFromDOM), renderChips()
    roulette_paiement.html / .js    Calcul Paiement
    roulette_conversion.html / .js  Conversion Pièces
    roulette_pointage.html / .js    Pointage Numéro
    roulette_couleur.html / .js     Couleur Numéro
    roulette_tables.html / .js      Tables de multiplication (flashcard ×35/×17/×11/×8/×5)
    roulette_mixte.html / .js       Paiement Mixte (répartition pièces / plaques, 3 types)
  resultats/               Phase 3 — pas encore créé (voir roadmap)

supabase/
  functions/manage-users/index.ts   Edge Function Deno — CRUD comptes, vérif admin via app_metadata côté serveur
  migrations/
    training_tables.sql              training_config, training_sessions, training_results (+ RLS)
    fix_rls_app_metadata.sql         Migration policies user_metadata → app_metadata (rôle non falsifiable client-side)
    add_blackjack_cards_config.sql   Ajoute la clé "cards" (nb cartes/niveau BJ Score) au training_config existant
    add_roulette_mixte_config.sql    Ajoute la clé "mixte" (timers Paiement Mixte) au training_config existant
```

**Règle de séparation :** chaque fichier HTML ne contient que la structure + les balises `<link>` et `<script>`. Tout le CSS et le JS sont externalisés dans leurs fichiers dédiés (sauf styles/scripts très courts spécifiques à une page, tolérés inline dans un `<style>`/`<script>` de tête).

**Composants CSS partagés (ripolinage juillet 2026)** — training/ avait dérivé stylistiquement de l'app générale (réimplémentation parallèle des cartes de nav, modals dupliquées 3×, styles inline trop longs). Centralisés :
- `.modal-overlay`/`.modal-box`/`.modal-wide` (avec coins dorés) → `shared/barriere.css`, utilisé par `admin/comptes.html` + tous les hubs training. Les modals plus larges utilisent un override scoped (`#modal-cfg .modal-box { max-width: ... }`) plutôt que de dupliquer le composant.
- `.tool-card`/`.tool-badge`/`.tool-name` (cartes de navigation hub, avec `--accent` par carte) → seul composant de nav card dans toute l'app, y compris les hubs training (`training.html`, `blackjack_hub.html`, `roulette_hub.html`). Étendu avec `.tool-card.disabled` + `.tool-soon` pour les cartes "bientôt disponible". **Ne plus créer de variante `.game-card` ou équivalent** — toujours réutiliser `.tool-card`.
- `.cfg-module-title`/`.cfg-timers`/`.cfg-timer-cell`/`.cfg-timer-label`/`.cfg-timer-input`/`.cfg-hint`/`.cfg-msg` (grille de config timers par niveau, modals admin des hubs training) → `training/training.css`
- CSS spécifique à un module (ex : flip 3D des flashcards `.tb-card`/`.tb-face`) → dans le `.css` partagé du jeu concerné (`roulette.css`), pas inline dans la page, dès que ça dépasse quelques règles

---

## Stack technique

- Vanilla JS (leaderboard, training), React 18 via CDN (prize pool)
- **Supabase** (PostgreSQL cloud) pour la persistance (tournois, leaderboard, extras, training) ET l'authentification
  - URL : `https://grpzgidhawyhinzrqiqm.supabase.co`
  - Clé : publishable key (frontend-safe, RLS activé)
  - Client JS via CDN : `@supabase/supabase-js@2`
  - `shared/supabase.js` : objet `SB` — CRUD complet (résultats, sessions, tournois, extras, app_roles, training_config/sessions/results) + méthodes auth (`getSession`, `signOut`, `updatePassword`) + appel Edge Function (`listUsers`, `createUser`, `updateUser`, `deleteUser`) + mappers camelCase↔snake_case
  - Tables : `results`, `sessions`, `tournaments`, `extras`, `app_roles` (slug PK, label, panels jsonb, color), `training_config`, `training_sessions`, `training_results`
  - **RLS** : politique `authenticated` sur toutes les tables. Écriture admin (`app_roles`, `training_config`) vérifiée via `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'` — **`app_metadata` et non `user_metadata`**, car ce dernier est modifiable côté client
- **Auth e-mail + mot de passe** (Supabase Auth) :
  - `login.html` : page de connexion (email + password, redirect par rôle après authentification)
  - `shared/auth.js` : `AUTH.guard({ loginUrl, role, panel })` — overlay spinner, vérif session, vérif rôle (`role`), vérif panneau (`panel`, via table `app_roles`), badge utilisateur
  - Rôles : entièrement personnalisables via **Gestion Comptes** (table `app_roles`) — `admin`, `mcd`, `floor` sont les seeds par défaut, mais tout rôle custom (slug, label, couleur, panels) peut être créé/édité/supprimé
  - Rôle stocké dans `auth.users.raw_app_meta_data.role` (source de vérité, non falsifiable) — `raw_user_meta_data.role` conservé en fallback pendant la période de migration
  - **Permissions par panneau** : `app_roles.panels` (jsonb) liste les panneaux autorisés pour ce rôle. Panneaux hiérarchiques : `tournois` (parent) → `prize-pool`, `leaderboard`, `admin-tournois` (enfants) ; `training` (parent, pas d'enfants pour l'instant). `AUTH.guard({ panel: 'x' })` redirige vers `index.html` si non autorisé — **les admins passent toujours**. Cache `_rolePanelsCache` (module-level dans auth.js) évite les requêtes répétées ; `AUTH.clearRolesCache()` invalide après modification d'un rôle
  - Gestion des comptes : `admin/comptes.html` — CRUD comptes (email+password+role) + CRUD rôles (label, couleur, panels) + table croisée permissions
  - **CRUD comptes via Edge Function** (`supabase/functions/manage-users/index.ts`) : le service_role key ne doit jamais être exposée côté client, donc toute création/édition/suppression de compte passe par cette fonction Deno qui vérifie le JWT appelant et son rôle admin côté serveur avant d'utiliser `auth.admin.*`
  - Changement de mot de passe : modal 🔑 dans le badge utilisateur (`AUTH._openChangePwd()`)
  - Persistance session : JWT 7 jours (604800s) via localStorage (géré par supabase-js)
- localStorage pour la persistance des configs déclaration/courriers/émargements hebdo (`extras_cfg`, `extras_emarg_YYYY_WW`, `decl_*`, `courriers_tpl`)

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
4. Mettre à jour `CONTEXT.md` et `README.md` pour refléter les changements
5. Push de la branche : `git push -u origin feature/nom-feature`
6. **Ouvrir une PR** `feature/nom-feature → develop` sur GitHub
7. **NE PAS merger** — annoncer la PR au user et attendre sa validation
8. Ajuster si nécessaire, puis merger une fois le user satisfait

**Flux release (develop → main) :**
1. Mettre à jour `shared/changelog.js` : ajouter l'entrée `{ version, date, message }` en tête du tableau
2. Vérifier que `CONTEXT.md` et `README.md` sont à jour
3. Push `develop`, ouvrir une PR `develop → main` sur GitHub
4. Attendre validation du user, puis merger la PR **sans `--subject`** (le message "Merge pull request #XX from Fideliuss/develop" doit rester intact)
5. Taguer le merge commit (tag léger — hérite du "Verified" GitHub) :
   ```
   git checkout main && git pull
   git tag vX.Y.Z <sha>
   git push origin vX.Y.Z
   ```

> **Règle absolue :** aucun commit direct sur `main`. Tout passe par une PR. Le tag se pose sur le merge commit, jamais sur un commit séparé.
> **Tags légers** (`git tag` sans `-a`) : pointent directement sur le merge commit signé par GitHub → badge "Verified" automatique. Ne pas utiliser `-a`.

---

## Bugs corrigés (historique)

| # | Fichier | Correction |
|---|---------|------------|
| 1 | leaderboard.js | `threeColsOf()` — `indexOf` sur sous-tableau remplacé par offset+index local |
| 2 | prize_pool.js | `result[1]` undefined quand `spots===1` — guard ajouté |
| 3 | leaderboard.js | Apostrophes dans les `onclick` — helper `esc()` avec `\x27` |
| 4 | leaderboard.js | IDs `Date.now()` — remplacé par compteur `nextId()` |
| 5 | leaderboard.js | `showDirectoryPicker` — erreurs surfacées à l'utilisateur au lieu d'être avalées |
| 6 | barriere.css | Bouton thème jour/nuit masqué à l'impression (`@media print`) |
| 7 | declaration.css | Fond beige en mode jour à l'impression — `body` et `.app` passés en `!important` dans `@media print` |
| 8 | csv-import.html | Sélection fichier silencieuse — `<div onclick="input.click()">` remplacé par `<label for="...">` natif *(fichier supprimé depuis, migration terminée)* |
| 9 | csv-import.html | Preview ne s'affichait pas — `style.display = ''` ne surcharge pas `display:none` CSS → corrigé en `style.display = 'block'` *(fichier supprimé depuis)* |
| 10 | leaderboard.css | Modal scroll figé — `overflow-y:auto` sur l'overlay `position:fixed` bloqué par Chrome → déplacé sur `.modal` avec `max-height: calc(100vh - 80px)` |
| 11 | leaderboard.js | Impression classement en ordre ligne — CSS Grid (ordre lignes) remplacé par CSS `columns` (ordre colonnes) |
| 12 | roulette_tapis.js | Positionnement chips par formules de grille (`ZERO_W` + % colonnes) fragile aux changements de CSS → remplacé par `getBoundingClientRect()` sur les cellules `[data-num]` réellement rendues |
| 13 | roulette_tapis.js | Carré 0-1-2-3 positionné au centre vertical de la colonne 0 (chevauchait le plein) → repositionné au coin supérieur (bord 0/col1 × bord supérieur du tapis), conforme à la vraie position casino |

---

## Fonctionnalités implémentées

### Prize Pool Builder
- Sélection du tournoi via le semainier (jour de semaine) ou presets configurables
- PP et Frais définis par tournoi ; Buy-in = PP + Frais (calculé automatiquement, readonly)
- Répartition manuelle des gains : constructeur interactif avec indicateurs live et hints
- Suggestion géométrique automatique ajustable
- Bandeau récap : brut / rake / prize pool net / cagnotte
- 12% des joueurs payés (ajustable manuellement)
- Impression du tableau

### Administration Tournois
**Config Tournois** — semainier CRUD (cartes édition/suppression par jour + section événements), formulaire nom/jour/PP/frais/buy-in auto + barème de points éditable slot par slot.

**Déclaration DTPJ**
- Tableau mensuel généré automatiquement depuis une config par jour de semaine (lun–dim)
- Impression A4 paysage : seuls tableau + annexes visibles, tient sur 1 page
- Annexes Prize Pool indépendantes et éditables (joueurs, cave, répartition % à 10 places)
- Tournois ad-hoc : ajout d'un tournoi exceptionnel pour le mois en cours, trié chronologiquement
- Gestion ponctuelle : annuler ou modifier un tournoi sur un jour précis (restaurable)
- Persistance localStorage (`decl_cfg`, `decl_staff`, `decl_annexes`, `decl_adhoc_Y_M`, `decl_exc_Y_M`)

**Courriers mensuels**
- Génération des 3 courriers officiels : Ministre de l'Intérieur, SIPJ 33, Préfecture de la Gironde
- Lit la même config localStorage que la Déclaration DTPJ — aucune saisie supplémentaire
- Mise en page A4 portrait stricte (1 page), style administratif français
- Date courrier auto-calculée à J-21 du début du mois déclaré
- Triangle des destinataires : chaque courrier liste les 2 autres destinataires
- Accessible uniquement depuis declaration.html (bouton "✉ Courriers") — non listé dans le hub

**Déclaration Extras**
- Liste des croupiers extras avec infos personnelles CRUD (nom, prénom, date/lieu naissance, adresse)
- **Déclaration mensuelle** : tableau officiel imprimable A4 paysage
- **Émargement hebdomadaire** : grille imprimable A4 paysage, sélecteur `<input type="week">`
  - Cochage des jours travaillés → heure auto (20:55 semaine, 16:55 dimanche, configurables)
  - Overrides d'horaires ad-hoc : par colonne (jour) et par cellule (extra × jour)
- Persistance : liste extras dans Supabase ; config horaire et émargements hebdo dans localStorage

### Challenge Saisonnier (Leaderboard)
- Classement en temps réel avec podium visuel (top 3 + colonnes 4-30 + 31-150+)
- Saisie des résultats par tournoi (semainier + places standards + places supplémentaires)
- **Blocage doublon** : validation impossible si même tournoi + même date déjà saisi
- **Historique vue calendrier** : grille mensuelle 7 colonnes, mois les plus récents en premier, édition inline
- Gestion des tournois (CRUD complet + barèmes de points) — désormais via Administration Tournois
- **Document ranking imprimable** (A4 portrait, encadré doré, typographie Cormorant Garamond)
- **Impression classement one-page** (A4 portrait, podium 3 marches, coupure stricte à 150)
- Fiche joueur détaillée (modal)
- Données sauvegardées dans Supabase

### Gestion Comptes
- CRUD comptes (email + mot de passe + rôle) via Edge Function sécurisée
- CRUD rôles personnalisés : label, couleur (nuancier), liste de panneaux autorisés
- Panneaux hiérarchiques dans le formulaire d'édition de rôle : cocher un parent affiche ses enfants (ex : "Outils Tournois" → Prize Pool / Leaderboard / Administration Tournois)
- Table croisée permissions (rôles × panneaux) avec renommage inline
- Stats par rôle (nombre de comptes)

### Training Croupier

**Architecture partagée** : `training.css` (cartes de jeu, sélecteur de niveau, zone de réponse, barre de feedback) commune à tous les modules. Chaque hub (`blackjack_hub.html`, `roulette_hub.html`) a sa propre modal de config admin persistée dans `training_config`.

**Blackjack**
- BJ Paiement : calcul du paiement selon la mise, plages de mise pondérées configurables (poids relatifs par tranche), timer par niveau
- BJ Score : entraînement calcul de score de main. `generateHand(level)` tire un nombre de cartes dépendant du niveau (configurable) : min/max cartes + seuil d'arrêt (règle banque `<17` ou règle client `<20`) par niveau — défauts Facile 2-3 cartes (banque), Médium 3-5 cartes (banque), Expert 4-max cartes (client, jusqu'à ~30 au bust). Le bust reste toujours prioritaire sur le minimum de cartes (une main qui dépasse 21 s'arrête immédiatement) et un blackjack naturel (2 cartes) reste à 2 cartes quel que soit le niveau

**Roulette Anglaise** — composant tapis partagé (`roulette_tapis.js`) : grille CSS (0 en 1.3fr + colonnes 1fr), cellules `[data-num="N"]`, mode miroir optionnel (symétrie centrale à 180° : colonnes ET rangées inversées, confirmé par photos de la vraie table — la rangée proche du bord/labels devient la rangée proche du 0), séparateurs de douzaine.
- **Calcul Paiement** :
  - Un seul numéro gagnant tiré par question ; toutes les mises générées le couvrent
  - Génération par pool de positions valides (`buildBetPool`) : pour un numéro donné, liste TOUTES les mises possibles (plein, chevaux, transversale, carrés, sixains, + variantes incluant le 0) puis sélection pondérée sans remise par position (`weightedPickPool`) — permet plusieurs mises du même type à des positions différentes dans une même question (ex: 2 chevaux)
  - Positionnement des chips **par le DOM réel** (`chipPosFromDOM`, `getBoundingClientRect()` sur les cellules `[data-num]`) plutôt que par formule de grille — robuste à tout changement de CSS. Règles de position : plein = centre cellule ; cheval = bord partagé ; transversale/sixain = bord supérieur du groupe ; carré = intersection des 4 cellules ; carré 0-1-2-3 = coin supérieur (bord 0/col1 × bord supérieur, cas spécial car le 0 occupe toute la hauteur de colonne)
  - Chips en couleur neutre pendant la question (classe `.rp-chip-overlay:not(.rp-revealed) .rt-chip`) ; en cas d'erreur, classe `rp-revealed` ajoutée → couleurs par type révélées + badges de feedback **groupés par type de mise** (cumul pièces/gain si plusieurs mises du même type)
- **Conversion Pièces** : valeur de pièce fixée par session, avance manuelle, valeurs configurables (2€ / 2.5€ / 5€ / 10€ / 20€ / 50€, cochables dans la config admin). Le nombre de pièces à convertir n'est plus un tirage arbitraire (1-50) : `generateBet(level)` (`roulette_tapis.js`) génère une vraie mise pondérée par niveau (type + pièces plafonnées comme dans Calcul Paiement) et son `payout` réel devient le nombre de pièces affiché — montants réalistes (5 à 700+ selon le niveau), type de mise sous-jacent gardé caché (pas affiché, juste tracé dans le `scenario` persisté pour traçabilité)
- **Pointage Numéro** : orientation aléatoire du tapis (miroir gauche/droite déterminé par le 0), numéros masqués pendant la question puis révélés
- **Couleur Numéro** : identification rouge/noir/vert, timer par niveau
- **Tables de multiplication** : vraies flashcards (carte 3D qui se retourne, `.tb-card.flipped`), sans tapis, sans niveau. Choix de la table (×35/×17/×11/×8/×5) puis 20 cartes = les 20 multiplications ×1 à ×20 mélangées (Fisher-Yates), chacune une seule fois. Pas de timer par question — un **chronomètre libre** tourne du début à la fin des 20 cartes (objectif : aller vite), affiché en direct et repris dans le résumé final. Taper la réponse retourne la carte pour révéler le résultat coloré (vert/rouge)
- **Paiement Mixte** : répartition d'un paiement entre pièces (valeur de jeu, 2.5/5/10/20/50€) et plaques (8 dénominations 2.5→1000€). 3 types d'exercice au choix (écran dédié avant le niveau) :
  - *Montant rond* : le client demande P€ en plaques (multiple de la valeur pièce) → trouver les pièces restantes (réponse unique, 1 champ)
  - *Garde des pièces* : le client garde K pièces → décomposer le reste en plaques (grille de 8 champs, un par dénomination) — **toute décomposition valide est acceptée**, pas de décomposition canonique unique imposée (validation par simple reconstitution du montant, pas d'algorithme glouton)
  - *Mix libre* : le croupier propose librement plaques (€) + pièces restantes (2 champs) — validation par réconciliation `plaques + pièces×valeur == total`
  - Niveau (Facile/Médium/Expert) fait varier la plage du nombre de pièces (`MIX_N_RANGES`) et le timer (unique, commun aux 3 types, configurable admin) ; le type de mise n'est jamais affiché, seuls les chiffres bruts (N pièces, valeur, montant/pièces demandés) sont donnés au croupier — il doit calculer les valeurs intermédiaires lui-même
- **Ordre Paiement** : non implémenté — carte "Bientôt disponible" dans le hub

Sessions et résultats persistés dans `training_sessions` / `training_results` (Supabase), un enregistrement par question avec `scenario` (jsonb), réponse correcte/donnée, `is_correct`.

---

## Conventions de code

- Noms de fichiers/dossiers : **underscore** `_`, jamais de tiret (`prize_pool`, `roulette_paiement`, `admin_tournois`)
- Noms de fonctions : camelCase, verbe + sujet (`renderClassement`, `validateTournament`)
- IDs HTML : kebab-case (`hist-body`, `rp-chip-overlay`)
- Classes CSS : kebab-case, préfixe par composant (`rt-chip`, `rp-badge-*`, `sem-day`)
- Apostrophes dans les onclick : toujours passer par `esc(s)` → `s.replace(/'/g,"\\x27")`
- IDs d'entrées leaderboard/tournois : générés côté serveur ou `slug + Date.now()` — ne pas passer `id` dans les inserts quand la DB le génère
- Noms de joueurs : stockés et comparés en MAJUSCULES, affichés via `cap()`
- Pas de bundler, pas de npm — zéro dépendance locale

---

## À savoir pour la prochaine session

- **Toujours mettre à jour `CONTEXT.md` et `README.md` avant de créer une PR et de merger** — sans attendre que l'utilisateur le demande
- On travaille toujours sur `develop`, jamais sur `main` directement ; toute PR `feature → develop` s'arrête après ouverture et attend validation utilisateur avant merge (idem pour `develop → main`)
- Tester avec Chrome ou Edge
- Toutes les données (tournois, leaderboard, extras, comptes, rôles, training) sont dans **Supabase** (cloud) — synchronisées automatiquement, aucune config locale requise
- `shared/changelog.js` est mis à jour manuellement **avant chaque PR de release** (develop → main), pas à chaque feature
- La vérification de rôle admin (RLS + Edge Function) se fait via `app_metadata`, **jamais** `user_metadata` (modifiable côté client) — cf. `fix_rls_app_metadata.sql`
- Les rôles sont dynamiques (table `app_roles`) : ne pas coder en dur une liste fixe admin/mcd/floor dans une nouvelle feature, toujours passer par `SB.getRoles()` / `AUTH.guard({panel: ...})`
- `AUTH.guard({ panel })` : les admins passent toujours, peu importe la config de panels
- **Bug corrigé (2026-07) : sous-pages avec `role:'admin'` en dur sous un hub gardé par `panel`** — `admin_tournois.html` vérifie `panel:'admin-tournois'`, mais ses 4 sous-pages (`extras.html`, `declaration.html`, `courriers.html`, `config_tournois.html`) vérifiaient `role:'admin'` codé en dur (reliquat d'avant le système de panels), donc un MCD avec le panel accordé voyait la tuile mais se faisait rejeter en cliquant dessus. **Toute nouvelle page ajoutée sous un hub gardé par panel doit reprendre le même `panel:` dans son propre guard, jamais un `role:` fixe**, sauf si la page doit rester délibérément admin-only (comme `comptes.html`)
- `training/roulette/roulette_tapis.js` est partagé par TOUS les modules roulette qui affichent un tapis (Paiement, Pointage, Couleur) — toute modif de `renderTapis`, `renderChips`, `buildBetPool` les impacte tous. Conversion et Tables de multiplication ne l'utilisent pas (pas de tapis)
- `training/` est organisé en sous-dossiers par jeu (`blackjack/`, `roulette/`) depuis juillet 2026 — seuls `training.html` et `training.css` restent à la racine (partagés). Prévoir `resultats/` (Phase 3) et `uth/` (Phase 4) sur le même modèle
- Positionnement des chips roulette : approche **DOM-based** (`getBoundingClientRect`), pas de formule de grille — voir `chipPosFromDOM` dans `roulette_tapis.js`
- Transitions de page (fade in/out) gérées dans `shared/barriere.js` — classe `is-leaving` sur `<body>`
- Lien `.back` est `position:fixed` top-left sur toutes les pages
- L'impression utilise `injectPageStyle()` pour injecter dynamiquement `@page` (portrait ou paysage) avant `window.print()`, puis nettoie avec un setTimeout
- Les semaines utilisent la numérotation ISO (lun=1er jour, `getMondayOfISOWeek`)
- Le schéma Supabase doit être créé manuellement via le SQL Editor de Supabase avant le premier usage d'une nouvelle table (migrations dans `supabase/migrations/` = documentation/historique, pas d'auto-apply)
- **Supabase RLS** : toute modification du RLS doit utiliser un bloc `DO $$ ... $$` pour dropper les policies existantes par nom dynamique (les noms varient), ou `DROP POLICY IF EXISTS "nom" ON table` si le nom est connu
- **Auth guard pattern** : chaque page protégée charge `shared/supabase.js` + `shared/auth.js` via CDN supabase-js, puis appelle `AUTH.guard({ loginUrl, role, panel })` — l'overlay est injecté de façon synchrone pour éviter le flash de contenu
- Pour définir le rôle d'un utilisateur : passer par **Gestion Comptes** (jamais directement en base) — modifie `app_metadata` ET `user_metadata` via l'Edge Function
- `_tournamentsCache` (var privée dans `leaderboard.js`) mis à `null` après chaque upsert/delete de tournoi pour forcer un rechargement depuis Supabase
- Le modal joueur utilise `_closeModal()` (retire `modal-open` du body) et `body.modal-open { overflow: hidden }` pour bloquer le scroll de fond
- L'historique utilise une **vue calendrier** (grille 7 cols par mois), pas d'accordion
- Le document ranking utilise des classes CSS `rp-*` (pas d'inline styles) — attention : `rp-*` est aussi le préfixe utilisé dans `roulette_paiement.html` (`rp-chip-overlay`, `rp-bet-badge`...), ce sont deux composants différents qui partagent juste le préfixe par coïncidence
