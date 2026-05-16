/* ═══════════════════════════════════════════════════════
   tournaments.js — Référentiel tournois partagé
   Casino Barrière Bordeaux · Outils Tournois
   Charger après barriere.js dans chaque module.
═══════════════════════════════════════════════════════ */

const TOURNAMENT_DEFAULTS = [
  { id:'lucky-monday',     name:'Lucky Monday',        day:'Lundi',     buyin:80,  points:[22,16,13,11,9,8,7,6,5,4] },
  { id:'knockout-tuesday', name:'Tuesday Knock-Out',   day:'Mardi',     buyin:120, points:[31,23,18,15,13,11,10,9,8,7] },
  { id:'funrebuy-tuesday', name:'Fun Rebuy Tuesday',   day:'Mardi',     buyin:40,  points:[15,12,9,8,7,6,5,4,3,2] },
  { id:'mercredi-poker',   name:'Mercredi Poker Time', day:'Mercredi',  buyin:75,  points:[22,16,13,11,9,8,7,6,5,4] },
  { id:'small-jeudi',      name:'Small du Jeudi',      day:'Jeudi',     buyin:60,  points:[19,14,11,10,8,7,6,5,4,3] },
  { id:'friday-highstack', name:'Friday High Stack',   day:'Vendredi',  buyin:150, points:[32,24,19,16,14,12,11,10,9,8] },
  { id:'sunday-30k',       name:'Sunday 30K',          day:'Dimanche',  buyin:100, points:[26,19,15,13,11,10,9,8,7,6,5,4,3,2,1] },
  { id:'sunday-40k',       name:'Sunday 40K',          day:'Dimanche',  buyin:200, points:[58,43,35,29,25,22,19,17,16,14,13,12,11,10,9,8,7] },
  { id:'vsd',              name:'Le 33 (VSD)',          day:'Événement', buyin:330, points:[86,65,52,43,37,32,29,26,24,22,20,18,17,16,15,14,13,12,11,10] },
];

/* ══════════════════════════════════════════════════════
   TournamentsStore — accès centralisé à tournaments.json
   Priorité : FS > localStorage fallback > defaults
   La clé "points" est préservée lors des mises à jour
   partielles (prize-pool ne la connaît pas).
══════════════════════════════════════════════════════ */
const TournamentsStore = {
  FILE:   'tournaments.json',
  LS_KEY: 'tournaments_data',

  async read() {
    if (BarriereFS.connected) {
      const data = await BarriereFS.read(this.FILE, null);
      if (data && Array.isArray(data.tournaments) && data.tournaments.length > 0) {
        return data.tournaments;
      }
      /* Migration one-shot : récupère depuis barriere_data.json si configuré là-bas */
      const legacy = await BarriereFS.read('barriere_data.json', null);
      if (legacy && Array.isArray(legacy.tournaments) && legacy.tournaments.length > 0) {
        return legacy.tournaments;
      }
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem(this.LS_KEY) || 'null');
        if (stored && stored.length > 0) return stored;
      } catch {}
    }
    return [...TOURNAMENT_DEFAULTS];
  },

  async write(tournaments) {
    if (BarriereFS.connected) {
      await BarriereFS.write(this.FILE, { version: 1, tournaments });
    } else {
      localStorage.setItem(this.LS_KEY, JSON.stringify(tournaments));
    }
  },

  async add(t) {
    const list = await this.read();
    list.push(t);
    await this.write(list);
    return list;
  },

  /* Mise à jour partielle : préserve les champs non fournis (ex: points) */
  async update(id, changes) {
    const list = await this.read();
    const idx  = list.findIndex(t => t.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...changes };
    await this.write(list);
    return list;
  },

  async remove(id) {
    const list = (await this.read()).filter(t => t.id !== id);
    await this.write(list);
    return list;
  },
};
