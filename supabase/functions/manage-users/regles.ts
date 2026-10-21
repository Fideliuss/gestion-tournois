// Règles pures de la fonction manage-users (sans Deno ni réseau : testables sous Node, voir regles.test.ts).
// Syntaxe TypeScript « effaçable » uniquement (pas d'enum ni de paramètre-propriété), pour que Node puisse les lire.

export const MOT_DE_PASSE_MIN = 12;

// Prénom / nom : texte simple, espaces nettoyés, 60 caractères au plus ; undefined = champ non fourni (on n'y touche pas)
export function nettoyerNom(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v).replace(/\s+/g, ' ').trim().slice(0, 60);
}

// Rôle de l'appelant ou d'un compte : app_metadata UNIQUEMENT. user_metadata est modifiable par l'utilisateur lui-même
// (auth.updateUser), il ne doit jamais décider d'un droit.
export function roleDe(utilisateur: { app_metadata?: { role?: unknown } } | null | undefined): string {
  const r = utilisateur && utilisateur.app_metadata && utilisateur.app_metadata.role;
  return typeof r === 'string' ? r : '';
}

export function estAdmin(utilisateur: { app_metadata?: { role?: unknown } } | null | undefined): boolean {
  return roleDe(utilisateur) === 'admin';
}

// Compte désactivé : bloqué par Supabase jusqu'à une date (banned_until) encore dans le futur
export function estDesactive(utilisateur: { banned_until?: string | null } | null | undefined, maintenant: number = Date.now()): boolean {
  const jusqua = utilisateur && utilisateur.banned_until;
  return !!jusqua && Date.parse(jusqua) > maintenant;
}

export function emailValide(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

// Mêmes règles que le projet Supabase (Authentication > Sign In / Providers > Email) et que shared/mot_de_passe.js
// (navigateur) : 12 caractères au moins, minuscules, majuscules, chiffres et symboles. handler.test.ts vérifie que les deux
// versions donnent le même verdict. Si un réglage change dans Supabase, changer ici ET dans shared/mot_de_passe.js.
export const MOT_DE_PASSE_MAX = 72;
const SYMBOLES = '!@#$%^&*()_+-=[]{};\':"\\|<>?,./`~';

// Renvoie le message d'erreur, ou null si le mot de passe convient
export function erreurMotDePasse(v: unknown): string | null {
  if (typeof v !== 'string') return 'Le mot de passe est requis';
  if (v.length > MOT_DE_PASSE_MAX) return 'Le mot de passe est trop long (' + MOT_DE_PASSE_MAX + ' caractères au plus)';
  const manque: string[] = [];
  if (v.length < MOT_DE_PASSE_MIN) manque.push(MOT_DE_PASSE_MIN + ' caractères au moins');
  if (!/[a-z]/.test(v)) manque.push('une minuscule');
  if (!/[A-Z]/.test(v)) manque.push('une majuscule');
  if (!/[0-9]/.test(v)) manque.push('un chiffre');
  if (![...v].some(c => SYMBOLES.includes(c))) manque.push('un symbole');
  return manque.length ? 'Le mot de passe doit contenir : ' + manque.join(', ') : null;
}
