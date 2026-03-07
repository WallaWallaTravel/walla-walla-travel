/**
 * Prisma Verification Script
 *
 * Run with: npx tsx scripts/verify-prisma.ts
 * Queries one booking via Prisma to confirm typed client works against production DB.
 */

import { PrismaClient } from '../lib/generated/prisma/client'

async function main() {
  const prisma = new PrismaClient()

  try {
    // Query one booking to verify connection and types
    const booking = await prisma.bookings.findFirst({
      select: {
        id: true,
        customer_name: true,
        customer_email: true,
        tour_date: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    if (!booking) {
      console.log('Prisma verification SUCCESS (no bookings in table, but connection works)')
    } else {
      console.log('Prisma verification SUCCESS')
      console.log('Latest booking:', {
        id: booking.id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        tour_date: booking.tour_date,
        status: booking.status,
        created_at: booking.created_at,
      })
    }

  } catch (error) {
    console.error('Prisma verification FAILED:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
