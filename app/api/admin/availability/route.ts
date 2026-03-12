/**
 * Admin Availability Management API
 *
 * CRUD operations for vehicle availability blocks:
 * - GET: List availability blocks
 * - POST: Create new block
 * - PUT: Update existing block
 * - DELETE: Remove block
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/api/middleware/error-handler';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { z } from 'zod';

const PostBodySchema = z.object({
  vehicle_id: z.number().int().positive(),
  block_date: z.string().min(1).max(255),
  start_time: z.string().max(255).optional(),
  end_time: z.string().max(255).optional(),
  block_type: z.enum(['maintenance', 'blackout', 'hold']),
  reason: z.string().max(500).optional(),
});

const PutBodySchema = z.object({
  id: z.number().int().positive(),
  vehicle_id: z.number().int().positive().optional(),
  block_date: z.string().min(1).max(255).optional(),
  start_time: z.string().max(255).optional(),
  end_time: z.string().max(255).optional(),
  block_type: z.enum(['maintenance', 'blackout', 'hold']).optional(),
  reason: z.string().max(500).optional(),
});

// GET - List availability blocks
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const blockType = searchParams.get('block_type');

  let sql = `
    SELECT
      vab.id,
      vab.vehicle_id,
      vab.block_date,
      vab.start_time,
      vab.end_time,
      vab.block_type,
      vab.reason,
      vab.booking_id,
      vab.created_at,
      vab.updated_at,
      v.name as vehicle_name,
      v.capacity as vehicle_capacity
    FROM vehicle_availability_blocks vab
    LEFT JOIN vehicles v ON vab.vehicle_id = v.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (vehicleId) {
    sql += ` AND vab.vehicle_id = $${paramIndex++}`;
    params.push(parseInt(vehicleId));
  }

  if (startDate) {
    sql += ` AND vab.block_date >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND vab.block_date <= $${paramIndex++}`;
    params.push(endDate);
  }

  if (blockType) {
    sql += ` AND vab.block_type = $${paramIndex++}`;
    params.push(blockType);
  }

  sql += ` ORDER BY vab.block_date DESC, vab.start_time`;

  const result = await prisma.$queryRawUnsafe(sql, ...params) as Record<string, any>[];

  // Also fetch vehicles for the form
  const vehiclesResult = await prisma.$queryRaw`SELECT id, name, capacity, is_active FROM vehicles WHERE is_active = true ORDER BY name` as Record<string, any>[];

  return NextResponse.json({
    blocks: result.map(row => ({
      ...row,
      block_date: row.block_date?.toISOString().split('T')[0]
    })),
    vehicles: vehiclesResult
  });
});

// POST - Create new availability block
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session) => {
  const body = PostBodySchema.parse(await request.json());
  const { vehicle_id, block_date, start_time, end_time, block_type, reason } = body;

  // Validation
  if (!vehicle_id || !block_date || !block_type) {
    throw new BadRequestError('Missing required fields: vehicle_id, block_date, block_type');
  }

  const validBlockTypes = ['maintenance', 'blackout', 'hold'];
  if (!validBlockTypes.includes(block_type)) {
    throw new BadRequestError('Invalid block_type. Must be: maintenance, blackout, or hold');
  }

  // Check for conflicts
  const conflictCheck = await prisma.$queryRawUnsafe(
    `SELECT id FROM vehicle_availability_blocks
     WHERE vehicle_id = $1 AND block_date = $2 AND block_type != 'booking'
     AND ($3::time IS NULL OR $4::time IS NULL OR
          (start_time IS NULL AND end_time IS NULL) OR
          (start_time < $4::time AND end_time > $3::time))`,
    vehicle_id, block_date, start_time || null, end_time || null
  ) as Record<string, any>[];

  if (conflictCheck.length > 0) {
    throw new ConflictError('Conflicting availability block exists for this vehicle and time');
  }

  const result = await prisma.$queryRawUnsafe(
    `INSERT INTO vehicle_availability_blocks
     (vehicle_id, block_date, start_time, end_time, block_type, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    vehicle_id, block_date, start_time || null, end_time || null, block_type, reason || null
  ) as Record<string, any>[];

  return NextResponse.json({
    success: true,
    block: {
      ...result[0],
      block_date: result[0].block_date?.toISOString().split('T')[0]
    }
  }, { status: 201 });
})));

// PUT - Update existing availability block
export const PUT = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session) => {
  const body = PutBodySchema.parse(await request.json());
  const { id, vehicle_id, block_date, start_time, end_time, block_type, reason } = body;

  if (!id) {
    throw new BadRequestError('Missing required field: id');
  }

  // Check if block exists and is not a booking block
  const existingBlock = await prisma.$queryRawUnsafe(
    `SELECT id, block_type FROM vehicle_availability_blocks WHERE id = $1`,
    id
  ) as Record<string, any>[];

  if (existingBlock.length === 0) {
    throw new NotFoundError('Availability block not found');
  }

  if (existingBlock[0].block_type === 'booking') {
    throw new ForbiddenError('Cannot modify booking-related blocks');
  }

  const result = await prisma.$queryRawUnsafe(
    `UPDATE vehicle_availability_blocks
     SET vehicle_id = COALESCE($2, vehicle_id),
         block_date = COALESCE($3, block_date),
         start_time = $4,
         end_time = $5,
         block_type = COALESCE($6, block_type),
         reason = $7,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    id, vehicle_id, block_date, start_time || null, end_time || null, block_type, reason || null
  ) as Record<string, any>[];

  return NextResponse.json({
    success: true,
    block: {
      ...result[0],
      block_date: result[0].block_date?.toISOString().split('T')[0]
    }
  });
})));

// DELETE - Remove availability block
export const DELETE = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new BadRequestError('Missing required parameter: id');
  }

  // Check if block exists and is not a booking block
  const existingBlock2 = await prisma.$queryRawUnsafe(
    `SELECT id, block_type FROM vehicle_availability_blocks WHERE id = $1`,
    id
  ) as Record<string, any>[];

  if (existingBlock2.length === 0) {
    throw new NotFoundError('Availability block not found');
  }

  if (existingBlock2[0].block_type === 'booking') {
    throw new ForbiddenError('Cannot delete booking-related blocks. Cancel the booking instead.');
  }

  await prisma.$queryRawUnsafe(
    `DELETE FROM vehicle_availability_blocks WHERE id = $1`,
    id
  );

  return NextResponse.json({ success: true });
})));
