/**
 * Admin Availability Blocks API
 *
 * CRUD operations for managing vehicle availability blocks.
 * Used for maintenance windows, blackout dates, and manual holds.
 *
 * Endpoints:
 * - GET /api/admin/availability-blocks - List blocks
 * - POST /api/admin/availability-blocks - Create block (maintenance/blackout/hold)
 * - DELETE /api/admin/availability-blocks?id=X - Delete block
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, ValidationError, NotFoundError, ForbiddenError } from '@/lib/api/middleware/error-handler';
import { vehicleAvailabilityService, BlockType } from '@/lib/services/vehicle-availability.service';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const ListBlocksSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vehicle_id: z.coerce.number().optional(),
  block_type: z.enum(['booking', 'maintenance', 'hold', 'buffer', 'blackout']).optional(),
});

const CreateBlockSchema = z.object({
  vehicle_id: z.number().int().positive(),
  block_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  block_type: z.enum(['maintenance', 'hold', 'blackout']),
  notes: z.string().max(500).optional(),
  brand_id: z.number().int().positive().optional(),
});

// ============================================================================
// GET Handler - List Blocks
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const params = Object.fromEntries(searchParams.entries());
  const validated = ListBlocksSchema.parse(params);

  // Default to current month if no dates specified
  const today = new Date();
  const startDate = validated.start_date || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const endDate = validated.end_date || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const blocks = await vehicleAvailabilityService.getBlocksInRange(
    startDate,
    endDate,
    validated.vehicle_id
  );

  // Filter by block type if specified
  const filteredBlocks = validated.block_type
    ? blocks.filter(b => b.block_type === validated.block_type)
    : blocks;

  // Group by date for easier display
  const blocksByDate: Record<string, typeof blocks> = {};
  for (const block of filteredBlocks) {
    if (!blocksByDate[block.block_date]) {
      blocksByDate[block.block_date] = [];
    }
    blocksByDate[block.block_date].push(block);
  }

  return NextResponse.json({
    start_date: startDate,
    end_date: endDate,
    vehicle_id: validated.vehicle_id,
    block_type: validated.block_type,
    blocks: filteredBlocks,
    blocks_by_date: blocksByDate,
    total: filteredBlocks.length,
  });
});

// ============================================================================
// POST Handler - Create Block
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validated = CreateBlockSchema.parse(body);

  // Validate time range
  if (validated.end_time <= validated.start_time) {
    throw new ValidationError('End time must be after start time');
  }

  // Validate date is not in the past for non-historical entries
  const blockDate = new Date(validated.block_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (blockDate < today) {
    throw new ValidationError('Cannot create blocks in the past');
  }

  // Create the block based on type
  let block;
  if (validated.block_type === 'maintenance') {
    block = await vehicleAvailabilityService.createMaintenanceBlock({
      vehicleId: validated.vehicle_id,
      date: validated.block_date,
      startTime: validated.start_time,
      endTime: validated.end_time,
      reason: validated.notes || 'Scheduled maintenance',
    });
  } else {
    // For hold and blackout types
    block = await vehicleAvailabilityService.createHoldBlock({
      vehicleId: validated.vehicle_id,
      date: validated.block_date,
      startTime: validated.start_time,
      endTime: validated.end_time,
      brandId: validated.brand_id,
      notes: validated.notes,
    });

    // Update block type if not hold
    if (validated.block_type !== 'hold') {
      // Update the block type directly
      await vehicleAvailabilityService['query'](
        'UPDATE vehicle_availability_blocks SET block_type = $1 WHERE id = $2',
        [validated.block_type, block.id]
      );
      block.block_type = validated.block_type;
    }
  }

  return NextResponse.json({
    message: `${validated.block_type} block created successfully`,
    block,
  }, { status: 201 });
});

// ============================================================================
// DELETE Handler - Delete Block
// ============================================================================

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const blockId = searchParams.get('id');

  if (!blockId) {
    throw new ValidationError('Block ID is required');
  }

  const id = parseInt(blockId, 10);
  if (isNaN(id)) {
    throw new ValidationError('Invalid block ID');
  }

  await vehicleAvailabilityService.deleteBlock(id);

  return NextResponse.json({
    message: 'Block deleted successfully',
    deleted_id: id,
  });
});
