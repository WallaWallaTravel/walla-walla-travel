/**
 * Supabase Browser Client
 *
 * For use in client components (React hooks, event handlers, etc.)
 * Uses the anon key - respects Row Level Security
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Singleton client for browser
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}

// Re-export for convenience
export { createClient as createBrowserClient };
