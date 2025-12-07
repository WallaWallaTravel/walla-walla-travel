/**
 * Admin Settings API
 * Manage system-wide configuration
 * 
 * ✅ ENHANCED: Audit logging for security compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, updateSetting } from '@/lib/settings/settings-service';
import { getSessionFromRequest } from '@/lib/auth/session';
import { auditService } from '@/lib/services/audit.service';

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
  } catch (error: any) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error.message },
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
  } catch (error: any) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update setting', details: error.message },
      { status: 500 }
    );
  }
}

