import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

interface ScoreRow {
  id: string | number;
  name: string;
  character_name?: string | null;
  score: number;
  created_at: string;
}

interface TotalRow {
  name: string;
  score: number;
  created_at: string;
}

interface VersusStatsRow {
  name: string;
  wins: number;
  losses: number;
  ties: number;
  total: number;
}

interface MatchRow {
  id: string;
  invite_code: string;
  challenger_name: string;
  recipient_name: string | null;
  challenger_score: number | null;
  recipient_score: number | null;
  status: 'pending' | 'playing' | 'complete';
  created_at: string;
  expires_at: string;
  level_id?: string | null;
  challenger_character_id?: string | null;
  recipient_character_id?: string | null;
}

interface ScoreQueryOptions {
  characterName?: string;
  sinceISO?: string;
}

interface ChallengeOptions {
  levelId?: string;
  characterId?: string;
}

export interface GlobalScoresApi {
  isProduction(): boolean;
  submit(name: unknown, score: number, characterName: unknown): Promise<string | number>;
  topN(n?: number, opts?: ScoreQueryOptions): Promise<ScoreRow[]>;
  topNPerPlayer(n?: number, opts?: ScoreQueryOptions): Promise<Array<ScoreRow & { rank: number }>>;
  allScores(maxRows?: number): Promise<Array<Pick<ScoreRow, 'name' | 'score'>>>;
  playerScores(name: unknown, maxRows?: number): Promise<ScoreRow[]>;
  firstAtMilestone(threshold: number): Promise<ScoreRow | null>;
  firstAtGameCounts(thresholds: number[]): Promise<Map<number, ScoreRow>>;
  firstAtTotalPoints(thresholds: number[]): Promise<Map<number, ScoreRow>>;
  mostTotalPointsLeader(): Promise<TotalRow | null>;
  mostGamesLeader(): Promise<TotalRow | null>;
  fetchVersusLeaderboard(maxRows?: number): Promise<VersusStatsRow[]>;
  fetchKnownPlayers(maxRows?: number): Promise<string[]>;
  createDirectChallenge(challengerName: unknown, recipientName: unknown, opts?: ChallengeOptions): Promise<MatchRow>;
  fetchMatchByCode(code: unknown): Promise<MatchRow>;
  fetchPendingForUser(name: unknown): Promise<MatchRow[]>;
  joinMatch(matchId: string, recipientName: unknown, opts?: ChallengeOptions): Promise<MatchRow>;
  setRecipientCharacter(matchId: string, characterId: unknown): Promise<MatchRow | null>;
  fetchRecentResultsForUser(name: unknown, sinceMs?: number): Promise<MatchRow[]>;
  fetchHistoryForUser(name: unknown): Promise<MatchRow[]>;
  fetchVersusRecord(name: unknown): Promise<{ wins: number; losses: number; ties: number; total: number }>;
  submitMatchScore(matchId: string, side: 'challenger' | 'recipient', score: number): Promise<MatchRow>;
}

const PROD_APEX = 'shoveltoss.ing';

function normalizeHost(h: unknown): string {
  return String(h || '').toLowerCase().replace(/\.$/, '');
}

function isProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = normalizeHost(window.location.hostname);
  return host === PROD_APEX || host.endsWith('.' + PROD_APEX);
}

let client: any = null;

