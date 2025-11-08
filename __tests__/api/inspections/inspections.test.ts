/**
 * Tests for Inspection API endpoints
 */

import { GET as getPreTrip, POST as postPreTrip } from '@/app/api/inspections/pre-trip/route';
import { GET as getPostTrip, POST as postPostTrip } from '@/app/api/inspections/post-trip/route';
import { POST as postDVIR, GET as getDVIR } from '@/app/api/inspections/dvir/route';
import { GET as getHistory } from '@/app/api/inspections/history/route';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import { getServerSession } from '@/lib/auth';

// Mock the auth module
jest.mock('@/lib/auth');

// Mock the database module
jest.mock('@/lib/db');

describe('Inspection APIs', () => {
  const mockSession = {
    email: 'driver@test.com',
    userId: '1',
    name: 'Test Driver',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('POST /api/inspections/pre-trip', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/inspections/pre-trip', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await postPreTrip(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/inspections/pre-trip', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: 1,
          // Missing required inspection data
        }),
      });

      const response = await postPreTrip(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should create pre-trip inspection successfully', async () => {
      const mockInspection = {
        id: 1,
        driver_id: 1,
        vehicle_id: 1,
        type: 'pre_trip',
        created_at: new Date().toISOString(),
      };

      (db.createInspection as jest.Mock).mockResolvedValue(mockInspection);

      const request = new NextRequest('http://localhost:3000/api/inspections/pre-trip', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: 1,
          startMileage: 50000,
          inspectionData: {
            exterior: { lights: true, tires: true, body: true },
            interior: { seats: true, seatbelts: true, mirrors: true },
            engine: { fluids: true, belts: true, battery: true },
          },
        }),
      });

      const response = await postPreTrip(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(db.createInspection).toHaveBeenCalled();
    });
  });

  describe('GET /api/inspections/pre-trip', () => {
    it('should get today\'s pre-trip inspection', async () => {
      const mockInspections = [{
        id: 1,
        driver_id: 1,
        vehicle_id: 1,
        type: 'pre_trip',
        created_at: new Date().toISOString(),
        vehicle_number: 'Sprinter 1',
      }];

      const mockQuery = jest.fn().mockResolvedValue({
        rows: mockInspections,
        rowCount: 1,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/inspections/pre-trip');
      const response = await getPreTrip(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockInspections[0]);
    });
  });

  describe('POST /api/inspections/post-trip', () => {
    it('should create post-trip inspection with DVIR', async () => {
      const mockInspection = {
        id: 2,
        driver_id: 1,
        vehicle_id: 1,
        type: 'post_trip',
        end_mileage: 50100,
        created_at: new Date().toISOString(),
      };

      (db.createInspection as jest.Mock).mockResolvedValue(mockInspection);

      const request = new NextRequest('http://localhost:3000/api/inspections/post-trip', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: 1,
          endMileage: 50100,
          inspectionData: {
            exterior: { lights: true, tires: true, body: true },
            interior: { seats: true, seatbelts: true, mirrors: true },
            engine: { fluids: true, belts: true, battery: true },
            defects: [],
          },
        }),
      });

      const response = await postPostTrip(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
    });
  });

  describe('GET /api/inspections/history', () => {
    it('should get inspection history for driver', async () => {
      const mockHistory = [
        {
          id: 1,
          type: 'pre_trip',
          vehicle_number: 'Sprinter 1',
          created_at: '2024-10-14T08:00:00Z',
        },
        {
          id: 2,
          type: 'post_trip',
          vehicle_number: 'Sprinter 1',
          created_at: '2024-10-14T17:00:00Z',
        },
      ];

      (db.getInspectionsByDriver as jest.Mock).mockResolvedValue(mockHistory);

      const request = new NextRequest('http://localhost:3000/api/inspections/history?limit=10');
      const response = await getHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(db.getInspectionsByDriver).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('POST /api/inspections/dvir', () => {
    it('should generate DVIR report', async () => {
      const mockDVIR = {
        id: 'dvir-123',
        driver_id: 1,
        vehicle_id: 1,
        date: new Date().toISOString().split('T')[0],
        pre_trip_inspection_id: 1,
        post_trip_inspection_id: 2,
        defects_found: false,
        signature: 'Test Driver',
        created_at: new Date().toISOString(),
      };

      const mockQuery = jest.fn().mockResolvedValue({
        rows: [mockDVIR],
        rowCount: 1,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/inspections/dvir', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: 1,
          date: new Date().toISOString().split('T')[0],
          preTripInspectionId: 1,
          postTripInspectionId: 2,
          defects: [],
          signature: 'Test Driver',
        }),
      });

      const response = await postDVIR(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
    });
  });
});