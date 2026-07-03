# Service Jeux Traditionnels — Casino Barrière Bordeaux

Outils internes du casino, regroupés dans une seule application web déployée sur **GitHub Pages**, sécurisée par authentification e-mail + mot de passe (Supabase Auth), sans serveur, sans installation — s'ouvre directement dans le navigateur.

**URL de production :** https://fideliuss.github.io/gestion-tournois/

L'application est organisée en 3 grands panneaux d'accès, chacun filtrable par rôle :

| Panneau | Description |
|---------|-------------|
| 🎯 **Outils Tournois** | Prize Pool, Challenge Saisonnier, Administration Tournois (déclarations DTPJ, courriers, extras, config) |
| 🎓 **Training Croupier** | Modules d'entraînement Blackjack et Roulette Anglaise |
| 👤 **Gestion Comptes** | Création de comptes, rôles personnalisables, permissions par panneau *(admin uniquement)* |

---

## 🎯 Outils Tournois

### Prize Pool Builder
Calcule automatiquement la répartition des gains selon le nombre de joueurs et la structure du buy-in.

- Sélection du tournoi via le semainier (jour de la semaine) ou les presets configurables
- PP et Frais définis par tournoi ; Buy-in = PP + Frais (automatique)
- Constructeur interactif de répartition avec indicateurs live, hints et suggestion géométrique
- Bandeau récap : brut / rake / prize pool net / cagnotte
- 12% des joueurs payés (ajustable manuellement)
- Impression directe du tableau

### Challenge Saisonnier
Classement général de la saison 2025/2026 avec saisie et historique des résultats.

- Classement en temps réel avec podium visuel
- Saisie des résultats par tournoi (semainier, places standards + places supplémentaires)
- **Historique vue calendrier** : grille mensuelle 7 colonnes (Lun → Dim), chips cliquables sur les jours avec session, panneau détail sous le calendrier, édition inline des résultats et des entrées
- **Impression classement one-page** (A4) : podium visuel 3 marches, places 4-30 et 31-150 en colonnes (ordre colonne par colonne), coupure stricte à 150
- **Document ranking imprimable** : encadré doré centré A4, montant en grand, cases 1er (or) / 2ème (gris)
- Fiche joueur détaillée (points, meilleur résultat, historique)
- Données sauvegardées dans **Supabase** (cloud) — synchronisées en temps réel

### Administration Tournois *(sous-hub)*

