/**
 * GPT OpenAPI Specification API Tests
 *
 * Tests for /api/gpt/openapi endpoint
 */

import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '@/app/api/gpt/openapi/route';

// Helper to call wrapped GET handler with required arguments
function callGET() {
  const request = new NextRequest('http://localhost:3000/api/gpt/openapi');
  const context = { params: Promise.resolve({}) };
  return GET(request, context);
}

describe('GET /api/gpt/openapi', () => {
  describe('OpenAPI spec structure', () => {
    it('should return valid OpenAPI 3.0 spec', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.openapi).toBe('3.1.0');
    });

    it('should include API info', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.info).toBeDefined();
      expect(data.info.title).toBeTruthy();
      expect(data.info.description).toBeTruthy();
      expect(data.info.version).toBeTruthy();
      expect(data.info.contact).toBeDefined();
    });

    it('should include server URL', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.servers).toBeDefined();
      expect(Array.isArray(data.servers)).toBe(true);
      expect(data.servers[0].url).toContain('wallawalla.travel');
    });
  });

  describe('paths definition', () => {
    it('should define /search-wineries endpoint', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/search-wineries']).toBeDefined();
      expect(data.paths['/search-wineries'].get).toBeDefined();
      expect(data.paths['/search-wineries'].get.operationId).toBe('searchWineries');
    });

    it('should define /check-availability endpoint', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/check-availability']).toBeDefined();
      expect(data.paths['/check-availability'].get).toBeDefined();
      expect(data.paths['/check-availability'].get.operationId).toBe('checkAvailability');
    });

    it('should define /get-recommendations endpoint', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/get-recommendations']).toBeDefined();
      expect(data.paths['/get-recommendations'].post).toBeDefined();
      expect(data.paths['/get-recommendations'].post.operationId).toBe('getRecommendations');
    });

    it('should define /booking-status endpoint', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/booking-status']).toBeDefined();
      expect(data.paths['/booking-status'].get).toBeDefined();
      expect(data.paths['/booking-status'].get.operationId).toBe('getBookingStatus');
    });

    it('should define /create-inquiry endpoint', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/create-inquiry']).toBeDefined();
      expect(data.paths['/create-inquiry'].post).toBeDefined();
      expect(data.paths['/create-inquiry'].post.operationId).toBe('createInquiry');
    });
  });

  describe('parameters', () => {
    it('should define parameters for search-wineries', async () => {
      const response = await callGET();
      const data = await response.json();

      const params = data.paths['/search-wineries'].get.parameters;
      expect(params).toBeDefined();

      const queryParam = params.find((p: { name: string }) => p.name === 'query');
      const styleParam = params.find((p: { name: string }) => p.name === 'style');
      const limitParam = params.find((p: { name: string }) => p.name === 'limit');

      expect(queryParam).toBeDefined();
      expect(styleParam).toBeDefined();
      expect(limitParam).toBeDefined();
    });

    it('should define required parameters for check-availability', async () => {
      const response = await callGET();
      const data = await response.json();

      const params = data.paths['/check-availability'].get.parameters;
      const dateParam = params.find((p: { name: string }) => p.name === 'date');
      const partySizeParam = params.find((p: { name: string }) => p.name === 'party_size');

      expect(dateParam.required).toBe(true);
      expect(partySizeParam.required).toBe(true);
    });

    it('should define requestBody for get-recommendations', async () => {
      const response = await callGET();
      const data = await response.json();

      const endpoint = data.paths['/get-recommendations'].post;
      expect(endpoint.requestBody).toBeDefined();
      expect(endpoint.requestBody.required).toBe(true);
      expect(endpoint.requestBody.content['application/json']).toBeDefined();
    });

    it('should define required fields for create-inquiry', async () => {
      const response = await callGET();
      const data = await response.json();

      const schema = data.paths['/create-inquiry'].post.requestBody.content['application/json'].schema;
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('email');
      expect(schema.required).toContain('tour_date');
      expect(schema.required).toContain('party_size');
    });
  });

  describe('responses', () => {
    it('should define 200 response for search-wineries', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/search-wineries'].get.responses['200']).toBeDefined();
    });

    it('should define 404 response for booking-status', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/booking-status'].get.responses['404']).toBeDefined();
    });

    it('should define 201 response for create-inquiry', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.paths['/create-inquiry'].post.responses['201']).toBeDefined();
    });
  });

  describe('components', () => {
    it('should define Winery schema', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.components.schemas.Winery).toBeDefined();
      expect(data.components.schemas.Winery.properties).toBeDefined();
      expect(data.components.schemas.Winery.properties.id).toBeDefined();
      expect(data.components.schemas.Winery.properties.name).toBeDefined();
    });

    it('should define TourOption schema', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.components.schemas.TourOption).toBeDefined();
      expect(data.components.schemas.TourOption.properties.tour_type).toBeDefined();
      expect(data.components.schemas.TourOption.properties.price_per_person).toBeDefined();
    });

    it('should define WineryRecommendation schema', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.components.schemas.WineryRecommendation).toBeDefined();
      expect(data.components.schemas.WineryRecommendation.properties.match_score).toBeDefined();
    });

    it('should define BookingStatus schema', async () => {
      const response = await callGET();
      const data = await response.json();

      expect(data.components.schemas.BookingStatus).toBeDefined();
      expect(data.components.schemas.BookingStatus.properties.booking_number).toBeDefined();
      expect(data.components.schemas.BookingStatus.properties.status).toBeDefined();
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await callGET();

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('OPTIONS request', () => {
    it('should respond to OPTIONS with CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('content type', () => {
    it('should return application/json content type', async () => {
      const response = await callGET();

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});
