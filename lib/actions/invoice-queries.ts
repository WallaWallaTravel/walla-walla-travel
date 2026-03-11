'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

export type PendingInvoiceItem = {
  booking_id: number
  booking_number: string
  customer_name: string
  customer_email: string
  tour_date: string
  estimated_hours: number
  actual_hours: number | null
  hourly_rate: number
  base_price: number
  calculated_amount: number
  hours_since_tour: number
  driver_name: string
  final_invoice_count: number
}

export type InvoiceDetail = {
  id: number
  invoice_number: string
  booking_id: number
  invoice_type: string
  subtotal: number
  tip_amount: number | null
  tax_amount: number | null
  total_amount: number
  status: string
  payment_method: string | null
  sent_at: string | null
  paid_at: string | null
  due_date: string | null
  notes: string | null
  created_at: string
  booking: {
    booking_number: string
    customer_name: string
    customer_email: string
    tour_date: string
    actual_hours: number | null
    estimated_hours: number | null
    hourly_rate: number | null
    driver_name: string | null
  }
}

export type PaymentListItem = {
  id: number
  booking_id: number | null
  amount: number
  payment_type: string
  payment_method: string
  status: string
  stripe_payment_intent_id: string | null
  card_brand: string | null
  card_last4: string | null
  created_at: string
  succeeded_at: string | null
  booking_number: string | null
  customer_name: string | null
}

// ============================================================================
// GET PENDING INVOICES (query)
// ============================================================================

export async function getPendingInvoices(): Promise<PendingInvoiceItem[]> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  try {
    // pending_final_invoices is a view — use raw SQL since views aren't Prisma models
    const results = await prisma.$queryRaw<PendingInvoiceItem[]>`
      SELECT * FROM pending_final_invoices
      ORDER BY tour_date DESC
    `

    return results.map((r) => ({
      ...r,
      estimated_hours: Number(r.estimated_hours),
      actual_hours: r.actual_hours != null ? Number(r.actual_hours) : null,
      hourly_rate: Number(r.hourly_rate),
      base_price: Number(r.base_price),
      calculated_amount: Number(r.calculated_amount),
      hours_since_tour: Number(r.hours_since_tour),
      final_invoice_count: Number(r.final_invoice_count),
    }))
  } catch {
    return []
  }
}

// ============================================================================
// GET INVOICE BY BOOKING ID (query)
// ============================================================================

export async function getInvoiceByBookingId(
  bookingId: number
): Promise<InvoiceDetail | null> {
  const session = await getSession()
  if (!session?.user) {
    return null
  }

  try {
    // Get booking via Prisma
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        booking_number: true,
        customer_name: true,
        customer_email: true,
        tour_date: true,
        actual_hours: true,
        estimated_hours: true,
        hourly_rate: true,
        driver_id: true,
        ready_for_final_invoice: true,
        final_invoice_sent: true,
      },
    })

    if (!booking) return null

    // Get driver name
    let driverName: string | null = null
    if (booking.driver_id) {
      const driver = await prisma.users.findUnique({
        where: { id: booking.driver_id },
        select: { name: true },
      })
      driverName = driver?.name || null
    }

    // Get invoice record
    const invoiceRecord = await prisma.invoices.findFirst({
      where: { booking_id: bookingId, invoice_type: 'final' },
      orderBy: { created_at: 'desc' },
    })

    // Calculate amounts
    const hours = Number(booking.actual_hours) || Number(booking.estimated_hours) || 6
    const rate = Number(booking.hourly_rate) || 150
    const subtotal = hours * rate

    return {
      id: invoiceRecord?.id || 0,
      invoice_number:
        invoiceRecord?.invoice_number || `INV-${booking.booking_number}`,
      booking_id: bookingId,
      invoice_type: invoiceRecord?.invoice_type || 'final',
      subtotal: invoiceRecord ? Number(invoiceRecord.subtotal) : subtotal,
      tip_amount: invoiceRecord?.tip_amount
        ? Number(invoiceRecord.tip_amount)
        : null,
      tax_amount: invoiceRecord?.tax_amount
        ? Number(invoiceRecord.tax_amount)
        : null,
      total_amount: invoiceRecord
        ? Number(invoiceRecord.total_amount)
        : subtotal,
      status: invoiceRecord?.status || 'draft',
      payment_method: invoiceRecord?.payment_method || null,
      sent_at: invoiceRecord?.sent_at?.toISOString() || null,
      paid_at: invoiceRecord?.paid_at?.toISOString() || null,
      due_date: invoiceRecord?.due_date?.toISOString() || null,
      notes: invoiceRecord?.notes || null,
      created_at: invoiceRecord?.created_at?.toISOString() || new Date().toISOString(),
      booking: {
        booking_number: booking.booking_number,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        tour_date: booking.tour_date
          ? new Date(booking.tour_date).toISOString().split('T')[0]
          : '',
        actual_hours: booking.actual_hours
          ? Number(booking.actual_hours)
          : null,
        estimated_hours: booking.estimated_hours
          ? Number(booking.estimated_hours)
          : null,
        hourly_rate: booking.hourly_rate
          ? Number(booking.hourly_rate)
          : null,
        driver_name: driverName,
      },
    }
  } catch {
    return null
  }
}

// ============================================================================
// GET INVOICES LIST (query)
// ============================================================================

