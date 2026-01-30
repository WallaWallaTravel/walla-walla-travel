/**
 * ComplianceService Tests
 *
 * CRITICAL: Tests for regulatory compliance (FMCSA/DOT)
 * Coverage target: 85%+
 *
 * Tests driver qualification, vehicle compliance, and HOS limits
 */

// Mock modules before importing the service
const mockQuery = jest.fn();

jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { complianceService } from '../compliance.service';

// Helper to create future/past dates
function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

describe('ComplianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDriverCompliance', () => {
    const mockCompliantDriver = {
      id: 1,
      name: 'John Driver',
      role: 'driver',
      is_active: true,
      medical_cert_expiry: daysFromNow(180),
      license_expiry: daysFromNow(365),
      mvr_check_date: daysFromNow(-30),
      annual_review_date: daysFromNow(-30),
      road_test_date: daysFromNow(-90),
      dq_file_complete: true,
      employment_status: 'active',
    };

    it('should return compliant for driver with all valid documents', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockCompliantDriver] }) // Driver query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.isCompliant).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return non-compliant for driver not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await complianceService.checkDriverCompliance(999);

      expect(result.isCompliant).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.violations.some(v => v.type === 'driver_inactive')).toBe(true);
    });

    it('should detect expired medical certificate', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            medical_cert_expiry: daysFromNow(-10),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.violations.some(v => v.type === 'medical_cert_expired')).toBe(true);
      expect(result.allowsAdminOverride).toBe(false);
    });

    it('should detect missing medical certificate', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            medical_cert_expiry: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'medical_cert_missing')).toBe(true);
    });

    it('should detect expired driver license', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            license_expiry: daysFromNow(-5),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.violations.some(v => v.type === 'license_expired')).toBe(true);
    });

    it('should warn about documents expiring within 30 days', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            medical_cert_expiry: daysFromNow(15),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.type === 'medical_cert_expired')).toBe(true);
    });

    it('should detect inactive driver', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            is_active: false,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'driver_inactive')).toBe(true);
    });

    it('should detect missing MVR check', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            mvr_check_date: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'mvr_missing')).toBe(true);
    });

    it('should detect outdated MVR (over 12 months)', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            mvr_check_date: daysFromNow(-400),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.violations.some(v => v.type === 'mvr_expired')).toBe(true);
    });

    it('should detect inactive employment status', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            employment_status: 'terminated',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'driver_inactive')).toBe(true);
    });

    it('should detect missing road test date', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantDriver,
            road_test_date: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.violations.some(v => v.type === 'road_test_missing')).toBe(true);
    });
  });

  describe('checkVehicleCompliance', () => {
    const mockCompliantVehicle = {
      id: 1,
      name: 'Mercedes Sprinter',
      is_active: true,
      registration_expiry: daysFromNow(180),
      insurance_expiry: daysFromNow(180),
      last_dot_inspection: daysFromNow(-30),
    };

    it('should return compliant for vehicle with valid documents', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockCompliantVehicle] }) // Vehicle data
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // No critical defects
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // No open violations

      const result = await complianceService.checkVehicleCompliance(1);

      expect(result.isCompliant).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect inactive vehicle', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantVehicle,
            is_active: false,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Critical defects query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkVehicleCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.violations.some(v => v.type === 'vehicle_inactive')).toBe(true);
    });

    it('should detect expired registration', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantVehicle,
            registration_expiry: daysFromNow(-10),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Critical defects query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkVehicleCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'registration_expired')).toBe(true);
    });

    it('should detect expired insurance', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantVehicle,
            insurance_expiry: daysFromNow(-5),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Critical defects query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkVehicleCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'insurance_expired')).toBe(true);
    });

    it('should detect vehicle not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await complianceService.checkVehicleCompliance(999);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'vehicle_inactive')).toBe(true);
    });

    it('should detect critical defect', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockCompliantVehicle] }) // Vehicle data
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // Critical defects from inspections
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkVehicleCompliance(1);

      expect(result.isCompliant).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.violations.some(v => v.type === 'critical_defect')).toBe(true);
    });

    it('should warn about registration expiring soon', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockCompliantVehicle,
            registration_expiry: daysFromNow(15),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Critical defects query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkVehicleCompliance(1);

      expect(result.warnings.some(w => w.type === 'registration_expired')).toBe(true);
    });
  });

  describe('checkHOSCompliance', () => {
    it('should return compliant when within HOS limits', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            driving_hours: 5,
            on_duty_hours: 8,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ total_hours: 30 }] }); // Weekly hours query

      const result = await complianceService.checkHOSCompliance(1, new Date());

      expect(result.isCompliant).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should detect daily driving limit exceeded', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            driving_hours: 12,
            on_duty_hours: 13,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ total_hours: 30 }] }); // Weekly hours query

      const result = await complianceService.checkHOSCompliance(1, new Date());

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'hos_daily_driving_exceeded')).toBe(true);
    });

    it('should detect daily on-duty limit exceeded', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            driving_hours: 8,
            on_duty_hours: 16,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ total_hours: 30 }] }); // Weekly hours query

      const result = await complianceService.checkHOSCompliance(1, new Date());

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.type === 'hos_daily_on_duty_exceeded')).toBe(true);
    });
  });

  describe('checkAssignmentCompliance', () => {
    const mockCompliantVehicle = {
      id: 1,
      name: 'Mercedes Sprinter',
      is_active: true,
      registration_expiry: daysFromNow(180),
      insurance_expiry: daysFromNow(180),
      last_dot_inspection: daysFromNow(-30),
    };

    it('should block assignment when driver is non-compliant', async () => {
      // checkAssignmentCompliance calls three checks in parallel via Promise.all:
      // - checkDriverCompliance (2 queries)
      // - checkVehicleCompliance (2 queries)
      // - checkHOSCompliance (2 queries)
      // Note: Promise.all makes the order unpredictable, so use mockImplementation
      let queryCount = 0;
      mockQuery.mockImplementation(() => {
        queryCount++;
        // Return appropriate responses based on query count
        // Driver queries
        if (queryCount === 1) return Promise.resolve({ rows: [] }); // Driver not found
        // Vehicle queries
        if (queryCount === 2) return Promise.resolve({ rows: [mockCompliantVehicle] });
        if (queryCount === 3) return Promise.resolve({ rows: [{ count: 0 }] }); // No defects
        // HOS queries
        if (queryCount === 4) return Promise.resolve({ rows: [{ driving_hours: 5, on_duty_hours: 8 }] });
        if (queryCount === 5) return Promise.resolve({ rows: [{ total_hours: 30 }] });
        return Promise.resolve({ rows: [] });
      });

      const result = await complianceService.checkAssignmentCompliance(999, 1, new Date());

      expect(result.canProceed).toBe(false);
      expect(result.driverCompliance.isCompliant).toBe(false);
    });
  });

  describe('violation severity classification', () => {
    it('should classify expired documents as critical', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Driver',
            role: 'driver',
            is_active: true,
            medical_cert_expiry: daysFromNow(-10),
            license_expiry: daysFromNow(365),
            mvr_check_date: daysFromNow(-30),
            annual_review_date: daysFromNow(-30),
            road_test_date: daysFromNow(-90),
            dq_file_complete: true,
            employment_status: 'active',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkDriverCompliance(1);

      const violation = result.violations.find(v => v.type === 'medical_cert_expired');
      expect(violation?.severity).toBe('critical');
    });

    it('should not allow admin override for critical violations', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Driver',
            role: 'driver',
            is_active: true,
            medical_cert_expiry: daysFromNow(-10),
            license_expiry: daysFromNow(365),
            mvr_check_date: daysFromNow(-30),
            annual_review_date: daysFromNow(-30),
            road_test_date: daysFromNow(-90),
            dq_file_complete: true,
            employment_status: 'active',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Open violations query

      const result = await complianceService.checkDriverCompliance(1);

      expect(result.allowsAdminOverride).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(complianceService.checkDriverCompliance(1)).rejects.toThrow('Database connection failed');
    });
  });
});
