'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

export type PageContentItem = {
  id: number
  page_slug: string
  section_key: string
  content_type: string | null
  content: string
  metadata: unknown
  created_at: string | null
  updated_at: string | null
  updated_by: number | null
}

export type CollectionItem = {
  id: number
  collection_type: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  content: unknown
  image_url: string | null
  icon: string | null
  sort_order: number | null
  is_active: boolean | null
  metadata: unknown
  created_at: string | null
  updated_at: string | null
  updated_by: number | null
}

// ============================================================================
// PAGE CONTENT QUERIES
// ============================================================================

export async function getPageContent(pageSlug: string): Promise<PageContentItem[]> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  const rows = await prisma.page_content.findMany({
    where: { page_slug: pageSlug },
    orderBy: { section_key: 'asc' },
  })

  return rows.map((r) => ({
    ...r,
    created_at: r.created_at?.toISOString() ?? null,
    updated_at: r.updated_at?.toISOString() ?? null,
  }))
}

export async function getContentSection(
  pageSlug: string,
  sectionKey: string
): Promise<PageContentItem | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const row = await prisma.page_content.findUnique({
    where: {
      page_slug_section_key: {
        page_slug: pageSlug,
        section_key: sectionKey,
      },
    },
  })

  if (!row) return null

  return {
    ...row,
    created_at: row.created_at?.toISOString() ?? null,
    updated_at: row.updated_at?.toISOString() ?? null,
  }
}

export async function getAvailablePages(): Promise<string[]> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  const rows = await prisma.page_content.findMany({
    distinct: ['page_slug'],
    select: { page_slug: true },
    orderBy: { page_slug: 'asc' },
  })

  return rows.map((r) => r.page_slug)
}

// ============================================================================
// COLLECTION QUERIES
// ============================================================================

export async function getCollection(
  collectionType: string,
  includeInactive = false
): Promise<CollectionItem[]> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  const where = includeInactive
    ? { collection_type: collectionType }
    : { collection_type: collectionType, is_active: true }

  const rows = await prisma.content_collections.findMany({
    where,
    orderBy: [{ sort_order: 'asc' }, { title: 'asc' }],
  })

  return rows.map((r) => ({
    ...r,
    created_at: r.created_at?.toISOString() ?? null,
    updated_at: r.updated_at?.toISOString() ?? null,
  }))
}

export async function getCollectionItem(
  collectionType: string,
  slug: string
): Promise<CollectionItem | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const row = await prisma.content_collections.findUnique({
    where: {
      collection_type_slug: {
        collection_type: collectionType,
        slug,
      },
    },
  })

  if (!row) return null

  return {
    ...row,
    created_at: row.created_at?.toISOString() ?? null,
    updated_at: row.updated_at?.toISOString() ?? null,
  }
}

export async function getCollectionTypes(): Promise<string[]> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  const rows = await prisma.content_collections.findMany({
    distinct: ['collection_type'],
    select: { collection_type: true },
    orderBy: { collection_type: 'asc' },
  })

  return rows.map((r) => r.collection_type)
}

export async function getContentHistory(
  tableName: string,
  recordId: number
): Promise<Array<{
  id: number
  table_name: string
  record_id: number
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string | null
  changed_by: number | null
}>> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  const rows = await prisma.content_history.findMany({
    where: {
      table_name: tableName,
      record_id: recordId,
    },
    orderBy: { changed_at: 'desc' },
    take: 50,
  })

  return rows.map((r) => ({
    ...r,
    changed_at: r.changed_at?.toISOString() ?? null,
  }))
}
