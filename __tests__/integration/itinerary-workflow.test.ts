/**
 * Integration tests for Itinerary Builder Workflow
 * Tests the complete itinerary creation and management process
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { query } from '@/lib/db';
import { resetDb } from '@/lib/__tests__/test-utils';

describe('Itinerary Builder Workflow', () => {
  let bookingId: number;
  let wineryIds: number[];

  beforeEach(async () => {
    await resetDb();

    // Create a test booking
    const bookingResult = await query(`
      INSERT INTO bookings (
        booking_number, customer_name, customer_email, tour_date, 
        party_size, tour_type, status, total_price, 
        pickup_location, dropoff_location, created_at
      ) VALUES 
      ('WWT-2025-TEST', 'Itinerary Test', 'itinerary@test.com', '2025-12-10', 
        4, 'wine_tour', 'confirmed', 800, 
        'Marcus Whitman Hotel', 'Marcus Whitman Hotel', NOW())
      RETURNING id
    `);
    bookingId = bookingResult.rows[0].id;

    // Create test wineries
    const wineryResult = await query(`
      INSERT INTO wineries (name, slug, address, city, state, tasting_fee, average_visit_duration, is_active)
      VALUES 
      ('Test Winery 1', 'test-winery-1', '123 Vineyard Rd', 'Walla Walla', 'WA', 25, 75, true),
      ('Test Winery 2', 'test-winery-2', '456 Wine St', 'Walla Walla', 'WA', 30, 75, true),
      ('Test Winery 3', 'test-winery-3', '789 Grape Ave', 'Walla Walla', 'WA', 20, 75, true)
      RETURNING id
    `);
    wineryIds = wineryResult.rows.map(row => row.id);
  });

  describe('Create Itinerary', () => {
    it('should create an itinerary for a booking', async () => {
      const itineraryData = {
        pickup_location: 'Marcus Whitman Hotel',
        pickup_time: '10:00',
        dropoff_location: 'Marcus Whitman Hotel',
        estimated_dropoff_time: '16:00',
        driver_notes: 'Client prefers red wines',
        internal_notes: 'VIP guest',
      };

      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itineraryData),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.booking_id).toBe(bookingId);
      expect(result.data.pickup_time).toBe('10:00');
    });

    it('should prevent duplicate itineraries for same booking', async () => {
      // Create first itinerary
      await fetch(`http://localhost:3000/api/itineraries/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: 'Hotel',
          pickup_time: '10:00',
          dropoff_location: 'Hotel',
          estimated_dropoff_time: '16:00',
        }),
      });

      // Attempt to create second itinerary
      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: 'Hotel',
          pickup_time: '10:00',
          dropoff_location: 'Hotel',
          estimated_dropoff_time: '16:00',
        }),
      });

      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('Add Stops to Itinerary', () => {
    let itineraryId: number;

    beforeEach(async () => {
      // Create itinerary
      const itineraryResult = await query(`
        INSERT INTO itineraries (
          booking_id, pickup_location, pickup_time, 
          dropoff_location, estimated_dropoff_time, created_at, updated_at
        ) VALUES 
        ($1, 'Marcus Whitman Hotel', '10:00', 'Marcus Whitman Hotel', '16:00', NOW(), NOW())
        RETURNING id
      `, [bookingId]);
      itineraryId = itineraryResult.rows[0].id;
    });

    it('should add stops to itinerary', async () => {
      const stops = [
        {
          winery_id: wineryIds[0],
          stop_order: 1,
          arrival_time: '10:30',
          departure_time: '11:45',
          duration_minutes: 75,
          drive_time_to_next_minutes: 15,
          reservation_confirmed: true,
          special_notes: 'First stop',
        },
        {
          winery_id: wineryIds[1],
          stop_order: 2,
          arrival_time: '12:00',
          departure_time: '13:30',
          duration_minutes: 90,
          is_lunch_stop: true,
          drive_time_to_next_minutes: 15,
          reservation_confirmed: false,
          special_notes: 'Lunch stop',
        },
        {
          winery_id: wineryIds[2],
          stop_order: 3,
          arrival_time: '13:45',
          departure_time: '15:00',
          duration_minutes: 75,
          drive_time_to_next_minutes: 0,
          reservation_confirmed: true,
          special_notes: 'Final stop',
        },
      ];

      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}/stops`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops }),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    it('should validate stop order is sequential', async () => {
      const invalidStops = [
        {
          winery_id: wineryIds[0],
          stop_order: 1,
          arrival_time: '10:30',
          departure_time: '11:45',
          duration_minutes: 75,
          drive_time_to_next_minutes: 15,
        },
        {
          winery_id: wineryIds[1],
          stop_order: 3, // Skipped 2!
          arrival_time: '12:00',
          departure_time: '13:15',
          duration_minutes: 75,
          drive_time_to_next_minutes: 15,
        },
      ];

      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}/stops`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops: invalidStops }),
      });

      const result = await response.json();

      // Should either reject or auto-fix the order
      expect([200, 400]).toContain(response.status);
    });

    it('should mark exactly one stop as lunch', async () => {
      const stops = [
        {
          winery_id: wineryIds[0],
          stop_order: 1,
          arrival_time: '10:30',
          departure_time: '11:45',
          duration_minutes: 75,
          is_lunch_stop: false,
          drive_time_to_next_minutes: 15,
        },
        {
          winery_id: wineryIds[1],
          stop_order: 2,
          arrival_time: '12:00',
          departure_time: '13:30',
          duration_minutes: 90,
          is_lunch_stop: true,
          drive_time_to_next_minutes: 15,
        },
      ];

      await fetch(`http://localhost:3000/api/itineraries/${bookingId}/stops`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops }),
      });

      // Fetch the itinerary
      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}`);
      const result = await response.json();

      const lunchStops = result.data.stops.filter((s: any) => s.is_lunch_stop);
      expect(lunchStops.length).toBe(1);
      expect(lunchStops[0].duration_minutes).toBe(90);
    });
  });

  describe('Update Itinerary', () => {
    let itineraryId: number;

    beforeEach(async () => {
      const itineraryResult = await query(`
        INSERT INTO itineraries (
          booking_id, pickup_location, pickup_time, 
          dropoff_location, estimated_dropoff_time, 
          pickup_drive_time_minutes, dropoff_drive_time_minutes,
          driver_notes, created_at, updated_at
        ) VALUES 
        ($1, 'Marcus Whitman Hotel', '10:00', 'Marcus Whitman Hotel', '16:00', 10, 10, '', NOW(), NOW())
        RETURNING id
      `, [bookingId]);
      itineraryId = itineraryResult.rows[0].id;
    });

    it('should update pickup and dropoff times', async () => {
      const updates = {
        pickup_time: '09:30',
        estimated_dropoff_time: '16:30',
      };

      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.pickup_time).toBe('09:30');
      expect(result.data.estimated_dropoff_time).toBe('16:30');
    });

    it('should update drive times', async () => {
      const updates = {
        pickup_drive_time_minutes: 20,
        dropoff_drive_time_minutes: 15,
      };

      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.pickup_drive_time_minutes).toBe(20);
      expect(result.data.dropoff_drive_time_minutes).toBe(15);
    });

    it('should update driver notes', async () => {
      const updates = {
        driver_notes: 'Guest has mobility issues, please park close',
      };

      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.driver_notes).toContain('mobility issues');
    });
  });

  describe('Retrieve Itinerary with Stops', () => {
    beforeEach(async () => {
      // Create itinerary with stops
      const itineraryResult = await query(`
        INSERT INTO itineraries (
          booking_id, pickup_location, pickup_time, 
          dropoff_location, estimated_dropoff_time, created_at, updated_at
        ) VALUES 
        ($1, 'Marcus Whitman Hotel', '10:00', 'Marcus Whitman Hotel', '16:00', NOW(), NOW())
        RETURNING id
      `, [bookingId]);
      const itineraryId = itineraryResult.rows[0].id;

      // Add stops
      await query(`
        INSERT INTO itinerary_stops (
          itinerary_id, winery_id, stop_order, arrival_time, departure_time,
          duration_minutes, drive_time_to_next_minutes, is_lunch_stop, 
          reservation_confirmed, special_notes
        ) VALUES 
        ($1, $2, 1, '10:30', '11:45', 75, 15, false, true, 'First stop'),
        ($1, $3, 2, '12:00', '13:30', 90, 15, true, true, 'Lunch stop'),
        ($1, $4, 3, '13:45', '15:00', 75, 0, false, true, 'Final stop')
      `, [itineraryId, wineryIds[0], wineryIds[1], wineryIds[2]]);
    });

    it('should retrieve itinerary with all stops and winery details', async () => {
      const response = await fetch(`http://localhost:3000/api/itineraries/${bookingId}`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.stops).toHaveLength(3);
      
      // Check first stop has winery details
      expect(result.data.stops[0].winery).toBeDefined();
      expect(result.data.stops[0].winery.name).toBe('Test Winery 1');
      
      // Check lunch stop
      const lunchStop = result.data.stops.find((s: any) => s.is_lunch_stop);
      expect(lunchStop).toBeDefined();
      expect(lunchStop.duration_minutes).toBe(90);
    });
  });
});




