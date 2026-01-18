/**
 * GPT Get Recommendations API Tests
 *
 * Tests for /api/gpt/get-recommendations endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/gpt/get-recommendations/route';

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

const mockWineries = [
  {
    id: 1,
    name: 'Cabernet House',
    slug: 'cabernet-house',
    description: 'Best Cabernet in the valley with a modern tasting room',
    address: '123 Wine Lane',
    city: 'Walla Walla',
    tasting_fee: 25,
    average_visit_duration: 60,
    website: 'https://cabernethouse.com',
    reservation_required: false,
    specialties: ['Cabernet Sauvignon', 'Merlot'],
    features: ['outdoor seating', 'private tastings'],
  },
  {
    id: 2,
    name: 'Syrah Valley',
    slug: 'syrah-valley',
    description: 'A rustic boutique winery with vineyard views',
    address: '456 Wine Ave',
    city: 'Walla Walla',
    tasting_fee: 30,
    average_visit_duration: 45,
    website: 'https://syrahvalley.com',
    reservation_required: true,
    specialties: ['Syrah', 'Viognier'],
    features: ['tours available', 'food pairing'],
  },
  {
    id: 3,
    name: 'Riesling Gardens',
    slug: 'riesling-gardens',
    description: 'Family-owned estate specializing in white wines',
    address: '789 Wine St',
    city: 'Walla Walla',
    tasting_fee: 20,
    average_visit_duration: 50,
    website: null,
    reservation_required: false,
    specialties: ['Riesling', 'Chardonnay', 'Sauvignon Blanc'],
    features: ['picnic area', 'dog friendly'],
  },
];

describe('POST /api/gpt/get-recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: mockWineries });
  });

  describe('basic recommendations', () => {
    it('should return recommendations without preferences', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recommendations).toBeDefined();
      expect(data.recommendations.length).toBeGreaterThan(0);
      expect(data.suggested_itinerary).toBeDefined();
    });

    it('should include match score and reasons', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 2,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      const recommendation = data.recommendations[0];
      expect(recommendation).toHaveProperty('match_score');
      expect(recommendation).toHaveProperty('match_reasons');
      expect(Array.isArray(recommendation.match_reasons)).toBe(true);
    });
  });

  describe('preference matching', () => {
    it('should prioritize wineries matching wine style preferences', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            preferences: {
              wine_styles: ['Cabernet'],
            },
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      // Cabernet House should rank higher due to matching specialty
      const cabernetRec = data.recommendations.find(
        (r: { winery: { name: string } }) => r.winery.name === 'Cabernet House'
      );
      expect(cabernetRec).toBeDefined();
      expect(cabernetRec.match_reasons.some((r: string) => r.includes('Cabernet'))).toBe(true);
    });

    it('should match feature preferences', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            preferences: {
              features: ['dog friendly'],
            },
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      // Riesling Gardens has dog friendly feature
      const dogFriendlyRec = data.recommendations.find((r: { winery: { name: string; features: string[] } }) =>
        r.winery.features.includes('dog friendly')
      );
      expect(dogFriendlyRec).toBeDefined();
    });

    it('should match atmosphere preferences', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            preferences: {
              atmosphere: 'rustic',
            },
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      // Syrah Valley has rustic in description
      const rusticRec = data.recommendations.find(
        (r: { match_reasons: string[] }) => r.match_reasons.some((reason: string) =>
          reason.toLowerCase().includes('rustic')
        )
      );
      expect(rusticRec).toBeDefined();
    });

    it('should match price range preferences', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            preferences: {
              price_range: 'budget',
            },
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('itinerary generation', () => {
    it('should generate suggested itinerary with correct number of stops', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
            number_of_stops: 3,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.suggested_itinerary).toBeDefined();
      expect(data.suggested_itinerary.stops).toHaveLength(3);
    });

    it('should cap number of stops at 5', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
            number_of_stops: 10,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.suggested_itinerary.stops.length).toBeLessThanOrEqual(5);
    });

    it('should enforce minimum of 2 stops', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
            number_of_stops: 1,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.suggested_itinerary.stops.length).toBeGreaterThanOrEqual(2);
    });

    it('should include timing information in itinerary', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      const stop = data.suggested_itinerary.stops[0];
      expect(stop).toHaveProperty('order');
      expect(stop).toHaveProperty('winery_name');
      expect(stop).toHaveProperty('arrival_time');
      expect(stop).toHaveProperty('duration_minutes');
    });

    it('should calculate estimated cost per person', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.suggested_itinerary.estimated_cost_per_person).toBeGreaterThan(0);
    });

    it('should calculate total duration', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.suggested_itinerary.total_duration_hours).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Unable to generate recommendations');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/gpt/get-recommendations',
        {
          method: 'POST',
          body: JSON.stringify({
            party_size: 4,
          }),
        }
      );
      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
