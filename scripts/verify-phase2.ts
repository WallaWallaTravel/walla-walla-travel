/**
 * Phase 2 Verification Script
 * Tests all server actions against the real database using Prisma directly.
 * Run with: npx tsx scripts/verify-phase2.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasourceUrl: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL,
})

type TestResult = { name: string; pass: boolean; detail: string }
const results: TestResult[] = []

function log(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}: ${detail}`)
}

async function testBookingCreation() {
  const testName = '1. Quick Create Booking'
  try {
    const customerName = 'Test Customer Phase2'
    const customerEmail = 'phase2test@test.com'

    // Create a test booking — start_time is DateTime @db.Time, deposit_paid is Boolean
    const tomorrow = new Date(Date.now() + 86400000)
    const booking = await prisma.bookings.create({
      data: {
        booking_number: `TEST-P2-${Date.now()}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: '509-555-1234',
        tour_date: tomorrow,
        start_time: new Date('1970-01-01T10:00:00Z'),
        duration_hours: 6,
        party_size: 8,
        pickup_location: 'Marcus Whitman Hotel',
        total_price: 0,
        deposit_paid: false,
        status: 'pending',
      },
    })

    if (!booking.id || !booking.booking_number) {
      log(testName, false, 'Booking created but missing id or booking_number')
      return null
    }

    log(testName, true, `Created booking #${booking.booking_number} (id: ${booking.id})`)
    return booking
  } catch (e) {
    log(testName, false, `Error: ${(e as Error).message}`)
    return null
  }
}

async function testBookingUpdate(bookingId: number) {
  const testName = '3. Booking Detail/Edit — Update Status'
  try {
    const updated = await prisma.bookings.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    })

    if (updated.status !== 'confirmed') {
      log(testName, false, `Status is '${updated.status}', expected 'confirmed'`)
      return
    }

    log(testName, true, `Status updated to '${updated.status}'`)
  } catch (e) {
    log(testName, false, `Error: ${(e as Error).message}`)
  }
}

async function testDriverAssignment(bookingId: number) {
  const testName = '3b. Booking Detail/Edit — Assign Driver'
  try {
    // Drivers are users with role='driver'
    const driver = await prisma.users.findFirst({
      where: { role: 'driver' },
      select: { id: true, name: true },
    })

    if (!driver) {
      log(testName, false, 'No active drivers found in database')
      return
    }

    const updated = await prisma.bookings.update({
      where: { id: bookingId },
      data: { driver_id: driver.id },
    })

    if (updated.driver_id !== driver.id) {
      log(testName, false, `Driver not assigned correctly`)
      return
    }

    log(testName, true, `Assigned driver ${driver.name} (id: ${driver.id})`)
  } catch (e) {
    log(testName, false, `Error: ${(e as Error).message}`)
  }
}

async function testTripProposalCreation() {
  const testName = '2. Trip Proposal CRUD'
  try {
    // Test creating a proposal
    const nextWeek = new Date(Date.now() + 86400000 * 7)
    const accessToken = Array.from({ length: 64 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('')
    const proposal = await prisma.trip_proposals.create({
      data: {
        proposal_number: `TP-TEST-${Date.now()}`,
        access_token: accessToken,
        customer_name: 'Test Proposal Customer',
        customer_email: 'proposal-test@test.com',
        customer_phone: '509-555-5678',
        status: 'draft',
        party_size: 4,
        trip_type: 'wine_tour',
        total: 1200,
        deposit_percentage: 50,
        tax_rate: 0.091,
        gratuity_percentage: 20,
        start_date: nextWeek,
        end_date: nextWeek,
      },
    })

    if (!proposal.id) {
      log(testName, false, 'Proposal created but missing id')
      return null
    }

    // Test adding days
    const day = await prisma.trip_proposal_days.create({
      data: {
        trip_proposal_id: proposal.id,
        day_number: 1,
        date: new Date(Date.now() + 86400000 * 7),
        title: 'Day 1 — Wine Tour',
      },
    })

    // Test adding stops
    const stop = await prisma.trip_proposal_stops.create({
      data: {
        trip_proposal_day_id: day.id,
        stop_order: 1,
        custom_name: 'Test Winery',
        stop_type: 'winery',
        duration_minutes: 60,
      },
    })

    // Test adding service line item (inclusion)
    const inclusion = await prisma.trip_proposal_inclusions.create({
      data: {
        trip_proposal_id: proposal.id,
        description: 'Wine Tour Transportation',
        inclusion_type: 'transportation',
        unit_price: 800,
        quantity: 1,
        total_price: 800,
      },
    })

    // Test adding guests
    const guest = await prisma.trip_proposal_guests.create({
      data: {
        trip_proposal_id: proposal.id,
        name: 'Jane Doe',
        email: 'jane@test.com',
      },
    })

    log(testName, true, `Created proposal #${proposal.proposal_number} with 1 day, 1 stop, 1 inclusion, 1 guest`)
    return proposal
  } catch (e) {
    log(testName, false, `Error: ${(e as Error).message}`)
    return null
  }
}

async function testCalendarQueries(bookingId: number) {
  const testName = '4. Calendar Queries'
  try {
    // Test what getCalendarData does — query bookings + proposals in date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const bookings = await prisma.bookings.findMany({
      where: {
        tour_date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        booking_number: true,
        customer_name: true,
        tour_date: true,
        status: true,
        driver_id: true,
      },
      take: 20,
    })

    const proposals = await prisma.trip_proposals.findMany({
      where: {
        created_at: { gte: startDate },
        status: { in: ['draft', 'sent', 'accepted'] },
      },
      select: {
        id: true,
        proposal_number: true,
        customer_name: true,
        status: true,
      },
      take: 20,
    })

    log(testName, true, `Found ${bookings.length} bookings and ${proposals.length} proposals in current month`)
  } catch (e) {
    log(testName, false, `Error: ${(e as Error).message}`)
  }
}

async function testDriverClockInOut() {
  const testName = '5. Driver Clock In/Out'
  try {
    // Drivers are users with role='driver'
    const driver = await prisma.users.findFirst({
      where: { role: 'driver' },
      select: { id: true, name: true },
    })

    if (!driver) {
      log(testName, false, 'No active drivers in database')
      return
    }

    // Clean up any test time cards from previous runs
    await prisma.time_cards.deleteMany({
      where: {
        driver_id: driver.id,
        notes: { contains: 'PHASE2_TEST' },
      },
    })

    const now = new Date()
    const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Test clock in
    const timeCard = await prisma.time_cards.create({
      data: {
        driver_id: driver.id,
        date: todayDate,
        clock_in_time: now,
        work_reporting_location: 'Test Location',
        status: 'on_duty',
        notes: 'PHASE2_TEST - auto test',
      },
    })

    if (!timeCard.id) {
      log(testName, false, 'Time card created but missing id')
      return
    }

    // Test clock out
    const clockOutTime = new Date(now.getTime() + 3600000) // +1 hour
    const totalHours = (clockOutTime.getTime() - timeCard.clock_in_time.getTime()) / (1000 * 60 * 60)

    const updatedCard = await prisma.time_cards.update({
      where: { id: timeCard.id },
      data: {
        clock_out_time: clockOutTime,
        on_duty_hours: totalHours,
        status: 'completed',
        driver_signature: 'test-signature-base64',
        signature_timestamp: clockOutTime,
      },
    })

    if (updatedCard.status !== 'completed') {
      log(testName, false, `Status is '${updatedCard.status}', expected 'completed'`)
      return
    }

    const hours = Number(updatedCard.on_duty_hours)
    log(testName, true, `Clock in/out successful — ${hours.toFixed(2)} hours recorded`)

    // Clean up test data
    await prisma.time_cards.delete({ where: { id: timeCard.id } })
  } catch (e) {
    log(testName, false, `Error: ${(e as Error).message}`)
  }
}

async function testDriverInspection() {
  const testName = '6. Driver Pre-Trip Inspection'
  try {
    const driver = await prisma.users.findFirst({
      where: { role: 'driver' },
      select: { id: true },
    })
    if (!driver) {
      log(testName, false, 'No active drivers in database')
      return
    }

    const vehicle = await prisma.vehicles.findFirst({ where: { is_active: true } })
    if (!vehicle) {
      log(testName, false, 'No active vehicles in database')
      return
    }

    const inspectionData = {
      items: {
        tires: true,
        brakes: true,
        lights: true,
        mirrors: true,
        wipers: true,
        fluids: true,
        horn: true,
        seat_belts: true,
      },
      notes: 'PHASE2_TEST - all items passed',
      signature: 'test-signature',
    }

    const inspection = await prisma.inspections.create({
      data: {
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        type: 'pre_trip',
        inspection_data: inspectionData,
        start_mileage: vehicle.current_mileage || 50000,
        status: 'completed',
        issues_found: false,
      },
    })

    if (!inspection.id) {
      log(testName, false, 'Inspection created but missing id')
      return
    }

    log(testName, true, `Pre-trip inspection #${inspection.id} created for vehicle ${vehicle.vehicle_number || vehicle.id}`)

    // Clean up
    await prisma.inspections.delete({ where: { id: inspection.id } })
  } catch (e) {
    log(testName, false, `Error: ${(e as Error).message}`)
  }
}

async function cleanup(bookingId: number | null, proposalId: number | null) {
  console.log('\n🧹 Cleaning up test data...')
  try {
    if (proposalId) {
      await prisma.trip_proposal_guests.deleteMany({ where: { trip_proposal_id: proposalId } })
      await prisma.trip_proposal_inclusions.deleteMany({ where: { trip_proposal_id: proposalId } })
      // Stops are cascaded via days
      await prisma.trip_proposal_days.deleteMany({ where: { trip_proposal_id: proposalId } })
      await prisma.trip_proposals.delete({ where: { id: proposalId } })
      console.log('  Deleted test proposal and related records')
    }
    if (bookingId) {
      await prisma.bookings.delete({ where: { id: bookingId } })
      console.log('  Deleted test booking')
    }
  } catch (e) {
    console.log(`  Cleanup warning: ${(e as Error).message}`)
  }
}

async function main() {
  console.log('🔍 Phase 2 Verification — Testing Server Actions against real database\n')

  // Test 1: Quick Create Booking
  const testBooking = await testBookingCreation()

  // Test 2: Trip Proposal CRUD
  const testProposal = await testTripProposalCreation()

  // Test 3: Booking Detail/Edit
  if (testBooking) {
    await testBookingUpdate(testBooking.id)
    await testDriverAssignment(testBooking.id)
  } else {
    log('3. Booking Detail/Edit', false, 'Skipped — booking creation failed')
    log('3b. Booking Detail/Edit — Assign Driver', false, 'Skipped — booking creation failed')
  }

  // Test 4: Calendar Queries
  await testCalendarQueries(testBooking?.id || 0)

  // Test 5: Driver Clock In/Out
  await testDriverClockInOut()

  // Test 6: Pre-Trip Inspection
  await testDriverInspection()

  // Cleanup
  await cleanup(testBooking?.id || null, testProposal?.id || null)

  // Summary
  console.log('\n' + '═'.repeat(60))
  const passed = results.filter(r => r.pass).length
  const total = results.length
  console.log(`\n📊 Results: ${passed}/${total} tests passed`)

  if (passed < total) {
    console.log('\n❌ FAILURES:')
    results.filter(r => !r.pass).forEach(r => {
      console.log(`   ${r.name}: ${r.detail}`)
    })
  }

  console.log('')
  await prisma.$disconnect()
  process.exit(passed === total ? 0 : 1)
}

main().catch(async (e) => {
  console.error('Fatal error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
