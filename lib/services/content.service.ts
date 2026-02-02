/**
 * Content Service
 *
 * @module lib/services/content.service
 * @description Service for managing CMS content - page sections and collections.
 * Provides CRUD operations for page_content and content_collections tables.
 */

import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export interface PageContent {
  id: number;
  page_slug: string;
  section_key: string;
  content_type: 'text' | 'html' | 'json' | 'number';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
}

export interface ContentCollection {
  id: number;
  collection_type: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  content: Record<string, unknown>;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
}

export interface ContentHistory {
  id: number;
  table_name: string;
  record_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by: number | null;
}

export interface CreatePageContentInput {
  page_slug: string;
  section_key: string;
  content_type?: 'text' | 'html' | 'json' | 'number';
  content: string;
  metadata?: Record<string, unknown>;
  updated_by?: number;
}

export interface UpdatePageContentInput {
  content?: string;
  content_type?: 'text' | 'html' | 'json' | 'number';
  metadata?: Record<string, unknown>;
  updated_by?: number;
}

export interface CreateCollectionInput {
  collection_type: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  content?: Record<string, unknown>;
  image_url?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  updated_by?: number;
}

export interface UpdateCollectionInput {
  title?: string;
  subtitle?: string;
  description?: string;
  content?: Record<string, unknown>;
  image_url?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  updated_by?: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

class ContentServiceImpl extends BaseService {
  protected get serviceName(): string {
    return 'ContentService';
  }

  // --------------------------------------------------------------------------
  // Page Content Methods
  // --------------------------------------------------------------------------

  /**
   * Get all content for a specific page
   */
  async getPageContent(pageSlug: string): Promise<PageContent[]> {
    return this.queryMany<PageContent>(
      `SELECT * FROM page_content WHERE page_slug = $1 ORDER BY section_key`,
      [pageSlug]
    );
  }

  /**
   * Get a specific content section
   */
  async getContentSection(pageSlug: string, sectionKey: string): Promise<PageContent | null> {
    return this.queryOne<PageContent>(
      `SELECT * FROM page_content WHERE page_slug = $1 AND section_key = $2`,
      [pageSlug, sectionKey]
    );
  }

  /**
   * Get content value with type-safe parsing
   */
  async getContentValue<T = string>(pageSlug: string, sectionKey: string): Promise<T | null> {
    const section = await this.getContentSection(pageSlug, sectionKey);
    if (!section) return null;

    switch (section.content_type) {
      case 'number':
        return parseFloat(section.content) as T;
      case 'json':
        return JSON.parse(section.content) as T;
      default:
        return section.content as T;
    }
  }

  /**
   * Get all pages that have content
   */
  async getAvailablePages(): Promise<string[]> {
    const result = await this.queryMany<{ page_slug: string }>(
      `SELECT DISTINCT page_slug FROM page_content ORDER BY page_slug`
    );
    return result.map((r) => r.page_slug);
  }

  /**
   * Create a new content section
   */
  async createContentSection(input: CreatePageContentInput): Promise<PageContent> {
    return this.insert<PageContent>('page_content', {
      page_slug: input.page_slug,
      section_key: input.section_key,
      content_type: input.content_type || 'text',
      content: input.content,
      metadata: JSON.stringify(input.metadata || {}),
      updated_by: input.updated_by || null,
    });
  }