function cleanName(name: unknown): string {
  const clean = String(name || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .trim()
    .slice(0, 20);
  return clean || 'Player';
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function cleanCharacterName(characterName: unknown): string {
  const clean = String(characterName || '').trim().slice(0, 20);
  return clean || 'Unknown';
}

function uniqueMatches(rows: MatchRow[][]): MatchRow[] {
  const seen = new Set<string>();
  const matches: MatchRow[] = [];
  for (const row of rows.flat()) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    matches.push(row);
  }
  return matches;
}

function getClient(): any {
  if (client) return client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('offline');
  }

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export const globalScores: GlobalScoresApi = {
  isProduction() {
    return isProductionHost();
  },

  async submit(name, score, characterName) {
    const { data, error } = await getClient()
      .from('high_scores')
      .insert({ name: cleanName(name), score, character_name: cleanCharacterName(characterName) })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async topN(n = 100, opts = {}) {
    let query = getClient()
      .from('high_scores')
      .select('id, name, character_name, score, created_at');
    if (opts.characterName) {
      query = query.eq('character_name', opts.characterName);
    }
    if (opts.sinceISO) {
      query = query.gte('created_at', opts.sinceISO);
    }
    const { data, error } = await query
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(n);
    if (error) throw error;
    return data || [];
  },

  async topNPerPlayer(n = 100, opts = {}) {
    const pageSize = 1000;
    const maxRows = 10000;
    const seen = new Set();
    const output = [];
    let from = 0;
    let globalRank = 1;
    let scanned = 0;

    while (output.length < n && scanned < maxRows) {
      let query = getClient()
        .from('high_scores')
        .select('id, name, character_name, score, created_at');
      if (opts.characterName) {
        query = query.eq('character_name', opts.characterName);
      }
      if (opts.sinceISO) {
        query = query.gte('created_at', opts.sinceISO);
      }
      const { data, error } = await query
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;

      const rows = data || [];
      for (const row of rows) {
        const name = cleanName(row.name);
        if (!seen.has(name)) {
          output.push({ ...row, rank: globalRank });
          seen.add(name);
        }
        globalRank += 1;
        scanned += 1;
        if (output.length >= n) break;
        if (scanned >= maxRows) break;
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }

    return output.slice(0, n);
  },

  async allScores(maxRows = 5000) {
    const { data, error } = await getClient()
      .from('high_scores')
      .select('name, score')
      .order('id', { ascending: true })
      .limit(maxRows);
    if (error) throw error;
    return data || [];
  },

  async playerScores(name, maxRows = 1000) {
    const cleaned = cleanName(name);
    const { data, error } = await getClient()
      .from('high_scores')
      .select('id, name, character_name, score, created_at')
      .eq('name', cleaned)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(maxRows);
    if (error) throw error;
    return data || [];
  },

  async firstAtMilestone(threshold) {
    const { data, error } = await getClient()
      .from('high_scores')
      .select('id, name, character_name, score, created_at')
      .gte('score', threshold)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  },

  async firstAtGameCounts(thresholds) {
    const result = new Map<number, ScoreRow>();
    const remaining = new Set(thresholds || []);
    if (remaining.size === 0) return result;
    const counts = new Map<string, number>();
    const pageSize = 1000;
    let from = 0;
    while (remaining.size > 0) {
      const { data, error } = await getClient()
        .from('high_scores')
        .select('id, name, character_name, score, created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = data || [];
      for (const row of rows) {
        const name = cleanName(row.name);
        const next = (counts.get(name) || 0) + 1;
        counts.set(name, next);
        if (remaining.has(next)) {
          result.set(next, row);
          remaining.delete(next);
          if (remaining.size === 0) break;
        }
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return result;
  },

  async firstAtTotalPoints(thresholds) {
    const result = new Map<number, ScoreRow>();
    const remaining = new Set(thresholds || []);
    if (remaining.size === 0) return result;
    const totals = new Map<string, number>();
    const pageSize = 1000;
    let from = 0;
    while (remaining.size > 0) {
      const { data, error } = await getClient()
        .from('high_scores')
        .select('id, name, character_name, score, created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = data || [];
      for (const row of rows) {
        const name = cleanName(row.name);
        const next = (totals.get(name) || 0) + (Number(row.score) || 0);
        totals.set(name, next);
        for (const threshold of Array.from(remaining)) {
          if (next >= threshold) {
            result.set(threshold, { ...row, name, score: next });
            remaining.delete(threshold);
          }
        }
        if (remaining.size === 0) break;
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return result;
  },

  async mostTotalPointsLeader() {
    const pageSize = 1000;
    const totals = new Map<string, TotalRow>();
    let from = 0;
    while (true) {
      const { data, error } = await getClient()
        .from('high_scores')
        .select('id, name, score, created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = data || [];
      rows.forEach((row: ScoreRow) => {
        const name = cleanName(row.name);
        const current = totals.get(name) || { name, score: 0, created_at: row.created_at };
        current.score += Number(row.score) || 0;
        totals.set(name, current);
      });
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return Array.from(totals.values())
      .sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.name.localeCompare(b.name))[0] || null;
  },

  async mostGamesLeader() {
    const pageSize = 1000;
    const totals = new Map<string, TotalRow>();
    let from = 0;
    while (true) {
      const { data, error } = await getClient()
        .from('high_scores')
        .select('id, name, created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = data || [];
      rows.forEach((row: ScoreRow) => {
        const name = cleanName(row.name);
        const current = totals.get(name) || { name, score: 0, created_at: row.created_at };
        current.score += 1;
        totals.set(name, current);
      });
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return Array.from(totals.values())
      .sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.name.localeCompare(b.name))[0] || null;
  },

  async fetchVersusLeaderboard(maxRows = 5000) {
    const { data, error } = await getClient()
      .from('matches')
      .select('challenger_name,recipient_name,challenger_score,recipient_score')
      .eq('status', 'complete')
      .not('challenger_score', 'is', null)
      .not('recipient_score', 'is', null)
      .limit(maxRows);
    if (error) throw error;
    const stats = new Map<string, VersusStatsRow>();
    const bump = (raw: unknown) => {
      const name = cleanName(raw);
      const key = name.toLowerCase();
      let row = stats.get(key);
      if (!row) {
        row = { name, wins: 0, losses: 0, ties: 0, total: 0 };
        stats.set(key, row);
      }
      return row;
    };
    for (const m of data || []) {
      if (m.challenger_score == null || m.recipient_score == null) continue;
      if (!m.challenger_name || !m.recipient_name) continue;
      const a = bump(m.challenger_name);
      const b = bump(m.recipient_name);
      if (m.challenger_score > m.recipient_score) { a.wins++; b.losses++; }
      else if (m.challenger_score < m.recipient_score) { a.losses++; b.wins++; }
      else { a.ties++; b.ties++; }
      a.total++; b.total++;
    }
    return Array.from(stats.values()).sort((x, y) => {
      const dx = x.wins - x.losses;
      const dy = y.wins - y.losses;
      if (dy !== dx) return dy - dx;
      if (y.wins !== x.wins) return y.wins - x.wins;
      if (y.total !== x.total) return y.total - x.total;
      return x.name.localeCompare(y.name, undefined, { sensitivity: 'base' });
    });
  },

  async fetchKnownPlayers(maxRows = 5000) {
    const { data, error } = await getClient()
      .from('high_scores')
      .select('name')
      .order('id', { ascending: false })
      .limit(maxRows);
    if (error) throw error;
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of data || []) {
      const n = cleanName(row.name);
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(n);
    }
    names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return names;
  },

  async createDirectChallenge(challengerName, recipientName, opts = {}) {
    const code = generateInviteCode();
    const insert: {
      invite_code: string;
      challenger_name: string;
      recipient_name: string;
      level_id?: string;
      challenger_character_id?: string;
    } = {
      invite_code: code,
      challenger_name: cleanName(challengerName),
      recipient_name: cleanName(recipientName),
    };
    if (opts.levelId) insert.level_id = String(opts.levelId).slice(0, 32);
    if (opts.characterId) insert.challenger_character_id = String(opts.characterId).slice(0, 32);
    const { data, error } = await getClient()
      .from('matches')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async fetchMatchByCode(code) {
    const { data, error } = await getClient()
      .from('matches')
      .select('*')
      .eq('invite_code', String(code || '').trim().toUpperCase())
      .single();
    if (error) throw error;
    return data;
  },

  async fetchPendingForUser(name) {
    const clean = cleanName(name);
    const base = () => getClient()
      .from('matches')
      .select('*')
      .not('recipient_name', 'is', null)
      .in('status', ['pending', 'playing'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    const [recipient, challenger] = await Promise.all([
      base().ilike('recipient_name', clean),
      base().ilike('challenger_name', clean)
    ]);
    if (recipient.error) throw recipient.error;
    if (challenger.error) throw challenger.error;
    return uniqueMatches([recipient.data || [], challenger.data || []])
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  },

  async joinMatch(matchId, recipientName, opts = {}) {
    const update: {
      recipient_name: string;
      status: 'playing';
      recipient_character_id?: string;
    } = { recipient_name: cleanName(recipientName), status: 'playing' };
    if (opts.characterId) update.recipient_character_id = String(opts.characterId).slice(0, 32);
    const { data, error } = await getClient()
      .from('matches')
      .update(update)
      .eq('id', matchId)
      .is('recipient_name', null)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async setRecipientCharacter(matchId, characterId) {
    const id = String(characterId || '').slice(0, 32);
    if (!id) return null;
    const { data, error } = await getClient()
      .from('matches')
      .update({ recipient_character_id: id })
      .eq('id', matchId)
      .is('recipient_character_id', null)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async fetchRecentResultsForUser(name, sinceMs = 14 * 24 * 60 * 60 * 1000) {
    const clean = cleanName(name);
    const since = new Date(Date.now() - sinceMs).toISOString();
    const base = () => getClient()
      .from('matches')
      .select('*')
      .eq('status', 'complete')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);
    const [recipient, challenger] = await Promise.all([
      base().ilike('recipient_name', clean),
      base().ilike('challenger_name', clean)
    ]);
    if (recipient.error) throw recipient.error;
    if (challenger.error) throw challenger.error;
    return uniqueMatches([recipient.data || [], challenger.data || []])
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 50);
  },

  async fetchHistoryForUser(name) {
    const clean = cleanName(name);
    const base = () => getClient()
      .from('matches')
      .select('*')
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(50);
    const [recipient, challenger] = await Promise.all([
      base().ilike('recipient_name', clean),
      base().ilike('challenger_name', clean)
    ]);
    if (recipient.error) throw recipient.error;
    if (challenger.error) throw challenger.error;
    return uniqueMatches([recipient.data || [], challenger.data || []])
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 50);
  },

  async fetchVersusRecord(name) {
    const cleaned = cleanName(name);
    const base = () => getClient()
      .from('matches')
      .select('*')
      .eq('status', 'complete');
    const [recipient, challenger] = await Promise.all([
      base().ilike('recipient_name', cleaned),
      base().ilike('challenger_name', cleaned)
    ]);
    if (recipient.error) throw recipient.error;
    if (challenger.error) throw challenger.error;
    const data = uniqueMatches([recipient.data || [], challenger.data || []]);
    let wins = 0, losses = 0, ties = 0;
    for (const m of data || []) {
      const isChallenger = m.challenger_name.toLowerCase() === cleaned.toLowerCase();
      const mine = isChallenger ? m.challenger_score : m.recipient_score;
      const theirs = isChallenger ? m.recipient_score : m.challenger_score;
      if (mine == null || theirs == null) continue;
      if (mine > theirs) wins++;
      else if (mine < theirs) losses++;
      else ties++;
    }
    return { wins, losses, ties, total: wins + losses + ties };
  },

  async submitMatchScore(matchId, side, score) {
    const update: {
      challenger_score?: number;
      challenger_finished_at?: string;
      recipient_score?: number;
      recipient_finished_at?: string;
      status?: 'playing' | 'complete';
    } = side === 'challenger'
      ? { challenger_score: score, challenger_finished_at: new Date().toISOString() }
      : { recipient_score: score, recipient_finished_at: new Date().toISOString() };
    const { data: row, error: readErr } = await getClient()
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    if (readErr) throw readErr;
    const otherDone = side === 'challenger' ? row.recipient_score != null : row.challenger_score != null;
    update.status = otherDone ? 'complete' : 'playing';
    const { data, error } = await getClient()
      .from('matches')
      .update(update)
      .eq('id', matchId)
      .is(side === 'challenger' ? 'challenger_score' : 'recipient_score', null)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
};