export async function getInvoicesList(filters?: {
  status?: string
  invoiceType?: string
  bookingId?: number
}): Promise<InvoiceDetail[]> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  try {
    // Build Prisma where clause with optional filters
    const invoiceResults = await prisma.invoices.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.invoiceType && { invoice_type: filters.invoiceType }),
        ...(filters?.bookingId && { booking_id: filters.bookingId }),
      },
      include: {
        bookings: {
          select: {
            booking_number: true,
            customer_name: true,
            customer_email: true,
            tour_date: true,
            actual_hours: true,
            estimated_hours: true,
            hourly_rate: true,
            driver_id: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    })

    // Collect driver IDs for batch lookup
    const driverIds = [...new Set(
      invoiceResults
        .map((inv) => inv.bookings.driver_id)
        .filter((id): id is number => id != null)
    )]
    const drivers = driverIds.length > 0
      ? await prisma.users.findMany({
          where: { id: { in: driverIds } },
          select: { id: true, name: true },
        })
      : []
    const driverMap = new Map(drivers.map((d) => [d.id, d.name]))

    return invoiceResults.map((r) => ({
      id: r.id,
      invoice_number: r.invoice_number,
      booking_id: r.booking_id,
      invoice_type: r.invoice_type,
      subtotal: Number(r.subtotal),
      tip_amount: r.tip_amount != null ? Number(r.tip_amount) : null,
      tax_amount: r.tax_amount != null ? Number(r.tax_amount) : null,
      total_amount: Number(r.total_amount),
      status: r.status || 'draft',
      payment_method: r.payment_method,
      sent_at: r.sent_at?.toISOString() || null,
      paid_at: r.paid_at?.toISOString() || null,
      due_date: r.due_date?.toISOString() || null,
      notes: r.notes,
      created_at: r.created_at?.toISOString() || '',
      booking: {
        booking_number: r.bookings.booking_number || '',
        customer_name: r.bookings.customer_name || '',
        customer_email: r.bookings.customer_email || '',
        tour_date: r.bookings.tour_date
          ? new Date(r.bookings.tour_date).toISOString().split('T')[0]
          : '',
        actual_hours: r.bookings.actual_hours != null ? Number(r.bookings.actual_hours) : null,
        estimated_hours:
          r.bookings.estimated_hours != null ? Number(r.bookings.estimated_hours) : null,
        hourly_rate: r.bookings.hourly_rate != null ? Number(r.bookings.hourly_rate) : null,
        driver_name: r.bookings.driver_id ? (driverMap.get(r.bookings.driver_id) || null) : null,
      },
    }))
  } catch {
    return []
  }
}

// ============================================================================
// GET PAYMENTS FOR BOOKING (query)
// ============================================================================

export async function getPaymentsForBooking(
  bookingId: number
): Promise<PaymentListItem[]> {
  const session = await getSession()
  if (!session?.user) {
    return []
  }

  try {
    // payments model is available in Prisma
    const payments = await prisma.payments.findMany({
      where: { booking_id: bookingId },
      orderBy: { created_at: 'desc' },
    })

    // Get booking info for the response
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { booking_number: true, customer_name: true },
    })

    return payments.map((p) => ({
      id: p.id,
      booking_id: p.booking_id,
      amount: Number(p.amount),
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      status: p.status,
      stripe_payment_intent_id: p.stripe_payment_intent_id,
      card_brand: p.card_brand,
      card_last4: p.card_last4,
      created_at: p.created_at.toISOString(),
      succeeded_at: p.succeeded_at?.toISOString() || null,
      booking_number: booking?.booking_number || null,
      customer_name: booking?.customer_name || null,
    }))
  } catch {
    return []
  }
}

// ============================================================================
// GET RECENT PAYMENTS (admin list)
// ============================================================================

export async function getRecentPayments(
  limit = 50
): Promise<PaymentListItem[]> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  try {
    // Use raw SQL to join payments with bookings (payments model has limited relations)
    const results = await prisma.$queryRawUnsafe<
      {
        id: number
        booking_id: number | null
        amount: number
        payment_type: string
        payment_method: string
        status: string
        stripe_payment_intent_id: string | null
        card_brand: string | null
        card_last4: string | null
        created_at: Date
        succeeded_at: Date | null
        booking_number: string | null
        customer_name: string | null
      }[]
    >(
      `SELECT p.id, p.booking_id, p.amount, p.payment_type, p.payment_method,
              p.status, p.stripe_payment_intent_id, p.card_brand, p.card_last4,
              p.created_at, p.succeeded_at,
              b.booking_number, b.customer_name
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       ORDER BY p.created_at DESC
       LIMIT $1`,
      limit
    )

    return results.map((r) => ({
      id: r.id,
      booking_id: r.booking_id,
      amount: Number(r.amount),
      payment_type: r.payment_type,
      payment_method: r.payment_method,
      status: r.status,
      stripe_payment_intent_id: r.stripe_payment_intent_id,
      card_brand: r.card_brand,
      card_last4: r.card_last4,
      created_at: r.created_at?.toISOString() || '',
      succeeded_at: r.succeeded_at?.toISOString() || null,
      booking_number: r.booking_number,
      customer_name: r.customer_name,
    }))
  } catch {
    return []
  }
}