  /**
   * Update a content section
   */
  async updateContentSection(
    pageSlug: string,
    sectionKey: string,
    input: UpdatePageContentInput
  ): Promise<PageContent | null> {
    // Get current value for history
    const current = await this.getContentSection(pageSlug, sectionKey);
    if (!current) return null;

    // Record history if content changed
    if (input.content !== undefined && input.content !== current.content) {
      await this.recordHistory('page_content', current.id, 'content', current.content, input.content, input.updated_by);
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (input.content !== undefined) updates.content = input.content;
    if (input.content_type !== undefined) updates.content_type = input.content_type;
    if (input.metadata !== undefined) updates.metadata = JSON.stringify(input.metadata);
    if (input.updated_by !== undefined) updates.updated_by = input.updated_by;

    if (Object.keys(updates).length === 0) return current;

    const result = await this.queryOne<PageContent>(
      `UPDATE page_content
       SET ${Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ')}
       WHERE page_slug = $${Object.keys(updates).length + 1} AND section_key = $${Object.keys(updates).length + 2}
       RETURNING *`,
      [...Object.values(updates), pageSlug, sectionKey]
    );

    return result;
  }

  /**
   * Upsert a content section (create or update)
   */
  async upsertContentSection(input: CreatePageContentInput): Promise<PageContent> {
    const existing = await this.getContentSection(input.page_slug, input.section_key);
    if (existing) {
      const updated = await this.updateContentSection(input.page_slug, input.section_key, {
        content: input.content,
        content_type: input.content_type,
        metadata: input.metadata,
        updated_by: input.updated_by,
      });
      return updated!;
    }
    return this.createContentSection(input);
  }

  /**
   * Delete a content section
   */
  async deleteContentSection(pageSlug: string, sectionKey: string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM page_content WHERE page_slug = $1 AND section_key = $2`,
      [pageSlug, sectionKey]
    );
    return (result.rowCount || 0) > 0;
  }

  // --------------------------------------------------------------------------
  // Collection Methods
  // --------------------------------------------------------------------------

  /**
   * Get all items in a collection
   */
  async getCollection(collectionType: string, includeInactive = false): Promise<ContentCollection[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';
    return this.queryMany<ContentCollection>(
      `SELECT * FROM content_collections
       WHERE collection_type = $1 ${activeClause}
       ORDER BY sort_order, title`,
      [collectionType]
    );
  }

  /**
   * Get a specific collection item by slug
   */
  async getCollectionItem(collectionType: string, slug: string): Promise<ContentCollection | null> {
    return this.queryOne<ContentCollection>(
      `SELECT * FROM content_collections WHERE collection_type = $1 AND slug = $2`,
      [collectionType, slug]
    );
  }

  /**
   * Get all collection types
   */
  async getCollectionTypes(): Promise<string[]> {
    const result = await this.queryMany<{ collection_type: string }>(
      `SELECT DISTINCT collection_type FROM content_collections ORDER BY collection_type`
    );
    return result.map((r) => r.collection_type);
  }

  /**
   * Create a new collection item
   */
  async createCollectionItem(input: CreateCollectionInput): Promise<ContentCollection> {
    return this.insert<ContentCollection>('content_collections', {
      collection_type: input.collection_type,
      slug: input.slug,
      title: input.title,
      subtitle: input.subtitle || null,
      description: input.description || null,
      content: JSON.stringify(input.content || {}),
      image_url: input.image_url || null,
      icon: input.icon || null,
      sort_order: input.sort_order || 0,
      is_active: input.is_active !== false,
      metadata: JSON.stringify(input.metadata || {}),
      updated_by: input.updated_by || null,
    });
  }

  /**
   * Update a collection item
   */
  async updateCollectionItem(id: number, input: UpdateCollectionInput): Promise<ContentCollection | null> {
    // Get current for history
    const current = await this.findById<ContentCollection>('content_collections', id);
    if (!current) return null;

    // Build update object
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.subtitle !== undefined) updates.subtitle = input.subtitle;
    if (input.description !== undefined) updates.description = input.description;
    if (input.content !== undefined) updates.content = JSON.stringify(input.content);
    if (input.image_url !== undefined) updates.image_url = input.image_url;
    if (input.icon !== undefined) updates.icon = input.icon;
    if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
    if (input.is_active !== undefined) updates.is_active = input.is_active;
    if (input.metadata !== undefined) updates.metadata = JSON.stringify(input.metadata);
    if (input.updated_by !== undefined) updates.updated_by = input.updated_by;

    if (Object.keys(updates).length === 0) return current;

    // Record history for significant changes
    if (input.title !== undefined && input.title !== current.title) {
      await this.recordHistory('content_collections', id, 'title', current.title, input.title, input.updated_by);
    }
    if (input.description !== undefined && input.description !== current.description) {
      await this.recordHistory('content_collections', id, 'description', current.description || '', input.description, input.updated_by);
    }

    return this.update<ContentCollection>('content_collections', id, updates);
  }

  /**
   * Reorder collection items
   */
  async reorderCollection(collectionType: string, orderedIds: number[]): Promise<void> {
    await this.withTransaction(async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await this.query(
          `UPDATE content_collections SET sort_order = $1 WHERE id = $2 AND collection_type = $3`,
          [i, orderedIds[i], collectionType]
        );
      }
    });
  }

  /**
   * Delete a collection item
   */
  async deleteCollectionItem(id: number): Promise<boolean> {
    return this.delete('content_collections', id);
  }

  /**
   * Soft-delete (deactivate) a collection item
   */
  async deactivateCollectionItem(id: number): Promise<boolean> {
    const result = await this.query(
      `UPDATE content_collections SET is_active = false WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  // --------------------------------------------------------------------------
  // History Methods
  // --------------------------------------------------------------------------

  /**
   * Record a content change in history
   */
  private async recordHistory(
    tableName: string,
    recordId: number,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    changedBy?: number
  ): Promise<void> {
    await this.insert('content_history', {
      table_name: tableName,
      record_id: recordId,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      changed_by: changedBy || null,
    });
  }

  /**
   * Get history for a specific record
   */
  async getContentHistory(tableName: string, recordId: number): Promise<ContentHistory[]> {
    return this.queryMany<ContentHistory>(
      `SELECT * FROM content_history
       WHERE table_name = $1 AND record_id = $2
       ORDER BY changed_at DESC
       LIMIT 50`,
      [tableName, recordId]
    );
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  /**
   * Bulk update multiple content sections for a page
   */
  async bulkUpdatePageContent(
    pageSlug: string,
    updates: Array<{ section_key: string; content: string }>,
    updatedBy?: number
  ): Promise<number> {
    let updated = 0;
    await this.withTransaction(async () => {
      for (const update of updates) {
        const result = await this.updateContentSection(pageSlug, update.section_key, {
          content: update.content,
          updated_by: updatedBy,
        });
        if (result) updated++;
      }
    });
    return updated;
  }
}

// Export singleton instance
export const ContentService = new ContentServiceImpl();
