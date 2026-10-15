# Bibliothèques tierces hébergées avec l'application

Ces fichiers sont copiés ici (et non chargés depuis un CDN) pour que l'application ne dépende d'aucun site tiers :
pas d'adresse IP d'utilisateur envoyée à un tiers, pas de version qui change sans prévenir, pas de script exécuté qui ne
vienne pas du dépôt. **Ne jamais les modifier à la main** : pour changer de version, les remplacer par le fichier officiel
et mettre à jour ce tableau (version, source, empreinte).

| Fichier | Bibliothèque | Version | Licence | Source | SHA-256 |
|---|---|---|---|---|---|
| `supabase_js.js` | `@supabase/supabase-js` (client Supabase, fichier UMD) | 2.117.3 | MIT | `dist/umd/supabase.js` du paquet npm `@supabase/supabase-js@2.117.3` (`npm pack`, empreinte du paquet vérifiée par npm : `sha512-K+f8PimXDunPWQ63CKRXaF5pbVPJxmfw5ryAnh0s9S9PkwcuqBjiSpIaqpF7KLDljeYwXIL85ST8QxaO0+XuvA==`) | `d6a5c4414a5d4ce646d9c1de223aa7067d3ff664c15394ffeb7fcffc763354a3` |
| `xlsx.full.min.js` | SheetJS (lecture des extractions Octime au format Excel) | 0.20.3 | Apache-2.0 | `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` | `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41` |

- `supabase_js.js` est chargé sur toutes les pages (avant `shared/supabase.js`). La fonction `current_password` de
  `updateUser` (changement de mot de passe avec l'ancien) demande la version 2.102.0 ou plus.
- `xlsx.full.min.js` n'est chargé qu'à l'import d'un fichier Excel (page Break list), jamais au chargement des pages.
- Vérifier une empreinte : `sha256sum shared/vendor/supabase_js.js`.
- SheetJS ne publie pas ses nouvelles versions sur npm : on les prend sur `cdn.sheetjs.com`, en fixant le numéro de version dans l'adresse.
- Les polices (`shared/fonts/`) sont décrites dans `shared/fonts/LICENCES.txt`.
