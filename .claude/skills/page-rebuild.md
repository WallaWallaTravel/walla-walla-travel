---
name: page-rebuild
description: Pattern for converting old fetch-to-API pages into Server Components. Use for any page rebuild task.
---

## The Conversion Pattern
Old pattern (remove): Client component → `fetch('/api/admin/...')` → display data
New pattern (build): Server Component → direct Prisma query → render

## Steps
1. Read the existing page and identify all `fetch('/api/...')` calls
2. Identify the API route each fetch calls — read the route handler to understand the query
3. Build a Server Component that queries Prisma directly (same query logic as the API route)
4. Move any interactive parts (forms, buttons, modals) to `'use client'` child components
5. Pass server data as props to client components

## Verification (MUST do after every rebuild)
1. Run pre-commit checks from CLAUDE.md
2. Commit and push to Vercel
3. **Report back to the Chat/Projects planning interface** for Chrome MCP verification:
   - Chrome MCP: navigate to page
   - `read_network_requests` with `clear: true` — confirm ZERO `/api/` calls from the page
   - `get_page_text` — confirm real data renders
   - Check Vercel logs for errors
4. Chrome verification is done by Ryan + Claude in the Chat interface, NOT by Claude Code

NOTE: Claude Code cannot use Chrome MCP tools. After pushing, tell Ryan the page is ready for Chrome verification.

## What Remains to Convert
- 2 admin shared tours pages
- 1 invoices page
- 7 driver portal pages
- `/book/` flow
- `/client-portal/`

## Rules
- Admin pages that need auth: 308 redirect to login = correct success indicator
- No Zustand stores for server data — props only
- Loading states via React Suspense, not client-side loading booleans
