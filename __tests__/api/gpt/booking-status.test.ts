/**
 * GPT Booking Status API Tests
 *
 * Tests for /api/gpt/booking-status endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/gpt/booking-status/route';

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

const mockBooking = {
  id: 1,
  booking_number: 'WWT-2024-001234',
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_phone: '509-555-1234',
  tour_date: '2024-06-15',
  pickup_time: '10:00 AM',
  party_size: 4,
  pickup_location: 'Downtown Hotel',
  status: 'confirmed',
  total_price: 500,
  amount_paid: 250,
  driver_name: 'Mike Smith',
  driver_phone: '509-555-5678',
  tour_type: 'wine_tour',
  special_requests: 'Birthday celebration',
};

const mockItineraryStops = [
  { winery_name: 'Test Winery 1', stop_order: 1, arrival_time: '10:30 AM' },
  { winery_name: 'Test Winery 2', stop_order: 2, arrival_time: '12:00 PM' },
];

describe('GET /api/gpt/booking-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should require either booking_number or email', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('booking number');
      expect(data.message).toContain('email');
    });
  });

  describe('lookup by booking number', () => {
    it('should find booking by booking number', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: mockItineraryStops });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.booking).toBeDefined();
      expect(data.booking.booking_number).toBe('WWT-2024-001234');
    });

    it('should be case-insensitive for booking number', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=wwt-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Query should use UPPER() for comparison
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPPER'),
        expect.any(Array)
      );
    });

    it('should return 404 for non-existent booking number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=INVALID-123'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain("couldn't find");
    });
  });

  describe('lookup by email', () => {
    it('should find most recent booking by email', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: mockItineraryStops });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?email=john@example.com'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.booking).toBeDefined();
    });

    it('should be case-insensitive for email', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?email=JOHN@EXAMPLE.COM'
      );
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER'),
        expect.any(Array)
      );
    });

    it('should return 404 for non-existent email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?email=nobody@example.com'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('status-specific messages', () => {
    it('should generate appropriate message for confirmed booking', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockBooking, status: 'confirmed' }] })
        .mockResolvedValueOnce({ rows: mockItineraryStops });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.message).toContain('confirmed');
      expect(data.booking.status).toBe('confirmed');
    });

    it('should generate appropriate message for pending booking', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockBooking, status: 'pending' }] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.message).toContain('pending');
    });

    it('should generate appropriate message for completed booking', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockBooking, status: 'completed' }] })
        .mockResolvedValueOnce({ rows: mockItineraryStops });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.message).toContain('completed');
      expect(data.message).toContain('Thank you');
    });

    it('should generate appropriate message for cancelled booking', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockBooking, status: 'cancelled' }] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.message).toContain('cancelled');
    });
  });

  describe('response format', () => {
    it('should include itinerary winery names', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: mockItineraryStops });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.booking.wineries).toContain('Test Winery 1');
      expect(data.booking.wineries).toContain('Test Winery 2');
    });

    it('should calculate balance due', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.booking.total_paid).toBe(250);
      expect(data.booking.balance_due).toBe(250); // 500 - 250
    });

    it('should include driver info when available', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.message).toContain('Mike Smith');
      expect(data.booking.driver_name).toBe('Mike Smith');
    });

    it('should include pickup info in message when confirmed', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            ...mockBooking,
            status: 'confirmed',
            pickup_location: 'Hotel Lobby',
            pickup_time: '10:00 AM',
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.message).toContain('10:00 AM');
      expect(data.message).toContain('Hotel Lobby');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Unable to look up');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockBooking] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/booking-status?booking_number=WWT-2024-001234'
      );
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
