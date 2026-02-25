/**
 * Venue Matcher
 *
 * Fuzzy-matches venue names extracted by AI against the database.
 * Uses exact match → substring match → Dice coefficient on bigrams.
 */

import type { VenueRecord, VenueMatch } from './types';

// Words to strip when normalizing venue names
const STRIP_WORDS = [
  'winery', 'cellar', 'cellars', 'estate', 'estates', 'vineyard', 'vineyards',
  'wine', 'wines', 'tasting', 'room', 'the', 'of', 'and', '&',
  'restaurant', 'bistro', 'café', 'cafe', 'bar', 'grill', 'kitchen',
  'hotel', 'inn', 'lodge', 'resort', 'suites', 'motel',
];

function normalize(name: string): string {
  let normalized = name.toLowerCase().trim();
  // Remove common suffixes/prefixes
  for (const word of STRIP_WORDS) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  }
  // Collapse whitespace and remove punctuation
  normalized = normalized.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return normalized;
}

/** Generate character bigrams from a string */
function bigrams(str: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    set.add(str.slice(i, i + 2));
  }
  return set;
}

/** Dice coefficient: 2 * |intersection| / (|A| + |B|) */
function diceCoefficient(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Match a venue name against a list of known venues.
 * Returns the best match above threshold, or null.
 */
export function matchVenue(
  name: string,
  venues: VenueRecord[],
  minThreshold: number = 0.6
): VenueMatch | null {
  if (!name || venues.length === 0) return null;

  const normalizedInput = normalize(name);
  if (!normalizedInput) return null;

  let bestMatch: VenueMatch | null = null;

  for (const venue of venues) {
    const normalizedVenue = normalize(venue.name);
    if (!normalizedVenue) continue;

    // Exact match (after normalization)
    if (normalizedInput === normalizedVenue) {
      return { venue, confidence: 1.0, matchType: 'exact' };
    }

    // Substring match (one contains the other) — only if both are >=4 chars to avoid false positives
    if (normalizedInput.length >= 4 && normalizedVenue.length >= 4) {
      if (normalizedInput.includes(normalizedVenue) || normalizedVenue.includes(normalizedInput)) {
        const confidence = 0.9;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { venue, confidence, matchType: 'substring' };
        }
        continue;
      }
    }

    // Dice coefficient fuzzy match
    const score = diceCoefficient(normalizedInput, normalizedVenue);
    if (score >= minThreshold && (!bestMatch || score > bestMatch.confidence)) {
      bestMatch = { venue, confidence: score, matchType: 'fuzzy' };
    }
  }

  return bestMatch;
}

/**
 * Match multiple venue names at once.
 * Returns a map of input name → best match.
 */
export function matchVenues(
  names: string[],
  venues: VenueRecord[]
): Map<string, VenueMatch | null> {
  const results = new Map<string, VenueMatch | null>();
  for (const name of names) {
    results.set(name, matchVenue(name, venues));
  }
  return results;
}
