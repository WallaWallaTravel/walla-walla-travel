---
name: session-hardening
description: Session management architecture — JWT, idle timeouts, revocation, touchSession. Use when modifying auth, session, or login/logout flows.
---

## Session Architecture
- Server-side `user_sessions` table with `session_id` (UUID) embedded in JWT as `sid` claim
- On login: revoke all previous sessions → create new row → embed `sid` in JWT
- On logout: revoke specific session by `sid`
- On password change: `revokeAllUserSessions(userId)` — forces re-login everywhere

## Validation Flow (in withAuth)
1. Check `sid` exists in JWT
2. Check session not revoked in DB
3. Check within idle timeout (30min admin / 24h regular user)
4. `touchSession` throttled to 5-minute intervals via DB timestamp comparison
   - NOT in-memory Map — won't survive serverless cold starts

## Backward Compatibility
- Old JWTs without `sid`: skip DB check, expire naturally within 7 days
- DB failure fallback: fall back to JWT-only validation (don't lock everyone out)

## Cleanup
- `cleanup-sessions` cron runs daily (registered in `vercel.json`)
