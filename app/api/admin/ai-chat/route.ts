/**
 * Admin AI Chat Configuration API
 *
 * GET /api/admin/ai-chat - Get all AI config entries
 * POST /api/admin/ai-chat - Create new config entry
 * PUT /api/admin/ai-chat - Update config entry
 * DELETE /api/admin/ai-chat - Delete config entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { aiConfigService, AIConfigType } from '@/lib/services/ai-config.service';

// ============================================================================
// Request Schemas
// ============================================================================

const CreateConfigSchema = z.object({
  config_type: z.enum(['system_prompt', 'partner_note', 'global_knowledge', 'example', 'blocklist']),
  key: z.string().optional(),
  value: z.string().min(1, 'Value is required'),
  is_active: z.boolean().optional(),
  priority: z.number().optional(),
});

const UpdateConfigSchema = z.object({
  id: z.number(),
  key: z.string().optional(),
  value: z.string().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().optional(),
});

const DeleteConfigSchema = z.object({
  id: z.number(),
});

// ============================================================================
// GET Handler - Get all config entries
// ============================================================================

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as AIConfigType | null;

  const configs = await aiConfigService.getAllConfig(type || undefined);

  return NextResponse.json({
    success: true,
    data: {
      configs,
      summary: {
        total: configs.length,
        active: configs.filter(c => c.is_active).length,
        byType: {
          system_prompt: configs.filter(c => c.config_type === 'system_prompt').length,
          partner_note: configs.filter(c => c.config_type === 'partner_note').length,
          global_knowledge: configs.filter(c => c.config_type === 'global_knowledge').length,
          example: configs.filter(c => c.config_type === 'example').length,
          blocklist: configs.filter(c => c.config_type === 'blocklist').length,
        },
      },
    },
  });
});

// ============================================================================
// POST Handler - Create new config
// ============================================================================

export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();

  const parseResult = CreateConfigSchema.safeParse(body);
  if (!parseResult.success) {
    throw new BadRequestError('Invalid request: ' + parseResult.error.issues.map(i => i.message).join(', '));
  }

  const config = await aiConfigService.createConfig(parseResult.data);

  return NextResponse.json({
    success: true,
    data: { config },
  });
});

// ============================================================================
// PUT Handler - Update config
// ============================================================================

export const PUT = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();

  // Handle toggle active action
  if (body.action === 'toggle') {
    const id = body.id;
    if (!id || typeof id !== 'number') {
      throw new BadRequestError('ID is required for toggle');
    }
    const config = await aiConfigService.toggleActive(id);
    return NextResponse.json({
      success: true,
      data: { config },
    });
  }

  const parseResult = UpdateConfigSchema.safeParse(body);
  if (!parseResult.success) {
    throw new BadRequestError('Invalid request: ' + parseResult.error.issues.map(i => i.message).join(', '));
  }

  const { id, ...updates } = parseResult.data;
  const config = await aiConfigService.updateConfig(id, updates);

  if (!config) {
    throw new BadRequestError('Config not found');
  }

  return NextResponse.json({
    success: true,
    data: { config },
  });
});

// ============================================================================
// DELETE Handler - Delete config
// ============================================================================

export const DELETE = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();

  const parseResult = DeleteConfigSchema.safeParse(body);
  if (!parseResult.success) {
    throw new BadRequestError('Invalid request: ' + parseResult.error.issues.map(i => i.message).join(', '));
  }

  const deleted = await aiConfigService.deleteConfig(parseResult.data.id);

  if (!deleted) {
    throw new BadRequestError('Config not found');
  }

  return NextResponse.json({
    success: true,
    data: { deleted: true },
  });
});
