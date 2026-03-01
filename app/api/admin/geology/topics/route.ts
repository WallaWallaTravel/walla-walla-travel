import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';
import { z } from 'zod';

// ============================================================================
// Validation
// ============================================================================

const createTopicSchema = z.object({
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  title: z.string().min(1).max(255),
  subtitle: z.string().max(500).optional(),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  topic_type: z.enum([
    'ice_age_floods',
    'soil_types',
    'basalt',
    'terroir',
    'climate',
    'water',
    'overview',
    'wine_connection',
  ]),
  difficulty: z.enum(['general', 'intermediate', 'advanced']).optional().default('general'),
  hero_image_url: z.string().url().optional().nullable(),
  display_order: z.number().int().optional().default(0),
  is_featured: z.boolean().optional().default(false),
  is_published: z.boolean().optional().default(false),
  related_winery_ids: z.array(z.number()).optional(),
  related_topic_ids: z.array(z.number()).optional(),
  author_name: z.string().max(255).optional(),
  sources: z.string().optional(),
});

// ============================================================================
// GET /api/admin/geology/topics - List all topics
// ============================================================================

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const publishedOnly = searchParams.get('published') === 'true';

  let sql = `
    SELECT *
    FROM geology_topics
  `;

  if (publishedOnly) {
    sql += ' WHERE is_published = true';
  }

  sql += ' ORDER BY display_order ASC, created_at DESC';

  const result = await query(sql);

  return NextResponse.json({
    success: true,
    data: {
      topics: result.rows,
      count: result.rows.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/topics - Create a new topic
// ============================================================================

export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const validated = createTopicSchema.parse(body);

  const result = await query(
    `INSERT INTO geology_topics (
      slug, title, subtitle, content, excerpt, topic_type, difficulty,
      hero_image_url, display_order, is_featured, is_published,
      related_winery_ids, related_topic_ids, author_name, sources
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      validated.slug,
      validated.title,
      validated.subtitle || null,
      validated.content,
      validated.excerpt || null,
      validated.topic_type,
      validated.difficulty,
      validated.hero_image_url || null,
      validated.display_order,
      validated.is_featured,
      validated.is_published,
      validated.related_winery_ids || null,
      validated.related_topic_ids || null,
      validated.author_name || null,
      validated.sources || null,
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
  });
});
