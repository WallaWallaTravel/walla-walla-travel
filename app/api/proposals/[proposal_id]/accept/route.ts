import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';

/**
 * POST /api/proposals/[proposal_id]/accept
 * Accept a proposal and create a booking
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposal_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { proposal_id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      gratuity_amount,
      terms_accepted,
      cancellation_policy_accepted,
      signature,
      signature_date,
    } = body;

    // Validation
    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Contact information is required' },
        { status: 400 }
      );
    }

    if (!terms_accepted || !cancellation_policy_accepted) {
      return NextResponse.json(
        { success: false, error: 'You must accept the terms and conditions' },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Signature is required' },
        { status: 400 }
      );
    }

    // Get proposal
    const proposalResult = await pool.query(
      `SELECT * FROM proposals 
       WHERE proposal_number = $1 OR id::text = $1`,
      [proposal_id]
    );

    if (proposalResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const proposal = proposalResult.rows[0];

    // Check if proposal can be accepted
    if (proposal.status !== 'sent') {
      return NextResponse.json(
        { success: false, error: 'This proposal cannot be accepted' },
        { status: 400 }
      );
    }

    const validUntil = new Date(proposal.valid_until);
    if (validUntil < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This proposal has expired' },
        { status: 400 }
      );
    }

    // Calculate final total with gratuity
    const finalTotal = proposal.total + (gratuity_amount || 0);
    const depositAmount = finalTotal * 0.5;

    // Update proposal status
    await pool.query(
      `UPDATE proposals 
       SET 
         status = 'accepted',
         accepted_at = NOW(),
         accepted_by_name = $1,
         accepted_by_email = $2,
         accepted_by_phone = $3,
         gratuity_amount = $4,
         final_total = $5,
         signature = $6,
         signature_date = $7,
         updated_at = NOW()
       WHERE id = $8`,
      [
        name,
        email,
        phone,
        gratuity_amount || 0,
        finalTotal,
        signature,
        signature_date,
        proposal.id
      ]
    );

    // Log activity
    await pool.query(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        proposal.id,
        'accepted',
        `Proposal accepted by ${name}`,
        JSON.stringify({
          accepted_by: name,
          email,
          phone,
          gratuity_amount: gratuity_amount || 0,
          final_total: finalTotal,
          timestamp: new Date().toISOString()
        })
      ]
    );

    // TODO: Send confirmation email
    // TODO: Create Stripe payment intent for deposit
    // TODO: Create booking record

    return NextResponse.json({
      success: true,
      data: {
        proposal_id: proposal.id,
        proposal_number: proposal.proposal_number,
        final_total: finalTotal,
        deposit_amount: depositAmount,
        message: 'Proposal accepted successfully'
      }
    });
  } catch (error) {
    console.error('Error accepting proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept proposal' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
