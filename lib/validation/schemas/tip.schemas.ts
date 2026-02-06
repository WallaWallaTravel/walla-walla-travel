/**
 * Tip Collection Validation Schemas
 *
 * Zod schemas for driver tip collection and tour completion APIs
 */

import { z } from 'zod';

// ============================================================================
// Status Enums
// ============================================================================

export const TipPaymentStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
]);

export const ExpenseTypeSchema = z.enum([
  'lunch',
  'parking',
  'toll',
  'fuel',
  'other',
]);

export const ReimbursementStatusSchema = z.enum([
  'pending',
  'approved',
  'reimbursed',
  'denied',
]);

export const TipSourceSchema = z.enum([
  'qr_code',
  'payment_link',
  'manual',
]);

// ============================================================================
// Tour Completion Schemas
// ============================================================================

/**
 * Schema for completing a tour
 */
export const CompleteTourSchema = z.object({
  lunch_cost_total: z
    .number()
    .min(0, 'Lunch cost cannot be negative')
    .max(1000, 'Lunch cost seems too high')
    .optional()
    .nullable(),
  driver_notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
  tips_enabled: z.boolean().default(true),
});

export type CompleteTourInput = z.infer<typeof CompleteTourSchema>;

// ============================================================================
// Expense Schemas
// ============================================================================

/**
 * Schema for creating a tour expense
 */
export const CreateExpenseSchema = z.object({
  booking_id: z.number().int().positive('Booking ID is required'),
  expense_type: ExpenseTypeSchema,
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000, 'Amount seems too high'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  receipt_storage_path: z.string().max(500).optional(),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

/**
 * Schema for receipt upload
 */
export const UploadReceiptSchema = z.object({
  booking_id: z.number().int().positive('Booking ID is required'),
  expense_type: ExpenseTypeSchema,
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000, 'Amount seems too high'),
  description: z.string().max(500).optional(),
});

export type UploadReceiptInput = z.infer<typeof UploadReceiptSchema>;

// ============================================================================
// Tip Payment Schemas
// ============================================================================

/**
 * Schema for generating a tip payment link
 */
export const GenerateTipLinkSchema = z.object({
  booking_id: z.number().int().positive('Booking ID is required'),
});

export type GenerateTipLinkInput = z.infer<typeof GenerateTipLinkSchema>;

/**
 * Schema for creating a tip payment intent (guest-facing)
 */
export const CreateTipPaymentIntentSchema = z.object({
  amount: z
    .number()
    .positive('Tip amount must be greater than 0')
    .max(1000, 'Tip amount cannot exceed $1,000'),
  guest_name: z.string().max(255, 'Name cannot exceed 255 characters').optional(),
});

export type CreateTipPaymentIntentInput = z.infer<typeof CreateTipPaymentIntentSchema>;

/**
 * Schema for tip percentage calculation request
 */
export const TipCalculationSchema = z.object({
  tour_total: z.number().positive('Tour total must be greater than 0'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
});

export type TipCalculationInput = z.infer<typeof TipCalculationSchema>;

// ============================================================================
// Tip History Schemas
// ============================================================================

/**
 * Schema for querying tip history
 */
export const TipHistoryQuerySchema = z.object({
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  status: TipPaymentStatusSchema.optional(),
  payroll_exported: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type TipHistoryQueryInput = z.infer<typeof TipHistoryQuerySchema>;

// ============================================================================
// Tip Code Validation
// ============================================================================

/**
 * Schema for validating tip codes
 */
export const TipCodeSchema = z
  .string()
  .min(6, 'Tip code must be at least 6 characters')
  .max(20, 'Tip code cannot exceed 20 characters')
  .regex(/^[A-Z0-9]+$/, 'Tip code must contain only uppercase letters and numbers');

export type TipCode = z.infer<typeof TipCodeSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface TipPageData {
  booking_id: number;
  driver_name: string;
  tour_date: string;
  tour_total: number;
  brand_name: string;
  brand_logo_url?: string;
  tips_enabled: boolean;
  tip_code: string;
}

export interface TipPaymentResult {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
}

export interface TipRecord {
  id: number;
  booking_id: number;
  driver_id: number;
  guest_name: string | null;
  amount: number;
  payment_status: string;
  tip_source: string;
  payroll_exported: boolean;
  created_at: string;
  booking_number?: string;
  customer_name?: string;
  tour_date?: string;
}

export interface TourCompletionResult {
  id: number;
  booking_id: number;
  driver_id: number;
  tip_code: string;
  tip_payment_link: string;
  tip_qr_code_url: string;
  tips_enabled: boolean;
  lunch_cost_total: number | null;
  driver_notes: string | null;
  completed_at: string;
}

export interface ExpenseRecord {
  id: number;
  booking_id: number;
  driver_id: number;
  expense_type: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  reimbursement_status: string;
  created_at: string;
}
