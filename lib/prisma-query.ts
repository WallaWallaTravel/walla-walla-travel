/**
 * Prisma-based query helper for migration compatibility.
 *
 * Provides a `query()` function with the same signature as the old pg pool
 * `query()`, but routes everything through `prisma.$queryRawUnsafe`.
 *
 * Usage:
 *   import { query } from '@/lib/prisma-query'
 *   const result = await query<Row>('SELECT * FROM t WHERE id = $1', [id])
 *   result.rows  // Row[]
 *   result.rowCount // number
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface QueryResult<T> {
  rows: T[]
  rowCount: number
}

/**
 * Execute a raw SQL query through Prisma's connection pool.
 * Accepts $1, $2 style positional parameters (Postgres).
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  // Determine if this is a SELECT / RETURNING (needs rows) or a mutation
  const trimmed = sql.trim().toUpperCase()
  const isSelect =
    trimmed.startsWith('SELECT') ||
    trimmed.includes('RETURNING')

  if (isSelect) {
    const rows = await prisma.$queryRawUnsafe<T[]>(sql, ...params)
    return { rows, rowCount: rows.length }
  }

  // For INSERT/UPDATE/DELETE without RETURNING
  const affected = await prisma.$executeRawUnsafe(sql, ...params)
  return { rows: [] as T[], rowCount: affected }
}

/**
 * Execute a raw SQL query and return just the rows (no wrapper).
 * Drop-in replacement for the old `queryMany()`.
 */
export async function queryMany<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql, ...params)
}

/**
 * Execute a raw SQL query and return the first row or null.
 * Drop-in replacement for the old `queryOne()`.
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await prisma.$queryRawUnsafe<T[]>(sql, ...params)
  return rows[0] ?? null
}

// Re-export prisma for cases that need direct access
export { prisma, Prisma }
