import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';

// ============================================================================
// Validation
// ============================================================================

const createFactSchema = z.object({
  fact_text: z.string().min(1),
  context: z.string().optional().nullable(),
  fact_type: z
    .enum(['statistic', 'comparison', 'quote', 'timeline', 'mind_blowing', 'wine_connection'])
    .optional()
    .nullable(),
  topic_id: z.number().int().optional().nullable(),
  display_order: z.number().int().optional().default(0),
  is_featured: z.boolean().optional().default(false),
});

// ============================================================================
// GET /api/admin/geology/facts - List all facts
// ============================================================================

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topic_id');
  const featuredOnly = searchParams.get('featured') === 'true';

  let sql = `
    SELECT f.*, t.title as topic_title
    FROM geology_facts f
    LEFT JOIN geology_topics t ON f.topic_id = t.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (topicId) {
    sql += ` AND f.topic_id = $${paramIndex}`;
    params.push(parseInt(topicId));
    paramIndex++;
  }

  if (featuredOnly) {
    sql += ' AND f.is_featured = true';
  }

  sql += ' ORDER BY f.is_featured DESC, f.display_order ASC, f.created_at DESC';

  const facts = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return NextResponse.json({
    success: true,
    data: {
      facts,
      count: facts.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/facts - Create a new fact
// ============================================================================

export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const validated = createFactSchema.parse(body);

  const fact = await prisma.geology_facts.create({
    data: {
      fact_text: validated.fact_text,
      context: validated.context || null,
      fact_type: validated.fact_type || null,
      topic_id: validated.topic_id || null,
      display_order: validated.display_order,
      is_featured: validated.is_featured,
    },
  });

  return NextResponse.json({
    success: true,
    data: fact,
  });
})
);
