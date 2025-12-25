/**
 * Wine Directory Service
 * Extended winery functionality including wines, events, and AI-ready content
 */

import { BaseService } from './base.service';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// Types
// ============================================================================

export interface Wine {
  id: number;
  winery_id: number;
  name: string;
  vintage: number | null;
  slug?: string;
  status: 'current_release' | 'library' | 'sold_out' | 'upcoming' | 'archive';
  is_club_exclusive: boolean;
  is_featured: boolean;
  varietals: Array<{ name: string; percentage: number }>;
  ava?: string;
  official_tasting_notes?: string;
  aroma_profile?: {
    primary?: string[];
    secondary?: string[];
    tertiary?: string[];
  };
  palate_profile?: {
    body?: string;
    tannin?: string;
    acidity?: string;
    finish?: string;
  };
  food_pairings?: string[];
  price?: number;
  club_price?: number;
  alcohol_pct?: number;
  awards?: Array<{ award: string; competition: string; year: number }>;
  ratings?: Array<{ publication: string; score: number; reviewer?: string }>;
  vintage_story?: string;
  winemaker_notes?: string;
  bottle_image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WineryContent {
  id: number;
  winery_id: number;
  content_type: 'backstory' | 'philosophy' | 'winemaker_bio' | 'tasting_notes' | 'visitor_tips' | 'signature_experience';
  title?: string;
  content: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface WineryPerson {
  id: number;
  winery_id: number;
  name: string;
  role: 'owner' | 'winemaker' | 'tasting_room_manager' | string;
  bio?: string;
  photo_url?: string;
  email?: string;
}

export interface WineryFAQ {
  id: number;
  winery_id: number;
  question: string;
  answer: string;
  category?: 'visiting' | 'wines' | 'history' | 'general';
}

export interface Event {
  id: number;
  source: string;
  source_url?: string;
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  tags?: string[];
  start_date: Date;
  end_date?: Date;
  start_time?: string;
  end_time?: string;
  is_all_day: boolean;
  venue_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_virtual: boolean;
  virtual_url?: string;
  winery_id?: number;
  business_id?: number;
  price_info?: string;
  ticket_url?: string;
  image_url?: string;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
}

export interface CreateWineData {
  winery_id: number;
  name: string;
  vintage?: number;
  varietals?: Array<{ name: string; percentage: number }>;
  ava?: string;
  official_tasting_notes?: string;
  price?: number;
  alcohol_pct?: number;
  status?: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  category?: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  venue_name?: string;
  address?: string;
  winery_id?: number;
  business_id?: number;
  price_info?: string;
  ticket_url?: string;
  image_url?: string;
}

// ============================================================================
// Service
// ============================================================================

export class WineDirectoryService extends BaseService {
  protected get serviceName(): string {
    return 'WineDirectoryService';
  }

  // ============================================================================
  // Wine Operations
  // ============================================================================

  /**
   * List wines, optionally filtered by winery
   */
  async listWines(wineryId?: number, limit: number = 50): Promise<Wine[]> {
    this.log('Listing wines', { wineryId });

    let sql = `
      SELECT w.*, wy.name as winery_name
      FROM wines w
      LEFT JOIN wineries wy ON w.winery_id = wy.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (wineryId) {
      params.push(wineryId);
      sql += ` AND w.winery_id = $${params.length}`;
    }

    sql += ` ORDER BY w.vintage DESC NULLS LAST, w.name ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    return this.queryMany<Wine>(sql, params);
  }

  /**
   * Get wine by ID
   */
  async getWineById(id: number): Promise<Wine> {
    const wine = await this.queryOne<Wine>(
      `SELECT w.*, wy.name as winery_name
       FROM wines w
       LEFT JOIN wineries wy ON w.winery_id = wy.id
       WHERE w.id = $1`,
      [id]
    );

    if (!wine) {
      throw new NotFoundError(`Wine not found: ${id}`);
    }

    return wine;
  }

  /**
   * Get featured wines
   */
  async getFeaturedWines(limit: number = 10): Promise<Wine[]> {
    return this.queryMany<Wine>(
      `SELECT w.*, wy.name as winery_name
       FROM wines w
       LEFT JOIN wineries wy ON w.winery_id = wy.id
       WHERE w.is_featured = TRUE AND w.status = 'current_release'
       ORDER BY w.created_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * Create a new wine
   */
  async createWine(data: CreateWineData): Promise<Wine> {
    this.log('Creating wine', { name: data.name, wineryId: data.winery_id });

    if (!data.name || !data.winery_id) {
      throw new BadRequestError('Name and winery_id are required');
    }

    // Generate slug
    const slug = `${data.name}-${data.vintage || 'nv'}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return this.insert<Wine>('wines', {
      winery_id: data.winery_id,
      name: data.name,
      vintage: data.vintage,
      slug,
      varietals: JSON.stringify(data.varietals || []),
      ava: data.ava,
      official_tasting_notes: data.official_tasting_notes,
      price: data.price,
      alcohol_pct: data.alcohol_pct,
      status: data.status || 'current_release',
      is_featured: false,
      is_club_exclusive: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Search wines
   */
  async searchWines(query: string, limit: number = 20): Promise<Wine[]> {
    this.log('Searching wines', { query });

    return this.queryMany<Wine>(
      `SELECT w.*, wy.name as winery_name
       FROM wines w
       LEFT JOIN wineries wy ON w.winery_id = wy.id
       WHERE w.name ILIKE $1
          OR wy.name ILIKE $1
          OR w.ava ILIKE $1
          OR w.official_tasting_notes ILIKE $1
       ORDER BY w.is_featured DESC, w.name ASC
       LIMIT $2`,
      [`%${query}%`, limit]
    );
  }

  // ============================================================================
  // Content Operations (RAG-ready)
  // ============================================================================

  /**
   * List winery content
   */
  async getWineryContent(wineryId: number): Promise<WineryContent[]> {
    return this.queryMany<WineryContent>(
      `SELECT * FROM winery_content WHERE winery_id = $1 ORDER BY content_type, created_at`,
      [wineryId]
    );
  }

  /**
   * Add content to winery
   */
  async addWineryContent(
    wineryId: number,
    contentType: string,
    content: string,
    title?: string,
    metadata?: Record<string, any>
  ): Promise<WineryContent> {
    this.log('Adding winery content', { wineryId, contentType });

    return this.insert<WineryContent>('winery_content', {
      winery_id: wineryId,
      content_type: contentType,
      title,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get winery people (owners, winemakers)
   */
  async getWineryPeople(wineryId: number): Promise<WineryPerson[]> {
    return this.queryMany<WineryPerson>(
      `SELECT * FROM winery_people WHERE winery_id = $1 ORDER BY 
       CASE role WHEN 'owner' THEN 1 WHEN 'winemaker' THEN 2 ELSE 3 END`,
      [wineryId]
    );
  }

  /**
   * Add person to winery
   */
  async addWineryPerson(
    wineryId: number,
    name: string,
    role: string,
    bio?: string,
    photoUrl?: string
  ): Promise<WineryPerson> {
    return this.insert<WineryPerson>('winery_people', {
      winery_id: wineryId,
      name,
      role,
      bio,
      photo_url: photoUrl,
      created_at: new Date(),
    });
  }

  /**
   * Get winery FAQs
   */
  async getWineryFAQs(wineryId: number): Promise<WineryFAQ[]> {
    return this.queryMany<WineryFAQ>(
      `SELECT * FROM winery_faqs WHERE winery_id = $1 ORDER BY category, id`,
      [wineryId]
    );
  }

  /**
   * Add FAQ to winery
   */
  async addWineryFAQ(
    wineryId: number,
    question: string,
    answer: string,
    category?: string
  ): Promise<WineryFAQ> {
    return this.insert<WineryFAQ>('winery_faqs', {
      winery_id: wineryId,
      question,
      answer,
      category,
      created_at: new Date(),
    });
  }

  // ============================================================================
  // Event Operations
  // ============================================================================

  /**
   * List upcoming events
   */
  async listUpcomingEvents(limit: number = 20): Promise<Event[]> {
    return this.queryMany<Event>(
      `SELECT e.*, w.name as winery_name, b.name as business_name
       FROM events e
       LEFT JOIN wineries w ON e.winery_id = w.id
       LEFT JOIN businesses b ON e.business_id = b.id
       WHERE e.is_active = TRUE AND e.start_date >= CURRENT_DATE
       ORDER BY e.start_date ASC, e.start_time ASC NULLS LAST
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * List events by date range
   */
  async listEventsByDateRange(
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    this.log('Listing events', { startDate, endDate, category });

    let sql = `
      SELECT e.*, w.name as winery_name, b.name as business_name
      FROM events e
      LEFT JOIN wineries w ON e.winery_id = w.id
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.is_active = TRUE
        AND e.start_date >= $1
        AND e.start_date <= $2
    `;
    const params: any[] = [startDate, endDate];

    if (category) {
      params.push(category);
      sql += ` AND e.category = $${params.length}`;
    }

    sql += ` ORDER BY e.start_date ASC, e.start_time ASC NULLS LAST`;

    return this.queryMany<Event>(sql, params);
  }

  /**
   * Get event by ID
   */
  async getEventById(id: number): Promise<Event> {
    const event = await this.queryOne<Event>(
      `SELECT e.*, w.name as winery_name, b.name as business_name
       FROM events e
       LEFT JOIN wineries w ON e.winery_id = w.id
       LEFT JOIN businesses b ON e.business_id = b.id
       WHERE e.id = $1`,
      [id]
    );

    if (!event) {
      throw new NotFoundError(`Event not found: ${id}`);
    }

    return event;
  }

  /**
   * Get winery events
   */
  async getWineryEvents(wineryId: number): Promise<Event[]> {
    return this.queryMany<Event>(
      `SELECT * FROM events 
       WHERE winery_id = $1 AND is_active = TRUE AND start_date >= CURRENT_DATE
       ORDER BY start_date ASC`,
      [wineryId]
    );
  }

  /**
   * Create an event
   */
  async createEvent(data: CreateEventData): Promise<Event> {
    this.log('Creating event', { title: data.title });

    if (!data.title || !data.start_date) {
      throw new BadRequestError('Title and start_date are required');
    }

    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 200);

    return this.insert<Event>('events', {
      source: 'manual',
      title: data.title,
      slug,
      description: data.description,
      category: data.category,
      start_date: data.start_date,
      end_date: data.end_date,
      start_time: data.start_time,
      end_time: data.end_time,
      is_all_day: data.is_all_day || false,
      venue_name: data.venue_name,
      address: data.address,
      winery_id: data.winery_id,
      business_id: data.business_id,
      price_info: data.price_info,
      ticket_url: data.ticket_url,
      image_url: data.image_url,
      is_verified: true,
      is_featured: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get featured events
   */
  async getFeaturedEvents(limit: number = 5): Promise<Event[]> {
    return this.queryMany<Event>(
      `SELECT e.*, w.name as winery_name
       FROM events e
       LEFT JOIN wineries w ON e.winery_id = w.id
       WHERE e.is_active = TRUE 
         AND e.is_featured = TRUE 
         AND e.start_date >= CURRENT_DATE
       ORDER BY e.start_date ASC
       LIMIT $1`,
      [limit]
    );
  }

  // ============================================================================
  // Search & Discovery
  // ============================================================================

  /**
   * Full-text search across directory
   */
  async search(query: string, limit: number = 20): Promise<{
    wineries: any[];
    wines: Wine[];
    events: Event[];
  }> {
    this.log('Searching directory', { query });

    const searchPattern = `%${query}%`;

    const [wineries, wines, events] = await Promise.all([
      this.queryMany(
        `SELECT id, name, slug, short_description, city, is_featured
         FROM wineries
         WHERE name ILIKE $1 OR description ILIKE $1 OR specialties::text ILIKE $1
         ORDER BY is_featured DESC, name ASC
         LIMIT $2`,
        [searchPattern, limit]
      ),
      this.searchWines(query, limit),
      this.queryMany<Event>(
        `SELECT id, title, category, start_date, venue_name
         FROM events
         WHERE is_active = TRUE AND start_date >= CURRENT_DATE
           AND (title ILIKE $1 OR description ILIKE $1)
         ORDER BY start_date ASC
         LIMIT $2`,
        [searchPattern, limit]
      ),
    ]);

    return { wineries, wines, events };
  }

  /**
   * Get winery with all related data
   */
  async getWineryComplete(wineryId: number): Promise<{
    winery: any;
    wines: Wine[];
    content: WineryContent[];
    people: WineryPerson[];
    faqs: WineryFAQ[];
    events: Event[];
  }> {
    this.log('Getting complete winery data', { wineryId });

    const [winery, wines, content, people, faqs, events] = await Promise.all([
      this.queryOne('SELECT * FROM wineries WHERE id = $1', [wineryId]),
      this.listWines(wineryId),
      this.getWineryContent(wineryId),
      this.getWineryPeople(wineryId),
      this.getWineryFAQs(wineryId),
      this.getWineryEvents(wineryId),
    ]);

    if (!winery) {
      throw new NotFoundError(`Winery not found: ${wineryId}`);
    }

    return { winery, wines, content, people, faqs, events };
  }
}

export const wineDirectoryService = new WineDirectoryService();







