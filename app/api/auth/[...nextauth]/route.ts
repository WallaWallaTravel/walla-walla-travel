/**
 * Auth.js v5 Route Handler
 *
 * TEMPORARILY DISABLED: Auth.js routes are disabled while the old JWT
 * auth system is primary. The handlers are stubs from auth.ts when
 * AUTH_SECRET is missing, or real Auth.js handlers when configured.
 *
 * The old auth system (/api/auth/login, /api/auth/logout) handles
 * all authentication. This catch-all is kept to prevent 404s on
 * Auth.js callback URLs.
 */

import { handlers } from '@/auth'

export const { GET, POST } = handlers
