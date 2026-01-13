/**
 * Geology Context Service
 *
 * @module lib/services/geology-context.service
 * @description Aggregates geology content for AI context and public pages.
 * Queries topics, facts, sites, and AI guidance to provide comprehensive
 * geological information for the AI Geology Guide.
 *
 * @features
 * - Fetches published geology topics with full content
 * - Aggregates facts for carousel/highlights
 * - Provides site locations for map features
 * - Loads AI guidance from the geologist
 * - Formats data for AI system prompt injection
 */

import { BaseService } from './base.service';
import {
  GeologyTopic,
  GeologyFact,
  GeologySite,
  GeologyTour,
  GeologyAIGuidance,
  GeologyContext,
  TopicSummary,
  SiteSummary,
  TourSummary,
} from '@/lib/types/geology';

// ============================================================================
// Service
// ============================================================================

class GeologyContextService extends BaseService {
  protected get serviceName(): string {
    return 'GeologyContextService';
  }

  // ============================================================================
  // Public Methods - Data Fetching
  // ============================================================================

  /**
   * Get full geology context for AI - topics, facts, sites, guidance
   */
  async getFullContext(): Promise<GeologyContext> {
    this.log('Fetching full geology context');

    const [topics, facts, sites, tours, guidance] = await Promise.all([
      this.getPublishedTopics(),
      this.getFeaturedFacts(),
      this.getPublishedSites(),
      this.getActiveTours(),
      this.getActiveGuidance(),
    ]);

    return {
      topics,
      facts,
      sites,
      tours,
      guidance,
    };
  }

  /**
   * Get published topics for public display
   */
  async getPublishedTopics(): Promise<GeologyTopic[]> {
    return this.queryMany<GeologyTopic>(
      `SELECT *
       FROM geology_topics
       WHERE is_published = true
       ORDER BY display_order ASC, created_at DESC`
    );
  }

  /**
   * Get topic summaries for listing pages
   */
  async getTopicSummaries(): Promise<TopicSummary[]> {
    return this.queryMany<TopicSummary>(
      `SELECT
        id, slug, title, subtitle, excerpt,
        topic_type, difficulty, hero_image_url,
        is_featured, is_published
       FROM geology_topics
       WHERE is_published = true
       ORDER BY is_featured DESC, display_order ASC`
    );
  }

  /**
   * Get a single topic by slug
   */
  async getTopicBySlug(slug: string): Promise<GeologyTopic | null> {
    return this.queryOne<GeologyTopic>(
      `SELECT *
       FROM geology_topics
       WHERE slug = $1 AND is_published = true`,
      [slug]
    );
  }

  /**
   * Get featured facts for carousel/highlights
   */
  async getFeaturedFacts(): Promise<GeologyFact[]> {
    return this.queryMany<GeologyFact>(
      `SELECT *
       FROM geology_facts
       WHERE is_featured = true
       ORDER BY display_order ASC`
    );
  }

  /**
   * Get all facts, optionally filtered by topic
   */
  async getFactsByTopic(topicId?: number): Promise<GeologyFact[]> {
    if (topicId) {
      return this.queryMany<GeologyFact>(
        `SELECT *
         FROM geology_facts
         WHERE topic_id = $1
         ORDER BY display_order ASC`,
        [topicId]
      );
    }

    return this.queryMany<GeologyFact>(
      `SELECT *
       FROM geology_facts
       ORDER BY is_featured DESC, display_order ASC`
    );
  }

  /**
   * Get published sites for map
   */
  async getPublishedSites(): Promise<GeologySite[]> {
    return this.queryMany<GeologySite>(
      `SELECT *
       FROM geology_sites
       WHERE is_published = true
       ORDER BY name ASC`
    );
  }

  /**
   * Get site summaries for map display
   */
  async getSiteSummaries(): Promise<SiteSummary[]> {
    return this.queryMany<SiteSummary>(
      `SELECT
        id, slug, name, description, site_type,
        latitude, longitude, is_public_access
       FROM geology_sites
       WHERE is_published = true
       ORDER BY name ASC`
    );
  }