**Déclaration DTPJ** — formulaire mensuel de déclaration des tournois au Service Course et Jeux de la Police Nationale.
- Tableau généré automatiquement depuis une configuration par jour de semaine
- Gestion des exceptions ponctuelles (annulation, modification d'un tournoi) et tournois ad-hoc
- Annexes Prize Pool éditables avec répartition configurable
- Impression A4 paysage optimisée (tableau + annexes en 1 page)

**Courriers mensuels** *(accessible depuis Déclaration DTPJ)* — génération des 3 courriers officiels d'accompagnement : Ministre de l'Intérieur, SIPJ 33, Préfecture de la Gironde.
- Triangle des destinataires respecté (chaque courrier mentionne les 2 autres en copie)
- Date auto-calculée à J-21 du début du mois déclaré, destinataires/signatures éditables
- Export PDF natif via l'impression navigateur (A4 portrait, style administratif français)

**Déclaration Extras** — gestion des croupiers extras.
- CRUD complet de la liste des extras (nom, prénom, date/lieu de naissance, adresse)
- **Déclaration mensuelle** imprimable A4 paysage, sélecteur calendrier natif
- **Émargement hebdomadaire** : grille imprimable A4 paysage, horaires par défaut configurables + overrides ad-hoc
- Liste des extras persistée dans **Supabase**

**Config Tournois** — calendrier des tournois (CRUD), un semainier par jour + section événements, barème de points éditable par tournoi.

---

## 🎓 Training Croupier

Modules d'entraînement pour les croupiers, avec sessions chronométrées, score, niveaux de difficulté (Facile / Médium / Expert) et configuration admin par jeu.

### Blackjack
- **BJ Paiement** — calcul du paiement d'une main gagnante selon la mise (plages de mises configurables) et le timer par niveau
- **BJ Score** — entraînement au calcul de score de main

### Roulette Anglaise
- **Calcul Paiement** — un numéro gagnant tiré, plusieurs mises simultanées à calculer (plein, cheval, transversale, carré, sixain), y compris les mises couvrant le 0. Positionnement des chips sur le tapis calculé dynamiquement depuis le DOM réel (robuste à toute mise en page). Chips en couleur neutre pendant la question, révélation des couleurs + détail groupé par type de mise en cas d'erreur.
- **Conversion Pièces** — conversion valeur de pièces, valeur fixée par session
- **Pointage Numéro** — identification d'un numéro sur le tapis, orientation aléatoire (miroir gauche/droite)
- **Couleur Numéro** — identification rouge / noir / vert
- **Ordre Paiement** — *bientôt disponible*

### Ultimate Poker — *bientôt disponible*

Toutes les sessions et résultats de training sont enregistrés dans **Supabase** (historique par utilisateur). Les paramètres (timers, plages de mise, valeurs de pièces) sont configurables par un admin depuis chaque hub de module.

---

## 👤 Gestion Comptes *(admin uniquement)*

- **Comptes** : création / édition / suppression (e-mail + mot de passe) via une Edge Function Supabase sécurisée (vérification admin côté serveur, jamais côté client)
- **Rôles personnalisables** : au-delà des rôles par défaut (Admin, MCD, Floor), création de rôles sur mesure avec libellé et couleur
- **Permissions par panneau** : chaque rôle a une liste de panneaux autorisés (Outils Tournois et ses sous-panneaux, Training) — un rôle non listé sur un panneau ne le voit pas dans les hubs et ne peut pas accéder à l'URL directement
- Les admins ont toujours accès à tout, quels que soient les panneaux configurés

---

## Accès et authentification

L'application est sécurisée par **e-mail + mot de passe** (Supabase Auth). Les rôles et leurs accès par panneau sont entièrement configurables depuis **Gestion Comptes**.

### Connexion
1. Ouvrir https://fideliuss.github.io/gestion-tournois/
2. Saisir son adresse e-mail et son mot de passe
3. Redirection automatique selon le rôle — session valable **7 jours**
4. Changement de mot de passe disponible depuis le badge utilisateur (icône 🔑)

### Gestion des comptes et permissions
Accessible depuis **Gestion Comptes** (réservé aux admins) :
- Création / édition / suppression de comptes
- Création / édition / suppression de rôles, avec couleur et libellé personnalisés
- Configuration des panneaux accessibles par rôle (table `app_roles` Supabase)

---

## Utilisation

Compatible **Google Chrome** et **Microsoft Edge** (version récente).

### Données cloud
Toutes les données (tournois, leaderboard, extras, comptes, rôles, training) sont stockées dans **Supabase** (cloud PostgreSQL) — aucune configuration locale requise, synchronisées automatiquement entre toutes les machines.

---

## Structure des fichiers

```
├── index.html                     — Hub principal (guard auth, filtrage panneaux par rôle)
├── outils_tournois.html           — Sous-hub Outils Tournois
├── login.html                     — Page de connexion (e-mail + mot de passe)
│
├── shared/
│   ├── barriere.css               — Styles partagés (thème, composants, styles auth)
│   ├── barriere.js                — Scripts partagés (thème, favicon)
│   ├── tournaments.js             — TOURNAMENT_DEFAULTS + TournamentsStore (Supabase + fallback)
│   ├── semainier.js               — Widget partagé : sélecteur de tournoi par jour de semaine
│   ├── supabase.js                — Client Supabase + objet SB (CRUD complet + auth + app_roles + training + mappers)
│   ├── auth.js                    — AUTH.guard({loginUrl, role, panel}), AUTH.signOut(), badge utilisateur, cache panels
│   ├── changelog.js                — Mis à jour manuellement avant chaque PR de release
│   ├── logos/                     — Logos (écran + impression)
│   └── favicon/                   — Favicon et icônes PWA
│
├── prize_pool/
│   ├── prize_pool.html            — Prize Pool Builder
│   ├── prize_pool.css
│   └── prize_pool.js              — Logique React
│
├── leaderboard/
│   ├── leaderboard.html           — Challenge Saisonnier
│   ├── leaderboard.css
│   └── leaderboard.js
│
├── admin/
│   ├── admin_tournois.html        — Sous-hub Administration Tournois
│   ├── config_tournois.html       — CRUD tournois + semainier + barème de points
│   ├── comptes.html               — Gestion Comptes : CRUD comptes + rôles + permissions par panneau
│   ├── declaration/
│   │   ├── declaration.html       — Déclaration Tournois DTPJ
│   │   ├── declaration.css / .js
│   │   ├── courriers.html         — Courriers PN (accès via declaration.html)
│   │   └── courriers.css / .js
│   └── extras/
│       ├── extras.html            — Déclaration Extras & Émargement
│       └── extras.css / .js
│
├── training/
│   ├── training.html              — Sous-hub Training Croupier
│   ├── training.css               — Styles partagés training
│   ├── blackjack_hub.html         — Sous-hub Blackjack + config admin
│   ├── blackjack.html / .js       — BJ Paiement
│   ├── blackjack_score.html / .js — BJ Score
│   ├── roulette_hub.html          — Sous-hub Roulette + config admin
│   ├── roulette.css               — Styles partagés roulette (tapis, chips, badges)
│   ├── roulette_tapis.js          — Composant tapis partagé (rendu grille, positionnement chips DOM, génération de mises)
│   ├── roulette_paiement.html / .js    — Calcul Paiement
│   ├── roulette_conversion.html / .js  — Conversion Pièces
│   ├── roulette_pointage.html / .js    — Pointage Numéro
│   └── roulette_couleur.html / .js     — Couleur Numéro
│
└── supabase/
    ├── functions/
    │   └── manage-users/index.ts  — Edge Function : CRUD comptes (admin only, vérifié côté serveur)
    └── migrations/
        ├── training_tables.sql        — training_config, training_sessions, training_results
        └── fix_rls_app_metadata.sql   — migration des policies vers app_metadata (rôle non modifiable client-side)
```

---

## Stack technique

| Outil | Usage |
|-------|-------|
| HTML / CSS / JS vanilla | Base de l'application |
| React 18 (CDN) | Interface Prize Pool Builder |
| Supabase (PostgreSQL cloud) | Persistance (tournois, leaderboard, extras, training) + **authentification** |
| Supabase Edge Functions (Deno) | `manage-users` — CRUD comptes avec vérification admin côté serveur |
| supabase-js v2 (CDN) | Client Supabase côté navigateur |
| Supabase Auth (e-mail + mot de passe) | Connexion sécurisée, rôles configurables, session 7 jours |
| `localStorage` | Configs déclaration / courriers / émargements hebdo |
| GitHub Pages | Hébergement statique (branche `main`, auto-deploy) |

Aucun bundler, aucune dépendance npm, aucun serveur local. Zéro friction.

---

## Tournois configurés par défaut

| Tournoi | Jour | PP | Frais | Buy-in | Places payées |
|---------|------|----|-------|--------|---------------|
| Lucky Monday | Lundi | 70 € | 10 € | 80 € | 10 |
| Tuesday Knock-Out | Mardi | 110 € | 10 € | 120 € | 10 |
| Fun Rebuy Tuesday | Mardi | 35 € | 5 € | 40 € | 10 |
| Mercredi Poker Time | Mercredi | 65 € | 10 € | 75 € | 10 |
| Small du Jeudi | Jeudi | 55 € | 5 € | 60 € | 10 |
| Friday High Stack | Vendredi | 135 € | 15 € | 150 € | 10 |
| Sunday 30K | Dimanche | 90 € | 10 € | 100 € | 15 |
| Sunday 40K | Dimanche | 180 € | 20 € | 200 € | 17 |
| Le 33 (VSD) | Événement | 295 € | 35 € | 330 € | 20 |

Cette liste sert de fallback (`TOURNAMENT_DEFAULTS`) si Supabase est inaccessible. Les tournois réels sont entièrement configurables depuis **Outils Tournois → Administration Tournois → Config Tournois**.

---

## Saison en cours

**2025 / 2026** — 1er novembre 2025 → 31 octobre 2026

- Cagnotte : 2 € par entrée (joueurs + rebuys)
- Ranking fin de saison : 1er = 10% · 2ème = 5% de la cagnotte totale

---

*Casino Barrière Bordeaux — Outil interne*
