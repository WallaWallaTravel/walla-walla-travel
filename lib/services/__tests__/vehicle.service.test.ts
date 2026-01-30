/**
 * VehicleService Tests
 *
 * Tests for fleet vehicle management
 * Coverage target: 80%+
 */

import { VehicleService, Vehicle } from '../vehicle.service';

// Mock the db module
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

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('VehicleService', () => {
  let service: VehicleService;

  const mockVehicle: Vehicle = {
    id: 1,
    vehicle_number: 'V001',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2023,
    vin: '1GCHC39K591234567',
    license_plate: 'ABC123',
    capacity: 14,
    current_mileage: 25000,
    next_service_due: '2026-03-01',
    last_service_date: '2025-12-01',
    status: 'available',
    is_active: true,
    is_available: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VehicleService();
  });

  describe('getById', () => {
    it('should return vehicle by id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockVehicle] });

      const result = await service.getById(1);

      expect(result).toEqual(mockVehicle);
    });

    it('should return null if vehicle not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getAvailable', () => {
    it('should return available vehicles', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockVehicle] });

      const result = await service.getAvailable();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('available');
    });

    it('should return empty array if no available vehicles', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getAvailable();

      expect(result).toHaveLength(0);
    });
  });

  describe('getAvailableForDriver', () => {
    it('should return categorized vehicles for driver', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            vehicle_number: 'V001',
            make: 'Mercedes',
            model: 'Sprinter',
            year: 2023,
            capacity: 14,
            license_plate: 'ABC123',
            vin: '1GCHC39K591234567',
            status: 'available',
            current_driver_name: null,
          },
          {
            id: 2,
            vehicle_number: 'V002',
            make: 'Ford',
            model: 'Transit',
            year: 2022,
            capacity: 12,
            license_plate: 'XYZ789',
            vin: '1GCHC39K591234568',
            status: 'in_use',
            current_driver_name: 'Other Driver',
          },
        ],
      });

      const result = await service.getAvailableForDriver(1);

      expect(result.vehicles).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(2);
    });
  });

  describe('getDocuments', () => {
    it('should return vehicle documents', async () => {
      const mockDocuments = [
        {
          id: 1,
          vehicle_id: 1,
          document_type: 'registration',
          document_name: 'Registration 2026',
          document_url: '/docs/reg.pdf',
          expiry_date: '2026-12-31',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockDocuments });

      const result = await service.getDocuments(1);

      expect(result).toHaveLength(1);
      expect(result[0].document_type).toBe('registration');
    });

    it('should return empty array if no documents', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getDocuments(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should propagate database errors from getById', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.getById(1)).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors from getAvailable', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.getAvailable()).rejects.toThrow('Database connection failed');
    });
  });
});
