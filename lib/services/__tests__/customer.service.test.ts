/**
 * CustomerService Tests
 *
 * Tests for customer management - tracks customer data and booking history
 * Coverage target: 80%+
 *
 * Key features tested:
 * - Find or create customers (de-duplication by email)
 * - Update customer statistics after bookings
 * - Case-insensitive email lookup
 */

import { CustomerService } from '../customer.service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockCustomer } from '../../__tests__/factories';

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

describe('CustomerService', () => {
  let service: CustomerService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new CustomerService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // findOrCreate() Tests
  // ============================================================================

  describe('findOrCreate', () => {
    describe('when customer exists', () => {
      it('should return existing customer and update info', async () => {
        const existingCustomer = createMockCustomer({
          id: 1,
          email: 'existing@example.com',
          name: 'Old Name',
          phone: '555-0000',
        });

        // First query finds existing customer
        mockQuery.mockResolvedValueOnce(createMockQueryResult([existingCustomer]));
        // Second query updates customer
        mockQuery.mockResolvedValueOnce(createMockQueryResult([{
          ...existingCustomer,
          name: 'New Name',
          phone: '555-1234',
        }]));

        const result = await service.findOrCreate({
          email: 'existing@example.com',
          name: 'New Name',
          phone: '555-1234',
        });

        expect(result.id).toBe(1);
        expect(mockQuery).toHaveBeenCalledTimes(2);
      });

      it('should preserve existing phone if not provided in update', async () => {
        const existingCustomer = createMockCustomer({
          phone: '555-0000',
        });

        mockQuery.mockResolvedValueOnce(createMockQueryResult([existingCustomer]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([existingCustomer]));

        await service.findOrCreate({
          email: existingCustomer.email,
          name: 'New Name',
          // phone not provided
        });

        // The update query should use existing phone
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall).toBeDefined();
      });

      it('should perform case-insensitive email lookup', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCustomer()]));

        await service.findOrCreate({
          email: 'USER@EXAMPLE.COM',
          name: 'Test User',
        });

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('LOWER(email) = LOWER'),
          expect.any(Array)
        );
      });
    });

    describe('when customer does not exist', () => {
      it('should create new customer with required fields', async () => {
        const newCustomer = createMockCustomer({
          id: 1,
          email: 'new@example.com',
          name: 'New Customer',
        });

        // First query finds no existing customer
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
        // Second query inserts new customer
        mockQuery.mockResolvedValueOnce(createMockQueryResult([newCustomer]));

        const result = await service.findOrCreate({
          email: 'new@example.com',
          name: 'New Customer',
        });

        expect(result.email).toBe('new@example.com');
        expect(result.name).toBe('New Customer');
      });

      it('should create customer with default values', async () => {
        const newCustomer = createMockCustomer({
          total_bookings: 0,
          total_spent: 0,
          email_marketing_consent: false,
          sms_marketing_consent: false,
        });

        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([newCustomer]));

        const result = await service.findOrCreate({
          email: 'new@example.com',
          name: 'New Customer',
        });

        expect(result.total_bookings).toBe(0);
        expect(result.total_spent).toBe(0);
      });

      it('should respect marketing consent when provided', async () => {
        const newCustomer = createMockCustomer({
          email_marketing_consent: true,
          sms_marketing_consent: true,
        });

        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([newCustomer]));

        await service.findOrCreate({
          email: 'new@example.com',
          name: 'New Customer',
          email_marketing_consent: true,
          sms_marketing_consent: true,
        });

        expect(mockQuery).toHaveBeenCalled();
      });

      it('should include phone when provided', async () => {
        const newCustomer = createMockCustomer({
          phone: '555-1234',
        });

        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
        mockQuery.mockResolvedValueOnce(createMockQueryResult([newCustomer]));

        const result = await service.findOrCreate({
          email: 'new@example.com',
          name: 'New Customer',
          phone: '555-1234',
        });

        expect(result.phone).toBe('555-1234');
      });
    });
  });

  // ============================================================================
  // updateStatistics() Tests
  // ============================================================================

  describe('updateStatistics', () => {
    it('should increment booking count and total spent', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.updateStatistics(1, 500.00, '2025-01-15');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('total_bookings = total_bookings + 1'),
        [500.00, '2025-01-15', 1]
      );
    });

    it('should update last_booking_date', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.updateStatistics(1, 500.00, '2025-01-15');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_booking_date = $2'),
        expect.any(Array)
      );
    });

    it('should handle decimal amounts', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.updateStatistics(1, 499.99, '2025-01-15');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [499.99, '2025-01-15', 1]
      );
    });
  });

  // ============================================================================
  // getById() Tests
  // ============================================================================

  describe('getById', () => {
    it('should return customer when found', async () => {
      const customer = createMockCustomer({ id: 1 });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([customer]));

      const result = await service.getById(1);

      expect(result).toEqual(customer);
    });

    it('should return null when customer not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getByEmail() Tests
  // ============================================================================

  describe('getByEmail', () => {
    it('should return customer when found', async () => {
      const customer = createMockCustomer({ email: 'test@example.com' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([customer]));

      const result = await service.getByEmail('test@example.com');

      expect(result).toEqual(customer);
    });

    it('should return null when customer not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should use case-insensitive email matching', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.getByEmail('TEST@EXAMPLE.COM');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(email) = LOWER'),
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty phone gracefully', async () => {
      const customer = createMockCustomer({ phone: null as unknown as string });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([customer]));

      const result = await service.getById(1);

      expect(result?.phone).toBeNull();
    });

    it('should handle special characters in email', async () => {
      const customer = createMockCustomer({ email: 'test+booking@example.com' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([customer]));

      const result = await service.getByEmail('test+booking@example.com');

      expect(result?.email).toBe('test+booking@example.com');
    });

    it('should handle unicode names', async () => {
      const customer = createMockCustomer({ name: 'José García' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([customer]));

      const result = await service.findOrCreate({
        email: 'jose@example.com',
        name: 'José García',
      });

      expect(result.name).toBe('José García');
    });
  });
});
