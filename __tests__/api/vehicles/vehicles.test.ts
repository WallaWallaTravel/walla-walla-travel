/**
 * Tests for Vehicle API endpoints
 */

import { GET as getVehicles } from '@/app/api/vehicles/route';
import { GET as getVehicleById } from '@/app/api/vehicles/[id]/route';
import { GET as getAssignedVehicle } from '@/app/api/vehicles/assigned/route';
import { PUT as updateOdometer } from '@/app/api/vehicles/[id]/odometer/route';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import { getServerSession } from '@/lib/auth';

// Mock the auth module
jest.mock('@/lib/auth');

// Mock the database module
jest.mock('@/lib/db');

describe('Vehicle APIs', () => {
  const mockSession = {
    email: 'driver@test.com',
    userId: '1',
    name: 'Test Driver',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/vehicles', () => {
    it('should return list of all vehicles with availability status', async () => {
      const mockVehicles = [
        {
          id: 1,
          vehicle_number: 'Sprinter 1',
          make: 'Mercedes-Benz',
          model: 'Sprinter',
          year: 2022,
          capacity: 11,
          current_mileage: 25000,
          is_active: true,
          is_available: true,
          assigned_driver: null,
          last_inspection: '2024-10-14',
        },
        {
          id: 2,
          vehicle_number: 'Sprinter 2',
          make: 'Mercedes-Benz',
          model: 'Sprinter',
          year: 2023,
          capacity: 14,
          current_mileage: 15000,
          is_active: true,
          is_available: false,
          assigned_driver: 'John Doe',
          last_inspection: '2024-10-13',
        },
        {
          id: 3,
          vehicle_number: 'Sprinter 3',
          make: 'Mercedes-Benz',
          model: 'Sprinter',
          year: 2023,
          capacity: 14,
          current_mileage: 12000,
          is_active: true,
          is_available: true,
          assigned_driver: null,
          last_inspection: '2024-10-12',
        },
      ];

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: 3 }], rowCount: 1 }) // count query
        .mockResolvedValueOnce({ rows: mockVehicles, rowCount: 3 }); // vehicles query

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles?page=1&limit=10');
      const response = await getVehicles(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.vehicles).toHaveLength(3);
      expect(data.data.pagination.total).toBe(3);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should support pagination parameters', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: 10 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles?page=2&limit=5');
      const response = await getVehicles(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([5, 5]) // limit 5, offset 5
      );
    });

    it('should filter by availability status', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles?available=true');
      const response = await getVehicles(request);

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_available = $'),
        expect.arrayContaining([true])
      );
    });

    it('should filter by active status', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles?active=true');
      const response = await getVehicles(request);

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $'),
        expect.arrayContaining([true])
      );
    });
  });

  describe('GET /api/vehicles/:id', () => {
    it('should return vehicle details by ID', async () => {
      const mockVehicle = {
        id: 1,
        vehicle_number: 'Sprinter 1',
        make: 'Mercedes-Benz',
        model: 'Sprinter',
        year: 2022,
        vin: '1HGBH41JXMN109186',
        license_plate: 'WA-ABC123',
        capacity: 11,
        current_mileage: 25000,
        is_active: true,
        is_available: true,
        last_service_date: '2024-09-15',
        next_service_due: 30000,
        insurance_expiry: '2025-06-01',
        registration_expiry: '2025-03-15',
        created_at: '2024-01-01',
        updated_at: '2024-10-14',
      };

      const mockMaintenanceHistory = [
        {
          id: 1,
          service_date: '2024-09-15',
          service_type: 'Oil Change',
          mileage: 24500,
          cost: 150.00,
        },
      ];

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [mockVehicle], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockMaintenanceHistory, rowCount: 1 });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles/1');
      const response = await getVehicleById(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.vehicle).toEqual(mockVehicle);
      expect(data.data.maintenance_history).toEqual(mockMaintenanceHistory);
    });

    it('should return 404 for non-existent vehicle', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles/999');
      const response = await getVehicleById(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should validate vehicle ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/vehicles/invalid');
      const response = await getVehicleById(request, { params: { id: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid vehicle ID');
    });
  });

  describe('GET /api/vehicles/assigned', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/vehicles/assigned');
      const response = await getAssignedVehicle(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return driver\'s assigned vehicle', async () => {
      const mockAssignedVehicle = {
        id: 2,
        vehicle_number: 'Sprinter 2',
        make: 'Mercedes-Benz',
        model: 'Sprinter',
        year: 2023,
        capacity: 14,
        current_mileage: 15000,
        fuel_level: 75,
        is_available: false,
        assignment_start: '2024-10-14T08:00:00Z',
      };

      const mockQuery = jest.fn().mockResolvedValue({
        rows: [mockAssignedVehicle],
        rowCount: 1,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles/assigned');
      const response = await getAssignedVehicle(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAssignedVehicle);
    });

    it('should return null if no vehicle assigned', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles/assigned');
      const response = await getAssignedVehicle(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeNull();
      expect(data.message).toContain('No vehicle assigned');
    });
  });

  describe('PUT /api/vehicles/:id/odometer', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/vehicles/1/odometer', {
        method: 'PUT',
        body: JSON.stringify({ mileage: 25100 }),
      });

      const response = await updateOdometer(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should update vehicle odometer reading', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, current_mileage: 25000 }], 
          rowCount: 1 
        }) // Check vehicle exists
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, current_mileage: 25100 }], 
          rowCount: 1 
        }) // Update mileage
        .mockResolvedValueOnce({ 
          rows: [], 
          rowCount: 1 
        }); // Log mileage history

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles/1/odometer', {
        method: 'PUT',
        body: JSON.stringify({ 
          mileage: 25100,
          notes: 'End of day reading'
        }),
      });

      const response = await updateOdometer(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.current_mileage).toBe(25100);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should reject odometer rollback', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{ id: 1, current_mileage: 25000 }],
        rowCount: 1,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles/1/odometer', {
        method: 'PUT',
        body: JSON.stringify({ mileage: 24900 }),
      });

      const response = await updateOdometer(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('cannot be less than current');
    });

    it('should validate mileage format', async () => {
      const request = new NextRequest('http://localhost:3000/api/vehicles/1/odometer', {
        method: 'PUT',
        body: JSON.stringify({ mileage: 'invalid' }),
      });

      const response = await updateOdometer(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid mileage');
    });

    it('should check service requirements after update', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            current_mileage: 29800,
            next_service_due: 30000 
          }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, current_mileage: 30100 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/vehicles/1/odometer', {
        method: 'PUT',
        body: JSON.stringify({ mileage: 30100 }),
      });

      const response = await updateOdometer(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.service_required).toBe(true);
      expect(data.message).toContain('Service is due');
    });
  });
});