# Contexte projet — Outils Tournois Barrière Casino Bordeaux

> Fichier à lire en début de session pour assurer la continuité.
> À mettre à jour avant de clore chaque session de travail (et avant toute PR).

---

## Projet

Application web interne pour le Barrière Casino Bordeaux, organisée en 3 panneaux : **Outils Tournois** (gestion des tournois de poker), **Training Croupier** (entraînement Blackjack + Roulette), **Gestion Comptes** (admin). Zéro serveur, zéro build — s'ouvre directement dans Chrome/Edge.

Conçue pour être **extensible au-delà des tournois** — architecture de panneaux/rôles pensée pour accueillir de futurs modules (Jeux de Tables au sens large).

**Repo GitHub :** https://github.com/Fideliuss/gestion-tournois (privé)
**Développeur :** B. Cuvelier (Fideliuss)
**Convention de nommage :** underscore `_` pour tous les fichiers et dossiers (`prize_pool`, `admin_tournois`, `roulette_paiement`), jamais de tiret.

**Charte graphique :** charte officielle Barrière Casino (redesign 2026-08). Palette de marque (Ambre/Châtaigne en accent principal, Cognac/Sauterne/Jean/Teal/Cobalt en accents d'accompagnement — voir `:root`/`body.light` dans `shared/barriere.css`), police Jost auto-hébergée (`shared/fonts/`, gras italique pour les titres, normal pour le reste, IBM Plex Mono conservé pour les données chiffrées), pictogrammes vectoriels de la charte extraits dans `shared/icons/` (masque CSS recolorable via `.tool-badge.picto` + `--icon`, remplace les emoji de badge).

---

## Roadmap phases

- **Phase 0** — Restructuration : hub multi-panneaux, rôles/permissions par panel, licence propriétaire. Livrée.
- **Phase 1** — Training Croupier : Blackjack (BJ Paiement, BJ Score). Livrée.
- **Phase 2** — Training Croupier : Roulette Anglaise (Couleur, Pointage, Conversion, Calcul Paiement). Livrée, taguée `v2.0.0` (2026-07-03).
- **Phase 3** — Suivi résultats : vue historique croupier (« Mes résultats ») + vue manager (« Suivi équipe »). Développée (étapes 1 à 3, mergées dans `develop` ou en PR), **release prévue à la fin de la phase** (pas avant).
- **Phase 4** — Ultimate Texas Hold'em : nouveau jeu complet (3 modules : Calcul des gains, Meilleure main, Qui gagne ?). **Livrée** — `v2.4.0` en prod le 2026-10-04 (PR de release #111, tag sur le commit de fusion 036a938) : moteur, hub, Meilleure main, Qui gagne ?, Calcul des gains et intégration au suivi.

**Stratégie de release** : itérative depuis Phase 2 (chaque phase peut donner lieu à sa propre release taguée), et non plus "tout accumulé sur develop jusqu'à la fin de la roadmap" comme prévu initialement.

---

## Architecture

```
index.html                    Accueil — 2 espaces (Outils Tournois / Training Croupier) ; Gestion Comptes n'a plus de tuile : elle est dans le menu « Gestion » de la barre (admin)
outils_tournois.html          Page Outils Tournois (Prize Pool, Leaderboard) — l'administration des tournois n'a plus de tuile ni de page intermédiaire : elle est dans la barre, sous « Administration tournois »
login.html                    Page de connexion (e-mail + mot de passe, charte graphique, redirect par rôle)

shared/
  barriere.css      Styles partagés (thème, composants communs, styles auth : #auth-overlay, #auth-badge, .auth-chip-*)
  barriere.js       Scripts partagés (toggle jour/nuit, favicon, transitions de page)
  tournaments.js    TOURNAMENT_DEFAULTS (fallback) + TournamentsStore (lecture/écriture Supabase, source de vérité)
  semainier.js      buildSemainier() — widget sélecteur de tournoi par jour, utilisé par prize_pool + leaderboard
  supabase.js       Client Supabase : mappers camelCase↔snake_case + objet SB (CRUD résultats/sessions/tournois/extras/app_roles/training + auth + Edge Function manage-users)
  nav.js / nav.css  Barre de navigation commune — injectée par AUTH.guard ; voir section « Navigation »
  auth.js           AUTH.guard({loginUrl, role, panel, nav}), AUTH.signOut(), AUTH._addBadge(), AUTH.clearRolesCache() — chargé après supabase.js
  changelog.js      Mis à jour manuellement avant chaque PR de release (var CHANGELOG[])
  fonts/            Jost auto-hébergée (variable, normal + italique) — @font-face déclaré dans barriere.css
  icons/            Pictogrammes vectoriels de la charte, extraits en PNG à masque alpha (recolorables via CSS mask)
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
  config_tournois.html  CRUD tournois — semainier par jour, barème de points, guard panel:'admin-tournois'
  config_training.html/.js/.css  Configuration des modules (admin) — réglages de tous les modules de training, un onglet par jeu
  comptes.html/.css/.js  Gestion des comptes — onglets Comptes (liste filtrable) et Rôles & accès (matrice des accès), guard role:'admin' (intentionnellement admin-only, pas de panel)
  declaration/
    declaration.html  Déclaration mensuelle PN, guard panel:'admin-tournois'
    declaration.css / declaration.js
    courriers.html    Générateur de courrier — accessible uniquement par le menu « Administration tournois » de la barre (plus de bouton dans Déclaration DTPJ), guard panel:'admin-tournois'
    courriers.css / courriers.js
  extras/
    extras.html   Déclaration extras & émargement, guard panel:'admin-tournois'
    extras.css / extras.js

training/
  training.html          Page Training Croupier : tous les modules sur une seule page, groupés par jeu (ancres #blackjack, #roulette, #uth, #suivi) — il n'y a plus de page de jeu (hubs supprimés en octobre 2026)
  training.css            Styles partagés training (level-card, game-card, answer-zone, feedback-bar)
  suivi/                  Phase 3 — Suivi résultats (voir section Suivi résultats)
    suivi_croupier.html/.js  « Mes résultats » : historique, record, tendance de l'utilisateur connecté, guard panel:'training'
    suivi_manager.html/.js   « Suivi équipe » : classement, progression, points faibles, activité — guard panel:'training-suivi'
    suivi_common.js          Modules suivis (SV_FAMILIES / SV_MODULES), niveaux, calculs et blocs d'affichage partagés (précision, tendance, meilleurs temps, svEsc) — utilisé par les deux vues
    suivi.css                Styles des pages de suivi (.sv-*)
  uth/                    Phase 4 — Ultimate Texas Hold'em
    uth_engine.js            Moteur pur (sans DOM) : paquet, meilleure main de 5 parmi 7, comparaison, qualification de la banque, règlement d'une donne (Ante/Blind/Play/Trips/JP1), générateurs de donnes ciblées
    uth_main.html/.js        Module Meilleure main (clé de session `uth-main`)
    uth_gagnant.html/.js     Module Qui gagne ? (clé de session `uth-gagnant`)
    uth_gains.html/.js       Module Calcul des gains (clé de session `uth-gains`)
    uth_ui.js                Affichage des cartes partagé (réutilise .playing-card de training.css ; surligne les 5 cartes de la meilleure main)
    uth.css                  Styles des modules UTH (table, grille de réponses, états juste/faux)
    uth_engine.test.js       Tests Node (`node training/uth/uth_engine.test.js`, ~50 s) — à relancer après toute modification du moteur ou des tables
  blackjack/
    blackjack.html / .js    BJ Paiement
    blackjack_score.html / .js  BJ Score
  roulette/
    roulette.css            Styles partagés tapis + chips + badges (tous modules roulette)
    roulette_tapis.js       Composant partagé : renderTapis(), génération de mises (buildBetPool/weightedPickPool), positionnement DOM des chips (chipPosFromDOM), renderChips()
    roulette_paiement.html / .js    Calcul Paiement
    roulette_conversion.html / .js  Conversion Pièces
    roulette_pointage.html / .js    Pointage Numéro
    roulette_couleur.html / .js     Couleur Numéro
    roulette_tables.html / .js      Tables de multiplication (flashcard ×35/×17/×11/×8/×5)

supabase/
  functions/manage-users/index.ts   Edge Function Deno — CRUD comptes, vérif admin via app_metadata côté serveur
  migrations/
    training_tables.sql              training_config, training_sessions, training_results (+ RLS)
    fix_rls_app_metadata.sql         Migration policies user_metadata → app_metadata (rôle non falsifiable client-side)
    add_blackjack_cards_config.sql   Ajoute la clé "cards" (nb cartes/niveau BJ Score) au training_config existant
    phase3_suivi_meta_et_acces_manager.sql  Phase 3 : training_sessions.meta (jsonb) + user_label, fonction can_view_training_stats(), policies de lecture manager (appliquée sur la base le 2026-10-04)
    phase4_uth_config_initiale.sql          Phase 4 : ligne `training_config` clé `uth` = `{"gains":{"max_bet":50}}` (appliquée sur la base le 2026-10-04)
    phase4_suivi_uth.sql                    Phase 4 : training_weak_points étendue aux 3 modules UTH (appliquée sur la base le 2026-10-04)
    phase3_suivi_fonctions_manager.sql      Phase 3 : fonctions d'agrégat de la vue manager (training_ranking, training_tables_best, training_weak_points, training_activity, training_activity_weekly) — appliquée le 2026-10-04
```

**Règle de séparation :** chaque fichier HTML ne contient que la structure + les balises `<link>` et `<script>`. Tout le CSS et le JS sont externalisés dans leurs fichiers dédiés (sauf styles/scripts très courts spécifiques à une page, tolérés inline dans un `<style>`/`<script>` de tête).

**Composants CSS partagés (ripolinage juillet 2026)** — training/ avait dérivé stylistiquement de l'app générale (réimplémentation parallèle des cartes de nav, modals dupliquées 3×, styles inline trop longs). Centralisés :
- `.modal-overlay`/`.modal-box`/`.modal-wide` (avec coins dorés) → `shared/barriere.css`, utilisé par `admin/comptes.html`, avec la correction du `transform` permanent sur `body` (voir historique des bugs n°14). Les modals plus larges utilisent un override scoped (`#modal-cfg .modal-box { max-width: ... }`) plutôt que de dupliquer le composant.
- `.seg` / `.seg-btn` (+ `.seg.sm`, `.seg-n`) → **pastille segmentée, composant unique des onglets de page** (`barriere.css`) : compacte et centrée, coins très arrondis, actif en ambre plein (`.active`, `.on` ou `aria-selected="true"`), défile horizontalement si trop large, masquée à l'impression, **sans emoji**. Utilisée par Classement (leaderboard), Gestion des Extras, Déclaration DTPJ, Générateur de courrier (type de document, lettre, sous-onglets des destinataires), Suivi des résultats (onglets par jeu et par vue) et Config Training. Pour un nouvel onglet : ajouter `seg` au conteneur et `seg-btn` aux boutons ; les classes propres à la page (`.tab`, `.xt-tab`…) ne servent qu'aux scripts. Les filtres (`.sv-chip` du suivi) gardent leur propre style, plus discret.
- `.tool-card`/`.tool-badge`/`.tool-name` (cartes de navigation, avec `--accent` par carte : rectangles très arrondis 300×92 px, toutes de même taille, picto à gauche et nom centré, liseret de couleur sur le bord gauche, encoche sur le bord droit, sombres en mode nuit et crème en mode jour, sans bouton) → seul composant de nav card dans toute l'app, y compris les hubs training (`training.html`, `blackjack_hub.html`, `roulette_hub.html`). Étendu avec `.tool-card.disabled` + `.tool-soon` pour les cartes "bientôt disponible". **Ne plus créer de variante `.game-card` ou équivalent** — toujours réutiliser `.tool-card`.
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
  - **Permissions par panneau** : `app_roles.panels` (jsonb) liste les panneaux autorisés pour ce rôle. Panneaux hiérarchiques : `tournois` (parent) → `prize-pool`, `leaderboard`, `admin-tournois` (enfants) ; `training` (parent) → `training-suivi` (enfant : voir les résultats de toute l'équipe, utilisé par la RLS via `can_view_training_stats()`). `AUTH.guard({ panel: 'x' })` redirige vers `index.html` si non autorisé — **les admins passent toujours**. Cache `_rolePanelsCache` (module-level dans auth.js) évite les requêtes répétées ; `AUTH.clearRolesCache()` invalide après modification d'un rôle
  - Gestion des comptes : `admin/comptes.html` — CRUD comptes (email+password+role) + CRUD rôles (label, couleur) + matrice des accès rôles × pages
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
| 14 | barriere.css | Modaux collés en haut du document après défilement (toutes les pages) — l'animation d'entrée de `body` en `animation-fill-mode: both` laissait un `transform` permanent sur `body`, qui devient le repère des éléments `position:fixed` → `backwards` |

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

### Administration tournois
Pages regroupées dans le menu **Administration tournois** de la barre (panel `admin-tournois`) : **Déclaration DTPJ**, **Générateur de courrier**, **Gestion des Extras**, **Calendrier & barèmes** (fichiers `declaration.html`, `courriers.html`, `extras.html`, `config_tournois.html` : les noms de fichiers n'ont pas changé, seuls les libellés).

**Calendrier & barèmes** (`config_tournois.html`) — semainier CRUD (cartes édition/suppression par jour + section événements), formulaire nom/jour/PP/frais/buy-in auto + barème de points éditable slot par slot.

**Déclaration DTPJ**
- Tableau mensuel généré automatiquement depuis une config par jour de semaine (lun–dim)
- Impression A4 paysage : seuls tableau + annexes visibles, tient sur 1 page
- Annexes Prize Pool indépendantes et éditables (joueurs, cave, répartition % à 10 places)
- Tournois ad-hoc : ajout d'un tournoi exceptionnel pour le mois en cours, trié chronologiquement
- Gestion ponctuelle : annuler ou modifier un tournoi sur un jour précis (restaurable)
- Persistance localStorage (`decl_cfg`, `decl_staff`, `decl_annexes`, `decl_adhoc_Y_M`, `decl_exc_Y_M`)

**Générateur de courrier** (courriers mensuels)
- Génération des 3 courriers officiels : Ministre de l'Intérieur, SIPJ 33, Préfecture de la Gironde
- Lit la même config localStorage que la Déclaration DTPJ — aucune saisie supplémentaire
- Mise en page A4 portrait stricte (1 page), style administratif français
- Date courrier auto-calculée à J-21 du début du mois déclaré
- Triangle des destinataires : chaque courrier liste les 2 autres destinataires
- Accessible uniquement par le menu « Administration tournois » de la barre

**Gestion des Extras**
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
- Gestion des tournois (CRUD complet + barèmes de points) — désormais via Administration tournois → Calendrier & barèmes
- **Document ranking imprimable** (A4 portrait, encadré doré, typographie Cormorant Garamond)
- **Impression classement one-page** (A4 portrait, podium 3 marches, coupure stricte à 150)
- Fiche joueur détaillée (modal)
- Données sauvegardées dans Supabase
- **Saisons** (octobre 2026) : la saison se **déduit de la date** (1er nov → 31 oct ; clé = année de début, `2025` = saison 2025 / 2026) — aucune colonne dans `results` / `sessions`, la saison suivante démarre toute seule avec le premier résultat daté du 1er novembre. Points et cagnotte repartent donc de 0. Le classement, l'historique, le ranking et les impressions ne montrent que la **saison affichée** (`_season` dans `leaderboard.js`) ; le sélecteur (pastille à gauche de la ligne d'onglets, avec « En cours / Terminée / Clôturée ») liste les saisons qui ont des sessions. Les anciennes saisons restent consultables ; les textes « 2025 / 2026 » ne sont plus en dur. Le contrôle de doublon porte sur toutes les saisons.
- **Clôture / verrouillage** : un admin voit, en petit sous le sélecteur de saison, « Clôturer la saison » (résumé : joueurs, tournois, ranking, podium, impression du classement final) puis « Rouvrir la saison ». Table `saisons_cloturees` (migration `saisons_cloturees.sql`, lecture pour tous, écriture admin) + triggers `trg_results_saison_cloturee` / `trg_sessions_saison_cloturee` : **toute insertion, modification ou suppression** de résultat ou de session dont la date est dans une saison clôturée est refusée en base (y compris via l'API ; fonction `saison_de(date)`). L'interface suit : historique en lecture seule, saisie bloquée avec message. Si la table est absente, aucune saison n'est verrouillée (le challenge reste utilisable). Une saison clôturée affiche « Classement final au <date de clôture> ».
- **Barre de la page** (plus de sous-titre sous « Challenge Saisonnier » : la saison est dans le sélecteur) : saison à gauche · onglets Classement / Historique / Ranking au centre · bouton **« ＋ Saisir »** à part, à droite (même page, simple onglet : `showTab('saisir')`, onglets repérés par `data-tab`).

### Gestion des comptes (`admin/comptes.html` / `.css` / `.js`)
Deux onglets (pastille `.seg`, hash `#comptes` / `#roles`) ; l'action principale à droite (`.btn-pill`) suit l'onglet : « Nouveau compte » ou « Nouveau rôle ». Barre `.page-bar` partagée avec le Classement.
- **Comptes** (octobre 2026 : ~30 comptes) : liste unique, recherche (e-mail ou rôle), filtres en pastilles `.fchip` — Tous, un par rôle ayant des comptes (avec leur nombre), **Inactifs** (jamais connecté ou aucune connexion depuis plus de 60 jours, `INACTIVE_DAYS`) —, tri par colonne (Compte, Rôle, Dernière connexion ; la dernière connexion est affichée en relatif avec la date exacte en infobulle), bouton **« Grouper par rôle »** (mémorisé dans `localStorage` `cp_group`, colonne Rôle masquée dans ce mode). Modifier / supprimer par ligne (clics délégués, pas de `onclick` avec e-mail). Le filtre de rôle en cours est la valeur par défaut d'un nouveau compte. Sur mobile : une carte par compte.
- **Rôles & accès** : matrice rôles × pages en deux niveaux (espace Outils Tournois : Espace, Prize Pool, Leaderboard, Admin. tournois ; espace Training Croupier : Espace, Suivi équipe). Les cases se modifient en brouillon (`_draft`), rien n'est envoyé avant **« Enregistrer les accès »** (seuls les rôles modifiés sont envoyés) ; « Annuler les modifications » le vide. Une page n'est cochable que si son espace l'est (décocher un espace décoche ses pages). La ligne Admin affiche « Accès total ». L'engrenage d'une ligne ouvre la modale du rôle (**nom, couleur, suppression** ; les accès ne s'y règlent plus). **Suppression d'un rôle refusée tant que des comptes l'ont.** Créer un rôle amène directement sur cet onglet pour lui donner ses accès.
- L'ancienne modale « Gestion des rôles » (tableau jamais ouvert depuis l'interface et dont les colonnes ne correspondaient plus aux panneaux) est supprimée.
- Composants partagés ajoutés à `barriere.css` : `.page-bar` (+ `-l`, `-r`), `.btn-pill`, `.fchips` / `.fchip` / `.fchip-n` / `.fchip-dot`. Le suivi (`.sv-chip`) pourra les adopter lors du balayage visuel.

### Training Croupier

**Architecture partagée** : `training.css` (cartes de jeu, sélecteur de niveau, zone de réponse, barre de feedback) commune à tous les modules. La configuration des modules (persistée dans `training_config`) se règle dans **une seule page admin, `admin/config_training.html`** (menu Gestion → Training → Configuration des modules) : un onglet par jeu (Black Jack : plages de mises, chronomètres par niveau, nombre de cartes par niveau ; Roulette : chronomètres par module et valeurs de pièces ; Ultimate : montant maximum des mises du Calcul des gains), hash `#blackjack` / `#roulette` / `#uth`, un enregistrement par jeu, validation claire avant envoi (rien n'est envoyé si une valeur est invalide). Les anciennes modales des hubs ont été supprimées.

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
- **Ordre Paiement** : non implémenté — carte "Bientôt disponible" sur la page Training

Sessions et résultats persistés dans `training_sessions` / `training_results` (Supabase), un enregistrement par question avec `scenario` (jsonb), réponse correcte/donnée, `is_correct`. Chaque session porte `meta` (jsonb : `level`, `ratio`, `chipValue`, `elapsedMs` selon le module — écrit par `SB.startTrainingSession(game, meta)` / `endTrainingSession(..., meta)`) et `user_label` (préfixe e-mail dénormalisé, car `auth.users` est illisible côté navigateur). Un croupier ne lit que ses lignes (`*_own`) ; les rôles avec le panel `training-suivi` (et les admins) lisent tout (`*_manager_read`).

### Ultimate Texas Hold'em (Phase 4)

- **Règles appliquées** : réglementation des jeux, telle que fournie par l'utilisateur. Ante et Blind égaux ; Trips optionnel ; Play 3× ou 4× l'Ante avant le flop (`pre3`/`pre4`), 2× au flop, 1× à la river, ou couché (`fold`). **Vocabulaire : on dit « la banque », jamais « le croupier » pour la main adverse — le croupier ne joue pas, c'est la banque qui a une main** (textes du moteur, des modules et de la doc). La banque est qualifiée à partir d'une paire. Joueur gagnant : Ante et Play payés 1 pour 1, Blind payé selon la table à partir de la quinte (rendu en dessous). Banque gagnante : Ante, Play et Blind perdus. Égalité : tout est rendu. **Banque non qualifiée : l'Ante est rendu, Play et Blind jouent.** Couché : Ante et Blind perdus.
- **Tables** (dans `DEFAULT_CONFIG` du moteur, surchargeables par `training_config` clé `uth`) — Blind : quinte flush royale 500, quinte flush 50, carré 10, full 3, couleur 3 pour 2, quinte 1. Trips : 50, 40, 30, 8, 7, 4, brelan 3. JP1 : full 10, carré 100, quinte flush 300, quinte flush royale « communautaire » (le board seul) 1000 ; la quinte flush royale du joueur paie **100 % du jackpot** (montant variable, validé par le superviseur après vidéo, donc non calculable : le moteur renvoie `result: 'jackpot'`) ; lot de consolation 100 pour 1 pour tous les joueurs JP1 quand un autre joueur reçoit la quinte flush royale.
- **Hypothèses à connaître** : « X pour 1 » est lu comme un gain de X fois la mise, la mise étant rendue (comme « 35 pour 1 » à la roulette). Trips est évalué sur les 7 cartes du joueur, indépendamment du résultat contre le croupier, y compris s'il se couche (la réglementation fournie ne le détaille pas : à confirmer). Mise minimale 5 € à Bordeaux (donc couleur au Blind = 7,50 €, payable en pièces de 2,50 €). Le montant de la mise JP1 n'est pas encore connu.
- **Module Meilleure main** (`uth_main.*`, game `uth-main`) : **pas de niveaux et pas de chronomètre** — l'UTH est un jeu simple, à maîtriser en entier. La session démarre dès l'ouverture de la page. Comme à la table, le croupier voit toujours **7 cartes**, affichées comme dans « Qui gagne ? » (encadrés Joueur en quinconce et Board en cases flop · turn · river ; `uthPlayerZone`/`uthBoardZone` acceptent les 5 cartes de la meilleure main pour surligner celles-ci et atténuer les deux autres), et choisit la meilleure combinaison parmi 10 touches. Donnes au hasard : combinaisons pondérées (`UM_WEIGHTS`, les rares reviennent plus souvent qu'au hasard) et environ **35 % de pièges** (`UM_TRAP_SHARE`, `UTH.TRAPS` du moteur : roue A-2-3-4-5, couleur ET quinte, deux brelans, trois paires, carré + brelan, brelan + deux paires, quinte + paire, couleur + paire). Chaque piège vérifie que la situation décrite est réellement présente (`valid`) avant d'être affiché : l'explication montrée ne doit jamais contredire les cartes. Bonne réponse simple = enchaînement automatique ; erreur ou piège = bouton « Suivant » pour lire l'explication. Les 5 cartes de la meilleure main sont surlignées, les autres atténuées. `scenario` enregistré : `{cards, best, trap}` (pas de niveau, `meta` vide) ; `correct_answer`/`user_answer` = index de combinaison (0 carte haute … 9 quinte flush royale).
- **Module Qui gagne ?** (`uth_gagnant.*`, game `uth-gagnant`) : **pas de niveaux et pas de chronomètre** — l'UTH est un jeu simple, il doit être maîtrisé en entier, donc les donnes sont tirées au hasard, de tous types, et la session démarre dès l'ouverture de la page. **Pour chaque donne, le croupier annonce d'abord si la banque est qualifiée, puis qui gagne** (joueur / égalité / banque) ; la 2e question n'apparaît qu'après la 1re, et la donne n'est correcte que si les deux réponses le sont. Mise en page en trois encadrés qui épousent les cartes (largeur au plus juste via `fit-content`, centrés, filet fin et fond légèrement teinté, titre centré en couleur d'accent), de haut en bas : Joueur (deux cartes en quinconce), Board (une case par carte, séparées discrètement en flop · turn · river), Banque (deux cartes côte à côte) — composants `uthFrame`, `uthPlayerZone`, `uthBoardZone`, `uthBankZone` dans `uth_ui.js`. Les donnes viennent de `UTH.duelRound()` : mélange pondéré de cas nets (30 %), départages au kicker (25 %), banque non qualifiée (30 %) et égalités (15 %, souvent « les deux jouent le board »). `kind` peut être imposé (tests). Après la réponse : les deux meilleures mains de 5 cartes avec leur nom, et `UTH.explainCompare()` explique ce qui décide (« la paire décide — Roi contre Dame »). Cas net bien traité = enchaînement automatique ; sinon bouton « Suivant ». `scenario` enregistré : `{player, dealer, board, kind, winner, dealer_qualified, user_qualified}` (pas de niveau, `meta` vide) ; `correct_answer`/`user_answer` = 1 (joueur) / 0 (égalité) / -1 (banque).
- **Module Calcul des gains** (`uth_gains.*`, game `uth-gains`) : **pas de niveaux et pas de chronomètre** (session dès l'ouverture). Le croupier voit un **vrai tapis** (feutre vert, identique en mode jour) : la banque en haut, le board (flop · turn · river), **de haut en bas** : la banque, le board, puis les cases de mises avec leurs **jetons** — **Bonus** (nom français de l'option Trips) en **losange** (carré posé sur la pointe) et **voyant rouge du Prog** (nom français du jackpot progressif JP1 ; mise fixe à 5 €, donc pas de jetons : le voyant est allumé si le joueur a misé), puis **ronds Blind = Ante** sur une même ligne (signe « = » centré), puis le **rond Play**, et enfin les cartes du joueur. Deux colonnes : **Bonus, Blind et Play sont alignés verticalement** (colonne de gauche), Prog et Ante sur celle de droite. Losange et voyant occupent la même hauteur pour que étiquettes et montants restent alignés. Case vide si Bonus/Prog absents, ou Play si le joueur se couche. Dans l'interface, on écrit « Bonus » et « Prog », jamais « Trips » ni « JP1 » (les clés techniques `trips`/`jp1` restent inchangées). Le croupier voit aussi ce que fait le joueur (« joue avant le flop (4×) » ou « se couche »). Les jetons sont décomposés au plus juste (`UC_CHIPS` : 100, 50, 20, 10, 5, 2,5 €) en piles. Il répond **mise par mise** en cliquant sur la case : une **fenêtre s'ouvre à côté des jetons** (à droite, sinon à gauche, sinon sous la case sur écran étroit ; Échap ou clic à côté pour fermer) : **« Je paie »** (+ montant du **gain**, la mise rendue en plus ; virgule ou point acceptés, 1 centime près), **« Je laisse »** (mise rendue : égalité, Ante si banque non qualifiée, Blind sous la quinte) ou **« Je ramasse »** (mise perdue). Mises : Ante = Blind en multiples de 5 € de 5 € à `max_bet` (50 € par défaut), Play = Ante × multiple selon le moment (absent si le joueur se couche), Trips en multiples de 5 € (présent dans ~55 % des donnes), JP1 5 € fixe (présent dans ~45 %). **Montant maximum configurable** : `training_config` clé `uth`, valeur `{"gains":{"max_bet":50}}`, modifiable par un admin dans le hub UTH (« ⚙ Config UTH », 5 à 200 €, multiples de 5) ; la même valeur peut accueillir plus tard des tables de paiement `blind`/`trips`/`jp1` (déjà prises en compte par `UTH.mergeConfig`). Absence de config ou erreur de lecture = 50 €. **Situations tirées au hasard** par `UTH.gainsRound({maxBet, kind?, config?})` : le joueur bat une banque qualifiée avec moins qu'une quinte (Blind rendu, 22 %), le Blind paie (quinte ou mieux, 12 %), banque non qualifiée (16 %), égalité (8 %), la banque gagne (22 %), le joueur se couche (20 %) ; Trips et JP1 sont favorisés quand ils paient (sinon presque toujours perdus). **Le jackpot est seulement indiqué** (quinte flush royale du joueur avec JP1, ~1 % des donnes, `kind:'jackpot'` pour forcer) : pas de question sur cette mise ni de calcul, le voyant Prog est cerclé d'or avec la pastille « Jackpot » dès l'affichage, et un encadré « Jackpot Prog … à faire valider par le superviseur » l'explique. Correction par `UTH.gradeGains(res, answers)` (pur, testé) à partir des lignes de `UTH.settle` : gagnée → payer, rendue → laisser, perdue → ramasser ; la donne n'est juste que si **toutes** les mises le sont. Une pastille sous chaque case rappelle la réponse donnée (« Paie 45 € », « Laisse », « Ramasse ») ; le bouton Valider s'active quand toutes les mises ont une réponse. Après validation : chaque case est cerclée de vert/rouge, sa fenêtre devient la correction, et un détail liste l'explication du règlement (« banque » comme adversaire), les deux mains avec leur nom, et le net du joueur. `scenario` enregistré : `{kind, street, ante, blind, play, trips, jp1, player, dealer, board, answers, expected, jackpot}` ; `correct_answer` = net exact du joueur (hors jackpot), `user_answer` = net déduit des réponses du croupier ; `meta` de session : `{max_bet}`. Hypothèses (réglementation muette) : « X pour 1 » = gain X × mise avec mise rendue ; Trips évalué sur les 7 cartes du joueur même s'il se couche ; le Trips et le JP1 ont leur propre ligne de correction.
- **Décisions de cadrage** : le jeu s'appelle « Ultimate Texas Hold'em » (la tuile « Ultimate Poker » du hub sera renommée). **Aucun niveau de difficulté dans les modules UTH, et pas de chronomètre** (décision de l'utilisateur : « c'est un jeu facile l'UTH donc c'est censé être maîtrisé au complet ») — donnes au hasard de tous types. Trips inclus dès la v1. Les cartes utilisent les libellés du Blackjack (J/Q/K, ♠♥♦♣).
- **Tests** : le moteur est vérifié par `uth_engine.test.js` — cas connus, évaluateur de référence indépendant sur 200 000 mains, fréquences théoriques du poker à 7 cartes, règlement de chaque cas de la réglementation. Un évaluateur faux enseignerait de fausses règles : ne pas modifier le moteur sans relancer les tests.

### Suivi résultats (Phase 3)

- **Vue croupier — « Mes résultats »** (`training/suivi/suivi_croupier.html`, tuile dans `training.html`) : **navigation en 3 niveaux** — onglets *Vue d'ensemble / Black Jack / Roulette Anglaise / Ultimate Texas Hold'em* (avec nombre de sessions), puis pastilles de module dans un jeu (« Tous les modules » ou un seul ; modules sans session grisés). La vue d'ensemble affiche un tableau cliquable par jeu (sessions, record, moyenne, tendance par module). La vue courante est portée par le **hash de l'URL** (`#`, `#roulette`, `#roulette/roulette-tables`) : bouton retour et liens directs fonctionnent. Regroupement des modules en jeux : `SV_FAMILIES` / champ `family` de `SV_MODULES` dans `suivi_common.js` (le jeu `uth` et ses 3 modules `uth-main`, `uth-gagnant`, `uth-gains` y figurent, sans niveaux). Chaque carte module : nombre de sessions, record, moyenne des 5 dernières, tendance (5 dernières vs 5 précédentes, affichée à partir de 8 sessions), histogramme des 12 dernières sessions, historique paginé (8 + « Tout voir »), filtre par niveau (chips Tous/Facile/Médium/Expert quand le module a des niveaux). Tables ×: meilleur temps par table, **sessions sans erreur uniquement** et avec chrono mesuré (`meta.elapsedMs`, donc pas d'historique avant octobre 2026).
- **Suivi des modules UTH** : mêmes vues que les autres jeux (historique, record, moyenne, tendance, classement, progression, activité). **Points faibles** (`training_weak_points`, migration `phase4_suivi_uth.sql`) : `uth-main` → *Combinaison* (celle à trouver, de carte haute à quinte flush royale) et *Piège* (roue, couleur et quinte…) ; `uth-gagnant` → *Situation* (combinaisons différentes, kicker, banque non qualifiée, égalité) ; `uth-gains` → *Situation* (Blind payé ou rendu, banque non qualifiée, égalité, la banque gagne, couché, jackpot) et *Mise* (Ante, Blind, Play, Bonus, Prog) : une donne compte une fois par mise corrigée, une mise est fausse si l'action ou, pour « je paie », le montant diffère de `scenario.expected`. Libellés français dans `SVM_LABELS` (`suivi_manager.js`).
- `roulette-mixte` (module abandonné) est ignoré par les vues (absent de `SV_MODULES`) ; une session orpheline subsiste en base.
- Source des données : `SB.getMyTrainingSessions()` ; aucun calcul serveur nécessaire pour la vue croupier (volume faible : un seul utilisateur).
- **Vue manager — « Suivi équipe »** (`training/suivi/suivi_manager.html`, guard `panel: 'training-suivi'`, accessible par le menu « Gestion » → Training de la barre pour les rôles qui ont le panel ; plus de tuile ni d'entrée dans la barre de l'espace Training) : 4 onglets portés par le hash (`#classement`, `#progression/<user_id>`, `#faibles`, `#activite`). Une ligne de classement ou d'activité ouvre la progression du croupier.
  - **Classement** : moyenne des 5 dernières sessions par module et niveau ; au moins `SVM_MIN_RANKED` (3) sessions pour être numéroté, les autres sont listés dessous (« pas encore classés »). Tables × : meilleur temps par table (sessions sans erreur chronométrées).
  - **Progression** : courbe SVG (un point par session + moyenne glissante sur 5), stats, meilleurs temps pour les Tables ×.
  - **Points faibles** : taux d'erreur par facette (type de mise, valeur de pièce, table, numéro, nombre de cartes, tranche de mise) pour l'équipe ou un croupier ; seuil de 5 tentatives (3 pour un croupier seul). Pour Calcul Paiement, une question compte une fois par type de mise qu'elle contient.
  - **Activité** : sessions et croupiers actifs sur 7/30/90 jours, sessions par semaine (12 semaines), badge « Inactif » au-delà de `SVM_INACTIVE_DAYS` (14 j).
- **Données** : 5 fonctions SQL `training_ranking`, `training_tables_best`, `training_weak_points`, `training_activity`, `training_activity_weekly` (migration `phase3_suivi_fonctions_manager.sql`), appelées via `SB.getTraining*` (`shared/supabase.js`) ; plafond 1000 lignes Supabase contourné en agrégeant en base. Toutes **SECURITY INVOKER** : la RLS s'applique à l'appelant (un non-manager ne reçoit que ses propres lignes — vérifié par simulation de rôles). La progression d'un croupier lit directement `training_sessions` (policy `*_manager_read`).
- **Sécurité front** : tout libellé issu de la base (`user_label`, modifiable par son propriétaire) passe par `svEsc()` avant `innerHTML` ; les `user_id` placés dans un `onclick` sont validés par `svIsId()`. Le masquage de la tuile côté client est du confort — le verrou réel est la RLS (`app_metadata.role`).
- **Suppression d'un compte** (Gestion Comptes → Edge Function `manage-users`, `auth.admin.deleteUser`) : `training_sessions` et `training_results` ont `user_id` en `ON DELETE CASCADE` vers `auth.users` (vérifié sur la base), donc tout l'historique de training part avec le compte — y compris `user_label`. Aucune autre table n'est liée à un compte. La confirmation de `comptes.html` le dit explicitement. **Toute nouvelle table liée à un utilisateur doit déclarer son `user_id` avec `ON DELETE CASCADE`.**
- **Données incomplètes connues** : pas de chrono (`elapsedMs`) pour les sessions Tables antérieures à octobre 2026 ; pas de niveau pour BJ Paiement et Tables (modules sans niveau) ; 1 session `roulette-mixte` orpheline en base (module abandonné, ignorée).

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
- `training/` est organisé en sous-dossiers par jeu (`blackjack/`, `roulette/`) depuis juillet 2026 — seuls `training.html` et `training.css` restent à la racine (partagés). `suivi/` (Phase 3) en place depuis octobre 2026 ; prévoir `uth/` (Phase 4) sur le même modèle
- Positionnement des chips roulette : approche **DOM-based** (`getBoundingClientRect`), pas de formule de grille — voir `chipPosFromDOM` dans `roulette_tapis.js`
- **Navigation** (`shared/nav.js` + `shared/nav.css`) : barre sticky **sur une ligne**, injectée par `AUTH.guard` une fois l'accès validé (`nav: false` pour la désactiver ; repli sur l'ancien badge si le chargement échoue). Elle remplace les éléments flottants `.back`, `.theme-toggle` et `#auth-badge`. Contenu : vrai logo (`shared/logos`, version claire/sombre selon le thème) · **lanceur d'espaces** (pastille arrondie : Outils Tournois, Training Croupier ; prêt à accueillir de futurs espaces comme les jeux de tables) · **pages de l'espace** (soulignement ambre sur la page courante ; Black Jack, Roulette et Ultimate sont des menus déroulants listant leurs modules (une entrée sans lien propre), Administration (tournois) liste ses sous-pages) · à droite le **menu « Gestion »** (deux parties, chaque entrée selon les droits : **Comptes** → Gestion des comptes (admin) ; **Training** → Suivi équipe (admin et tout rôle ayant le panel `training-suivi`, ex. MCD) et Configuration des modules (admin). Les pages Suivi équipe et Configuration des modules restent dans le contexte de l'espace Training (la barre affiche le lanceur sur « Training Croupier » et ses pages, avec « Gestion » surligné). Un rôle sans aucune entrée n'a pas le menu ; à ne pas confondre avec « Administration tournois », dans la barre de l'espace Tournois), thème, menu utilisateur (e-mail, rôle, mot de passe, déconnexion). Les menus sont des cartes crème très arrondies à encoche sur le bord droit (style du site Barrière). Sous 1300 px : bouton ☰ qui déplie toute l'arborescence. **Adaptation aux droits** (la majorité des comptes n'a pas accès à tout ; en octobre 2026 : croupier 11, floor 7, chef de table 4, admin 3, caisse 3, MCD 2) : admin = tout, sinon `panels` du rôle ; un seul espace accessible → pas de lanceur (simple titre) et, depuis `index.html`, on entre directement dans cet espace ; un espace Outils Tournois avec une seule page accessible (ex. rôle caisse : Leaderboard) → arrivée directe sur cette page ; un droit sur une sous-page seule (ex. `prize-pool` sans `tournois`) suffit à afficher l'espace avec cette page. La barre est montée **avant** le retrait de l'overlay de `guard`, pour qu'une redirection d'entrée n'affiche aucune page intermédiaire. **Ajouter une page ou un espace** : le déclarer dans `SPACES` (ou `ADMIN`) de `nav.js` — c'est aussi ce qui sert à reconnaître la page courante (chemin avec ou sans `.html`). Masquée à l'impression. **Cartes de navigation** (`.tool-card`, `barriere.css`) : rectangles très arrondis (20 px), **tous exactement 300×92 px**, picto dans un carré arrondi à gauche, nom centré dans le reste de la tuile, liseret de couleur discret sur le bord gauche, encoche sur le bord droit (style du site Barrière), **sombres en mode nuit et crème en mode jour**, sans bouton ; les accents de la charte y sont utilisés vifs en nuit et foncés en jour (`--ink`). Style purement CSS. **Pages hub** : les pages de jeu (Black Jack, Roulette, Ultimate) sont **supprimées** — la page Training liste tous les modules, groupés par jeu, et les menus déroulants de la barre mènent aux mêmes pages (les liens « retour » des modules pointent vers `training.html#<jeu>`). Les pages d'espace Outils Tournois et Administration Tournois restent. **Titres de page** : avec la barre, le surtitre « Barrière Casino · Bordeaux » est masqué (`body.has-nav .hdr-logo`), le titre est plus compact (26 à 38 px) et la description (`.hdr-sub`) s'écrit en phrase lisible, plus en capitales espacées — règles dans `barriere.css`, valables pour toutes les pages sans les modifier. Menu Administration (admin) : Gestion des comptes, Config Training. À venir (décisions du 2026-10-05) : repenser les pages « hub » (tuiles redondantes avec les menus déroulants) — piste retenue : une page d'arrivée par espace, avec un contenu propre, et suppression des hubs de jeu ; les hubs de jeu ont été supprimés (voir ci-dessus) ; reste à décider s'il faut une vraie page d'arrivée par espace avec contenu propre.
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
