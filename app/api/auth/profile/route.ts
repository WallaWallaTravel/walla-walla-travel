import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  requireAuth,
  parseRequestBody,
  sanitizeInput,
  isValidPhone,
  logApiRequest
} from '@/app/api/utils';
import { getUserByEmail, query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult; // This is an error response
    }
    const session = authResult;

    logApiRequest('GET', '/api/auth/profile', session.userId);

    // Get full user profile from database
    const user = await getUserByEmail(session.email);
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
    console.error('Profile fetch error:', error);
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

    // Parse request body
    const body = await parseRequestBody<{
      name?: string;
      phone?: string;
    }>(request);

    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Sanitize inputs
    const updates: { name?: string; phone?: string } = {};
    
    if (body.name !== undefined) {
      updates.name = sanitizeInput(body.name);
      if (updates.name.length < 2) {
        return errorResponse('Name must be at least 2 characters', 400);
      }
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone.trim();
      if (updates.phone && !isValidPhone(updates.phone)) {
        return errorResponse('Invalid phone number format', 400);
      }
    }

    // Build update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      values.push(updates.phone || null);
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
      RETURNING id, email, name, phone, role, created_at, last_login
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
    }, 'Profile updated successfully');

  } catch (error) {
    console.error('Profile update error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}