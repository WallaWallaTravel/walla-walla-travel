/**
 * Database Helper Utilities
 * Provides convenient wrappers for database operations
 */

import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { pool } from './db';

/**
 * Type for SQL query parameter values
 * Represents valid primitive values that can be passed to PostgreSQL queries
 */
export type QueryParamValue = string | number | boolean | Date | null | undefined | Buffer;
export type QueryParams = QueryParamValue[];

/**
 * Type for record data used in insert/update operations
 * Values can be any valid SQL parameter type
 */
export type RecordData = Record<string, QueryParamValue>;

/**
 * Execute a database operation with automatic connection management
 * @param callback Function that receives a database client
 * @returns Result of the callback function
 */
export async function withDatabase<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

/**
 * Execute a database transaction with automatic rollback on error
 * @param callback Function that receives a database client
 * @returns Result of the callback function
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a simple query with automatic connection management
 * @param text SQL query string
 * @param params Query parameters
 * @param client Optional client for transaction support
 * @returns Query result
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryParams,
  client?: PoolClient
): Promise<QueryResult<T>> {
  if (client) {
    return client.query<T>(text, params);
  }
  return withDatabase(async (c) => {
    return c.query<T>(text, params);
  });
}

/**
 * Execute a query and return the first row, or null if no rows
 * @param text SQL query string
 * @param params Query parameters
 * @param client Optional client for transaction support
 * @returns First row or null
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryParams,
  client?: PoolClient
): Promise<T | null> {
  const result = await query<T>(text, params, client);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 * @param text SQL query string
 * @param params Query parameters
 * @param client Optional client for transaction support
 * @returns Array of rows
 */
export async function queryMany<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryParams,
  client?: PoolClient
): Promise<T[]> {
  const result = await query<T>(text, params, client);
  return result.rows;
}

/**
 * Check if a record exists
 * @param table Table name
 * @param conditions WHERE clause conditions
 * @param params Query parameters
 * @returns True if record exists
 */
export async function exists(
  table: string,
  conditions: string,
  params?: QueryParams
): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${conditions})`,
    params
  );
  return result.rows[0]?.exists || false;
}

/**
 * Insert a record and return the inserted row
 * @param table Table name
 * @param data Object with column names and values
 * @returns Inserted row
 */
export async function insertOne<T extends QueryResultRow = QueryResultRow>(
  table: string,
  data: RecordData
): Promise<T> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
  const text = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await query<T>(text, values);
  return result.rows[0];
}

/**
 * Update a record and return the updated row
 * @param table Table name
 * @param data Object with column names and values to update
 * @param conditions WHERE clause conditions
 * @param conditionParams Parameters for WHERE clause
 * @returns Updated row
 */
export async function updateOne<T extends QueryResultRow = QueryResultRow>(
  table: string,
  data: RecordData,
  conditions: string,
  conditionParams?: QueryParams
): Promise<T | null> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = columns
    .map((col, i) => `${col} = $${i + 1}`)
    .join(', ');
  
  const allParams = [...values, ...(conditionParams || [])];
  const conditionOffset = values.length;
  
  // Adjust condition parameter placeholders
  const adjustedConditions = conditions.replace(
    /\$(\d+)/g,
    (_, num) => `$${parseInt(num) + conditionOffset}`
  );
  
  const text = `
    UPDATE ${table}
    SET ${setClause}
    WHERE ${adjustedConditions}
    RETURNING *
  `;
  
  const result = await query<T>(text, allParams);
  return result.rows[0] || null;
}

/**
 * Delete a record
 * @param table Table name
 * @param conditions WHERE clause conditions
 * @param params Query parameters
 * @returns Number of deleted rows
 */
export async function deleteOne(
  table: string,
  conditions: string,
  params?: QueryParams
): Promise<number> {
  const text = `DELETE FROM ${table} WHERE ${conditions}`;
  const result = await query(text, params);
  return result.rowCount || 0;
}

