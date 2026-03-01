import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';
import { z } from 'zod';

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

  const result = await query(sql, params);

  return NextResponse.json({
    success: true,
    data: {
      facts: result.rows,
      count: result.rows.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/facts - Create a new fact
// ============================================================================

export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const validated = createFactSchema.parse(body);

  const result = await query(
    `INSERT INTO geology_facts (fact_text, context, fact_type, topic_id, display_order, is_featured)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      validated.fact_text,
      validated.context || null,
      validated.fact_type || null,
      validated.topic_id || null,
      validated.display_order,
      validated.is_featured,
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
  });
});
