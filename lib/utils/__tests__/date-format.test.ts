import {
  nowISO,
  todayDate,
  toDateString,
  formatDisplayDate,
  formatShortDate,
  formatDateTime,
  isValidDate,
  isValidDateRange,
  addDays,
} from '../date-format';

describe('nowISO', () => {
  it('should return an ISO string', () => {
    const result = nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('todayDate', () => {
  it('should return YYYY-MM-DD format', () => {
    const result = todayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('toDateString', () => {
  it('should convert Date to YYYY-MM-DD', () => {
    const result = toDateString(new Date('2025-06-15T14:30:00Z'));
    expect(result).toBe('2025-06-15');
  });

  it('should convert ISO string to YYYY-MM-DD', () => {
    const result = toDateString('2025-06-15T14:30:00.000Z');
    expect(result).toBe('2025-06-15');
  });

  it('should handle date-only string', () => {
    const result = toDateString('2025-01-01');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatDisplayDate', () => {
  it('should format date-only string with weekday', () => {
    // 2025-06-15 is a Sunday
    const result = formatDisplayDate('2025-06-15');
    expect(result).toContain('Sunday');
    expect(result).toContain('June');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('should handle ISO string input', () => {
    const result = formatDisplayDate('2025-12-25T00:00:00.000Z');
    expect(result).toContain('December');
    expect(result).toContain('25');
    expect(result).toContain('2025');
  });
});

describe('formatShortDate', () => {
  it('should format as short date', () => {
    const result = formatShortDate('2025-06-15');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });
});

describe('formatDateTime', () => {
  it('should include date and time', () => {
    const result = formatDateTime('2025-06-15T14:30:00.000Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2025');
    // Time part depends on locale/timezone, just check it has 'at'
    expect(result).toContain('at');
  });
});

describe('isValidDate', () => {
  it('should return true for valid dates', () => {
    expect(isValidDate('2025-06-15')).toBe(true);
    expect(isValidDate('2025-06-15T14:30:00Z')).toBe(true);
  });

  it('should return false for invalid dates', () => {
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('isValidDateRange', () => {
  it('should return true when start <= end', () => {
    expect(isValidDateRange('2025-01-01', '2025-12-31')).toBe(true);
  });

  it('should return true when start === end', () => {
    expect(isValidDateRange('2025-06-15', '2025-06-15')).toBe(true);
  });

  it('should return false when start > end', () => {
    expect(isValidDateRange('2025-12-31', '2025-01-01')).toBe(false);
  });

  it('should return false for invalid dates', () => {
    expect(isValidDateRange('bad', '2025-01-01')).toBe(false);
  });
});

describe('addDays', () => {
  it('should add days to a date', () => {
    const result = addDays('2025-06-15', 5);
    expect(result).toBe('2025-06-20');
  });

  it('should handle negative days', () => {
    const result = addDays('2025-06-15', -3);
    expect(result).toBe('2025-06-12');
  });

  it('should handle month boundaries', () => {
    const result = addDays('2025-01-30', 3);
    expect(result).toBe('2025-02-02');
  });

  it('should accept Date objects', () => {
    const result = addDays(new Date('2025-06-15T00:00:00Z'), 1);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
