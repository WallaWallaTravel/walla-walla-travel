/**
 * Partner Context Service
 *
 * @module lib/services/partner-context.service
 * @description Aggregates and filters partner business data for AI chat context.
 * Queries wineries, restaurants, hotels, and activities to provide real-time
 * partner data that the AI uses for recommendations.
 *
 * @features
 * - Filters businesses by group size, occasion, and preferences
 * - Enriches partner data with insider tips and stories
 * - Formats data for AI system prompt injection
 * - Prioritizes partners over non-partners
 */

import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export interface TripContext {
  partySize?: number;
  dates?: string;
  occasion?: string;
  winePreferences?: string[];
  pace?: string;
}

interface WineryForContext {
  id: number;
  name: string;
  slug: string;
  description: string;
  wine_styles: string[];
  tasting_fee: number;
  tasting_fee_waived: string | null;
  reservation_required: boolean;
  hours: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  experience_tags: string[];
  max_group_size: number | null;
  rating: number | null;
  is_partner: boolean;
}

interface WineryContent {
  winery_id: number;
  content_type: string;
  content: string;
}

interface WineryInsiderTip {
  winery_id: number;
  tip_type: string;
  title: string | null;
  content: string;
}

interface RestaurantForContext {
  id: number;
  name: string;
  cuisine_type: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  is_partner: boolean;
}

interface HotelForContext {
  id: number;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  amenities: string[] | null;
  is_partner: boolean;
}

export interface PartnerContext {
  wineries: Array<WineryForContext & {
    insider_tips: WineryInsiderTip[];
    content: WineryContent[];
  }>;
  restaurants: RestaurantForContext[];
  hotels: HotelForContext[];
  activities: unknown[]; // Placeholder for future business types
}

// ============================================================================
// Service
// ============================================================================

class PartnerContextService extends BaseService {
  protected get serviceName(): string {
    return 'PartnerContextService';
  }

  /**
   * Get all relevant partner data for AI context, filtered by trip context
   */
  async getRelevantPartners(tripContext?: TripContext): Promise<PartnerContext> {
    this.log('Fetching partner context', { tripContext });

    const [wineries, restaurants, hotels] = await Promise.all([
      this.getWineries(tripContext),
      this.getRestaurants(),
      this.getHotels(),
    ]);

    // Enrich wineries with content and tips (only for partners)
    const partnerWineryIds = wineries
      .filter(w => w.is_partner)
      .map(w => w.id);

    const [allContent, allTips] = partnerWineryIds.length > 0
      ? await Promise.all([
          this.getWineryContent(partnerWineryIds),
          this.getWineryInsiderTips(partnerWineryIds),
        ])
      : [[], []];

    // Group content and tips by winery
    const contentByWinery = this.groupByWineryId(allContent);
    const tipsByWinery = this.groupByWineryId(allTips);

    const enrichedWineries = wineries.map(winery => ({
      ...winery,
      insider_tips: (tipsByWinery[winery.id] || []) as WineryInsiderTip[],
      content: (contentByWinery[winery.id] || []) as WineryContent[],
    }));

    return {
      wineries: enrichedWineries,
      restaurants,
      hotels,
      activities: [], // Placeholder for future
    };
  }

