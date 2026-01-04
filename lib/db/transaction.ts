/**
 * Database Transaction Helper
 * 
 * Provides safe transaction management with automatic rollback on error
 */

import { query } from '@/lib/db';

// ============================================================================
// Transaction Callback Type
// ============================================================================

export type TransactionCallback<T> = (client: typeof query) => Promise<T>;

// ============================================================================
// withTransaction - Execute operations in a transaction
// ============================================================================

export async function withTransaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  // Begin transaction
  await query('BEGIN', []);

  try {
    // Execute callback with query function
    const result = await callback(query);

    // Commit if successful
    await query('COMMIT', []);

    return result;

  } catch (error) {
    // Rollback on error
    await query('ROLLBACK', []);
    throw error;
  }
}

// ============================================================================
// Transaction with Isolation Level
// ============================================================================

export type IsolationLevel = 
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

export async function withTransactionIsolation<T>(
  callback: TransactionCallback<T>,
  isolationLevel: IsolationLevel = 'READ COMMITTED'
): Promise<T> {
  // Begin transaction with isolation level
  await query(`BEGIN ISOLATION LEVEL ${isolationLevel}`, []);

  try {
    const result = await callback(query);
    await query('COMMIT', []);
    return result;
  } catch (error) {
    await query('ROLLBACK', []);
    throw error;
  }
}

// ============================================================================
// Savepoint Support (for nested transactions)
// ============================================================================

export async function withSavepoint<T>(
  savepointName: string,
  callback: TransactionCallback<T>
): Promise<T> {
  // Create savepoint
  await query(`SAVEPOINT ${savepointName}`, []);

  try {
    const result = await callback(query);
    // Release savepoint (optional, will auto-release on commit)
    await query(`RELEASE SAVEPOINT ${savepointName}`, []);
    return result;
  } catch (error) {
    // Rollback to savepoint
    await query(`ROLLBACK TO SAVEPOINT ${savepointName}`, []);
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
// Export for convenience
// ============================================================================

export { query };




