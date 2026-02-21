/**
 * Event Validation Schemas
 *
 * Zod schemas for validating event-related inputs.
 */

import { z } from 'zod';

/**
 * Slug format validation
 */
const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(255, 'Slug must not exceed 255 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

/**
 * Date string validation (YYYY-MM-DD)
 */
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Time string validation (HH:MM or HH:MM:SS)
 */
const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Time must be in HH:MM format');

/**
 * Event status enum
 */
const eventStatusSchema = z.enum(
  ['draft', 'published', 'cancelled', 'past', 'pending_review'],
  { message: 'Status must be one of: draft, published, cancelled, past, pending_review' }
);

/**
 * Create event validation
 */
export const createEventSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .trim(),
  short_description: z
    .string()
    .max(200, 'Short description must not exceed 200 characters')
    .trim()
    .optional()
    .nullable(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .trim(),

  // Categorization
  category_id: z.number().int().positive('Category ID must be a positive integer').optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional().nullable(),

  // Date/Time
  start_date: dateSchema,
  end_date: dateSchema.optional().nullable(),
  start_time: timeSchema.optional().nullable(),
  end_time: timeSchema.optional().nullable(),
  is_all_day: z.boolean().optional().default(false),

  // Location
  venue_name: z.string().max(255).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().default('Walla Walla'),
  state: z.string().length(2, 'State must be 2 characters').optional().default('WA'),
  zip: z.string().max(10).optional().nullable(),

  // Media
  featured_image_url: z.string().url('Invalid image URL').optional().nullable(),
  gallery_urls: z.array(z.string().url('Invalid gallery URL')).max(20).optional().nullable(),

  // Pricing
  is_free: z.boolean().optional().default(true),
  price_min: z.number().min(0, 'Minimum price cannot be negative').optional().nullable(),
  price_max: z.number().min(0, 'Maximum price cannot be negative').optional().nullable(),
  ticket_url: z.string().url('Invalid ticket URL').optional().nullable(),

  // Organizer
  organizer_name: z.string().max(255).trim().optional().nullable(),
  organizer_website: z.string().url('Invalid organizer website URL').optional().nullable(),
  organizer_email: z.string().email('Invalid organizer email').optional().nullable(),
  organizer_phone: z.string().max(50).optional().nullable(),

  // Featured
  is_featured: z.boolean().optional().default(false),
  feature_priority: z.number().int().min(0).optional().default(0),

  // SEO
  meta_title: z.string().max(255).trim().optional().nullable(),
  meta_description: z.string().max(300).trim().optional().nullable(),
}).refine(
  (data) => {
    if (data.end_date && data.start_date) {
      return data.end_date >= data.start_date;
    }
    return true;
  },
  { message: 'End date must be on or after start date', path: ['end_date'] }
).refine(
  (data) => {
    if (data.price_min != null && data.price_max != null) {
      return data.price_max >= data.price_min;
    }
    return true;
  },
  { message: 'Maximum price must be greater than or equal to minimum price', path: ['price_max'] }
);

/**
 * Update event validation (partial version of create)
 */
export const updateEventSchema = z.object({
  title: z.string().min(3).max(255).trim().optional(),
  short_description: z.string().max(200).trim().optional().nullable(),
  description: z.string().min(10).trim().optional(),
  category_id: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional().nullable(),
  start_time: timeSchema.optional().nullable(),
  end_time: timeSchema.optional().nullable(),
  is_all_day: z.boolean().optional(),
  venue_name: z.string().max(255).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  city: z.string().max(100).trim().optional(),
  state: z.string().length(2).optional(),
  zip: z.string().max(10).optional().nullable(),
  featured_image_url: z.string().url().optional().nullable(),
  gallery_urls: z.array(z.string().url()).max(20).optional().nullable(),
  is_free: z.boolean().optional(),
  price_min: z.number().min(0).optional().nullable(),
  price_max: z.number().min(0).optional().nullable(),
  ticket_url: z.string().url().optional().nullable(),
  organizer_name: z.string().max(255).trim().optional().nullable(),
  organizer_website: z.string().url().optional().nullable(),
  organizer_email: z.string().email().optional().nullable(),
  organizer_phone: z.string().max(50).optional().nullable(),
  is_featured: z.boolean().optional(),
  feature_priority: z.number().int().min(0).optional(),
  meta_title: z.string().max(255).trim().optional().nullable(),
  meta_description: z.string().max(300).trim().optional().nullable(),
  status: eventStatusSchema.optional(),
});

/**
 * Event filters validation (for query params)
 */
export const eventFiltersSchema = z.object({
  category: slugSchema.optional(),
  search: z.string().max(200).trim().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  isFree: z.coerce.boolean().optional(),
  status: eventStatusSchema.optional(),
  isFeatured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Track event interaction
 */
export const trackEventSchema = z.object({
  type: z.enum(['view', 'click'], { message: 'Type must be view or click' }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventFiltersInput = z.infer<typeof eventFiltersSchema>;
export type TrackEventInput = z.infer<typeof trackEventSchema>;
