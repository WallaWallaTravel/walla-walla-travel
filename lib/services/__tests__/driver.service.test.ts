/**
 * DriverService Tests
 *
 * Tests for driver management and tour assignments
 * Coverage target: 80%+
 */

import { DriverService } from '../driver.service';

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

describe('DriverService', () => {
  let service: DriverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DriverService();
    // Mock the inherited query method
    jest.spyOn(service as any, 'query').mockImplementation((...args: unknown[]) => mockQuery(...args));
  });

  describe('listActive', () => {
    const mockDrivers = [
      {
        id: 1,
        email: 'owner@example.com',
        name: 'John Owner',
        role: 'owner',
        phone: '509-555-0001',
        created_at: new Date('2024-01-01'),
        last_login: new Date('2026-01-30'),
      },
      {
        id: 2,
        email: 'admin@example.com',
        name: 'Jane Admin',
        role: 'admin',
        phone: '509-555-0002',
        created_at: new Date('2024-03-15'),
        last_login: new Date('2026-01-29'),
      },
      {
        id: 3,
        email: 'driver1@example.com',
        name: 'Bob Driver',
        role: 'driver',
        phone: '509-555-0003',
        created_at: new Date('2024-06-01'),
        last_login: new Date('2026-01-28'),
      },
    ];

    it('should return all active drivers sorted by role priority', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDrivers });

      const result = await service.listActive();

      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('owner');
      expect(result[1].role).toBe('admin');
      expect(result[2].role).toBe('driver');
    });

    it('should return empty array when no active drivers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.listActive();

      expect(result).toHaveLength(0);
    });

    it('should query only active users with driver/admin/owner roles', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.listActive();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("role IN ('driver', 'admin', 'owner')"),
        expect.any(Array)
      );
    });
  });

  describe('getToursByDate', () => {
    const mockTours = [
      {
        booking_id: 1,
        customer_name: 'Alice Smith',
        tour_date: '2026-02-01',
        pickup_time: '10:00 AM',
        party_size: 4,
        status: 'confirmed',
        itinerary_id: 1,
        pickup_location: 'Downtown Hotel',
        dropoff_location: 'Downtown Hotel',
        driver_notes: 'Birthday celebration',
        stops: [
          {
            winery_name: 'L\'Ecole No 41',
            arrival_time: '10:30 AM',
            departure_time: '12:00 PM',
            duration_minutes: 90,
            address: '41 Lowden School Rd',
          },
          {
            winery_name: 'Leonetti Cellar',
            arrival_time: '12:30 PM',
            departure_time: '2:00 PM',
            duration_minutes: 90,
            address: '1875 Foothills Ln',
          },
        ],
      },
    ];

    it('should return tours for a driver on specific date', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockTours });

      const result = await service.getToursByDate(1, '2026-02-01');

      expect(result).toHaveLength(1);
      expect(result[0].customer_name).toBe('Alice Smith');
      expect(result[0].stops).toHaveLength(2);
    });

    it('should return empty array when no tours scheduled', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getToursByDate(1, '2026-03-15');

      expect(result).toHaveLength(0);
    });

    it('should include all tour details', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockTours });

      const result = await service.getToursByDate(1, '2026-02-01');
      const tour = result[0];

      expect(tour).toHaveProperty('booking_id');
      expect(tour).toHaveProperty('customer_name');
      expect(tour).toHaveProperty('tour_date');
      expect(tour).toHaveProperty('pickup_time');
      expect(tour).toHaveProperty('party_size');
      expect(tour).toHaveProperty('status');
      expect(tour).toHaveProperty('pickup_location');
      expect(tour).toHaveProperty('dropoff_location');
      expect(tour).toHaveProperty('driver_notes');
      expect(tour).toHaveProperty('stops');
    });

    it('should include winery stop details', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockTours });

      const result = await service.getToursByDate(1, '2026-02-01');
      const stop = result[0].stops[0];

      expect(stop).toHaveProperty('winery_name');
      expect(stop).toHaveProperty('arrival_time');
      expect(stop).toHaveProperty('departure_time');
      expect(stop).toHaveProperty('duration_minutes');
      expect(stop).toHaveProperty('address');
    });

    it('should query with correct driver ID and date', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getToursByDate(42, '2026-05-20');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([42, '2026-05-20'])
      );
    });
  });

  describe('error handling', () => {
    it('should propagate database errors from listActive', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(service.listActive()).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors from getToursByDate', async () => {
      const dbError = new Error('Query timeout');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(service.getToursByDate(1, '2026-02-01')).rejects.toThrow('Query timeout');
    });
  });
});
