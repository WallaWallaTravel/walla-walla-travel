---
name: monitoring
description: Health checks, Sentry, Vercel deployment status. Use when debugging production issues or checking system health.
---

## Health Endpoint
- URL: `wallawalla.travel/api/health`
- Returns: DB status + latency
- Latency >400ms = elevated but functional

## Sentry
- Active: client + server + edge
- Error boundaries configured
- Data scrubbing active
- Error-to-issue pipeline: Sentry webhook → GitHub issue automatically

## Vercel
- Dashboard: `vercel.com/walla-walla-travel-app/walla-walla-final`
- Logs: `vercel.com/walla-walla-travel-app/walla-walla-final/logs`
- Enhanced Builds (16GB), ESLint skipped, ~4m 25s build time
- Auto-deploys on push to main

## GitHub Actions
- Health checks: 3x daily + on every push
- Morning briefing cron: 8am Pacific
- Failed CI → GitHub issue automatically
- Weekly storage backup for Supabase media files

## Chrome MCP Verification (done in Chat, NOT in Claude Code)
After pushing, verification happens in the Claude.ai Chat/Projects interface:
1. Navigate to page
2. `read_network_requests` (clear: true) — check for 500s or unexpected /api/ calls
3. `get_page_text` — confirm real content renders
4. Check Vercel logs for errors
For auth-protected admin pages: 308 redirect to login = correct success
