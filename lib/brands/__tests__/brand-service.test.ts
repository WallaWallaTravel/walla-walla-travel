/**
 * Brand Service Tests
 *
 * Comprehensive unit tests for the brand service module.
 * Tests all exported functions: data fetching, brand resolution,
 * theme/contact/operating info extraction, and metric tracking.
 */

import {
  getBrandByCode,
  getBrandById,
  getDefaultBrand,
  getAllBrands,
  getPartnerBrands,
  resolveBrand,
  getBrandTheme,
  getBrandContact,
  formatBrandForBooking,
  getBrandOperatingInfo,
  trackBrandMetric,
  Brand,
} from '../brand-service';
import { createMockQueryResult } from '../../__tests__/test-utils';

// Mock the db module (relative path from __tests__ to lib/db)
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

// Mock the logger module
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helper: create a realistic mock Brand object
// ---------------------------------------------------------------------------
function createMockBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 1,
    brand_code: 'WWT',
    brand_name: 'Walla Walla Travel',
    display_name: 'Walla Walla Travel',
    legal_name: 'Walla Walla Travel LLC',
    tagline: 'Your guide to wine country',
    website_url: 'https://wallawalla.travel',
    booking_url: 'https://wallawalla.travel/book',
    email_from: 'bookings@wallawalla.travel',
    email_support: 'info@wallawalla.travel',
    phone: '+15092008000',
    phone_display: '(509) 200-8000',
    logo_url: '/images/wwt-logo.png',
    icon_url: '/images/wwt-icon.png',
    primary_color: '#8B2E3E',
    secondary_color: '#333333',
    accent_color: '#D4AF37',
    target_market: 'Wine tourists',
    description: 'Full description of Walla Walla Travel',
    meta_description: 'Meta description for SEO',
    short_description: 'Short tagline for cards',
    terms_url: 'https://wallawalla.travel/terms',
    cancellation_policy_url: 'https://wallawalla.travel/cancellation',
    active: true,
    show_on_wwt: true,
    default_brand: true,
    operating_entity: 'NW Touring & Concierge LLC',
    insurance_policy_number: 'INS-12345',
    license_number: 'LIC-67890',
    ...overrides,
  };
}

