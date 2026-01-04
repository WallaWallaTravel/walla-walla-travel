/**
 * Brand Service
 * Manages multi-brand portfolio: WWT, Herding Cats, NW Touring
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface Brand {
  id: number;
  brand_code: string;
  brand_name: string;
  display_name: string;
  legal_name: string | null;
  tagline: string | null;
  website_url: string | null;
  booking_url: string | null;
  email_from: string | null;
  email_support: string | null;
  phone: string | null;
  phone_display: string | null;
  logo_url: string | null;
  icon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  target_market: string | null;
  description: string | null;
  meta_description: string | null;
  short_description: string | null;
  terms_url: string | null;
  cancellation_policy_url: string | null;
  active: boolean;
  show_on_wwt: boolean;
  default_brand: boolean;
  operating_entity: string | null;
  insurance_policy_number: string | null;
  license_number: string | null;
}

/**
 * Get brand by code
 */
export async function getBrandByCode(code: string): Promise<Brand | null> {
  try {
    const result = await query(
      'SELECT * FROM brands WHERE brand_code = $1 AND active = true',
      [code.toUpperCase()]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Brand Service: Error getting brand by code', { error });
    return null;
  }
}

/**
 * Get brand by ID
 */
export async function getBrandById(id: number): Promise<Brand | null> {
  try {
    const result = await query(
      'SELECT * FROM brands WHERE id = $1 AND active = true',
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Brand Service: Error getting brand by ID', { error, id });
    return null;
  }
}

/**
 * Get default brand (Walla Walla Travel)
 */
export async function getDefaultBrand(): Promise<Brand | null> {
  try {
    const result = await query(
      'SELECT * FROM brands WHERE default_brand = true AND active = true LIMIT 1'
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Brand Service: Error getting default brand', { error });
    return null;
  }
}

/**
 * Get all active brands
 */
export async function getAllBrands(): Promise<Brand[]> {
  try {
    const result = await query(
      'SELECT * FROM brands WHERE active = true ORDER BY brand_name'
    );

    return result.rows;
  } catch (error) {
    logger.error('Brand Service: Error getting all brands', { error });
    return [];
  }
}

/**
 * Get partner brands (to show on WWT site)
 */
export async function getPartnerBrands(): Promise<Brand[]> {
  try {
    const result = await query(
      'SELECT * FROM brands WHERE show_on_wwt = true AND active = true ORDER BY brand_name'
    );

    return result.rows;
  } catch (error) {
    logger.error('Brand Service: Error getting partner brands', { error });
    return [];
  }
}

/**
 * Resolve brand from code or default
 * Used when accepting ?brand=HCWT from URL
 */
export async function resolveBrand(brandCode?: string | null): Promise<Brand> {
  // If brand code provided, try to get it
  if (brandCode) {
    const brand = await getBrandByCode(brandCode);
    if (brand) {
      return brand;
    }
  }
  
  // Fall back to default brand
  const defaultBrand = await getDefaultBrand();
  if (defaultBrand) {
    return defaultBrand;
  }
  
  // Ultimate fallback (shouldn't happen if DB is seeded)
  throw new Error('No brands configured in system');
}

/**
 * Get brand branding/theming
 */
export function getBrandTheme(brand: Brand) {
  return {
    primaryColor: brand.primary_color || '#8B2E3E',
    secondaryColor: brand.secondary_color || '#666666',
    accentColor: brand.accent_color || '#D4AF37',
    logo: brand.logo_url || '/images/logo-placeholder.png',
    icon: brand.icon_url || '/images/icon-placeholder.png'
  };
}

/**
 * Get brand contact info
 */
export function getBrandContact(brand: Brand) {
  return {
    email: brand.email_support || 'info@wallawalla.travel',
    emailFrom: brand.email_from || 'info@wallawalla.travel',
    phone: brand.phone || '+15092008000',
    phoneDisplay: brand.phone_display || '(509) 200-8000',
    website: brand.website_url || 'https://wallawalla.travel'
  };
}

/**
 * Format brand for display in booking flow
 */
export function formatBrandForBooking(brand: Brand) {
  return {
    code: brand.brand_code,
    name: brand.display_name,
    tagline: brand.tagline,
    description: brand.short_description,
    theme: getBrandTheme(brand),
    contact: getBrandContact(brand)
  };
}

/**
 * Get brand operating info (for Terms, legal, etc.)
 */
export function getBrandOperatingInfo(brand: Brand) {
  return {
    legalName: brand.legal_name || brand.brand_name,
    operatingEntity: brand.operating_entity || 'NW Touring & Concierge LLC',
    licenseNumber: brand.license_number,
    insurancePolicyNumber: brand.insurance_policy_number
  };
}

/**
 * Track brand metrics
 */
export async function trackBrandMetric(
  brandId: number,
  metricType: 'website_visit' | 'booking_page_visit' | 'reservation_created' | 'booking_created',
  value: number = 1
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await query(`
      INSERT INTO brand_metrics (brand_id, metric_date, ${metricType})
      VALUES ($1, $2, $3)
      ON CONFLICT (brand_id, metric_date)
      DO UPDATE SET ${metricType} = brand_metrics.${metricType} + $3
    `, [brandId, today, value]);
  } catch (error) {
    logger.error('Brand Service: Error tracking metric', { error, brandId, metricType });
    // Don't throw - metrics tracking shouldn't break the app
  }
}


