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

export function emailValide(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

// Renvoie le message d'erreur, ou null si le mot de passe convient
export function erreurMotDePasse(v: unknown): string | null {
  if (typeof v !== 'string') return 'Le mot de passe est requis';
  if (v.length < MOT_DE_PASSE_MIN) return 'Le mot de passe doit faire au moins ' + MOT_DE_PASSE_MIN + ' caractères';
  if (v.length > 72) return 'Le mot de passe est trop long (72 caractères au plus)';
  return null;
}
