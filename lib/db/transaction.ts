/**
 * Database Transaction Helper
 *
 * Provides safe transaction management with automatic rollback on error.
 * Uses Prisma's interactive transactions internally.
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ============================================================================
// Transaction Callback Type
// ============================================================================

/**
 * The callback receives a `queryFn` that matches the old `query(sql, params)` signature
 * but returns `{ rows: T[], rowCount: number }` for backward compatibility with callers
 * that still use `.rows`.
 */
export type TransactionCallback<T> = (
  queryFn: <R = Record<string, any>>(text: string, params?: unknown[]) => Promise<{ rows: R[]; rowCount: number }>
) => Promise<T>;

// ============================================================================
// withTransaction - Execute operations in a transaction
// ============================================================================

export async function withTransaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const queryFn = async <R = Record<string, any>>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number }> => {
      const rows = await (params && params.length > 0
        ? tx.$queryRawUnsafe<R[]>(text, ...params)
        : tx.$queryRawUnsafe<R[]>(text));
      return { rows, rowCount: rows.length };
    };

    return callback(queryFn);
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

const ISOLATION_MAP: Record<IsolationLevel, Prisma.TransactionIsolationLevel> = {
  'READ UNCOMMITTED': 'ReadUncommitted',
  'READ COMMITTED': 'ReadCommitted',
  'REPEATABLE READ': 'RepeatableRead',
  'SERIALIZABLE': 'Serializable',
};

export async function withTransactionIsolation<T>(
  callback: TransactionCallback<T>,
  isolationLevel: IsolationLevel = 'READ COMMITTED'
): Promise<T> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const queryFn = async <R = Record<string, any>>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number }> => {
      const rows = await (params && params.length > 0
        ? tx.$queryRawUnsafe<R[]>(text, ...params)
        : tx.$queryRawUnsafe<R[]>(text));
      return { rows, rowCount: rows.length };
    };

    return callback(queryFn);
  }, { isolationLevel: ISOLATION_MAP[isolationLevel] });
}

// ============================================================================
// Savepoint Support (for nested transactions)
// ============================================================================

export async function withSavepoint<T>(
  savepointName: string,
  callback: TransactionCallback<T>
): Promise<T> {
  const queryFn = async <R = Record<string, any>>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number }> => {
    const rows = await (params && params.length > 0
      ? prisma.$queryRawUnsafe<R[]>(text, ...params)
      : prisma.$queryRawUnsafe<R[]>(text));
    return { rows, rowCount: rows.length };
  };

  // Create savepoint
  await prisma.$executeRawUnsafe(`SAVEPOINT ${savepointName}`);

  try {
    const result = await callback(queryFn);
    // Release savepoint (optional, will auto-release on commit)
    await prisma.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName}`);
    return result;
  } catch (error) {
    // Rollback to savepoint
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
