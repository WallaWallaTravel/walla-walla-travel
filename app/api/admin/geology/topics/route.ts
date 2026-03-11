import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';

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

  const where: any = {};
  if (publishedOnly) {
    where.is_published = true;
  }

  const topics = await prisma.geology_topics.findMany({
    where,
    orderBy: [
      { display_order: 'asc' },
      { created_at: 'desc' },
    ],
  });

  return NextResponse.json({
    success: true,
    data: {
      topics,
      count: topics.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/topics - Create a new topic
// ============================================================================

export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const validated = createTopicSchema.parse(body);

  const topic = await prisma.geology_topics.create({
    data: {
      slug: validated.slug,
      title: validated.title,
      subtitle: validated.subtitle || null,
      content: validated.content,
      excerpt: validated.excerpt || null,
      topic_type: validated.topic_type,
      difficulty: validated.difficulty,
      hero_image_url: validated.hero_image_url || null,
      display_order: validated.display_order,
      is_featured: validated.is_featured,
      is_published: validated.is_published,
      related_winery_ids: validated.related_winery_ids || [],
      related_topic_ids: validated.related_topic_ids || [],
      author_name: validated.author_name || null,
      sources: validated.sources || null,
    },
  });

  return NextResponse.json({
    success: true,
    data: topic,
  });
})
);
