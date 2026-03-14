import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function getDatasourceUrl(): string {
  const base = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL || ''
  if (!base) return base

  // Serverless: limit each instance to 1 connection to avoid exhausting PgBouncer pool
  const url = new URL(base)
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '1')
  }
  return url.toString()
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: getDatasourceUrl(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
