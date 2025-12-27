/**
 * Prisma Client Singleton
 *
 * Provides a single Prisma client instance across the application.
 * Handles connection pooling and prevents multiple instances in development.
 */

import { PrismaClient } from '@/lib/generated/prisma/client';
import * as Prisma from '@/lib/generated/prisma/internal/prismaNamespace';

// Re-export the Prisma namespace for type access
export { Prisma };

// Extend PrismaClient with logging in development
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

// Type for the global prisma instance
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Declare global variable to persist across hot reloads in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Export the singleton instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export types for convenience
export type { PrismaClient } from '@/lib/generated/prisma/client';

// Re-export all model types from client
export type {
  bookings,
  customers,
  payments,
  users,
  vehicles,
  itineraries,
  itinerary_stops,
  wineries,
  time_cards,
  shared_tours,
  shared_tours_tickets,
  shared_tours_availability,
  financial_audit_log,
  error_logs,
} from '@/lib/generated/prisma/client';