  /**
   * Get wineries filtered by trip context
   */
  private async getWineries(tripContext?: TripContext): Promise<WineryForContext[]> {
    let query = `
      SELECT
        w.id,
        w.name,
        w.slug,
        COALESCE(w.description, w.short_description, '') as description,
        COALESCE(w.specialties, ARRAY[]::text[]) as wine_styles,
        COALESCE(w.tasting_fee, 0)::numeric as tasting_fee,
        CASE WHEN w.tasting_fee_waived_with_purchase THEN 'Waived with purchase' ELSE NULL END as tasting_fee_waived,
        COALESCE(w.reservation_required, false) as reservation_required,
        w.hours_of_operation::text as hours,
        w.address,
        w.phone,
        w.website,
        COALESCE(w.experience_tags, ARRAY[]::text[]) as experience_tags,
        w.max_group_size,
        w.average_rating as rating,
        CASE
          WHEN pp.id IS NOT NULL THEN true
          ELSE false
        END as is_partner
      FROM wineries w
      LEFT JOIN partner_profiles pp ON pp.winery_id = w.id AND pp.status = 'active'
      WHERE COALESCE(w.is_active, true) = true
        AND pp.id IS NOT NULL
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    // Filter by group size
    if (tripContext?.partySize) {
      query += ` AND (w.max_group_size IS NULL OR w.max_group_size >= $${paramIndex})`;
      params.push(tripContext.partySize);
      paramIndex++;
    }

    // Order by: partners first, then by rating
    query += ` ORDER BY is_partner DESC, w.average_rating DESC NULLS LAST, w.name ASC`;

    const result = await this.queryMany<WineryForContext>(query, params);
    return result;
  }

  /**
   * Get winery content (stories, philosophy) for enrichment
   */
  private async getWineryContent(wineryIds: number[]): Promise<WineryContent[]> {
    if (wineryIds.length === 0) return [];

    const result = await this.queryMany<WineryContent>(
      `SELECT winery_id, content_type, content
       FROM winery_content
       WHERE winery_id = ANY($1)
         AND content_type IN ('origin_story', 'philosophy', 'unique_story')
         AND LENGTH(content) >= 50
       ORDER BY winery_id, content_type`,
      [wineryIds]
    );
    return result;
  }

  /**
   * Get winery insider tips
   */
  private async getWineryInsiderTips(wineryIds: number[]): Promise<WineryInsiderTip[]> {
    if (wineryIds.length === 0) return [];

    const result = await this.queryMany<WineryInsiderTip>(
      `SELECT winery_id, tip_type, title, content
       FROM winery_insider_tips
       WHERE winery_id = ANY($1)
       ORDER BY winery_id, is_featured DESC, display_order ASC`,
      [wineryIds]
    );
    return result;
  }

  /**
   * Get restaurants
   */
  private async getRestaurants(): Promise<RestaurantForContext[]> {
    // Check if partner_profiles has restaurant links
    const result = await this.queryMany<RestaurantForContext>(
      `SELECT
        r.id,
        r.name,
        r.cuisine_type,
        r.address,
        r.phone,
        r.website,
        CASE
          WHEN pp.id IS NOT NULL THEN true
          ELSE COALESCE(r.is_partner, false)
        END as is_partner
      FROM restaurants r
      LEFT JOIN partner_profiles pp ON pp.restaurant_id = r.id AND pp.status = 'active'
      WHERE r.is_active = true AND pp.id IS NOT NULL
      ORDER BY is_partner DESC, r.name ASC`
    );
    return result;
  }

  /**
   * Get hotels
   */
  private async getHotels(): Promise<HotelForContext[]> {
    const result = await this.queryMany<HotelForContext>(
      `SELECT
        h.id,
        h.name,
        h.type,
        h.address,
        h.city,
        h.phone,
        h.website,
        h.amenities,
        CASE
          WHEN pp.id IS NOT NULL THEN true
          ELSE false
        END as is_partner
      FROM hotels h
      LEFT JOIN partner_profiles pp ON pp.hotel_id = h.id AND pp.status = 'active'
      WHERE h.is_active = true AND pp.id IS NOT NULL
      ORDER BY is_partner DESC, h.display_order ASC, h.name ASC`
    );
    return result;
  }

  // Wineries that exist in data but CANNOT be visited - for answering questions only
  private static readonly NO_PUBLIC_ACCESS_WINERIES = [
    'leonetti cellar',
    'cayuse vineyards',
    'cayuse',
    'quilceda creek',
  ];

  /**
   * Check if a winery has no public access
   */
  private isNoPublicAccess(wineryName: string): boolean {
    return PartnerContextService.NO_PUBLIC_ACCESS_WINERIES.includes(wineryName.toLowerCase());
  }

  /**
   * Format partner context for AI system prompt
   */
  formatForAIPrompt(context: PartnerContext, tripContext?: TripContext): string {
    const sections: string[] = [];

    // Header
    sections.push('## PARTNER BUSINESSES — YOUR COMPLETE BUSINESS KNOWLEDGE\n');
    sections.push('You may ONLY mention businesses listed below. For any other business: "I don\'t have details on that one."\n');

    if (tripContext?.partySize) {
      sections.push(`*Filtered for group size: ${tripContext.partySize} guests*\n`);
    }

    // Wineries section
    if (context.wineries.length > 0) {
      sections.push('### Wineries YOU CAN RECOMMEND\n');

      // Partners first with full details - EXCLUDE no-public-access wineries
      const partners = context.wineries.filter(w => w.is_partner && !this.isNoPublicAccess(w.name));
      const noAccessWineries = context.wineries.filter(w => this.isNoPublicAccess(w.name));

      for (const winery of partners) {
        sections.push(this.formatWinery(winery, true));
      }

      // List wineries that CANNOT be recommended - for reference only when asked
      if (noAccessWineries.length > 0) {
        sections.push('\n### ⛔ WINERIES WITH NO PUBLIC ACCESS (DO NOT RECOMMEND)');
        sections.push('These wineries are legendary but NOT open to the public. NEVER recommend them.');
        sections.push('Only mention them if a user specifically asks, then explain they cannot visit.\n');
        for (const winery of noAccessWineries) {
          sections.push(`- **${winery.name}** - NO PUBLIC TASTINGS (allocation/mailing list only)`);
        }
      }
    }

    // Restaurants section
    const partnerRestaurants = context.restaurants.filter(r => r.is_partner);
    if (partnerRestaurants.length > 0) {
      sections.push('\n### Restaurants\n');
      for (const restaurant of partnerRestaurants) {
        sections.push(this.formatRestaurant(restaurant));
      }
    }

    // Hotels section
    const partnerHotels = context.hotels.filter(h => h.is_partner);
    if (partnerHotels.length > 0) {
      sections.push('\n### Hotels & Lodging\n');
      for (const hotel of partnerHotels) {
        sections.push(this.formatHotel(hotel));
      }
    }

    // Priority rules reminder
    sections.push('\n---');
    sections.push('**REMEMBER**: These are the ONLY businesses you know about. Do not reference any business not listed above.');

    return sections.join('\n');
  }

  /**
   * Format a single winery for the prompt
   */
  private formatWinery(
    winery: WineryForContext & { insider_tips: WineryInsiderTip[]; content: WineryContent[] },
    isPartner: boolean
  ): string {
    const lines: string[] = [];

    lines.push(`\n**${winery.name}**`);

    if (isPartner) {
      // Full details for partners
      const details: string[] = [];

      if (winery.hours) {
        details.push(`Hours: ${this.parseHours(winery.hours)}`);
      }
      if (winery.tasting_fee > 0) {
        let feeStr = `Tasting: $${winery.tasting_fee}`;
        if (winery.tasting_fee_waived) {
          feeStr += ` (${winery.tasting_fee_waived})`;
        }
        details.push(feeStr);
      }
      if (winery.max_group_size) {
        details.push(`Max group: ${winery.max_group_size}`);
      }
      if (winery.reservation_required) {
        details.push('Reservations required');
      }

      if (details.length > 0) {
        lines.push(details.join(' | '));
      }

      if (winery.wine_styles.length > 0) {
        lines.push(`Wines: ${winery.wine_styles.slice(0, 5).join(', ')}`);
      }

      if (winery.experience_tags.length > 0) {
        lines.push(`Vibe: ${winery.experience_tags.join(', ')}`);
      }

      // Add insider tips (limit to 2 most relevant)
      const tips = winery.insider_tips.slice(0, 2);
      for (const tip of tips) {
        const tipLabel = tip.title || this.formatTipType(tip.tip_type);
        lines.push(`💡 ${tipLabel}: ${tip.content}`);
      }

      // Add origin story snippet if available
      const story = winery.content.find(c => c.content_type === 'origin_story');
      if (story && story.content.length > 0) {
        const snippet = story.content.substring(0, 150) + (story.content.length > 150 ? '...' : '');
        lines.push(`Story: ${snippet}`);
      }
    } else {
      // Minimal info for non-partners
      if (winery.wine_styles.length > 0) {
        lines.push(`Known for: ${winery.wine_styles.slice(0, 3).join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format a restaurant for the prompt
   */
  private formatRestaurant(restaurant: RestaurantForContext): string {
    const lines: string[] = [];
    lines.push(`\n**${restaurant.name}**`);
    lines.push(`Cuisine: ${restaurant.cuisine_type || 'American'}`);
    if (restaurant.address) {
      lines.push(`Address: ${restaurant.address}`);
    }
    return lines.join('\n');
  }

  /**
   * Format a hotel for the prompt
   */
  private formatHotel(hotel: HotelForContext): string {
    const lines: string[] = [];
    lines.push(`\n**${hotel.name}**`);
    lines.push(`Type: ${hotel.type || 'Hotel'}`);
    if (hotel.city) {
      lines.push(`Location: ${hotel.city}`);
    }
    if (hotel.amenities && hotel.amenities.length > 0) {
      lines.push(`Amenities: ${hotel.amenities.slice(0, 5).join(', ')}`);
    }
    return lines.join('\n');
  }

  /**
   * Parse hours JSON to readable string
   */
  private parseHours(hoursJson: string): string {
    try {
      const hours = JSON.parse(hoursJson);
      // If it's an object with days, summarize
      if (typeof hours === 'object' && hours !== null) {
        // Check if all days are the same
        const values = Object.values(hours);
        const uniqueValues = [...new Set(values)];
        if (uniqueValues.length === 1 && uniqueValues[0]) {
          return `${uniqueValues[0]} daily`;
        }
        // Otherwise return a summary
        return 'Varies by day';
      }
      return String(hours);
    } catch {
      return hoursJson.substring(0, 50);
    }
  }

  /**
   * Format tip type to readable label
   */
  private formatTipType(tipType: string): string {
    const labels: Record<string, string> = {
      'best_time': 'Best time to visit',
      'hidden_gem': 'Hidden gem',
      'insider_tip': 'Insider tip',
      'local_favorite': "Local's favorite",
      'photo_spot': 'Photo spot',
      'food_pairing': 'Food pairing',
      'special_request': 'Ask for',
    };
    return labels[tipType] || 'Tip';
  }

  /**
   * Group array by winery_id
   */
  private groupByWineryId<T extends { winery_id: number }>(arr: T[]): Record<number, T[]> {
    return arr.reduce((acc, item) => {
      const wineryId = item.winery_id;
      if (!acc[wineryId]) {
        acc[wineryId] = [];
      }
      acc[wineryId].push(item);
      return acc;
    }, {} as Record<number, T[]>);
  }
}

export const partnerContextService = new PartnerContextService();
