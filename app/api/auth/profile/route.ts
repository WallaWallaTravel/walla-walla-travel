import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  requireAuth,
} from '@/app/api/utils';
import { query } from '@/lib/db';
import { userService } from '@/lib/services/user.service';
import { validate, profileUpdateSchema } from '@/lib/validation';
import { logger, logApiRequest } from '@/lib/logger';

/**
 * User profile API
 * ✅ REFACTORED: Structured logging + proper error handling
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult; // This is an error response
    }
    const session = authResult;

    logApiRequest('GET', '/api/auth/profile', session.userId);

    // Get full user profile from database
    const user = await userService.getByEmail(session.email);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Return profile data (without password hash)
    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      created_at: user.created_at,
      last_login: user.last_login,
    });

  } catch (error) {
    logger.error('Profile fetch error', { error });
    return errorResponse('Failed to fetch profile', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult; // This is an error response
    }
    const session = authResult;

    logApiRequest('PUT', '/api/auth/profile', session.userId);

    // Validate request body with Zod schema
    const validation = await validate(request, profileUpdateSchema);
    if (!validation.success) {
      return validation.error;
    }

    const updates = validation.data;

    // Build update query
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      values.push(updates.email);
      paramCount++;
    }

    if (updates.phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      values.push(updates.phone || null);
      paramCount++;
    }

    if (updates.emergency_contact_name !== undefined) {
      updateFields.push(`emergency_contact_name = $${paramCount}`);
      values.push(updates.emergency_contact_name || null);
      paramCount++;
    }

    if (updates.emergency_contact_phone !== undefined) {
      updateFields.push(`emergency_contact_phone = $${paramCount}`);
      values.push(updates.emergency_contact_phone || null);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    // Add user ID as the last parameter
    values.push(session.userId);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, name, phone, role, created_at, last_login, emergency_contact_name, emergency_contact_phone
    `;

    const result = await query(updateQuery, values);
    
    if (result.rowCount === 0) {
      return errorResponse('User not found', 404);
    }

    const updatedUser = result.rows[0];

    return successResponse({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      role: updatedUser.role,
      created_at: updatedUser.created_at,
      last_login: updatedUser.last_login,
      emergency_contact_name: updatedUser.emergency_contact_name,
      emergency_contact_phone: updatedUser.emergency_contact_phone,
    }, 'Profile updated successfully');

  } catch (error) {
    logger.error('Profile update error', { error });
    return errorResponse('Failed to update profile', 500);
  }
}

export async function OPTIONS(_request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}