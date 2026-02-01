/**
 * Google Calendar Sync Service
 *
 * @module lib/services/google-calendar-sync.service
 * @description Two-way sync between bookings and Google Calendar.
 * App is PRIMARY, Google Calendar is BACKUP for visibility and redundancy.
 *
 * Features:
 * - Push bookings to Google Calendar on create/update/cancel
 * - Poll for emergency entries created directly in Calendar
 * - Store complete booking data in event description as JSON
 * - Human-readable title/location for quick calendar view
 */

import { BaseService } from './base.service';
import { google, calendar_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface BookingForSync {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  party_size: number;
  tour_date: string | Date;
  start_time: string;
  end_time: string;
  duration_hours: number;
  pickup_location?: string;
  dropoff_location?: string;
  special_requests?: string;
  status: string;
  driver_id?: number;
  driver_name?: string;
  vehicle_id?: number;
  vehicle_name?: string;
  wineries?: string[];
  google_calendar_event_id?: string;
}

export interface CalendarEventData {
  version: number;
  booking_id: number;
  booking_number: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  tour: {
    date: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    party_size: number;
  };
  locations: {
    pickup?: string;
    dropoff?: string;
  };
  assignment?: {
    driver_id?: number;
    driver_name?: string;
    vehicle_id?: number;
    vehicle_name?: string;
  };
  wineries?: string[];
  special_requests?: string;
  status: string;
  synced_at: string;
}

export interface EmergencyEntry {
  emergency_entry: true;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  party_size: number;
  pickup_location?: string;
  special_requests?: string;
  entered_by?: string;
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class GoogleCalendarSyncService extends BaseService {
  protected get serviceName(): string {
    return 'GoogleCalendarSyncService';
  }

  private calendar: calendar_v3.Calendar | null = null;
  private calendarId: string = 'primary';

  // Paths for credentials (same as import script)
  private readonly credentialsPath = path.join(
    process.cwd(),
    'scripts/import/credentials.json'
  );
  private readonly tokenPath = path.join(
    process.cwd(),
    'scripts/import/token.json'
  );

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Set the calendar ID to sync with
   */
  setCalendarId(calendarId: string): void {
    this.calendarId = calendarId;
    this.log(`Calendar ID set to: ${calendarId}`);
  }

  /**
   * Initialize the Google Calendar client
   * Returns false if credentials are not configured
   */
  async initialize(): Promise<boolean> {
    if (this.calendar) {
      return true;
    }

    try {
      if (!fs.existsSync(this.credentialsPath)) {
        this.warn('Google Calendar credentials not found', {
          path: this.credentialsPath,
        });
        return false;
      }

      if (!fs.existsSync(this.tokenPath)) {
        this.warn('Google Calendar token not found - run import script first to authorize');
        return false;
      }

      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf-8'));
      const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));

      const { client_secret, client_id, redirect_uris } =
        credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      oAuth2Client.setCredentials(token);

      this.calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      this.log('Google Calendar client initialized');
      return true;
    } catch (error) {
      this.handleError(error, 'initialize');
      return false;
    }
  }

  // ============================================================================
  // Event Formatting
  // ============================================================================

  /**
   * Format a booking as a Google Calendar event
   */
  formatBookingAsCalendarEvent(booking: BookingForSync): calendar_v3.Schema$Event {
    // Format date strings
    const tourDate =
      typeof booking.tour_date === 'string'
        ? booking.tour_date
        : booking.tour_date.toISOString().split('T')[0];

    // Build title: WWT-XXXXX | Customer Name (X)
    const title = `${booking.booking_number} | ${booking.customer_name} (${booking.party_size})`;

    // Build JSON data for description
    const eventData: CalendarEventData = {
      version: 1,
      booking_id: booking.id,
      booking_number: booking.booking_number,
      customer: {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
      },
      tour: {
        date: tourDate,
        start_time: booking.start_time,
        end_time: booking.end_time,
        duration_hours: booking.duration_hours,
        party_size: booking.party_size,
      },
      locations: {
        pickup: booking.pickup_location,
        dropoff: booking.dropoff_location || booking.pickup_location,
      },
      assignment:
        booking.driver_id || booking.vehicle_id
          ? {
              driver_id: booking.driver_id,
              driver_name: booking.driver_name,
              vehicle_id: booking.vehicle_id,
              vehicle_name: booking.vehicle_name,
            }
          : undefined,
      wineries: booking.wineries,
      special_requests: booking.special_requests,
      status: booking.status,
      synced_at: new Date().toISOString(),
    };

    // Build start/end datetime
    const startDateTime = `${tourDate}T${booking.start_time}:00`;
    const endDateTime = `${tourDate}T${booking.end_time}:00`;

    // Status-based color (cancelled = red, completed = green, etc.)
    let colorId: string | undefined;
    switch (booking.status) {
      case 'cancelled':
        colorId = '11'; // Red
        break;
      case 'completed':
        colorId = '10'; // Green
        break;
      case 'confirmed':
        colorId = '9'; // Blue
        break;
      case 'pending':
        colorId = '5'; // Yellow
        break;
    }

    return {
      summary: title,
      location: booking.pickup_location,
      description: JSON.stringify(eventData, null, 2),
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Los_Angeles',
      },
      colorId,
    };
  }

  /**
   * Parse booking data from calendar event description
   */
  parseEventDescription(description: string | null | undefined): CalendarEventData | null {
    if (!description) return null;

    try {
      const data = JSON.parse(description);
      if (data.version && data.booking_id) {
        return data as CalendarEventData;
      }
    } catch {
      // Not JSON, might be a legacy or manual entry
    }

    return null;
  }

  /**
   * Parse emergency entry template from event
   */
  parseEmergencyEntry(
    event: calendar_v3.Schema$Event
  ): EmergencyEntry | null {
    const title = event.summary || '';
    const description = event.description || '';

    // Check for emergency entry markers
    const isEmergency =
      title.startsWith('NEW |') ||
      description.includes('"emergency_entry": true') ||
      description.includes('"emergency_entry":true');

    if (!isEmergency) return null;

    try {
      // Try JSON format first
      const data = JSON.parse(description);
      if (data.emergency_entry) {
        return data as EmergencyEntry;
      }
    } catch {
      // Try plain text format
      const lines = description.split('\n');
      const entry: EmergencyEntry = {
        emergency_entry: true,
        customer: { name: '' },
        party_size: 2,
      };

      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        switch (key.trim().toUpperCase()) {
          case 'CUSTOMER':
            entry.customer.name = value;
            break;
          case 'EMAIL':
            if (value && value !== 'blank') entry.customer.email = value;
            break;
          case 'PHONE':
            if (value && value !== 'blank') entry.customer.phone = value;
            break;
          case 'GUESTS':
            entry.party_size = parseInt(value, 10) || 2;
            break;
          case 'PICKUP':
            entry.pickup_location = value;
            break;
          case 'NOTES':
            entry.special_requests = value;
            break;
          case 'ENTERED BY':
            entry.entered_by = value;
            break;
        }
      }

      // Extract name from title if not in description
      if (!entry.customer.name && title.startsWith('NEW |')) {
        const match = title.match(/NEW \| (.+?) \((\d+)/);
        if (match) {
          entry.customer.name = match[1].trim();
          entry.party_size = parseInt(match[2], 10) || 2;
        }
      }

      if (entry.customer.name) {
        return entry;
      }
    }

    return null;
  }

  // ============================================================================
  // Push Operations (App -> Calendar)
  // ============================================================================

  /**
   * Push a new booking to Google Calendar
   */
  async pushToCalendar(booking: BookingForSync): Promise<SyncResult> {
    const initialized = await this.initialize();
    if (!initialized || !this.calendar) {
      return { success: false, error: 'Google Calendar not configured' };
    }

    try {
      const event = this.formatBookingAsCalendarEvent(booking);

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });

      const eventId = response.data.id;
      this.log(`Event created: ${eventId}`, { bookingId: booking.id });

      // Update booking with calendar event ID
      if (eventId) {
        await this.updateBookingCalendarId(booking.id, eventId);
      }

      return { success: true, eventId: eventId || undefined };
    } catch (error) {
      this.handleError(error, 'pushToCalendar');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateCalendarEvent(booking: BookingForSync): Promise<SyncResult> {
    const initialized = await this.initialize();
    if (!initialized || !this.calendar) {
      return { success: false, error: 'Google Calendar not configured' };
    }

    if (!booking.google_calendar_event_id) {
      // No existing event, create new one
      return this.pushToCalendar(booking);
    }

    try {
      const event = this.formatBookingAsCalendarEvent(booking);

      await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: booking.google_calendar_event_id,
        requestBody: event,
      });

      this.log(`Event updated: ${booking.google_calendar_event_id}`, {
        bookingId: booking.id,
      });

      // Update sync timestamp
      await this.updateBookingSyncTimestamp(booking.id);

      return { success: true, eventId: booking.google_calendar_event_id };
    } catch (error) {
      // If event not found, create new one
      if (
        error instanceof Error &&
        error.message.includes('404')
      ) {
        this.log('Event not found, creating new one', { bookingId: booking.id });
        return this.pushToCalendar(booking);
      }

      this.handleError(error, 'updateCalendarEvent');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete/cancel a calendar event
   */
  async deleteCalendarEvent(
    eventId: string,
    bookingId: number
  ): Promise<SyncResult> {
    const initialized = await this.initialize();
    if (!initialized || !this.calendar) {
      return { success: false, error: 'Google Calendar not configured' };
    }

    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });

      this.log(`Event deleted: ${eventId}`, { bookingId });

      return { success: true };
    } catch (error) {
      this.handleError(error, 'deleteCalendarEvent');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark a calendar event as cancelled (update instead of delete)
   * Preferable to deletion for audit trail
   */
  async markEventCancelled(booking: BookingForSync): Promise<SyncResult> {
    const cancelledBooking = {
      ...booking,
      status: 'cancelled',
    };
    return this.updateCalendarEvent(cancelledBooking);
  }

  // ============================================================================
  // Poll Operations (Calendar -> App)
  // ============================================================================

  /**
   * Poll for emergency entries created directly in Calendar
   * Returns list of new entries that need to be imported
   */
  async pollForEmergencyEntries(
    startDate: Date = new Date(),
    endDate?: Date
  ): Promise<{
    entries: Array<{
      event: calendar_v3.Schema$Event;
      parsed: EmergencyEntry;
    }>;
    errors: string[];
  }> {
    const initialized = await this.initialize();
    if (!initialized || !this.calendar) {
      return { entries: [], errors: ['Google Calendar not configured'] };
    }

    const entries: Array<{
      event: calendar_v3.Schema$Event;
      parsed: EmergencyEntry;
    }> = [];
    const errors: string[] = [];

    try {
      // Default end date is 3 months from now
      const effectiveEndDate =
        endDate || new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);

      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startDate.toISOString(),
        timeMax: effectiveEndDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });

      const events = response.data.items || [];

      for (const event of events) {
        // Skip if already synced (has booking_id in description)
        const existingData = this.parseEventDescription(event.description);
        if (existingData?.booking_id) {
          continue;
        }

        // Check for emergency entry
        const emergencyEntry = this.parseEmergencyEntry(event);
        if (emergencyEntry) {
          entries.push({ event, parsed: emergencyEntry });
        }
      }

      this.log(`Found ${entries.length} emergency entries`, {
        totalEvents: events.length,
      });
    } catch (error) {
      this.handleError(error, 'pollForEmergencyEntries');
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return { entries, errors };
  }

  // ============================================================================
  // Database Operations
  // ============================================================================

  /**
   * Update booking with Google Calendar event ID
   */
  private async updateBookingCalendarId(
    bookingId: number,
    eventId: string
  ): Promise<void> {
    await this.query(
      `UPDATE bookings
       SET google_calendar_event_id = $1,
           google_calendar_synced_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [eventId, bookingId]
    );
  }

  /**
   * Update booking sync timestamp
   */
  private async updateBookingSyncTimestamp(bookingId: number): Promise<void> {
    await this.query(
      `UPDATE bookings
       SET google_calendar_synced_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId]
    );
  }

  /**
   * Get booking by ID with driver/vehicle info for sync
   */
  async getBookingForSync(bookingId: number): Promise<BookingForSync | null> {
    const result = await this.queryOne<BookingForSync>(
      `SELECT
        b.id,
        b.booking_number,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.party_size,
        b.tour_date,
        b.start_time::text,
        b.end_time::text,
        b.duration_hours,
        b.pickup_location,
        b.dropoff_location,
        b.special_requests,
        b.status,
        b.driver_id,
        d.name as driver_name,
        b.vehicle_id,
        v.name as vehicle_name,
        b.google_calendar_event_id
      FROM bookings b
      LEFT JOIN users d ON b.driver_id = d.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = $1`,
      [bookingId]
    );

    if (!result) return null;

    // Get wineries
    const wineries = await this.queryMany<{ name: string }>(
      `SELECT w.name
       FROM booking_wineries bw
       JOIN wineries w ON bw.winery_id = w.id
       WHERE bw.booking_id = $1
       ORDER BY bw.visit_order`,
      [bookingId]
    );

    return {
      ...result,
      wineries: wineries.map((w) => w.name),
    };
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Sync a booking to Google Calendar (create or update)
   */
  async syncBooking(bookingId: number): Promise<SyncResult> {
    const booking = await this.getBookingForSync(bookingId);
    if (!booking) {
      return { success: false, error: `Booking ${bookingId} not found` };
    }

    if (booking.google_calendar_event_id) {
      return this.updateCalendarEvent(booking);
    } else {
      return this.pushToCalendar(booking);
    }
  }

  /**
   * Check if sync is configured and ready
   */
  async isConfigured(): Promise<boolean> {
    return this.initialize();
  }
}

// Export singleton instance
export const googleCalendarSyncService = new GoogleCalendarSyncService();
