# Outils Tournois — Casino Barrière Bordeaux

Outils internes de gestion des tournois de poker. Application web locale, sans serveur, sans installation — s'ouvre directement dans le navigateur.

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
- Données extras persistées en JSON via File System API (même dossier que le leaderboard)

---

## Utilisation

Ouvre `index.html` dans **Google Chrome** ou **Microsoft Edge** (version récente).

### Première utilisation — Leaderboard
Le leaderboard utilise **Supabase** (cloud PostgreSQL) — aucune configuration locale requise.
1. Ouvrir `leaderboard/leaderboard.html` directement
2. Les données sont chargées automatiquement depuis Supabase

### Première utilisation — Extras
1. Ouvrir `extras/extras.html`
2. Cliquer sur l'indicateur **Données** et sélectionner un dossier sur ton ordinateur
3. Le fichier `data/extras_data.json` est créé automatiquement

> **Note :** l'API File System Access (Chrome/Edge uniquement) est utilisée uniquement par le module Extras.

---

## Structure des fichiers

```
├── index.html              — Hub principal
├── admin.html              — Sous-hub Gestion Administrative
├── csv-import.html         — Outil one-shot import CSV → barriere_data.json (migration)
├── supabase-import.html    — Outil one-shot migration barriere_data.json → Supabase
│
├── shared/
│   ├── barriere.css        — Styles partagés (thème, composants, .fs-indicator)
│   ├── barriere.js         — Scripts partagés (thème, favicon, BarriereFS pour extras)
│   ├── tournaments.js      — TOURNAMENT_DEFAULTS (fallback leaderboard)
│   ├── supabase.js         — Client Supabase + objet SB (CRUD complet + mappers)
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
| Supabase (PostgreSQL cloud) | Persistance des données leaderboard (résultats, sessions, tournois) |
| supabase-js v2 (CDN) | Client Supabase côté navigateur |
| File System Access API | Persistance des données extras (`extras_data.json`) |
| IndexedDB | Mémorisation du dossier FS entre sessions (extras) |
| `localStorage` | Configs déclaration / courriers / extras |

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