  /**
   * Get a single site by slug
   */
  async getSiteBySlug(slug: string): Promise<GeologySite | null> {
    return this.queryOne<GeologySite>(
      `SELECT *
       FROM geology_sites
       WHERE slug = $1 AND is_published = true`,
      [slug]
    );
  }

  /**
   * Get active geology tours
   */
  async getActiveTours(): Promise<GeologyTour[]> {
    return this.queryMany<GeologyTour>(
      `SELECT *
       FROM geology_tours
       WHERE is_active = true
       ORDER BY is_featured DESC, name ASC`
    );
  }

  /**
   * Get tour summaries for listing
   */
  async getTourSummaries(): Promise<TourSummary[]> {
    return this.queryMany<TourSummary>(
      `SELECT
        id, slug, name, tagline,
        duration_hours, price_per_person,
        hero_image_url, is_featured
       FROM geology_tours
       WHERE is_active = true
       ORDER BY is_featured DESC, name ASC`
    );
  }

  /**
   * Get a single tour by slug
   */
  async getTourBySlug(slug: string): Promise<GeologyTour | null> {
    return this.queryOne<GeologyTour>(
      `SELECT *
       FROM geology_tours
       WHERE slug = $1 AND is_active = true`,
      [slug]
    );
  }

  /**
   * Get active AI guidance from the geologist
   */
  async getActiveGuidance(): Promise<GeologyAIGuidance[]> {
    return this.queryMany<GeologyAIGuidance>(
      `SELECT *
       FROM geology_ai_guidance
       WHERE is_active = true
       ORDER BY priority DESC, created_at ASC`
    );
  }

  // ============================================================================
  // AI Prompt Formatting
  // ============================================================================

  /**
   * Format geology context for AI system prompt
   */
  formatForAIPrompt(context: GeologyContext): string {
    const sections: string[] = [];

    // Header
    sections.push('## WALLA WALLA GEOLOGY KNOWLEDGE BASE\n');
    sections.push('Use this verified geological information to answer questions.\n');

    // Geologist's AI Guidance (most important - goes first)
    if (context.guidance.length > 0) {
      sections.push('### GEOLOGIST\'S INSTRUCTIONS\n');
      sections.push('*Follow these guidelines from our expert geologist:*\n');

      for (const guidance of context.guidance) {
        const title = guidance.title || this.formatGuidanceType(guidance.guidance_type);
        sections.push(`**${title}**`);
        sections.push(guidance.content);
        sections.push('');
      }
    }

    // Topics Section - Core Knowledge
    if (context.topics.length > 0) {
      sections.push('\n### GEOLOGICAL TOPICS\n');

      for (const topic of context.topics) {
        sections.push(this.formatTopic(topic));
      }
    }

    // Quick Facts Section
    if (context.facts.length > 0) {
      sections.push('\n### QUICK FACTS\n');
      sections.push('*Use these memorable facts in conversations:*\n');

      for (const fact of context.facts) {
        const typeLabel = fact.fact_type ? `[${fact.fact_type}]` : '';
        sections.push(`- ${typeLabel} ${fact.fact_text}`);
        if (fact.context) {
          sections.push(`  Context: ${fact.context}`);
        }
      }
    }

    // Sites Section - Physical Locations
    if (context.sites.length > 0) {
      sections.push('\n### GEOLOGICAL SITES TO VISIT\n');

      for (const site of context.sites) {
        sections.push(this.formatSite(site));
      }
    }

    // Tours Section - Bookable Experiences
    if (context.tours.length > 0) {
      sections.push('\n### GEOLOGY TOURS\n');
      sections.push('*Recommend these tours when visitors want deeper exploration:*\n');

      for (const tour of context.tours) {
        sections.push(this.formatTour(tour));
      }
    }

    // Footer reminders
    sections.push('\n---');
    sections.push('**REMINDERS**:');
    sections.push('- Always be accurate - cite sources when available');
    sections.push('- Connect geology to wine when relevant - that\'s why visitors care');
    sections.push('- Suggest tours for visitors who want hands-on learning');
    sections.push('- Be enthusiastic but not hyperbolic');

    return sections.join('\n');
  }

