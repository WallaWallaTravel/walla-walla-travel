/**
 * Supabase Admin Client
 *
 * Uses the service role key - BYPASSES Row Level Security
 * Only use for:
 * - Background jobs
 * - Admin operations
 * - Data migrations
 * - Operations that need to access all data
 *
 * NEVER expose this client to the browser!
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Validate we have the service key
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn(
    '[Supabase Admin] SUPABASE_SERVICE_KEY not set - admin client will not work'
  );
}

// Create admin client (service role - bypasses RLS)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Get the admin client
 * Throws if service key is not configured
 */
export function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_KEY is required for admin operations. Check your .env.local file.'
    );
  }
  return supabaseAdmin;
}
