import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { sendEmailAfterResponse } from '@/lib/email-async';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { getBrandStripeClient } from '@/lib/stripe-brands';
import { logger } from '@/lib/logger';

// Lazy-load healthService to avoid circular imports in serverless bundle
async function getHealthService() {
  const { healthService } = await import('@/lib/services/health.service');
  return healthService;
}

/**
 * POST /api/proposals/[proposal_id]/accept
 * Accept a proposal and create a booking
 * Note: No CSRF required - this is a public client-facing endpoint
 */
export const POST = withRateLimit(rateLimiters.api)(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;
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
    throw new BadRequestError('Contact information is required');
  }

  if (!terms_accepted || !cancellation_policy_accepted) {
    throw new BadRequestError('You must accept the terms and conditions');
  }

  if (!signature) {
    throw new BadRequestError('Signature is required');
  }

  // Get proposal
  const proposalResult = await query(
    `SELECT * FROM proposals
     WHERE proposal_number = $1 OR id::text = $1 OR uuid::text = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = proposalResult.rows[0];

  // Get brand configuration
  const brand = getBrandEmailConfig(proposal.brand_id);

  // Check if proposal can be accepted
  if (proposal.status !== 'sent') {
    throw new BadRequestError('This proposal cannot be accepted');
  }

  const validUntil = new Date(proposal.valid_until);
  if (validUntil < new Date()) {
    throw new BadRequestError('This proposal has expired');
  }

  // Calculate final total with gratuity (ensure numbers, not strings from DB)
  const proposalTotal = typeof proposal.total === 'string' ? parseFloat(proposal.total) : proposal.total;
  const finalTotal = proposalTotal + (gratuity_amount || 0);
  const depositAmount = finalTotal * 0.5;

  // Update proposal status
  await query(
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

  // Log activity (wrapped in try-catch to not fail main operation)
  try {
    await query(
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
  } catch (logError) {
    logger.error('Failed to log proposal acceptance:', { error: logError instanceof Error ? logError.message : String(logError) });
  }

  // Create Stripe payment intent for deposit (using brand-specific Stripe account)
  let paymentIntent: Stripe.PaymentIntent | null = null;
  let clientSecret: string | null = null;

  const stripe = getBrandStripeClient(proposal.brand_id);

  if (stripe) {
    try {
      const hs = await getHealthService();
      paymentIntent = await hs.withRetry(
        () => stripe!.paymentIntents.create({
          amount: Math.round(depositAmount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            proposal_id: proposal.id.toString(),
            proposal_number: proposal.proposal_number,
            brand_id: (proposal.brand_id || 1).toString(),
            type: 'proposal_deposit',
            customer_email: email,
          },
          description: `${brand.name} - Proposal Deposit for ${proposal.proposal_number}`,
          receipt_email: email,
          automatic_payment_methods: {
            enabled: true,
          },
        }),
        'stripe',
        3
      );

      clientSecret = paymentIntent.client_secret;

      // Store payment intent ID on proposal (if column exists)
      try {
        await query(
          `UPDATE proposals SET payment_intent_id = $1 WHERE id = $2`,
          [paymentIntent.id, proposal.id]
        );
      } catch {
        // Column may not exist yet - non-critical
        logger.warn('Could not store payment_intent_id on proposal - column may not exist');
      }

      logger.info('Stripe payment intent created for proposal', {
        proposalNumber: proposal.proposal_number,
        paymentIntentId: paymentIntent.id,
        amount: depositAmount,
        brandId: proposal.brand_id,
      });
    } catch (stripeError) {
      logger.error('Failed to create Stripe payment intent', {
        error: String(stripeError),
        proposalNumber: proposal.proposal_number,
        brandId: proposal.brand_id,
      });
      // Continue without payment intent - admin can manually process
    }
  } else {
    logger.warn('Stripe not configured for brand - payment intent not created', {
      proposalNumber: proposal.proposal_number,
      brandId: proposal.brand_id,
    });
  }

  // Generate payment URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const paymentUrl = `${appUrl}/proposals/${proposal.uuid}/pay`;

  // Send confirmation email to client
  const serviceItems = typeof proposal.service_items === 'string'
    ? JSON.parse(proposal.service_items)
    : proposal.service_items || [];

  const confirmationEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposal Accepted</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">✓ Proposal Accepted!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${brand.name}</p>
      </div>

      <!-- Content -->
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p>Hi ${name},</p>

        <p>Thank you for accepting our proposal! We're excited to create an amazing experience for you.</p>

        <!-- Summary -->
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #166534;">Proposal ${proposal.proposal_number}</h3>
          <p style="margin: 10px 0;"><strong>Services:</strong> ${serviceItems.length} item${serviceItems.length !== 1 ? 's' : ''}</p>
          <p style="margin: 10px 0;"><strong>Total:</strong> $${finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p style="margin: 10px 0;"><strong>Deposit Required:</strong> $${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (50%)</p>
        </div>

        <!-- Payment CTA -->
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #374151; margin-bottom: 15px;">Complete your deposit to confirm your booking:</p>
          <a href="${paymentUrl}" style="display: inline-block; background: ${brand.primary_color}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Pay Deposit Now</a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">Once your deposit is received, we'll begin finalizing all the details for your experience.</p>

        <!-- What's Next -->
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">What's Next?</h3>
          <ol style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li style="margin-bottom: 10px;">Complete your deposit payment</li>
            <li style="margin-bottom: 10px;">We'll confirm your booking details</li>
            <li style="margin-bottom: 10px;">Receive your final itinerary</li>
            <li>Enjoy your wine country experience!</li>
          </ol>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p><strong>${brand.name}</strong></p>
          <p>${brand.website}</p>
          <p>
            <a href="tel:${brand.phone.replace(/[^+\d]/g, '')}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.phone}</a> •
            <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.reply_to}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send confirmation email after response (non-blocking)
  sendEmailAfterResponse(
    {
      to: email,
      subject: `Proposal Accepted - ${proposal.proposal_number} | ${brand.name}`,
      html: confirmationEmailHtml,
      text: `Hi ${name},\n\nThank you for accepting our proposal (${proposal.proposal_number})!\n\nTotal: $${finalTotal.toFixed(2)}\nDeposit Required: $${depositAmount.toFixed(2)} (50%)\n\nComplete your deposit payment here: ${paymentUrl}\n\nOnce your deposit is received, we'll begin finalizing all the details for your experience.\n\nBest regards,\n${brand.name}\n${brand.phone}`,
    },
    { proposalNumber: proposal.proposal_number }
  );

  logger.info('Proposal accepted, confirmation email queued', {
    proposalNumber: proposal.proposal_number,
    acceptedBy: name,
    finalTotal,
    depositAmount,
  });

  return NextResponse.json({
    success: true,
    data: {
      proposal_id: proposal.id,
      proposal_number: proposal.proposal_number,
      final_total: finalTotal,
      deposit_amount: depositAmount,
      payment_url: paymentUrl,
      client_secret: clientSecret,
      payment_intent_id: paymentIntent?.id || null,
      message: 'Proposal accepted! Complete payment to confirm your booking.'
    }
  });
}));
