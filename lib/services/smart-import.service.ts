/**
 * Smart Import Service
 *
 * Orchestrates file parsing → AI extraction → venue matching.
 * Extends BaseService for database access and logging.
 */

import { BaseService } from './base.service';
import { parseFile } from '@/lib/import/parsers';
import { extractProposalData } from '@/lib/import/ai-extractor';
import { matchVenue } from '@/lib/import/venue-matcher';
import type { SmartImportResult, VenueRecord, ParsedFile } from '@/lib/import/types';

interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

class SmartImportServiceClass extends BaseService {
  protected get serviceName(): string {
    return 'SmartImportService';
  }

  /**
   * Process uploaded files and extract proposal data.
   */
  async processFiles(files: UploadedFile[]): Promise<SmartImportResult> {
    // 1. Parse all files
    this.log('Parsing uploaded files', { count: files.length });
    const parsedFiles: ParsedFile[] = await Promise.all(
      files.map(f => parseFile(f.buffer, f.filename, f.mimeType))
    );

    const successCount = parsedFiles.filter(f => f.status === 'success').length;
    if (successCount === 0) {
      return {
        confidence: 0,
        proposal: {},
        days: [],
        guests: [],
        inclusions: [],
        extraction_notes: 'No files could be parsed successfully.',
        source_files: parsedFiles.map(f => ({
          filename: f.filename,
          type: f.mimeType,
          status: 'error' as const,
          error: f.error,
        })),
      };
    }

    // 2. Load venue data from DB for matching
    const venues = await this.loadVenues();
    const venueNames = venues.map(v => v.name);

    // 3. AI extraction
    const result = await extractProposalData(parsedFiles, venueNames);

    // 4. Match venue names to DB records
    this.matchVenuesInResult(result, venues);

    return result;
  }

  /**
   * Load all wineries, restaurants, and hotels from DB.
   */
  private async loadVenues(): Promise<VenueRecord[]> {
    const venues: VenueRecord[] = [];

    try {
      const wineries = await this.queryMany<{ id: number; name: string }>(
        'SELECT id, name FROM wineries ORDER BY name'
      );
      for (const w of wineries) {
        venues.push({ id: w.id, name: w.name, type: 'winery' });
      }

      const restaurants = await this.queryMany<{ id: number; name: string }>(
        'SELECT id, name FROM restaurants ORDER BY name'
      );
      for (const r of restaurants) {
        venues.push({ id: r.id, name: r.name, type: 'restaurant' });
      }

      const hotels = await this.queryMany<{ id: number; name: string }>(
        'SELECT id, name FROM hotels ORDER BY name'
      );
      for (const h of hotels) {
        venues.push({ id: h.id, name: h.name, type: 'hotel' });
      }

      this.log('Loaded venues for matching', {
        wineries: wineries.length,
        restaurants: restaurants.length,
        hotels: hotels.length,
      });
    } catch (error) {
      this.warn('Failed to load some venue tables', { error: String(error) });
    }

    return venues;
  }

  /**
   * Apply venue matching to all stops in the extraction result.
   */
  private matchVenuesInResult(result: SmartImportResult, venues: VenueRecord[]): void {
    for (const day of result.days) {
      for (const stop of day.stops) {
        if (!stop.venue_name) continue;

        // Filter venues by stop type
        let relevantVenues = venues;
        if (stop.stop_type === 'winery') {
          relevantVenues = venues.filter(v => v.type === 'winery');
        } else if (stop.stop_type === 'restaurant') {
          relevantVenues = venues.filter(v => v.type === 'restaurant');
        } else if (stop.stop_type === 'hotel_checkin' || stop.stop_type === 'hotel_checkout' || (stop.stop_type as string) === 'hotel') {
          relevantVenues = venues.filter(v => v.type === 'hotel');
        }

        const match = matchVenue(stop.venue_name, relevantVenues);
        if (match) {
          stop.matched_venue_id = match.venue.id;
          stop.matched_venue_type = match.venue.type;
          stop.match_confidence = match.confidence;
        }
      }
    }
  }
}

export const smartImportService = new SmartImportServiceClass();
