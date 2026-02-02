/**
 * Public Inquiry API Route
 *
 * Allows public users to submit wine tour inquiries
 * Stores to experience_requests table, sends confirmation & staff notification emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError, ValidationError } from '@/lib/api/middleware/error-handler';
import { experienceRequestService } from '@/lib/services/experience-request.service';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

// Validation schema for public inquiry form
const InquirySchema = z.object({
  // Required fields
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().min(10, 'Please provide a valid phone number'),
  tour_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  party_size: z.number().int().min(1, 'Party size must be at least 1').max(50, 'For groups over 50, please contact us directly'),
  tour_type: z.enum(['wine_tour', 'private_transportation', 'corporate', 'airport_transfer']),

  // Optional fields
  tour_duration_type: z.enum(['single', 'multi']).optional().default('single'),
  tour_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  wine_tour_preference: z.enum(['private', 'open_to_shared', 'open_to_private_offset', 'early_week_combo', '']).optional(),
  lodging_location: z.string().max(500).optional(),
  additional_info: z.string().max(2000).optional(),
  referral_source: z.enum([
    'google', 'ai_search', 'social_media', 'friend_referral',
    'hotel_concierge', 'winery_recommendation', 'repeat_customer', 'other', ''
  ]).optional(),
  specific_social_media: z.string().max(100).optional(),
  specific_ai: z.string().max(100).optional(),
  hotel_concierge_name: z.string().max(200).optional(),
  referral_other_details: z.string().max(500).optional(),
  can_text: z.boolean().optional().default(true),
  newsletter_signup: z.boolean().optional().default(false),

  // Honeypot field for spam protection
  website: z.string().optional(),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate input
  const validation = InquirySchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('. ');
    throw new ValidationError(`Please fix the following: ${errors}`);
  }

  const data = validation.data;

  // Honeypot spam check - if website field is filled, silently succeed (bot detected)
  if (data.website && data.website.length > 0) {
    logger.info('Honeypot triggered - likely spam submission', { email: data.email });
    // Return success to fool bots
    return NextResponse.json({
      success: true,
      request_number: 'EXP-SPAM-0000',
      message: 'Thank you! We will contact you within 24 hours.',
    }, { status: 201 });
  }

  // Validate tour date is in the future
  const tourDate = new Date(data.tour_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (tourDate < today) {
    throw new BadRequestError('The tour date must be in the future. Please choose an upcoming date.');
  }

  // Check minimum lead time (3 days for wine tours)
  const minLeadDays = 3;
  const leadTime = Math.floor((tourDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (leadTime < minLeadDays) {
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + minLeadDays);
    throw new BadRequestError(
      `We need at least ${minLeadDays} days advance notice for bookings. The earliest available date is ${minDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`
    );
  }

  // For multi-day tours, validate end date
  if (data.tour_duration_type === 'multi' && data.tour_end_date) {
    const endDate = new Date(data.tour_end_date);
    if (endDate <= tourDate) {
      throw new BadRequestError('End date must be after the start date.');
    }
  }

  // Build special requests from various fields
  const specialRequestsParts: string[] = [];
  if (data.lodging_location) {
    specialRequestsParts.push(`Pickup/Lodging: ${data.lodging_location}`);
  }
  if (data.wine_tour_preference) {
    const prefLabels: Record<string, string> = {
      'private': 'Private Tour',
      'open_to_shared': 'Open to Shared Tour',
      'open_to_private_offset': 'Open to Private Offset',
      'early_week_combo': 'Early Week Combo'
    };
    specialRequestsParts.push(`Preference: ${prefLabels[data.wine_tour_preference] || data.wine_tour_preference}`);
  }
  if (data.can_text === false) {
    specialRequestsParts.push('Note: Prefers NOT to be texted');
  }
  if (data.additional_info) {
    specialRequestsParts.push(`Additional Info: ${data.additional_info}`);
  }

  // Build referral source info
  let referralInfo = data.referral_source || '';
  if (data.referral_source === 'social_media' && data.specific_social_media) {
    referralInfo = `social_media:${data.specific_social_media}`;
  } else if (data.referral_source === 'ai_search' && data.specific_ai) {
    referralInfo = `ai_search:${data.specific_ai}`;
  } else if (data.referral_source === 'hotel_concierge' && data.hotel_concierge_name) {
    referralInfo = `hotel_concierge:${data.hotel_concierge_name}`;
  } else if (data.referral_source === 'other' && data.referral_other_details) {
    referralInfo = `other:${data.referral_other_details}`;
  }
  if (referralInfo) {
    specialRequestsParts.push(`Referral: ${referralInfo}`);
  }

  // Map tour_type to experience_type
  const experienceType = data.tour_type === 'private_transportation' ? 'private_tasting' :
                         data.tour_type === 'corporate' ? 'corporate' : 'wine_tour';

  // Create the experience request
  const contactName = `${data.first_name} ${data.last_name}`;
  const experienceRequest = await experienceRequestService.create({
    contact_name: contactName,
    contact_email: data.email,
    contact_phone: data.phone,
    party_size: data.party_size,
    preferred_date: data.tour_date,
    alternate_date: data.tour_duration_type === 'multi' ? data.tour_end_date : undefined,
    winery_ids: [],
    experience_type: experienceType as 'wine_tour' | 'private_tasting' | 'group_event' | 'corporate',
    special_requests: specialRequestsParts.join('\n') || undefined,
    brand: 'wwt',
    source: 'website',
  });

  logger.info('Public inquiry created', {
    request_number: experienceRequest.request_number,
    email: data.email,
    party_size: data.party_size,
    tour_date: data.tour_date,
  });

  // Send confirmation email to customer
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wallawalla.travel';
  const formattedDate = tourDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const customerEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); padding: 40px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Thank You for Your Inquiry!</h1>
          <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 16px;">We're excited to help plan your wine tour</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 24px;">
          <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${data.first_name},</p>

          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            We've received your inquiry for a wine tour on <strong>${formattedDate}</strong> for <strong>${data.party_size} guest${data.party_size > 1 ? 's' : ''}</strong>.
          </p>

          <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #166534; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">What happens next?</h2>
            <ol style="color: #1f2937; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li><strong>We'll call you within 24 hours</strong> to discuss your preferences</li>
              <li>Together we'll craft the perfect wine tour itinerary</li>
              <li>We'll send you a detailed proposal with pricing</li>
              <li>Once confirmed, we handle all the reservations!</li>
            </ol>
          </div>

          <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">Your Inquiry Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Reference:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px; font-weight: bold;">${experienceRequest.request_number}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Party Size:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${data.party_size} guest${data.party_size > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Phone:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${data.phone}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 24px;">
            Questions? Reply to this email or call us at (509) 200-8000
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">Walla Walla Travel</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Your local wine country experts</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send customer confirmation email (async, don't block response)
  sendEmail({
    to: data.email,
    subject: `We received your wine tour inquiry [${experienceRequest.request_number}]`,
    html: customerEmailHtml,
    text: `Hi ${data.first_name},\n\nWe've received your inquiry for a wine tour on ${formattedDate} for ${data.party_size} guest${data.party_size > 1 ? 's' : ''}.\n\nYour reference number is ${experienceRequest.request_number}.\n\nWhat happens next?\n1. We'll call you within 24 hours to discuss your preferences\n2. Together we'll craft the perfect wine tour itinerary\n3. We'll send you a detailed proposal with pricing\n4. Once confirmed, we handle all the reservations!\n\nQuestions? Reply to this email or call us at (509) 200-8000\n\nWalla Walla Travel\nYour local wine country experts`,
  }).catch(err => {
    logger.error('Failed to send customer confirmation email', { error: err, email: data.email });
  });

  // Send staff notification email (async, don't block response)
  const staffNotificationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">New Inquiry: ${experienceRequest.request_number}</h1>
          <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 14px;">From the public inquiry form</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
          <!-- Customer Info Card -->
          <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #92400e; margin: 0 0 16px 0; font-size: 16px; font-weight: bold;">Customer Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #78350f; font-size: 14px; font-weight: 600; width: 120px;">Name:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${contactName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #78350f; font-size: 14px; font-weight: 600;">Email:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;"><a href="mailto:${data.email}" style="color: #8B1538;">${data.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #78350f; font-size: 14px; font-weight: 600;">Phone:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;"><a href="tel:${data.phone}" style="color: #8B1538;">${data.phone}</a>${data.can_text ? ' (can text)' : ' (no text)'}</td>
              </tr>
            </table>
          </div>

          <!-- Tour Details Card -->
          <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #374151; margin: 0 0 16px 0; font-size: 16px; font-weight: bold;">Tour Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 120px;">Date:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px; font-weight: bold;">${formattedDate}${data.tour_duration_type === 'multi' && data.tour_end_date ? ` - ${new Date(data.tour_end_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Type:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${data.tour_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Party Size:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${data.party_size} guest${data.party_size > 1 ? 's' : ''}</td>
              </tr>
              ${data.wine_tour_preference ? `
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Preference:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${data.wine_tour_preference.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
              </tr>
              ` : ''}
              ${data.lodging_location ? `
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Lodging:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 14px;">${data.lodging_location}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${data.additional_info ? `
          <!-- Notes -->
          <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">Additional Notes</h2>
            <p style="color: #1f2937; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${data.additional_info}</p>
          </div>
          ` : ''}

          ${referralInfo ? `
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
            <strong>Referral Source:</strong> ${referralInfo}
          </p>
          ` : ''}

          <!-- Action Buttons -->
          <div style="text-align: center; margin-top: 32px;">
            <a href="${appUrl}/admin/leads" style="display: inline-block; background: #8B1538; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: bold;">View in Admin</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated notification from Walla Walla Travel
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  sendEmail({
    to: process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel',
    subject: `New Wine Tour Inquiry: ${contactName} - ${formattedDate} [${experienceRequest.request_number}]`,
    html: staffNotificationHtml,
    text: `New Wine Tour Inquiry: ${experienceRequest.request_number}\n\nCustomer: ${contactName}\nEmail: ${data.email}\nPhone: ${data.phone} (${data.can_text ? 'can text' : 'no text'})\n\nDate: ${formattedDate}${data.tour_duration_type === 'multi' && data.tour_end_date ? ` - ${data.tour_end_date}` : ''}\nType: ${data.tour_type}\nParty Size: ${data.party_size}\n${data.wine_tour_preference ? `Preference: ${data.wine_tour_preference}\n` : ''}${data.lodging_location ? `Lodging: ${data.lodging_location}\n` : ''}\n${data.additional_info ? `Notes:\n${data.additional_info}\n` : ''}\n${referralInfo ? `Referral: ${referralInfo}\n` : ''}\nView in admin: ${appUrl}/admin/leads`,
    replyTo: data.email,
  }).catch(err => {
    logger.error('Failed to send staff notification email', { error: err });
  });

  return NextResponse.json({
    success: true,
    request_number: experienceRequest.request_number,
    message: `Thank you, ${data.first_name}! We'll call you within 24 hours to discuss your wine tour.`,
  }, { status: 201 });
});
