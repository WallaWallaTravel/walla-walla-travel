/**
 * Integration tests for v1 Bookings API
 * Tests the complete booking workflow end-to-end
 *
 * These tests require:
 * - A running Next.js server (npm run dev)
 * - A test database (TEST_DATABASE_URL environment variable)
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { shouldSkipIntegrationTests } from '@/lib/__tests__/test-utils';

// Skip all tests if no test database is configured
const describeIntegration = shouldSkipIntegrationTests() ? describe.skip : describe;

// Lazy import database to avoid connection at module load
let query: typeof import('@/lib/db').query;

describeIntegration('API v1 /bookings', () => {
  beforeAll(async () => {
    // Dynamically import to avoid connection issues during test discovery
    const db = await import('@/lib/db');
    query = db.query;
  });

  beforeEach(async () => {
    // resetDb is now a no-op without explicit pool
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a new booking with valid data', async () => {
      const bookingData = {
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '509-555-1234',
        tour_date: '2025-12-01',
        party_size: 4,
        tour_type: 'wine_tour',
        pickup_location: 'Marcus Whitman Hotel',
        dropoff_location: 'Marcus Whitman Hotel',
        start_time: '10:00',
        duration_hours: 6,
        wine_tour_preference: 'private',
        special_requests: 'Vegetarian lunch options',
        base_price: 600,
        total_price: 600,
        deposit_amount: 200,
      };

      const response = await fetch('http://localhost:3000/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        party_size: 4,
        tour_type: 'wine_tour',
      });
      expect(result.data.booking_number).toMatch(/^WWT-\d{4}-\d{5}$/);
    });

    it('should reject booking with invalid email', async () => {
      const invalidData = {
        customer_name: 'Jane Doe',
        customer_email: 'not-an-email',
        tour_date: '2025-12-01',
        party_size: 2,
      };

      const response = await fetch('http://localhost:3000/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject booking with party size over 14', async () => {
      const invalidData = {
        customer_name: 'Large Group',
        customer_email: 'group@example.com',
        tour_date: '2025-12-01',
        party_size: 20,
      };

      const response = await fetch('http://localhost:3000/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should handle multi-day tour bookings', async () => {
      const multiDayData = {
        customer_name: 'Weekend Group',
        customer_email: 'weekend@example.com',
        tour_duration_type: 'multi',
        tour_start_date: '2025-12-05',
        tour_end_date: '2025-12-07',
        party_size: 6,
        tour_type: 'wine_tour',
        pickup_location: 'Inn at Abeja',
        total_price: 2400,
      };

      const response = await fetch('http://localhost:3000/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(multiDayData),
      });

      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.data.tour_duration_type).toBe('multi');
      expect(result.data.tour_start_date).toBe('2025-12-05');
      expect(result.data.tour_end_date).toBe('2025-12-07');
    });
  });

  describe('GET /api/v1/bookings', () => {
    beforeEach(async () => {
      // Create test bookings
      await query(`
        INSERT INTO bookings (
          booking_number, customer_name, customer_email, tour_date, 
          party_size, tour_type, status, total_price, created_at
        ) VALUES 
        ('WWT-2025-00001', 'Test User 1', 'user1@test.com', '2025-12-01', 4, 'wine_tour', 'confirmed', 600, NOW()),
        ('WWT-2025-00002', 'Test User 2', 'user2@test.com', '2025-12-02', 6, 'wine_tour', 'pending', 900, NOW()),
        ('WWT-2025-00003', 'Test User 3', 'user3@test.com', '2025-12-03', 2, 'corporate', 'confirmed', 1200, NOW())
      `);
    });

    it('should list all bookings', async () => {
      const response = await fetch('http://localhost:3000/api/v1/bookings');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter bookings by status', async () => {
      const response = await fetch('http://localhost:3000/api/v1/bookings?status=confirmed');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.every((b: any) => b.status === 'confirmed')).toBe(true);
    });

    it('should filter bookings by tour_type', async () => {
      const response = await fetch('http://localhost:3000/api/v1/bookings?tour_type=corporate');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data[0].tour_type).toBe('corporate');
    });

    it('should paginate results', async () => {
      const response = await fetch('http://localhost:3000/api/v1/bookings?limit=2&offset=0');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination).toMatchObject({
        limit: 2,
        offset: 0,
      });
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    let bookingId: number;

    beforeEach(async () => {
      const result = await query(`
        INSERT INTO bookings (
          booking_number, customer_name, customer_email, tour_date, 
          party_size, tour_type, status, total_price, created_at
        ) VALUES 
        ('WWT-2025-99999', 'Detail Test', 'detail@test.com', '2025-12-15', 4, 'wine_tour', 'confirmed', 800, NOW())
        RETURNING id
      `);
      bookingId = result.rows[0].id;
    });

    it('should retrieve booking by ID', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/bookings/${bookingId}`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(bookingId);
      expect(result.data.customer_name).toBe('Detail Test');
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/bookings/99999999`);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
    });
  });

  describe('PUT /api/v1/bookings/:id', () => {
    let bookingId: number;

    beforeEach(async () => {
      const result = await query(`
        INSERT INTO bookings (
          booking_number, customer_name, customer_email, tour_date, 
          party_size, tour_type, status, total_price, created_at
        ) VALUES 
        ('WWT-2025-88888', 'Update Test', 'update@test.com', '2025-12-20', 4, 'wine_tour', 'pending', 600, NOW())
        RETURNING id
      `);
      bookingId = result.rows[0].id;
    });

    it('should update booking status', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('confirmed');
    });

    it('should update multiple fields', async () => {
      const updates = {
        party_size: 6,
        total_price: 900,
        special_requests: 'Add extra winery stop',
      };

      const response = await fetch(`http://localhost:3000/api/v1/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.party_size).toBe(6);
      expect(result.data.total_price).toBe(900);
    });
  });

  afterEach(async () => {
    // Cleanup is handled by resetDb
  });
});
