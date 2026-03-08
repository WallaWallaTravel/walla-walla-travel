import { z } from 'zod'

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

export const INVOICE_TYPES = ['deposit', 'final', 'final_payment'] as const

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
  'void',
] as const

export const PAYMENT_TYPES = [
  'deposit',
  'final_payment',
  'trip_proposal_deposit',
  'refund',
  'tip',
  'guest_share',
  'group_payment',
] as const

export const PAYMENT_METHODS = [
  'credit_card',
  'stripe',
  'cash',
  'check',
  'bank_transfer',
  'other',
] as const

export const PAYMENT_STATUSES = [
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'disputed',
  'dispute_lost',
] as const

// ============================================================================
// APPROVE / SEND INVOICE SCHEMA (Server Action)
// ============================================================================

export const ApproveInvoiceSchema = z.object({
  bookingId: z.coerce.number().int().positive('Valid booking ID required'),
  reviewedHours: z.coerce.number().positive('Hours must be positive').optional(),
})

export type ApproveInvoiceInput = z.infer<typeof ApproveInvoiceSchema>

// ============================================================================
// RECORD PAYMENT SCHEMA (Server Action)
// ============================================================================

export const RecordPaymentSchema = z.object({
  bookingId: z.coerce.number().int().positive('Valid booking ID required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentType: z.enum(PAYMENT_TYPES, {
    error: 'Select a valid payment type',
  }),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    error: 'Select a valid payment method',
  }),
  stripePaymentIntentId: z.string().optional(),
  notes: z.string().optional(),
})

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>

// ============================================================================
// CONFIRM STRIPE PAYMENT SCHEMA (Server Action)
// ============================================================================

export const ConfirmStripePaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
})

export type ConfirmStripePaymentInput = z.infer<typeof ConfirmStripePaymentSchema>

// ============================================================================
// INVOICE LIST FILTERS
// ============================================================================

export const InvoiceFiltersSchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional(),
  invoiceType: z.enum(INVOICE_TYPES).optional(),
  bookingId: z.coerce.number().int().positive().optional(),
})

export type InvoiceFilters = z.infer<typeof InvoiceFiltersSchema>
