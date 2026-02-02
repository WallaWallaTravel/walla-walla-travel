import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { ContentService } from '@/lib/services/content.service';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

// GET - Fetch page content
// ?page=homepage - Get all content for a page
// ?page=homepage&section=hero_headline - Get specific section
// (no params) - Get list of available pages
async function getHandler(request: NextRequest) {
  await verifyAdmin(request);

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
}

// POST - Create new content section
async function postHandler(request: NextRequest) {
  const session = await verifyAdmin(request);

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
    updated_by: session.user.id,
  });

  return NextResponse.json({
    success: true,
    content,
  });
}

// PUT - Update content section
async function putHandler(request: NextRequest) {
  const session = await verifyAdmin(request);

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
      updated_by: session.user.id,
    }
  );

  if (!content) {
    throw new BadRequestError('Content section not found');
  }

  return NextResponse.json({
    success: true,
    content,
  });
}

// DELETE - Remove content section
async function deleteHandler(request: NextRequest) {
  await verifyAdmin(request);

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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GET = withErrorHandling(getHandler as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const POST = withErrorHandling(postHandler as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PUT = withErrorHandling(putHandler as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DELETE = withErrorHandling(deleteHandler as any);
