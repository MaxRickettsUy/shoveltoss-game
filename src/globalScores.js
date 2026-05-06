import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PROD_APEX = 'shoveltoss.ing';

function normalizeHost(h) {
  return String(h || '').toLowerCase().replace(/\.$/, '');
}

function isProductionHost() {
  if (typeof window === 'undefined') return false;
  const host = normalizeHost(window.location.hostname);
  return host === PROD_APEX || host.endsWith('.' + PROD_APEX);
}

let client = null;

function cleanName(name) {
  const clean = String(name || '').trim().slice(0, 20);
  return clean || 'Player';
}

function cleanCharacterName(characterName) {
  const clean = String(characterName || '').trim().slice(0, 20);
  return clean || 'Unknown';
}

function getClient() {
  if (client) return client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('offline');
  }

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

window.globalScores = {
  isProduction() {
    return isProductionHost();
  },

  async submit(name, score, characterName) {
    if (!isProductionHost()) {
      const err = new Error('disabled-non-prod');
      err.code = 'disabled-non-prod';
      throw err;
    }
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

  async allScores(maxRows = 5000) {
    const { data, error } = await getClient()
      .from('high_scores')
      .select('name, score')
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
    const result = new Map();
    const remaining = new Set(thresholds || []);
    if (remaining.size === 0) return result;
    const counts = new Map();
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

  async mostTotalPointsLeader() {
    const pageSize = 1000;
    const totals = new Map();
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
      rows.forEach(row => {
        const name = cleanName(row.name);
        const current = totals.get(name) || { name, score: 0, created_at: row.created_at };
        current.score += Number(row.score) || 0;
        totals.set(name, current);
      });
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return Array.from(totals.values())
      .sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at) || a.name.localeCompare(b.name))[0] || null;
  },

  async mostGamesLeader() {
    const pageSize = 1000;
    const totals = new Map();
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
      rows.forEach(row => {
        const name = cleanName(row.name);
        const current = totals.get(name) || { name, score: 0, created_at: row.created_at };
        current.score += 1;
        totals.set(name, current);
      });
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return Array.from(totals.values())
      .sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at) || a.name.localeCompare(b.name))[0] || null;
  }
};
