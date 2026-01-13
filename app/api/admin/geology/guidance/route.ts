import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { query } from '@/lib/db';
import { z } from 'zod';

// ============================================================================
// Validation
// ============================================================================

const createGuidanceSchema = z.object({
  guidance_type: z.enum([
    'personality',
    'key_themes',
    'common_questions',
    'corrections',
    'connections',
    'terminology',
    'emphasis',
  ]),
  title: z.string().max(255).optional().nullable(),
  content: z.string().min(1),
  priority: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

// ============================================================================
// GET /api/admin/geology/guidance - List all AI guidance
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session || !canAccessGeology(session.user.role)) {
    throw new UnauthorizedError('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let sql = 'SELECT * FROM geology_ai_guidance';

  if (activeOnly) {
    sql += ' WHERE is_active = true';
  }

  sql += ' ORDER BY priority DESC, created_at ASC';

  const result = await query(sql);

  return NextResponse.json({
    success: true,
    data: {
      guidance: result.rows,
      count: result.rows.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/guidance - Create new AI guidance
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session || !canAccessGeology(session.user.role)) {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json();
  const validated = createGuidanceSchema.parse(body);

  const result = await query(
    `INSERT INTO geology_ai_guidance (guidance_type, title, content, priority, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      validated.guidance_type,
      validated.title || null,
      validated.content,
      validated.priority,
      validated.is_active,
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
  });
});
