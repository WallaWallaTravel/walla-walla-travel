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
import { logger } from '@/lib/logger';

// Validate we have the required env vars
if (!process.env.SUPABASE_SERVICE_KEY) {
  logger.warn('Supabase Admin: SUPABASE_SERVICE_KEY not set - admin client will not work');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  logger.warn('Supabase Admin: NEXT_PUBLIC_SUPABASE_URL not set - admin client will not work');
}

// Create admin client lazily to avoid build-time errors
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY;

      if (!url || !key) {
        throw new Error('Supabase Admin: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
      }

      _supabaseAdmin = createClient<Database>(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return (_supabaseAdmin as unknown as Record<string, unknown>)[prop as string];
  }
});

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
