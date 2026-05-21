const PROD_SUPABASE_URL = 'https://qwekapzaneffdfkxnljs.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'sb_publishable_GOxanaUREDs2Mrn9C74Aig_1b2qmjO9';
const LOCAL_SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const PROD_APEX = 'shoveltoss.ing';
const host = typeof window === 'undefined'
  ? ''
  : String(window.location.hostname || '').toLowerCase().replace(/\.$/, '');
const isProductionHost = host === PROD_APEX || host.endsWith(`.${PROD_APEX}`);
const localSupabaseHost = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  ? '127.0.0.1'
  : host;
const localSupabaseUrl = `http://${localSupabaseHost}:54321`;

export const SUPABASE_URL = isProductionHost ? PROD_SUPABASE_URL : localSupabaseUrl;
export const SUPABASE_ANON_KEY = isProductionHost ? PROD_SUPABASE_ANON_KEY : LOCAL_SUPABASE_ANON_KEY;
