import { logger } from '@/lib/logger';
/**
 * Tenant Service
 * Handles multi-tenant business logic for Walla Walla Travel platform
 */

import { BaseService } from './base.service';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// Types
// ============================================================================

export interface Tenant {
  id: number;
  slug: string;
  legal_name: string;
  display_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  stripe_account_id?: string;
  tax_id?: string;
  is_active: boolean;
  is_platform_owner: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Brand {
  id: number;
  tenant_id: number;
  brand_code: string;
  brand_name: string;
  display_name: string;
  legal_name?: string;
  tagline?: string;
  website_url?: string;
  booking_url?: string;
  email_from?: string;
  email_support?: string;
  phone?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  brand_type: string;
  is_featured: boolean;
  active: boolean;
}

export interface TourProvider {
  id: number;
  brand_id: number;
  service_types: string[];
  max_passengers: number;
  service_area: string[];
  vehicle_count: number;
  base_hourly_rate: number;
  minimum_hours: number;
  advance_booking_days: number;
  max_booking_days: number;
  cancellation_policy?: string;
  deposit_percentage: number;
}

export interface CreateTenantData {
  slug: string;
  legal_name: string;
  display_name: string;
  email?: string;
  phone?: string;
  is_platform_owner?: boolean;
  primary_color?: string;
  secondary_color?: string;
}

export interface CreateTourProviderData {
  brand_id: number;
  service_types?: string[];
  max_passengers?: number;
  service_area?: string[];
  base_hourly_rate?: number;
  minimum_hours?: number;
}

// ============================================================================
// Service
// ============================================================================

export class TenantService extends BaseService {
  protected get serviceName(): string {
    return 'TenantService';
  }

  // ============================================================================
  // Tenant Operations
  // ============================================================================

  /**
   * List all tenants
   */
  async listTenants(): Promise<Tenant[]> {
    this.log('Listing tenants');
    return this.queryMany<Tenant>(
      `SELECT * FROM tenants ORDER BY is_platform_owner DESC, display_name ASC`
    );
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: number): Promise<Tenant> {
    const tenant = await this.queryOne<Tenant>(
      `SELECT * FROM tenants WHERE id = $1`,
      [id]
    );

    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${id}`);
    }

    return tenant;
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.queryOne<Tenant>(
      `SELECT * FROM tenants WHERE slug = $1`,
      [slug]
    );

    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${slug}`);
    }

