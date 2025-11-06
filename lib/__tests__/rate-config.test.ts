import {
  getHourlyRate,
  calculateWineTourPrice,
  calculateSharedTourPrice,
  getDayOfWeek,
  isSharedTourDay,
} from '../rate-config';

describe('Rate Configuration', () => {
  describe('getHourlyRate', () => {
    it('returns correct rate for 1-2 guests on Sunday', () => {
      const rate = getHourlyRate(2, new Date(2025, 5, 8)); // Sunday, June 8
      expect(rate).toBe(85);
    });

    it('returns correct rate for 1-2 guests on Friday', () => {
      const rate = getHourlyRate(2, new Date(2025, 5, 13)); // Friday, June 13
      expect(rate).toBe(95);
    });

    it('returns correct rate for 5-6 guests on Wednesday', () => {
      const rate = getHourlyRate(5, new Date(2025, 5, 11)); // Wednesday, June 11
      expect(rate).toBe(105);
    });

    it('returns correct rate for 5-6 guests on Saturday', () => {
      const rate = getHourlyRate(5, new Date(2025, 5, 14)); // Saturday, June 14
      expect(rate).toBe(115);
    });

    it('returns correct rate for 12-14 guests on Monday', () => {
      const rate = getHourlyRate(12, new Date(2025, 5, 9)); // Monday, June 9
      expect(rate).toBe(140);
    });

    it('returns correct rate for 12-14 guests on Thursday', () => {
      const rate = getHourlyRate(12, new Date(2025, 5, 12)); // Thursday, June 12
      expect(rate).toBe(150);
    });
  });

  describe('calculateWineTourPrice', () => {
    it('calculates Sunday-Wednesday pricing correctly', () => {
      const result = calculateWineTourPrice(
        6, // 6 hours
        5, // 5 guests
        new Date('2025-06-09') // Monday
      );

      expect(result.hourly_rate).toBe(105); // 5-6 guests, Sun-Wed
      expect(result.hours).toBe(6);
      expect(result.subtotal).toBe(630); // 6 × 105
      expect(result.tax).toBeCloseTo(56.07, 2); // 630 × 0.089
      expect(result.total).toBeCloseTo(686.07, 2);
      expect(result.day_type).toBe('Sun-Wed');
      expect(result.rate_tier).toBe('5-6 guests');
    });

    it('calculates Thursday-Saturday pricing correctly', () => {
      const result = calculateWineTourPrice(
        6, // 6 hours
        5, // 5 guests
        new Date('2025-06-13') // Friday
      );

      expect(result.hourly_rate).toBe(115); // 5-6 guests, Thu-Sat
      expect(result.hours).toBe(6);
      expect(result.subtotal).toBe(690); // 6 × 115
      expect(result.tax).toBeCloseTo(61.41, 2); // 690 × 0.089
      expect(result.total).toBeCloseTo(751.41, 2);
      expect(result.day_type).toBe('Thu-Sat');
    });

    it('enforces 5-hour minimum', () => {
      const result = calculateWineTourPrice(
        3, // 3 hours (below minimum)
        4, // 4 guests
        new Date('2025-06-09') // Monday
      );

      expect(result.hours).toBe(5); // Enforced minimum
      expect(result.subtotal).toBe(475); // 5 × 95
    });

    it('handles large groups correctly', () => {
      const result = calculateWineTourPrice(
        8, // 8 hours
        12, // 12 guests
        new Date('2025-06-10') // Tuesday
      );

      expect(result.hourly_rate).toBe(140); // 12-14 guests, Sun-Wed
      expect(result.subtotal).toBe(1120); // 8 × 140
      expect(result.rate_tier).toBe('12-14 guests');
    });

    it('handles string dates correctly', () => {
      const result = calculateWineTourPrice(6, 5, '2025-06-13');

      expect(result.hourly_rate).toBe(115);
      expect(result.day_type).toBe('Thu-Sat');
    });
  });

  describe('calculateSharedTourPrice', () => {
    it('calculates base rate correctly', () => {
      const result = calculateSharedTourPrice(6, false);

      expect(result.per_person_rate).toBe(95);
      expect(result.guests).toBe(6);
      expect(result.subtotal).toBe(570); // 6 × 95
      expect(result.tax).toBeCloseTo(50.73, 2);
      expect(result.total).toBeCloseTo(620.73, 2);
    });

    it('calculates with lunch rate correctly', () => {
      const result = calculateSharedTourPrice(6, true);

      expect(result.per_person_rate).toBe(115);
      expect(result.guests).toBe(6);
      expect(result.subtotal).toBe(690); // 6 × 115
      expect(result.tax).toBeCloseTo(61.41, 2);
      expect(result.total).toBeCloseTo(751.41, 2);
    });
  });

  describe('getDayOfWeek', () => {
    it('returns correct day names', () => {
      expect(getDayOfWeek(new Date(2025, 5, 8))).toBe('Sunday');
      expect(getDayOfWeek(new Date(2025, 5, 9))).toBe('Monday');
      expect(getDayOfWeek(new Date(2025, 5, 13))).toBe('Friday');
      expect(getDayOfWeek(new Date(2025, 5, 14))).toBe('Saturday');
    });

    it('handles string dates', () => {
      expect(getDayOfWeek(new Date(2025, 5, 8))).toBe('Sunday');
    });
  });

  describe('isSharedTourDay', () => {
    it('returns true for Sunday-Wednesday', () => {
      expect(isSharedTourDay(new Date(2025, 10, 2))).toBe(true); // Sunday
      expect(isSharedTourDay(new Date(2025, 10, 3))).toBe(true); // Monday
      expect(isSharedTourDay(new Date(2025, 10, 4))).toBe(true); // Tuesday
      expect(isSharedTourDay(new Date(2025, 10, 5))).toBe(true); // Wednesday
    });

    it('returns false for Thursday-Saturday', () => {
      expect(isSharedTourDay(new Date(2025, 10, 6))).toBe(false); // Thursday
      expect(isSharedTourDay(new Date(2025, 10, 7))).toBe(false); // Friday
      expect(isSharedTourDay(new Date(2025, 10, 8))).toBe(false); // Saturday
    });
  });

  describe('Edge Cases', () => {
    it('handles party size boundaries correctly', () => {
      // Test boundary between tiers
      expect(getHourlyRate(2, new Date(2025, 5, 9))).toBe(85); // 1-2 tier
      expect(getHourlyRate(3, new Date(2025, 5, 9))).toBe(95); // 3-4 tier
      expect(getHourlyRate(4, new Date(2025, 5, 9))).toBe(95); // 3-4 tier
      expect(getHourlyRate(5, new Date(2025, 5, 9))).toBe(105); // 5-6 tier
    });

    it('handles day boundaries correctly', () => {
      // Wednesday (last day of Sun-Wed)
      expect(getHourlyRate(4, new Date(2025, 10, 5))).toBe(95); // Month is 0-indexed
      // Thursday (first day of Thu-Sat)
      expect(getHourlyRate(4, new Date(2025, 10, 6))).toBe(105);
    });
  });
});

