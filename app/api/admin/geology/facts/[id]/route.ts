import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import {
  NotFoundError,
} from '@/lib/api/middleware/error-handler';
import { z } from 'zod';
import { auditService } from '@/lib/services/audit.service';
import { prisma } from '@/lib/prisma';

// ============================================================================
// Validation
// ============================================================================

const updateFactSchema = z.object({
  fact_text: z.string().min(1).optional(),
  context: z.string().optional().nullable(),
  fact_type: z
    .enum(['statistic', 'comparison', 'quote', 'timeline', 'mind_blowing', 'wine_connection'])
    .optional()
    .nullable(),
  topic_id: z.number().int().optional().nullable(),
  display_order: z.number().int().optional(),
  is_featured: z.boolean().optional(),
});

// ============================================================================
// GET /api/admin/geology/facts/[id] - Get a single fact
// ============================================================================

export const GET = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    const factId = parseInt(id);

    if (isNaN(factId)) {
      throw new NotFoundError('Invalid fact ID');
    }

    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT f.*, t.title as topic_title
       FROM geology_facts f
       LEFT JOIN geology_topics t ON f.topic_id = t.id
       WHERE f.id = $1`,
      [factId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Fact not found');
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  }
);

// ============================================================================
// PUT /api/admin/geology/facts/[id] - Update a fact
// ============================================================================

export const PUT = withAdminAuth(
  async (request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    const factId = parseInt(id);

    if (isNaN(factId)) {
      throw new NotFoundError('Invalid fact ID');
    }

    const body = await request.json();
    const validated = updateFactSchema.parse(body);

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = ['fact_text', 'context', 'fact_type', 'topic_id', 'display_order', 'is_featured'];

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

    values.push(factId);

    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE geology_facts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      ...values
    );

    if (result.length === 0) {
      throw new NotFoundError('Fact not found');
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  }
);

// ============================================================================
// DELETE /api/admin/geology/facts/[id] - Delete a fact
// ============================================================================

export const DELETE = withAdminAuth(
  async (request: NextRequest, session, context) => {
    const { id } = await context!.params;
    const factId = parseInt(id);

    if (isNaN(factId)) {
      throw new NotFoundError('Invalid fact ID');
    }

    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>('DELETE FROM geology_facts WHERE id = $1 RETURNING id', [factId]);

    if (result.length === 0) {
      throw new NotFoundError('Fact not found');
    }

    await auditService.logFromRequest(request, parseInt(session.userId), 'resource_deleted', {
      entityType: 'geology_fact',
      entityId: factId,
    });

    return NextResponse.json({
      success: true,
      message: 'Fact deleted',
    });
  }
);
