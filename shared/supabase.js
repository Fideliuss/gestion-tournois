// ══════════════════════════════════════════════════════
//  SUPABASE - client et couche de données
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

  // ── Saisons clôturées (challenge saisonnier) ───────
  // Saison = année de début (2025 → 2025 / 2026). Une saison clôturée est verrouillée côté base (triggers).
  async getSeasonClosures() {
    const { data, error } = await _sb.from('saisons_cloturees').select('*');
    if (error) throw error;
    return (data || []).map(r => ({ season: r.saison, closedAt: r.cloturee_le }));
  },

  async closeSeason(season) {
    const { error } = await _sb.from('saisons_cloturees').insert({ saison: season });
    if (error) throw error;
  },

  async reopenSeason(season) {
    const { error } = await _sb.from('saisons_cloturees').delete().eq('saison', season);
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

  // currentPassword : exigé par le projet (Authentication > Email > « Require current password when updating »), sauf
  // après un lien de réinitialisation où l'on ne le connaît plus (voir login.html)
  async updatePassword(password, currentPassword) {
    const attrs = currentPassword ? { password, current_password: currentPassword } : { password };
    const { error } = await _sb.auth.updateUser(attrs);
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

  // names : { firstName, lastName } (facultatif)
  async createUser(email, password, role, names) {
    return (await this._callUsers('POST', Object.assign({ email, password, role }, names || {}))).user;
  },

  async updateUser(id, changes) {
    return this._callUsers('PATCH', { id, ...changes });
  },

  async deleteUser(id) {
    return this._callUsers('DELETE', { id });
  },

  // ── Journal d'audit (lecture réservée aux admins par la RLS ; aucune écriture possible depuis le navigateur) ──
  // Les plus récentes d'abord. since : date ISO minimale ; objet : domaine ('compte', 'extras'...) ; avant : id de la dernière ligne reçue
  async getJournal({ since, objet, avant, limite = 100 } = {}) {
    let q = _sb.from('journal_audit').select('*').order('id', { ascending: false }).limit(limite);
    if (since) q = q.gte('at', since);
    if (objet) q = q.eq('objet', objet);
    if (avant) q = q.lt('id', avant);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
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

  // meta : contexte de la session (level, ratio, chipValue...) - exploité par le suivi (Phase 3)
  async startTrainingSession(game, meta) {
    const session = await this.getSession();
    if (!session) throw new Error('Non authentifié');

    // Récupère les sessions incomplètes à nettoyer
    const { data: oldSessions } = await _sb.from('training_sessions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('game', game)
      .is('ended_at', null);

    if (oldSessions && oldSessions.length) {
      const ids = oldSessions.map(function(s) { return s.id; });
      // Supprime d'abord les résultats liés (évite les conflits RLS sur CASCADE)
      await _sb.from('training_results').delete().in('session_id', ids);
      // Puis les sessions
      await _sb.from('training_sessions').delete().in('id', ids);
    }

    // user_label dénormalisé : le navigateur ne peut pas lire auth.users (vue manager)
    const label = (session.user.email || '').split('@')[0] || null;
    const { data, error } = await _sb.from('training_sessions')
      .insert({ user_id: session.user.id, game, user_label: label, meta: meta || {} })
      .select().single();
    if (error) throw error;
    return data;
  },

  // meta (optionnel) remplace le meta de départ - le module passe l'objet complet (ex. { ratio, elapsedMs })
  async endTrainingSession(sessionId, total, correct, meta) {
    const patch = { ended_at: new Date().toISOString(), total, correct };
    if (meta) patch.meta = meta;
    const { error } = await _sb.from('training_sessions')
      .update(patch)
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

  // ── Suivi manager (Phase 3) ────────────────────────
  // Fonctions SQL en SECURITY INVOKER : la RLS limite l'appelant (un non-manager ne reçoit que ses propres lignes)
  async _rpc(fn, args) {
    const { data, error } = await _sb.rpc(fn, args || {});
    if (error) throw error;
    return data || [];
  },

  getTrainingRanking(game, level, minSessions) {
    return this._rpc('training_ranking', { p_game: game, p_level: level || null, p_min: minSessions || 3 });
  },

  getTrainingTablesBest(ratio) {
    return this._rpc('training_tables_best', { p_ratio: ratio || null });
  },

  getTrainingWeakPoints(game, userId) {
    return this._rpc('training_weak_points', { p_game: game, p_user: userId || null });
  },

  getTrainingActivity(days) {
    return this._rpc('training_activity', { p_days: days || 30 });
  },

  getTrainingActivityWeekly(weeks) {
    return this._rpc('training_activity_weekly', { p_weeks: weeks || 12 });
  },

  // Sessions terminées d'un croupier précis (vue Progression) - lecture réservée aux managers par la RLS
  async getTrainingSessionsOf(userId, game) {
    const q = _sb.from('training_sessions')
      .select('*').eq('user_id', userId).not('ended_at', 'is', null)
      .order('started_at', { ascending: false }).limit(1000);
    if (game) q.eq('game', game);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // ── Break list (planning mensuel et réglages) ───────
  // mois : 'AAAA-MM'. Un planning par mois : l'enregistrer remplace l'ancien en entier
  async getBreakListPlanning(mois) {
    const { data, error } = await _sb.from('breaklist_plannings').select('data').eq('mois', mois).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  },

  async listBreakListPlannings() {
    const { data, error } = await _sb.from('breaklist_plannings').select('mois, updated_at').order('mois', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveBreakListPlanning(mois, planning) {
    const { error } = await _sb.from('breaklist_plannings')
      .upsert({ mois, data: planning, updated_at: new Date().toISOString() }, { onConflict: 'mois' });
    if (error) throw error;
  },

  async deleteBreakListPlanning(mois) {
    const { error } = await _sb.from('breaklist_plannings').delete().eq('mois', mois);
    if (error) throw error;
  },

  async getBreakListConfig() {
    const { data, error } = await _sb.from('breaklist_config').select('value').eq('key', 'config').maybeSingle();
    if (error) throw error;
    return data ? data.value : null;
  },

  async saveBreakListConfig(value) {
    const { error } = await _sb.from('breaklist_config')
      .upsert({ key: 'config', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  },

  // ── Paramètres partagés entre les postes (table parametres, voir supabase/migrations/parametres.sql) ──
  // Renvoie la valeur JSON de la clé, ou null si elle n'existe pas encore
  async getParametre(cle) {
    const { data, error } = await _sb.from('parametres').select('valeur').eq('cle', cle).maybeSingle();
    if (error) throw error;
    return data ? data.valeur : null;
  },

  // Toutes les clés qui commencent par un préfixe : [{ cle, valeur }] (voir shared/reglages.js). Le _ est un joker en LIKE : échappé
  async getParametres(prefixe) {
    const motif = String(prefixe).replace(/[\\_%]/g, '\\$&') + '%';
    const { data, error } = await _sb.from('parametres').select('cle, valeur').like('cle', motif).order('cle');
    if (error) throw error;
    return data || [];
  },

  async saveParametre(cle, valeur) {
    const { error } = await _sb.from('parametres')
      .upsert({ cle, valeur, updated_at: new Date().toISOString() }, { onConflict: 'cle' });
    if (error) throw error;
  },

  // ── Règlement TDA (lecture seule) ───────────────────
  // L'édition active seulement (RLS), réservée au panel 'tda'. Le contenu est importé par l'administrateur technique (voir CONTEXT.md).
  // Édition active + tous ses blocs (≈ 170 lignes, < 1000 : pas de pagination), ou null si aucune édition n'est active
  async getTdaActive() {
    const { data: ed, error } = await _sb.from('tda_editions').select('*').eq('active', true).maybeSingle();
    if (error) throw error;
    if (!ed) return null;
    const { data: blocs, error: e2 } = await _sb.from('tda_blocs')
      .select('id, kind, numero, section, titre, ordre, data').eq('edition_id', ed.id).order('ordre');
    if (e2) throw e2;
    return { edition: ed, blocs: blocs || [] };
  },

  // ── Matériel de jeu (voir supabase/migrations/materiel.sql) ────────────────────
  // Les règles (séquence des statuts, retours avec motif, unicité, jeu fixé) sont imposées par la base : ces méthodes lisent et écrivent,
  // une action interdite revient en erreur avec un message déjà rédigé en français.

  // Référentiels : jeux, statuts, transitions, marques, sessions de destruction
  async getMaterielRef() {
    const lire = async (table, tri) => {
      const { data, error } = await _sb.from(table).select('*').order(tri);
      if (error) throw error;
      return data || [];
    };
    const [jeux, statuts, transitions, marques, destructions] = await Promise.all([
      lire('materiel_jeux', 'ordre'), lire('materiel_statuts', 'ordre'), lire('materiel_transitions', 'famille'), lire('materiel_marques', 'nom'),
      lire('materiel_destructions', 'cree_le'),
    ]);
    return { jeux, statuts, transitions, marques, destructions };
  },

  // Toutes les fiches d'une famille (par pages : la limite de 1000 lignes de Supabase)
  async listMaterielPieces(famille) {
    const rows = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await _sb.from('materiel_pieces').select('*').eq('famille', famille).order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return rows;
  },

  async getMaterielHistorique(pieceId) {
    const { data, error } = await _sb.from('materiel_historique').select('*').eq('piece_id', pieceId).order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Ajoute plusieurs fiches d'un coup (tout ou rien) : [{ famille, identifiant, jeu, finition, statut, marque_id? }]
  async createMaterielPieces(fiches) {
    const { data, error } = await _sb.from('materiel_pieces').insert(fiches).select('*');
    if (error) throw error;
    return data || [];
  },

  // Fait passer des fiches à un statut (tout ou rien) ; `motif` obligatoire pour un retour en arrière, `sessionId` pour « Détruit »
  async changerMaterielStatut(ids, vers, options) {
    const o = options || {};
    const champs = { statut: vers };
    if (o.motif) champs.motif_changement = o.motif;
    if (o.sessionId) champs.session_destruction_id = o.sessionId;
    const { data, error } = await _sb.from('materiel_pieces').update(champs).in('id', ids).select('*');
    if (error) throw error;
    return data || [];
  },

  // Marque et note : les seuls champs d'une fiche qui se modifient
  async updateMaterielPieces(ids, patch) {
    const champs = {};
    ['marque_id', 'note'].forEach(function (k) { if (patch[k] !== undefined) champs[k] = patch[k]; });
    const { data, error } = await _sb.from('materiel_pieces').update(champs).in('id', ids).select('*');
    if (error) throw error;
    return data || [];
  },

  async deleteMaterielPiece(id) {
    const { error } = await _sb.from('materiel_pieces').delete().eq('id', id);
    if (error) throw error;
  },

  async createMaterielMarque(nom) {
    const { data, error } = await _sb.from('materiel_marques').insert({ nom }).select('*').single();
    if (error) throw error;
    return data;
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
