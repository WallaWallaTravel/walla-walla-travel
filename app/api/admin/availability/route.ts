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
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/api/middleware/error-handler';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
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

  const conditions: Prisma.Sql[] = [Prisma.sql`1=1`];
  const conditionValues: Prisma.Sql[] = [];

  if (vehicleId) {
    conditionValues.push(Prisma.sql`AND vab.vehicle_id = ${parseInt(vehicleId)}`);
  }

  if (startDate) {
    conditionValues.push(Prisma.sql`AND vab.block_date >= ${startDate}`);
  }

  if (endDate) {
    conditionValues.push(Prisma.sql`AND vab.block_date <= ${endDate}`);
  }

  if (blockType) {
    conditionValues.push(Prisma.sql`AND vab.block_type = ${blockType}`);
  }

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
    Prisma.sql`
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
    WHERE ${Prisma.join([...conditions, ...conditionValues], ' ')}
    ORDER BY vab.block_date DESC, vab.start_time
  `);

  // Also fetch vehicles for the form
  const vehiclesRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, name, capacity, is_active FROM vehicles WHERE is_active = true ORDER BY name
  `;

  return NextResponse.json({
    blocks: rows.map((row: Record<string, unknown>) => ({
      ...row,
      block_date: row.block_date instanceof Date ? row.block_date.toISOString().split('T')[0] : row.block_date
    })),
    vehicles: vehiclesRows
  });
});

// POST - Create new availability block
export const POST =
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
  const conflictCheck = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM vehicle_availability_blocks
     WHERE vehicle_id = ${vehicle_id} AND block_date = ${block_date} AND block_type != 'booking'
     AND (${start_time || null}::time IS NULL OR ${end_time || null}::time IS NULL OR
          (start_time IS NULL AND end_time IS NULL) OR
          (start_time < ${end_time || null}::time AND end_time > ${start_time || null}::time))`;

  if (conflictCheck.length > 0) {
    throw new ConflictError('Conflicting availability block exists for this vehicle and time');
  }

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    INSERT INTO vehicle_availability_blocks
     (vehicle_id, block_date, start_time, end_time, block_type, reason)
     VALUES (${vehicle_id}, ${block_date}, ${start_time || null}, ${end_time || null}, ${block_type}, ${reason || null})
     RETURNING *`;

  return NextResponse.json({
    success: true,
    block: {
      ...rows[0],
      block_date: rows[0].block_date instanceof Date ? rows[0].block_date.toISOString().split('T')[0] : rows[0].block_date
    }
  }, { status: 201 });
}));

// PUT - Update existing availability block
export const PUT =
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session) => {
  const body = PutBodySchema.parse(await request.json());
  const { id, vehicle_id, block_date, start_time, end_time, block_type, reason } = body;

  if (!id) {
    throw new BadRequestError('Missing required field: id');
  }

  // Check if block exists and is not a booking block
  const existingBlock = await prisma.$queryRaw<Array<{ id: number; block_type: string }>>`
    SELECT id, block_type FROM vehicle_availability_blocks WHERE id = ${id}`;

  if (existingBlock.length === 0) {
    throw new NotFoundError('Availability block not found');
  }

  if (existingBlock[0].block_type === 'booking') {
    throw new ForbiddenError('Cannot modify booking-related blocks');
  }

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    UPDATE vehicle_availability_blocks
     SET vehicle_id = COALESCE(${vehicle_id ?? null}, vehicle_id),
         block_date = COALESCE(${block_date ?? null}, block_date),
         start_time = ${start_time || null},
         end_time = ${end_time || null},
         block_type = COALESCE(${block_type ?? null}, block_type),
         reason = ${reason || null},
         updated_at = NOW()
     WHERE id = ${id}
     RETURNING *`;

  return NextResponse.json({
    success: true,
    block: {
      ...rows[0],
      block_date: rows[0].block_date instanceof Date ? rows[0].block_date.toISOString().split('T')[0] : rows[0].block_date
    }
  });
}));

// DELETE - Remove availability block
export const DELETE =
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new BadRequestError('Missing required parameter: id');
  }

  // Check if block exists and is not a booking block
  const existingBlock = await prisma.$queryRaw<Array<{ id: number; block_type: string }>>`
    SELECT id, block_type FROM vehicle_availability_blocks WHERE id = ${parseInt(id)}`;

  if (existingBlock.length === 0) {
    throw new NotFoundError('Availability block not found');
  }

  if (existingBlock[0].block_type === 'booking') {
    throw new ForbiddenError('Cannot delete booking-related blocks. Cancel the booking instead.');
  }

  await prisma.$executeRaw`DELETE FROM vehicle_availability_blocks WHERE id = ${parseInt(id)}`;

  return NextResponse.json({ success: true });
}));
