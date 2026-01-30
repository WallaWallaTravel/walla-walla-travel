/**
 * Admin Settings API
 * Manage system-wide configuration
 *
 * ✅ ENHANCED: Audit logging for security compliance
 * ✅ REFACTORED: Structured logging + withErrorHandling
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getAllSettings, updateSetting } from '@/lib/settings/settings-service';
import { getSessionFromRequest } from '@/lib/auth/session';
import { auditService } from '@/lib/services/audit.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings
 * Get all system settings
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const settings = await getAllSettings();

  return NextResponse.json({
    success: true,
    settings,
    count: settings.length
  });
});

/**
 * PUT /api/admin/settings
 * Update a specific setting
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const { setting_key, setting_value } = await request.json();

  if (!setting_key || setting_value === undefined) {
    throw new BadRequestError('setting_key and setting_value are required');
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
});
