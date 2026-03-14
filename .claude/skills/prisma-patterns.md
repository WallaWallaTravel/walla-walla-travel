---
name: prisma-patterns
description: Prisma raw query syntax, transactions, BigInt handling. Use when writing raw SQL or complex database operations.
---

## Raw Queries
```typescript
// Static SQL — tagged template (SAFE)
const results = await prisma.$queryRaw`
  SELECT * FROM users WHERE id = ${userId}
`;

// Dynamic SQL — positional params (for dynamic WHERE/ORDER)
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE ${column} = $1 ORDER BY ${orderBy}`,
  value
);
```

## Transactions
```typescript
await prisma.$transaction(async (tx) => {
  await tx.$queryRawUnsafe(`UPDATE ...`, param1);
  await tx.booking.update({ where: { id }, data });
});
```

## BigInt
- Use `BigInt(0)` not `0n` literals — ES target compatibility
- Cast in queries: `COUNT(*)::int` when possible to avoid BigInt returns

## Rules
- NEVER use `@/lib/db` or raw pg Pool — Prisma exclusively
- Default `@prisma/client` output, `prisma-client-js` provider
- `T[]` generics on all raw query results for type safety
