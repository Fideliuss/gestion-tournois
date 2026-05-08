# Outils Tournois — Casino Barrière Bordeaux

Outils internes de gestion des tournois de poker. Application web locale, sans serveur, sans installation — s'ouvre directement dans le navigateur.

---

## Outils disponibles

### 🎯 Prize Pool Calculator
Calcule automatiquement la répartition des gains selon le nombre de joueurs et la structure du buy-in.

- Décomposition buy-in : part prize pool, rake (4%), frais casino, cagnotte fixe
- Progression super-géométrique avec écarts croissants exponentiellement
- Dernier payé = 2× le prix du tournoi
- 12% des joueurs payés (ajustable manuellement)
- Impression directe du tableau

### 🏆 Challenge Saisonnier
Classement général de la saison 2025/2026 avec saisie et historique des résultats.

- Classement en temps réel avec podium visuel
- Saisie des résultats par tournoi (places standards + places supplémentaires)
- Historique complet des résultats et sessions
- Gestion des tournois : création, modification, suppression, barèmes de points
- Document ranking imprimable avec montant de la cagnotte
- Fiche joueur détaillée (points, meilleur résultat, historique)
- Données sauvegardées localement en JSON via File System API

---

## Utilisation

Ouvre `index.html` dans **Google Chrome** ou **Microsoft Edge** (version récente).

> **Important :** la sauvegarde des données du Challenge Saisonnier utilise l'API File System Access, disponible uniquement sur Chrome et Edge. Les autres navigateurs ne sont pas supportés pour cette fonctionnalité.

### Première utilisation — Challenge Saisonnier
1. Ouvrir `leaderboard.html`
2. Cliquer sur **Choisir le dossier** et sélectionner un dossier sur ton ordinateur
3. Le fichier `barriere_data.json` sera créé automatiquement dans ce dossier
4. Les données sont restaurées automatiquement à chaque réouverture

---

## Structure des fichiers

```
├── index.html          — Page d'accueil (hub)
│
├── prize-pool.html     — Prize Pool Calculator (HTML)
├── prize-pool.css      — Styles du calculateur
├── prize-pool.js       — Logique React du calculateur
│
├── leaderboard.html    — Challenge Saisonnier (HTML)
├── leaderboard.css     — Styles du leaderboard
├── leaderboard.js      — Logique JS du leaderboard
│
├── barriere.css        — Styles partagés (thème, composants communs)
└── barriere.js         — Scripts partagés (thème jour/nuit)
```

---

## Stack technique

| Outil | Usage |
|-------|-------|
| HTML / CSS / JS vanilla | Base de l'application |
| React 18 (CDN) | Interface Prize Pool Calculator |
| File System Access API | Persistance des données leaderboard |
| IndexedDB | Mémorisation du dossier entre sessions |
| `localStorage` | Fallback si dossier non connecté |

Aucun bundler, aucune dépendance npm, aucun serveur. Zéro friction.

---

## Tournois configurés par défaut

| Tournoi | Jour | Buy-in | Places payées |
|---------|------|--------|---------------|
| Lucky Monday | Lundi | 80 € | 10 |
| Tuesday Knock-Out | Mardi | 120 € | 10 |
| Fun Rebuy Tuesday | Mardi | 40 € | 10 |
| Mercredi Poker Time | Mercredi | 75 € | 10 |
| Small du Jeudi | Jeudi | 60 € | 10 |
| Friday High Stack | Vendredi | 150 € | 10 |
| Sunday 30K | Dimanche | 100 € | 15 |
| Sunday 40K | Dimanche | 200 € | 17 |
| Le 33 (VSD) | Événement | 330 € | 20 |

Les tournois sont entièrement configurables depuis l'onglet **⚙ Tournois** du leaderboard.

---

## Saison en cours

**2025 / 2026** — 1er novembre 2025 → 31 octobre 2026

- Cagnotte : 2 € par entrée (joueurs + rebuys)
- Ranking fin de saison : 1er = 10% · 2ème = 5% de la cagnotte totale

---

*Casino Barrière Bordeaux — Outil interne*
