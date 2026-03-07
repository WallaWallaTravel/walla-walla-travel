/**
 * Auth.js v5 Route Handler
 *
 * Handles /api/auth/* routes for Auth.js (signin, signout, callback, session, etc.)
 * Coexists with the existing /api/auth/login, /api/auth/logout routes.
 */

import { handlers } from '@/auth'

export const { GET, POST } = handlers
