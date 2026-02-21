/**
 * Events Service
 *
 * @module lib/services/events.service
 * @description Manages event CRUD, filtering, and analytics for the events system.
 * Supports both admin management and public-facing event discovery.
 *
 * @features
 * - Public event listing with filtering/pagination
 * - Featured and upcoming event queries
 * - Category management
 * - Admin CRUD with slug generation
 * - View/click analytics tracking
 * - Batch archival of past events
 */

import { BaseService } from './base.service';
import { NotFoundError, ConflictError } from '@/lib/api/middleware/error-handler';
import type {
  Event,
  EventWithCategory,
  EventCategory,
  CreateEventData,
  UpdateEventData,
  EventFilters,
  EventListResult,
  RecurrenceRule,
} from '@/lib/types/events';
import { generateInstanceDates } from '@/lib/utils/recurrence';

export class EventsService extends BaseService {
  protected get serviceName(): string {
    return 'EventsService';
  }

  // ============================================================================
  // Public Queries
  // ============================================================================

  /**
   * List published events with filtering, sorting, and pagination
   */
  async listPublished(filters: EventFilters = {}): Promise<EventListResult> {
    this.log('Listing published events', { filters });

    const conditions: string[] = ['e.status = \'published\'', 'e.start_date >= CURRENT_DATE'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.category) {
      conditions.push(`ec.slug = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(e.title ILIKE $${paramIndex} OR e.short_description ILIKE $${paramIndex} OR e.venue_name ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`e.start_date >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`e.start_date <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.isFree !== undefined) {
      conditions.push(`e.is_free = $${paramIndex}`);
      params.push(filters.isFree);
      paramIndex++;
    }

    if (filters.isFeatured !== undefined) {
      conditions.push(`e.is_featured = $${paramIndex}`);
      params.push(filters.isFeatured);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Count total
    const countSql = `
      SELECT COUNT(*)::text as count
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
    `;
    const total = await this.queryCount(countSql, params);

    // Fetch data
    const dataSql = `
      SELECT e.*,
             ec.name as category_name,
             ec.slug as category_slug,
             ec.icon as category_icon
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
      ORDER BY e.is_featured DESC, e.feature_priority DESC, e.start_date ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const data = await this.queryMany<EventWithCategory>(dataSql, [...params, limit, offset]);

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Get featured events for homepage hero
   */
  async getFeatured(limit: number = 4): Promise<EventWithCategory[]> {
    this.log('Getting featured events', { limit });

    return this.queryMany<EventWithCategory>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.status = 'published'
         AND e.is_featured = true
         AND e.start_date >= CURRENT_DATE
       ORDER BY e.feature_priority DESC, e.start_date ASC
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * Get next N upcoming events
   */
  async getUpcoming(limit: number = 10): Promise<EventWithCategory[]> {
    this.log('Getting upcoming events', { limit });

    return this.queryMany<EventWithCategory>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.status = 'published'
         AND e.start_date >= CURRENT_DATE
       ORDER BY e.start_date ASC, e.start_time ASC NULLS LAST
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * Get single event by slug (published only)
   */
  async getBySlug(slug: string): Promise<EventWithCategory | null> {
    this.log('Getting event by slug', { slug });

    return this.queryOne<EventWithCategory>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.slug = $1 AND e.status = 'published'`,
      [slug]
    );
  }

  /**
   * Get events filtered by category slug
   */
  async getByCategory(categorySlug: string, limit: number = 20, offset: number = 0): Promise<EventListResult> {
    this.log('Getting events by category', { categorySlug });

    const conditions = [
      'e.status = \'published\'',
      'e.start_date >= CURRENT_DATE',
      'ec.slug = $1',
    ];
    const whereClause = conditions.join(' AND ');

    const countSql = `
      SELECT COUNT(*)::text as count
      FROM events e
      JOIN event_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
    `;
    const total = await this.queryCount(countSql, [categorySlug]);

    const dataSql = `
      SELECT e.*,
             ec.name as category_name,
             ec.slug as category_slug,
             ec.icon as category_icon
      FROM events e
      JOIN event_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
      ORDER BY e.start_date ASC
      LIMIT $2 OFFSET $3
    `;
    const data = await this.queryMany<EventWithCategory>(dataSql, [categorySlug, limit, offset]);

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Get all active categories
   */
  async getCategories(): Promise<EventCategory[]> {
    this.log('Getting all categories');

    return this.queryMany<EventCategory>(
      `SELECT * FROM event_categories
       WHERE is_active = true
       ORDER BY display_order ASC`
    );
  }

  /**
   * Get a single category by slug
   */
  async getCategoryBySlug(slug: string): Promise<EventCategory | null> {
    return this.queryOne<EventCategory>(
      `SELECT * FROM event_categories WHERE slug = $1 AND is_active = true`,
      [slug]
    );
  }

  // ============================================================================
  // Admin CRUD
  // ============================================================================

  /**
   * List all events (any status) for admin
   */
  async listAll(filters: EventFilters = {}): Promise<EventListResult> {
    this.log('Admin listing all events', { filters });

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`e.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.category) {
      conditions.push(`ec.slug = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(e.title ILIKE $${paramIndex} OR e.short_description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const countSql = `
      SELECT COUNT(*)::text as count
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
    `;
    const total = await this.queryCount(countSql, params);

    const dataSql = `
      SELECT e.*,
             ec.name as category_name,
             ec.slug as category_slug,
             ec.icon as category_icon
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const data = await this.queryMany<EventWithCategory>(dataSql, [...params, limit, offset]);

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Get event by ID (any status, for admin)
   */
  async getById(id: number): Promise<EventWithCategory | null> {
    return this.queryOne<EventWithCategory>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.id = $1`,
      [id]
    );
  }

  /**
   * Create a new event
   */
  async create(data: CreateEventData, userId: number): Promise<Event> {
    this.log('Creating event', { title: data.title, userId });

    const slug = await this.generateSlug(data.title);

    const eventData: Record<string, unknown> = {
      title: data.title,
      slug,
      short_description: data.short_description || null,
      description: data.description,
      category_id: data.category_id || null,
      tags: data.tags || null,
      start_date: data.start_date,
      end_date: data.end_date || null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      is_all_day: data.is_all_day || false,
      venue_name: data.venue_name || null,
      address: data.address || null,
      city: data.city || 'Walla Walla',
      state: data.state || 'WA',
      zip: data.zip || null,
      featured_image_url: data.featured_image_url || null,
      gallery_urls: data.gallery_urls || null,
      is_free: data.is_free ?? true,
      price_min: data.price_min || null,
      price_max: data.price_max || null,
      ticket_url: data.ticket_url || null,
      organizer_name: data.organizer_name || null,
      organizer_website: data.organizer_website || null,
      organizer_email: data.organizer_email || null,
      organizer_phone: data.organizer_phone || null,
      is_featured: data.is_featured || false,
      feature_priority: data.feature_priority || 0,
      meta_title: data.meta_title || data.title,
      meta_description: data.meta_description || data.short_description || null,
      status: 'draft',
      created_by: userId,
    };

    return this.insert<Event>('events', eventData);
  }

  /**
   * Update an event
   */
  async updateEvent(id: number, data: UpdateEventData): Promise<Event | null> {
    this.log('Updating event', { id });

    const existing = await this.findById<Event>('events', id);
    if (!existing) {
      throw new NotFoundError('Event not found');
    }

    // Build update data, only include provided fields
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'short_description', 'description', 'category_id', 'tags',
      'start_date', 'end_date', 'start_time', 'end_time', 'is_all_day',
      'venue_name', 'address', 'city', 'state', 'zip',
      'featured_image_url', 'gallery_urls',
      'is_free', 'price_min', 'price_max', 'ticket_url',
      'organizer_name', 'organizer_website', 'organizer_email', 'organizer_phone',
      'is_featured', 'feature_priority',
      'meta_title', 'meta_description', 'status',
    ];

    for (const field of allowedFields) {
      if (field in data && data[field as keyof UpdateEventData] !== undefined) {
        updateData[field] = data[field as keyof UpdateEventData];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    return this.update<Event>('events', id, updateData);
  }

  /**
   * Publish an event
   */
  async publish(id: number): Promise<Event | null> {
    this.log('Publishing event', { id });

    const event = await this.findById<Event>('events', id);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return this.queryOne<Event>(
      `UPDATE events
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
  }

  /**
   * Cancel an event
   */
  async cancel(id: number): Promise<Event | null> {
    this.log('Cancelling event', { id });

    const event = await this.findById<Event>('events', id);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return this.queryOne<Event>(
      `UPDATE events
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
  }

  /**
   * Delete an event (hard delete, admin only)
   */
  async deleteEvent(id: number): Promise<boolean> {
    this.log('Deleting event', { id });

    const event = await this.findById<Event>('events', id);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return this.delete('events', id);
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Increment view count
   */
  async trackView(id: number): Promise<void> {
    await this.query(
      `UPDATE events SET view_count = view_count + 1 WHERE id = $1`,
      [id]
    );
  }

  /**
   * Increment click count (ticket link clicks)
   */
  async trackClick(id: number): Promise<void> {
    await this.query(
      `UPDATE events SET click_count = click_count + 1 WHERE id = $1`,
      [id]
    );
  }

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Generate a URL-safe slug from title with uniqueness check
   */
  async generateSlug(title: string): Promise<string> {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);

    // Check uniqueness
    const existing = await this.exists('events', 'slug = $1', [slug]);
    if (existing) {
      // Append a short random suffix
      const suffix = Date.now().toString(36).slice(-4);
      slug = `${slug}-${suffix}`;

      // Double-check uniqueness (extremely unlikely to collide)
      const stillExists = await this.exists('events', 'slug = $1', [slug]);
      if (stillExists) {
        throw new ConflictError('Could not generate unique slug. Try a different title.');
      }
    }

    return slug;
  }

  // ============================================================================
  // Recurring Events
  // ============================================================================

  /**
   * Create a recurring event series.
   * Creates a parent (template, status=draft, is_recurring=true) and
   * N child instances with their own start_date and slug.
   */
  async createRecurringEvent(
    data: CreateEventData,
    userId: number
  ): Promise<{ parent: Event; instanceCount: number }> {
    this.log('Creating recurring event', { title: data.title, userId });

    if (!data.recurrence_rule) {
      throw new Error('Recurrence rule is required for recurring events');
    }

    const rule = data.recurrence_rule as RecurrenceRule;
    const instanceDates = generateInstanceDates(data.start_date, rule);

    return this.withTransaction(async (client) => {
      // Create parent event (template — stays draft, never shown publicly)
      const parentSlug = await this.generateSlug(data.title);

      const parentData: Record<string, unknown> = {
        title: data.title,
        slug: parentSlug,
        short_description: data.short_description || null,
        description: data.description,
        category_id: data.category_id || null,
        tags: data.tags || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        is_all_day: data.is_all_day || false,
        venue_name: data.venue_name || null,
        address: data.address || null,
        city: data.city || 'Walla Walla',
        state: data.state || 'WA',
        zip: data.zip || null,
        featured_image_url: data.featured_image_url || null,
        gallery_urls: data.gallery_urls || null,
        is_free: data.is_free ?? true,
        price_min: data.price_min || null,
        price_max: data.price_max || null,
        ticket_url: data.ticket_url || null,
        organizer_name: data.organizer_name || null,
        organizer_website: data.organizer_website || null,
        organizer_email: data.organizer_email || null,
        organizer_phone: data.organizer_phone || null,
        is_featured: data.is_featured || false,
        feature_priority: data.feature_priority || 0,
        meta_title: data.meta_title || data.title,
        meta_description: data.meta_description || data.short_description || null,
        status: 'draft',
        is_recurring: true,
        recurrence_rule: JSON.stringify(rule),
        created_by: userId,
      };

      const parentKeys = Object.keys(parentData);
      const parentValues = Object.values(parentData);
      const parentPlaceholders = parentKeys.map((_, i) => `$${i + 1}`).join(', ');
      const parentColumns = parentKeys.join(', ');

      const parentResult = await client(
        `INSERT INTO events (${parentColumns}) VALUES (${parentPlaceholders}) RETURNING *`,
        parentValues
      );
      const parent = parentResult.rows[0] as Event;

      // Calculate day span for multi-day events
      let daySpan = 0;
      if (data.end_date && data.start_date) {
        const startMs = new Date(data.start_date + 'T00:00:00').getTime();
        const endMs = new Date(data.end_date + 'T00:00:00').getTime();
        daySpan = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      }

      // Create child instances
      for (const instanceDate of instanceDates) {
        const instanceSlug = `${parentSlug}-${instanceDate}`;

        let instanceEndDate: string | null = null;
        if (daySpan > 0) {
          const d = new Date(instanceDate + 'T00:00:00');
          d.setDate(d.getDate() + daySpan);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          instanceEndDate = `${year}-${month}-${day}`;
        }

        const childData: Record<string, unknown> = {
          title: data.title,
          slug: instanceSlug,
          short_description: data.short_description || null,
          description: data.description,
          category_id: data.category_id || null,
          tags: data.tags || null,
          start_date: instanceDate,
          end_date: instanceEndDate,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          is_all_day: data.is_all_day || false,
          venue_name: data.venue_name || null,
          address: data.address || null,
          city: data.city || 'Walla Walla',
          state: data.state || 'WA',
          zip: data.zip || null,
          featured_image_url: data.featured_image_url || null,
          gallery_urls: data.gallery_urls || null,
          is_free: data.is_free ?? true,
          price_min: data.price_min || null,
          price_max: data.price_max || null,
          ticket_url: data.ticket_url || null,
          organizer_name: data.organizer_name || null,
          organizer_website: data.organizer_website || null,
          organizer_email: data.organizer_email || null,
          organizer_phone: data.organizer_phone || null,
          is_featured: data.is_featured || false,
          feature_priority: data.feature_priority || 0,
          meta_title: data.meta_title || data.title,
          meta_description: data.meta_description || data.short_description || null,
          status: 'draft',
          parent_event_id: parent.id,
          created_by: userId,
        };

        const childKeys = Object.keys(childData);
        const childValues = Object.values(childData);
        const childPlaceholders = childKeys.map((_, i) => `$${i + 1}`).join(', ');
        const childColumns = childKeys.join(', ');

        await client(
          `INSERT INTO events (${childColumns}) VALUES (${childPlaceholders})`,
          childValues
        );
      }

      this.log('Created recurring event series', {
        parentId: parent.id,
        instanceCount: instanceDates.length,
      });

      return { parent, instanceCount: instanceDates.length };
    });
  }

  /**
   * Update all future, non-overridden instances in a recurring series.
   * Also updates the parent template.
   */
  async updateRecurringSeries(parentId: number, data: UpdateEventData): Promise<Event | null> {
    this.log('Updating recurring series', { parentId });

    const parent = await this.findById<Event>('events', parentId);
    if (!parent) {
      throw new NotFoundError('Parent event not found');
    }

    // Build update fields
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'short_description', 'description', 'category_id', 'tags',
      'start_time', 'end_time', 'is_all_day',
      'venue_name', 'address', 'city', 'state', 'zip',
      'featured_image_url', 'gallery_urls',
      'is_free', 'price_min', 'price_max', 'ticket_url',
      'organizer_name', 'organizer_website', 'organizer_email', 'organizer_phone',
      'is_featured', 'feature_priority',
      'meta_title', 'meta_description',
    ];

    for (const field of allowedFields) {
      if (field in data && data[field as keyof UpdateEventData] !== undefined) {
        updateData[field] = data[field as keyof UpdateEventData];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return parent;
    }

    // Update parent
    await this.update<Event>('events', parentId, updateData);

    // Update future non-overridden children
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(parentId);

    await this.query(
      `UPDATE events
       SET ${setClauses.join(', ')}
       WHERE parent_event_id = $${paramIndex}
         AND start_date >= CURRENT_DATE
         AND is_instance_override = false`,
      values
    );

    return this.findById<Event>('events', parentId);
  }

  /**
   * Update a single instance and mark it as overridden.
   */
  async updateSingleInstance(instanceId: number, data: UpdateEventData): Promise<Event | null> {
    this.log('Updating single instance', { instanceId });

    const event = await this.updateEvent(instanceId, data);

    // Mark as overridden so series-wide updates skip it
    await this.query(
      `UPDATE events SET is_instance_override = true WHERE id = $1`,
      [instanceId]
    );

    return event;
  }

  /**
   * Cancel all future instances in a recurring series.
   */
  async cancelRecurringSeries(parentId: number): Promise<void> {
    this.log('Cancelling recurring series', { parentId });

    // Cancel future children
    await this.query(
      `UPDATE events
       SET status = 'cancelled', updated_at = NOW()
       WHERE parent_event_id = $1
         AND start_date >= CURRENT_DATE`,
      [parentId]
    );

    // Cancel parent
    await this.query(
      `UPDATE events
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [parentId]
    );
  }

  /**
   * Publish all future instances in a recurring series.
   * Parent stays draft (never shown publicly).
   */
  async publishRecurringSeries(parentId: number): Promise<void> {
    this.log('Publishing recurring series', { parentId });

    await this.query(
      `UPDATE events
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE parent_event_id = $1
         AND start_date >= CURRENT_DATE
         AND status IN ('draft', 'pending_review')`,
      [parentId]
    );
  }

  /**
   * Get all instances for a recurring series parent.
   */
  async getSeriesInstances(parentId: number): Promise<EventWithCategory[]> {
    this.log('Getting series instances', { parentId });

    return this.queryMany<EventWithCategory>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.parent_event_id = $1
       ORDER BY e.start_date ASC`,
      [parentId]
    );
  }

  /**
   * Get future sibling instances for a given child event.
   * Used on the public detail page for "Other dates in this series".
   */
  async getSeriesSiblings(instanceId: number): Promise<EventWithCategory[]> {
    this.log('Getting series siblings', { instanceId });

    // First find the parent
    const instance = await this.findById<Event>('events', instanceId);
    if (!instance || !instance.parent_event_id) {
      return [];
    }

    return this.queryMany<EventWithCategory>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.parent_event_id = $1
         AND e.id != $2
         AND e.status = 'published'
         AND e.start_date >= CURRENT_DATE
       ORDER BY e.start_date ASC`,
      [instance.parent_event_id, instanceId]
    );
  }

  /**
   * Batch update past events to 'past' status
   * Intended to be called by a cron job or scheduled task
   */
  async archivePastEvents(): Promise<number> {
    this.log('Archiving past events');

    const result = await this.query(
      `UPDATE events
       SET status = 'past', updated_at = NOW()
       WHERE status = 'published'
         AND (
           (end_date IS NOT NULL AND end_date < CURRENT_DATE)
           OR (end_date IS NULL AND start_date < CURRENT_DATE)
         )
       RETURNING id`
    );

    const count = result.rowCount || 0;
    this.log('Archived past events', { count });
    return count;
  }
}

export const eventsService = new EventsService();
