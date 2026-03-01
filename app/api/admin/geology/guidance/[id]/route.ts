import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import {
  NotFoundError,
} from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { z } from 'zod';

// ============================================================================
// Validation
// ============================================================================

const updateGuidanceSchema = z.object({
  guidance_type: z
    .enum([
      'personality',
      'key_themes',
      'common_questions',
      'corrections',
      'connections',
      'terminology',
      'emphasis',
    ])
    .optional(),
  title: z.string().max(255).optional().nullable(),
  content: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

// ============================================================================
// GET /api/admin/geology/guidance/[id] - Get single guidance
// ============================================================================

export const GET = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    const guidanceId = parseInt(id);

    if (isNaN(guidanceId)) {
      throw new NotFoundError('Invalid guidance ID');
    }

    const result = await query('SELECT * FROM geology_ai_guidance WHERE id = $1', [guidanceId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Guidance not found');
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  }
);

// ============================================================================
// PUT /api/admin/geology/guidance/[id] - Update guidance
// ============================================================================

export const PUT = withAdminAuth(
  async (request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    const guidanceId = parseInt(id);

    if (isNaN(guidanceId)) {
      throw new NotFoundError('Invalid guidance ID');
    }

    const body = await request.json();
    const validated = updateGuidanceSchema.parse(body);

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = ['guidance_type', 'title', 'content', 'priority', 'is_active'];

    for (const field of fields) {
      if (field in validated) {
        updates.push(`${field} = $${paramIndex}`);
        values.push((validated as Record<string, unknown>)[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(guidanceId);

    const result = await query(
      `UPDATE geology_ai_guidance SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Guidance not found');
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  }
);

// ============================================================================
// DELETE /api/admin/geology/guidance/[id] - Delete guidance
// ============================================================================

export const DELETE = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    const guidanceId = parseInt(id);

    if (isNaN(guidanceId)) {
      throw new NotFoundError('Invalid guidance ID');
    }

    const result = await query('DELETE FROM geology_ai_guidance WHERE id = $1 RETURNING id', [
      guidanceId,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Guidance not found');
    }

    return NextResponse.json({
      success: true,
      message: 'Guidance deleted',
    });
  }
);
