'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  ApproveInvoiceSchema,
  RecordPaymentSchema,
  ConfirmStripePaymentSchema,
  type ApproveInvoiceInput,
  type RecordPaymentInput,
  type ConfirmStripePaymentInput,
} from '@/lib/schemas/invoice'

// ============================================================================
// TYPES
// ============================================================================

export type InvoiceActionResult = {
  success: boolean
  invoice?: {
    id: number
    invoice_number: string
    total_amount: number
  }
  error?: string | Record<string, string[]>
}

export type PaymentActionResult = {
  success: boolean
  payment?: {
    id: number
    amount: number
    status: string
    payment_type: string
  }
  error?: string | Record<string, string[]>
}

// ============================================================================
// APPROVE & SEND INVOICE (mutation)
// ============================================================================

export async function approveAndSendInvoice(
  data: ApproveInvoiceInput
): Promise<InvoiceActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = ApproveInvoiceSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { bookingId, reviewedHours } = parsed.data

  try {
    // 1. Get booking details — bookings model is available in Prisma
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
      },
    })

    if (!booking) {
      return { success: false, error: 'Booking not found' }
    }

    // Get driver name if assigned
    let driverName = 'Your Driver'
    if (booking.driver_id) {
      const driver = await prisma.users.findUnique({
        where: { id: booking.driver_id },
        select: { name: true },
      })
      if (driver?.name) driverName = driver.name
    }

    // 2. Calculate final amount
    const hours =
      reviewedHours ||
      Number(booking.actual_hours) ||
      Number(booking.estimated_hours) ||
      6.0
    const hourlyRate = Number(booking.hourly_rate) || 150.0
    const subtotal = hours * hourlyRate
    const taxAmount = 0
    const totalAmount = subtotal + taxAmount

    // 3. Check if final invoice already exists (invoices is @@ignore — use raw SQL)
    const existingInvoice = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM invoices
      WHERE booking_id = ${bookingId} AND invoice_type = 'final'
      LIMIT 1
    `

    if (existingInvoice.length > 0) {
      return {
        success: false,
        error: 'Final invoice already exists for this booking',
      }
    }

    // 4. Create invoice record (invoices is @@ignore — use raw SQL)
    const invoiceResult = await prisma.$queryRaw<
      { id: number; invoice_number: string; total_amount: number; sent_at: Date; due_date: Date }[]
    >`
      INSERT INTO invoices (
        booking_id,
        invoice_type,
        subtotal,
        tax_amount,
        total_amount,
        status,
        sent_at,
        due_date
      ) VALUES (
        ${bookingId},
        'final',
        ${subtotal},
        ${taxAmount},
        ${totalAmount},
        'sent',
        NOW(),
        CURRENT_DATE + INTERVAL '7 days'
      )
      RETURNING id, invoice_number, total_amount, sent_at, due_date
    `

    const invoice = invoiceResult[0]

    // 5. Update booking status via Prisma
    await prisma.bookings.update({
      where: { id: bookingId },
      data: {
        final_invoice_sent: true,
        final_invoice_sent_at: new Date(),
        final_invoice_approved_by: 1,
        final_invoice_approved_at: new Date(),
        status: 'awaiting_final_payment',
        updated_at: new Date(),
      },
    })

    // 6. Send email to customer (async, don't block)
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/final/${bookingId}`

    import('@/lib/email').then(async ({ sendEmail, EmailTemplates }) => {
      const emailTemplate = EmailTemplates.finalInvoice({
        customer_name: booking.customer_name,
        booking_number: booking.booking_number,
        invoice_number: invoice.invoice_number,
        tour_date: booking.tour_date
          ? new Date(booking.tour_date).toISOString().split('T')[0]
          : '',
        actual_hours: hours,
        hourly_rate: hourlyRate,
        subtotal,
        driver_name: driverName,
        payment_url: paymentUrl,
      })

      const emailSent = await sendEmail({
        to: booking.customer_email,
        ...emailTemplate,
      })

      if (emailSent) {
        logger.info('Final invoice email sent', { to: booking.customer_email })
      } else {
        logger.warn('Email not configured', {
          to: booking.customer_email,
          paymentUrl,
        })
      }
    }).catch((err) => {
      logger.error('Failed to send invoice email', { error: err })
    })

    return {
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: Number(invoice.total_amount),
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to approve invoice'
    logger.error('approveAndSendInvoice failed', { error, bookingId })
    return { success: false, error: message }
  }
}

