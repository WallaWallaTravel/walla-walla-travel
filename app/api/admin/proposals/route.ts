import { NextRequest, NextResponse } from 'next/server';
import { BadRequestError } from '@/lib/api-errors';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query, queryMany } from '@/lib/db-helpers';

/**
 * POST /api/admin/proposals
 * Create a new proposal
 */
export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  
  const {
    client_name,
    client_email,
    client_phone,
    client_company,
    tour_date,
    flexible_dates,
    duration_hours,
    party_size,
    pickup_location,
    selected_wineries,
    base_price,
    additional_services,
    discount_percentage,
    discount_reason,
    proposal_title,
    introduction,
    special_notes,
    terms_and_conditions,
    valid_until,
  } = body;

  if (!client_name || !client_email || !tour_date) {
    throw new BadRequestError('client_name, client_email, and tour_date are required');
  }

  // Calculate totals
  const services_total = additional_services
    .filter((s: { included: boolean; price: number }) => s.included)
    .reduce((sum: number, s: { included: boolean; price: number }) => sum + s.price, 0);
  
  const subtotal = base_price + services_total;
  const discount_amount = subtotal * (discount_percentage / 100);
  const total_price = subtotal - discount_amount;
  const deposit_amount = total_price * 0.5;

  // Generate proposal number
  const proposal_number = `PROP-${Date.now()}`;

  // Insert proposal
  const result = await query<{ id: number; proposal_number: string }>(
    `INSERT INTO proposals (
      proposal_number,
      client_name,
      client_email,
      client_phone,
      client_company,
      tour_date,
      flexible_dates,
      duration_hours,
      party_size,
      pickup_location,
      selected_wineries,
      base_price,
      additional_services,
      services_total,
      discount_percentage,
      discount_amount,
      discount_reason,
      subtotal,
      total_price,
      deposit_amount,
      proposal_title,
      introduction,
      special_notes,
      terms_and_conditions,
      valid_until,
      status,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, 'draft', NOW(), NOW()
    ) RETURNING id, proposal_number`,
    [
      proposal_number,
      client_name,
      client_email,
      client_phone,
      client_company,
      tour_date,
      flexible_dates,
      duration_hours,
      party_size,
      pickup_location,
      JSON.stringify(selected_wineries),
      base_price,
      JSON.stringify(additional_services),
      services_total,
      discount_percentage,
      discount_amount,
      discount_reason,
      subtotal,
      total_price,
      deposit_amount,
      proposal_title,
      introduction,
      special_notes,
      terms_and_conditions,
      valid_until,
    ]
  );
  const proposal = result.rows[0];

  return NextResponse.json({
    success: true,
    message: 'Proposal created successfully',
    data: {
      proposal_id: proposal.id,
      proposal_number: proposal.proposal_number,
    },
  });
});

/**
 * GET /api/admin/proposals
 * Get all proposals
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  let query = `
    SELECT 
      id,
      proposal_number,
      client_name,
      client_email,
      client_company,
      tour_date,
      duration_hours,
      party_size,
      total_price,
      status,
      valid_until,
      created_at,
      sent_at,
      viewed_at,
      accepted_at
    FROM proposals
    WHERE 1=1
  `;

  const params: string[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC`;

  const proposals = await queryMany(query, params);

  return NextResponse.json({
    success: true,
    data: {
      proposals,
      count: proposals.length,
    },
  });
});

