/**
 * GPT Search Wineries API Tests
 *
 * Tests for /api/gpt/search-wineries endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/gpt/search-wineries/route';

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

describe('GET /api/gpt/search-wineries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful searches', () => {
    it('should return all active wineries when no query provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Test Winery',
            slug: 'test-winery',
            description: 'A great winery',
            address: '123 Wine Lane',
            city: 'Walla Walla',
            tasting_fee: 25,
            average_visit_duration: 60,
            website: 'https://testwinery.com',
            reservation_required: false,
            specialties: ['Cabernet', 'Merlot'],
            features: ['outdoor seating'],
            is_active: true,
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/gpt/search-wineries');
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.wineries).toHaveLength(1);
      expect(data.wineries[0].name).toBe('Test Winery');
      expect(data.total).toBe(1);
    });

    it('should filter wineries by search query', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: 'Cabernet House',
            slug: 'cabernet-house',
            description: 'Best Cabernet in the valley',
            address: '456 Wine Ave',
            city: 'Walla Walla',
            tasting_fee: 30,
            average_visit_duration: 45,
            website: 'https://cabernethouse.com',
            reservation_required: true,
            specialties: ['Cabernet Sauvignon'],
            features: ['tours available'],
            is_active: true,
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/search-wineries?query=cabernet'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('cabernet');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%cabernet%'])
      );
    });

    it('should filter wineries by wine style', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            name: 'Red Wine Estate',
            slug: 'red-wine-estate',
            description: 'Premium reds',
            address: '789 Wine St',
            city: 'Walla Walla',
            tasting_fee: 35,
            average_visit_duration: 75,
            website: null,
            reservation_required: false,
            specialties: ['Syrah', 'Merlot'],
            features: [],
            is_active: true,
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/search-wineries?style=red'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should respect limit parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/search-wineries?limit=5'
      );
      await GET(request, { params: Promise.resolve({}) });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([5])
      );
    });

    it('should cap limit at 25', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/search-wineries?limit=100'
      );
      await GET(request, { params: Promise.resolve({}) });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([25])
      );
    });
  });

  describe('empty results', () => {
    it('should return friendly message when no wineries match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/search-wineries?query=nonexistent'
      );
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.wineries).toHaveLength(0);
      expect(data.message).toContain("couldn't find");
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/gpt/search-wineries');
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Unable to search');
      expect(data.wineries).toEqual([]);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/gpt/search-wineries');
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('response format', () => {
    it('should format winery data correctly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Test Winery',
            slug: 'test-winery',
            description: null,
            address: null,
            city: null,
            tasting_fee: null,
            average_visit_duration: null,
            website: null,
            reservation_required: false,
            specialties: null,
            features: null,
            is_active: true,
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/gpt/search-wineries');
      const response = await GET(request, { params: Promise.resolve({}) });
      const data = await response.json();

      // Should provide defaults for null values
      expect(data.wineries[0].description).toBeTruthy();
      expect(data.wineries[0].address).toBeTruthy();
      expect(data.wineries[0].city).toBe('Walla Walla');
      expect(data.wineries[0].average_visit_duration).toBe(60);
      expect(data.wineries[0].specialties).toEqual([]);
      expect(data.wineries[0].features).toEqual([]);
    });
  });
});
