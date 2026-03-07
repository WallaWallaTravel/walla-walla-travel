import { z } from 'zod'

export const TOUR_TYPES = [
  'wine_tour',
  'private_transportation',
  'airport_transfer',
  'corporate',
  'wedding',
  'celebration',
  'custom',
] as const

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
  depositAmount: z.coerce.number().optional(),
  driverId: z.coerce.number().optional(),
  notes: z.string().optional(),
})

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>
