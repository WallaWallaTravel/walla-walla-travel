/**
 * Database Transaction Helper
 *
 * Provides safe transaction management using Prisma.
 * Wraps prisma.$transaction() for backward compatibility with
 * code that uses the callback-based transaction pattern.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ============================================================================
// Transaction Callback Type
// ============================================================================

/**
 * A query function that accepts SQL text and params, returns { rows: T[] }.
 * This preserves backward compatibility with code that used the old
 * pool-based query function inside transactions.
 */
type TransactionQueryFn = <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;

export type TransactionCallback<T> = (client: TransactionQueryFn) => Promise<T>;

// ============================================================================
// withTransaction - Execute operations in a transaction
// ============================================================================

export async function withTransaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Create a query function that wraps prisma raw queries
    // to match the old { rows: T[] } interface
    const queryFn: TransactionQueryFn = async <R = unknown>(text: string, params?: unknown[]) => {
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        const rows = await tx.$queryRawUnsafe<R[]>(text, ...(params || []));
        return { rows, rowCount: rows.length };
      } else {
        const count = await tx.$executeRawUnsafe(text, ...(params || []));
        // For INSERT/UPDATE/DELETE with RETURNING, use queryRawUnsafe
        if (text.toUpperCase().includes('RETURNING')) {
          const rows = await tx.$queryRawUnsafe<R[]>(text, ...(params || []));
          return { rows, rowCount: rows.length };
        }
        return { rows: [] as R[], rowCount: count };
      }
    };

    // Re-implement: for RETURNING queries, we actually need to always use queryRawUnsafe
    // The above logic double-executes for RETURNING. Let's fix:
    const smartQueryFn: TransactionQueryFn = async <R = unknown>(text: string, params?: unknown[]) => {
      const trimmed = text.trim().toUpperCase();
      const hasReturning = trimmed.includes('RETURNING');
      const isSelect = trimmed.startsWith('SELECT');

      if (isSelect || hasReturning) {
        const rows = await tx.$queryRawUnsafe<R[]>(text, ...(params || []));
        return { rows, rowCount: rows.length };
      } else {
        const count = await tx.$executeRawUnsafe(text, ...(params || []));
        return { rows: [] as R[], rowCount: count };
      }
    };

    return callback(smartQueryFn);
  });
}

// ============================================================================
// Transaction with Isolation Level
// ============================================================================

export type IsolationLevel =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

const isolationLevelMap: Record<IsolationLevel, Prisma.TransactionIsolationLevel> = {
  'READ UNCOMMITTED': Prisma.TransactionIsolationLevel.ReadUncommitted,
  'READ COMMITTED': Prisma.TransactionIsolationLevel.ReadCommitted,
  'REPEATABLE READ': Prisma.TransactionIsolationLevel.RepeatableRead,
  'SERIALIZABLE': Prisma.TransactionIsolationLevel.Serializable,
};

export async function withTransactionIsolation<T>(
  callback: TransactionCallback<T>,
  isolationLevel: IsolationLevel = 'READ COMMITTED'
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const smartQueryFn: TransactionQueryFn = async <R = unknown>(text: string, params?: unknown[]) => {
      const trimmed = text.trim().toUpperCase();
      const hasReturning = trimmed.includes('RETURNING');
      const isSelect = trimmed.startsWith('SELECT');

      if (isSelect || hasReturning) {
        const rows = await tx.$queryRawUnsafe<R[]>(text, ...(params || []));
        return { rows, rowCount: rows.length };
      } else {
        const count = await tx.$executeRawUnsafe(text, ...(params || []));
        return { rows: [] as R[], rowCount: count };
      }
    };

    return callback(smartQueryFn);
  }, {
    isolationLevel: isolationLevelMap[isolationLevel],
  });
}

// ============================================================================
// Savepoint Support (for nested transactions)
// ============================================================================

export async function withSavepoint<T>(
  savepointName: string,
  callback: TransactionCallback<T>
): Promise<T> {
  // Prisma doesn't directly support savepoints, but we can use raw SQL
  // Note: This must be called within an existing transaction context
  const queryFn: TransactionQueryFn = async <R = unknown>(text: string, params?: unknown[]) => {
    const trimmed = text.trim().toUpperCase();
    const hasReturning = trimmed.includes('RETURNING');
    const isSelect = trimmed.startsWith('SELECT');

    if (isSelect || hasReturning) {
      const rows = await prisma.$queryRawUnsafe<R[]>(text, ...(params || []));
      return { rows, rowCount: rows.length };
    } else {
      const count = await prisma.$executeRawUnsafe(text, ...(params || []));
      return { rows: [] as R[], rowCount: count };
    }
  };

  await prisma.$executeRawUnsafe(`SAVEPOINT ${savepointName}`);

  try {
    const result = await callback(queryFn);
    await prisma.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName}`);
    return result;
  } catch (error) {
    await prisma.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    throw error;
  }
}

// ============================================================================
// Batch Insert Helper
// ============================================================================

export async function batchInsert<T extends Record<string, unknown>, R = T>(
  table: string,
  records: T[],
  returning: string[] = ['*']
): Promise<R[]> {
  if (records.length === 0) return [];

  return withTransaction(async (db) => {
    const results: R[] = [];

    for (const record of records) {
      const keys = Object.keys(record);
      const values = Object.values(record);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const returningClause = returning.join(', ');

      const sql = `
        INSERT INTO ${table} (${columns})
        VALUES (${placeholders})
        RETURNING ${returningClause}
      `;

      const result = await db(sql, values);
      results.push(result.rows[0] as R);
    }

    return results;
  });
}

// ============================================================================
// Batch Update Helper
// ============================================================================

export async function batchUpdate<T extends Record<string, unknown>>(
  table: string,
  records: T[],
  idField: string = 'id'
): Promise<number> {
  if (records.length === 0) return 0;

  return withTransaction(async (db) => {
    let updated = 0;

    for (const record of records) {
      const id = record[idField];
      const updates = { ...record };
      delete updates[idField];

      const keys = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

      const sql = `
        UPDATE ${table}
        SET ${setClause}
        WHERE ${idField} = $${keys.length + 1}
      `;

      const result = await db(sql, [...values, id]);
      updated += result.rowCount || 0;
    }

    return updated;
  });
}

// ============================================================================
// Export query for convenience (uses prisma raw queries)
// ============================================================================

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
  const trimmed = text.trim().toUpperCase();
  const hasReturning = trimmed.includes('RETURNING');
  const isSelect = trimmed.startsWith('SELECT');

  if (isSelect || hasReturning) {
    const rows = await prisma.$queryRawUnsafe<T[]>(text, ...(params || []));
    return { rows, rowCount: rows.length };
  } else {
    const count = await prisma.$executeRawUnsafe(text, ...(params || []));
    return { rows: [] as T[], rowCount: count };
  }
}
