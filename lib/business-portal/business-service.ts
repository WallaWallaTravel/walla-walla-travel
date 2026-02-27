/**
 * Business Portal Service
 * Handles business registration, invitations, and portal access
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// Type for SQL query parameters
type QueryParamValue = string | number | boolean | null | undefined;
type QueryParam = QueryParamValue;

// Type for activity log metadata
interface ActivityMetadata {
  approved_by?: number;
  [key: string]: string | number | boolean | null | undefined;
}

// Type for business activity log entries
export interface BusinessActivityLogEntry {
  id: number;
  business_id: number;
  activity_type: string;
  activity_description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Business {
  id: number;
  business_type: 'winery' | 'restaurant' | 'hotel' | 'boutique' | 'gallery' | 'activity' | 'catering' | 'service' | 'other';
  business_types: ('winery' | 'restaurant' | 'hotel' | 'boutique' | 'gallery' | 'activity' | 'catering' | 'service' | 'other')[];
  name: string;
  email?: string;
  phone?: string;
  invite_token: string;
  status: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  short_description?: string;
  invited_at?: string;
  invited_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBusinessInput {
  business_type: 'winery' | 'restaurant' | 'hotel' | 'boutique' | 'gallery' | 'activity' | 'catering' | 'service' | 'other';
  business_types?: ('winery' | 'restaurant' | 'hotel' | 'boutique' | 'gallery' | 'activity' | 'catering' | 'service' | 'other')[];
  name: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  invited_by?: number;
}

/**
 * Create and invite a new business
 */
export async function createBusiness(data: CreateBusinessInput): Promise<Business> {
  try {
    logger.debug('createBusiness: Creating business', { name: data.name });

    // Generate invite token using the DB function (from migration 059)
    const businessTypes = data.business_types || [data.business_type];
    const result = await query(`
      INSERT INTO businesses (
        business_type,
        business_types,
        name,
        email,
        phone,
        website,
        invite_token,
        status,
        invited_by,
        invited_at
      )
      VALUES ($1, $2::TEXT[], $3, $4, $5, $6, generate_business_invite_token(), 'invited', $7, NOW())
      RETURNING *
    `, [
      data.business_type,
      businessTypes,
      data.name,
      data.contact_email,
      data.contact_phone || null,
      data.website || null,
      data.invited_by || null
    ]);

    const business = result.rows[0];
    logger.info('createBusiness: Business created', { token: business.invite_token, name: data.name });

    // Log activity
    try {
      await logBusinessActivity(business.id, 'business_invited', 'Business invited to contribute content');
    } catch (activityError) {
      // Don't fail the invite if activity logging fails (table may not exist yet)
      logger.warn('createBusiness: Failed to log activity', { error: activityError });
    }

    return business;
  } catch (error) {
    logger.error('createBusiness: Error', { error });
    throw error;
  }
}

/**
 * Get business by unique code (for portal access)
 */
export async function getBusinessByCode(code: string): Promise<Business | null> {
  try {
    logger.debug('getBusinessByCode: Looking up code', { code });

    const result = await query(
      'SELECT * FROM businesses WHERE invite_token = $1',
      [code]
    );

    logger.debug('getBusinessByCode: Query result', { rows: result.rows.length });
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Update last activity and first access if needed
    const business = result.rows[0];
    const updates: string[] = ['last_activity_at = NOW()'];
    
    if (!business.first_access_at) {
      updates.push('first_access_at = NOW()');
      updates.push("status = 'in_progress'");
      await logBusinessActivity(business.id, 'portal_first_access', 'First time accessing portal');
    }
    
    await query(
      `UPDATE businesses SET ${updates.join(', ')} WHERE id = $1`,
      [business.id]
    );

    logger.debug('getBusinessByCode: Successfully retrieved business', { name: business.name });
    return business;
  } catch (error) {
    logger.error('getBusinessByCode: Error', { error });
    throw error;
  }
}

/**
 * Get business by ID
 */
export async function getBusinessById(id: number): Promise<Business | null> {
  const result = await query(
    'SELECT * FROM businesses WHERE id = $1',
    [id]
  );
  
  return result.rows[0] || null;
}

/**
 * Get all businesses with optional filtering
 */
