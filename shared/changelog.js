// Mis à jour manuellement avant chaque PR de release
// var (not const) so window.CHANGELOG is accessible across scripts

var CHANGELOG = [
  { version: 'v1.8.1', date: '2026-06-09', message: 'Suppression des outils de migration one-shot (csv-import.html, supabase-import.html) — migrations terminées, déploiement GitHub Pages' },
  { version: 'v1.8.0', date: '2026-06-09', message: 'Migration Supabase complète — leaderboard (résultats, sessions, tournois) + extras (croupiers) persistés dans PostgreSQL cloud ; suppression totale de BarriereFS/File System Access API ; outil supabase-import.html' },
  { version: 'v1.7.0', date: '2026-06-09', message: 'Historique — vue calendrier mensuelle (grille 7 cols, chips par session, panneau détail) ; Ranking — impression redessinée (encadré doré, typographie élégante, cases 1er/2ème colorées)' },
  { version: 'v1.6.0', date: '2026-06-08', message: 'Historique — accordion sessions + édition inline résultats/entrées + filtre date ; Classement — impression one-page (podium visuel, 4 colonnes, ordre colonne) ; outil import CSV one-shot' },
  { version: 'v1.5.1', date: '2026-06-08', message: 'Prize Pool — corrections impression (€, couleurs, marges) ; calcul exact 12% places ; diagnostic suggestion' },
  { version: 'v1.5.0', date: '2026-05-16', message: 'Prize Pool Builder — constructeur manuel, indicateurs live, hints, suggestion géométrique ; référentiel tournois centralisé (tournaments.json, PP/Frais par tournoi) ; menus redessinés (emoji + couleur accent par carte)' },
  { version: 'v1.4.2', date: '2026-05-15', message: 'Émargement — mise en page impression pleine page, proportions colonnes, colonne départ' },
  { version: 'v1.4.1', date: '2026-05-15', message: 'Corrections émargement — police, couleurs, mise en page impression' },
  { version: 'v1.4.0', date: '2026-05-15', message: 'Outil Déclaration Extras & Émargement hebdomadaire' },
  { version: 'v1.3.0', date: '2026-05-10', message: 'Favicon sur toutes les pages' },
  { version: 'v1.2.4', date: '2026-05-10', message: 'Corrections texte + alignement signature courriers' },
  { version: 'v1.2.3', date: '2026-05-09', message: 'Destinataire à droite, footer remonté' },
  { version: 'v1.2.2', date: '2026-05-09', message: 'Ajustements mise en page courriers' },
  { version: 'v1.2.1', date: '2026-05-09', message: 'Footer courriers allégé' },
  { version: 'v1.2.0', date: '2026-05-09', message: 'Courriers PN + mise en page' },
];
