import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';
import {
  ProposalData,
  calculateProposalTotals,
  validateProposalData,
  logProposalActivity
} from '@/lib/proposals/proposal-utils';

/**
 * GET /api/proposals/[proposal_id]
 * Get proposal details for client view
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposal_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { proposal_id } = await params;

  try {
    // Fetch proposal by proposal_number or ID
    const result = await pool.query(
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
       WHERE proposal_number = $1 OR id::text = $1`,
      [proposal_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const proposal = result.rows[0];

    // Log view (for analytics)
    await pool.query(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [proposal.id, 'viewed', 'Proposal viewed by client', JSON.stringify({ viewed_at: new Date().toISOString() })]
    );

    return NextResponse.json({
      success: true,
      data: proposal
    });
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proposal' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * PATCH /api/proposals/[proposal_id]
 * Update an existing proposal
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ proposal_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { proposal_id } = await params;

  try {
    const updates: Partial<ProposalData> = await request.json();
    
    // Fetch current proposal
    const currentResult = await pool.query(
      'SELECT * FROM proposals WHERE proposal_number = $1 OR id::text = $1',
      [proposal_id]
    );
    
    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }
    
    const currentProposal = currentResult.rows[0];
    
    // Check if proposal can be edited
    if (currentProposal.status === 'accepted' || currentProposal.status === 'converted') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit accepted or converted proposals' },
        { status: 403 }
      );
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
    const updateValues: any[] = [];
    let paramCount = 0;
    
    // Helper to add field
    const addField = (field: string, value: any) => {
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
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Execute update
    paramCount++;
    const query = `
      UPDATE proposals 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, proposal_number, uuid, status
    `;
    updateValues.push(currentProposal.id);
    
    const result = await pool.query(query, updateValues);
    
    // Log activity
    await logProposalActivity(
      pool,
      currentProposal.id,
      'updated',
      'Proposal updated',
      { updated_fields: Object.keys(updates) }
    );
    
    // If proposal was sent, notify client of changes
    if (currentProposal.status === 'sent' || currentProposal.status === 'viewed') {
      // TODO: Send email notification to client about updates
      await logProposalActivity(
        pool,
        currentProposal.id,
        'client_notified',
        'Client notified of proposal changes'
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Proposal updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * DELETE /api/proposals/[proposal_id]
 * Delete a proposal (only drafts can be deleted)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ proposal_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { proposal_id } = await params;

  try {
    // Fetch proposal
    const result = await pool.query(
      'SELECT id, proposal_number, status FROM proposals WHERE proposal_number = $1 OR id::text = $1',
      [proposal_id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }
    
    const proposal = result.rows[0];
    
    // Only allow deletion of drafts
    if (proposal.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Only draft proposals can be deleted' },
        { status: 403 }
      );
    }
    
    // Delete proposal (CASCADE will delete related records)
    await pool.query('DELETE FROM proposals WHERE id = $1', [proposal.id]);
    
    return NextResponse.json({
      success: true,
      message: 'Proposal deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete proposal' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}