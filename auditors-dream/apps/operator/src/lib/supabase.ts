import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper for typed queries
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updateable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
