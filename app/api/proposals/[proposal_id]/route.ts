import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api/middleware/error-handler';
import {
  ProposalData,
  calculateProposalTotals
} from '@/lib/proposals/proposal-utils';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * GET /api/proposals/[proposal_id]
 * Get proposal details for client view
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;

  // Fetch proposal by proposal_number or ID
  const result = await query(
    `SELECT
      id,
      proposal_number,
      title,
      client_name,
      client_email,
      client_phone,
      service_items,
      subtotal,
      discount_amount,
      discount_percentage,
      total,
      gratuity_enabled,
      gratuity_percentage,
      notes,
      valid_until,
      status,
      created_at,
      modules,
      corporate_details,
      multi_day_itinerary,
      b2b_details,
      special_event_details,
      group_coordination
     FROM proposals
     WHERE proposal_number = $1 OR id::text = $1 OR uuid::text = $1`,
    [proposal_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = result.rows[0];

  // Log view (for analytics)
  await query(
    `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4)`,
    [proposal.id, 'viewed', 'Proposal viewed by client', JSON.stringify({ viewed_at: new Date().toISOString() })]
  );

  return NextResponse.json({
    success: true,
    data: proposal
  });
});

/**
 * PATCH /api/proposals/[proposal_id]
 * Update an existing proposal
 */
export const PATCH = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;
  const updates: Partial<ProposalData> = await request.json();

  // Fetch current proposal
  const currentResult = await query(
    'SELECT * FROM proposals WHERE proposal_number = $1 OR id::text = $1',
    [proposal_id]
  );

  if (currentResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const currentProposal = currentResult.rows[0];

  // Check if proposal can be edited
  if (currentProposal.status === 'accepted' || currentProposal.status === 'converted') {
    throw new ForbiddenError('Cannot edit accepted or converted proposals');
  }

  // Merge current data with updates
  const mergedData = {
    ...currentProposal,
    ...updates,
    service_items: updates.service_items || currentProposal.service_items
  };

  // Recalculate totals if service items or pricing changed
  let totals = {
    subtotal: currentProposal.subtotal,
    discountAmount: currentProposal.discount_amount,
    total: currentProposal.total
  };

  if (updates.service_items || updates.discount_percentage !== undefined) {
    totals = calculateProposalTotals(mergedData);
  }

  // Build update query dynamically
  const updateFields: string[] = [];
  const updateValues: unknown[] = [];
  let paramCount = 0;

  // Helper to add field
  const addField = (field: string, value: unknown) => {
    paramCount++;
    updateFields.push(`${field} = $${paramCount}`);
    updateValues.push(value);
  };

  // Update fields
  if (updates.client_name !== undefined) addField('client_name', updates.client_name);
  if (updates.client_email !== undefined) addField('client_email', updates.client_email);
  if (updates.client_phone !== undefined) addField('client_phone', updates.client_phone);
  if (updates.client_company !== undefined) addField('client_company', updates.client_company);
  if (updates.proposal_title !== undefined) addField('proposal_title', updates.proposal_title);
  if (updates.introduction !== undefined) addField('introduction', updates.introduction);
  if (updates.wine_tour_description !== undefined) addField('wine_tour_description', updates.wine_tour_description);
  if (updates.transfer_description !== undefined) addField('transfer_description', updates.transfer_description);
  if (updates.wait_time_description !== undefined) addField('wait_time_description', updates.wait_time_description);
  if (updates.special_notes !== undefined) addField('special_notes', updates.special_notes);
  if (updates.cancellation_policy !== undefined) addField('cancellation_policy', updates.cancellation_policy);
  if (updates.footer_notes !== undefined) addField('footer_notes', updates.footer_notes);
  if (updates.service_items !== undefined) addField('service_items', JSON.stringify(updates.service_items));
  if (updates.lunch_coordination !== undefined) addField('lunch_coordination', updates.lunch_coordination);
  if (updates.lunch_coordination_count !== undefined) addField('lunch_coordination_count', updates.lunch_coordination_count);
  if (updates.photography_package !== undefined) addField('photography_package', updates.photography_package);
  if (updates.discount_percentage !== undefined) addField('discount_percentage', updates.discount_percentage);
  if (updates.discount_reason !== undefined) addField('discount_reason', updates.discount_reason);
  if (updates.include_gratuity_request !== undefined) addField('include_gratuity_request', updates.include_gratuity_request);
  if (updates.suggested_gratuity_percentage !== undefined) addField('suggested_gratuity_percentage', updates.suggested_gratuity_percentage);
  if (updates.gratuity_optional !== undefined) addField('gratuity_optional', updates.gratuity_optional);
  if (updates.valid_until !== undefined) addField('valid_until', updates.valid_until);
  if (updates.modules !== undefined) addField('modules', JSON.stringify(updates.modules));
  if (updates.corporate_details !== undefined) addField('corporate_details', JSON.stringify(updates.corporate_details));
  if (updates.multi_day_itinerary !== undefined) addField('multi_day_itinerary', JSON.stringify(updates.multi_day_itinerary));

  // Update totals
  addField('subtotal', totals.subtotal);
  addField('discount_amount', totals.discountAmount);
  addField('total', totals.total);
  addField('updated_at', new Date().toISOString());

  if (updateFields.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  // Execute update
  paramCount++;
  const queryString = `
    UPDATE proposals
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, proposal_number, uuid, status
  `;
  updateValues.push(currentProposal.id);

  const result = await query(queryString, updateValues);

  // Log activity
  await query(
    `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      currentProposal.id,
      'updated',
      'Proposal updated',
      JSON.stringify({ updated_fields: Object.keys(updates) })
    ]
  );

  // If proposal was sent, notify client of changes
  if (currentProposal.status === 'sent' || currentProposal.status === 'viewed') {
    // TODO: Send email notification to client about updates
    await query(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        currentProposal.id,
        'client_notified',
        'Client notified of proposal changes',
        null
      ]
    );
  }

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Proposal updated successfully'
  });
})));

/**
 * DELETE /api/proposals/[proposal_id]
 * Delete a proposal (only drafts can be deleted)
 */
export const DELETE = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;

  // Fetch proposal
  const result = await query(
    'SELECT id, proposal_number, status FROM proposals WHERE proposal_number = $1 OR id::text = $1',
    [proposal_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = result.rows[0];

  // Only allow deletion of drafts
  if (proposal.status !== 'draft') {
    throw new ForbiddenError('Only draft proposals can be deleted');
  }

  // Delete proposal (CASCADE will delete related records)
  await query('DELETE FROM proposals WHERE id = $1', [proposal.id]);

  return NextResponse.json({
    success: true,
    message: 'Proposal deleted successfully'
  });
})));
