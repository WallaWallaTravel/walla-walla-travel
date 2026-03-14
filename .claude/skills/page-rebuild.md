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
3. If a service method already exists (check lib/services/), use it directly
4. Build a Server Component that queries Prisma directly (same query logic)
5. Move any interactive parts (forms, buttons, modals) to `'use client'` child components
6. Pass server data as props to client components

## Auth in Server Components
```typescript
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const session = await getSession();
if (!session || session.role !== 'expected_role') {
  redirect('/login');
}
```

## Verification (after every rebuild)
1. Run pre-commit checks from CLAUDE.md
2. Commit and push to Vercel
3. Tell Ryan the page is ready for Chrome verification (Claude Code cannot use Chrome MCP tools)

## What Remains to Convert
- 2 admin shared tours pages
- 1 invoices page
- 7 driver portal pages
- /book/ flow
- /client-portal/

## Rules
- Admin pages: 308 redirect to login = correct success indicator
- No Zustand stores for server data — props only
- Loading states via React Suspense, not client-side loading booleans
- Preserve existing UI design — same colors, spacing, layout
