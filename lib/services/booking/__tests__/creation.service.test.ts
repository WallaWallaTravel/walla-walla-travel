/**
 * BookingCreationService Tests
 *
 * Unit tests for the full booking creation flow including:
 * - Customer find/create
 * - Pricing calculation
 * - Booking record creation
 * - Winery assignments
 * - Payment record creation
 * - Timeline events
 * - CRM sync (async, non-blocking)
 * - Google Calendar sync (async, non-blocking)
 */

import { createMockQueryResult, getNextWeekDate } from '../../../__tests__/test-utils';
import { createMockCustomer, createMockPricingDetails } from '../../../__tests__/factories';
import type { CreateFullBookingData } from '../types';

// ============================================================================
// Mocks — must be declared before any imports that use them
// ============================================================================

// Mock the db module (required by BaseService)
jest.mock('../../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock transaction module — executes callback immediately (no real DB)
jest.mock('../../../db/transaction', () => ({
  withTransaction: jest.fn((callback: (client: unknown) => Promise<unknown>) =>
    callback(jest.fn())
  ),
}));

// Mock logger
jest.mock('../../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock error logger
jest.mock('../../../monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

// Mock customer service
jest.mock('../../customer.service', () => ({
  customerService: {
    findOrCreate: jest.fn(),
    updateStatistics: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock pricing service
jest.mock('../../pricing.service', () => ({
  pricingService: {
    calculatePricing: jest.fn(),
    calculateEndTime: jest.fn().mockReturnValue('16:00'),
  },
}));

// Mock CRM sync service
jest.mock('../../crm-sync.service', () => ({
  crmSyncService: {
    syncBookingToDeal: jest.fn().mockResolvedValue({
      id: 100,
      contact_id: 200,
    }),
    logActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock CRM task automation service
jest.mock('../../crm-task-automation.service', () => ({
  crmTaskAutomationService: {
    onBookingCreated: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Google Calendar sync service
jest.mock('../../google-calendar-sync.service', () => ({
  googleCalendarSyncService: {
    syncBooking: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock booking core service (for generateBookingNumber)
jest.mock('../core.service', () => ({
  bookingCoreService: {
    generateBookingNumber: jest.fn().mockResolvedValue('WWT-2026-000001'),
  },
}));

// ============================================================================
// Import service under test AFTER mocks are declared
// ============================================================================

import { BookingCreationService } from '../creation.service';
import { customerService } from '../../customer.service';
import { pricingService } from '../../pricing.service';
import { crmSyncService } from '../../crm-sync.service';
import { crmTaskAutomationService } from '../../crm-task-automation.service';
import { googleCalendarSyncService } from '../../google-calendar-sync.service';
import { bookingCoreService } from '../core.service';

// ============================================================================
// Test Helpers
// ============================================================================

const mockCustomer = createMockCustomer({
  id: 1,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1-509-555-1234',
});

const mockPricing = createMockPricingDetails({
  basePrice: 800,
});

function buildBookingData(overrides: Partial<CreateFullBookingData> = {}): CreateFullBookingData {
  return {
    customer: {
      email: 'jane@example.com',
      name: 'Jane Doe',
      phone: '+1-509-555-1234',
    },
    booking: {
      tour_date: getNextWeekDate(),
      start_time: '10:00',
      duration_hours: 6,
      party_size: 6,
      pickup_location: '123 Main St, Walla Walla, WA',
      dropoff_location: '456 Oak Ave, Walla Walla, WA',
      special_requests: 'Anniversary celebration',
      dietary_restrictions: 'Vegetarian',
      accessibility_needs: null as unknown as string | undefined,
      brand_id: 2,
      ...overrides.booking,
    },
    wineries: overrides.wineries ?? [
      { winery_id: 5, visit_order: 1, name: "L'Ecole No 41", slug: 'lecole-no-41' },
      { winery_id: 12, visit_order: 2, name: 'Leonetti Cellar', slug: 'leonetti-cellar' },
      { winery_id: 23, visit_order: 3, name: 'Pepper Bridge', slug: 'pepper-bridge' },
    ],
    payment: {
      stripe_payment_method_id: 'pm_test_abc123',
      ...overrides.payment,
    },
    marketing_consent: overrides.marketing_consent ?? {
      email: true,
      sms: false,
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('BookingCreationService', () => {
  let service: BookingCreationService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    service = new BookingCreationService();
    mockQuery = require('../../../db').query as jest.Mock;

    // Re-establish withTransaction mock (jest.resetAllMocks wipes implementations)
    const { withTransaction: mockWithTransaction } = require('../../../db/transaction');
    (mockWithTransaction as jest.Mock).mockImplementation(
      (callback: (client: unknown) => Promise<unknown>) => callback(jest.fn())
    );

    // Default mock implementations for each test
    (customerService.findOrCreate as jest.Mock).mockResolvedValue(mockCustomer);
    (customerService.updateStatistics as jest.Mock).mockResolvedValue(undefined);
    (pricingService.calculatePricing as jest.Mock).mockResolvedValue(mockPricing);
    (pricingService.calculateEndTime as jest.Mock).mockReturnValue('16:00');
    (bookingCoreService.generateBookingNumber as jest.Mock).mockResolvedValue('WWT-2026-000001');

    // Re-establish async service mocks (non-blocking calls)
    (crmSyncService.syncBookingToDeal as jest.Mock).mockResolvedValue({
      id: 100,
      contact_id: 200,
    });
    (crmSyncService.logActivity as jest.Mock).mockResolvedValue(undefined);
    (crmTaskAutomationService.onBookingCreated as jest.Mock).mockResolvedValue(undefined);
    (googleCalendarSyncService.syncBooking as jest.Mock).mockResolvedValue(undefined);
  });

  // ==========================================================================
  // Happy Path
  // ==========================================================================

  describe('createFullBooking - happy path', () => {
    beforeEach(() => {
      // 1. insert<Booking> for booking creation (via this.insert -> this.query)
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([
          {
            id: 42,
            booking_number: 'WWT-2026-000001',
            customer_id: 1,
            customer_name: 'Jane Doe',
            customer_email: 'jane@example.com',
            customer_phone: '+1-509-555-1234',
            party_size: 6,
            tour_date: getNextWeekDate(),
            start_time: '10:00',
            end_time: '16:00',
            duration_hours: 6,
            pickup_location: '123 Main St, Walla Walla, WA',
            dropoff_location: '456 Oak Ave, Walla Walla, WA',
            special_requests: 'Anniversary celebration',
            dietary_restrictions: 'Vegetarian',
            accessibility_needs: null,
            base_price: mockPricing.basePrice,
            gratuity: mockPricing.gratuity,
            taxes: mockPricing.taxes,
            total_price: mockPricing.totalPrice,
            deposit_amount: mockPricing.depositAmount,
            deposit_paid: true,
            final_payment_amount: mockPricing.finalPaymentAmount,
            final_payment_paid: false,
            status: 'confirmed',
            booking_source: 'online',
            confirmation_email_sent: false,
            brand_id: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
      );

      // 2-4. Three winery assignment INSERTs
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1)); // winery 1
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1)); // winery 2
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1)); // winery 3

      // 5. Payment record INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      // 6. Timeline event INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      // 7. Winery details SELECT (getWineryDetailsForBooking)
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([
          { id: 5, name: "L'Ecole No 41", slug: 'lecole-no-41', visit_order: 1 },
          { id: 12, name: 'Leonetti Cellar', slug: 'leonetti-cellar', visit_order: 2 },
          { id: 23, name: 'Pepper Bridge', slug: 'pepper-bridge', visit_order: 3 },
        ])
      );
    });

    it('should return complete booking, payment, and next_steps', async () => {
      const data = buildBookingData();
      const result = await service.createFullBooking(data);

      // Verify top-level structure
      expect(result).toHaveProperty('booking');
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('next_steps');

      // Booking fields
      expect(result.booking.id).toBe(42);
      expect(result.booking.booking_number).toBe('WWT-2026-000001');
      expect(result.booking.customer_name).toBe('Jane Doe');
      expect(result.booking.customer_email).toBe('jane@example.com');
      expect(result.booking.status).toBe('confirmed');
      expect(result.booking.confirmation_sent).toBe(false);
      expect(result.booking.balance_due).toBe(mockPricing.finalPaymentAmount);

      // Winery details
      expect(result.booking.wineries).toHaveLength(3);
      expect(result.booking.wineries[0]).toEqual({
        winery_id: 5,
        name: "L'Ecole No 41",
        slug: 'lecole-no-41',
        visit_order: 1,
      });

      // Payment details
      expect(result.payment.deposit_amount).toBe(mockPricing.depositAmount);
      expect(result.payment.payment_status).toBe('succeeded');
      expect(result.payment.stripe_payment_method_id).toBe('pm_test_abc123');

      // Next steps
      expect(result.next_steps).toHaveLength(4);
      expect(result.next_steps[0]).toContain('email');
      expect(result.next_steps[1]).toContain(`$${mockPricing.finalPaymentAmount}`);
    });

    it('should call customerService.findOrCreate with correct data including marketing consent', async () => {
      const data = buildBookingData({
        marketing_consent: { email: true, sms: true },
      });

      await service.createFullBooking(data);

      expect(customerService.findOrCreate).toHaveBeenCalledWith({
        email: 'jane@example.com',
        name: 'Jane Doe',
        phone: '+1-509-555-1234',
        email_marketing_consent: true,
        sms_marketing_consent: true,
      });
    });

    it('should call pricingService.calculatePricing with booking details', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      expect(pricingService.calculatePricing).toHaveBeenCalledWith({
        tourDate: data.booking.tour_date,
        partySize: 6,
        durationHours: 6,
      });
    });

    it('should call pricingService.calculateEndTime with start_time, duration, and tour_date', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      expect(pricingService.calculateEndTime).toHaveBeenCalledWith(
        '10:00',
        6,
        data.booking.tour_date
      );
    });

    it('should call bookingCoreService.generateBookingNumber', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      expect(bookingCoreService.generateBookingNumber).toHaveBeenCalledTimes(1);
    });

    it('should call customerService.updateStatistics after booking', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      expect(customerService.updateStatistics).toHaveBeenCalledWith(
        mockCustomer.id,
        mockPricing.totalPrice,
        data.booking.tour_date
      );
    });
  });

  // ==========================================================================
  // Customer Creation (new vs existing)
  // ==========================================================================

  describe('customer creation', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should pass through customer data to findOrCreate for a new customer', async () => {
      const newCustomer = createMockCustomer({
        id: 99,
        name: 'New Person',
        email: 'newperson@example.com',
        phone: '+1-509-555-9999',
      });
      (customerService.findOrCreate as jest.Mock).mockResolvedValue(newCustomer);

      const data = buildBookingData({
        customer: {
          email: 'newperson@example.com',
          name: 'New Person',
          phone: '+1-509-555-9999',
        },
      });
      const result = await service.createFullBooking(data);

      expect(customerService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newperson@example.com',
          name: 'New Person',
          phone: '+1-509-555-9999',
        })
      );
      expect(result.booking.customer_name).toBe('New Person');
      expect(result.booking.customer_email).toBe('newperson@example.com');
    });

    it('should use existing customer ID when customer is found', async () => {
      const existingCustomer = createMockCustomer({
        id: 77,
        name: 'Returning Guest',
        email: 'returning@example.com',
      });
      (customerService.findOrCreate as jest.Mock).mockResolvedValue(existingCustomer);

      // Override the booking insert mock to reflect customer_id
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([
          {
            id: 50,
            booking_number: 'WWT-2026-000001',
            customer_id: 77,
            customer_name: 'Returning Guest',
            customer_email: 'returning@example.com',
            status: 'confirmed',
            brand_id: 2,
            base_price: mockPricing.basePrice,
            total_price: mockPricing.totalPrice,
            deposit_amount: mockPricing.depositAmount,
            final_payment_amount: mockPricing.finalPaymentAmount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
      );
      // winery inserts + payment + timeline + winery details
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([
        { id: 5, name: "L'Ecole No 41", slug: 'lecole-no-41', visit_order: 1 },
        { id: 12, name: 'Leonetti Cellar', slug: 'leonetti-cellar', visit_order: 2 },
        { id: 23, name: 'Pepper Bridge', slug: 'pepper-bridge', visit_order: 3 },
      ]));

      const data = buildBookingData({
        customer: {
          email: 'returning@example.com',
          name: 'Returning Guest',
        },
      });
      const result = await service.createFullBooking(data);

      expect(result.booking.customer_id).toBe(77);
    });

    it('should pass undefined marketing consent when not provided', async () => {
      const data = buildBookingData();
      // Remove marketing consent
      delete (data as Partial<CreateFullBookingData>).marketing_consent;

      await service.createFullBooking(data);

      expect(customerService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email_marketing_consent: undefined,
          sms_marketing_consent: undefined,
        })
      );
    });
  });

  // ==========================================================================
  // Brand ID
  // ==========================================================================

  describe('brand_id handling', () => {
    it('should set brand_id on booking when provided', async () => {
      setupDefaultQueryMocks();

      const data = buildBookingData({
        booking: {
          tour_date: getNextWeekDate(),
          start_time: '10:00',
          duration_hours: 6,
          party_size: 6,
          pickup_location: '123 Main St',
          brand_id: 3,
        },
      });
      await service.createFullBooking(data);

      // The first query call is the booking INSERT. Check that brand_id = 3 is in the values.
      const insertCall = mockQuery.mock.calls[0];
      const insertSql: string = insertCall[0];
      const insertValues: unknown[] = insertCall[1];

      expect(insertSql).toContain('INSERT INTO bookings');
      // brand_id should be in the values array
      expect(insertValues).toContain(3);
    });

    it('should default brand_id to 1 when not provided', async () => {
      setupDefaultQueryMocks();

      const data = buildBookingData();
      // Remove brand_id
      delete data.booking.brand_id;

      await service.createFullBooking(data);

      // Check the booking INSERT values contain brand_id = 1
      const insertCall = mockQuery.mock.calls[0];
      const insertValues: unknown[] = insertCall[1];

      // The brand_id default in the service is `data.booking.brand_id || 1`
      expect(insertValues).toContain(1);
    });

    it('should pass brand_id to payment record', async () => {
      setupDefaultQueryMocks();

      const data = buildBookingData({
        booking: {
          tour_date: getNextWeekDate(),
          start_time: '10:00',
          duration_hours: 6,
          party_size: 6,
          pickup_location: '123 Main St',
          brand_id: 5,
        },
      });
      await service.createFullBooking(data);

      // Payment INSERT is the 5th query call (after booking insert + 3 winery inserts)
      // Index: 0=booking, 1-3=wineries, 4=payment
      const paymentCall = mockQuery.mock.calls[4];
      const paymentSql: string = paymentCall[0];
      const paymentValues: unknown[] = paymentCall[1];

      expect(paymentSql).toContain('INSERT INTO payments');
      expect(paymentSql).toContain('brand_id');
      // brand_id should be in the payment values (last param before CURRENT_TIMESTAMP fields)
      expect(paymentValues).toContain(5);
    });

    it('should default payment brand_id to 1 when booking has no brand_id', async () => {
      setupDefaultQueryMocks();

      const data = buildBookingData();
      delete data.booking.brand_id;

      await service.createFullBooking(data);

      // Payment INSERT: index 4 (booking=0, wineries=1-3, payment=4)
      const paymentCall = mockQuery.mock.calls[4];
      const paymentValues: unknown[] = paymentCall[1];

      // The createPaymentRecord uses params.brandId || 1
      expect(paymentValues).toContain(1);
    });
  });

  // ==========================================================================
  // Winery Assignments
  // ==========================================================================

  describe('winery assignments', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should create a booking_wineries record for each winery', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      // Winery inserts are calls 1, 2, 3 (after booking insert at index 0)
      const wineryCall1 = mockQuery.mock.calls[1];
      const wineryCall2 = mockQuery.mock.calls[2];
      const wineryCall3 = mockQuery.mock.calls[3];

      expect(wineryCall1[0]).toContain('INSERT INTO booking_wineries');
      expect(wineryCall1[1]).toEqual([42, 5, 1]); // bookingId=42, winery_id=5, visit_order=1

      expect(wineryCall2[0]).toContain('INSERT INTO booking_wineries');
      expect(wineryCall2[1]).toEqual([42, 12, 2]);

      expect(wineryCall3[0]).toContain('INSERT INTO booking_wineries');
      expect(wineryCall3[1]).toEqual([42, 23, 3]);
    });

    it('should handle a single winery', async () => {
      // Reset mocks for single winery
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([{
          id: 42, booking_number: 'WWT-2026-000001', customer_id: 1,
          status: 'confirmed', brand_id: 2,
          base_price: mockPricing.basePrice, total_price: mockPricing.totalPrice,
          deposit_amount: mockPricing.depositAmount,
          final_payment_amount: mockPricing.finalPaymentAmount,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }])
      );
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1)); // 1 winery
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1)); // payment
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1)); // timeline
      mockQuery.mockResolvedValueOnce(createMockQueryResult([
        { id: 5, name: "L'Ecole No 41", slug: 'lecole-no-41', visit_order: 1 },
      ]));

      const data = buildBookingData({
        wineries: [{ winery_id: 5, visit_order: 1 }],
      });
      const result = await service.createFullBooking(data);

      // Only 1 winery insert (call index 1)
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO booking_wineries');
      expect(mockQuery.mock.calls[1][1]).toEqual([42, 5, 1]);

      // Payment insert should be at index 2 (not 4)
      expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO payments');

      expect(result.booking.wineries).toHaveLength(1);
    });

    it('should fetch winery details for the response', async () => {
      const data = buildBookingData();
      const result = await service.createFullBooking(data);

      // The last query call should be the winery details SELECT
      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
      expect(lastCall[0]).toContain('SELECT w.id, w.name, w.slug');
      expect(lastCall[0]).toContain('FROM booking_wineries bw');
      expect(lastCall[1]).toEqual([42]); // bookingId

      expect(result.booking.wineries).toEqual([
        { winery_id: 5, name: "L'Ecole No 41", slug: 'lecole-no-41', visit_order: 1 },
        { winery_id: 12, name: 'Leonetti Cellar', slug: 'leonetti-cellar', visit_order: 2 },
        { winery_id: 23, name: 'Pepper Bridge', slug: 'pepper-bridge', visit_order: 3 },
      ]);
    });
  });

  // ==========================================================================
  // Payment Record
  // ==========================================================================

  describe('payment record', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should create payment record with correct values', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      // Payment INSERT: index 4 (booking=0, wineries=1-3, payment=4)
      const paymentCall = mockQuery.mock.calls[4];
      const paymentSql: string = paymentCall[0];
      const paymentValues: unknown[] = paymentCall[1];

      expect(paymentSql).toContain('INSERT INTO payments');
      // Values should be: bookingId, customerId, amount, currency, payment_type, payment_method, stripe_id, status, brand_id
      expect(paymentValues[0]).toBe(42); // bookingId
      expect(paymentValues[1]).toBe(mockCustomer.id); // customerId
      expect(paymentValues[2]).toBe(mockPricing.depositAmount); // amount
      expect(paymentValues[3]).toBe('USD'); // currency
      expect(paymentValues[4]).toBe('deposit'); // payment_type
      expect(paymentValues[5]).toBe('card'); // payment_method
      expect(paymentValues[6]).toBe('pm_test_abc123'); // stripe_payment_method_id
      expect(paymentValues[7]).toBe('succeeded'); // status
      expect(paymentValues[8]).toBe(2); // brand_id from data.booking.brand_id
    });

    it('should include brand_id in payment insert SQL columns', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      const paymentCall = mockQuery.mock.calls[4];
      const paymentSql: string = paymentCall[0];

      expect(paymentSql).toContain('brand_id');
    });
  });

  // ==========================================================================
  // Timeline Event
  // ==========================================================================

  describe('timeline event', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should create a booking_created timeline event', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      // Timeline INSERT: index 5 (booking=0, wineries=1-3, payment=4, timeline=5)
      const timelineCall = mockQuery.mock.calls[5];
      const timelineSql: string = timelineCall[0];
      const timelineValues: unknown[] = timelineCall[1];

      expect(timelineSql).toContain('INSERT INTO booking_timeline');
      expect(timelineValues[0]).toBe(42); // bookingId
      expect(timelineValues[1]).toBe('booking_created'); // event_type
      expect(timelineValues[2]).toBe('Booking created successfully'); // description

      // event_data should be JSON with booking details
      const eventData = JSON.parse(timelineValues[3] as string);
      expect(eventData.booking_number).toBe('WWT-2026-000001');
      expect(eventData.customer_email).toBe('jane@example.com');
      expect(eventData.total_price).toBe(mockPricing.totalPrice);
      expect(eventData.deposit_paid).toBe(mockPricing.depositAmount);
    });
  });

  // ==========================================================================
  // CRM Sync (async, non-blocking)
  // ==========================================================================

  describe('CRM sync', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should call crmSyncService.syncBookingToDeal asynchronously', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      // Allow microtasks / async .catch handlers to run
      await flushPromises();

      expect(crmSyncService.syncBookingToDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 42,
          customerId: mockCustomer.id,
          customerEmail: mockCustomer.email,
          customerName: mockCustomer.name,
          tourDate: data.booking.tour_date,
          partySize: 6,
          totalAmount: mockPricing.totalPrice,
          status: 'confirmed',
          brand: 'nw_touring',
        })
      );
    });

    it('should log CRM activity after deal creation', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);
      await flushPromises();

      expect(crmSyncService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 200, // from mock deal
          dealId: 100,
          activityType: 'system',
          subject: 'Booking created: WWT-2026-000001',
        })
      );
    });

    it('should call crmTaskAutomationService.onBookingCreated after deal creation', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);
      await flushPromises();

      expect(crmTaskAutomationService.onBookingCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 200,
          dealId: 100,
          bookingNumber: 'WWT-2026-000001',
          customerName: mockCustomer.name,
        })
      );
    });

    it('should not block booking creation if CRM sync fails', async () => {
      (crmSyncService.syncBookingToDeal as jest.Mock).mockRejectedValue(
        new Error('CRM API unavailable')
      );

      const data = buildBookingData();
      // This should NOT throw despite CRM failure
      const result = await service.createFullBooking(data);

      expect(result.booking.id).toBe(42);
      expect(result.payment.payment_status).toBe('succeeded');

      // Let the async error handler run
      await flushPromises();
    });

    it('should skip activity logging when syncBookingToDeal returns null', async () => {
      (crmSyncService.syncBookingToDeal as jest.Mock).mockResolvedValue(null);

      const data = buildBookingData();
      await service.createFullBooking(data);
      await flushPromises();

      expect(crmSyncService.logActivity).not.toHaveBeenCalled();
      expect(crmTaskAutomationService.onBookingCreated).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Google Calendar Sync (async, non-blocking)
  // ==========================================================================

  describe('Google Calendar sync', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should call googleCalendarSyncService.syncBooking with booking ID', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);
      await flushPromises();

      expect(googleCalendarSyncService.syncBooking).toHaveBeenCalledWith(42);
    });

    it('should not block booking creation if Google Calendar sync fails', async () => {
      (googleCalendarSyncService.syncBooking as jest.Mock).mockRejectedValue(
        new Error('Google Calendar API error')
      );

      const data = buildBookingData();
      const result = await service.createFullBooking(data);

      expect(result.booking.id).toBe(42);
      await flushPromises();
    });
  });

  // ==========================================================================
  // Booking Insert Details
  // ==========================================================================

  describe('booking record insert', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should insert booking with all expected fields', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      const insertCall = mockQuery.mock.calls[0];
      const insertSql: string = insertCall[0];

      // Verify key columns are in the INSERT
      expect(insertSql).toContain('INSERT INTO bookings');
      expect(insertSql).toContain('booking_number');
      expect(insertSql).toContain('customer_id');
      expect(insertSql).toContain('party_size');
      expect(insertSql).toContain('tour_date');
      expect(insertSql).toContain('start_time');
      expect(insertSql).toContain('end_time');
      expect(insertSql).toContain('duration_hours');
      expect(insertSql).toContain('pickup_location');
      expect(insertSql).toContain('dropoff_location');
      expect(insertSql).toContain('special_requests');
      expect(insertSql).toContain('dietary_restrictions');
      expect(insertSql).toContain('accessibility_needs');
      expect(insertSql).toContain('base_price');
      expect(insertSql).toContain('gratuity');
      expect(insertSql).toContain('taxes');
      expect(insertSql).toContain('total_price');
      expect(insertSql).toContain('deposit_amount');
      expect(insertSql).toContain('deposit_paid');
      expect(insertSql).toContain('status');
      expect(insertSql).toContain('brand_id');
    });

    it('should set status to confirmed', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      expect(insertValues).toContain('confirmed');
    });

    it('should set booking_source to online', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      expect(insertValues).toContain('online');
    });

    it('should set deposit_paid to true', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      expect(insertValues).toContain(true);
    });

    it('should set final_payment_paid to false', async () => {
      const data = buildBookingData();
      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      // The values array should contain both true (deposit_paid) and false (final_payment_paid)
      expect(insertValues.filter((v) => v === false)).toHaveLength(2); // final_payment_paid + confirmation_email_sent
    });

    it('should use dropoff_location same as pickup_location when dropoff not provided', async () => {
      const data = buildBookingData();
      delete data.booking.dropoff_location;

      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      // Both pickup and dropoff should be the same value
      const pickupLocation = data.booking.pickup_location;
      const locationOccurrences = insertValues.filter((v) => v === pickupLocation);
      expect(locationOccurrences.length).toBeGreaterThanOrEqual(2); // pickup + dropoff
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should throw when customerService.findOrCreate fails', async () => {
      (customerService.findOrCreate as jest.Mock).mockRejectedValue(
        new Error('Customer service unavailable')
      );

      setupDefaultQueryMocks();
      const data = buildBookingData();

      await expect(service.createFullBooking(data)).rejects.toThrow();
    });

    it('should throw when pricingService.calculatePricing fails', async () => {
      (pricingService.calculatePricing as jest.Mock).mockRejectedValue(
        new Error('Pricing rules not found')
      );

      setupDefaultQueryMocks();
      const data = buildBookingData();

      await expect(service.createFullBooking(data)).rejects.toThrow('Pricing rules not found');
    });

    it('should throw when booking INSERT fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database insert failed'));

      const data = buildBookingData();
      await expect(service.createFullBooking(data)).rejects.toThrow();
    });

    it('should throw when winery assignment INSERT fails', async () => {
      // Booking insert succeeds
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([{
          id: 42, booking_number: 'WWT-2026-000001', customer_id: 1,
          status: 'confirmed', brand_id: 2,
          base_price: mockPricing.basePrice, total_price: mockPricing.totalPrice,
          deposit_amount: mockPricing.depositAmount,
          final_payment_amount: mockPricing.finalPaymentAmount,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }])
      );
      // First winery insert fails
      mockQuery.mockRejectedValueOnce(new Error('Winery insert failed'));

      const data = buildBookingData();
      await expect(service.createFullBooking(data)).rejects.toThrow();
    });

    it('should throw when payment record INSERT fails', async () => {
      // Booking insert succeeds
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([{
          id: 42, booking_number: 'WWT-2026-000001', customer_id: 1,
          status: 'confirmed', brand_id: 2,
          base_price: mockPricing.basePrice, total_price: mockPricing.totalPrice,
          deposit_amount: mockPricing.depositAmount,
          final_payment_amount: mockPricing.finalPaymentAmount,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }])
      );
      // 3 winery inserts succeed
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // Payment insert fails
      mockQuery.mockRejectedValueOnce(new Error('Payment insert failed'));

      const data = buildBookingData();
      await expect(service.createFullBooking(data)).rejects.toThrow('Payment insert failed');
    });

    it('should throw when generateBookingNumber fails', async () => {
      (bookingCoreService.generateBookingNumber as jest.Mock).mockRejectedValue(
        new Error('Booking number generation failed')
      );

      setupDefaultQueryMocks();
      const data = buildBookingData();

      await expect(service.createFullBooking(data)).rejects.toThrow('Booking number generation failed');
    });
  });

  // ==========================================================================
  // Optional Fields
  // ==========================================================================

  describe('optional fields', () => {
    beforeEach(() => {
      setupDefaultQueryMocks();
    });

    it('should set special_requests to null when not provided', async () => {
      const data = buildBookingData();
      delete data.booking.special_requests;

      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      // special_requests should be null
      expect(insertValues).toContain(null);
    });

    it('should set dietary_restrictions to null when not provided', async () => {
      const data = buildBookingData();
      delete data.booking.dietary_restrictions;

      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      expect(insertValues).toContain(null);
    });

    it('should set accessibility_needs to null when not provided', async () => {
      const data = buildBookingData();
      delete data.booking.accessibility_needs;

      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      expect(insertValues).toContain(null);
    });

    it('should pass special_requests value when provided', async () => {
      const data = buildBookingData();
      data.booking.special_requests = 'Need a cooler for wine purchases';

      await service.createFullBooking(data);

      const insertValues: unknown[] = mockQuery.mock.calls[0][1];
      expect(insertValues).toContain('Need a cooler for wine purchases');
    });
  });

  // ==========================================================================
  // Transaction Behavior
  // ==========================================================================

  describe('transaction behavior', () => {
    it('should execute inside withTransaction', async () => {
      const { withTransaction: mockWithTransaction } = require('../../../db/transaction');
      setupDefaultQueryMocks();

      const data = buildBookingData();
      await service.createFullBooking(data);

      // withTransaction should have been called (via BaseService.withTransaction)
      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
      expect(mockWithTransaction).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ==========================================================================
  // Helper: set up default query mocks for 3-winery scenario
  // ==========================================================================

  function setupDefaultQueryMocks() {
    mockQuery.mockReset();

    // 1. Booking INSERT
    mockQuery.mockResolvedValueOnce(
      createMockQueryResult([
        {
          id: 42,
          booking_number: 'WWT-2026-000001',
          customer_id: mockCustomer.id,
          customer_name: mockCustomer.name,
          customer_email: mockCustomer.email,
          customer_phone: mockCustomer.phone,
          party_size: 6,
          tour_date: getNextWeekDate(),
          start_time: '10:00',
          end_time: '16:00',
          duration_hours: 6,
          pickup_location: '123 Main St, Walla Walla, WA',
          dropoff_location: '456 Oak Ave, Walla Walla, WA',
          special_requests: 'Anniversary celebration',
          dietary_restrictions: 'Vegetarian',
          accessibility_needs: null,
          base_price: mockPricing.basePrice,
          gratuity: mockPricing.gratuity,
          taxes: mockPricing.taxes,
          total_price: mockPricing.totalPrice,
          deposit_amount: mockPricing.depositAmount,
          deposit_paid: true,
          final_payment_amount: mockPricing.finalPaymentAmount,
          final_payment_paid: false,
          status: 'confirmed',
          booking_source: 'online',
          confirmation_email_sent: false,
          brand_id: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    );

    // 2-4. Three winery assignment INSERTs
    mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
    mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
    mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

    // 5. Payment record INSERT
    mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

    // 6. Timeline event INSERT
    mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

    // 7. Winery details SELECT
    mockQuery.mockResolvedValueOnce(
      createMockQueryResult([
        { id: 5, name: "L'Ecole No 41", slug: 'lecole-no-41', visit_order: 1 },
        { id: 12, name: 'Leonetti Cellar', slug: 'leonetti-cellar', visit_order: 2 },
        { id: 23, name: 'Pepper Bridge', slug: 'pepper-bridge', visit_order: 3 },
      ])
    );
  }
});

// ============================================================================
// Utility: flush pending microtasks (for async .catch handlers)
// ============================================================================

function flushPromises(): Promise<void> {
  // Use setTimeout(0) instead of setImmediate for broader environment compatibility
  return new Promise((resolve) => setTimeout(resolve, 0));
}
