/**
 * Winery Content Type Constants
 *
 * Standardized content_type values for the winery_content table.
 * These support the two-layer data model:
 * - Layer 1: Structured Data (in wineries table columns)
 * - Layer 2: Narrative Data (in winery_content with these types)
 */

// ============================================================================
// Winery Content Types
// ============================================================================

export const WINERY_CONTENT_TYPES = {
  // -------------------------------------------------------------------------
  // Layer 2: Narrative Content Types
  // -------------------------------------------------------------------------

  /** Founding narrative - the "why" behind the winery */
  ORIGIN_STORY: 'origin_story',

  /** Winemaking approach, beliefs, and values */
  PHILOSOPHY: 'philosophy',

  /** What makes this winery unique - their specific differentiator */
  WHAT_MAKES_UNIQUE: 'unique_story',

  // -------------------------------------------------------------------------
  // Insider Knowledge
  // -------------------------------------------------------------------------

  /** Curator's recommendation for this winery */
  INSIDER_TIP: 'insider_tip',

  /** What locals know that visitors don't */
  LOCALS_KNOW: 'locals_know',

  /** Optimal visiting windows and timing advice */
  BEST_TIME: 'best_time_to_visit',

  /** Questions or requests visitors should make */
  WHAT_TO_ASK: 'what_to_ask_for',

  // -------------------------------------------------------------------------
  // Color & Personality
  // -------------------------------------------------------------------------

  /** Stories, memorable moments, history tidbits */
  ANECDOTE: 'anecdote',

  /** Interesting facts and tidbits */
  FUN_FACT: 'fun_fact',

  /** Memorable quotes from owners/winemakers */
  SIGNATURE_QUOTE: 'signature_quote',

  // -------------------------------------------------------------------------
  // Educational Content
  // -------------------------------------------------------------------------

  /** Teaching content about wine, process, region */
  EDUCATIONAL: 'educational',

  /** Common myths or misconceptions to correct */
  MISCONCEPTION: 'misconception',

  // -------------------------------------------------------------------------
  // Curator/Admin
  // -------------------------------------------------------------------------

  /** Internal notes for reference (not public) */
  CURATOR_NOTES: 'curator_notes',

  // -------------------------------------------------------------------------
  // Legacy/Fallback
  // -------------------------------------------------------------------------

  /** General content without specific type */
  GENERAL: 'general',

  /** Custom content type */
  CUSTOM: 'custom',
} as const;

export type WineryContentType = typeof WINERY_CONTENT_TYPES[keyof typeof WINERY_CONTENT_TYPES];

// ============================================================================
// Insider Tip Types
// ============================================================================

export const INSIDER_TIP_TYPES = {
  /** What locals know that tourists don't */
  LOCALS_KNOW: 'locals_know',

  /** Best time to visit (day, season, etc.) */
  BEST_TIME: 'best_time',

  /** Questions or requests to make */
  WHAT_TO_ASK: 'what_to_ask',

  /** Food and wine pairing recommendations */
  PAIRING: 'pairing',

  /** Best photo opportunities */
  PHOTO_SPOT: 'photo_spot',

  /** Hidden gems - off-menu items, secret spots */
  HIDDEN_GEM: 'hidden_gem',

  /** Parking, accessibility, practical tips */
  PRACTICAL: 'practical',
} as const;

export type InsiderTipType = typeof INSIDER_TIP_TYPES[keyof typeof INSIDER_TIP_TYPES];

// ============================================================================
// Experience Tags
// ============================================================================

export const EXPERIENCE_TAGS = {
  /** Small, personal tasting experiences */
  INTIMATE: 'intimate',

  /** Small production, artisan focus */
  BOUTIQUE: 'boutique',

  /** Good for kids, family activities */
  FAMILY_FRIENDLY: 'family-friendly',

  /** Couples, date atmosphere */
  ROMANTIC: 'romantic',

  /** Learn about winemaking, detailed tours */
  EDUCATIONAL: 'educational',

  /** Group-friendly, lively atmosphere */
  SOCIAL: 'social',

  /** Large group friendly, event space */
  PARTY_FRIENDLY: 'party-friendly',

  /** Beautiful grounds, gardens */
  SCENIC: 'scenic',

  /** Historical significance */
  HISTORIC: 'historic',

  /** Modern, sleek aesthetic */
  MODERN: 'modern',

  /** Rustic, farmhouse feel */
  RUSTIC: 'rustic',

  /** Sustainable, organic, biodynamic */
  SUSTAINABLE: 'sustainable',

  /** Dogs welcome */
  DOG_FRIENDLY: 'dog-friendly',

  /** Casual, no frills */
  CASUAL: 'casual',

  /** Upscale, refined experience */
  UPSCALE: 'upscale',
} as const;

export type ExperienceTag = typeof EXPERIENCE_TAGS[keyof typeof EXPERIENCE_TAGS];

// ============================================================================
// Data Source Types
// ============================================================================

export const DATA_SOURCES = {
  /** Scraped from external website */
  SCRAPED: 'scraped',

  /** Entered via partner portal */
  PARTNER_PORTAL: 'partner_portal',

  /** Entered by admin/staff */
  ADMIN_ENTRY: 'admin_entry',

  /** Imported via API */
  API_IMPORT: 'api_import',

  /** Generated by AI */
  AI_GENERATED: 'ai_generated',

  /** Submitted by community */
  COMMUNITY: 'community',

  /** Curated by editorial team */
  CURATOR: 'curator',
} as const;

export type DataSource = typeof DATA_SOURCES[keyof typeof DATA_SOURCES];

// ============================================================================
// Helper: Get display labels
// ============================================================================

export const CONTENT_TYPE_LABELS: Record<WineryContentType, string> = {
  origin_story: 'Origin Story',
  philosophy: 'Philosophy & Approach',
  unique_story: 'What Makes Us Unique',
  insider_tip: 'Insider Tip',
  locals_know: 'What Locals Know',
  best_time_to_visit: 'Best Time to Visit',
  what_to_ask_for: 'What to Ask For',
  anecdote: 'Story & Anecdote',
  fun_fact: 'Fun Fact',
  signature_quote: 'Signature Quote',
  educational: 'Educational',
  misconception: 'Common Misconception',
  curator_notes: 'Curator Notes',
  general: 'General',
  custom: 'Custom',
};

export const EXPERIENCE_TAG_LABELS: Record<ExperienceTag, string> = {
  intimate: 'Intimate',
  boutique: 'Boutique',
  'family-friendly': 'Family Friendly',
  romantic: 'Romantic',
  educational: 'Educational',
  social: 'Social',
  'party-friendly': 'Party Friendly',
  scenic: 'Scenic',
  historic: 'Historic',
  modern: 'Modern',
  rustic: 'Rustic',
  sustainable: 'Sustainable',
  'dog-friendly': 'Dog Friendly',
  casual: 'Casual',
  upscale: 'Upscale',
};
