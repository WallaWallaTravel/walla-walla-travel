import { logger } from '@/lib/logger';
/**
 * Request Validation Middleware
 * 
 * Provides helpers for validating requests with Zod schemas
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ValidationError } from './error-handler';

// ============================================================================
// Validate Request Body
// ============================================================================

export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw new ValidationError(
        'Request validation failed',
        formatZodErrors(error)
      );
    }
    throw error;
  }
}

// ============================================================================
// Validate Query Parameters
// ============================================================================

export function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): T {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    return schema.parse(query);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw new ValidationError(
        'Query parameter validation failed',
        formatZodErrors(error)
      );
    }
    throw error;
  }
}

// ============================================================================
// Validate URL Parameters
// ============================================================================

export async function validateParams<T>(
  params: Promise<any> | any,
  schema: z.ZodType<T>
): Promise<T> {
  try {
    // Handle both Promise and direct params
    const resolvedParams = params instanceof Promise ? await params : params;
    return schema.parse(resolvedParams);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw new ValidationError(
        'URL parameter validation failed',
        formatZodErrors(error)
      );
    }
    throw error;
  }
}

// ============================================================================
// Format Zod Errors
// ============================================================================

function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  // Zod v4 uses 'issues' instead of 'errors'
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

// ============================================================================
// Export for convenience
// ============================================================================

export { ValidationError } from './error-handler';

// =============================================================================
// Common Validation Schemas
// =============================================================================

/**
 * Common field validators for reuse
 */
export const commonValidators = {
  // Email validation
  email: z.string().email('Invalid email address').max(255),

  // Phone number (flexible format)
  phone: z.string()
    .regex(/^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/, 'Invalid phone number')
    .optional(),

  // Currency amount (positive, max 2 decimals)
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount exceeds maximum allowed')
    .refine(val => Number.isFinite(val) && Math.round(val * 100) / 100 === val, {
      message: 'Amount must have at most 2 decimal places',
    }),

  // Booking number format
  bookingNumber: z.string()
    .min(1, 'Booking number is required')
    .max(50, 'Booking number too long')
    .regex(/^[A-Z0-9-]+$/i, 'Invalid booking number format'),

  // UUID validation
  uuid: z.string().uuid('Invalid ID format'),

  // Date string (ISO format)
  isoDate: z.string().datetime({ message: 'Invalid date format' }),

  // Positive integer
  positiveInt: z.number().int().positive(),

  // Non-empty string
  nonEmpty: z.string().min(1, 'This field is required'),
};

// =============================================================================
// Payment Schemas
// =============================================================================

/**
 * Schema for creating a payment intent
 */
export const CreatePaymentIntentSchema = z.object({
  booking_number: commonValidators.bookingNumber,
  amount: commonValidators.amount,
  payment_type: z.enum(['deposit', 'final_payment'], {
    message: 'Payment type must be "deposit" or "final_payment"',
  }).default('deposit'),
});

/**
 * Schema for confirming a payment
 */
export const ConfirmPaymentSchema = z.object({
  payment_intent_id: z.string()
    .min(1, 'Payment intent ID is required')
    .regex(/^pi_/, 'Invalid payment intent ID format'),
});

/**
 * Schema for reservation payment intent
 */
export const ReservationPaymentIntentSchema = z.object({
  amount: commonValidators.amount,
  reservationId: z.union([z.string(), z.number()]).transform(val => String(val)),
  customerEmail: commonValidators.email,
  customerName: commonValidators.nonEmpty,
  partySize: z.number().int().min(1).max(100).optional(),
  preferredDate: z.string().optional(),
});

/**
 * Schema for confirming reservation payment
 */
export const ConfirmReservationPaymentSchema = z.object({
  paymentIntentId: z.string()
    .min(1, 'Payment intent ID is required')
    .regex(/^pi_/, 'Invalid payment intent ID format'),
  reservationId: z.union([z.string(), z.number()]).transform(val => String(val)),
});

// =============================================================================
// Booking Schemas
// =============================================================================

export const CreateBookingSchema = z.object({
  customer_name: commonValidators.nonEmpty.max(200),
  customer_email: commonValidators.email,
  customer_phone: commonValidators.phone,
  tour_date: commonValidators.isoDate,
  party_size: z.number().int().min(1).max(100),
  package_id: z.number().int().positive().optional(),
  special_requests: z.string().max(2000).optional(),
});

// =============================================================================
// Auth Schemas
// =============================================================================

export const LoginSchema = z.object({
  email: commonValidators.email,
  password: z.string().min(1, 'Password is required'),
});

export const PasswordResetRequestSchema = z.object({
  email: commonValidators.email,
});




