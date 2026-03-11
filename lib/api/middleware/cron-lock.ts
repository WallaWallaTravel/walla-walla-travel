/**
 * Distributed Cron Lock using PostgreSQL Advisory Locks
 *
 * Prevents concurrent execution of the same cron job across multiple
 * Vercel serverless function instances. Uses pg_try_advisory_lock for
 * non-blocking lock acquisition — if the job is already running in
 * another instance, this returns a "skipped" response immediately.
 *
 * Advisory locks are session-level and automatically released when
 * the connection is returned to the pool.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * djb2 hash: deterministic string → 32-bit positive integer.
 * Used to convert job names into advisory lock IDs.
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

/**
 * Wrap a cron handler with a PostgreSQL advisory lock.
 *
 * Usage:
 *   return withCronLock('my-job', async () => {
 *     // handler body
 *     return NextResponse.json({ success: true });
 *   });
 */
export async function withCronLock(
  jobName: string,
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  const lockId = djb2Hash(jobName);

  // Use prisma.$transaction to ensure lock/unlock happen on the same connection
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lockResult = await tx.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
        SELECT pg_try_advisory_lock(${lockId})
      `;

      const acquired = lockResult[0]?.pg_try_advisory_lock === true;

      if (!acquired) {
        logger.info(`Cron lock skipped: ${jobName} is already running`, {
          job: jobName,
          lockId,
        });
        return null; // Signal: lock not acquired
      }

      // Execute the job within the transaction context
      const response = await fn();

      // Unlock
      await tx.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;

      return response;
    });

    if (result === null) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `${jobName} is already running in another instance`,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  } catch (error) {
    // Attempt to unlock in case of error (lock will auto-release on disconnect anyway)
    try {
      await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;
    } catch {
      // Unlock failed — lock will release when connection closes
    }
    throw error;
  }
}
