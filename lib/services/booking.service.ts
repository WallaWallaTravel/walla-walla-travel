/**
 * Booking Service
 *
 * @module lib/services/booking.service
 * @description Re-exports from the modular booking service for backward compatibility.
 *
 * @deprecated Import from '@/lib/services/booking' instead for better tree-shaking.
 *
 * @example
 * ```typescript
 * // Old way (still works)
 * import { bookingService } from '@/lib/services/booking.service';
 *
 * // New way (recommended)
 * import { bookingService } from '@/lib/services/booking';
 *
 * // Or import specific services
 * import { bookingCoreService, bookingQueriesService } from '@/lib/services/booking';
 * ```
 */

// Re-export everything from the modular booking service
export * from './booking';
export { default } from './booking';

// Also export BookingService as an alias for the facade class
export { BookingServiceFacade as BookingService } from './booking';
