/**
 * Centralized Type Definitions
 * 
 * All types for the Walla Walla Travel system.
 * Import from this file instead of individual type files.
 * 
 * @example
 * import { User, Vehicle, TimeCard } from '@/lib/types';
 */

// User types
export * from './user';

// Vehicle types
export * from './vehicle';

// Time card types (LocationData defined here, excluded from client-service)
export * from './timecard';

// Inspection types
export * from './inspection';

// Client service types (exclude LocationData to avoid duplicate, use timecard's version)
export type {
  ServiceStatus,
  ServiceType,
  ClientService,
  ClientBooking,
  ServiceWithDetails,
  BillingCalculation,
  ClientPickupData,
  ClientDropoffData,
  ServiceSummary,
  RevenueReport,
  ServiceStatistics,
  BillingPreview,
  CreateClientServiceData,
  UpdateClientServiceData,
  ServiceAssignmentData,
  // Note: LocationData is exported from timecard.ts
  // Note: PaymentStatus for client-service is the same as booking's PaymentStatus
} from './client-service';

// API types
export * from './api';

// Database types
export * from './database';

// Booking system types (Phase 2) - PaymentStatus defined here takes precedence
export * from './booking';
