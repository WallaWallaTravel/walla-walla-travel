/**
 * Tests for Workflow Management API endpoints
 */

import { POST as postClock } from '@/app/api/workflow/clock/route';
import { GET as getDaily } from '@/app/api/workflow/daily/route';
import { POST as postBreaks } from '@/app/api/workflow/breaks/route';
import { GET as getSchedule } from '@/app/api/workflow/schedule/route';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import { getServerSession } from '@/lib/auth';

// Mock the auth module
jest.mock('@/lib/auth');

// Mock the database module
jest.mock('@/lib/db');

describe('Workflow Management APIs', () => {
  const mockSession = {
    email: 'driver@test.com',
    userId: '1',
    name: 'Test Driver',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('POST /api/workflow/clock', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/workflow/clock', {
        method: 'POST',
        body: JSON.stringify({ action: 'clock_in' }),
      });

      const response = await postClock(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should clock in successfully', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check for existing clock in
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            driver_id: 1,
            clock_in_time: new Date().toISOString(),
            status: 'on_duty',
          }],
          rowCount: 1 
        }); // Insert new time card

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/clock', {
        method: 'POST',
        body: JSON.stringify({
          action: 'clock_in',
          location: {
            latitude: 46.0654,
            longitude: -118.3430,
          },
          vehicleId: 1,
          startMileage: 50000,
        }),
      });

      const response = await postClock(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('clock_in_time');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should prevent double clock in', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ 
        rows: [{
          id: 1,
          clock_in_time: new Date().toISOString(),
          clock_out_time: null,
        }],
        rowCount: 1 
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/clock', {
        method: 'POST',
        body: JSON.stringify({ action: 'clock_in' }),
      });

      const response = await postClock(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Already clocked in');
    });

    it('should clock out successfully', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            clock_in_time: '2024-10-14T08:00:00Z',
            clock_out_time: null,
          }],
          rowCount: 1 
        }) // Find active time card
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            clock_in_time: '2024-10-14T08:00:00Z',
            clock_out_time: '2024-10-14T17:00:00Z',
            total_hours: 9,
            status: 'completed',
          }],
          rowCount: 1 
        }); // Update time card

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/clock', {
        method: 'POST',
        body: JSON.stringify({
          action: 'clock_out',
          location: {
            latitude: 46.0654,
            longitude: -118.3430,
          },
          endMileage: 50100,
          signature: 'Test Driver',
        }),
      });

      const response = await postClock(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('clock_out_time');
      expect(data.data).toHaveProperty('total_hours');
    });

    it('should validate required fields for clock out', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflow/clock', {
        method: 'POST',
        body: JSON.stringify({
          action: 'clock_out',
          // Missing signature
        }),
      });

      const response = await postClock(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('signature');
    });
  });

  describe('GET /api/workflow/daily', () => {
    it('should get today\'s workflow status', async () => {
      const mockTimeCard = {
        id: 1,
        driver_id: 1,
        clock_in_time: '2024-10-14T08:00:00Z',
        clock_out_time: null,
        status: 'on_duty',
        total_breaks: 2,
        total_break_time: 30,
      };

      const mockQuery = jest.fn().mockResolvedValue({
        rows: [mockTimeCard],
        rowCount: 1,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/daily');
      const response = await getDaily(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.timeCard).toEqual(mockTimeCard);
      expect(data.data.status).toBe('on_duty');
    });

    it('should return not started status when no time card exists', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/daily');
      const response = await getDaily(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('not_started');
      expect(data.data.timeCard).toBeNull();
    });

    it('should include hours of service compliance data', async () => {
      const mockTimeCard = {
        id: 1,
        clock_in_time: '2024-10-14T08:00:00Z',
        clock_out_time: null,
        status: 'on_duty',
      };

      const mockHOS = {
        daily_driving: 8.5,
        daily_on_duty: 10,
        weekly_hours: 55,
        consecutive_days: 5,
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [mockTimeCard], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockHOS], rowCount: 1 });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/daily');
      const response = await getDaily(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.hos).toBeDefined();
      expect(data.data.hos.daily_driving).toBe(8.5);
      expect(data.data.hos.weekly_hours).toBe(55);
    });
  });

  describe('POST /api/workflow/breaks', () => {
    it('should start a break', async () => {
      // First check for active time card
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            clock_in_time: '2024-10-14T08:00:00Z',
            clock_out_time: null,
          }],
          rowCount: 1,
        })
        // Check for active break
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        // Insert break record
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            time_card_id: 1,
            break_start: new Date().toISOString(),
            break_type: 'rest',
          }],
          rowCount: 1,
        });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/breaks', {
        method: 'POST',
        body: JSON.stringify({
          action: 'start',
          type: 'rest',
        }),
      });

      const response = await postBreaks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('break_start');
      expect(data.data.break_type).toBe('rest');
    });

    it('should end a break', async () => {
      const mockQuery = jest.fn()
        // Find active break
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            time_card_id: 1,
            break_start: '2024-10-14T12:00:00Z',
            break_end: null,
          }],
          rowCount: 1,
        })
        // Update break record
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            break_start: '2024-10-14T12:00:00Z',
            break_end: '2024-10-14T12:30:00Z',
            duration_minutes: 30,
          }],
          rowCount: 1,
        });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/breaks', {
        method: 'POST',
        body: JSON.stringify({
          action: 'end',
        }),
      });

      const response = await postBreaks(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('break_end');
      expect(data.data.duration_minutes).toBe(30);
    });

    it('should prevent starting break without active time card', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/breaks', {
        method: 'POST',
        body: JSON.stringify({
          action: 'start',
          type: 'rest',
        }),
      });

      const response = await postBreaks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Not clocked in');
    });

    it('should prevent double break start', async () => {
      const mockQuery = jest.fn()
        // Active time card exists
        .mockResolvedValueOnce({
          rows: [{ id: 1, clock_in_time: '2024-10-14T08:00:00Z' }],
          rowCount: 1,
        })
        // Active break already exists
        .mockResolvedValueOnce({
          rows: [{ id: 1, break_start: '2024-10-14T12:00:00Z', break_end: null }],
          rowCount: 1,
        });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/breaks', {
        method: 'POST',
        body: JSON.stringify({
          action: 'start',
          type: 'rest',
        }),
      });

      const response = await postBreaks(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Already on break');
    });
  });

  describe('GET /api/workflow/schedule', () => {
    it('should get driver\'s schedule', async () => {
      const mockSchedule = [
        {
          id: 1,
          date: '2024-10-14',
          start_time: '08:00',
          end_time: '17:00',
          route_name: 'Wine Tour - Walla Walla Valley',
          vehicle_number: 'Sprinter 1',
          passenger_count: 8,
        },
        {
          id: 2,
          date: '2024-10-15',
          start_time: '09:00',
          end_time: '18:00',
          route_name: 'Downtown Tasting Tour',
          vehicle_number: 'Sprinter 2',
          passenger_count: 12,
        },
      ];

      const mockQuery = jest.fn().mockResolvedValue({
        rows: mockSchedule,
        rowCount: 2,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/schedule?days=7');
      const response = await getSchedule(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty('route_name');
      expect(data.data[0]).toHaveProperty('vehicle_number');
    });

    it('should filter schedule by date range', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest(
        'http://localhost:3000/api/workflow/schedule?startDate=2024-10-14&endDate=2024-10-20'
      );
      const response = await getSchedule(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('schedule_date BETWEEN'),
        expect.arrayContaining(['1', '2024-10-14', '2024-10-20'])
      );
    });

    it('should default to 7 days ahead if no range specified', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (db.query as jest.Mock) = mockQuery;

      const request = new NextRequest('http://localhost:3000/api/workflow/schedule');
      const response = await getSchedule(request);

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('schedule_date BETWEEN'),
        expect.arrayContaining(['1', expect.any(String), expect.any(String)])
      );
    });
  });
});