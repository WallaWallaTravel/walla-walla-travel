/**
 * PricingService Tests
 *
 * CRITICAL: Tests for pricing calculations - affects revenue accuracy
 * Coverage target: 90%+
 */

import { PricingService } from '../pricing.service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockPricingRule } from '../../__tests__/factories';

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

describe('PricingService', () => {
  let service: PricingService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new PricingService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // calculatePricing - Vehicle Type Selection
  // ============================================================================

  describe('calculatePricing - vehicle type selection', () => {
    it('should always select sprinter regardless of party size', async () => {
      const pricingRule = createMockPricingRule({ vehicle_type: 'sprinter' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07', // Tuesday (weekday)
        partySize: 4,
        durationHours: 6,
      });

      expect(result.vehicleType).toBe('sprinter');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('vehicle_type = $1'),
        expect.arrayContaining(['sprinter'])
      );
    });

    it('should select sprinter for large parties (14 guests)', async () => {
      const pricingRule = createMockPricingRule({ vehicle_type: 'sprinter' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 14,
        durationHours: 6,
      });

      expect(result.vehicleType).toBe('sprinter');
    });

    it('should select sprinter for single guest', async () => {
      const pricingRule = createMockPricingRule({ vehicle_type: 'sprinter' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 1,
        durationHours: 6,
      });

      expect(result.vehicleType).toBe('sprinter');
    });
  });

  // ============================================================================
  // calculatePricing - Weekend vs Weekday Pricing
  // ============================================================================

  describe('calculatePricing - weekend pricing', () => {
    // Note: JavaScript's Date parses 'YYYY-MM-DD' as UTC midnight, which shifts
    // the day-of-week when converted to local time. We use explicit local date
    // strings with time to ensure consistent day-of-week calculation.

    it('should apply weekend multiplier for Saturday', async () => {
      const pricingRule = createMockPricingRule({
        base_price: '800.00',
        weekend_multiplier: '1.20',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      // Use a date with time to ensure it's Saturday in local timezone
      // 2025-01-11 12:00 is clearly Saturday regardless of timezone
      const result = await service.calculatePricing({
        tourDate: '2025-01-11T12:00:00',
        partySize: 6,
        durationHours: 6,
      });

      // Base: 800 * 1.20 = 960
      expect(result.basePrice).toBe(960);
    });

    it('should apply weekend multiplier for Sunday', async () => {
      const pricingRule = createMockPricingRule({
        base_price: '800.00',
        weekend_multiplier: '1.20',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      // 2025-01-12 12:00 is Sunday
      const result = await service.calculatePricing({
        tourDate: '2025-01-12T12:00:00',
        partySize: 6,
        durationHours: 6,
      });

      expect(result.basePrice).toBe(960);
    });

    it('should NOT apply weekend multiplier for weekdays', async () => {
      const pricingRule = createMockPricingRule({
        base_price: '800.00',
        weekend_multiplier: '1.20',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      // 2025-01-15 12:00 is Wednesday (clearly mid-week)
      const result = await service.calculatePricing({
        tourDate: '2025-01-15T12:00:00',
        partySize: 6,
        durationHours: 6,
      });

      expect(result.basePrice).toBe(800);
    });

    it('should NOT apply weekend multiplier for Monday', async () => {
      const pricingRule = createMockPricingRule({
        base_price: '800.00',
        weekend_multiplier: '1.20',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      // 2025-01-13 12:00 is Monday
      const result = await service.calculatePricing({
        tourDate: '2025-01-13T12:00:00',
        partySize: 6,
        durationHours: 6,
      });

      expect(result.basePrice).toBe(800);
    });

    it('should NOT apply weekend multiplier for Friday', async () => {
      const pricingRule = createMockPricingRule({
        base_price: '800.00',
        weekend_multiplier: '1.20',
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      // 2025-01-17 12:00 is Friday
      const result = await service.calculatePricing({
        tourDate: '2025-01-17T12:00:00',
        partySize: 6,
        durationHours: 6,
      });

      expect(result.basePrice).toBe(800);
    });
  });

  // ============================================================================
  // calculatePricing - Price Components
  // ============================================================================

  describe('calculatePricing - price components', () => {
    it('should calculate gratuity at 15%', async () => {
      const pricingRule = createMockPricingRule({ base_price: '1000.00' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Base: 1000, Gratuity: 1000 * 0.15 = 150
      expect(result.gratuity).toBe(150);
    });

    it('should calculate taxes at 9%', async () => {
      const pricingRule = createMockPricingRule({ base_price: '1000.00' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Base: 1000, Taxes: 1000 * 0.09 = 90
      expect(result.taxes).toBe(90);
    });

    it('should calculate total price correctly', async () => {
      const pricingRule = createMockPricingRule({ base_price: '1000.00' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Total: 1000 + 150 (gratuity) + 90 (tax) = 1240
      expect(result.totalPrice).toBe(1240);
    });

    it('should calculate deposit at 50%', async () => {
      const pricingRule = createMockPricingRule({ base_price: '1000.00' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Total: 1240, Deposit: 1240 * 0.5 = 620
      expect(result.depositAmount).toBe(620);
    });

    it('should calculate final payment correctly', async () => {
      const pricingRule = createMockPricingRule({ base_price: '1000.00' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Final: 1240 - 620 = 620
      expect(result.finalPaymentAmount).toBe(620);
      expect(result.depositAmount + result.finalPaymentAmount).toBe(result.totalPrice);
    });

    it('should round all values to 2 decimal places', async () => {
      // Use a base price that creates messy decimals
      const pricingRule = createMockPricingRule({ base_price: '777.77' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Check that all values have at most 2 decimal places
      expect(Number(result.basePrice.toFixed(2))).toBe(result.basePrice);
      expect(Number(result.gratuity.toFixed(2))).toBe(result.gratuity);
      expect(Number(result.taxes.toFixed(2))).toBe(result.taxes);
      expect(Number(result.totalPrice.toFixed(2))).toBe(result.totalPrice);
      expect(Number(result.depositAmount.toFixed(2))).toBe(result.depositAmount);
      expect(Number(result.finalPaymentAmount.toFixed(2))).toBe(result.finalPaymentAmount);
    });
  });

  // ============================================================================
  // calculatePricing - Fallback Pricing
  // ============================================================================

  describe('calculatePricing - fallback pricing', () => {
    it('should use default fallback price when no pricing rule found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Default fallback is $800
      expect(result.basePrice).toBe(800);
    });

    it('should calculate full pricing from fallback', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      // Fallback: 800
      // Gratuity: 800 * 0.15 = 120
      // Tax: 800 * 0.09 = 72
      // Total: 800 + 120 + 72 = 992
      expect(result.basePrice).toBe(800);
      expect(result.gratuity).toBe(120);
      expect(result.taxes).toBe(72);
      expect(result.totalPrice).toBe(992);
    });
  });

  // ============================================================================
  // calculatePricing - Duration-based Pricing
  // ============================================================================

  describe('calculatePricing - duration queries', () => {
    it('should query with correct duration hours', async () => {
      const pricingRule = createMockPricingRule({ duration_hours: 5 });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 5,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('duration_hours = $2'),
        expect.arrayContaining([5])
      );
    });

    it('should query for active pricing rules only', async () => {
      const pricingRule = createMockPricingRule({ is_active: true });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // calculateEndTime Tests
  // ============================================================================

  describe('calculateEndTime', () => {
    it('should calculate end time for 6-hour tour starting at 10:00', () => {
      const result = service.calculateEndTime('10:00', 6, '2025-01-07');
      expect(result).toBe('16:00');
    });

    it('should calculate end time for 5-hour tour starting at 10:00', () => {
      const result = service.calculateEndTime('10:00', 5, '2025-01-07');
      expect(result).toBe('15:00');
    });

    it('should handle times with minutes', () => {
      const result = service.calculateEndTime('10:30', 6, '2025-01-07');
      expect(result).toBe('16:30');
    });

    it('should handle midnight crossing', () => {
      const result = service.calculateEndTime('20:00', 6, '2025-01-07');
      expect(result).toBe('02:00'); // Next day
    });

    it('should preserve leading zeros in output', () => {
      const result = service.calculateEndTime('03:00', 5, '2025-01-07');
      expect(result).toBe('08:00');
    });

    it('should handle single-digit hours in output', () => {
      const result = service.calculateEndTime('01:00', 5, '2025-01-07');
      expect(result).toBe('06:00');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle single guest (minimum party size)', async () => {
      const pricingRule = createMockPricingRule({ vehicle_type: 'sprinter' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 1,
        durationHours: 5,
      });

      expect(result.vehicleType).toBe('sprinter');
    });

    it('should handle minimum duration (5 hours)', async () => {
      const pricingRule = createMockPricingRule({ duration_hours: 5 });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 5,
      });

      expect(result).toBeDefined();
    });

    it('should handle maximum duration (6 hours)', async () => {
      const pricingRule = createMockPricingRule({ duration_hours: 6 });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      const result = await service.calculatePricing({
        tourDate: '2025-01-07',
        partySize: 6,
        durationHours: 6,
      });

      expect(result).toBeDefined();
    });

    it('should handle weekend with no weekend_multiplier in rule', async () => {
      const pricingRule = createMockPricingRule({
        base_price: '800.00',
        weekend_multiplier: null,
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([pricingRule]));

      // Saturday
      const result = await service.calculatePricing({
        tourDate: '2025-01-04',
        partySize: 6,
        durationHours: 6,
      });

      // Should use base price without multiplier
      expect(result.basePrice).toBe(800);
    });
  });
});
