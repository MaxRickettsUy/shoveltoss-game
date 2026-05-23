declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export interface SupabaseClient {
    from(table: string): any;
  }

  export function createClient(supabaseUrl: string, supabaseKey: string): SupabaseClient;
}