describe('Brand Service', () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getBrandByCode
  // ==========================================================================
  describe('getBrandByCode', () => {
    it('should return a brand when found', async () => {
      const brand = createMockBrand();
      mockQuery.mockResolvedValueOnce(createMockQueryResult([brand]));

      const result = await getBrandByCode('WWT');

      expect(result).toEqual(brand);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM brands WHERE LOWER(brand_code) = LOWER($1) AND active = true',
        ['WWT']
      );
    });

    it('should return null when brand is not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await getBrandByCode('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should perform a case-insensitive lookup via the SQL query', async () => {
      const brand = createMockBrand({ brand_code: 'HCWT' });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([brand]));

      const result = await getBrandByCode('hcwt');

      expect(result).toEqual(brand);
      // The SQL uses LOWER() on both sides; the code passes the code as-is
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(brand_code) = LOWER($1)'),
        ['hcwt']
      );
    });

    it('should return null and log error on database failure', async () => {
      const error = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(error);

      const result = await getBrandByCode('WWT');

      expect(result).toBeNull();
      const mockLogger = require('../../logger').logger;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Brand Service: Error getting brand by code',
        { error }
      );
    });
  });

  // ==========================================================================
  // getBrandById
  // ==========================================================================
  describe('getBrandById', () => {
    it('should return a brand when found', async () => {
      const brand = createMockBrand({ id: 42 });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([brand]));

      const result = await getBrandById(42);

      expect(result).toEqual(brand);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM brands WHERE id = $1 AND active = true',
        [42]
      );
    });

    it('should return null when brand is not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await getBrandById(999);

      expect(result).toBeNull();
    });

    it('should return null and log error on database failure', async () => {
      const error = new Error('Timeout');
      mockQuery.mockRejectedValueOnce(error);

      const result = await getBrandById(1);

      expect(result).toBeNull();
      const mockLogger = require('../../logger').logger;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Brand Service: Error getting brand by ID',
        { error, id: 1 }
      );
    });
  });

  // ==========================================================================
  // getDefaultBrand
  // ==========================================================================
  describe('getDefaultBrand', () => {
    it('should return the default brand when found', async () => {
      const brand = createMockBrand({ default_brand: true });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([brand]));

      const result = await getDefaultBrand();

      expect(result).toEqual(brand);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM brands WHERE default_brand = true AND active = true LIMIT 1'
      );
    });

    it('should return null when no default brand exists', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await getDefaultBrand();

      expect(result).toBeNull();
    });

    it('should return null and log error on database failure', async () => {
      const error = new Error('DB error');
      mockQuery.mockRejectedValueOnce(error);

      const result = await getDefaultBrand();

      expect(result).toBeNull();
      const mockLogger = require('../../logger').logger;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Brand Service: Error getting default brand',
        { error }
      );
    });
  });

  // ==========================================================================
  // getAllBrands
  // ==========================================================================
  describe('getAllBrands', () => {
    it('should return an array of brands', async () => {
      const brands = [
        createMockBrand({ id: 1, brand_code: 'WWT' }),
        createMockBrand({ id: 2, brand_code: 'HCWT', brand_name: 'Herding Cats Wine Tours' }),
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(brands));

      const result = await getAllBrands();

      expect(result).toEqual(brands);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM brands WHERE active = true ORDER BY brand_name'
      );
    });

    it('should return an empty array when no brands exist', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await getAllBrands();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return empty array and log error on database failure', async () => {
      const error = new Error('Query failed');
      mockQuery.mockRejectedValueOnce(error);

      const result = await getAllBrands();

      expect(result).toEqual([]);
      const mockLogger = require('../../logger').logger;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Brand Service: Error getting all brands',
        { error }
      );
    });
  });

  // ==========================================================================
  // getPartnerBrands
  // ==========================================================================
  describe('getPartnerBrands', () => {
    it('should return partner brands that show on WWT', async () => {
      const partners = [
        createMockBrand({ id: 2, brand_code: 'HCWT', show_on_wwt: true }),
        createMockBrand({ id: 3, brand_code: 'NWT', show_on_wwt: true }),
      ];
      mockQuery.mockResolvedValueOnce(createMockQueryResult(partners));

      const result = await getPartnerBrands();

      expect(result).toEqual(partners);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM brands WHERE show_on_wwt = true AND active = true ORDER BY brand_name'
      );
    });

    it('should return an empty array when no partner brands exist', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await getPartnerBrands();

      expect(result).toEqual([]);
    });

    it('should return empty array and log error on database failure', async () => {
      const error = new Error('Connection lost');
      mockQuery.mockRejectedValueOnce(error);

      const result = await getPartnerBrands();

      expect(result).toEqual([]);
      const mockLogger = require('../../logger').logger;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Brand Service: Error getting partner brands',
        { error }
      );
    });
  });

  // ==========================================================================
  // resolveBrand
  // ==========================================================================
  describe('resolveBrand', () => {
    it('should return the matching brand when a valid code is provided', async () => {
      const brand = createMockBrand({ brand_code: 'HCWT' });
      // getBrandByCode query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([brand]));

      const result = await resolveBrand('HCWT');

      expect(result).toEqual(brand);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should fall back to default brand when code is invalid', async () => {
      const defaultBrand = createMockBrand({ default_brand: true });
      // getBrandByCode returns empty
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // getDefaultBrand returns the default
      mockQuery.mockResolvedValueOnce(createMockQueryResult([defaultBrand]));

      const result = await resolveBrand('INVALID');

      expect(result).toEqual(defaultBrand);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return default brand when no code is provided', async () => {
      const defaultBrand = createMockBrand({ default_brand: true });
      // getDefaultBrand query
      mockQuery.mockResolvedValueOnce(createMockQueryResult([defaultBrand]));

      const result = await resolveBrand();

      expect(result).toEqual(defaultBrand);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should return default brand when code is null', async () => {
      const defaultBrand = createMockBrand({ default_brand: true });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([defaultBrand]));

      const result = await resolveBrand(null);

      expect(result).toEqual(defaultBrand);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should return default brand when code is empty string', async () => {
      const defaultBrand = createMockBrand({ default_brand: true });
      // empty string is falsy, so skips getBrandByCode, goes straight to getDefaultBrand
      mockQuery.mockResolvedValueOnce(createMockQueryResult([defaultBrand]));

      const result = await resolveBrand('');

      expect(result).toEqual(defaultBrand);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should throw when no brands exist at all', async () => {
      // getBrandByCode returns empty
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // getDefaultBrand returns empty
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(resolveBrand('ANYTHING')).rejects.toThrow(
        'No brands configured in system'
      );
    });

    it('should throw when no code given and no default brand exists', async () => {
      // getDefaultBrand returns empty
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(resolveBrand()).rejects.toThrow(
        'No brands configured in system'
      );
    });

    it('should fall back to default when getBrandByCode errors', async () => {
      const defaultBrand = createMockBrand({ default_brand: true });
      // getBrandByCode throws (caught internally, returns null)
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      // getDefaultBrand succeeds
      mockQuery.mockResolvedValueOnce(createMockQueryResult([defaultBrand]));

      const result = await resolveBrand('WWT');

      expect(result).toEqual(defaultBrand);
    });
  });

  // ==========================================================================
  // getBrandTheme
  // ==========================================================================
  describe('getBrandTheme', () => {
    it('should return brand theme values when all are set', () => {
      const brand = createMockBrand({
        primary_color: '#FF0000',
        secondary_color: '#00FF00',
        accent_color: '#0000FF',
        logo_url: '/logos/custom.png',
        icon_url: '/icons/custom.png',
      });

      const theme = getBrandTheme(brand);

      expect(theme).toEqual({
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        accentColor: '#0000FF',
        logo: '/logos/custom.png',
        icon: '/icons/custom.png',
      });
    });

    it('should return default values when brand fields are null', () => {
      const brand = createMockBrand({
        primary_color: null,
        secondary_color: null,
        accent_color: null,
        logo_url: null,
        icon_url: null,
      });

      const theme = getBrandTheme(brand);

      expect(theme).toEqual({
        primaryColor: '#8B2E3E',
        secondaryColor: '#666666',
        accentColor: '#D4AF37',
        logo: '/images/logo-placeholder.png',
        icon: '/images/icon-placeholder.png',
      });
    });

    it('should mix defaults and brand values when partially set', () => {
      const brand = createMockBrand({
        primary_color: '#ABC123',
        secondary_color: null,
        accent_color: '#DEF456',
        logo_url: '/logos/partial.png',
        icon_url: null,
      });

      const theme = getBrandTheme(brand);

      expect(theme.primaryColor).toBe('#ABC123');
      expect(theme.secondaryColor).toBe('#666666');
      expect(theme.accentColor).toBe('#DEF456');
      expect(theme.logo).toBe('/logos/partial.png');
      expect(theme.icon).toBe('/images/icon-placeholder.png');
    });
  });

  // ==========================================================================
  // getBrandContact
  // ==========================================================================
  describe('getBrandContact', () => {
    it('should return brand contact values when all are set', () => {
      const brand = createMockBrand({
        email_support: 'support@custom.com',
        email_from: 'noreply@custom.com',
        phone: '+15551234567',
        phone_display: '(555) 123-4567',
        website_url: 'https://custom.com',
      });

      const contact = getBrandContact(brand);

      expect(contact).toEqual({
        email: 'support@custom.com',
        emailFrom: 'noreply@custom.com',
        phone: '+15551234567',
        phoneDisplay: '(555) 123-4567',
        website: 'https://custom.com',
      });
    });

    it('should return default values when brand fields are null', () => {
      const brand = createMockBrand({
        email_support: null,
        email_from: null,
        phone: null,
        phone_display: null,
        website_url: null,
      });

      const contact = getBrandContact(brand);

      expect(contact).toEqual({
        email: 'info@wallawalla.travel',
        emailFrom: 'info@wallawalla.travel',
        phone: '+15092008000',
        phoneDisplay: '(509) 200-8000',
        website: 'https://wallawalla.travel',
      });
    });

    it('should mix defaults and brand values when partially set', () => {
      const brand = createMockBrand({
        email_support: 'custom@example.com',
        email_from: null,
        phone: null,
        phone_display: '(555) 999-0000',
        website_url: 'https://example.com',
      });

      const contact = getBrandContact(brand);

      expect(contact.email).toBe('custom@example.com');
      expect(contact.emailFrom).toBe('info@wallawalla.travel');
      expect(contact.phone).toBe('+15092008000');
      expect(contact.phoneDisplay).toBe('(555) 999-0000');
      expect(contact.website).toBe('https://example.com');
    });
  });

  // ==========================================================================
  // formatBrandForBooking
  // ==========================================================================
  describe('formatBrandForBooking', () => {
    it('should return the correct shape with code, name, tagline, description, theme, and contact', () => {
      const brand = createMockBrand({
        brand_code: 'HCWT',
        display_name: 'Herding Cats Wine Tours',
        tagline: 'Like herding cats, but with wine',
        short_description: 'A fun wine tour brand',
        primary_color: '#AA0000',
        email_support: 'cats@hcwt.com',
      });

      const formatted = formatBrandForBooking(brand);

      expect(formatted.code).toBe('HCWT');
      expect(formatted.name).toBe('Herding Cats Wine Tours');
      expect(formatted.tagline).toBe('Like herding cats, but with wine');
      expect(formatted.description).toBe('A fun wine tour brand');
      expect(formatted.theme).toBeDefined();
      expect(formatted.theme.primaryColor).toBe('#AA0000');
      expect(formatted.contact).toBeDefined();
      expect(formatted.contact.email).toBe('cats@hcwt.com');
    });

    it('should include theme defaults for null brand colors', () => {
      const brand = createMockBrand({
        primary_color: null,
        secondary_color: null,
        accent_color: null,
        logo_url: null,
        icon_url: null,
      });

      const formatted = formatBrandForBooking(brand);

      expect(formatted.theme.primaryColor).toBe('#8B2E3E');
      expect(formatted.theme.secondaryColor).toBe('#666666');
      expect(formatted.theme.accentColor).toBe('#D4AF37');
    });

    it('should include contact defaults for null brand contact fields', () => {
      const brand = createMockBrand({
        email_support: null,
        email_from: null,
        phone: null,
        phone_display: null,
        website_url: null,
      });

      const formatted = formatBrandForBooking(brand);

      expect(formatted.contact.email).toBe('info@wallawalla.travel');
      expect(formatted.contact.phone).toBe('+15092008000');
    });

    it('should handle null tagline and short_description', () => {
      const brand = createMockBrand({
        tagline: null,
        short_description: null,
      });

      const formatted = formatBrandForBooking(brand);

      expect(formatted.tagline).toBeNull();
      expect(formatted.description).toBeNull();
    });
  });

  // ==========================================================================
  // getBrandOperatingInfo
  // ==========================================================================
  describe('getBrandOperatingInfo', () => {
    it('should return brand operating values when all are set', () => {
      const brand = createMockBrand({
        legal_name: 'Custom Legal Name LLC',
        operating_entity: 'Custom Entity Inc',
        license_number: 'LIC-999',
        insurance_policy_number: 'INS-888',
      });

      const info = getBrandOperatingInfo(brand);

      expect(info).toEqual({
        legalName: 'Custom Legal Name LLC',
        operatingEntity: 'Custom Entity Inc',
        licenseNumber: 'LIC-999',
        insurancePolicyNumber: 'INS-888',
      });
    });

    it('should fall back to brand_name when legal_name is null', () => {
      const brand = createMockBrand({
        legal_name: null,
        brand_name: 'My Brand Name',
      });

      const info = getBrandOperatingInfo(brand);

      expect(info.legalName).toBe('My Brand Name');
    });

    it('should fall back to default operating entity when operating_entity is null', () => {
      const brand = createMockBrand({
        operating_entity: null,
      });

      const info = getBrandOperatingInfo(brand);

      expect(info.operatingEntity).toBe('NW Touring & Concierge LLC');
    });

    it('should return null license and insurance when not set', () => {
      const brand = createMockBrand({
        license_number: null,
        insurance_policy_number: null,
      });

      const info = getBrandOperatingInfo(brand);

      expect(info.licenseNumber).toBeNull();
      expect(info.insurancePolicyNumber).toBeNull();
    });

    it('should return all defaults when all optional fields are null', () => {
      const brand = createMockBrand({
        legal_name: null,
        brand_name: 'Fallback Brand',
        operating_entity: null,
        license_number: null,
        insurance_policy_number: null,
      });

      const info = getBrandOperatingInfo(brand);

      expect(info).toEqual({
        legalName: 'Fallback Brand',
        operatingEntity: 'NW Touring & Concierge LLC',
        licenseNumber: null,
        insurancePolicyNumber: null,
      });
    });
  });

  // ==========================================================================
  // trackBrandMetric
  // ==========================================================================
  describe('trackBrandMetric', () => {
    it('should insert or upsert a metric for website_visit', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await trackBrandMetric(1, 'website_visit');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO brand_metrics');
      expect(sql).toContain('website_visit');
      expect(sql).toContain('ON CONFLICT');
      expect(params[0]).toBe(1); // brandId
      // params[1] is the date string (today)
      expect(params[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(params[2]).toBe(1); // default value
    });

    it('should pass custom value when provided', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await trackBrandMetric(5, 'booking_created', 3);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('booking_created');
      expect(params[0]).toBe(5);
      expect(params[2]).toBe(3);
    });

    it('should track reservation_created metric type', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await trackBrandMetric(2, 'reservation_created');

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('reservation_created');
    });

    it('should track booking_page_visit metric type', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await trackBrandMetric(3, 'booking_page_visit', 10);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('booking_page_visit');
      expect(params[2]).toBe(10);
    });

    it('should handle errors silently without throwing', async () => {
      const error = new Error('Insert failed');
      mockQuery.mockRejectedValueOnce(error);

      // This should NOT throw
      await expect(trackBrandMetric(1, 'website_visit')).resolves.toBeUndefined();

      const mockLogger = require('../../logger').logger;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Brand Service: Error tracking metric',
        { error, brandId: 1, metricType: 'website_visit' }
      );
    });

    it('should use today date in ISO format (YYYY-MM-DD)', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await trackBrandMetric(1, 'website_visit');

      const today = new Date().toISOString().split('T')[0];
      const [, params] = mockQuery.mock.calls[0];
      expect(params[1]).toBe(today);
    });
  });
});
