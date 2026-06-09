// ══════════════════════════════════════════════════════
//  SUPABASE — client et couche de données
//  Doit être chargé APRÈS le CDN supabase-js
// ══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://grpzgidhawyhinzrqiqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VZAQKZ7-nogh89wzknGq5Q_mCXd7XXv';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Mappers camelCase JS ↔ snake_case DB ────────────

const _toExtra = r => ({
  id: r.id, nom: r.nom, prenom: r.prenom,
  dateNaissance: r.date_naissance, lieuNaissance: r.lieu_naissance,
  adresse: r.adresse, codePostal: r.code_postal, ville: r.ville
});
const _fromExtra = e => ({
  id: e.id, nom: e.nom, prenom: e.prenom,
  date_naissance: e.dateNaissance || null,
  lieu_naissance: e.lieuNaissance || null,
  adresse: e.adresse || null,
  code_postal: e.codePostal || null,
  ville: e.ville || null
});

const _toResult = r => ({
  id: r.id, date: r.date, tournamentId: r.tournament_id,
  place: r.place, player: r.player, points: r.points, extra: r.extra
});
const _fromResult = r => ({
  date: r.date, tournament_id: r.tournamentId,
  place: r.place, player: r.player, points: r.points, extra: r.extra || false
});

const _toSession = r => ({
  id: r.id, date: r.date, tournamentId: r.tournament_id,
  entries: r.entries, cagnotte: r.cagnotte, nbResults: r.nb_results
});
const _fromSession = s => ({
  date: s.date, tournament_id: s.tournamentId,
  entries: s.entries || 0, cagnotte: s.cagnotte || 0, nb_results: s.nbResults || 0
});

const _toTournament = r => ({
  id: r.id, name: r.name, day: r.day,
  buyin: r.buyin, pp: r.pp, frais: r.frais, points: r.points || []
});
const _fromTournament = t => ({
  id: t.id, name: t.name, day: t.day,
  buyin: t.buyin, pp: t.pp || null, frais: t.frais || null, points: t.points || []
});

// ── Interface publique SB ────────────────────────────

const SB = {

  // ── Résultats ──────────────────────────────────────
  async getResults() {
    const { data, error } = await _sb.from('results').select('*');
    if (error) throw error;
    return (data || []).map(_toResult);
  },

  async insertResults(results) {
    const { data, error } = await _sb.from('results')
      .insert(results.map(_fromResult)).select();
    if (error) throw error;
    return (data || []).map(_toResult);
  },

  async updateResult(id, changes) {
    const { error } = await _sb.from('results')
      .update(_fromResult(changes)).eq('id', id);
    if (error) throw error;
  },

  async deleteResult(id) {
    const { error } = await _sb.from('results').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteResultsBySession(date, tournamentId) {
    const { error } = await _sb.from('results').delete()
      .eq('date', date).eq('tournament_id', tournamentId);
    if (error) throw error;
  },

  // ── Sessions ───────────────────────────────────────
  async getSessions() {
    const { data, error } = await _sb.from('sessions').select('*');
    if (error) throw error;
    return (data || []).map(_toSession);
  },

  async insertSession(session) {
    const { data, error } = await _sb.from('sessions')
      .insert(_fromSession(session)).select().single();
    if (error) throw error;
    return _toSession(data);
  },

  async updateSession(id, changes) {
    const { error } = await _sb.from('sessions')
      .update(_fromSession(changes)).eq('id', id);
    if (error) throw error;
  },

  async deleteSession(id) {
    const { error } = await _sb.from('sessions').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Tournois ───────────────────────────────────────
  async getTournaments() {
    const { data, error } = await _sb.from('tournaments').select('*');
    if (error) throw error;
    return (data || []).map(_toTournament);
  },

  async upsertTournament(tournament) {
    const { error } = await _sb.from('tournaments')
      .upsert(_fromTournament(tournament));
    if (error) throw error;
  },

  async deleteTournament(id) {
    const { error } = await _sb.from('tournaments').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Auth ───────────────────────────────────────────
  async signInWithGoogle() {
    const { error } = await _sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://fideliuss.github.io/gestion-tournois/login.html',
        queryParams: { hd: 'groupebarriere.com' }   // hint Google : comptes pro uniquement
      }
    });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await _sb.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await _sb.auth.getSession();
    return session;
  },

  onAuthStateChange(cb) {
    return _sb.auth.onAuthStateChange(cb);
  },

  // ── Extras ─────────────────────────────────────────
  async getExtras() {
    const { data, error } = await _sb.from('extras').select('*').order('nom');
    if (error) throw error;
    return (data || []).map(_toExtra);
  },

  async insertExtra(extra) {
    const { error } = await _sb.from('extras').insert(_fromExtra(extra));
    if (error) throw error;
  },

  async updateExtra(id, changes) {
    const { error } = await _sb.from('extras').update(_fromExtra(changes)).eq('id', id);
    if (error) throw error;
  },

  async deleteExtra(id) {
    const { error } = await _sb.from('extras').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Import (outil de migration) ────────────────────
  async clearAll() {
    await _sb.from('results').delete().neq('id', 0);
    await _sb.from('sessions').delete().neq('id', 0);
    await _sb.from('tournaments').delete().neq('id', '');
    await _sb.from('extras').delete().neq('id', '');
  },

  async importData({ results, sessions, tournaments, extras }) {
    if (tournaments && tournaments.length) {
      const { error } = await _sb.from('tournaments')
        .upsert(tournaments.map(_fromTournament));
      if (error) throw error;
    }
    if (sessions && sessions.length) {
      const { error } = await _sb.from('sessions')
        .insert(sessions.map(_fromSession));
      if (error) throw error;
    }
    if (results && results.length) {
      const { error } = await _sb.from('results')
        .insert(results.map(_fromResult));
      if (error) throw error;
    }
    if (extras && extras.length) {
      const { error } = await _sb.from('extras')
        .upsert(extras.map(_fromExtra));
      if (error) throw error;
    }
  }
};