// ============================================================================
// RECORD MANUAL PAYMENT (mutation)
// ============================================================================

export async function recordPayment(
  data: RecordPaymentInput
): Promise<PaymentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = RecordPaymentSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { bookingId, amount, paymentType, paymentMethod, stripePaymentIntentId, notes } =
    parsed.data

  try {
    // Verify booking exists
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { id: true, booking_number: true },
    })

    if (!booking) {
      return { success: false, error: 'Booking not found' }
    }

    // Create payment record — payments.id has no @default(autoincrement()) in Prisma
    // schema so we use raw SQL (the DB column is serial/auto-generated)
    const paymentResults = await prisma.$queryRaw<
      { id: number; amount: number; status: string; payment_type: string }[]
    >`
      INSERT INTO payments (
        booking_id, amount, payment_type, payment_method,
        stripe_payment_intent_id, status, succeeded_at, failure_reason
      ) VALUES (
        ${bookingId}, ${amount}, ${paymentType}, ${paymentMethod},
        ${stripePaymentIntentId || null}, 'succeeded', NOW(), ${notes || null}
      )
      RETURNING id, amount, status, payment_type
    `
    const payment = paymentResults[0]

    // Update booking based on payment type
    if (paymentType === 'deposit') {
      await prisma.bookings.update({
        where: { id: bookingId },
        data: {
          deposit_paid: true,
          deposit_paid_at: new Date(),
          status: 'confirmed',
          updated_at: new Date(),
        },
      })
    } else if (paymentType === 'final_payment') {
      await prisma.bookings.update({
        where: { id: bookingId },
        data: {
          final_payment_paid: true,
          final_payment_paid_at: new Date(),
          updated_at: new Date(),
        },
      })
    }

    // Create invoice record (@@ignore — raw SQL)
    await prisma.$queryRaw`
      INSERT INTO invoices (booking_id, invoice_type, subtotal, tax_amount, total_amount, status, sent_at, due_date)
      VALUES (${bookingId}, ${paymentType}, ${amount}, 0, ${amount}, 'paid', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `.catch(() => {
      // Invoice table might not exist or have different schema
    })

    // Create booking timeline entry (@@ignore — raw SQL)
    await prisma.$queryRaw`
      INSERT INTO booking_timeline (booking_id, event_type, event_description, event_data, created_at)
      VALUES (
        ${bookingId},
        'payment_received',
        ${`${paymentType === 'deposit' ? 'Deposit' : 'Payment'} of $${amount.toFixed(2)} recorded`},
        ${JSON.stringify({ amount, payment_type: paymentType, payment_method: paymentMethod })}::jsonb,
        NOW()
      )
    `.catch(() => {
      // Timeline table might not exist
    })

    return {
      success: true,
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        status: payment.status,
        payment_type: payment.payment_type,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record payment'
    logger.error('recordPayment failed', { error, bookingId })
    return { success: false, error: message }
  }
}

// ============================================================================
// CONFIRM STRIPE PAYMENT (mutation — called after Stripe payment intent succeeds)
// ============================================================================

