/**
 * Google Calendar List API
 * List available calendars for sync configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/integrations/google-calendar/calendars
 * List available Google Calendars
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const credentialsPath = path.join(process.cwd(), 'scripts/import/credentials.json');
  const tokenPath = path.join(process.cwd(), 'scripts/import/token.json');

  // Check credentials exist
  if (!fs.existsSync(credentialsPath)) {
    throw new BadRequestError(
      'Google Calendar credentials not found. Please add credentials.json to scripts/import/'
    );
  }

  if (!fs.existsSync(tokenPath)) {
    throw new BadRequestError(
      'Google Calendar not authorized. Run the import script with --list-calendars to authorize.'
    );
  }

  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

    const { client_secret, client_id, redirect_uris } =
      credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    oAuth2Client.setCredentials(token);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // List all calendars
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    // Format for frontend
    const formattedCalendars = calendars.map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor,
    }));

    return NextResponse.json({
      success: true,
      calendars: formattedCalendars,
      count: formattedCalendars.length,
    });
  } catch (error) {
    throw new BadRequestError(
      `Failed to list calendars: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});
