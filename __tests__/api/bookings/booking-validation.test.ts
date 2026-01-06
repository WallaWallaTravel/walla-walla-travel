/**
 * Booking Schema Validation Tests
 *
 * CRITICAL: Tests for booking-related Zod schemas
 * These validations protect against invalid bookings that could cause business issues
 *
 * Key features tested:
 * - Date format validation (YYYY-MM-DD)
 * - Time format validation (HH:MM)
 * - Party size limits (1-14)
 * - Duration constraints (4, 6, or 8 hours)
 * - Customer data validation (email, phone, name)
 * - Winery stop validation
 * - Payment validation
 */

import {
  CheckAvailabilitySchema,
  CalculatePriceSchema,
  CustomerSchema,
  WineryStopSchema,
  CreateBookingSchema,
  UpdateBookingSchema,
  ListBookingsQuerySchema,
  BookingIdSchema,
  BookingNumberSchema,
  BookingStatusSchema,
  PaymentStatusSchema,
} from '@/lib/validation/schemas/booking.schemas';

describe('Booking Validation Schemas', () => {
  // ============================================================================
  // BookingStatusSchema Tests
  // ============================================================================

  describe('BookingStatusSchema', () => {
    it('should accept valid booking statuses', () => {
      const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

      validStatuses.forEach(status => {
        const result = BookingStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid booking status', () => {
      const result = BookingStatusSchema.safeParse('invalid_status');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // PaymentStatusSchema Tests
  // ============================================================================

  describe('PaymentStatusSchema', () => {
    it('should accept valid payment statuses', () => {
      const validStatuses = ['pending', 'partial', 'paid', 'refunded'];

      validStatuses.forEach(status => {
        const result = PaymentStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid payment status', () => {
      const result = PaymentStatusSchema.safeParse('processing');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // CheckAvailabilitySchema Tests
  // ============================================================================

  describe('CheckAvailabilitySchema', () => {
    const validData = {
      date: '2025-02-15',
      duration_hours: 6,
      party_size: 4,
    };

    it('should accept valid availability check data', () => {
      const result = CheckAvailabilitySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    describe('date validation', () => {
      it('should reject invalid date format MM-DD-YYYY', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          date: '02-15-2025',
        });
        expect(result.success).toBe(false);
      });

      it('should reject date with slashes', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          date: '2025/02/15',
        });
        expect(result.success).toBe(false);
      });

      it('should reject incomplete date', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          date: '2025-02',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('duration_hours validation', () => {
      it('should accept 4 hour duration', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          duration_hours: 4,
        });
        expect(result.success).toBe(true);
      });

      it('should accept 6 hour duration', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          duration_hours: 6,
        });
        expect(result.success).toBe(true);
      });

      it('should accept 8 hour duration', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          duration_hours: 8,
        });
        expect(result.success).toBe(true);
      });

      it('should reject 5 hour duration (not 4, 6, or 8)', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          duration_hours: 5,
        });
        expect(result.success).toBe(false);
      });

      it('should reject 3 hour duration (below minimum)', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          duration_hours: 3,
        });
        expect(result.success).toBe(false);
      });

      it('should reject 10 hour duration (above maximum)', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          duration_hours: 10,
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-integer duration', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          duration_hours: 6.5,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('party_size validation', () => {
      it('should accept minimum party size of 1', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          party_size: 1,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum party size of 14', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          party_size: 14,
        });
        expect(result.success).toBe(true);
      });

      it('should reject party size of 0', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          party_size: 0,
        });
        expect(result.success).toBe(false);
      });

      it('should reject party size of 15', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          party_size: 15,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative party size', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          party_size: -1,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('start_time validation', () => {
      it('should accept valid start time', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          start_time: '10:00',
        });
        expect(result.success).toBe(true);
      });

      it('should accept start_time as optional', () => {
        const result = CheckAvailabilitySchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject time with seconds', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          start_time: '10:00:00',
        });
        expect(result.success).toBe(false);
      });

      it('should reject 12-hour format with AM/PM', () => {
        const result = CheckAvailabilitySchema.safeParse({
          ...validData,
          start_time: '10:00 AM',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // CalculatePriceSchema Tests
  // ============================================================================

  describe('CalculatePriceSchema', () => {
    const validData = {
      date: '2025-02-15',
      duration_hours: 6,
      party_size: 4,
    };

    it('should accept valid price calculation data', () => {
      const result = CalculatePriceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional vehicle_type sedan', () => {
      const result = CalculatePriceSchema.safeParse({
        ...validData,
        vehicle_type: 'sedan',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional vehicle_type sprinter', () => {
      const result = CalculatePriceSchema.safeParse({
        ...validData,
        vehicle_type: 'sprinter',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional vehicle_type luxury', () => {
      const result = CalculatePriceSchema.safeParse({
        ...validData,
        vehicle_type: 'luxury',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid vehicle_type', () => {
      const result = CalculatePriceSchema.safeParse({
        ...validData,
        vehicle_type: 'bus',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // CustomerSchema Tests
  // ============================================================================

  describe('CustomerSchema', () => {
    const validCustomer = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '509-555-1234',
    };

    it('should accept valid customer data', () => {
      const result = CustomerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
    });

    describe('name validation', () => {
      it('should reject name with 1 character', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          name: 'J',
        });
        expect(result.success).toBe(false);
      });

      it('should accept name with 2 characters', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          name: 'Jo',
        });
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          name: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('email validation', () => {
      it('should accept standard email format', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          email: 'test@example.com',
        });
        expect(result.success).toBe(true);
      });

      it('should accept email with subdomain', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          email: 'user@mail.example.com',
        });
        expect(result.success).toBe(true);
      });

      it('should accept email with plus sign', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          email: 'user+booking@example.com',
        });
        expect(result.success).toBe(true);
      });

      it('should reject email without @', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          email: 'notanemail',
        });
        expect(result.success).toBe(false);
      });

      it('should reject email without domain', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          email: 'user@',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('phone validation', () => {
      it('should accept phone with dashes', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          phone: '509-555-1234',
        });
        expect(result.success).toBe(true);
      });

      it('should accept phone with parentheses', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          phone: '(509) 555-1234',
        });
        expect(result.success).toBe(true);
      });

      it('should accept international format', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          phone: '+1 509 555 1234',
        });
        expect(result.success).toBe(true);
      });

      it('should accept phone without formatting', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          phone: '5095551234',
        });
        expect(result.success).toBe(true);
      });

      it('should reject phone with less than 10 digits', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          phone: '555-1234',
        });
        expect(result.success).toBe(false);
      });

      it('should reject phone with letters', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          phone: '509-555-WINE',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('optional fields', () => {
      it('should accept customer without address fields', () => {
        const result = CustomerSchema.safeParse(validCustomer);
        expect(result.success).toBe(true);
      });

      it('should accept customer with all address fields', () => {
        const result = CustomerSchema.safeParse({
          ...validCustomer,
          address: '123 Main St',
          city: 'Walla Walla',
          state: 'WA',
          zip_code: '99362',
        });
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // WineryStopSchema Tests
  // ============================================================================

  describe('WineryStopSchema', () => {
    const validStop = {
      winery_id: 1,
      stop_order: 1,
      duration_minutes: 60,
    };

    it('should accept valid winery stop', () => {
      const result = WineryStopSchema.safeParse(validStop);
      expect(result.success).toBe(true);
    });

    it('should accept stop with all fields', () => {
      const result = WineryStopSchema.safeParse({
        ...validStop,
        drive_time_to_next_minutes: 15,
        special_notes: 'Birthday celebration',
      });
      expect(result.success).toBe(true);
    });

    describe('duration_minutes validation', () => {
      it('should accept minimum 30 minutes', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          duration_minutes: 30,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum 240 minutes', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          duration_minutes: 240,
        });
        expect(result.success).toBe(true);
      });

      it('should reject duration below 30 minutes', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          duration_minutes: 15,
        });
        expect(result.success).toBe(false);
      });

      it('should reject duration above 240 minutes', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          duration_minutes: 300,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('drive_time_to_next_minutes validation', () => {
      it('should accept 0 drive time (same location)', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          drive_time_to_next_minutes: 0,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum 120 minutes drive time', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          drive_time_to_next_minutes: 120,
        });
        expect(result.success).toBe(true);
      });

      it('should reject drive time above 120 minutes', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          drive_time_to_next_minutes: 150,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('special_notes validation', () => {
      it('should accept notes up to 500 characters', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          special_notes: 'A'.repeat(500),
        });
        expect(result.success).toBe(true);
      });

      it('should reject notes over 500 characters', () => {
        const result = WineryStopSchema.safeParse({
          ...validStop,
          special_notes: 'A'.repeat(501),
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // CreateBookingSchema Tests
  // ============================================================================

  describe('CreateBookingSchema', () => {
    const validBookingData = {
      customer: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '509-555-1234',
      },
      booking: {
        date: '2025-02-15',
        start_time: '10:00',
        duration_hours: 6,
        party_size: 4,
        pickup_location: 'Marcus Whitman Hotel',
        dropoff_location: 'Marcus Whitman Hotel',
      },
      wineries: [
        {
          winery_id: 1,
          stop_order: 1,
          duration_minutes: 60,
        },
      ],
      payment: {
        deposit_amount: 200,
        payment_method: 'card',
      },
    };

    it('should accept valid booking data', () => {
      const result = CreateBookingSchema.safeParse(validBookingData);
      expect(result.success).toBe(true);
    });

    it('should accept booking with multiple wineries', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        wineries: [
          { winery_id: 1, stop_order: 1, duration_minutes: 60 },
          { winery_id: 2, stop_order: 2, duration_minutes: 60, drive_time_to_next_minutes: 15 },
          { winery_id: 3, stop_order: 3, duration_minutes: 60 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject booking without wineries', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        wineries: [],
      });
      expect(result.success).toBe(false);
    });

    it('should accept payment with card method', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        payment: { deposit_amount: 200, payment_method: 'card' },
      });
      expect(result.success).toBe(true);
    });

    it('should accept payment with ach method', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        payment: { deposit_amount: 200, payment_method: 'ach' },
      });
      expect(result.success).toBe(true);
    });

    it('should accept payment with check method', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        payment: { deposit_amount: 200, payment_method: 'check' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid payment method', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        payment: { deposit_amount: 200, payment_method: 'bitcoin' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero deposit amount', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        payment: { deposit_amount: 0, payment_method: 'card' },
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional marketing_consent', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        marketing_consent: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject pickup_location less than 5 characters', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        booking: {
          ...validBookingData.booking,
          pickup_location: 'Home',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept special_requests', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        booking: {
          ...validBookingData.booking,
          special_requests: 'Need wheelchair accessible vehicle',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject special_requests over 1000 characters', () => {
      const result = CreateBookingSchema.safeParse({
        ...validBookingData,
        booking: {
          ...validBookingData.booking,
          special_requests: 'A'.repeat(1001),
        },
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // UpdateBookingSchema Tests
  // ============================================================================

  describe('UpdateBookingSchema', () => {
    it('should accept empty update (no changes)', () => {
      const result = UpdateBookingSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept status update', () => {
      const result = UpdateBookingSchema.safeParse({ status: 'confirmed' });
      expect(result.success).toBe(true);
    });

    it('should accept partial update with multiple fields', () => {
      const result = UpdateBookingSchema.safeParse({
        status: 'confirmed',
        party_size: 6,
        driver_id: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept vehicle_id update', () => {
      const result = UpdateBookingSchema.safeParse({ vehicle_id: 2 });
      expect(result.success).toBe(true);
    });

    it('should accept payment_status update', () => {
      const result = UpdateBookingSchema.safeParse({ payment_status: 'paid' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status in update', () => {
      const result = UpdateBookingSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // ListBookingsQuerySchema Tests
  // ============================================================================

  describe('ListBookingsQuerySchema', () => {
    it('should accept empty query (all defaults)', () => {
      const result = ListBookingsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept year filter', () => {
      const result = ListBookingsQuerySchema.safeParse({ year: '2025' });
      expect(result.success).toBe(true);
    });

    it('should accept month filter', () => {
      const result = ListBookingsQuerySchema.safeParse({ month: '02' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid month', () => {
      const result = ListBookingsQuerySchema.safeParse({ month: '13' });
      expect(result.success).toBe(false);
    });

    it('should reject month without leading zero', () => {
      const result = ListBookingsQuerySchema.safeParse({ month: '2' });
      expect(result.success).toBe(false);
    });

    it('should coerce string customer_id to number', () => {
      const result = ListBookingsQuerySchema.safeParse({ customer_id: '123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customer_id).toBe(123);
      }
    });

    it('should accept pagination parameters', () => {
      const result = ListBookingsQuerySchema.safeParse({ limit: 20, offset: 40 });
      expect(result.success).toBe(true);
    });

    it('should reject limit over 100', () => {
      const result = ListBookingsQuerySchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = ListBookingsQuerySchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });

    it('should accept include parameter for relations', () => {
      const result = ListBookingsQuerySchema.safeParse({ include: 'customer,driver,vehicle' });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // BookingIdSchema Tests
  // ============================================================================

  describe('BookingIdSchema', () => {
    it('should accept positive integer ID', () => {
      const result = BookingIdSchema.safeParse({ id: 123 });
      expect(result.success).toBe(true);
    });

    it('should coerce string ID to number', () => {
      const result = BookingIdSchema.safeParse({ id: '456' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(456);
      }
    });

    it('should reject zero ID', () => {
      const result = BookingIdSchema.safeParse({ id: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative ID', () => {
      const result = BookingIdSchema.safeParse({ id: -1 });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // BookingNumberSchema Tests
  // ============================================================================

  describe('BookingNumberSchema', () => {
    it('should accept valid 3-letter booking number', () => {
      const result = BookingNumberSchema.safeParse({ bookingNumber: 'WWT-2025-00001' });
      expect(result.success).toBe(true);
    });

    it('should accept valid 4-letter booking number', () => {
      const result = BookingNumberSchema.safeParse({ bookingNumber: 'CORP-2025-00001' });
      expect(result.success).toBe(true);
    });

    it('should reject lowercase booking number', () => {
      const result = BookingNumberSchema.safeParse({ bookingNumber: 'wwt-2025-00001' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid format', () => {
      const result = BookingNumberSchema.safeParse({ bookingNumber: 'WWT202500001' });
      expect(result.success).toBe(false);
    });

    it('should reject wrong number of digits in year', () => {
      const result = BookingNumberSchema.safeParse({ bookingNumber: 'WWT-25-00001' });
      expect(result.success).toBe(false);
    });

    it('should reject wrong number of digits in sequence', () => {
      const result = BookingNumberSchema.safeParse({ bookingNumber: 'WWT-2025-001' });
      expect(result.success).toBe(false);
    });
  });
});