export async function confirmStripePayment(
  data: ConfirmStripePaymentInput
): Promise<PaymentActionResult> {
  // This is called from the client after Stripe.js confirms payment
  // No admin auth required — customer can confirm their own payment

  const parsed = ConfirmStripePaymentSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { paymentIntentId } = parsed.data

  try {
    // Find payment record via Prisma
    const payment = await prisma.payments.findFirst({
      where: { stripe_payment_intent_id: paymentIntentId },
      select: {
        id: true,
        booking_id: true,
        amount: true,
        payment_type: true,
      },
    })

    if (!payment) {
      return { success: false, error: 'Payment record not found' }
    }

    if (!payment.booking_id) {
      return { success: false, error: 'Payment not linked to a booking' }
    }

    // Get booking details
    const booking = await prisma.bookings.findUnique({
      where: { id: payment.booking_id },
      select: {
        id: true,
        booking_number: true,
        customer_email: true,
        deposit_paid: true,
        final_payment_paid: true,
        brand_id: true,
      },
    })

    if (!booking) {
      return { success: false, error: 'Booking not found' }
    }

    // Verify payment with Stripe
    const { getBrandStripeClient } = await import('@/lib/stripe-brands')
    const stripe = getBrandStripeClient(booking.brand_id ?? undefined)
    if (!stripe) {
      return {
        success: false,
        error: 'Payment processing not configured. Please contact support.',
      }
    }

    const stripePaymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId)

    if (stripePaymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: `Payment not successful. Status: ${stripePaymentIntent.status}`,
      }
    }

    // Update payment status via Prisma
    await prisma.payments.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        succeeded_at: new Date(),
        updated_at: new Date(),
      },
    })

    // Update booking based on payment type
    const paymentType = payment.payment_type
    if (paymentType === 'deposit') {
      await prisma.bookings.update({
        where: { id: payment.booking_id },
        data: {
          deposit_paid: true,
          deposit_paid_at: new Date(),
          status: 'confirmed',
          updated_at: new Date(),
        },
      })
    } else if (paymentType === 'final_payment') {
      await prisma.bookings.update({
        where: { id: payment.booking_id },
        data: {
          final_payment_paid: true,
          final_payment_paid_at: new Date(),
          updated_at: new Date(),
        },
      })
    }

    // Create booking timeline event (@@ignore — raw SQL)
    await prisma.$queryRaw`
      INSERT INTO booking_timeline (
        booking_id,
        event_type,
        event_description,
        event_data,
        created_at
      ) VALUES (
        ${payment.booking_id},
        'payment_received',
        ${`${paymentType === 'deposit' ? 'Deposit' : 'Final payment'} received`},
        ${JSON.stringify({
          payment_intent_id: paymentIntentId,
          amount: Number(payment.amount),
          payment_type: paymentType,
        })}::jsonb,
        NOW()
      )
    `.catch(() => {})

    // Create invoice record (@@ignore — raw SQL)
    await prisma.$queryRaw`
      INSERT INTO invoices (booking_id, invoice_type, subtotal, tax_amount, total_amount, status, sent_at, due_date)
      VALUES (${payment.booking_id}, ${paymentType}, ${Number(payment.amount)}, 0, ${Number(payment.amount)}, 'paid', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `.catch(() => {})

    // Send receipt email async
    import('@/lib/services/email-automation.service').then(
      ({ sendPaymentReceiptEmail }) => {
        sendPaymentReceiptEmail(payment.id).catch((err) => {
          logger.error('Failed to send receipt email', {
            error: err,
            paymentId: payment.id,
          })
        })
      }
    )

    // CRM sync async
    prisma.bookings
      .findUnique({
        where: { id: payment.booking_id },
        select: { customer_id: true },
      })
      .then((bookingData) => {
        if (bookingData?.customer_id) {
          import('@/lib/services/crm-sync.service').then(
            ({ crmSyncService }) => {
              crmSyncService
                .logPaymentReceived(
                  bookingData.customer_id!,
                  Number(payment.amount),
                  paymentType,
                  payment.booking_id!
                )
                .catch((err) => {
                  logger.error('Failed to log to CRM', {
                    error: err,
                    paymentId: payment.id,
                  })
                })
            }
          )
        }
      })
      .catch(() => {})

    return {
      success: true,
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        status: 'succeeded',
        payment_type: paymentType,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to confirm payment'
    logger.error('confirmStripePayment failed', { error, paymentIntentId })
    return { success: false, error: message }
  }
}
