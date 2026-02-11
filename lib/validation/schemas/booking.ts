/**
 * Booking Validation Schemas
 * Zod schemas for booking API endpoints
 */

import { z } from 'zod';

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;

/**
 * Valid tour durations (5 or 6 hours)
 */
export const tourDurationSchema = z.union([
  z.literal(5.0),
  z.literal(6.0)
]);

/**
 * Party size validation (1-14 passengers)
 */
export const partySizeSchema = z.number().int().min(1).max(14);

/**
 * Tour date validation (future date only)
 */
export const tourDateSchema = z.string().refine((date) => {
  const tourDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tourDate >= today;
}, {
  message: "Tour date must be in the future"
});

/**
 * Time validation (HH:MM format)
 */
export const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Time must be in HH:MM format (e.g., 09:00)"
});

/**
 * Vehicle type validation
 */
export const vehicleTypeSchema = z.literal('sprinter');

/**
 * Booking status validation
 */
export const bookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'assigned',
  'in_progress',
  'completed',
  'cancelled'
]);

// ============================================================================
// CHECK AVAILABILITY SCHEMA
// ============================================================================

/**
 * POST /api/bookings/check-availability
 * Check if tours are available for a specific date
 */
export const checkAvailabilitySchema = z.object({
  date: tourDateSchema,
  duration_hours: tourDurationSchema,
  party_size: partySizeSchema,
  vehicle_type: vehicleTypeSchema.optional()
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

// ============================================================================
// CALCULATE PRICE SCHEMA
// ============================================================================

/**
 * POST /api/bookings/calculate-price
 * Calculate pricing for booking parameters
 */
export const calculatePriceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  duration_hours: tourDurationSchema,
  party_size: partySizeSchema,
  vehicle_type: vehicleTypeSchema.optional(),
  winery_count: z.number().int().min(2).max(4, "Maximum 4 wineries per tour").optional()
});

export type CalculatePriceInput = z.infer<typeof calculatePriceSchema>;

// ============================================================================
// CREATE BOOKING SCHEMA
// ============================================================================

/**
 * Winery selection for booking
 */
const winerySelectionSchema = z.object({
  winery_id: z.number().int().positive(),
  visit_order: z.number().int().min(1).max(4)
});

/**
 * Customer information schema
 */
const customerInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email format").regex(EMAIL_REGEX, "Invalid email format"),
  phone: z.string()
    .regex(PHONE_REGEX, "Invalid phone number format. Use format: +1-509-555-0123")
    .optional()
});

/**
 * Booking details schema
 */
const bookingDetailsSchema = z.object({
  tour_date: tourDateSchema,
  start_time: timeSchema,
  duration_hours: tourDurationSchema,
  party_size: partySizeSchema,
  pickup_location: z.string().min(10, "Pickup location must be detailed (address)").max(500),
  dropoff_location: z.string().max(500).optional(),
  special_requests: z.string().max(2000).optional(),
  dietary_restrictions: z.string().max(1000).optional(),
  accessibility_needs: z.string().max(1000).optional()
});

/**
 * Payment information schema (for Stripe integration)
 */
const paymentInfoSchema = z.object({
  stripe_payment_method_id: z.string().min(1, "Payment method required"),
  save_payment_method: z.boolean().optional().default(false)
});

/**
 * Marketing consent schema
 */
const marketingConsentSchema = z.object({
  email: z.boolean().optional().default(false),
  sms: z.boolean().optional().default(false)
});

/**
 * POST /api/bookings/create
 * Create a new booking with payment
 */
