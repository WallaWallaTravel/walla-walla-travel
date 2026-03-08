import { z } from 'zod'

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

export const TOUR_TYPES = [
  'wine_tour',
  'private_transportation',
  'airport_transfer',
  'corporate',
  'wedding',
  'celebration',
  'custom',
] as const

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const

// ============================================================================
// CREATE BOOKING SCHEMA (Phase 1 template — Quick Create form)
// ============================================================================

export const CreateBookingSchema = z.object({
  customerFirstName: z.string().min(1, 'First name required'),
  customerLastName: z.string().min(1, 'Last name required'),
  customerEmail: z.string().email('Valid email required'),
  customerPhone: z.string().min(1, 'Phone required'),
  tripDate: z.string().min(1, 'Date required'),
  tourType: z.enum(TOUR_TYPES, {
    error: 'Select a tour type',
  }),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 hour'),
  groupSize: z.coerce.number().min(1, 'Group size must be at least 1'),
  pickupLocation: z.string().min(1, 'Pickup location required'),
  dropoffLocation: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountDollar: z.coerce.number().min(0).optional(),
  lunchCostPerPerson: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0).optional(),
  depositAmount: z.coerce.number().optional(),
  driverId: z.coerce.number().optional(),
  notes: z.string().optional(),
})

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>

// ============================================================================
// UPDATE BOOKING SCHEMA — For editing booking details
// ============================================================================

export const UpdateBookingSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  customerEmail: z.string().email('Valid email required').optional(),
  customerPhone: z.string().optional(),
  partySize: z.coerce.number().int().min(1, 'At least 1 guest').max(14, 'Maximum 14 guests').optional(),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM').optional(),
  durationHours: z.coerce.number().min(1).max(12).optional(),
  pickupLocation: z.string().max(500).optional(),
  dropoffLocation: z.string().max(500).optional(),
  specialRequests: z.string().max(2000).optional(),
  tourType: z.enum(TOUR_TYPES, { error: 'Invalid tour type' }).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0).optional(),
  depositAmount: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided to update' }
)

export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>

// ============================================================================
// ASSIGN DRIVER SCHEMA — For driver + vehicle assignment
// ============================================================================

export const AssignDriverSchema = z.object({
  driverId: z.coerce.number().int().positive('Driver is required'),
  vehicleId: z.coerce.number().int().positive('Vehicle is required').optional(),
  notifyDriver: z.boolean().default(true),
  notifyCustomer: z.boolean().default(true),
})

export type AssignDriverInput = z.infer<typeof AssignDriverSchema>

// ============================================================================
// UPDATE BOOKING STATUS SCHEMA — For status transitions
// ============================================================================

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES, {
    error: 'Invalid booking status',
  }),
  reason: z.string().max(500).optional(),
})

export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>

// ============================================================================
// BOOKING FILTERS SCHEMA — For list/search queries
// ============================================================================

export const BookingFiltersSchema = z.object({
  status: z.enum(BOOKING_STATUSES, { error: 'Invalid status' }).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  driverId: z.coerce.number().int().positive().optional(),
  customerEmail: z.string().email().optional(),
  bookingNumber: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type BookingFilters = z.infer<typeof BookingFiltersSchema>
