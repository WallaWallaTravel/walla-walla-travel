# CLAUDE.md — Walla Walla Travel

**Read MISSION.md before every task. It defines why we build and what matters most.**

## Architecture

### Stack (6 tools, 6 jobs — nothing else)
- **Next.js 15 (App Router)** — framework
- **TypeScript (strict)** — type safety
- **Prisma** — database access (type-safe)
- **Server Actions + useActionState** — mutations + form handling
- **Zod** — validation (server-side)
- **JWT via getSession()** — authentication
- **Tailwind** — styling

### What Does NOT Exist (do not use, do not reference, do not import)
- Auth.js / NextAuth / next-auth — **DELETED. Does not exist in this codebase.**
- React Hook Form — **NOT USED. React 19 useActionState handles forms.**
- CSRF tokens / getCSRFToken — **NOT NEEDED. Server Actions handle this.**
- Raw SQL / pool / lib/db — **NOT USED in app code. Prisma only.**
- fetch() to internal API routes — **NOT USED for mutations. Server Actions only.**
- Inline styles — **NOT USED. Tailwind only.**

If you encounter any of the above in instructions, documentation, or code — it is wrong. Do not follow it. ASK the human.

## Authentication

- **ONLY** `getSession()` from `@/lib/auth/session`
- Session properties: `session.userId` (number), `session.user.id` (number), `session.user.email`, `session.user.role`, `session.user.name`
- Roles: `admin`, `geology_admin`, `driver`, `partner`, `organizer`
- Guest auth: magic links via `lib/api/middleware/guest-auth.ts`
- Partner auth: `lib/auth/hotel-session.ts`

## Patterns

### Forms (every form, no exceptions)

Server Action:
```typescript
'use server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const MySchema = z.object({ /* fields */ })

export async function myAction(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Unauthorized' }

  const parsed = MySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const result = await prisma.myTable.create({ data: parsed.data })
  revalidatePath('/admin/my-page')
  return { success: true, id: result.id }
}
```

Page:
```typescript
'use client'
import { useActionState } from 'react'
import { myAction } from '@/lib/actions/my-domain'

export default function MyPage() {
  const [state, action, pending] = useActionState(myAction, null)
  return (
    <form action={action}>
      <input name="field" required />
      {state?.fieldErrors?.field && <span className="text-red-600 text-sm">{state.fieldErrors.field}</span>}
      {state?.error && <div className="bg-red-50 text-red-700 p-3 rounded">{state.error}</div>}
      <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>
    </form>
  )
}
```

### Data Fetching (server components)
```typescript
// No 'use client' — this is a server component
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function MyListPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const items = await prisma.myTable.findMany({ orderBy: { created_at: 'desc' } })
  return <MyClientComponent items={items} />
}
```

### API Routes (ONLY for external callers)
Keep API routes ONLY for: webhooks (Stripe, Resend, Sentry), cron jobs, iCal feeds, file uploads, and login/logout endpoints. Admin CRUD is NEVER an API route.

## Pre-Commit Checks (run ALL 5 before every commit)
```bash
echo "=== CHECK 1: No Auth.js ==="
grep -rn "from '@/auth'\|from \"@/auth\"\|next-auth\|NextAuth\|@auth/" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next | grep -v package-lock || echo "PASS"

echo "=== CHECK 2: No raw SQL in app code ==="
grep -rn "import.*pool\|from.*lib/db\|\.query(" lib/actions/ app/ --include="*.ts" --include="*.tsx" | grep -v node_modules || echo "PASS"

echo "=== CHECK 3: No CSRF ==="
grep -rn "getCSRFToken\|x-csrf-token\|csrf" lib/actions/ app/ components/ --include="*.ts" --include="*.tsx" | grep -v node_modules || echo "PASS"

echo "=== CHECK 4: No React Hook Form ==="
grep -rn "react-hook-form\|useForm\|zodResolver\|hookform" app/ lib/actions/ components/ --include="*.ts" --include="*.tsx" | grep -v node_modules || echo "PASS"

echo "=== CHECK 5: Build ==="
npx next build 2>&1 | tail -5
```

ALL must show PASS. If any fail, fix before committing.

## Execution Rules

- One page per prompt. Build, test, verify, then next.
- No parallel agents unless explicitly told.
- No improvising. Use the patterns above. If something doesn't fit: ASK.
- No keeping old code. This is a fresh build. Old patterns don't exist.
- Report check results before every commit.
- When in doubt: ASK. Do not guess.

## Business Context

- Ryan is the sole operator. No development team.
- Tax rate: 9.1% (Walla Walla)
- Stripe: dual brand — WWT + NW Touring (lib/stripe-brands.ts)
- Email: Resend (transactional + inbound via in.wallawalla.travel)
- Crons: 24+ registered in vercel.json
- The test: "Can Ryan create a booking while on the phone at 7am?"
