import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { ContentService } from '@/lib/services/content.service';

// GET - Fetch page content
// ?page=homepage - Get all content for a page
// ?page=homepage&section=hero_headline - Get specific section
// (no params) - Get list of available pages
const getHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const pageSlug = searchParams.get('page');
  const sectionKey = searchParams.get('section');

  // No page specified - return list of available pages
  if (!pageSlug) {
    const pages = await ContentService.getAvailablePages();
    return NextResponse.json({ pages });
  }

  // Specific section requested
  if (sectionKey) {
    const content = await ContentService.getContentSection(pageSlug, sectionKey);
    return NextResponse.json({ content });
  }

  // All content for a page
  const content = await ContentService.getPageContent(pageSlug);
  return NextResponse.json({
    page: pageSlug,
    content,
    count: content.length,
  });
});

// POST - Create new content section
const postHandler = withAdminAuth(async (request: NextRequest, session) => {
  const body = await request.json();

  if (!body.page_slug || !body.section_key || body.content === undefined) {
    throw new BadRequestError('page_slug, section_key, and content are required');
  }

  const content = await ContentService.createContentSection({
    page_slug: body.page_slug,
    section_key: body.section_key,
    content_type: body.content_type,
    content: body.content,
    metadata: body.metadata,
    updated_by: parseInt(session.userId),
  });

  return NextResponse.json({
    success: true,
    content,
  });
});

// PUT - Update content section
const putHandler = withAdminAuth(async (request: NextRequest, session) => {
  const body = await request.json();

  if (!body.page_slug || !body.section_key) {
    throw new BadRequestError('page_slug and section_key are required');
  }

  const content = await ContentService.updateContentSection(
    body.page_slug,
    body.section_key,
    {
      content: body.content,
      content_type: body.content_type,
      metadata: body.metadata,
      updated_by: parseInt(session.userId),
    }
  );

  if (!content) {
    throw new BadRequestError('Content section not found');
  }

  return NextResponse.json({
    success: true,
    content,
  });
});

// DELETE - Remove content section
const deleteHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const pageSlug = searchParams.get('page');
  const sectionKey = searchParams.get('section');

  if (!pageSlug || !sectionKey) {
    throw new BadRequestError('page and section query parameters are required');
  }

  const deleted = await ContentService.deleteContentSection(pageSlug, sectionKey);

  return NextResponse.json({
    success: deleted,
    message: deleted ? 'Content section deleted' : 'Content section not found',
  });
});

export const GET = getHandler;
export const POST = postHandler;
export const PUT = putHandler;
export const DELETE = deleteHandler;