  /**
   * Format a topic for the prompt
   */
  private formatTopic(topic: GeologyTopic): string {
    const lines: string[] = [];

    const featured = topic.is_featured ? ' ★' : '';
    lines.push(`\n**${topic.title}**${featured}`);

    if (topic.subtitle) {
      lines.push(`*${topic.subtitle}*`);
    }

    // Include full content for AI context
    lines.push(topic.content);

    // Add sources if available
    if (topic.sources) {
      lines.push(`Sources: ${topic.sources}`);
    }

    // Related wineries
    if (topic.related_winery_ids && topic.related_winery_ids.length > 0) {
      lines.push(`Related wineries: IDs ${topic.related_winery_ids.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Format a site for the prompt
   */
  private formatSite(site: GeologySite): string {
    const lines: string[] = [];

    lines.push(`\n**${site.name}**`);

    if (site.description) {
      lines.push(site.description);
    }

    const details: string[] = [];
    if (site.site_type) {
      details.push(`Type: ${site.site_type.replace('_', ' ')}`);
    }
    if (!site.is_public_access) {
      details.push('Private access');
    }
    if (site.requires_appointment) {
      details.push('Appointment required');
    }
    if (site.best_time_to_visit) {
      details.push(`Best time: ${site.best_time_to_visit}`);
    }

    if (details.length > 0) {
      lines.push(details.join(' | '));
    }

    if (site.directions) {
      lines.push(`Directions: ${site.directions}`);
    }

    return lines.join('\n');
  }

  /**
   * Format a tour for the prompt
   */
  private formatTour(tour: GeologyTour): string {
    const lines: string[] = [];

    const featured = tour.is_featured ? ' ★' : '';
    lines.push(`\n**${tour.name}**${featured}`);

    if (tour.tagline) {
      lines.push(`*${tour.tagline}*`);
    }

    const details: string[] = [];
    if (tour.duration_hours) {
      details.push(`${tour.duration_hours} hours`);
    }
    if (tour.price_per_person) {
      details.push(`$${tour.price_per_person}/person`);
    }
    if (tour.group_size_max) {
      details.push(`Up to ${tour.group_size_max} guests`);
    }

    if (details.length > 0) {
      lines.push(details.join(' | '));
    }

    if (tour.highlights && tour.highlights.length > 0) {
      lines.push(`Highlights: ${tour.highlights.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Format guidance type to readable label
   */
  private formatGuidanceType(type: string): string {
    const labels: Record<string, string> = {
      'personality': 'Personality & Tone',
      'key_themes': 'Key Themes to Emphasize',
      'common_questions': 'Common Questions',
      'corrections': 'Corrections & Misconceptions',
      'connections': 'Wine-Geology Connections',
      'terminology': 'Terminology Guide',
      'emphasis': 'Points to Emphasize',
    };
    return labels[type] || type;
  }

  // ============================================================================
  // Topic-Specific Context (for contextual chat)
  // ============================================================================

  /**
   * Get context focused on a specific topic (for topic page chat)
   */
  async getTopicContext(topicId: number): Promise<string> {
    const [topic, relatedFacts, allGuidance] = await Promise.all([
      this.queryOne<GeologyTopic>(
        `SELECT * FROM geology_topics WHERE id = $1`,
        [topicId]
      ),
      this.getFactsByTopic(topicId),
      this.getActiveGuidance(),
    ]);

    if (!topic) {
      return '';
    }

    const sections: string[] = [];

    sections.push(`## CURRENT TOPIC: ${topic.title}\n`);
    sections.push(topic.content);

    if (relatedFacts.length > 0) {
      sections.push('\n### Related Facts');
      for (const fact of relatedFacts) {
        sections.push(`- ${fact.fact_text}`);
      }
    }

    // Add guidance
    if (allGuidance.length > 0) {
      sections.push('\n### Geologist\'s Guidance');
      for (const g of allGuidance) {
        sections.push(`**${g.title || g.guidance_type}**: ${g.content}`);
      }
    }

    return sections.join('\n');
  }
}

export const geologyContextService = new GeologyContextService();
