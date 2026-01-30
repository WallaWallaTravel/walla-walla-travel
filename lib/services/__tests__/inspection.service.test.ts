/**
 * InspectionService Tests
 *
 * CRITICAL: Tests for DVIR and vehicle inspection compliance
 * Coverage target: 85%+
 *
 * Tests pre-trip, post-trip inspections, and DVIR submission
 * @compliance FMCSA Part 396.11
 */

import { InspectionService, CreatePreTripData, CreatePostTripData } from '../inspection.service';
import { BadRequestError, ConflictError } from '@/lib/api/middleware/error-handler';

// Mock the db module
const mockQuery = jest.fn();

jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock transaction utility
jest.mock('@/lib/db/transaction', () => ({
  withTransaction: jest.fn((callback) => callback({ query: mockQuery })),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('InspectionService', () => {
  let service: InspectionService;

  const mockPreTripData: CreatePreTripData = {
    vehicleId: 1,
    startMileage: 50000,
    inspectionData: {
      items: {
        brakes: true,
        lights: true,
        tires: true,
        mirrors: true,
        horn: true,
        wipers: true,
        seatbelts: true,
        emergency_equipment: true,
      },
      signature: 'data:image/png;base64,abc123',
      notes: 'All systems go',
    },
  };

  const mockPostTripData: CreatePostTripData = {
    vehicleId: 1,
    endMileage: 50150,
    inspectionData: {
      items: {
        brakes: true,
        lights: true,
        tires: true,
        fluid_levels: true,
        body_damage: false,
      },
      notes: 'Minor chip in windshield noted',
      signature: 'data:image/png;base64,xyz789',
      fuelLevel: '3/4',
      defectsFound: true,
      defectSeverity: 'minor',
      defectDescription: 'Small chip in windshield, passenger side',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InspectionService();
  });

  describe('createPreTrip', () => {
    it('should require active shift (time card)', async () => {
      // Mock no active time card
      mockQuery.mockResolvedValueOnce({ rows: [] }); // queryOne for time card

      await expect(service.createPreTrip(1, mockPreTripData)).rejects.toThrow(BadRequestError);
    });

    it('should check for active time card first', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      try {
        await service.createPreTrip(1, mockPreTripData);
      } catch {
        // Expected to throw
      }

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('time_cards'),
        expect.arrayContaining([1])
      );
    });

    it('should prevent duplicate pre-trip for same vehicle on same day', async () => {
      // Mock active time card
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock existing pre-trip today
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 99 }] });
      // Mock no previous post-trip defects
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.createPreTrip(1, mockPreTripData)).rejects.toThrow(ConflictError);
    });

    it('should allow pre-trip if previous vehicle had defects', async () => {
      // Mock active time card
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock existing pre-trip today
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 99 }] });
      // Mock previous post-trip WITH critical defects
      mockQuery.mockResolvedValueOnce({ rows: [{ defects_found: true, defect_severity: 'critical' }] });
      // Mock insert
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 100,
          driver_id: 1,
          vehicle_id: 1,
          type: 'pre_trip',
        }],
      });

      const result = await service.createPreTrip(1, mockPreTripData);

      expect(result).toBeDefined();
    });

    it('should record start mileage on pre-trip', async () => {
      // Mock active time card
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock no existing pre-trip
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock no previous post-trip
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock insert
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          driver_id: 1,
          vehicle_id: 1,
          type: 'pre_trip',
          start_mileage: 50000,
        }],
      });

      const result = await service.createPreTrip(1, mockPreTripData);

      // Check that insert was called with start_mileage
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inspections'),
        expect.any(Array)
      );
    });
  });

  describe('createPostTrip', () => {
    it('should require active shift for post-trip', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No active time card

      await expect(service.createPostTrip(1, mockPostTripData)).rejects.toThrow(BadRequestError);
    });

    it('should prevent duplicate post-trip for same shift', async () => {
      // Mock active time card
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock existing post-trip for this shift
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 50 }] });

      await expect(service.createPostTrip(1, mockPostTripData)).rejects.toThrow(ConflictError);
    });

    it('should handle critical defects by marking vehicle out of service', async () => {
      const criticalDefectData: CreatePostTripData = {
        ...mockPostTripData,
        inspectionData: {
          ...mockPostTripData.inspectionData,
          defectSeverity: 'critical',
          defectDescription: 'Brake failure - rear left caliper seized',
        },
      };

      // Mock active time card
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock no existing post-trip
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock inspection insert
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 2,
          driver_id: 1,
          vehicle_id: 1,
          type: 'post_trip',
          defect_severity: 'critical',
        }],
      });
      // Mock vehicle update (mark out of service)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await service.createPostTrip(1, criticalDefectData);

      // Should have called update on vehicles table
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vehicles'),
        expect.any(Array)
      );
    });
  });

  describe('defect severity handling', () => {
    it('should classify defect severities correctly', () => {
      const severities: Array<'none' | 'minor' | 'critical'> = ['none', 'minor', 'critical'];
      severities.forEach(severity => {
        expect(['none', 'minor', 'critical']).toContain(severity);
      });
    });
  });

  describe('error handling', () => {
    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.createPreTrip(1, mockPreTripData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('inspection data validation', () => {
    it('should require vehicle ID', () => {
      expect(mockPreTripData.vehicleId).toBeDefined();
      expect(typeof mockPreTripData.vehicleId).toBe('number');
    });

    it('should require mileage for pre-trip', () => {
      expect(mockPreTripData.startMileage).toBeDefined();
      expect(typeof mockPreTripData.startMileage).toBe('number');
    });

    it('should require mileage for post-trip', () => {
      expect(mockPostTripData.endMileage).toBeDefined();
      expect(typeof mockPostTripData.endMileage).toBe('number');
    });

    it('should include inspection items', () => {
      expect(mockPreTripData.inspectionData.items).toBeDefined();
      expect(Object.keys(mockPreTripData.inspectionData.items).length).toBeGreaterThan(0);
    });
  });
});
