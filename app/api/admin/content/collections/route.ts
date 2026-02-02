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

// GET - Fetch collections
// ?type=neighborhoods - Get all items in a collection type
// ?type=neighborhoods&slug=downtown - Get specific item
// ?type=neighborhoods&includeInactive=true - Include inactive items
// (no params) - Get list of collection types
async function getHandler(request: NextRequest) {
  await verifyAdmin(request);

  const { searchParams } = new URL(request.url);
  const collectionType = searchParams.get('type');
  const slug = searchParams.get('slug');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  // No type specified - return list of collection types
  if (!collectionType) {
    const types = await ContentService.getCollectionTypes();
    return NextResponse.json({ types });
  }

  // Specific item requested
  if (slug) {
    const item = await ContentService.getCollectionItem(collectionType, slug);
    return NextResponse.json({ item });
  }

  // All items in collection
  const items = await ContentService.getCollection(collectionType, includeInactive);
  return NextResponse.json({
    type: collectionType,
    items,
    count: items.length,
  });
}

// POST - Create new collection item
async function postHandler(request: NextRequest) {
  const session = await verifyAdmin(request);

  const body = await request.json();

  if (!body.collection_type || !body.slug || !body.title) {
    throw new BadRequestError('collection_type, slug, and title are required');
  }

  // Check if slug already exists
  const existing = await ContentService.getCollectionItem(body.collection_type, body.slug);
  if (existing) {
    throw new BadRequestError(`Item with slug "${body.slug}" already exists in ${body.collection_type}`);
  }

  const item = await ContentService.createCollectionItem({
    collection_type: body.collection_type,
    slug: body.slug,
    title: body.title,
    subtitle: body.subtitle,
    description: body.description,
    content: body.content,
    image_url: body.image_url,
    icon: body.icon,
    sort_order: body.sort_order,
    is_active: body.is_active,
    metadata: body.metadata,
    updated_by: session.user.id,
  });

  return NextResponse.json({
    success: true,
    item,
  });
}

// PUT - Update collection item
async function putHandler(request: NextRequest) {
  const session = await verifyAdmin(request);

  const body = await request.json();

  if (!body.id) {
    throw new BadRequestError('id is required');
  }

  const item = await ContentService.updateCollectionItem(body.id, {
    title: body.title,
    subtitle: body.subtitle,
    description: body.description,
    content: body.content,
    image_url: body.image_url,
    icon: body.icon,
    sort_order: body.sort_order,
    is_active: body.is_active,
    metadata: body.metadata,
    updated_by: session.user.id,
  });

  if (!item) {
    throw new BadRequestError('Collection item not found');
  }

  return NextResponse.json({
    success: true,
    item,
  });
}

// DELETE - Remove collection item
async function deleteHandler(request: NextRequest) {
  await verifyAdmin(request);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const soft = searchParams.get('soft') === 'true';

  if (!id) {
    throw new BadRequestError('id query parameter is required');
  }

  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    throw new BadRequestError('Invalid id');
  }

  let deleted: boolean;
  if (soft) {
    deleted = await ContentService.deactivateCollectionItem(itemId);
  } else {
    deleted = await ContentService.deleteCollectionItem(itemId);
  }

  return NextResponse.json({
    success: deleted,
    message: deleted
      ? soft ? 'Collection item deactivated' : 'Collection item deleted'
      : 'Collection item not found',
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
