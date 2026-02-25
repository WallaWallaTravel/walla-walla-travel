/**
 * Smart Import Types & Constants
 *
 * Shared types for the AI-powered proposal import feature.
 * Used by parsers, AI extractor, venue matcher, and API route.
 */

import type { StopType, InclusionType, PricingType, TripType } from '@/lib/types/trip-proposal';

// ============================================================================
// File Handling
// ============================================================================

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_FILES = 5;

export const MIME_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
  'text/csv': 'CSV',
  'image/png': 'PNG Image',
  'image/jpeg': 'JPEG Image',
  'image/webp': 'WebP Image',
};

// ============================================================================
// Parsed File Output
// ============================================================================

export interface ParsedFile {
  filename: string;
  mimeType: string;
  /** Plain text content (for text-based files) */
  textContent?: string;
  /** Base64-encoded image data (for image files or scanned PDF pages) */
  imageContent?: {
    base64: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  }[];
  /** Whether parsing succeeded */
  status: 'success' | 'error';
  /** Error message if parsing failed */
  error?: string;
}

// ============================================================================
// AI Extraction Result
// ============================================================================

export interface SmartImportResult {
  confidence: number; // 0-1

  proposal: {
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_company?: string;
    trip_type?: TripType;
    party_size?: number;
    start_date?: string; // YYYY-MM-DD
    end_date?: string;   // YYYY-MM-DD
    introduction?: string;
    internal_notes?: string;
  };

  days: SmartImportDay[];
  guests: SmartImportGuest[];
  inclusions: SmartImportInclusion[];

  extraction_notes: string;
  source_files: SourceFileInfo[];
}

export interface SmartImportDay {
  date?: string; // YYYY-MM-DD
  title?: string;
  stops: SmartImportStop[];
}

export interface SmartImportStop {
  stop_type: StopType;
  venue_name?: string;
  matched_venue_id?: number;
  matched_venue_type?: 'winery' | 'restaurant' | 'hotel';
  match_confidence?: number; // 0-1
  custom_name?: string;
  custom_address?: string;
  scheduled_time?: string; // HH:MM
  duration_minutes?: number;
  client_notes?: string;
  cost_note?: string;
}

export interface SmartImportGuest {
  name: string;
  email?: string;
  phone?: string;
  dietary_restrictions?: string;
  is_primary?: boolean;
}

export interface SmartImportInclusion {
  inclusion_type: InclusionType;
  description: string;
  pricing_type?: PricingType;
  unit_price?: number;
  quantity?: number;
}

export interface SourceFileInfo {
  filename: string;
  type: string;
  status: 'parsed' | 'error' | 'skipped';
  error?: string;
}

// ============================================================================
// Venue Data (for matching)
// ============================================================================

export interface VenueRecord {
  id: number;
  name: string;
  type: 'winery' | 'restaurant' | 'hotel';
}

export interface VenueMatch {
  venue: VenueRecord;
  confidence: number;
  matchType: 'exact' | 'substring' | 'fuzzy';
}
