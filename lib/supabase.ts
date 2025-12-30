/**
 * Supabase Client Exports
 *
 * This file re-exports from the @/lib/supabase/ directory for backward compatibility.
 * New code should import directly from @/lib/supabase/client or @/lib/supabase/server.
 *
 * Usage:
 *
 * Client Components (browser):
 *   import { createBrowserClient } from '@/lib/supabase';
 *   const supabase = createBrowserClient();
 *
 * Server Components / API Routes:
 *   import { createServerClient } from '@/lib/supabase';
 *   const supabase = await createServerClient();
 *
 * Admin Operations (bypasses RLS):
 *   import { supabaseAdmin } from '@/lib/supabase';
 */

// Re-export everything from the supabase directory
export * from './supabase/index';

// Also provide a default 'supabase' export for legacy compatibility
// This creates a browser client - for server-side use createServerClient instead
import { createClient } from './supabase/client';

// Lazy-initialize browser client for legacy imports
let _browserClient: ReturnType<typeof createClient> | null = null;

/**
 * Get the browser Supabase client (for client components)
 * @deprecated Use `import { createBrowserClient } from '@/lib/supabase'` instead
 */
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (typeof window === 'undefined') {
      // Server-side: warn and return a stub
      console.warn(
        '[Supabase] Accessed browser client on server. Use createServerClient() for server components.'
      );
      return () => Promise.resolve({ data: null, error: new Error('Use createServerClient on server') });
    }

    if (!_browserClient) {
      _browserClient = createClient();
    }
    return (_browserClient as Record<string, unknown>)[prop as string];
  },
});
