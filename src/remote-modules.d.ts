declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string
  ): import('@supabase/supabase-js').SupabaseClient;
}
