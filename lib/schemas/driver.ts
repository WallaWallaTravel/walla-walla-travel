import { z } from 'zod'

// ─── Clock In ───────────────────────────────────────────────
export const ClockInSchema = z.object({
  vehicle_id: z.coerce.number().int().positive().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
})

export type ClockInInput = z.infer<typeof ClockInSchema>

// ─── Clock Out ──────────────────────────────────────────────
export const ClockOutSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  mileage_end: z.coerce.number().int().nonnegative().optional(),
  signature: z.string().min(1, 'Signature required').max(5000),
  notes: z.string().max(500).optional(),
})

export type ClockOutInput = z.infer<typeof ClockOutSchema>

// ─── Pre-Trip Inspection ────────────────────────────────────
export const InspectionItemSchema = z.object({
  item: z.string().min(1),
  status: z.enum(['pass', 'fail', 'na'], {
    error: 'Status must be pass, fail, or na',
  }),
  notes: z.string().max(500).optional(),
})

export const PreTripInspectionSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Vehicle required'),
  start_mileage: z.coerce.number().int().nonnegative().max(9999999).optional(),
  checklist_items: z.record(z.string(), z.boolean()).refine(
    (items) => Object.keys(items).length > 0,
    { message: 'At least one checklist item required' }
  ),
  notes: z.string().max(500).optional(),
  signature: z.string().min(1, 'Signature required').max(10000),
})

export type PreTripInspectionInput = z.infer<typeof PreTripInspectionSchema>

// ─── Post-Trip Inspection ───────────────────────────────────
export const DefectSchema = z.object({
  description: z.string().min(1, 'Description required').max(500),
  severity: z.enum(['minor', 'major', 'critical'], {
    error: 'Severity must be minor, major, or critical',
  }),
  photo_url: z.string().url().optional(),
})

export const PostTripInspectionSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Vehicle required'),
  end_mileage: z.coerce.number().int().nonnegative().max(9999999),
  fuel_level: z.enum(['Full', '3/4', '1/2', '1/4', 'Empty'], {
    error: 'Select a fuel level',
  }),
  checklist_items: z.record(z.string(), z.boolean()).refine(
    (items) => Object.keys(items).length > 0,
    { message: 'At least one checklist item required' }
  ),
  defects: z.array(DefectSchema).default([]),
  defects_found: z.boolean().default(false),
  vehicle_safe: z.boolean().default(true),
  notes: z.string().max(500).optional(),
  driver_signature: z.string().min(1, 'Driver signature required').max(10000),
  mechanic_signature: z.string().max(10000).optional(),
})

export type PostTripInspectionInput = z.infer<typeof PostTripInspectionSchema>

// ─── Break ──────────────────────────────────────────────────
export const BreakSchema = z.object({
  break_type: z.enum(['rest', 'meal', 'personal'], {
    error: 'Break type must be rest, meal, or personal',
  }),
  notes: z.string().max(500).optional(),
})

export type BreakInput = z.infer<typeof BreakSchema>

// ─── Tour Completion ────────────────────────────────────────
export const TourCompletionSchema = z.object({
  booking_id: z.coerce.number().int().positive('Booking ID required'),
  actual_hours: z.coerce.number().min(0).max(24).optional(),
  mileage: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
  expenses: z.array(z.object({
    description: z.string().min(1).max(200),
    amount: z.coerce.number().min(0),
    category: z.string().max(50).optional(),
  })).default([]),
})

export type TourCompletionInput = z.infer<typeof TourCompletionSchema>

// ─── Offer Response ─────────────────────────────────────────
export const OfferResponseSchema = z.object({
  offer_id: z.coerce.number().int().positive(),
  response: z.enum(['accept', 'decline'], {
    error: 'Response must be accept or decline',
  }),
  notes: z.string().max(500).optional(),
})

export type OfferResponseInput = z.infer<typeof OfferResponseSchema>
