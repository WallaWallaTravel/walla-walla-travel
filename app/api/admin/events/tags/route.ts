/**
 * Admin Event Tags CRUD
 * GET    /api/admin/events/tags - List all tags
 * POST   /api/admin/events/tags - Create a new tag
 * PUT    /api/admin/events/tags - Update a tag (body: { id, name, slug })
 * DELETE /api/admin/events/tags - Delete a tag (body: { id })
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

export const GET = withAdminAuth(async () => {
  const tags = await eventsService.getAllTags();
  return NextResponse.json({ success: true, data: tags });
});

const createTagSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
});

const updateTagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
});

const deleteTagSchema = z.object({
  id: z.number().int().positive(),
});

export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest) => {
    const body = await request.json();
    const { name, slug } = createTagSchema.parse(body);
    const tag = await eventsService.createTag(name, slug);
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  })
);

export const PUT = withCSRF(
  withAdminAuth(async (request: NextRequest) => {
    const body = await request.json();
    const { id, name, slug } = updateTagSchema.parse(body);
    const tag = await eventsService.updateTag(id, name, slug);
    return NextResponse.json({ success: true, data: tag });
  })
);

export const DELETE = withCSRF(
  withAdminAuth(async (request: NextRequest) => {
    const body = await request.json();
    const { id } = deleteTagSchema.parse(body);
    await eventsService.deleteTag(id);
    return NextResponse.json({ success: true, message: 'Tag deleted' });
  })
);
