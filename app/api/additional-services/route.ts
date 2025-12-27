import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

/**
 * GET /api/additional-services
 * List all additional services (optionally filter by active)
 */
export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let sqlQuery = `
    SELECT id, name, description, price, is_active, display_order, icon, created_at, updated_at
    FROM additional_services
  `;

  if (activeOnly) {
    sqlQuery += ' WHERE is_active = TRUE';
  }

  sqlQuery += ' ORDER BY display_order ASC, name ASC';

  const result = await query(sqlQuery);

  return NextResponse.json({
    success: true,
    data: result.rows
  });
});

/**
 * POST /api/additional-services
 * Create a new additional service
 */
export const POST = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json();
  const { name, description, price, icon = '✨' } = body;

  // Validation
  if (!name || !price) {
    throw new BadRequestError('Name and price are required');
  }

  if (price < 0) {
    throw new BadRequestError('Price must be positive');
  }

  // Get next display order
  const orderResult = await query(
    'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM additional_services'
  );
  const displayOrder = orderResult.rows[0].next_order;

  // Insert
  const result = await query(
    `INSERT INTO additional_services (name, description, price, icon, display_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, description || null, price, icon, displayOrder]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Additional service created successfully'
  }, { status: 201 });
});
