/**
 * Unit Tests for LodgingService
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

jest.mock('@/lib/db/transaction', () => ({
  withTransaction: jest.fn((cb: any) => cb(require('@/lib/db').query)),
}));

const mockQuery = require('@/lib/db').query as jest.Mock;

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logDbError: jest.fn(),
  logDebug: jest.fn(),
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

import {
  lodgingService,
  CreateLodgingSchema,
  UpdateLodgingSchema,
  propertyTypeSchema,
} from '@/lib/services/lodging.service';

// ============================================================================
// Helpers
// ============================================================================

function makeSummaryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Test Hotel',
    slug: 'test-hotel',
    property_type: 'hotel',
    city: 'Walla Walla',
    short_description: 'A lovely hotel',
    amenities: ['wifi', 'pool'],
    bedrooms: 2,
    max_guests: 4,
    price_range_min: 100,
    price_range_max: 250,
    cover_image_url: 'https://example.com/img.jpg',
    pet_policy: 'pets_allowed',
    is_verified: true,
    is_featured: false,
    ...overrides,
  };
}

function makeDetailRow(overrides: Record<string, unknown> = {}) {
  return {
    ...makeSummaryRow(),
    address: '123 Main St',
    state: 'WA',
    zip_code: '99362',
    latitude: 46.065,
    longitude: -118.33,
    description: 'Full description here',
    property_features: ['parking', 'ev_charging'],
    bathrooms: 2,
    min_stay_nights: 1,
    booking_url: 'https://booking.example.com',
    booking_platform: 'direct',
    affiliate_code: null,
    phone: '509-555-0100',
    email: 'info@testhotel.com',
    website: 'https://testhotel.com',
    images: ['https://example.com/img1.jpg'],
    check_in_time: '15:00',
    check_out_time: '11:00',
    cancellation_policy: 'Free cancellation within 48h',
    verified_by: 1,
    verified_at: new Date('2025-06-01'),
    is_active: true,
    hotel_partner_id: null,
    brand_id: 1,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('LodgingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  // ==========================================================================
  // getAll
  // ==========================================================================

  describe('getAll', () => {
    it('should return active properties with summary columns', async () => {
      const rows = [makeSummaryRow(), makeSummaryRow({ id: 2, name: 'Second Place' })];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 2 });

      const result = await lodgingService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Hotel');
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('lodging_properties');
      expect(sql).toContain('is_active');
    });

    it('should filter by property type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getAll({ propertyType: 'hotel' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('property_type = $1');
      expect(params).toContain('hotel');
    });

    it('should filter by search term', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getAll({ search: 'cozy' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('ILIKE');
      expect(params).toContain('%cozy%');
    });

    it('should filter by price range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getAll({ minPrice: 50, maxPrice: 200 });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('price_range_min >= $1');
      expect(sql).toContain('price_range_max <= $2');
      expect(params).toEqual([50, 200]);
    });

    it('should filter by bedrooms', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getAll({ bedrooms: 3 });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('bedrooms >= $1');
      expect(params).toContain(3);
    });

    it('should apply limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getAll({ limit: 10, offset: 20 });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('LIMIT $1');
      expect(sql).toContain('OFFSET $2');
      expect(params).toEqual([10, 20]);
    });
  });

  // ==========================================================================
  // getBySlug
  // ==========================================================================

  describe('getBySlug', () => {
    it('should return property by slug', async () => {
      const row = makeDetailRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await lodgingService.getBySlug('test-hotel');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-hotel');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('slug = $1');
      expect(params).toEqual(['test-hotel']);
    });

    it('should return null for non-existent slug', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await lodgingService.getBySlug('does-not-exist');

      expect(result).toBeNull();
    });

    it('should only return active properties', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getBySlug('test-hotel');

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('is_active');
    });
  });

  // ==========================================================================
  // getById
  // ==========================================================================

  describe('getById', () => {
    it('should return property by id', async () => {
      const row = makeDetailRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await lodgingService.getById(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('id = $1');
      expect(params).toEqual([1]);
    });

    it('should return null for non-existent id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await lodgingService.getById(9999);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getFeatured
  // ==========================================================================

  describe('getFeatured', () => {
    it('should return featured active properties', async () => {
      const rows = [makeSummaryRow({ is_featured: true })];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 });

      const result = await lodgingService.getFeatured();

      expect(result).toHaveLength(1);
      expect(result[0].is_featured).toBe(true);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('is_featured');
      expect(sql).toContain('is_active');
    });

    it('should respect limit parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getFeatured(3);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('LIMIT $1');
      expect(params).toEqual([3]);
    });

    it('should default to limit of 6', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await lodgingService.getFeatured();

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([6]);
    });
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    it('should create a new property with all fields', async () => {
      const newProp = makeDetailRow({ id: 10, name: 'New Hotel' });
      mockQuery.mockResolvedValueOnce({ rows: [newProp], rowCount: 1 });

      const input = CreateLodgingSchema.parse({
        name: 'New Hotel',
        slug: 'new-hotel',
        property_type: 'hotel',
        address: '456 Elm St',
        city: 'Walla Walla',
        state: 'WA',
        description: 'A new place',
        amenities: ['wifi'],
        property_features: ['parking'],
        bedrooms: 3,
        bathrooms: 2,
        max_guests: 6,
        min_stay_nights: 1,
        price_range_min: 150,
        price_range_max: 300,
        images: [],
      });

      const result = await lodgingService.create(input);

      expect(result.name).toBe('New Hotel');
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('INSERT INTO lodging_properties');
      expect(sql).toContain('RETURNING');
    });

    it('should use default values for city and state', async () => {
      const newProp = makeDetailRow();
      mockQuery.mockResolvedValueOnce({ rows: [newProp], rowCount: 1 });

      const input = CreateLodgingSchema.parse({
        name: 'Default City Hotel',
        slug: 'default-city-hotel',
        property_type: 'str',
      });

      expect(input.city).toBe('Walla Walla');
      expect(input.state).toBe('WA');

      await lodgingService.create(input);

      const params = mockQuery.mock.calls[0][1] as unknown[];
      // city is at index 4, state at index 5 in the INSERT params
      expect(params[4]).toBe('Walla Walla');
      expect(params[5]).toBe('WA');
    });
  });

  // ==========================================================================
  // updateProperty
  // ==========================================================================

  describe('updateProperty', () => {
    it('should update specified fields', async () => {
      const updated = makeDetailRow({ name: 'Updated Hotel' });
      mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

      const result = await lodgingService.updateProperty(1, { name: 'Updated Hotel' });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Hotel');
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE lodging_properties');
      expect(sql).toContain('name = $1');
    });

    it('should return null for non-existent property', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await lodgingService.updateProperty(9999, { name: 'Ghost' });

      expect(result).toBeNull();
    });

    it('should return unchanged property when no fields provided', async () => {
      const existing = makeDetailRow();
      // When no fields, updateProperty calls getById internally
      mockQuery.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      const result = await lodgingService.updateProperty(1, {});

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      // Should have called getById (SELECT), not UPDATE
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('SELECT');
      expect(sql).not.toContain('UPDATE');
    });
  });

  // ==========================================================================
  // verify
  // ==========================================================================

  describe('verify', () => {
    it('should mark property as verified with user id', async () => {
      const verified = makeDetailRow({ is_verified: true, verified_by: 42 });
      mockQuery.mockResolvedValueOnce({ rows: [verified], rowCount: 1 });

      const result = await lodgingService.verify(1, 42);

      expect(result).not.toBeNull();
      expect(result!.is_verified).toBe(true);
      expect(result!.verified_by).toBe(42);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('is_verified = true');
      expect(sql).toContain('verified_by = $2');
      expect(params).toEqual([1, 42]);
    });
  });

  // ==========================================================================
  // deactivate
  // ==========================================================================

  describe('deactivate', () => {
    it('should soft delete by setting is_active to false', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await lodgingService.deactivate(1);

      expect(result).toBe(true);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('is_active = false');
      expect(params).toEqual([1]);
    });

    it('should return false for non-existent property', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await lodgingService.deactivate(9999);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // getCount
  // ==========================================================================

  describe('getCount', () => {
    it('should return count of active properties', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '42' }], rowCount: 1 });

      const result = await lodgingService.getCount();

      expect(result).toBe(42);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('is_active');
    });

    it('should filter by property type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

      const result = await lodgingService.getCount({ propertyType: 'str' });

      expect(result).toBe(5);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('property_type = $1');
      expect(params).toEqual(['str']);
    });
  });

  // ==========================================================================
  // getAllSlugs
  // ==========================================================================

  describe('getAllSlugs', () => {
    it('should return array of slugs', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ slug: 'hotel-a' }, { slug: 'hotel-b' }, { slug: 'hotel-c' }],
        rowCount: 3,
      });

      const result = await lodgingService.getAllSlugs();

      expect(result).toEqual(['hotel-a', 'hotel-b', 'hotel-c']);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('SELECT slug');
      expect(sql).toContain('is_active');
    });
  });

  // ==========================================================================
  // getAvailability
  // ==========================================================================

  describe('getAvailability', () => {
    it('should return availability entries within date range', async () => {
      const rows = [
        { id: 1, property_id: 10, date: '2025-07-01', status: 'available', nightly_rate: 150, min_stay: 2, notes: null },
        { id: 2, property_id: 10, date: '2025-07-02', status: 'booked', nightly_rate: 150, min_stay: 2, notes: null },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 2 });

      const result = await lodgingService.getAvailability(10, '2025-07-01', '2025-07-02');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('available');
      expect(result[1].status).toBe('booked');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('property_id = $1');
      expect(sql).toContain('date >= $2');
      expect(sql).toContain('date <= $3');
      expect(params).toEqual([10, '2025-07-01', '2025-07-02']);
    });
  });

  // ==========================================================================
  // setAvailability
  // ==========================================================================

  describe('setAvailability', () => {
    it('should upsert availability entries', async () => {
      const entry1 = { id: 1, property_id: 10, date: '2025-07-01', status: 'available', nightly_rate: 150, min_stay: 2, notes: null };
      const entry2 = { id: 2, property_id: 10, date: '2025-07-02', status: 'booked', nightly_rate: 175, min_stay: 1, notes: 'sold out' };

      mockQuery
        .mockResolvedValueOnce({ rows: [entry1], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [entry2], rowCount: 1 });

      const result = await lodgingService.setAvailability(10, [
        { date: '2025-07-01', status: 'available', nightly_rate: 150, min_stay: 2 },
        { date: '2025-07-02', status: 'booked', nightly_rate: 175, min_stay: 1, notes: 'sold out' },
      ]);

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('INSERT INTO lodging_availability');
      expect(sql).toContain('ON CONFLICT');
    });
  });
});

// ============================================================================
// Zod Schema Validation Tests
// ============================================================================

describe('Zod Schemas', () => {
  describe('propertyTypeSchema', () => {
    it('should accept all valid property types', () => {
      const validTypes = ['hotel', 'str', 'bnb', 'vacation_rental', 'boutique_hotel', 'resort'];
      for (const type of validTypes) {
        expect(() => propertyTypeSchema.parse(type)).not.toThrow();
      }
    });

    it('should reject invalid property type', () => {
      expect(() => propertyTypeSchema.parse('castle')).toThrow();
      expect(() => propertyTypeSchema.parse('')).toThrow();
    });
  });

  describe('CreateLodgingSchema', () => {
    const minValid = {
      name: 'Test Property',
      slug: 'test-property',
      property_type: 'hotel',
    };

    it('should validate a minimal valid property', () => {
      const result = CreateLodgingSchema.parse(minValid);
      expect(result.name).toBe('Test Property');
      expect(result.slug).toBe('test-property');
      expect(result.property_type).toBe('hotel');
    });

    it('should apply default values', () => {
      const result = CreateLodgingSchema.parse(minValid);
      expect(result.city).toBe('Walla Walla');
      expect(result.state).toBe('WA');
      expect(result.amenities).toEqual([]);
      expect(result.property_features).toEqual([]);
      expect(result.images).toEqual([]);
      expect(result.min_stay_nights).toBe(1);
    });

    it('should reject missing name', () => {
      expect(() =>
        CreateLodgingSchema.parse({ slug: 'test', property_type: 'hotel' })
      ).toThrow();
    });

    it('should reject missing slug', () => {
      expect(() =>
        CreateLodgingSchema.parse({ name: 'Test', property_type: 'hotel' })
      ).toThrow();
    });

    it('should reject invalid property_type', () => {
      expect(() =>
        CreateLodgingSchema.parse({ name: 'Test', slug: 'test', property_type: 'mansion' })
      ).toThrow();
    });

    it('should accept all valid property types', () => {
      const types = ['hotel', 'str', 'bnb', 'vacation_rental', 'boutique_hotel', 'resort'];
      for (const type of types) {
        expect(() =>
          CreateLodgingSchema.parse({ name: 'X', slug: 'x', property_type: type })
        ).not.toThrow();
      }
    });

    it('should reject invalid email format', () => {
      expect(() =>
        CreateLodgingSchema.parse({ ...minValid, email: 'not-an-email' })
      ).toThrow();
    });

    it('should reject invalid booking_url format', () => {
      expect(() =>
        CreateLodgingSchema.parse({ ...minValid, booking_url: 'not-a-url' })
      ).toThrow();
    });

    it('should reject negative price_range_min', () => {
      expect(() =>
        CreateLodgingSchema.parse({ ...minValid, price_range_min: -10 })
      ).toThrow();
    });

    it('should reject non-positive bedrooms', () => {
      expect(() =>
        CreateLodgingSchema.parse({ ...minValid, bedrooms: 0 })
      ).toThrow();
      expect(() =>
        CreateLodgingSchema.parse({ ...minValid, bedrooms: -1 })
      ).toThrow();
    });

    it('should reject short_description over 500 chars', () => {
      expect(() =>
        CreateLodgingSchema.parse({ ...minValid, short_description: 'x'.repeat(501) })
      ).toThrow();
    });
  });

  describe('UpdateLodgingSchema', () => {
    it('should allow partial updates (all fields optional)', () => {
      const result = UpdateLodgingSchema.parse({ name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(result.slug).toBeUndefined();
    });

    it('should accept empty object (defaults from base schema still apply)', () => {
      const result = UpdateLodgingSchema.parse({});
      // Because UpdateLodgingSchema is CreateLodgingSchema.partial(), fields
      // with .default() in the base schema still produce values even when empty.
      expect(result.city).toBe('Walla Walla');
      expect(result.state).toBe('WA');
      expect(result.amenities).toEqual([]);
      expect(result.images).toEqual([]);
      expect(result.name).toBeUndefined();
      expect(result.slug).toBeUndefined();
    });

    it('should still validate field types on provided fields', () => {
      expect(() =>
        UpdateLodgingSchema.parse({ property_type: 'invalid_type' })
      ).toThrow();
    });
  });
});
