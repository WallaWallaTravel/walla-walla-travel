/**
 * Vehicle Validation Schemas
 * 
 * Zod schemas for vehicle and inspection-related API requests
 */

import { z } from 'zod';

// ============================================================================
// Vehicle Schemas
// ============================================================================

export const VehicleStatusSchema = z.enum([
  'available',
  'in_use',
  'out_of_service',
  'maintenance'
]);

export const ListVehiclesQuerySchema = z.object({
  available: z.enum(['true', 'false']).optional(),
  active: z.enum(['true', 'false']).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  status: VehicleStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListVehiclesQuery = z.infer<typeof ListVehiclesQuerySchema>;

// ============================================================================
// Inspection Schemas
// ============================================================================

export const InspectionTypeSchema = z.enum(['pre_trip', 'post_trip', 'dvir']);

export const DefectSeveritySchema = z.enum(['none', 'minor', 'critical']);

export const InspectionItemsSchema = z.record(z.string(), z.boolean());

export const PreTripInspectionSchema = z.object({
  vehicleId: z.number().int().positive(),
  startMileage: z.number().int().min(0),
  inspectionData: z.object({
    items: InspectionItemsSchema,
    signature: z.string().optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export type PreTripInspectionInput = z.infer<typeof PreTripInspectionSchema>;

export const PostTripInspectionSchema = z.object({
  vehicleId: z.number().int().positive(),
  endMileage: z.number().int().min(0),
  inspectionData: z.object({
    items: InspectionItemsSchema,
    notes: z.string().max(1000).optional(),
    signature: z.string().optional(),
    fuelLevel: z.enum(['empty', 'quarter', 'half', 'three_quarters', 'full']).optional(),
    defectsFound: z.boolean().default(false),
    defectSeverity: DefectSeveritySchema.default('none'),
    defectDescription: z.string().max(2000).optional(),
  }),
});

export type PostTripInspectionInput = z.infer<typeof PostTripInspectionSchema>;

// ============================================================================
// Vehicle ID Param Schema
// ============================================================================

export const VehicleIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type VehicleIdParam = z.infer<typeof VehicleIdSchema>;




