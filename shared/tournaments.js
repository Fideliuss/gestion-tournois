/* ═══════════════════════════════════════════════════════
   tournaments.js — Référentiel tournois partagé
   Casino Barrière Bordeaux · Outils Tournois
   Charger après barriere.js dans chaque module.
═══════════════════════════════════════════════════════ */

const TOURNAMENT_DEFAULTS = [
  { id:'lucky-monday',     name:'Lucky Monday',        day:'Lundi',     buyin:80,  pp:70,  frais:10, points:[22,16,13,11,9,8,7,6,5,4] },
  { id:'knockout-tuesday', name:'Tuesday Knock-Out',   day:'Mardi',     buyin:120, pp:110, frais:10, points:[31,23,18,15,13,11,10,9,8,7] },
  { id:'funrebuy-tuesday', name:'Fun Rebuy Tuesday',   day:'Mardi',     buyin:40,  pp:35,  frais:5,  points:[15,12,9,8,7,6,5,4,3,2] },
  { id:'mercredi-poker',   name:'Mercredi Poker Time', day:'Mercredi',  buyin:75,  pp:65,  frais:10, points:[22,16,13,11,9,8,7,6,5,4] },
  { id:'small-jeudi',      name:'Small du Jeudi',      day:'Jeudi',     buyin:60,  pp:55,  frais:5,  points:[19,14,11,10,8,7,6,5,4,3] },
  { id:'friday-highstack', name:'Friday High Stack',   day:'Vendredi',  buyin:150, pp:135, frais:15, points:[32,24,19,16,14,12,11,10,9,8] },
  { id:'sunday-30k',       name:'Sunday 30K',          day:'Dimanche',  buyin:100, pp:90,  frais:10, points:[26,19,15,13,11,10,9,8,7,6,5,4,3,2,1] },
  { id:'sunday-40k',       name:'Sunday 40K',          day:'Dimanche',  buyin:200, pp:180, frais:20, points:[58,43,35,29,25,22,19,17,16,14,13,12,11,10,9,8,7] },
  { id:'vsd',              name:'Le 33 (VSD)',          day:'Événement', buyin:330, pp:295, frais:35, points:[86,65,52,43,37,32,29,26,24,22,20,18,17,16,15,14,13,12,11,10] },
];

/* ══════════════════════════════════════════════════════
   TournamentsStore — accès centralisé aux tournois
   Source de vérité : Supabase (SB.getTournaments)
   Fallback : TOURNAMENT_DEFAULTS si Supabase inaccessible
   La clé "points" est préservée lors des mises à jour
   partielles (prize_pool ne la connaît pas).
══════════════════════════════════════════════════════ */
const TournamentsStore = {

  async read() {
    try {
      const ts = await SB.getTournaments();
      if (ts && ts.length > 0) return ts;
    } catch {}
    return TOURNAMENT_DEFAULTS.map(t => ({ ...t }));
  },

  /* Mise à jour partielle : lit d'abord le tournoi complet depuis Supabase
     pour préserver les champs non fournis (ex: points depuis le prize_pool) */
  async update(id, changes) {
    const list    = await this.read();
    const current = list.find(t => t.id === id) || {};
    await SB.upsertTournament({ ...current, ...changes });
    return await this.read();
  },

  async add(t) {
    await SB.upsertTournament(t);
    return await this.read();
  },

  async remove(id) {
    await SB.deleteTournament(id);
    return await this.read();
  },
};
