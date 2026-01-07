/**
 * Booking Service Module
 *
 * @module lib/services/booking
 * @description Main entry point for booking services.
 * Provides a unified facade that maintains backward compatibility with the
 * original monolithic BookingService while using the split domain services internally.
 *
 * @example
 * ```typescript
 * // Import the unified facade (recommended for most use cases)
 * import { bookingService } from '@/lib/services/booking';
 *
 * // Or import specific services for targeted functionality
 * import { bookingCoreService } from '@/lib/services/booking';
 * import { bookingQueriesService } from '@/lib/services/booking';
 * import { bookingAvailabilityService } from '@/lib/services/booking';
 * import { bookingCreationService } from '@/lib/services/booking';
 * ```
 */

// Re-export types
export * from './types';

// Re-export domain services
export { bookingCoreService, BookingCoreService } from './core.service';
export { bookingQueriesService, BookingQueriesService } from './queries.service';
export { bookingAvailabilityService, BookingAvailabilityService } from './availability.service';
export { bookingCreationService, BookingCreationService } from './creation.service';

// Import services for the facade
import { bookingCoreService } from './core.service';
import { bookingQueriesService } from './queries.service';
import { bookingAvailabilityService } from './availability.service';
import { bookingCreationService } from './creation.service';
import {
  Booking,
  CreateBookingData,
  CreateFullBookingData,
  BookingListFilters,
  BookingQueryFilters,
  FullBookingDetails,
  AvailabilityCheckParams,
  AvailabilityResult,
  BookingStatus,
} from './types';

/**
 * Unified Booking Service Facade
 *
 * Maintains backward compatibility with the original monolithic service
 * while delegating to the appropriate domain service internally.
 */
class BookingServiceFacade {
  // ==========================================================================
  // Read Operations (delegated to core and queries services)
  // ==========================================================================

  async getById(id: number, include?: string[]): Promise<Booking | null> {
    return bookingCoreService.getById(id, include);
  }

  async getByNumber(bookingNumber: string): Promise<Booking> {
    return bookingCoreService.getByNumber(bookingNumber);
  }

  async getFullBookingByNumber(bookingNumber: string): Promise<FullBookingDetails | null> {
    return bookingQueriesService.getFullBookingByNumber(bookingNumber);
  }

  async getCustomerBookings(customerId: number): Promise<Booking[]> {
    return bookingCoreService.getCustomerBookings(customerId);
  }

  async getUpcomingBookings(limit: number = 10): Promise<Booking[]> {
    return bookingCoreService.getUpcomingBookings(limit);
  }

  async list(filters: BookingListFilters) {
    return bookingCoreService.list(filters);
  }

  async findManyWithFilters(filters: BookingQueryFilters): Promise<{ bookings: Booking[]; total: number }> {
    return bookingQueriesService.findManyWithFilters(filters);
  }

  async getFullBookingDetails(id: number | string): Promise<Booking | null> {
    return bookingQueriesService.getFullBookingDetails(id);
  }

  // ==========================================================================
  // Create Operations (delegated to core, creation, and availability services)
  // ==========================================================================

  async createBooking(data: CreateBookingData): Promise<Booking> {
    return bookingCoreService.createBooking(data);
  }

  async createFullBooking(data: CreateFullBookingData) {
    return bookingCreationService.createFullBooking(data);
  }

  async createBookingWithAvailability(data: CreateBookingData & {
    vehicleId?: number;
    endTime?: string;
  }): Promise<Booking & { vehicle_id: number }> {
    return bookingAvailabilityService.createBookingWithAvailability(data);
  }

  async checkBookingAvailability(params: AvailabilityCheckParams): Promise<AvailabilityResult> {
    return bookingAvailabilityService.checkBookingAvailability(params);
  }

  // ==========================================================================
  // Update Operations (delegated to core service)
  // ==========================================================================

  async updateById(id: number, data: Partial<Booking>): Promise<Booking> {
    return bookingCoreService.updateById(id, data);
  }

  async updateStatus(id: number, status: BookingStatus): Promise<Booking> {
    return bookingCoreService.updateStatus(id, status);
  }

  async confirmBooking(id: number): Promise<Booking> {
    return bookingCoreService.confirmBooking(id);
  }

  async updateBooking(id: number, data: Partial<Booking>): Promise<Booking> {
    return bookingCoreService.updateBooking(id, data);
  }

  async cancelBooking(id: number, reason?: string): Promise<Booking> {
    return bookingCoreService.cancelBooking(id, reason);
  }

  /**
   * Cancel booking with full vehicle availability release
   * This is the recommended method when the booking has an assigned vehicle.
   */
  async cancel(id: number, reason?: string): Promise<Booking> {
    return bookingAvailabilityService.cancelWithVehicleRelease(id, reason);
  }

  // ==========================================================================
  // Business Logic (delegated to core service)
  // ==========================================================================

  calculateTotalPrice(partySize: number, durationHours: number, date: string): number {
    return bookingCoreService.calculateTotalPrice(partySize, durationHours, date);
  }

  async getStatistics(startDate?: string, endDate?: string) {
    return bookingCoreService.getStatistics(startDate, endDate);
  }

  // ==========================================================================
  // Helper Methods (exposed for direct use if needed)
  // ==========================================================================

  calculateEndTime(startTime: string, durationHours: number): string {
    return bookingCoreService.calculateEndTime(startTime, durationHours);
  }

  async generateBookingNumber(): Promise<string> {
    return bookingCoreService.generateBookingNumber();
  }

  validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    return bookingCoreService.validateStatusTransition(currentStatus, newStatus);
  }
}

// Export the unified facade as the default bookingService
export const bookingService = new BookingServiceFacade();

// Also export the facade class for typing purposes
export { BookingServiceFacade };

// Default export for convenience
export default bookingService;
