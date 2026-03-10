'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
  CreatePageContentSchema,
  UpdatePageContentSchema,
  CreateCollectionItemSchema,
  UpdateCollectionItemSchema,
  ReorderCollectionSchema,
  type CreatePageContentInput,
  type UpdatePageContentInput,
  type CreateCollectionItemInput,
  type UpdateCollectionItemInput,
  type ReorderCollectionInput,
} from '@/lib/schemas/admin'

// ============================================================================
// TYPES
// ============================================================================

export type ContentActionResult = {
  success: boolean
  data?: unknown
  error?: string | Record<string, string[]>
}

// ============================================================================
// PAGE CONTENT MUTATIONS
// ============================================================================

export async function createPageContent(
  data: CreatePageContentInput
): Promise<ContentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreatePageContentSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data
  const userId = session.user.id

  try {
    const content = await prisma.page_content.create({
      data: {
        page_slug: v.page_slug,
        section_key: v.section_key,
        content_type: v.content_type || 'text',
        content: v.content,
        metadata: (v.metadata || {}) as Prisma.InputJsonValue,
        updated_by: userId || null,
      },
    })

    return { success: true, data: content }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create content section'
    return { success: false, error: message }
  }
}

export async function updatePageContent(
  data: UpdatePageContentInput
): Promise<ContentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdatePageContentSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data
  const userId = session.user.id

  try {
    // Get current for history tracking
    const current = await prisma.page_content.findUnique({
      where: {
        page_slug_section_key: {
          page_slug: v.page_slug,
          section_key: v.section_key,
        },
      },
    })

    if (!current) {
      return { success: false, error: 'Content section not found' }
    }

    // Record history if content changed
    if (v.content !== undefined && v.content !== current.content) {
      await prisma.content_history.create({
        data: {
          table_name: 'page_content',
          record_id: current.id,
          field_name: 'content',
          old_value: current.content,
          new_value: v.content,
          changed_by: userId || null,
        },
      })
    }

    const updated = await prisma.page_content.update({
      where: {
        page_slug_section_key: {
          page_slug: v.page_slug,
          section_key: v.section_key,
        },
      },
      data: {
        ...(v.content !== undefined && { content: v.content }),
        ...(v.content_type !== undefined && { content_type: v.content_type }),
        ...(v.metadata !== undefined && { metadata: v.metadata as Prisma.InputJsonValue }),
        updated_by: userId || null,
        updated_at: new Date(),
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update content section'
    return { success: false, error: message }
  }
}

export async function deletePageContent(
  pageSlug: string,
  sectionKey: string
): Promise<ContentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await prisma.page_content.delete({
      where: {
        page_slug_section_key: {
          page_slug: pageSlug,
          section_key: sectionKey,
        },
      },
    })

    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete content section'
    return { success: false, error: message }
  }
}

// ============================================================================
// COLLECTION MUTATIONS
// ============================================================================

export async function createCollectionItem(
  data: CreateCollectionItemInput
): Promise<ContentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateCollectionItemSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data
  const userId = session.user.id

  try {
    // Check for duplicate slug
    const existing = await prisma.content_collections.findUnique({
      where: {
        collection_type_slug: {
          collection_type: v.collection_type,
          slug: v.slug,
        },
      },
    })

    if (existing) {
      return {
        success: false,
        error: `Item with slug "${v.slug}" already exists in ${v.collection_type}`,
      }
    }

    const item = await prisma.content_collections.create({
      data: {
        collection_type: v.collection_type,
        slug: v.slug,
        title: v.title,
        subtitle: v.subtitle || null,
        description: v.description || null,
        content: (v.content || {}) as Prisma.InputJsonValue,
        image_url: v.image_url || null,
        icon: v.icon || null,
        sort_order: v.sort_order ?? 0,
        is_active: v.is_active !== false,
        metadata: (v.metadata || {}) as Prisma.InputJsonValue,
        updated_by: userId || null,
      },
    })

    return { success: true, data: item }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create collection item'
    return { success: false, error: message }
  }
}

export async function updateCollectionItem(
  data: UpdateCollectionItemInput
): Promise<ContentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdateCollectionItemSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { id, ...updates } = parsed.data
  const userId = session.user.id

  try {
    // Get current for history tracking
    const current = await prisma.content_collections.findUnique({
      where: { id },
    })

    if (!current) {
      return { success: false, error: 'Collection item not found' }
    }

    // Record history for significant changes
    if (updates.title !== undefined && updates.title !== current.title) {
      await prisma.content_history.create({
        data: {
          table_name: 'content_collections',
          record_id: id,
          field_name: 'title',
          old_value: current.title,
          new_value: updates.title,
          changed_by: userId || null,
        },
      })
    }
    if (
      updates.description !== undefined &&
      updates.description !== current.description
    ) {
      await prisma.content_history.create({
        data: {
          table_name: 'content_collections',
          record_id: id,
          field_name: 'description',
          old_value: current.description || '',
          new_value: updates.description,
          changed_by: userId || null,
        },
      })
    }

    const item = await prisma.content_collections.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.subtitle !== undefined && { subtitle: updates.subtitle }),
        ...(updates.description !== undefined && {
          description: updates.description,
        }),
        ...(updates.content !== undefined && { content: updates.content as Prisma.InputJsonValue }),
        ...(updates.image_url !== undefined && { image_url: updates.image_url }),
        ...(updates.icon !== undefined && { icon: updates.icon }),
        ...(updates.sort_order !== undefined && {
          sort_order: updates.sort_order,
        }),
        ...(updates.is_active !== undefined && { is_active: updates.is_active }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata as Prisma.InputJsonValue }),
        updated_by: userId || null,
        updated_at: new Date(),
      },
    })

    return { success: true, data: item }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update collection item'
    return { success: false, error: message }
  }
}

export async function deleteCollectionItem(
  id: number,
  soft = false
): Promise<ContentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    if (soft) {
      await prisma.content_collections.update({
        where: { id },
        data: { is_active: false, updated_at: new Date() },
      })
    } else {
      await prisma.content_collections.delete({
        where: { id },
      })
    }

    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete collection item'
    return { success: false, error: message }
  }
}

export async function reorderCollection(
  data: ReorderCollectionInput
): Promise<ContentActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = ReorderCollectionSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { collection_type, ordered_ids } = parsed.data

  try {
    // Use a transaction for atomicity
    await prisma.$transaction(
      ordered_ids.map((itemId, index) =>
        prisma.content_collections.updateMany({
          where: { id: itemId, collection_type },
          data: { sort_order: index },
        })
      )
    )

    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reorder collection'
    return { success: false, error: message }
  }
}