export async function getBusinesses(filters: {
  business_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ businesses: Business[]; total: number }> {
  const whereClauses: string[] = [];
  const params: QueryParam[] = [];
  let paramCount = 0;

  if (filters.business_type) {
    params.push(filters.business_type);
    whereClauses.push(`business_types && ARRAY[$${++paramCount}]::TEXT[]`);
  }

  if (filters.status) {
    params.push(filters.status);
    whereClauses.push(`status = $${++paramCount}`);
  }
  
  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : '';
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM businesses ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get businesses
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  
  params.push(limit, offset);
  const result = await query(
    `SELECT * FROM businesses ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT $${++paramCount} OFFSET $${++paramCount}`,
    params
  );
  
  return {
    businesses: result.rows,
    total
  };
}

/**
 * Update business details
 */
export async function updateBusiness(
  id: number, 
  updates: Partial<Business>
): Promise<Business> {
  const allowedFields = [
    'email',
    'phone',
    'address',
    'city',
    'state',
    'zip',
    'website',
    'short_description',
    'status'
  ];
  
  const setClauses: string[] = [];
  const params: QueryParam[] = [];
  let paramCount = 0;

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      params.push(value as QueryParam);
      setClauses.push(`${key} = $${++paramCount}`);
    }
  });
  
  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  setClauses.push('updated_at = NOW()');
  params.push(id);
  
  const result = await query(
    `UPDATE businesses 
     SET ${setClauses.join(', ')} 
     WHERE id = $${++paramCount}
     RETURNING *`,
    params
  );
  
  return result.rows[0];
}

/**
 * Mark business as submitted
 */
export async function submitBusiness(businessId: number): Promise<void> {
  await query(
    `UPDATE businesses 
     SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [businessId]
  );
  
  await logBusinessActivity(businessId, 'business_submitted', 'Business completed submission');
}

/**
 * Approve business (admin action)
 */
export async function approveBusiness(
  businessId: number, 
  approvedBy: number
): Promise<void> {
  await query(
    `UPDATE businesses 
     SET status = 'approved', 
         approved_at = NOW(), 
         approved_by = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [businessId, approvedBy]
  );
  
  await logBusinessActivity(businessId, 'business_approved', 'Business approved by admin', { approved_by: approvedBy });
}

/**
 * Activate business (make live in directory)
 */
export async function activateBusiness(businessId: number): Promise<void> {
  await query(
    `UPDATE businesses 
     SET status = 'active', public_profile = true, updated_at = NOW()
     WHERE id = $1`,
    [businessId]
  );
  
  await logBusinessActivity(businessId, 'business_activated', 'Business activated in directory');
}

/**
 * Log business activity
 */
export async function logBusinessActivity(
  businessId: number,
  activityType: string,
  description?: string,
  metadata?: ActivityMetadata,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await query(
    `INSERT INTO business_activity_log 
      (business_id, activity_type, activity_description, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      businessId,
      activityType,
      description || null,
      metadata ? JSON.stringify(metadata) : null,
      ipAddress || null,
      userAgent || null
    ]
  );
}

/**
 * Get business activity log
 */
export async function getBusinessActivity(
  businessId: number,
  limit: number = 50
): Promise<BusinessActivityLogEntry[]> {
  const result = await query(
    `SELECT * FROM business_activity_log 
     WHERE business_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [businessId, limit]
  );
  
  return result.rows;
}

/**
 * Get business statistics
 */
export async function getBusinessStats(businessId: number): Promise<{
  totalQuestions: number;
  answeredQuestions: number;
  voiceAnswers: number;
  textAnswers: number;
  uploadedFiles: number;
  completionPercentage: number;
}> {
  const result = await query(`
    SELECT 
      (SELECT COUNT(*)
       FROM interview_questions q
       JOIN businesses b ON (q.business_type = ANY(b.business_types) OR q.business_type = 'all')
       WHERE b.id = $1 AND q.required = true) as total_questions,
      
      (SELECT COUNT(DISTINCT question_id) 
       FROM business_voice_entries 
       WHERE business_id = $1) as voice_answers,
      
      (SELECT COUNT(DISTINCT question_id) 
       FROM business_text_entries 
       WHERE business_id = $1) as text_answers,
      
      (SELECT COUNT(*) 
       FROM business_files 
       WHERE business_id = $1) as uploaded_files,
      
      (SELECT completion_percentage 
       FROM businesses 
       WHERE id = $1) as completion_percentage
  `, [businessId]);
  
  const row = result.rows[0];
  
  return {
    totalQuestions: parseInt(row.total_questions || '0'),
    answeredQuestions: parseInt(row.voice_answers || '0') + parseInt(row.text_answers || '0'),
    voiceAnswers: parseInt(row.voice_answers || '0'),
    textAnswers: parseInt(row.text_answers || '0'),
    uploadedFiles: parseInt(row.uploaded_files || '0'),
    completionPercentage: parseInt(row.completion_percentage || '0')
  };
}

