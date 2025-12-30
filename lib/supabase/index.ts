/**
 * Supabase Client Exports
 *
 * Usage:
 *
 * Client Components:
 *   import { createClient } from '@/lib/supabase/client';
 *   const supabase = createClient();
 *
 * Server Components / API Routes:
 *   import { createClient } from '@/lib/supabase/server';
 *   const supabase = await createClient();
 *
 * Admin Operations (bypasses RLS):
 *   import { getAdminClient } from '@/lib/supabase/admin';
 *   const supabase = getAdminClient();
 */

// Re-export client creators
export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { getAdminClient, supabaseAdmin } from './admin';

// Re-export types
export type {
  Database,
  Operator,
  Profile,
  ComplianceRequirement,
  ComplianceStatus,
  ComplianceAuditLog,
  SyncLog,
} from './types';
