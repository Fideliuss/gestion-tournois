# Outils Tournois — Casino Barrière Bordeaux

Outils internes de gestion des tournois de poker. Application web déployée sur **GitHub Pages**, sécurisée par authentification magic link (Supabase Auth), sans serveur, sans installation — s'ouvre directement dans le navigateur.

**URL de production :** https://fideliuss.github.io/gestion-tournois/

---

## Outils disponibles

### 🎯 Prize Pool Calculator
Calcule automatiquement la répartition des gains selon le nombre de joueurs et la structure du buy-in.

- Sélection du tournoi depuis les presets configurables (référentiel centralisé `tournaments.json`)
- PP et Frais définis par tournoi ; Buy-in = PP + Frais (automatique)
- Constructeur interactif de répartition avec indicateurs live, hints et suggestion géométrique
- Bandeau récap : brut / rake / prize pool net / cagnotte
- Gestion des tournois (CRUD) via ⚙ discret
- 12% des joueurs payés (ajustable manuellement)
- Impression directe du tableau

### 🏆 Challenge Saisonnier
Classement général de la saison 2025/2026 avec saisie et historique des résultats.

- Classement en temps réel avec podium visuel
- Saisie des résultats par tournoi (places standards + places supplémentaires)
- **Historique vue calendrier** : grille mensuelle 7 colonnes (Lun → Dim), chips cliquables sur les jours avec session, panneau détail sous le calendrier, édition inline des résultats et des entrées
- **Impression classement one-page** (A4) : podium visuel 3 marches, places 4-30 et 31-150 en colonnes (ordre colonne par colonne), coupure stricte à 150
- Gestion des tournois : création, modification, suppression, barèmes de points
- **Document ranking imprimable** : encadré doré centré A4, montant en grand, cases 1er (or) / 2ème (gris)
- Fiche joueur détaillée (points, meilleur résultat, historique)
- Données sauvegardées dans **Supabase** (cloud) — synchronisées en temps réel, accessibles depuis n'importe quelle machine

### 🗂 Gestion Administrative *(sous-hub)*
Regroupe les outils de déclaration mensuelle au Service Course et Jeux de la Police Judiciaire.

### 📋 Déclaration DTPJ
Formulaire mensuel de déclaration des tournois au Service Course et Jeux de la Police Nationale.

