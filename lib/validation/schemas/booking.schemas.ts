/**
 * Booking Validation Schemas
 * 
 * Zod schemas for booking-related API requests
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

export const BookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
]);

export const PaymentStatusSchema = z.enum([
  'pending',
  'partial',
  'paid',
  'refunded'
]);

// ============================================================================
// Check Availability Schema
// ============================================================================

export const CheckAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  duration_hours: z.number()
    .int('Duration must be an integer')
    .min(4, 'Minimum duration is 4 hours')
    .max(8, 'Maximum duration is 8 hours')
    .refine(val => [4, 6, 8].includes(val), 'Duration must be 4, 6, or 8 hours'),
  party_size: z.number()
    .int('Party size must be an integer')
    .min(1, 'Minimum party size is 1')
    .max(14, 'Maximum party size is 14'),
  start_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    .optional(),
});

export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilitySchema>;

// ============================================================================
// Calculate Price Schema
// ============================================================================

export const CalculatePriceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_hours: z.number().int().min(4).max(8),
  party_size: z.number().int().min(1).max(14),
  vehicle_type: z.enum(['sedan', 'sprinter', 'luxury']).optional(),
});

export type CalculatePriceInput = z.infer<typeof CalculatePriceSchema>;

// ============================================================================
// Create Booking Schema
// ============================================================================

export const CustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number')
    .min(10, 'Phone number must be at least 10 digits'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

export const WineryStopSchema = z.object({
  winery_id: z.number().int().positive(),
  stop_order: z.number().int().positive(),
  duration_minutes: z.number().int().min(30).max(240),
  drive_time_to_next_minutes: z.number().int().min(0).max(120).optional(),
  special_notes: z.string().max(500).optional(),
});

export const CreateBookingSchema = z.object({
  customer: CustomerSchema,
  booking: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    duration_hours: z.number().int().min(4).max(8),
    party_size: z.number().int().min(1).max(14),
    pickup_location: z.string().min(5, 'Pickup location is required'),
    dropoff_location: z.string().min(5, 'Dropoff location is required'),
    special_requests: z.string().max(1000).optional(),
  }),
  wineries: z.array(WineryStopSchema).min(1, 'At least one winery stop is required'),
  payment: z.object({
    deposit_amount: z.number().positive(),
    payment_method: z.enum(['card', 'ach', 'check']),
    payment_intent_id: z.string().optional(),
  }),
  marketing_consent: z.boolean().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

// ============================================================================
// Update Booking Schema
// ============================================================================

export const UpdateBookingSchema = z.object({
  status: BookingStatusSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration_hours: z.number().int().min(4).max(8).optional(),
  party_size: z.number().int().min(1).max(14).optional(),
  pickup_location: z.string().min(5).optional(),
  dropoff_location: z.string().min(5).optional(),
  special_requests: z.string().max(1000).optional(),
  driver_id: z.number().int().positive().optional(),
  vehicle_id: z.number().int().positive().optional(),
  payment_status: PaymentStatusSchema.optional(),
});

export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;

// ============================================================================
// List Bookings Query Schema
// ============================================================================

export const ListBookingsQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
  month: z.string().regex(/^(0[1-9]|1[0-2])$/).optional(),
  status: BookingStatusSchema.optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  brand_id: z.coerce.number().int().positive().optional(),
  include: z.string().optional(), // Comma-separated relations
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListBookingsQuery = z.infer<typeof ListBookingsQuerySchema>;

// ============================================================================
// Booking ID Param Schema
// ============================================================================

export const BookingIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const BookingNumberSchema = z.object({
  bookingNumber: z.string().regex(/^[A-Z]{3,4}-\d{4}-\d{5}$/),
});

export type BookingIdParam = z.infer<typeof BookingIdSchema>;
export type BookingNumberParam = z.infer<typeof BookingNumberSchema>;




