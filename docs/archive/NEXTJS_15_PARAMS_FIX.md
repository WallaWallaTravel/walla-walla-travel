# Next.js 15 Params Fix

**Date:** November 1, 2025  
**Status:** ✅ Fixed

## Issue
In Next.js 15, dynamic route parameters (`params`) are now a Promise and must be unwrapped before use. Direct access to `params.proposal_id` causes a console error:

```
A param property was accessed directly with `params.proposal_id`. 
`params` is now a Promise and should be unwrapped with `React.use()` 
before accessing properties of the underlying params object.
```

## Solution
Updated all dynamic route pages to properly handle the Promise-based params.

### Before (Next.js 14 style)
```typescript
export default function Page({ params }: { params: { proposal_id: string } }) {
  const proposal_id = params.proposal_id;
  // Use proposal_id directly...
}
```

### After (Next.js 15 style)
```typescript
export default function Page({ params }: { params: Promise<{ proposal_id: string }> }) {
  const [proposalId, setProposalId] = useState<string | null>(null);

  useEffect(() => {
    // Unwrap params Promise
    params.then(({ proposal_id }) => {
      setProposalId(proposal_id);
    });
  }, [params]);

  useEffect(() => {
    if (proposalId) {
      // Use proposalId after it's been unwrapped
      fetchData();
    }
  }, [proposalId]);
}
```

## Files Fixed

### 1. Client Proposal View
**File:** `/app/proposals/[proposal_id]/page.tsx`

Changes:
- ✅ Updated params type to `Promise<{ proposal_id: string }>`
- ✅ Added `proposalId` state variable
- ✅ Added useEffect to unwrap params
- ✅ Updated all references from `proposal_id` to `proposalId`
- ✅ Added null checks before using `proposalId`

### 2. Proposal Acceptance Page
**File:** `/app/proposals/[proposal_id]/accept/page.tsx`

Changes:
- ✅ Updated params type to `Promise<{ proposal_id: string }>`
- ✅ Added `proposalId` state variable
- ✅ Added useEffect to unwrap params
- ✅ Updated all API calls to use `proposalId`
- ✅ Updated router navigation to use `proposalId`
- ✅ Updated Link href to use `proposalId`

## Key Points

### 1. Type Definition
```typescript
// Old
{ params }: { params: { proposal_id: string } }

// New
{ params }: { params: Promise<{ proposal_id: string }> }
```

### 2. Unwrapping Pattern
```typescript
const [proposalId, setProposalId] = useState<string | null>(null);

useEffect(() => {
  params.then(({ proposal_id }) => {
    setProposalId(proposal_id);
  });
}, [params]);
```

### 3. Conditional Execution
```typescript
useEffect(() => {
  if (proposalId) {
    // Only execute after proposalId is available
    fetchProposal();
  }
}, [proposalId]);
```

### 4. Null Safety
```typescript
const fetchProposal = async () => {
  if (!proposalId) return; // Guard clause
  
  // Use proposalId safely
  const response = await fetch(`/api/proposals/${proposalId}`);
};
```

## Testing

- [x] Proposal view page loads without console errors
- [x] Proposal acceptance page loads without console errors
- [x] API calls use correct proposal ID
- [x] Navigation works correctly
- [x] No TypeScript errors
- [x] No linting errors

## Alternative Approach (Server Components)

For server components, you can use `React.use()`:

```typescript
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ proposal_id: string }> }) {
  const { proposal_id } = use(params);
  
  // Use proposal_id directly in server component
  return <div>Proposal: {proposal_id}</div>;
}
```

**Note:** We used the useState/useEffect pattern because our components are client components (`'use client'`).

## Related Documentation
- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Dynamic Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

## Future Considerations

When creating new dynamic route pages:
1. Always type params as a Promise
2. Unwrap params in useEffect (client) or with `use()` (server)
3. Add null checks before using the unwrapped value
4. Test for console errors in development mode

---

**Summary:** All dynamic route pages now properly handle Next.js 15's Promise-based params, eliminating console errors and ensuring compatibility with the latest Next.js version.

