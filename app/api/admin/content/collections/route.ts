import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { ContentService } from '@/lib/services/content.service';

// GET - Fetch collections
// ?type=neighborhoods - Get all items in a collection type
// ?type=neighborhoods&slug=downtown - Get specific item
// ?type=neighborhoods&includeInactive=true - Include inactive items
// (no params) - Get list of collection types
const getHandler = withAdminAuth(async (request: NextRequest, _session) => {
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
});

// POST - Create new collection item
const postHandler = withAdminAuth(async (request: NextRequest, session) => {
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
    updated_by: parseInt(session.userId),
  });

  return NextResponse.json({
    success: true,
    item,
  });
});

// PUT - Update collection item
const putHandler = withAdminAuth(async (request: NextRequest, session) => {
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
    updated_by: parseInt(session.userId),
  });

  if (!item) {
    throw new BadRequestError('Collection item not found');
  }

  return NextResponse.json({
    success: true,
    item,
  });
});

// DELETE - Remove collection item
const deleteHandler = withAdminAuth(async (request: NextRequest, _session) => {
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
});

export const GET = getHandler;
export const POST = postHandler;
export const PUT = putHandler;
export const DELETE = deleteHandler;
