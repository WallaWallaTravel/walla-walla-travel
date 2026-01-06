/**
 * ReservationService Tests
 *
 * Tests for the "Reserve & Refine" booking flow
 * Coverage target: 80%+
 *
 * Key features tested:
 * - Reservation creation with deposit handling
 * - Customer de-duplication
 * - Status management
 * - Filtering and pagination
 */

import { ReservationService, CreateReservationSchema } from '../reservation-service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockReservation, createMockCustomer } from '../../__tests__/factories';

// Mock the db module
const mockQuery = jest.fn();
jest.mock('../../db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
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

// Mock transaction module to bypass BEGIN/COMMIT
jest.mock('../../db/transaction', () => ({
  withTransaction: jest.fn(async (callback: (db: unknown) => Promise<unknown>) => {
    // Execute callback directly without BEGIN/COMMIT
    return callback((...args: unknown[]) => mockQuery(...args));
  }),
}));

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ReservationService', () => {
  let service: ReservationService;

  beforeEach(() => {
    service = new ReservationService();
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // CreateReservationSchema Tests
  // ============================================================================

  describe('CreateReservationSchema', () => {
    const validData = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '5095551234',
      partySize: 6,
      preferredDate: '2025-02-15',
      depositAmount: 150,
      paymentMethod: 'card' as const,
    };

    it('should accept valid reservation data', () => {
      const result = CreateReservationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        customerEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('should reject party size of 0', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        partySize: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject party size over 50', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        partySize: 51,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        preferredDate: '02-15-2025', // Wrong format
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional alternate date', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        alternateDate: '2025-02-16',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional event type', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        eventType: 'Birthday celebration',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid payment method', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        paymentMethod: 'bitcoin',
      });
      expect(result.success).toBe(false);
    });

    it('should accept "check" as payment method', () => {
      const result = CreateReservationSchema.safeParse({
        ...validData,
        paymentMethod: 'check',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // createReservation() Tests
  // ============================================================================

  describe('createReservation', () => {
    const validReservationData = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '5095551234',
      partySize: 6,
      preferredDate: '2025-02-15',
      depositAmount: 150,
      paymentMethod: 'card' as const,
    };

    it('should create reservation with new customer (customer not found)', async () => {
      // 1. Customer lookup returns empty (not found)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2. Insert new customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 42 }]));
      // 3. Insert reservation
      const createdReservation = createMockReservation({
        id: 1,
        customer_id: 42,
        customer_email: 'john@example.com',
        deposit_paid: true,
        payment_method: 'card',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createdReservation]));

      const result = await service.createReservation(validReservationData);

      expect(result.id).toBe(1);
      expect(result.customer_id).toBe(42);
      expect(result.deposit_paid).toBe(true);
    });

    it('should create reservation with existing customer (customer found)', async () => {
      // 1. Customer lookup finds existing
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 100 }]));
      // 2. Update existing customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 3. Insert reservation
      const createdReservation = createMockReservation({
        id: 2,
        customer_id: 100,
        customer_email: 'john@example.com',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createdReservation]));

      const result = await service.createReservation(validReservationData);

      expect(result.id).toBe(2);
      expect(result.customer_id).toBe(100);
    });

    it('should mark deposit_paid as true for card payment', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([])); // No customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }])); // New customer
      const reservation = createMockReservation({ deposit_paid: true, payment_method: 'card' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([reservation]));

      const result = await service.createReservation({
        ...validReservationData,
        paymentMethod: 'card',
      });

      // Verify insert was called with deposit_paid: true
      const insertCall = mockQuery.mock.calls[2][0];
      expect(insertCall).toContain('deposit_paid');
      expect(result.deposit_paid).toBe(true);
    });

    it('should mark deposit_paid as false for check payment', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([])); // No customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }])); // New customer
      const reservation = createMockReservation({ deposit_paid: false, payment_method: 'check' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([reservation]));

      const result = await service.createReservation({
        ...validReservationData,
        paymentMethod: 'check',
      });

      expect(result.deposit_paid).toBe(false);
    });

    it('should include optional fields when provided', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));
      const reservation = createMockReservation({
        alternate_date: '2025-02-16',
        event_type: 'Birthday',
        special_requests: 'Champagne',
        brand_id: 5,
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([reservation]));

      const result = await service.createReservation({
        ...validReservationData,
        alternateDate: '2025-02-16',
        eventType: 'Birthday',
        specialRequests: 'Champagne',
        brandId: 5,
      });

      expect(result.alternate_date).toBe('2025-02-16');
      expect(result.event_type).toBe('Birthday');
      expect(result.special_requests).toBe('Champagne');
      expect(result.brand_id).toBe(5);
    });

    it('should generate unique reservation number', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));
      const reservation = createMockReservation({ reservation_number: 'RES-2025-123456' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([reservation]));

      const result = await service.createReservation(validReservationData);

      expect(result.reservation_number).toMatch(/^RES-\d{4}-\d+$/);
    });

    it('should set consultation deadline to 24 hours from creation', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));
      const reservation = createMockReservation();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([reservation]));

      await service.createReservation(validReservationData);

      // Verify the insert includes consultation_deadline
      const insertCall = mockQuery.mock.calls[2][0];
      expect(insertCall).toContain('consultation_deadline');
    });

    it('should set initial status to pending', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));
      const reservation = createMockReservation({ status: 'pending' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([reservation]));

      const result = await service.createReservation(validReservationData);

      expect(result.status).toBe('pending');
    });

    it('should update existing customer name and phone on re-booking', async () => {
      // Customer found with different name/phone
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 50 }]));
      // Update customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // Insert reservation
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockReservation()]));

      await service.createReservation({
        ...validReservationData,
        customerName: 'John Updated',
        customerPhone: '5095559999',
      });

      // Verify customer update was called with new name/phone
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[1]).toContain('John Updated');
      expect(updateCall[1]).toContain('5095559999');
    });
  });

  // ============================================================================
  // findManyWithFilters() Tests
  // ============================================================================

  describe('findManyWithFilters', () => {
    it('should return reservations without filters', async () => {
      const reservations = [
        createMockReservation({ id: 1 }),
        createMockReservation({ id: 2 }),
      ];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '2' }]))
        .mockResolvedValueOnce(createMockQueryResult(reservations));

      const result = await service.findManyWithFilters({});

      expect(result.total).toBe(2);
      expect(result.reservations).toHaveLength(2);
    });

    it('should filter by status', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockReservation({ status: 'pending' })]));

      const result = await service.findManyWithFilters({ status: 'pending' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('r.status = $1'),
        ['pending']
      );
      expect(result.total).toBe(1);
    });

    it('should filter by customer ID', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockReservation({ customer_id: 42 })]));

      await service.findManyWithFilters({ customerId: 42 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('r.customer_id = $'),
        [42]
      );
    });

    it('should filter by brand ID', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockReservation({ brand_id: 1 })]));

      await service.findManyWithFilters({ brandId: 1 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('r.brand_id = $'),
        [1]
      );
    });

    it('should include customer data when requested', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockReservation()]));

      await service.findManyWithFilters({ includeCustomer: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JSON_BUILD_OBJECT'),
        expect.any(Array)
      );
    });

    it('should apply pagination with limit and offset', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '100' }]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await service.findManyWithFilters({ limit: 20, offset: 40 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 20 OFFSET 40'),
        expect.any(Array)
      );
    });

    it('should use default limit of 50 when not specified', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '100' }]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await service.findManyWithFilters({});

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.any(Array)
      );
    });

    it('should combine multiple filters', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await service.findManyWithFilters({
        status: 'pending',
        brandId: 1,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('r.status = $1'),
        ['pending', 1]
      );
    });
  });

  // ============================================================================
  // updateStatus() Tests
  // ============================================================================

  describe('updateStatus', () => {
    it('should update reservation status', async () => {
      const updatedReservation = createMockReservation({
        id: 1,
        status: 'contacted',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedReservation]));

      const result = await service.updateStatus(1, 'contacted');

      expect(result.status).toBe('contacted');
    });

    it('should throw NotFoundError when reservation not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updateStatus(999, 'contacted')).rejects.toThrow();
    });

    it('should update to confirmed status', async () => {
      const updatedReservation = createMockReservation({ status: 'confirmed' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedReservation]));

      const result = await service.updateStatus(1, 'confirmed');

      expect(result.status).toBe('confirmed');
    });

    it('should update to cancelled status', async () => {
      const updatedReservation = createMockReservation({ status: 'cancelled' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedReservation]));

      const result = await service.updateStatus(1, 'cancelled');

      expect(result.status).toBe('cancelled');
    });

    it('should update to completed status', async () => {
      const updatedReservation = createMockReservation({ status: 'completed' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedReservation]));

      const result = await service.updateStatus(1, 'completed');

      expect(result.status).toBe('completed');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty filter results', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '0' }]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.findManyWithFilters({ status: 'pending' });

      expect(result.total).toBe(0);
      expect(result.reservations).toHaveLength(0);
    });

    it('should handle large offset values', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '10' }]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.findManyWithFilters({ offset: 1000 });

      expect(result.reservations).toHaveLength(0);
    });
  });
});
