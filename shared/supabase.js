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
  id: Number(r.id), date: r.date, tournamentId: r.tournament_id,
  place: r.place, player: r.player, points: r.points, extra: r.extra
});
const _fromResult = r => ({
  date: r.date, tournament_id: r.tournamentId,
  place: r.place, player: r.player, points: r.points, extra: r.extra || false
});

const _toSession = r => ({
  id: Number(r.id), date: r.date, tournamentId: r.tournament_id,
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

// ── Helpers ─────────────────────────────────────────

function _chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Interface publique SB ────────────────────────────

const SB = {

  // ── Résultats ──────────────────────────────────────
  async getResults() {
    const rows = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await _sb.from('results')
        .select('*').order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return rows.map(_toResult);
  },

  async getResultsByMonth(yearMonth) {
    const { data, error } = await _sb.from('results')
      .select('*')
      .gte('date', `${yearMonth}-01`)
      .lte('date', `${yearMonth}-31`);
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
    const rows = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await _sb.from('sessions')
        .select('*').order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return rows.map(_toSession);
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
  async signInWithPassword(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },

  async resetPassword(email) {
    const { error } = await _sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://fideliuss.github.io/gestion-tournois/login.html'
    });
    if (error) throw error;
  },

  async updatePassword(password) {
    const { error } = await _sb.auth.updateUser({ password });
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

  // ── Rôles & Permissions ────────────────────────────
  async getRoles() {
    const { data, error } = await _sb.from('app_roles').select('*').order('slug');
    if (error) throw error;
    return data || [];
  },

  async upsertRole(slug, label, panels, color = null) {
    const { error } = await _sb.from('app_roles')
      .upsert({ slug, label, panels, color }, { onConflict: 'slug' });
    if (error) throw error;
  },

  async deleteRole(slug) {
    const { error } = await _sb.from('app_roles').delete().eq('slug', slug);
    if (error) throw error;
  },

  // ── Gestion des comptes (Edge Function) ───────────
  async _callUsers(method, body) {
    const session = await this.getSession();
    if (!session) throw new Error('Non authentifié');
    const opts = {
      method,
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(SUPABASE_URL + '/functions/v1/manage-users', opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  },

  async listUsers() {
    return (await this._callUsers('GET')).users;
  },

  async createUser(email, password, role) {
    return (await this._callUsers('POST', { email, password, role })).user;
  },

  async updateUser(id, changes) {
    return this._callUsers('PATCH', { id, ...changes });
  },

  async deleteUser(id) {
    return this._callUsers('DELETE', { id });
  },

  // ── Training ───────────────────────────────────────
  async getTrainingConfig(game) {
    const { data, error } = await _sb.from('training_config')
      .select('value').eq('key', game).single();
    if (error) throw error;
    return data.value;
  },

  async updateTrainingConfig(game, value) {
    const { error } = await _sb.from('training_config')
      .upsert({ key: game, value }, { onConflict: 'key' });
    if (error) throw error;
  },

  async startTrainingSession(game) {
    const session = await this.getSession();
    if (!session) throw new Error('Non authentifié');
    // Supprime les sessions incomplètes existantes (même user + même jeu)
    await _sb.from('training_sessions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('game', game)
      .is('ended_at', null);
    const { data, error } = await _sb.from('training_sessions')
      .insert({ user_id: session.user.id, game }).select().single();
    if (error) throw error;
    return data;
  },

  async endTrainingSession(sessionId, total, correct) {
    const { error } = await _sb.from('training_sessions')
      .update({ ended_at: new Date().toISOString(), total, correct })
      .eq('id', sessionId);
    if (error) throw error;
  },

  async addTrainingResult(sessionId, userId, game, scenario, correctAnswer, userAnswer, isCorrect) {
    const { error } = await _sb.from('training_results').insert({
      session_id: sessionId, user_id: userId, game, scenario,
      correct_answer: correctAnswer, user_answer: userAnswer, is_correct: isCorrect
    });
    if (error) throw error;
  },

  async getMyTrainingSessions(game) {
    const session = await this.getSession();
    if (!session) throw new Error('Non authentifié');
    const q = _sb.from('training_sessions')
      .select('*').eq('user_id', session.user.id).not('ended_at', 'is', null)
      .order('started_at', { ascending: false });
    if (game) q.eq('game', game);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // ── Import (outil de migration) ────────────────────
  async clearAll() {
    await _sb.from('results').delete().neq('id', 0);
    await _sb.from('sessions').delete().neq('id', 0);
    await _sb.from('tournaments').delete().neq('id', '');
    await _sb.from('extras').delete().neq('id', '');
  },

  // Compte les lignes d'une table (évite le max-rows des SELECT)
  async countRows(table) {
    const { count, error } = await _sb.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count;
  },

  async importData({ results, sessions, tournaments, extras, onProgress } = {}) {
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
      const rows    = results.map(_fromResult);
      const chunks  = _chunk(rows, 500);
      let inserted  = 0;
      for (const chunk of chunks) {
        const { error } = await _sb.from('results').insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
        if (onProgress) onProgress(inserted, rows.length);
      }
    }
    if (extras && extras.length) {
      const { error } = await _sb.from('extras')
        .upsert(extras.map(_fromExtra));
      if (error) throw error;
    }
  }
};
