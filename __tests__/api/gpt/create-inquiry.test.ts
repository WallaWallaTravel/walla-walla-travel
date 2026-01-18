/**
 * GPT Create Inquiry API Tests
 *
 * Tests for /api/gpt/create-inquiry endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/gpt/create-inquiry/route';

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

const validInquiry = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '509-555-1234',
  tour_date: getFutureDate(7),
  party_size: 4,
  tour_type: 'wine_tour',
  preferences: 'Looking for wineries with Cabernet',
  pickup_location: 'Downtown Hotel',
};

// Helper to create proper NextRequest with JSON body
function createJsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/gpt/create-inquiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  describe('validation', () => {
    it('should require name', async () => {
      const { name, ...incomplete } = validInquiry;
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        incomplete
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should require valid email', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        { ...validInquiry, email: 'invalid-email' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('email');
    });

    it('should require tour_date', async () => {
      const { tour_date, ...incomplete } = validInquiry;
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        incomplete
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should require party_size', async () => {
      const { party_size, ...incomplete } = validInquiry;
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        incomplete
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject party_size less than 1', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        { ...validInquiry, party_size: 0 }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject party_size greater than 14', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        { ...validInquiry, party_size: 20 }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate tour_type enum', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        { ...validInquiry, tour_type: 'invalid_type' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('date validation', () => {
    it('should reject dates in the past', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        { ...validInquiry, tour_date: '2020-01-01' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('future');
    });

    it('should require minimum 3 days lead time', async () => {
      const tomorrow = getFutureDate(1);
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        { ...validInquiry, tour_date: tomorrow }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('3 days');
    });
  });

  describe('successful inquiry creation', () => {
    it('should create inquiry with all fields', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        validInquiry
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.inquiry_id).toBeDefined();
      expect(data.inquiry_id).toMatch(/^EXP-/);
    });

    it('should return confirmation message with details', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        validInquiry
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.message).toContain('Jane Doe');
      expect(data.message).toContain('4');
      expect(data.message).toContain('Wine Tour');
    });

    it('should return expected response time', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        validInquiry
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.estimated_response_time).toBe('24 hours');
    });

    it('should return next steps', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        validInquiry
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.next_steps).toBeDefined();
      expect(Array.isArray(data.next_steps)).toBe(true);
      expect(data.next_steps.length).toBeGreaterThan(0);
    });

    it('should work with minimal required fields', async () => {
      const minimalInquiry = {
        name: 'John Smith',
        email: 'john@example.com',
        tour_date: getFutureDate(7),
        party_size: 2,
      };

      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        minimalInquiry
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should default tour_type to wine_tour', async () => {
      const { tour_type, ...withoutType } = validInquiry;
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        withoutType
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain('Wine Tour');
    });
  });

  describe('database insertion', () => {
    it('should insert into experience_requests table with correct fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ request_number: 'EXP-2026-0001' }] });

      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        validInquiry
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.inquiry_id).toBe('EXP-2026-0001');
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('experience_requests'),
        expect.any(Array)
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        validInquiry
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Unable to submit');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers', async () => {
      const request = createJsonRequest(
        'http://localhost:3000/api/gpt/create-inquiry',
        validInquiry
      );
      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
