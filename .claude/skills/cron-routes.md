---
name: cron-routes
description: Cron job patterns and conventions. Use when creating or modifying scheduled tasks.
---

## Auth Pattern
All cron routes use `withCronAuth('job-name', handler)` with:
- `crypto.timingSafeEqual` for CRON_SECRET comparison
- Job name logging on every invocation

## Logging
Every cron logs: job name, start time, duration, response status.

## Registration
All crons registered in `vercel.json`. Currently 24+ routes.

## Key Crons
- `cleanup-sessions`: daily, removes expired sessions
- `process-queue`: every 5min, processes retry queue with type-safe handlers + anti-re-queue loops
- `daily-health`: daily health check
