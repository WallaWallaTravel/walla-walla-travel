/**
 * Prisma Services Index
 *
 * Central export point for all Prisma-based services.
 * Import from here for clean, type-safe service access.
 *
 * Usage:
 *   import { bookingService, paymentService } from '@/lib/services/prisma';
 *
 * The old raw SQL services are still available for backwards compatibility
 * but should be migrated to use these Prisma services.
 */

// Base service (for extending)
export { PrismaBaseService } from '../prisma-base.service';
export type {
  PaginatedResponse,
  PaginationOptions,
  AuditLogEntry,
  IsolationLevel,
} from '../prisma-base.service';

// Core Services
export { bookingPrismaService as bookingService } from '../booking.prisma.service';
export type {
  Booking,
  BookingWithRelations,
  CreateBookingInput,
  BookingFilters,
} from '../booking.prisma.service';

export { paymentPrismaService as paymentService } from '../payment.prisma.service';
export type {
  Payment,
  PaymentWithRelations,
  CreatePaymentInput,
  PaymentStats,
} from '../payment.prisma.service';

export { userPrismaService as userService } from '../user.prisma.service';
export type {
  User,
  UserWithPassword,
  UserRole,
  CreateUserInput,
  UpdateUserInput,
  UserListFilters,
} from '../user.prisma.service';

// Entity Services
export { customerPrismaService as customerService } from '../customer.prisma.service';
export type {
  Customer,
  CustomerWithRelations,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListFilters,
} from '../customer.prisma.service';

export { vehiclePrismaService as vehicleService } from '../vehicle.prisma.service';
export type {
  Vehicle,
  VehicleWithDriver,
  VehicleListFilters,
  VehicleStatus,
} from '../vehicle.prisma.service';

export { driverPrismaService as driverService } from '../driver.prisma.service';
export type { Driver, DriverTour } from '../driver.prisma.service';

// Auth Service
export { authPrismaService as authService } from '../auth.prisma.service';
export type {
  LoginCredentials,
  LoginResult,
} from '../auth.prisma.service';

// Re-export Prisma client and types for convenience
export { prisma, Prisma } from '@/lib/prisma';
export type { PrismaClient } from '@/lib/prisma';
