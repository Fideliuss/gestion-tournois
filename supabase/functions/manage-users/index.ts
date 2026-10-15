// Edge Function - Gestion des comptes utilisateurs (voir handler.ts pour la logique, regles.ts pour les règles pures)
// Requiert : secret SERVICE_ROLE_KEY (supabase secrets set)
// Appelée uniquement par les admins (JWT vérifié côté serveur)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { traiter } from './handler.ts';

Deno.serve((req: Request) => traiter(req, { env: (nom: string) => Deno.env.get(nom), creerClient: createClient }));
