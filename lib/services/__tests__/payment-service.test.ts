/**
 * PaymentService Tests
 *
 * CRITICAL: Tests for payment processing - handles REAL MONEY
 * Coverage target: 85%+
 */

import { PaymentService, Payment, CreatePaymentSchema } from '../payment-service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockPayment } from '../../__tests__/factories';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
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

// Mock error logger
jest.mock('../../monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

describe('PaymentService', () => {
  let service: PaymentService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new PaymentService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Schema Validation Tests
  // ============================================================================

  describe('CreatePaymentSchema validation', () => {
    it('should validate valid payment data', () => {
      const validData = {
        customerId: 123,
        amount: 15000,
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_test_123',
      };

      const result = CreatePaymentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const invalidData = {
        customerId: 123,
        amount: -100,
        paymentMethod: 'card',
      };

      const result = CreatePaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid customerId', () => {
      const invalidData = {
        customerId: -1,
        amount: 15000,
        paymentMethod: 'card',
      };

      const result = CreatePaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow optional bookingId', () => {
      const dataWithBooking = {
        customerId: 123,
        bookingId: 456,
        amount: 15000,
        paymentMethod: 'card',
      };

      const result = CreatePaymentSchema.safeParse(dataWithBooking);
      expect(result.success).toBe(true);
    });

    it('should allow optional reservationId', () => {
      const dataWithReservation = {
        customerId: 123,
        reservationId: 789,
        amount: 15000,
        paymentMethod: 'card',
      };

      const result = CreatePaymentSchema.safeParse(dataWithReservation);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // createPayment Tests
  // ============================================================================

  describe('createPayment', () => {
    it('should create payment with valid data', async () => {
      const mockPayment = createMockPayment({
        id: 1,
        booking_id: 123,
        customer_id: 456,
        amount: 15000,
        payment_method: 'card',
        payment_status: 'completed',
        stripe_payment_intent_id: 'pi_test_123',
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        bookingId: 123,
        customerId: 456,
        amount: 15000,
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_test_123',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.amount).toBe(15000);
      expect(result.payment_status).toBe('completed');
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should set status to pending when no stripePaymentIntentId', async () => {
      const mockPayment = createMockPayment({
        payment_status: 'pending',
        stripe_payment_intent_id: null,
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        customerId: 456,
        amount: 15000,
        paymentMethod: 'card',
      });

      expect(result.payment_status).toBe('pending');
    });

    it('should handle booking payment (with bookingId)', async () => {
      const mockPayment = createMockPayment({
        booking_id: 123,
        reservation_id: null,
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        bookingId: 123,
        customerId: 456,
        amount: 15000,
        paymentMethod: 'card',
      });

      expect(result.booking_id).toBe(123);
      expect(result.reservation_id).toBeNull();
    });

    it('should handle reservation payment (with reservationId)', async () => {
      const mockPayment = createMockPayment({
        booking_id: null,
        reservation_id: 789,
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        reservationId: 789,
        customerId: 456,
        amount: 25000,
        paymentMethod: 'card',
      });

      expect(result.booking_id).toBeNull();
      expect(result.reservation_id).toBe(789);
    });

    it('should include notes when provided', async () => {
      const mockPayment = createMockPayment({
        notes: 'Deposit payment for wedding tour',
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        customerId: 456,
        amount: 25000,
        paymentMethod: 'card',
        notes: 'Deposit payment for wedding tour',
      });

      expect(result.notes).toBe('Deposit payment for wedding tour');
    });

    it('should handle zero amount (free booking)', async () => {
      const mockPayment = createMockPayment({ amount: 0 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        customerId: 456,
        amount: 0,
        paymentMethod: 'comp',
      });

      expect(result.amount).toBe(0);
    });
  });

  // ============================================================================
  // getPaymentsByBooking Tests
  // ============================================================================

  describe('getPaymentsByBooking', () => {
    it('should return payments for a booking', async () => {
      const bookingId = 123;
      const mockPayments = [
        createMockPayment({ booking_id: bookingId, amount: 25000 }),
        createMockPayment({ booking_id: bookingId, amount: 75000 }),
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockPayments));

      const result = await service.getPaymentsByBooking(bookingId);

      expect(result).toHaveLength(2);
      expect(result[0].booking_id).toBe(bookingId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('booking_id = $1'),
        [bookingId]
      );
    });

    it('should return empty array when no payments found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getPaymentsByBooking(999);

      expect(result).toHaveLength(0);
    });

    it('should order by created_at DESC (most recent first)', async () => {
      const mockPayments = [createMockPayment()];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockPayments));

      await service.getPaymentsByBooking(123);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // getPaymentsByReservation Tests
  // ============================================================================

  describe('getPaymentsByReservation', () => {
    it('should return payments for a reservation', async () => {
      const reservationId = 456;
      const mockPayments = [
        createMockPayment({ reservation_id: reservationId, amount: 25000 }),
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockPayments));

      const result = await service.getPaymentsByReservation(reservationId);

      expect(result).toHaveLength(1);
      expect(result[0].reservation_id).toBe(reservationId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('reservation_id = $1'),
        [reservationId]
      );
    });

    it('should return empty array when no payments found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getPaymentsByReservation(999);

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // getPaymentsByCustomer Tests
  // ============================================================================

  describe('getPaymentsByCustomer', () => {
    it('should return all payments for a customer', async () => {
      const customerId = 789;
      const mockPayments = [
        createMockPayment({ customer_id: customerId, booking_id: 1 }),
        createMockPayment({ customer_id: customerId, booking_id: 2 }),
        createMockPayment({ customer_id: customerId, reservation_id: 3 }),
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockPayments));

      const result = await service.getPaymentsByCustomer(customerId);

      expect(result).toHaveLength(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('customer_id = $1'),
        [customerId]
      );
    });

    it('should return empty array for customer with no payments', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getPaymentsByCustomer(999);

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // updatePaymentStatus Tests
  // ============================================================================

  describe('updatePaymentStatus', () => {
    it('should update payment status successfully', async () => {
      const mockPayment = createMockPayment({
        id: 1,
        payment_status: 'completed',
        stripe_payment_intent_id: 'pi_test_updated',
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.updatePaymentStatus(1, 'completed', 'pi_test_updated');

      expect(result.payment_status).toBe('completed');
      expect(result.stripe_payment_intent_id).toBe('pi_test_updated');
    });

    it('should update status without stripeIntentId', async () => {
      const mockPayment = createMockPayment({
        id: 1,
        payment_status: 'failed',
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.updatePaymentStatus(1, 'failed');

      expect(result.payment_status).toBe('failed');
    });

    it('should throw NotFoundError when payment not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updatePaymentStatus(999, 'completed')).rejects.toThrow('Payment');
    });

    it('should update to pending status', async () => {
      const mockPayment = createMockPayment({ payment_status: 'pending' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.updatePaymentStatus(1, 'pending');

      expect(result.payment_status).toBe('pending');
    });

    it('should update to refunded status', async () => {
      const mockPayment = createMockPayment({ payment_status: 'refunded' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.updatePaymentStatus(1, 'refunded');

      expect(result.payment_status).toBe('refunded');
    });
  });

  // ============================================================================
  // getPaymentStats Tests
  // ============================================================================

  describe('getPaymentStats', () => {
    it('should return payment statistics without date filter', async () => {
      const mockTotals = {
        total_amount: '100000.00',
        total_count: '10',
        avg_amount: '10000.00',
      };
      const mockByMethod = [
        { payment_method: 'card', count: '8', total: '80000.00' },
        { payment_method: 'cash', count: '2', total: '20000.00' },
      ];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockTotals]))
        .mockResolvedValueOnce(createMockQueryResult(mockByMethod));

      const result = await service.getPaymentStats();

      expect(result.totalAmount).toBe(100000);
      expect(result.totalCount).toBe(10);
      expect(result.avgAmount).toBe(10000);
      expect(result.byMethod).toHaveLength(2);
      expect(result.byMethod[0].method).toBe('card');
      expect(result.byMethod[0].count).toBe(8);
      expect(result.byMethod[0].total).toBe(80000);
    });

    it('should filter by start date', async () => {
      const mockTotals = { total_amount: '50000.00', total_count: '5', avg_amount: '10000.00' };
      const mockByMethod: Array<{ payment_method: string; count: string; total: string }> = [];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockTotals]))
        .mockResolvedValueOnce(createMockQueryResult(mockByMethod));

      await service.getPaymentStats('2025-01-01');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $1'),
        ['2025-01-01']
      );
    });

    it('should filter by end date', async () => {
      const mockTotals = { total_amount: '50000.00', total_count: '5', avg_amount: '10000.00' };
      const mockByMethod: Array<{ payment_method: string; count: string; total: string }> = [];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockTotals]))
        .mockResolvedValueOnce(createMockQueryResult(mockByMethod));

      await service.getPaymentStats(undefined, '2025-12-31');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at <= $1'),
        ['2025-12-31']
      );
    });

    it('should filter by date range', async () => {
      const mockTotals = { total_amount: '25000.00', total_count: '3', avg_amount: '8333.33' };
      const mockByMethod: Array<{ payment_method: string; count: string; total: string }> = [];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockTotals]))
        .mockResolvedValueOnce(createMockQueryResult(mockByMethod));

      await service.getPaymentStats('2025-01-01', '2025-01-31');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $1'),
        expect.arrayContaining(['2025-01-01', '2025-01-31'])
      );
    });

    it('should handle zero payments', async () => {
      const mockTotals = { total_amount: null, total_count: '0', avg_amount: null };
      const mockByMethod: Array<{ payment_method: string; count: string; total: string }> = [];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockTotals]))
        .mockResolvedValueOnce(createMockQueryResult(mockByMethod));

      const result = await service.getPaymentStats();

      expect(result.totalAmount).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.avgAmount).toBe(0);
      expect(result.byMethod).toHaveLength(0);
    });

    it('should group by multiple payment methods', async () => {
      const mockTotals = { total_amount: '150000.00', total_count: '15', avg_amount: '10000.00' };
      const mockByMethod = [
        { payment_method: 'card', count: '10', total: '100000.00' },
        { payment_method: 'cash', count: '3', total: '30000.00' },
        { payment_method: 'check', count: '2', total: '20000.00' },
      ];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockTotals]))
        .mockResolvedValueOnce(createMockQueryResult(mockByMethod));

      const result = await service.getPaymentStats();

      expect(result.byMethod).toHaveLength(3);
      expect(result.byMethod.find(m => m.method === 'card')?.count).toBe(10);
      expect(result.byMethod.find(m => m.method === 'cash')?.count).toBe(3);
      expect(result.byMethod.find(m => m.method === 'check')?.count).toBe(2);
    });
  });

  // ============================================================================
  // Edge Cases & Error Handling
  // ============================================================================

  describe('edge cases', () => {
    it('should handle very large payment amounts', async () => {
      const largeAmount = 1000000000; // $10M
      const mockPayment = createMockPayment({ amount: largeAmount });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        customerId: 1,
        amount: largeAmount,
        paymentMethod: 'wire',
      });

      expect(result.amount).toBe(largeAmount);
    });

    it('should handle decimal amounts correctly', async () => {
      const decimalAmount = 15099; // $150.99 in cents
      const mockPayment = createMockPayment({ amount: decimalAmount });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

      const result = await service.createPayment({
        customerId: 1,
        amount: decimalAmount,
        paymentMethod: 'card',
      });

      expect(result.amount).toBe(decimalAmount);
    });

    it('should handle different payment methods', async () => {
      const methods = ['card', 'cash', 'check', 'wire', 'comp'];

      for (const method of methods) {
        const mockPayment = createMockPayment({ payment_method: method });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockPayment]));

        const result = await service.createPayment({
          customerId: 1,
          amount: 10000,
          paymentMethod: method,
        });

        expect(result.payment_method).toBe(method);
      }
    });
  });

  describe('error handling', () => {
    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        service.createPayment({
          customerId: 1,
          amount: 10000,
          paymentMethod: 'card',
        })
      ).rejects.toThrow('Database connection failed');
    });
  });
});