export const createBookingSchema = z.object({
  customer: customerInfoSchema,
  booking: bookingDetailsSchema,
  wineries: z.array(winerySelectionSchema)
    .min(2, "Select at least 2 wineries")
    .max(4, "Maximum 4 wineries per tour")
    .refine((wineries) => {
      // Validate unique winery IDs
      const ids = wineries.map(w => w.winery_id);
      return new Set(ids).size === ids.length;
    }, {
      message: "Cannot select the same winery multiple times"
    })
    .refine((wineries) => {
      // Validate sequential visit orders
      const orders = wineries.map(w => w.visit_order).sort((a, b) => a - b);
      for (let i = 0; i < orders.length; i++) {
        if (orders[i] !== i + 1) {
          return false;
        }
      }
      return true;
    }, {
      message: "Visit orders must be sequential starting from 1"
    }),
  payment: paymentInfoSchema,
  marketing_consent: marketingConsentSchema.optional()
}).refine((data) => {
  const wineryCount = data.wineries.length;
  const duration = data.booking.duration_hours;

  if (duration === 5.0 && (wineryCount < 2 || wineryCount > 2)) {
    return false;
  }
  if (duration === 6.0 && (wineryCount < 2 || wineryCount > 3)) {
    return false;
  }
  return true;
}, {
  message: "Winery count doesn't match tour duration. 5hr: 2 wineries + lunch, 6hr: 2-3 wineries",
  path: ["wineries"]
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ============================================================================
// BOOKING MODIFICATION SCHEMAS
// ============================================================================

/**
 * PUT /api/bookings/[bookingNumber]/modify
 * Modify an existing booking
 */
export const modifyBookingSchema = z.object({
  changes: z.object({
    tour_date: tourDateSchema.optional(),
    start_time: timeSchema.optional(),
    party_size: partySizeSchema.optional(),
    pickup_location: z.string().min(10).max(500).optional(),
    dropoff_location: z.string().max(500).optional(),
    special_requests: z.string().max(2000).optional(),
    dietary_restrictions: z.string().max(1000).optional(),
    accessibility_needs: z.string().max(1000).optional()
  }).refine((changes) => {
    // At least one field must be changed
    return Object.keys(changes).length > 0;
  }, {
    message: "At least one field must be provided to modify the booking"
  }),
  reason: z.string().min(5, "Modification reason required").max(500).optional()
});

export type ModifyBookingInput = z.infer<typeof modifyBookingSchema>;

/**
 * POST /api/bookings/[bookingNumber]/cancel
 * Cancel a booking
 */
export const cancelBookingSchema = z.object({
  reason: z.string().min(5, "Cancellation reason required").max(500),
  refund_amount: z.number().min(0).optional()
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ============================================================================
// ADMIN BOOKING SCHEMAS
// ============================================================================

/**
 * GET /api/admin/bookings (query parameters)
 */
export const adminBookingFiltersSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.union([
    bookingStatusSchema,
    z.array(bookingStatusSchema)
  ]).optional(),
  driver_id: z.coerce.number().int().positive().optional(),
  vehicle_id: z.coerce.number().int().positive().optional(),
  customer_email: z.string().email().optional(),
  booking_number: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type AdminBookingFilters = z.infer<typeof adminBookingFiltersSchema>;

/**
 * POST /api/admin/bookings/manual
 * Create manual booking (phone bookings)
 */
export const createManualBookingSchema = z.object({
  customer: customerInfoSchema,
  booking: bookingDetailsSchema.extend({
    payment_status: z.enum(['paid_offline', 'payment_pending', 'deposit_paid']).default('payment_pending')
  }),
  wineries: z.array(winerySelectionSchema).min(2).max(4),
  assignment: z.object({
    driver_id: z.number().int().positive().optional(),
    vehicle_id: z.number().int().positive().optional()
  }).optional(),
  internal_notes: z.string().max(2000).optional()
});

export type CreateManualBookingInput = z.infer<typeof createManualBookingSchema>;

/**
 * PUT /api/admin/bookings/[id]/assign
 * Assign driver and vehicle to booking
 */
export const assignBookingSchema = z.object({
  driver_id: z.number().int().positive(),
  vehicle_id: z.number().int().positive(),
  notify_driver: z.boolean().default(true),
  notify_customer: z.boolean().default(true),
  internal_notes: z.string().max(500).optional()
});

export type AssignBookingInput = z.infer<typeof assignBookingSchema>;
