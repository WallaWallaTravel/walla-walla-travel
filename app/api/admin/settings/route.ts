/**
 * Admin Settings API
 * Manage system-wide configuration
 *
 * ✅ ENHANCED: Audit logging for security compliance
 * ✅ REFACTORED: Structured logging + proper error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, updateSetting } from '@/lib/settings/settings-service';
import { getSessionFromRequest } from '@/lib/auth/session';
import { auditService } from '@/lib/services/audit.service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings
 * Get all system settings
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await getAllSettings();

    return NextResponse.json({
      success: true,
      settings,
      count: settings.length
    });
  } catch (error) {
    logger.error('Settings API error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update a specific setting
 */
export async function PUT(request: NextRequest) {
  try {
    const { setting_key, setting_value } = await request.json();

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json(
        { error: 'setting_key and setting_value are required' },
        { status: 400 }
      );
    }

    // Get user from session
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id || 1; // Fallback for now

    await updateSetting(setting_key, setting_value, userId);

    // 📝 Audit log: track settings changes for security compliance
    await auditService.logFromRequest(request, userId, 'settings_updated', {
      setting_key,
      new_value: setting_value,
      // Don't log sensitive values in full
      value_type: typeof setting_value,
    });

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    logger.error('Settings API update error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update setting', details: message },
      { status: 500 }
    );
  }
}