- Tableau généré automatiquement depuis une configuration par jour de semaine
- Gestion des exceptions ponctuelles (annulation, modification d'un tournoi)
- Tournois ad-hoc pour les événements exceptionnels
- Annexes Prize Pool éditables avec répartition configurable
- Impression A4 paysage optimisée (tableau + annexes en 1 page)

### ✉ Courriers mensuels *(accessible depuis Déclaration DTPJ)*
Génération des 3 courriers officiels d'accompagnement à envoyer chaque mois.

- **Ministre de l'Intérieur** — Service Central des Courses et Jeux, Paris
- **SIPJ 33** — Section des Courses & Jeux, Bordeaux
- **Préfecture de la Gironde** — Bordeaux
- Triangle des destinataires respecté : chaque courrier mentionne les 2 autres en copie
- Date du courrier auto-calculée à J-21 du début du mois déclaré
- Destinataires et signatures éditables directement dans l'app
- Mise en page A4 portrait, police serif, style administratif français, 1 page
- Export PDF natif via l'impression navigateur

### 👥 Déclaration Extras
Gestion des croupiers extras — déclaration mensuelle DTPJ et feuilles d'émargement hebdomadaires.

- CRUD complet de la liste des extras (nom, prénom, date/lieu de naissance, adresse)
- **Déclaration mensuelle** : tableau officiel « DECLARATION CROUPIER EXTRA » imprimable A4 paysage, sélecteur calendrier natif
- **Émargement hebdomadaire** : grille imprimable A4 paysage, une carte par extra présent
  - Sélection des présences par semaine (calendrier natif ISO)
  - Horaires par défaut configurables (20:55 semaine / 16:55 dimanche)
  - Overrides d'horaires ad-hoc par jour ou par extra × jour
- Liste des extras persistée dans **Supabase** (cloud) — synchronisée automatiquement

---

## Accès et authentification

L'application est sécurisée par **magic link** (Supabase Auth). Deux rôles :

| Rôle | Accès |
|------|-------|
| **Admin** | Accès total (hub complet, leaderboard, déclaration, extras) |
| **Floor** | Prize Pool Builder uniquement |

### Connexion
1. Ouvrir https://fideliuss.github.io/gestion-tournois/
2. Saisir son adresse e-mail professionnelle
3. Cliquer sur le lien reçu par e-mail
4. Redirection automatique selon le rôle — session valable **7 jours**

### Gestion des rôles (admin Supabase requis)
Supabase Dashboard → Authentication → Users → Edit user → `raw_user_meta_data` :
- Admin : `{ "role": "admin" }`
- Floor : `{ "role": "floor" }` (ou laisser vide — floor par défaut)

---

## Utilisation

Compatible **Google Chrome** et **Microsoft Edge** (version récente).

### Données cloud
Toutes les données (leaderboard, extras) sont stockées dans **Supabase** (cloud PostgreSQL) — aucune configuration locale requise, synchronisées automatiquement entre toutes les machines.

---

## Structure des fichiers

```
├── index.html              — Hub principal (guard auth, filtrage par rôle)
├── admin.html              — Sous-hub Gestion Administrative (admin only)
├── login.html              — Page de connexion magic link
│
├── shared/
│   ├── barriere.css        — Styles partagés (thème, composants, styles auth)
│   ├── barriere.js         — Scripts partagés (thème, favicon, BarriereFS)
│   ├── tournaments.js      — TOURNAMENT_DEFAULTS (fallback leaderboard)
│   ├── supabase.js         — Client Supabase + objet SB (CRUD complet + auth + mappers)
│   ├── auth.js             — AUTH.guard(), AUTH.signOut(), badge utilisateur
│   ├── changelog.js        — Mis à jour manuellement avant chaque PR de release
│   └── logo.png            — Logo Casino Barrière Bordeaux
│
├── leaderboard/
│   ├── leaderboard.html    — Challenge Saisonnier
│   ├── leaderboard.css
│   └── leaderboard.js
│
├── prize-pool/
│   ├── prize-pool.html     — Prize Pool Calculator
│   ├── prize-pool.css
│   └── prize-pool.js       — Logique React
│
├── declaration/
│   ├── declaration.html    — Déclaration Tournois DTPJ
│   ├── declaration.css
│   ├── declaration.js
│   ├── courriers.html      — Courriers PN (accès via declaration.html)
│   ├── courriers.css
│   └── courriers.js
│
└── extras/
    ├── extras.html         — Déclaration Extras & Émargement
    ├── extras.css
    └── extras.js
```

---

## Stack technique

| Outil | Usage |
|-------|-------|
| HTML / CSS / JS vanilla | Base de l'application |
| React 18 (CDN) | Interface Prize Pool Calculator |
| Supabase (PostgreSQL cloud) | Persistance leaderboard + extras + **authentification** |
| supabase-js v2 (CDN) | Client Supabase côté navigateur |
| Supabase Auth (magic link) | Connexion sécurisée par e-mail, rôles admin/floor, session 7 jours |
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

Les tournois sont entièrement configurables depuis le ⚙ du Prize Pool Calculator ou l'onglet **⚙ Tournois** du leaderboard.

---

## Saison en cours

**2025 / 2026** — 1er novembre 2025 → 31 octobre 2026

- Cagnotte : 2 € par entrée (joueurs + rebuys)
- Ranking fin de saison : 1er = 10% · 2ème = 5% de la cagnotte totale

---

*Casino Barrière Bordeaux — Outil interne*
