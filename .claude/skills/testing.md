---
name: testing
description: Test patterns and mock conventions. Use when writing or fixing tests.
---

## Mock Patterns
```typescript
// Always mock CSRF in test files
jest.mock('@/lib/api/middleware/csrf', () => ({
  withCSRF: (handler: any) => handler
}));

// Route context params — use Promise.resolve
const params = Promise.resolve({ id: '123' });
```

## Rules
- Date-dependent tests must use UTC-safe methods (`getUTCDay`, `toISOString`)
- Tests mirror app structure in `__tests__/`
- Run full suite: `npx jest --passWithNoTests`
- `BigInt(0)` not `0n` literals for ES target compatibility

## Prisma in Tests
- Use `prisma.$queryRaw` tagged templates for static SQL
- Use `prisma.$queryRawUnsafe` with positional params for dynamic SQL
- `T[]` generics on raw query results
