/**
 * GPT Check Availability API Tests
 *
 * Tests for /api/gpt/check-availability endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/gpt/check-availability/route';

// Mock the database
jest.mock('@/lib/db-helpers', () => ({
  query: jest.fn(),
}));

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockQuery = require('@/lib/db-helpers').query as jest.Mock;

// Helper to get a future date string
function getFutureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

describe('GET /api/gpt/check-availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should require date parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/check-availability?party_size=4'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('date');
    });

    it('should require party_size parameter', async () => {
      const futureDate = getFutureDate(7);
      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('party size');
    });

    it('should reject dates in the past', async () => {
      const pastDate = '2020-01-01';
      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${pastDate}&party_size=4`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('past');
    });

    it('should reject party size below 1', async () => {
      const futureDate = getFutureDate(7);
      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=0`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('1 and 14');
    });

    it('should reject party size above 14', async () => {
      const futureDate = getFutureDate(7);
      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=20`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('1 and 14');
    });
  });

  describe('availability check', () => {
    it('should return available with tour options when capacity exists', async () => {
      const futureDate = getFutureDate(7);
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing bookings

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=4`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.available).toBe(true);
      expect(data.tour_options).toHaveLength(3); // Three default tour types
      expect(data.tour_options[0]).toHaveProperty('tour_type');
      expect(data.tour_options[0]).toHaveProperty('price_per_person');
      expect(data.tour_options[0]).toHaveProperty('total_price');
    });

    it('should calculate total price based on party size', async () => {
      const futureDate = getFutureDate(7);
      const partySize = 6;
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=${partySize}`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.tour_options[0].total_price).toBe(
        data.tour_options[0].price_per_person * partySize
      );
    });

    it('should return unavailable when capacity is exceeded', async () => {
      const futureDate = getFutureDate(7);
      // Mock existing bookings that fill capacity
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, tour_date: futureDate, party_size: 40 }],
        })
        .mockResolvedValueOnce({ rows: [{ party_size: 0 }] }); // Next day check

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=10`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.available).toBe(false);
      expect(data.tour_options).toHaveLength(0);
      expect(data.message).toContain('fully booked');
    });

    it('should suggest next available date when requested date is unavailable', async () => {
      const futureDate = getFutureDate(7);
      // Mock full capacity for requested date, available next day
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, tour_date: futureDate, party_size: 42 }],
        })
        .mockResolvedValueOnce({ rows: [{ party_size: 0 }] });

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=4`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.available).toBe(false);
      expect(data.next_available_date).toBeTruthy();
      expect(data.message).toContain('next available date');
    });
  });

  describe('response format', () => {
    it('should include all expected fields', async () => {
      const futureDate = getFutureDate(7);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=4`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('party_size');
      expect(data).toHaveProperty('available');
      expect(data).toHaveProperty('tour_options');
    });

    it('should format tour options with includes and times', async () => {
      const futureDate = getFutureDate(7);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=2`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      const tourOption = data.tour_options[0];
      expect(tourOption).toHaveProperty('includes');
      expect(tourOption).toHaveProperty('available_times');
      expect(Array.isArray(tourOption.includes)).toBe(true);
      expect(Array.isArray(tourOption.available_times)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const futureDate = getFutureDate(7);
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=4`
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Unable to check availability');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers', async () => {
      const futureDate = getFutureDate(7);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        `http://localhost:3000/api/gpt/check-availability?date=${futureDate}&party_size=4`
      );
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
