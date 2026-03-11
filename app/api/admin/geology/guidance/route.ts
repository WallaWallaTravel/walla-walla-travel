import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';

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

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  const where: any = {};
  if (activeOnly) {
    where.is_active = true;
  }

  const guidance = await prisma.geology_ai_guidance.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { created_at: 'asc' },
    ],
  });

  return NextResponse.json({
    success: true,
    data: {
      guidance,
      count: guidance.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/guidance - Create new AI guidance
// ============================================================================

export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const validated = createGuidanceSchema.parse(body);

  const record = await prisma.geology_ai_guidance.create({
    data: {
      guidance_type: validated.guidance_type,
      title: validated.title || null,
      content: validated.content,
      priority: validated.priority,
      is_active: validated.is_active,
    },
  });

  return NextResponse.json({
    success: true,
    data: record,
  });
})
);
