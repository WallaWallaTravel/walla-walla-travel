/**
 * Bookings API Tests
 * Integration tests for /api/v1/bookings endpoints
 */

import { GET, POST } from '../route';
import { createMockRequest } from '@/lib/__tests__/test-utils';
import { createMockBooking, createMockBookingRequest } from '@/lib/__tests__/factories';

// Mock the booking service including the schema
// Note: Schema must be defined inside factory since jest.mock is hoisted
jest.mock('@/lib/services/booking-service', () => {
  const { z } = require('zod');

  return {
    bookingService: {
      findManyWithFilters: jest.fn(),
      createBooking: jest.fn(),
    },
    CreateBookingSchema: z.object({
      customerName: z.string(),
      customerEmail: z.string().email(),
      customerPhone: z.string().optional(),
      partySize: z.number().min(1).max(50),
      tourDate: z.string(),
      pickupTime: z.string().optional(),
      pickupLocation: z.string().optional(),
      dropoffLocation: z.string().optional(),
      duration: z.number().optional(),
      wineryIds: z.array(z.number()).optional(),
      lunchRestaurantId: z.number().optional(),
      specialRequests: z.string().nullable().optional(),
      brandId: z.number().optional(),
    }),
  };
});

describe('/api/v1/bookings', () => {
  let mockBookingService: any;

  beforeEach(() => {
    mockBookingService = require('@/lib/services/booking-service').bookingService;
    jest.clearAllMocks();
  });

  describe('GET /api/v1/bookings', () => {
    it('should return list of bookings', async () => {
      const mockBookings = [createMockBooking(), createMockBooking()];
      mockBookingService.findManyWithFilters.mockResolvedValue({
        bookings: mockBookings,
        total: 2,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/v1/bookings',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.meta.total).toBe(2);
    });

    it('should filter bookings by status', async () => {
      const mockBookings = [createMockBooking({ status: 'confirmed' })];
      mockBookingService.findManyWithFilters.mockResolvedValue({
        bookings: mockBookings,
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/v1/bookings',
        searchParams: { status: 'confirmed' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(mockBookingService.findManyWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' })
      );
      expect(data.data[0].status).toBe('confirmed');
    });

    it('should include relations when requested', async () => {
      mockBookingService.findManyWithFilters.mockResolvedValue({
        bookings: [createMockBooking()],
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/v1/bookings',
        searchParams: { include: 'wineries,driver' },
      });

      await GET(request);

      expect(mockBookingService.findManyWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          includeWineries: true,
          includeDriver: true,
        })
      );
    });

    it('should handle pagination', async () => {
      mockBookingService.findManyWithFilters.mockResolvedValue({
        bookings: [createMockBooking()],
        total: 100,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/v1/bookings',
        searchParams: { limit: '20', offset: '40' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(mockBookingService.findManyWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 40 })
      );
      expect(data.meta.total).toBe(100);
      expect(data.meta.limit).toBe(20);
      expect(data.meta.offset).toBe(40);
      expect(data.meta.pages).toBe(5); // 100 / 20 = 5 pages
    });

    it('should handle service errors', async () => {
      mockBookingService.findManyWithFilters.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/v1/bookings',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a new booking', async () => {
      const mockRequest = createMockBookingRequest();
      const mockBooking = createMockBooking();

      mockBookingService.createBooking.mockResolvedValue(mockBooking);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/v1/bookings',
        body: mockRequest,
      });

      const response = await POST(request);
      const data = await response.json();

      // APIResponse.success returns 200 by default
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockBooking.id);
      expect(mockBookingService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: mockRequest.customerName,
          customerEmail: mockRequest.customerEmail,
        })
      );
    });

    it('should validate required fields', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/v1/bookings',
        body: { customerName: 'Test' }, // Missing required fields
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockBookingService.createBooking.mockRejectedValue(new Error('Failed to create booking'));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/v1/bookings',
        body: createMockBookingRequest(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
