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
    const { error } = await getClient()
      .from('high_scores')
      .insert({ name: cleanName(name), score, character_name: cleanCharacterName(characterName) });
    if (error) throw error;
  },

  async topN(n = 100) {
    const { data, error } = await getClient()
      .from('high_scores')
      .select('name, character_name, score, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(n);
    if (error) throw error;
    return data || [];
  }
};
