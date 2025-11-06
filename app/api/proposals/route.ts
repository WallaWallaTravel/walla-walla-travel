import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  ProposalData,
  generateProposalNumber,
  getDefaultProposalText,
  calculateProposalTotals,
  validateProposalData,
  logProposalActivity
} from '@/lib/proposals/proposal-utils';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * GET /api/proposals
 * List all proposals (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let query = `
      SELECT 
        id,
        proposal_number,
        uuid,
        client_name,
        client_email,
        client_phone,
        client_company,
        proposal_title,
        status,
        total,
        valid_until,
        created_at,
        updated_at,
        sent_at,
        viewed_at,
        accepted_at,
        view_count,
        service_items
      FROM proposals
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    // Filter by status
    if (status && status !== 'all') {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    // Search by client name or email
    if (search) {
      paramCount++;
      query += ` AND (client_name ILIKE $${paramCount} OR client_email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Order by most recent first
    query += ` ORDER BY created_at DESC`;
    
    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM proposals WHERE 1=1';
    const countParams: any[] = [];
    let countParamCount = 0;
    
    if (status && status !== 'all') {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (client_name ILIKE $${countParamCount} OR client_email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proposals
 * Create new proposal
 */
export async function POST(request: NextRequest) {
  try {
    const data: ProposalData = await request.json();
    
    // Validate data
    const errors = validateProposalData(data);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }
    
    // Calculate totals
    const totals = calculateProposalTotals(data);
    
    // Generate proposal number
    const proposalNumber = generateProposalNumber();
    
    // Get default text if not provided
    const defaults = await getDefaultProposalText(pool);
    
    // Merge with defaults
    const proposalTitle = data.proposal_title || defaults.title;
    const introduction = data.introduction || defaults.introduction;
    const wineTourDescription = data.wine_tour_description || defaults.wine_tour_description;
    const transferDescription = data.transfer_description || defaults.transfer_description;
    const waitTimeDescription = data.wait_time_description || defaults.wait_time_description;
    const cancellationPolicy = data.cancellation_policy || defaults.cancellation_policy;
    const footerNotes = data.footer_notes || defaults.footer_notes;
    const termsAndConditions = defaults.terms_and_conditions;
    
    // Insert proposal
    const result = await pool.query(
      `INSERT INTO proposals (
        proposal_number,
        client_name,
        client_email,
        client_phone,
        client_company,
        proposal_title,
        introduction,
        wine_tour_description,
        transfer_description,
        wait_time_description,
        special_notes,
        cancellation_policy,
        footer_notes,
        terms_and_conditions,
        service_items,
        additional_services,
        subtotal,
        discount_percentage,
        discount_reason,
        discount_amount,
        total,
        include_gratuity_request,
        suggested_gratuity_percentage,
        gratuity_optional,
        valid_until,
        status,
        modules,
        corporate_details,
        multi_day_itinerary,
        b2b_details,
        special_event_details,
        group_coordination
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32
      ) RETURNING id, proposal_number, uuid`,
      [
        proposalNumber,
        data.client_name,
        data.client_email,
        data.client_phone,
        data.client_company || null,
        proposalTitle,
        introduction,
        wineTourDescription,
        transferDescription,
        waitTimeDescription,
        data.special_notes || null,
        cancellationPolicy,
        footerNotes,
        termsAndConditions,
        JSON.stringify(data.service_items),
        JSON.stringify(data.additional_services || []),
        totals.subtotal,
        data.discount_percentage || 0,
        data.discount_reason || null,
        totals.discountAmount,
        totals.total,
        data.include_gratuity_request !== false,
        data.suggested_gratuity_percentage || 18,
        data.gratuity_optional !== false,
        data.valid_until,
        'draft',
        JSON.stringify(data.modules || {}),
        data.corporate_details ? JSON.stringify(data.corporate_details) : null,
        data.multi_day_itinerary ? JSON.stringify(data.multi_day_itinerary) : null,
        data.b2b_details ? JSON.stringify(data.b2b_details) : null,
        data.special_event_details ? JSON.stringify(data.special_event_details) : null,
        data.group_coordination ? JSON.stringify(data.group_coordination) : null
      ]
    );
    
    const proposal = result.rows[0];
    
    // Log activity
    await logProposalActivity(
      pool,
      proposal.id,
      'created',
      `Proposal created: ${proposalNumber}`
    );
    
    return NextResponse.json({
      success: true,
      data: {
        id: proposal.id,
        proposal_number: proposal.proposal_number,
        uuid: proposal.uuid
      },
      message: 'Proposal created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