    return tenant;
  }

  /**
   * Get platform owner tenant
   */
  async getPlatformOwner(): Promise<Tenant> {
    const tenant = await this.queryOne<Tenant>(
      `SELECT * FROM tenants WHERE is_platform_owner = TRUE LIMIT 1`
    );

    if (!tenant) {
      throw new NotFoundError('Platform owner tenant not found');
    }

    return tenant;
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantData): Promise<Tenant> {
    this.log('Creating tenant', { slug: data.slug });

    // Validate required fields
    if (!data.slug || !data.legal_name || !data.display_name) {
      throw new BadRequestError('Slug, legal name, and display name are required');
    }

    // Check for duplicate slug
    const existing = await this.queryOne(
      `SELECT id FROM tenants WHERE slug = $1`,
      [data.slug]
    );

    if (existing) {
      throw new BadRequestError(`Tenant with slug '${data.slug}' already exists`);
    }

    return this.insert<Tenant>('tenants', {
      slug: data.slug,
      legal_name: data.legal_name,
      display_name: data.display_name,
      email: data.email,
      phone: data.phone,
      is_platform_owner: data.is_platform_owner || false,
      primary_color: data.primary_color || '#1E3A5F',
      secondary_color: data.secondary_color || '#E07A5F',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Update a tenant
   */
  async updateTenant(id: number, data: Partial<CreateTenantData>): Promise<Tenant> {
    this.log('Updating tenant', { id });

    const tenant = await this.getTenantById(id);

    // Don't allow changing slug of platform owner
    if (tenant.is_platform_owner && data.slug && data.slug !== tenant.slug) {
      throw new BadRequestError('Cannot change slug of platform owner');
    }

    const updated = await this.update<Tenant>('tenants', id, {
      ...data,
      updated_at: new Date(),
    });

    if (!updated) {
      throw new NotFoundError(`Tenant not found: ${id}`);
    }

    return updated;
  }

  // ============================================================================
  // Brand Operations
  // ============================================================================

  /**
   * List all brands
   */
  async listBrands(tenantId?: number): Promise<Brand[]> {
    this.log('Listing brands', { tenantId });

    let sql = `
      SELECT * FROM brands 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tenantId) {
      params.push(tenantId);
      sql += ` AND tenant_id = $${params.length}`;
    }

    sql += ` ORDER BY brand_name ASC`;

    return this.queryMany<Brand>(sql, params);
  }

  /**
   * Get brand by ID
   */
  async getBrandById(id: number): Promise<Brand> {
    const brand = await this.queryOne<Brand>(
      `SELECT * FROM brands WHERE id = $1`,
      [id]
    );

    if (!brand) {
      throw new NotFoundError(`Brand not found: ${id}`);
    }

    return brand;
  }

  /**
   * Get brand by code
   */
  async getBrandByCode(code: string): Promise<Brand> {
    const brand = await this.queryOne<Brand>(
      `SELECT * FROM brands WHERE brand_code = $1`,
      [code]
    );

    if (!brand) {
      throw new NotFoundError(`Brand not found: ${code}`);
    }

    return brand;
  }

  /**
   * Get brands for a tenant
   */
  async getBrandsByTenant(tenantId: number): Promise<Brand[]> {
    return this.queryMany<Brand>(
      `SELECT * FROM brands WHERE tenant_id = $1 ORDER BY brand_name ASC`,
      [tenantId]
    );
  }

  /**
   * Get brand with tenant info
   */
  async getBrandWithTenant(brandId: number): Promise<Brand & { tenant: Tenant }> {
    const result = await this.queryOne<any>(
      `SELECT 
        b.*,
        t.slug as tenant_slug,
        t.legal_name as tenant_legal_name,
        t.display_name as tenant_display_name,
        t.is_platform_owner as tenant_is_platform_owner
      FROM brands b
      LEFT JOIN tenants t ON b.tenant_id = t.id
      WHERE b.id = $1`,
      [brandId]
    );

    if (!result) {
      throw new NotFoundError(`Brand not found: ${brandId}`);
    }

    return {
      ...result,
      tenant: {
        id: result.tenant_id,
        slug: result.tenant_slug,
        legal_name: result.tenant_legal_name,
        display_name: result.tenant_display_name,
        is_platform_owner: result.tenant_is_platform_owner,
      } as Tenant,
    };
  }

  // ============================================================================
  // Tour Provider Operations
  // ============================================================================

  /**
   * List tour providers
   */
  async listTourProviders(): Promise<TourProvider[]> {
    this.log('Listing tour providers');
    return this.queryMany<TourProvider>(
      `SELECT * FROM tour_providers ORDER BY id ASC`
    );
  }

  /**
   * Get tour provider by brand ID
   */
  async getTourProviderByBrand(brandId: number): Promise<TourProvider | null> {
    return this.queryOne<TourProvider>(
      `SELECT * FROM tour_providers WHERE brand_id = $1`,
      [brandId]
    );
  }

  /**
   * Create a tour provider
   */
  async createTourProvider(data: CreateTourProviderData): Promise<TourProvider> {
    this.log('Creating tour provider', { brandId: data.brand_id });

    // Verify brand exists
    await this.getBrandById(data.brand_id);

    // Check for existing provider
    const existing = await this.getTourProviderByBrand(data.brand_id);
    if (existing) {
      throw new BadRequestError('Tour provider already exists for this brand');
    }

    return this.insert<TourProvider>('tour_providers', {
      brand_id: data.brand_id,
      service_types: data.service_types || ['wine_tour'],
      max_passengers: data.max_passengers || 14,
      service_area: data.service_area || ['walla-walla'],
      base_hourly_rate: data.base_hourly_rate || 125.00,
      minimum_hours: data.minimum_hours || 4,
      vehicle_count: 0,
      advance_booking_days: 1,
      max_booking_days: 365,
      deposit_percentage: 25.00,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================================
  // Multi-Tenant Data Access
  // ============================================================================

  /**
   * Filter bookings by tenant
   */
  async getBookingsForTenant(tenantId: number, limit: number = 50, offset: number = 0) {
    return this.paginate(
      `SELECT * FROM bookings WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
      limit,
      offset
    );
  }

  /**
   * Get user's accessible tenants
   */
  async getUserTenants(userId: number): Promise<Tenant[]> {
    return this.queryMany<Tenant>(
      `SELECT t.* FROM tenants t
       INNER JOIN users u ON (
         u.tenant_id = t.id 
         OR t.id = ANY(u.accessible_tenant_ids)
       )
       WHERE u.id = $1 AND t.is_active = TRUE
       ORDER BY t.display_name ASC`,
      [userId]
    );
  }

  /**
   * Assign user to tenant
   */
  async assignUserToTenant(userId: number, tenantId: number): Promise<void> {
    this.log('Assigning user to tenant', { userId, tenantId });

    await this.query(
      `UPDATE users SET tenant_id = $1, updated_at = NOW() WHERE id = $2`,
      [tenantId, userId]
    );
  }

  /**
   * Grant user access to additional tenant
   */
  async grantTenantAccess(userId: number, tenantId: number): Promise<void> {
    this.log('Granting tenant access', { userId, tenantId });

    await this.query(
      `UPDATE users 
       SET accessible_tenant_ids = array_append(
         COALESCE(accessible_tenant_ids, ARRAY[]::INTEGER[]), 
         $1
       ),
       updated_at = NOW()
       WHERE id = $2 
       AND NOT ($1 = ANY(COALESCE(accessible_tenant_ids, ARRAY[]::INTEGER[])))`,
      [tenantId, userId]
    );
  }

  /**
   * Revoke user access to tenant
   */
  async revokeTenantAccess(userId: number, tenantId: number): Promise<void> {
    this.log('Revoking tenant access', { userId, tenantId });

    await this.query(
      `UPDATE users 
       SET accessible_tenant_ids = array_remove(accessible_tenant_ids, $1),
       updated_at = NOW()
       WHERE id = $2`,
      [tenantId, userId]
    );
  }
}

export const tenantService = new TenantService();







